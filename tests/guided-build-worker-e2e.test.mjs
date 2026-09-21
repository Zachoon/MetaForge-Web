import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after, before } from "node:test";
import { build } from "esbuild";
import { forgeImportedMasterwork } from "../app/native-masterwork-engine.mjs";

// The guided Build's two Worker endpoints are the seam no other test touches:
// auth gate -> real Scryfall-shaped pool fetch -> analyzeForgePool ->
// suggestion + ledger -> storeGeneration/loadGeneration round trip -> the
// completion handoff into the imported pipeline. This bundles the real
// handlers with esbuild and drives them against an in-memory D1 and a fake
// Scryfall, stubbing only identity and rate limiting.

const STUBS = {
  "account-bench-stub": 'export async function userKey(request) { return request.headers.get("x-test-user") || null; }',
  "api-hardening-stub": `
    export async function checkRateLimit() { return { allowed: true }; }
    export async function readJsonWithLimit(request, maxBytes) {
      const text = await request.text();
      if (text.length > maxBytes) return { ok: false, status: 413, error: "Request body is too large" };
      try { return { ok: true, data: JSON.parse(text) }; } catch { return { ok: false, status: 400, error: "Invalid JSON" }; }
    }`,
};

const raw = (name, type_line, oracle_text, cmc, extra = {}) => ({
  name,
  mana_cost: cmc ? `{${Math.max(0, cmc - 1)}}{W}` : "",
  cmc,
  type_line,
  oracle_text,
  color_identity: ["W"],
  keywords: [],
  prices: { usd: "0.25" },
  rarity: "common",
  ...extra,
});

