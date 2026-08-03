import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

class ForgeD1 {
  buckets = new Map();
  generations = new Map();
  prepare(sql) {
    const db = this;
    return { bind(...values) { return {
      async first() {
        if (sql.includes("INSERT INTO api_rate_limits")) {
          const key = values.slice(0, 3).join("|");
          const requests = (db.buckets.get(key) || 0) + 1;
          db.buckets.set(key, requests);
          return { requests };
        }
        if (sql.includes("SELECT user_key, schema_version, payload_json, expires_at FROM forge_generations")) return db.generations.get(values[0]) || null;
        return null;
      },
      async run() { return { success: true, meta: { changes: 0 } }; },
      async all() { return { results: [] }; },
    }; } };
  }
}

const ctx = { waitUntil() {}, passThroughOnException() {} };
const env = (DB) => ({ DB, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked", ALLOW_DEV_AUTH_BYPASS: "true" });
const headers = (email) => ({ "content-type": "application/json", "x-dev-user-email": email });
const request = (email, body) => new Request("https://example.test/api/forge/multi-refill", { method: "POST", headers: headers(email), body: JSON.stringify(body) });
async function userKey(email) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`metaforge-account:${email.toLowerCase()}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function worker() {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("multi-refill", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(url.href)).default;
}

const card = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}") => ({ name, oracleText, typeLine, manaCost, colorIdentity: ["U"] });
const pool = [
  ...Array.from({ length: 22 }, (_, i) => card(`Draw ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 22 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.", "Instant", "{1}{U}")),
  ...Array.from({ length: 18 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "Instant", "{U}")),
  ...Array.from({ length: 12 }, (_, i) => card(`Stone ${i}`, "{T}: Add one mana of any color.", "Artifact", "{2}")),
  ...Array.from({ length: 8 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "")),
];
const input = { format: "Standard", target: 60, strategy: "Balanced midrange", colors: ["U"], seed: 19, cards: pool };

test("multi-refill is authenticated and validates explicit cuts", async () => {
  const app = await worker();
  const DB = new ForgeD1();
  assert.equal((await app.fetch(request("", { generationId: "x", currentRows: [], cuts: [] }), env(DB), ctx)).status, 401);
  assert.equal((await app.fetch(request("player@example.com", { generationId: "x", currentRows: [], cuts: [] }), env(DB), ctx)).status, 400);
});

test("multi-refill preserves uncut quantities, fills every slot, and never re-adds fully cut cards", async () => {
  const app = await worker();
  const DB = new ForgeD1();
  const report = forgeNativeMasterwork(input);
  const currentRows = report.selected.rows.map((row) => ({ name: row.name, quantity: row.quantity }));
  const landCut = report.selected.rows.find((row) => row.roles.includes("land"));
  const spellCut = report.selected.rows.find((row) => !row.roles.includes("land") && !row.roles.includes("commander"));
  const cutRows = [landCut, spellCut].map((row) => ({ name: row.name, quantity: 1 }));
  const email = "player@example.com";
  DB.generations.set("generation", {
    user_key: await userKey(email), schema_version: 1, expires_at: Date.now() + 60_000,
    payload_json: JSON.stringify({
      selected: report.selected, candidates: report.candidates, cardPool: pool,
      options: { format: input.format, strategy: input.strategy, target: input.target },
      forgeInput: { ...input, cards: undefined },
    }),
  });
  const response = await app.fetch(request(email, { generationId: "generation", currentRows, cuts: cutRows }), env(DB), ctx);
  const failureBody = response.status === 200 ? "" : await response.clone().text();
  assert.equal(response.status, 200, failureBody);
  const body = await response.json();
  assert.equal(body.slots, 2);
  assert.ok(body.packages.length >= 1);
  const expectedRemaining = new Map(currentRows.map((row) => [row.name, row.quantity]));
  for (const cut of cutRows) expectedRemaining.set(cut.name, expectedRemaining.get(cut.name) - cut.quantity);
  for (const candidate of body.packages) {
    assert.equal(candidate.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
    assert.equal(candidate.additions.reduce((sum, row) => sum + row.quantity, 0), 2);
    const additions = new Set(candidate.additions.map((row) => row.name));
    for (const cut of cutRows) assert.equal(additions.has(cut.name), false);
    const addedNames = new Set(candidate.additions.map((row) => row.name));
    for (const [name, quantity] of expectedRemaining) {
      if (addedNames.has(name)) continue;
      assert.equal(candidate.rows.find((row) => row.name === name)?.quantity || 0, quantity, `uncut quantity changed for ${name}`);
    }
    const addedFacts = candidate.additions.map((addition) => pool.find((entry) => entry.name === addition.name));
    assert.equal(addedFacts.filter((entry) => /\bLand\b/.test(entry?.typeLine || "")).length, 1, "one removed land must refill with one land");
    assert.equal(addedFacts.filter((entry) => !/\bLand\b/.test(entry?.typeLine || "")).length, 1, "one removed spell must refill with one spell");
    assert.equal(typeof candidate.context?.preservationScore, "number");
    assert.equal(typeof candidate.context?.rolePreservation, "number");
    assert.equal(typeof candidate.context?.systemPreservation, "number");
    assert.ok(Array.isArray(candidate.context?.removedRoles));
    assert.ok(Array.isArray(candidate.context?.restoredRoles));
    assert.ok(Array.isArray(candidate.context?.affectedSystems));
    assert.ok(candidate.context?.summary && !candidate.context.summary.includes("undefined"));
  }
  for (let index = 1; index < body.packages.length; index += 1) {
    assert.ok(body.packages[index - 1].context.preservationScore >= body.packages[index].context.preservationScore, "packages must rank by preserved structural footprint");
  }
});

test("multi-refill explains the functional footprint removed by the player's cuts", async () => {
  const report = forgeNativeMasterwork(input);
  const currentRows = report.selected.rows.map((row) => ({ name: row.name, quantity: row.quantity }));
  const functionalCut = report.selected.rows.find((row) => row.roles.some((role) => !["land", "commander"].includes(role)));
  assert.ok(functionalCut, "fixture needs a function-bearing spell");
  const afterCut = currentRows
    .map((row) => row.name === functionalCut.name ? { ...row, quantity: row.quantity - 1 } : row)
    .filter((row) => row.quantity > 0);
  const result = (await import("../app/native-masterwork-engine.mjs")).forgeMultiSlotRefills(
    input,
    afterCut,
    [{ name: functionalCut.name, quantity: 1 }],
  );
  const expectedRoles = functionalCut.roles.filter((role) => !["land", "commander"].includes(role));
  assert.ok(expectedRoles.some((role) => result.packages[0].context.removedRoles.includes(role)), "the cut card's real role must be recorded");
  assert.ok(result.packages.every((entry) => !entry.additions.some((addition) => addition.name === functionalCut.name)), "the cut card must remain excluded");
  assert.match(result.packages[0].context.summary, /Restores|Preserves|less supported/);
});

test("multi-refill hides another player's generation behind the same 404 boundary", async () => {
  const app = await worker();
  const DB = new ForgeD1();
  DB.generations.set("owned", { user_key: await userKey("owner@example.com"), schema_version: 1, expires_at: Date.now() + 60_000, payload_json: JSON.stringify({}) });
  const response = await app.fetch(request("stranger@example.com", { generationId: "owned", currentRows: [{ name: "A", quantity: 1 }], cuts: [{ name: "A", quantity: 1 }] }), env(DB), ctx);
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /no longer available/i);
});

test("multi-refill role and system ranking remains server-only", () => {
  const clientDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
  const serverDir = fileURLToPath(new URL("../dist/server/", import.meta.url));
  const readBundle = (dir) => fs.readdirSync(dir, { recursive: true })
    .filter((name) => /\.(?:js|mjs)$/.test(String(name)))
    .map((name) => fs.readFileSync(path.join(dir, String(name)), "utf8"))
    .join("\n");
  const client = readBundle(clientDir);
  const server = readBundle(serverDir);
  assert.doesNotMatch(client, /restorationMerit|cutRoleNeeds|affectedSystems/);
  assert.match(server, /restorationMerit|cutRoleNeeds|affectedSystems/);
});
