import assert from "node:assert/strict";
import test from "node:test";

// public-deck-report.ts imports from sibling .ts files (./account-bench,
// ./forge-generation-store) using extensionless specifiers Node's own ESM
// resolver can't follow outside the real build pipeline — same reason
// tests/guest-forge-finalization.test.mjs loads the built worker bundle
// rather than importing worker/*.ts source directly.
async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("public-deck-index-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const ctx = { waitUntil() {}, passThroughOnException() {} };

// A minimal FakeD1 exercising exactly the queries publicDeckIndexResponse
// issues against public_deck_reports: an unfiltered COUNT (total ever
// published — always the true total, never affected by current search
// params), a DISTINCT format list, a filtered COUNT (matchCount), and the
// main paginated SELECT. The same `filtered()` helper backs both COUNT
// variants — when no filter substrings are present in the SQL text (the
// unfiltered total-ever-published call) or no filter values are bound, it
// returns the full unfiltered set either way.
class FakeD1 {
  constructor(rows) { this.rows = rows; }
  prepare(sql) {
    const db = this;
    // Real D1 allows calling .first()/.all()/.run() directly on the
    // prepared statement when there are no placeholders to bind (the
    // unfiltered total-ever-published COUNT does exactly this) — not just
    // after a .bind() call. Both paths route through the same executor.
    const execute = (values) => ({
      async first() {
        if (sql.includes("SELECT COUNT(*) AS n FROM public_deck_reports")) {
          return { n: db.filtered(sql, values).length };
        }
        return null;
      },
      async all() {
        if (sql.startsWith("SELECT DISTINCT format_name")) {
          const formats = [...new Set(db.rows.map((r) => r.format_name))].sort((a, b) => a.localeCompare(b));
          return { results: formats.map((format_name) => ({ format_name })) };
        }
        if (sql.includes("SELECT slug,title,commander_name,format_name,strategy_name,summary,created_at,updated_at,view_count,share_count FROM public_deck_reports")) {
          const limit = values[values.length - 2];
          const offset = values[values.length - 1];
          const list = db.sorted(sql, db.filtered(sql, values));
          return { results: list.slice(offset, offset + limit) };
        }
        return { results: [] };
      },
    });
    return { ...execute([]), bind: (...values) => execute(values) };
  }
  filtered(sql, values) {
    let list = this.rows;
    let vi = 0;
    if (sql.includes("title LIKE ?")) {
      const like = String(values[vi]); vi += 3;
      const needle = like.slice(1, -1).toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(needle) || r.commander_name.toLowerCase().includes(needle) || r.strategy_name.toLowerCase().includes(needle));
    }
    if (sql.includes("format_name = ?")) {
      const fmt = values[vi]; vi += 1;
      list = list.filter((r) => r.format_name === fmt);
    }
    return list;
  }
  sorted(sql, list) {
    const copy = [...list];
    if (sql.includes("ORDER BY view_count DESC")) copy.sort((a, b) => b.view_count - a.view_count);
    else if (sql.includes("ORDER BY share_count DESC")) copy.sort((a, b) => b.share_count - a.share_count);
    else if (sql.includes("ORDER BY title")) copy.sort((a, b) => a.title.localeCompare(b.title));
    else copy.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return copy;
  }
}

const report = (overrides) => ({
  slug: "test-slug", title: "Test Deck", commander_name: "Test Commander", format_name: "Commander",
  strategy_name: "Aggro", summary: "A test deck.", created_at: "2026-08-01", updated_at: "2026-08-01",
  view_count: 0, share_count: 0, ...overrides,
});

const decksEnv = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
});

async function bodyOf(rows, path) {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request(`https://metaforge.gg${path}`), decksEnv(new FakeD1(rows)), ctx);
  assert.equal(response.status, 200);
  return response.text();
}

test("shows the OPENING SOON empty state, with no search form, when zero decks have ever been published", async () => {
  const html = await bodyOf([], "/decks");
  assert.match(html, /OPENING SOON/);
  assert.doesNotMatch(html, /class="deck-search-form"/);
});

test("lists real published decks once at least one exists, with a working search form", async () => {
  const html = await bodyOf([report({ slug: "krenko-deck", title: "Krenko Goblins", commander_name: "Krenko, Mob Boss" })], "/decks");
  assert.match(html, /1 PUBLIC/);
  assert.match(html, /Krenko Goblins/);
  assert.match(html, /href="\/decks\/krenko-deck"/);
  assert.match(html, /class="deck-search-form"/);
});