function fakeScryfallPool() {
  const many = (count, make) => Array.from({ length: count }, (_, i) => make(i));
  return [
    ...many(30, (i) => raw(`Signet ${i}`, "Artifact", "{T}: Add one mana of any color.", 2)),
    ...many(24, (i) => raw(`Insight ${i}`, "Instant", "Draw two cards.", 3)),
    ...many(24, (i) => raw(`Answer ${i}`, "Instant", "Exile target nonland permanent.", 3)),
    ...many(12, (i) => raw(`Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2)),
    ...many(6, (i) => raw(`Reckoning ${i}`, "Sorcery", "Destroy all creatures.", 4)),
    ...many(10, (i) => raw(`Revival ${i}`, "Sorcery", "Return target creature card from your graveyard to your hand.", 3)),
    ...many(28, (i) => raw(`Blessing ${i}`, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", 1 + (i % 3))),
    ...many(30, (i) => raw(`Sentinel ${i}`, "Creature — Angel", "Flying. Vigilance.", 3 + (i % 3), { power: "3", toughness: "3" })),
    ...many(40, (i) => raw(`Filler ${i}`, "Creature — Human", "Vigilance.", 2 + (i % 4), { power: "2", toughness: "2" })),
    ...many(12, (i) => raw(`Haven ${i}`, "Land", "{T}: Add {W}.", 0)),
    raw("Plains", "Basic Land — Plains", "({T}: Add {W}.)", 0),
  ];
}

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
};

function fakeD1() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (/INSERT INTO forge_generations/.test(sql)) {
                rows.set(args[0], { user_key: args[1], schema_version: args[2], payload_json: args[3], expires_at: args[4] });
              }
              return { meta: { changes: 1 } };
            },
            async first() {
              if (/FROM forge_generations/.test(sql)) return rows.get(args[0]) ?? null;
              return null;
            },
          };
        },
      };
    },
  };
}

let workDir;
let handlers;
let env;
const realFetch = globalThis.fetch;

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), "guided-e2e-"));
  const outfile = join(workDir, "guided.mjs");
  await build({
    entryPoints: [new URL("../worker/forge-guided-build.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
    external: ["cloudflare:workers"],
    plugins: [{
      name: "stub-identity-and-limits",
      setup(b) {
        b.onResolve({ filter: /^\.\/account-bench$/ }, () => ({ path: "account-bench-stub", namespace: "stub" }));
        b.onResolve({ filter: /^\.\/api-hardening$/ }, () => ({ path: "api-hardening-stub", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({ contents: STUBS[args.path], loader: "js" }));
      },
    }],
  });
  handlers = await import(pathToFileURL(outfile).href);
  env = { DB: fakeD1() };
  const pool = fakeScryfallPool();
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes("api.scryfall.com/cards/search")) {
      return new Response(JSON.stringify({ data: pool, has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
});

after(() => {
  globalThis.fetch = realFetch;
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

const post = (handler, body, user = "user-a") =>
  handler(new Request("https://test.invalid/api", {
    method: "POST",
    headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
    body: JSON.stringify(body),
  }), env);

const startBody = (extra = {}) => ({
  format: "Commander",
  commander: pearlEar,
  focusPackageId: "auras",
  targetPowerTier: "Focused",
  strategy: "Balanced midrange",
  ...extra,
});

test("start and next both refuse an unauthenticated caller", async () => {
  assert.equal((await post(handlers.handleForgeGuidedStart, startBody(), null)).status, 401);
  assert.equal((await post(handlers.handleForgeGuidedNext, { generationId: "x", category: "ramp" }, null)).status, 401);
});

test("start rejects non-Commander formats, a missing commander, and a focus id that isn't a real shell", async () => {
  assert.equal((await post(handlers.handleForgeGuidedStart, startBody({ format: "Standard" }))).status, 400);
  assert.equal((await post(handlers.handleForgeGuidedStart, startBody({ commander: null }))).status, 400);
  assert.equal((await post(handlers.handleForgeGuidedStart, startBody({ focusPackageId: "not_a_shell" }))).status, 400);
});

test("a whole guided session works end to end against a real pool, cache round trip, and the import handoff", async () => {
  const startResponse = await post(handlers.handleForgeGuidedStart, startBody());
  assert.equal(startResponse.status, 200, await startResponse.clone().text());
  const started = await startResponse.json();
  assert.ok(started.generationId);
  assert.equal(started.categorySequence.length, 8);
  assert.equal(started.category, "ramp");
  assert.ok(started.offer?.name, "first category should offer a real card");
  assert.equal(started.ledger.length, 8);
  assert.ok(started.reason);

  const accepted = [];
  const seen = new Set();
  for (const category of started.categorySequence) {
    const declined = [];
    for (let pick = 0; pick < 3; pick += 1) {
      const response = await post(handlers.handleForgeGuidedNext, {
        generationId: started.generationId, category, acceptedNames: accepted, declinedNames: declined,
      });
      assert.equal(response.status, 200, `${category}: ${await response.clone().text()}`);
      const step = await response.json();
      if (step.exhausted) break;
      assert.ok(step.offer.name, `${category} offer must be a real card`);
      assert.ok(!accepted.includes(step.offer.name), `${step.offer.name} was already accepted`);
      assert.ok(!declined.includes(step.offer.name), `${step.offer.name} was declined and came back`);
      if (pick === 1) {
        declined.push(step.offer.name); // decline is the reroll
        continue;
      }
      accepted.push(step.offer.name);
      seen.add(category);
    }
  }
  assert.ok(accepted.length >= 8, `expected a substantial build, got ${accepted.length} picks`);
  assert.equal(new Set(accepted).size, accepted.length, "no card accepted twice");

  const last = await (await post(handlers.handleForgeGuidedNext, {
    generationId: started.generationId, category: "ramp", acceptedNames: accepted, declinedNames: [],
  })).json();
  const byCategory = Object.fromEntries(last.ledger.map((row) => [row.category, row]));
  assert.ok(byCategory.ramp.actual >= 1, "ramp picks must register in the live ledger");
  assert.ok(byCategory.ramp.target, "a Focused build gives ramp a target range");
  assert.ok(byCategory.synergyPieces.actual >= 1, "aura picks must register as shell synergy");

  // Completion handoff: the picks become a partial decklist and the existing
  // import pipeline keeps every one and fills the rest, still on the shell.
  const stored = JSON.parse(env.DB.rows.get(started.generationId).payload_json);
  assert.equal(stored.options.strategy, "Balanced midrange");
  assert.ok(stored.cardPool.length > 100);
  const report = forgeImportedMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    commander: pearlEar,
    note: "",
    focusPackageId: "auras",
    cards: stored.cardPool,
    importedRows: accepted.map((name) => ({ name, quantity: 1 })),
  });
  const rows = report.selected.rows;
  const names = new Set(rows.map((row) => row.name));
  for (const name of accepted) assert.ok(names.has(name), `guided pick ${name} must survive completion`);
  assert.equal(rows.reduce((sum, row) => sum + row.quantity, 0), 100, "completion must produce a full legal 100-card deck");
  assert.deepEqual(report.selected.strategicIntent.packageIds, ["auras"], "the chosen shell must keep steering the fill");
});

test("the in-isolate analysis cache never changes an answer: repeated and interleaved requests are identical", async () => {
  const started = await (await post(handlers.handleForgeGuidedStart, startBody(), "cache-user")).json();
  const ask = async (category, acceptedNames, declinedNames = []) =>
    (await post(handlers.handleForgeGuidedNext, { generationId: started.generationId, category, acceptedNames, declinedNames }, "cache-user")).json();
  const firstRamp = await ask("ramp", []);
  const withPicks = await ask("draw", [firstRamp.offer.name]);
  const againRamp = await ask("ramp", []);
  const againWithPicks = await ask("draw", [firstRamp.offer.name]);
  assert.deepEqual(againRamp, firstRamp, "a later identical request must return the identical answer");
  assert.deepEqual(againWithPicks, withPicks);
  assert.deepEqual(started.offer, firstRamp.offer, "start's first offer equals next's for the same state");
});

test("next refuses another account's session, an unknown session, and a category that doesn't exist", async () => {
  const started = await (await post(handlers.handleForgeGuidedStart, startBody(), "owner")).json();
  const good = { generationId: started.generationId, category: "ramp", acceptedNames: [], declinedNames: [] };
  assert.equal((await post(handlers.handleForgeGuidedNext, good, "owner")).status, 200);
  assert.equal((await post(handlers.handleForgeGuidedNext, good, "someone-else")).status, 404);
  assert.equal((await post(handlers.handleForgeGuidedNext, { ...good, generationId: "nope" }, "owner")).status, 404);
  assert.equal((await post(handlers.handleForgeGuidedNext, { ...good, category: "lands" }, "owner")).status, 400);
});
