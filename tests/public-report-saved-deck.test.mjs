import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after, before } from "node:test";
import { build } from "esbuild";

// Share used to require a live generation (kept 24 hours), so every saved
// deck older than a day sat with a disabled Share button. Publishing now
// also accepts a deck saved on the owner's account bench. This bundles the
// real handler and drives it against an in-memory D1 and a fake Scryfall,
// stubbing only identity.

const STUBS = {
  "account-bench-stub": 'export async function userKey(request) { return request.headers.get("x-test-user") || null; }',
};

const COMMANDER = "Y'shtola, Night's Blessed";
const deckLines = [`1 ${COMMANDER}`, "1 Sol Ring", "1 Arcane Signet", ...Array.from({ length: 62 }, (_, i) => `1 Spell ${i}`), "35 Island"];
const bench = (familyId) => ({
  schemaVersion: 1,
  families: [{
    id: familyId,
    name: `${COMMANDER}, Forged`,
    format: "Commander",
    strategy: "Spellslinger",
    commander: { name: COMMANDER, colors: ["W", "U", "B"] },
    revisions: [
      { deckText: "1 Old Card", note: "first", createdAt: "2026-08-01" },
      { deckText: deckLines.join("\n"), note: "latest", createdAt: "2026-08-21" },
    ],
  }],
});

function fakeD1(benches) {
  const inserted = [];
  return {
    inserted,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (/FROM account_deck_benches/.test(sql)) {
                const value = benches.get(args[0]);
                return value ? { bench_json: JSON.stringify(value) } : null;
              }
              return null;
            },
            async run() {
              if (/INSERT INTO public_deck_reports/.test(sql)) inserted.push(args);
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

const typeFor = (name) => name === COMMANDER ? "Legendary Creature — Cat Warlock"
  : name === "Island" ? "Basic Land — Island"
    : /Signet|Sol Ring/.test(name) ? "Artifact" : "Instant";

let workDir;
let handlers;
let scryfallUp = true;
const realFetch = globalThis.fetch;

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), "public-report-"));
  const outfile = join(workDir, "report.mjs");
  await build({
    entryPoints: [new URL("../worker/public-deck-report.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
    external: ["cloudflare:workers"],
    plugins: [{
      name: "stub-identity",
      setup(b) {
        b.onResolve({ filter: /^\.\/account-bench$/ }, () => ({ path: "account-bench-stub", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({ contents: STUBS[args.path], loader: "js" }));
      },
    }],
  });
  handlers = await import(pathToFileURL(outfile).href);
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("api.scryfall.com/cards/collection")) {
      if (!scryfallUp) return new Response("down", { status: 503 });
      const { identifiers } = JSON.parse(init.body);
      return Response.json({ data: identifiers.map(({ name }) => ({ name, type_line: typeFor(name), cmc: name === "Island" ? 0 : 2 })), not_found: [] });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
});

after(() => {
  globalThis.fetch = realFetch;
  rmSync(workDir, { recursive: true, force: true });
});

const publish = (env, user, body) => handlers.handlePublicReportPublish(new Request("https://app.metaforge.gg/api/decks/publish", {
  method: "POST",
  headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
  body: JSON.stringify(body),
}), env);

test("a deck saved on the owner's bench publishes from its latest revision", async () => {
  const env = { DB: fakeD1(new Map([["owner-a", bench("family-1")]])) };
  const response = await publish(env, "owner-a", { familyId: "family-1" });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.match(payload.url, /^https:\/\/metaforge\.gg\/decks\/y-?shtola/);

  const [, owner, title, commanderName, formatName, strategyName, summary, rowsJson] = env.DB.inserted[0];
  assert.equal(owner, "owner-a");
  assert.equal(commanderName, COMMANDER);
  assert.equal(formatName, "Commander");
  assert.equal(strategyName, "Spellslinger");
  assert.match(title, /Y'shtola/);
  assert.match(summary, /^100-card Commander deck/);
  const rows = JSON.parse(rowsJson);
  assert.equal(rows.reduce((sum, row) => sum + row.quantity, 0), 100, "the latest revision, not the first");
  assert.deepEqual(rows.find((row) => row.name === COMMANDER).roles, ["commander"]);
  assert.equal(rows.find((row) => row.name === "Island").typeLine, "Basic Land — Island");
});

test("another account cannot publish someone else's saved deck", async () => {
  const env = { DB: fakeD1(new Map([["owner-a", bench("family-1")]])) };
  const response = await publish(env, "owner-b", { familyId: "family-1" });
  assert.equal(response.status, 404);
  assert.equal(env.DB.inserted.length, 0);
});

test("an unknown or unsaved deck gets a clear message, and signed-out requests are refused", async () => {
  const env = { DB: fakeD1(new Map([["owner-a", bench("family-1")]])) };
  const missing = await publish(env, "owner-a", { familyId: "family-404" });
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error, /Save this deck to your account first/);
  assert.equal((await publish(env, null, { familyId: "family-1" })).status, 401);
  assert.equal((await publish(env, "owner-a", {})).status, 400);
});

test("publishing still succeeds when Scryfall is down", async () => {
  scryfallUp = false;
  try {
    const env = { DB: fakeD1(new Map([["owner-a", bench("family-1")]])) };
    const response = await publish(env, "owner-a", { familyId: "family-1" });
    assert.equal(response.status, 201);
    const rows = JSON.parse(env.DB.inserted[0][7]);
    assert.equal(rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  } finally {
    scryfallUp = true;
  }
});