test("searching by commander name filters results, and a non-matching search shows the clear-filters message instead of a false OPENING SOON", async () => {
  const rows = [
    report({ slug: "krenko-deck", title: "Krenko Goblins", commander_name: "Krenko, Mob Boss" }),
    report({ slug: "atraxa-deck", title: "Atraxa Superfriends", commander_name: "Atraxa, Praetors' Voice" }),
  ];
  const matched = await bodyOf(rows, "/decks?q=krenko");
  assert.match(matched, /Krenko Goblins/);
  assert.doesNotMatch(matched, /Atraxa Superfriends/);

  const unmatched = await bodyOf(rows, "/decks?q=nonexistent-commander-xyz");
  assert.match(unmatched, /0 MATCHES/);
  assert.match(unmatched, /No published decks match your search/);
  assert.doesNotMatch(unmatched, /OPENING SOON/, "a real archive with a non-matching filter must not look like an empty archive");
});

test("filtering by format only shows decks in that format, and the format dropdown lists real distinct formats", async () => {
  const rows = [
    report({ slug: "commander-deck", title: "A Commander Deck", format_name: "Commander" }),
    report({ slug: "standard-deck", title: "A Standard Deck", format_name: "Standard" }),
  ];
  const html = await bodyOf(rows, "/decks?format=Standard");
  assert.match(html, /A Standard Deck/);
  assert.doesNotMatch(html, /A Commander Deck/);
  assert.match(html, /<option value="Standard" selected>Standard<\/option>/);
});

test("sorting by views orders real results by view_count descending", async () => {
  const rows = [
    report({ slug: "low", title: "Low Views Deck", view_count: 3 }),
    report({ slug: "high", title: "High Views Deck", view_count: 99 }),
  ];
  const html = await bodyOf(rows, "/decks?sort=views");
  assert.ok(html.indexOf("High Views Deck") < html.indexOf("Low Views Deck"), "the higher-viewed deck should be listed first");
});

test("pagination shows page 2 with the remaining results and real Previous/Next links", async () => {
  const rows = Array.from({ length: 26 }, (_, i) => report({ slug: `deck-${i}`, title: `Deck ${String(i).padStart(2, "0")}`, updated_at: `2026-08-${String(i + 1).padStart(2, "0")}` }));
  const page1 = await bodyOf(rows, "/decks");
  assert.match(page1, /Page 1 of 2/);
  assert.match(page1, /Next →/);
  assert.doesNotMatch(page1, /← Previous/);

  const page2 = await bodyOf(rows, "/decks?page=2");
  assert.match(page2, /Page 2 of 2/);
  assert.match(page2, /← Previous/);
  // 26 results, page size 24 — page 2 holds exactly the last 2.
  assert.match(page2, /Showing 25–26 of 26/);
});

test("a search query containing SQL LIKE wildcard characters is escaped before binding, not passed through as a raw wildcard", async () => {
  // A hand-rolled DB (not FakeD1) since this asserts directly on what the
  // real function binds — FakeD1's own string-matching can't exercise real
  // SQLite LIKE semantics. The literal % and _ in the player's search text
  // must come out backslash-escaped (paired with the real query's
  // "ESCAPE '\'" clause) rather than acting as SQL wildcards that would
  // match unrelated decks.
  const capturedBinds = [];
  const DB = {
    prepare(sql) {
      const result = { async first() { return { n: 1 }; }, async all() { return { results: [] }; } };
      return {
        ...result,
        bind(...values) {
          if (sql.includes("LIKE")) capturedBinds.push(values[0]);
          return result;
        },
      };
    },
  };
  const worker = await loadWorker();
  const response = await worker.fetch(new Request(`https://metaforge.gg/decks?q=${encodeURIComponent("50%_off")}`), decksEnv(DB), ctx);
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(capturedBinds.length > 0, true, "expected at least one LIKE query to run for a non-empty search");
  assert.equal(capturedBinds[0], "%50\\%\\_off%", "the literal % and _ in the search text must be backslash-escaped, matching the query's ESCAPE '\\' clause");
});
