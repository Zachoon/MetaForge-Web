import assert from "node:assert/strict";
import test from "node:test";
import { decodeLiveSlot, encodeLiveSlot } from "../app/learn/live-slot-payload.mjs";

const emptyDb = { prepare: () => ({ bind() { return this; }, first: async () => null, all: async () => ({ results: [] }), run: async () => ({ success: true }) }) };

function dbWith(articles) {
  return {
    prepare() {
      const statement = {
        bind() { return statement; },
        first: async () => null,
        all: async () => ({ results: articles.map((article) => ({ article_json: JSON.stringify(article) })) }),
        run: async () => ({ success: true }),
      };
      return statement;
    },
  };
}

function note(slug, title, extra = {}) {
  return {
    slug,
    title,
    description: extra.description || `${title} description.`,
    category: extra.category || "news",
    status: extra.status || "published",
    indexable: extra.indexable !== false,
  };
}

async function render(url, db = emptyDb, init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${url}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(url, { ...init, headers: { accept: "text/html", ...(init.headers || {}) } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: db,
      METAFORGE_BOOTSTRAP_LOCK: "unlocked",
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function rscPayload(html) {
  const parts = [];
  const re = /self\.__VINEXT_RSC_CHUNKS__\.push\("((?:\\.|[^"\\])*)"\)/g;
  for (const match of html.matchAll(re)) parts.push(JSON.parse(`"${match[1]}"`));
  return parts.join("\n");
}

function liveSlot(html) {
  const match = html.match(/<div data-learn-slot="live">([\s\S]*?)<\/div>/);
  return match ? match[1] : null;
}

test("encodeLiveSlot keeps six published notes and drops drafts", () => {
  const articles = [
    note("probe", "Hydration Probe Note"),
    note("draft", "Draft Should Stay Hidden", { status: "draft", indexable: false }),
    note("apostrophe", "D'Vana Hydration Check", { description: "A “quoted” source." }),
    note("hidden", "Unindexed Should Stay Hidden", { indexable: false }),
    note("third", "Third Live Note"),
    note("fourth", "Fourth Live Note"),
    note("fifth", "Fifth Live Note"),
    note("sixth", "Sixth Live Note"),
    note("seventh", "Seventh Live Note"),
  ];
  const decoded = decodeLiveSlot(encodeLiveSlot(articles));
  assert.deepEqual(decoded.map((article) => article.title), [
    "Hydration Probe Note",
    "D'Vana Hydration Check",
    "Third Live Note",
    "Fourth Live Note",
    "Fifth Live Note",
    "Sixth Live Note",
  ]);
  assert.equal(decoded[1].description, "A “quoted” source.");
  assert.equal(decodeLiveSlot("%7Bnot-json").length, 0);
  assert.equal(decodeLiveSlot(null).length, 0);
});

test("published notes are in the server HTML and the RSC payload", async () => {
  const db = dbWith([
    note("hydration-probe-note", "Hydration Probe Note", { description: "The note both renders must show." }),
    note("draft-note", "Draft Should Stay Hidden", { status: "draft", indexable: false }),
    note("quiet-note", "Unindexed Should Stay Hidden", { indexable: false }),
  ]);
  for (const url of ["https://metaforge.gg/learn", "https://metaforge.gg/learn/news"]) {
    const response = await render(url, db);
    assert.equal(response.status, 200);
    const html = await response.text();
    const slot = liveSlot(html);
    const flight = rscPayload(html);
    assert.ok(slot, `${url} server HTML renders the live slot`);
    assert.match(slot, /From the latest runs/);
    assert.match(slot, /Hydration Probe Note/);
    assert.match(slot, /The note both renders must show\./);
    assert.match(slot, /href="\/learn\/hydration-probe-note"/);
    assert.doesNotMatch(slot, /Draft Should Stay Hidden|Unindexed Should Stay Hidden/);
    assert.match(flight, /Hydration Probe Note/);
    assert.match(flight, /The note both renders must show\./);
    assert.match(flight, /\["\$","div",null,\{"data-learn-slot":"live","children":/);
    assert.doesNotMatch(flight, /\["\$","div",null,\{"data-learn-slot":"live"\}\]/);
    assert.doesNotMatch(flight, /Draft Should Stay Hidden|Unindexed Should Stay Hidden/);
  }
});

test("a caller cannot inject the live slot by sending the request header", async () => {
  const spoof = encodeLiveSlot([note("spoofed", "Spoofed Live Note")]);
  const response = await render("https://metaforge.gg/learn", emptyDb, { headers: { "x-metaforge-learn-live": spoof } });
  const html = await response.text();
  assert.doesNotMatch(html, /Spoofed Live Note/);
  assert.equal(liveSlot(html), "");
  assert.doesNotMatch(rscPayload(html), /Spoofed Live Note/);
});

test("learn article pages keep the article in the server HTML and the RSC payload", async () => {
  const response = await render("https://metaforge.gg/learn/reality-fracture-commander-set-review");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Reality Fracture: what the new cards are for/);
  assert.match(rscPayload(html), /Reality Fracture: what the new cards are for/);
  assert.doesNotMatch(html, /data-learn-slot="live"/);

  const dynamic = await render("https://metaforge.gg/learn/hydration-probe-note", dbWith([
    note("hydration-probe-note", "Hydration Probe Note", { description: "A dynamic article still renders on its own page." }),
  ]));
  assert.equal(dynamic.status, 200);
  const dynamicHtml = await dynamic.text();
  assert.match(dynamicHtml, /Hydration Probe Note/);
  assert.match(dynamicHtml, /A dynamic article still renders on its own page\./);
  assert.doesNotMatch(dynamicHtml, /data-learn-slot|__VINEXT_RSC_CHUNKS__/);
});
