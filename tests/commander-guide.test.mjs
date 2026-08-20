import assert from "node:assert/strict";
import test from "node:test";

async function render(url) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(url, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked" },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("a commander guide page server-renders with real SEO metadata", async () => {
  const response = await render("https://metaforge.gg/commanders/korvold-fae-cursed-king");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Korvold, Fae-Cursed King Commander Deck Guide \| MetaForge<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/commanders\/korvold-fae-cursed-king"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1, "exactly one canonical tag — the global seoMarkup injector must not add a duplicate");
});

test("a commander guide page has exactly one real, semantic H1 naming the commander", async () => {
  const html = await (await render("https://metaforge.gg/commanders/korvold-fae-cursed-king")).text();
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1, "expected exactly one H1 on the guide");
  assert.match(h1Matches[0][1], /Korvold, Fae-Cursed King/);
});

test("names real, oracle-grounded occupancy engines — not raw internal contrast strings", async () => {
  const html = await (await render("https://metaforge.gg/commanders/korvold-fae-cursed-king")).text();
  assert.match(html, /Aristocrats Engine/);
  // The engine's own internal disambiguation notes ("not artifact-sac and
  // not generic tokens") must never reach a real player — human copy only.
  assert.doesNotMatch(html, /not artifact-sac/i);
  assert.doesNotMatch(html, /not a false-open/i);
  assert.doesNotMatch(html, /not generic tokens/i);
});

test("quotes the commander's real printed oracle text, not a paraphrase", async () => {
  const html = await (await render("https://metaforge.gg/commanders/korvold-fae-cursed-king")).text();
  assert.match(html, /Whenever Korvold enters or attacks, sacrifice another permanent\./);
  assert.match(html, /put a \+1\/\+1 counter on Korvold and draw a card\./);
});

test("a commander with no named occupancy engine gets an honest fallback, never a fabricated one", async () => {
  const html = await (await render("https://metaforge.gg/commanders/atraxa-grand-unifier")).text();
  assert.match(html, /doesn.{1,6}t name one of its ten specific engine types/i);
  assert.doesNotMatch(html, /Aristocrats Engine|Typal Engine|Tokens Engine/);
});

test("a typal commander correctly detects its Typal Engine (tag lookup is configured, not silently empty)", async () => {
  const html = await (await render("https://metaforge.gg/commanders/edgar-markov")).text();
  assert.match(html, /Typal Engine/);
  assert.match(html, /Tokens Engine/);
});

test("the CTA deep-links into the real builder with a public slug, never exposing internal engine state", async () => {
  const html = await (await render("https://metaforge.gg/commanders/korvold-fae-cursed-king")).text();
  assert.match(html, /href="\/\?commander=korvold-fae-cursed-king"/);
  assert.doesNotMatch(html, /verifiedFacts=|colorIdentity=/i);
});

test("an unknown commander slug 404s instead of rendering a broken page", async () => {
  const response = await render("https://metaforge.gg/commanders/not-a-real-commander");
  assert.equal(response.status, 404);
});

test("the commander index page lists every published guide with real, distinct taglines", async () => {
  const response = await render("https://metaforge.gg/commanders");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Commander Deck Guides \| MetaForge<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/commanders"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1);
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1);
  for (const slug of ["korvold-fae-cursed-king", "edgar-markov", "yuriko-the-tigers-shadow", "atraxa-grand-unifier", "the-ur-dragon"]) {
    assert.match(html, new RegExp(`href="/commanders/${slug}"`));
  }
  for (const placeholder of [/lorem ipsum/i, /coming soon/i, /placeholder/i, /TBD/i, /TODO/i, /\[insert/i]) {
    assert.doesNotMatch(html, placeholder);
  }
});

test("Academy and Commander guides cross-link each other for discoverability", async () => {
  const academyHtml = await (await render("https://metaforge.gg/academy")).text();
  assert.match(academyHtml, /href="\/commanders"/);
  const commanderHtml = await (await render("https://metaforge.gg/commanders/korvold-fae-cursed-king")).text();
  assert.match(commanderHtml, /href="\/academy"/);
});

test("all commander guide pages are listed in the public sitemap and are not crawl-blocked", async () => {
  const response = await render("https://metaforge.gg/sitemap.xml");
  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/commanders<\/loc>/);
  for (const slug of ["korvold-fae-cursed-king", "edgar-markov", "yuriko-the-tigers-shadow", "atraxa-grand-unifier", "the-ur-dragon"]) {
    assert.match(xml, new RegExp(`<loc>https://metaforge\\.gg/commanders/${slug}</loc>`));
  }
  const robots = await (await render("https://metaforge.gg/robots.txt")).text();
  assert.doesNotMatch(robots, /Disallow: \/commanders/);
});
