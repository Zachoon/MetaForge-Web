import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after, before } from "node:test";
import { build } from "esbuild";
import { repairReportRows } from "../app/public-report-repair.mjs";

// MF-DECK-COACH-003/004, public concern 1: production's Baru, Wurmspeaker
// report showed "0 Lands" beside 37 Forest + Castle Garenbrig, grouped all 99
// cards as "Other", and averaged mana value over the lands, because the
// stored rows had no type line. The rows below are that report exactly as it
// renders. A page view repairs in memory only (no lookup, no write); the
// stored rows are repaired by the owner-run script. Bundles the real handler.

const fixtures = new URL("./fixtures/deck-bench-003/", import.meta.url);
const stored = JSON.parse(readFileSync(new URL("baru-public-report.rows.json", fixtures), "utf8")).rows;
const facts = JSON.parse(readFileSync(new URL("baru-public-report.facts.json", fixtures), "utf8")).facts;

let workDir;
let handlers;
let collectionCalls = 0;
const realFetch = globalThis.fetch;

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), "public-land-"));
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
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export async function userKey() { return null; }", loader: "js" }));
      },
    }],
  });
  handlers = await import(pathToFileURL(outfile).href);
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("api.scryfall.com/cards/collection")) {
      collectionCalls += 1;
      const { identifiers } = JSON.parse(init.body);
      const data = identifiers.map(({ name }) => facts[name]).filter(Boolean).map((fact) => ({ name: fact.name, type_line: fact.typeLine, cmc: fact.cmc }));
      return Response.json({ data, not_found: [] });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
});

after(() => {
  globalThis.fetch = realFetch;
  rmSync(workDir, { recursive: true, force: true });
});

function storeWith(rows) {
  const updates = [];
  const report = { slug: "baru-wurmspeaker-b35d119648", title: "Baru, Wurmspeaker Commander Deck", commander_name: "Baru, Wurmspeaker", format_name: "Commander", strategy_name: "Balanced midrange", summary: "100-card Commander deck", deck_rows_json: JSON.stringify(rows), dossier_json: "{}", created_at: "2026-10-31", updated_at: "2026-10-31" };
  return {
    updates,
    report,
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() { return /FROM public_deck_reports WHERE slug/.test(sql) ? report : null; },
              async run() {
                if (/UPDATE public_deck_reports SET deck_rows_json/.test(sql)) { updates.push(args); report.deck_rows_json = args[0]; }
                return { meta: { changes: 1 } };
              },
              async all() { return { results: [] }; },
            };
          },
        };
      },
    },
  };
}

const render = (env) => handlers.publicDeckReportResponse(new URL("https://metaforge.gg/decks/baru-wurmspeaker-b35d119648"), env);

// What the controlled repair (scripts/public-reports/repair-type-lines.mjs)
// would store for these rows, using the same Scryfall snapshot.
const repairedRows = repairReportRows(stored, (name) => facts[name]?.typeLine || "").rows;

test("a view of the stored (unrepaired) Baru report counts 38 lands, with no lookup and no write", async () => {
  const env = storeWith(stored);
  const before = collectionCalls;
  const html = await (await render(env)).text();
  assert.match(html, /<b>38<\/b><strong>Lands<\/strong>/, "the at-a-glance land count, from the land role tag");
  assert.match(html, /<h2>Lands<\/h2><span>38<\/span>/, "the Lands group");
  // Average mana value is over the 62 nonland cards (commander included, as
  // the page says), not over all 100. Production showed 2.54; it is 4.11.
  const nonland = stored.filter((row) => !/\bLand\b/.test(facts[row.name]?.typeLine || ""));
  const expected = nonland.reduce((sum, row) => sum + facts[row.name].cmc * row.quantity, 0) / nonland.reduce((sum, row) => sum + row.quantity, 0);
  const shown = Number(html.match(/<b>([\d.]+)<\/b><strong>Average mana value<\/strong>/)?.[1]);
  assert.ok(Math.abs(shown - expected) < 0.1, `average ${shown} vs ${expected.toFixed(2)}`);
  assert.equal(collectionCalls, before, "a page view never calls Scryfall");
  assert.equal(env.updates.length, 0, "a page view never writes");
});

test("after the controlled repair, every card is grouped by its printed type", async () => {
  const env = storeWith(repairedRows);
  const html = await (await render(env)).text();
  assert.match(html, /<b>38<\/b><strong>Lands<\/strong>/);
  assert.doesNotMatch(html, /<h2>Other<\/h2>/, "no card is left untyped");
  const artifacts = html.match(/<h2>Artifacts<\/h2>[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(artifacts, /<strong>Sol Ring<\/strong><small>artifacts · ramp<\/small>/, "Sol Ring is an artifact and keeps its ramp tag");
  assert.equal(env.updates.length, 0);
});

test("repeated views write nothing and look nothing up", async () => {
  const env = storeWith(stored);
  const before = collectionCalls;
  for (let index = 0; index < 5; index += 1) await render(env);
  assert.equal(collectionCalls, before);
  assert.equal(env.updates.length, 0);
  assert.equal(env.report.deck_rows_json, JSON.stringify(stored), "the stored report is byte-identical");
});

test("with Scryfall down, the page still renders and lands still count", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response("down", { status: 503 });
  try {
    const env = storeWith(stored);
    const response = await render(env);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<b>38<\/b><strong>Lands<\/strong>/);
    assert.equal(env.updates.length, 0);
  } finally {
    globalThis.fetch = saved;
  }
});
