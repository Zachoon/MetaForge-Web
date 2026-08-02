import assert from "node:assert/strict";
import test from "node:test";
import { storeGeneration, loadGeneration, cleanupExpiredGenerations, GENERATION_SCHEMA_VERSION } from "../worker/forge-generation-store.ts";

// A minimal FakeD1 exercising exactly the queries forge-generation-store.ts
// issues against forge_generations: INSERT (storeGeneration), SELECT by
// primary key (loadGeneration), and an age-based DELETE
// (cleanupExpiredGenerations). expires_at is a plain epoch-ms number, so
// no SQLite datetime()/CURRENT_TIMESTAMP string handling is needed here.
class FakeD1 {
  rows = new Map();
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("SELECT user_key, schema_version, payload_json, expires_at FROM forge_generations")) {
              return db.rows.get(values[0]) || null;
            }
            return null;
          },
          async run() {
            if (sql.startsWith("INSERT INTO forge_generations")) {
              const [generationId, userKey, schemaVersion, payloadJson, expiresAt] = values;
              db.rows.set(generationId, { user_key: userKey, schema_version: schemaVersion, payload_json: payloadJson, expires_at: expiresAt });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("DELETE FROM forge_generations")) {
              const cutoff = values[0];
              let changes = 0;
              for (const [id, row] of [...db.rows.entries()]) {
                if (row.expires_at < cutoff) {
                  db.rows.delete(id);
                  changes += 1;
                }
              }
              return { success: true, meta: { changes } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

const payload = { selected: { id: "s", rows: [] }, candidates: [], cardPool: [], options: { format: "Commander", strategy: "Balanced midrange", target: 100 } };

test("stores and loads a generation for its real owner", async () => {
  const DB = new FakeD1();
  const generationId = await storeGeneration({ DB }, "owner-key", payload);
  assert.ok(generationId);
  const loaded = await loadGeneration({ DB }, "owner-key", generationId);
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.payload, payload);
});

test("issues a distinct generationId on every call", async () => {
  const DB = new FakeD1();
  const first = await storeGeneration({ DB }, "owner-key", payload);
  const second = await storeGeneration({ DB }, "owner-key", payload);
  assert.notEqual(first, second);
});

test("refuses to load a generation for anyone but its real owner", async () => {
  const DB = new FakeD1();
  const generationId = await storeGeneration({ DB }, "owner-key", payload);
  const asStranger = await loadGeneration({ DB }, "stranger-key", generationId);
  assert.equal(asStranger.ok, false);
  assert.equal(asStranger.reason, "not-owned");
});

test("reports a missing generationId distinctly at the store layer, even though the endpoint folds it into the same response", async () => {
  const DB = new FakeD1();
  const result = await loadGeneration({ DB }, "owner-key", "never-issued");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing");
});

test("refuses to load an expired generation", async () => {
  const DB = new FakeD1();
  const generationId = await storeGeneration({ DB }, "owner-key", payload);
  DB.rows.get(generationId).expires_at = Date.now() - 1;
  const result = await loadGeneration({ DB }, "owner-key", generationId);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "expired");
});

test("refuses to load a generation stored under an incompatible schema version", async () => {
  const DB = new FakeD1();
  const generationId = await storeGeneration({ DB }, "owner-key", payload);
  DB.rows.get(generationId).schema_version = GENERATION_SCHEMA_VERSION + 1;
  const result = await loadGeneration({ DB }, "owner-key", generationId);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "incompatible-schema");
});

test("refuses to load a generation whose stored payload is corrupt JSON rather than throwing", async () => {
  const DB = new FakeD1();
  const generationId = await storeGeneration({ DB }, "owner-key", payload);
  DB.rows.get(generationId).payload_json = "{not valid json";
  const result = await loadGeneration({ DB }, "owner-key", generationId);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "incompatible-schema");
});

test("cleanup deletes only generations past their expiry and reports how many", async () => {
  const DB = new FakeD1();
  const expired = await storeGeneration({ DB }, "owner-key", payload);
  DB.rows.get(expired).expires_at = Date.now() - 1000;
  const fresh = await storeGeneration({ DB }, "owner-key", payload);

  const changes = await cleanupExpiredGenerations({ DB });
  assert.equal(changes, 1);
  assert.equal(DB.rows.has(expired), false);
  assert.equal(DB.rows.has(fresh), true);
});
