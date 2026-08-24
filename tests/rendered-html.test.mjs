import assert from "node:assert/strict";
import test from "node:test";

async function render(url = "https://metaforge.gg/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(url, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked" },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the MetaForge product experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>MTG Commander Deck Builder &amp; Analyzer \| MetaForge<\/title>/i);
  assert.match(html, /MAGIC: THE GATHERING · DECK COACH/);
  assert.match(html, /Understand your Magic deck/);
  assert.match(html, /Build a new MTG deck or analyze a decklist/i);
  assert.match(html, /href="\/commanders"/i);
  assert.match(html, /href="\/tools"/i);
  assert.match(html, /Commander deck guides/i);
  assert.match(html, /MTG deckbuilding guides/i);
  assert.match(html, /class="forge-brand-logo"[^>]+src="\/assets\/brand\/metaforge-mf-anvil\.webp"/i);
  const forgeBrandMatch = html.match(/<button class="forge-brand"[\s\S]*?<\/button>/i);
  assert.ok(forgeBrandMatch, "forge-brand button should render");
  assert.doesNotMatch(forgeBrandMatch[0], /<i>MF<\/i>/i);
  assert.match(html, /<meta name="impact-site-verification" value="05208696-7452-434e-89b1-d6be551c7505">/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/"\s*\/?\s*>/i);
  assert.match(html, /<script type="application\/ld\+json">.*"SoftwareApplication".*<\/script>/i);
  assert.match(html, /<meta name="robots" content="index, follow">/i);
  assert.doesNotMatch(html, /content="noindex/i);
  assert.match(html, /Help us improve MetaForge\?/i);
  assert.doesNotMatch(html, /utt\.impactcdn\.com/i);
  assert.match(html, /<meta property="og:image" content="https:\/\/metaforge\.gg\/og\.png"/i);
  assert.doesNotMatch(html, /20eee0f8-1f57-4304-a32d-17bba0f1ec2a/i);
  assert.match(html, /data-forge-state="dormant"/);
  assert.match(html, /data-forge-action="none"/);
  assert.match(html, /data-motion="full"/);
  assert.match(html, /<summary>[\s\S]*?Forgemaster[\s\S]*?<\/summary>/);
  assert.match(html, /href="\/academy"/i);
  assert.match(html, /Reduce motion/);
  assert.match(html, /Build a deck/);
  assert.match(html, /Review my decklist/);
  assert.doesNotMatch(html, /THE PRIVATE BENCH/);
  assert.doesNotMatch(html, /Your saved decks/);
  assert.doesNotMatch(html, /RELEASE GATE|LIVE ACCEPTANCE/);
  assert.match(html, /A DECK COACH FOR EVERY FORMAT/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the authenticated app out of search results", async () => {
  const response = await render("https://app.metaforge.gg/");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive, noimageindex");
  const html = await response.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">/i);
  assert.doesNotMatch(html, /application\/ld\+json/i);
  assert.doesNotMatch(html, /impact-site-verification/i);
});

test("publishes canonical URLs for public legal pages", async () => {
  const response = await render("https://metaforge.gg/privacy");
  const html = await response.text();
  assert.match(html, /<title>Privacy Policy \| MetaForge<\/title>/i);
  assert.match(html, /How MetaForge handles guest Forge previews/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/privacy"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1);

  const terms = await render("https://metaforge.gg/terms");
  const termsHtml = await terms.text();
  assert.match(termsHtml, /<title>Terms of Use \| MetaForge<\/title>/i);
  assert.match(termsHtml, /public-alpha Magic: The Gathering deckbuilding/i);
  assert.match(termsHtml, /<link rel="canonical" href="https:\/\/metaforge\.gg\/terms"\s*\/>/i);
  assert.equal(termsHtml.match(/rel="canonical"/gi)?.length, 1);
});

test("permanently redirects every www duplicate to the apex canonical without losing its path or query", async () => {
  const response = await render("https://www.metaforge.gg/academy/why-cant-i-cast-my-spells?utm_source=search");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://metaforge.gg/academy/why-cant-i-cast-my-spells?utm_source=search");
  assert.match(response.headers.get("cache-control") || "", /max-age=86400/);
  assert.equal(await response.text(), "");
});

test("publishes unique Academy metadata and valid editorial schema", async () => {
  const academy = await render("https://metaforge.gg/academy");
  const academyHtml = await academy.text();
  assert.match(academyHtml, /<title>MetaForge Academy — Commander Deckbuilding Guides<\/title>/i);
  assert.match(academyHtml, /<link rel="canonical" href="https:\/\/metaforge\.gg\/academy"/i);
  assert.match(academyHtml, /"@type":"CollectionPage"/i);
  assert.match(academyHtml, /"@type":"BreadcrumbList"/i);

  const commanders = await render("https://metaforge.gg/commanders");
  const commandersHtml = await commanders.text();
  assert.match(commandersHtml, /"@type":"CollectionPage"/i);
  assert.match(commandersHtml, /"@type":"BreadcrumbList"/i);

  const commander = await render("https://metaforge.gg/commanders/korvold-fae-cursed-king");
  const commanderHtml = await commander.text();
  assert.match(commanderHtml, /"@type":"Article"/i);
  assert.match(commanderHtml, /"@type":"BreadcrumbList"/i);

  const guide = await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells");
  const guideHtml = await guide.text();
  assert.match(guideHtml, /Why Can(?:'|&#x27;)t I Cast My Spells in Commander\? \| MetaForge/i);
  assert.match(guideHtml, /"@type":"Article"/i);
  assert.match(guideHtml, /"headline":"Why Can't I Cast My Spells\?"/i);
  assert.match(guideHtml, /"@type":"BreadcrumbList"/i);
  assert.doesNotMatch(guideHtml, /"@type":"FAQPage"|"@type":"HowTo"/i);
});

test("publishes crawlable MTG tool landing pages with unique metadata and useful schema", async () => {
  const tools = await render("https://metaforge.gg/tools");
  const toolsHtml = await tools.text();
  assert.match(toolsHtml, /<title>Free MTG &amp; Commander Deckbuilding Tools \| MetaForge<\/title>/i);
  assert.match(toolsHtml, /<link rel="canonical" href="https:\/\/metaforge\.gg\/tools"/i);
  assert.match(toolsHtml, /"@type":"CollectionPage"/i);

  const analyzer = await render("https://metaforge.gg/tools/mtg-deck-analyzer");
  const analyzerHtml = await analyzer.text();
  assert.match(analyzerHtml, /<title>MTG Deck Analyzer \| MetaForge<\/title>/i);
  assert.match(analyzerHtml, /Analyze a Magic: The Gathering decklist/i);
  assert.match(analyzerHtml, /href="\/\?intent=analyze"/i);
  assert.match(analyzerHtml, /"@type":"WebApplication"/i);
  assert.match(analyzerHtml, /"@type":"BreadcrumbList"/i);

  const builder = await render("https://metaforge.gg/tools/commander-deck-builder");
  const builderHtml = await builder.text();
  assert.match(builderHtml, /<title>Commander Deck Builder \| MetaForge<\/title>/i);
  assert.match(builderHtml, /href="\/\?intent=build"/i);
  assert.notEqual(analyzerHtml.match(/<meta name="description" content="([^"]+)/i)?.[1], builderHtml.match(/<meta name="description" content="([^"]+)/i)?.[1]);
});

test("publishes the expanded commander library with related internal links", async () => {
  const index = await render("https://metaforge.gg/commanders");
  const indexHtml = await index.text();
  assert.match(indexHtml, /Muldrotha, the Gravetide/i);
  assert.match(indexHtml, /Nekusar, the Mindrazer/i);

  const guide = await render("https://metaforge.gg/commanders/muldrotha-the-gravetide");
  const guideHtml = await guide.text();
  assert.match(guideHtml, /Muldrotha, the Gravetide Commander Deck Guide/i);
  assert.match(guideHtml, /Explore related Commander resources/i);
  assert.match(guideHtml, /\/tools\/commander-deck-builder/i);
  assert.match(guideHtml, /<meta property="og:image" content="https:\/\/cards\.scryfall\.io\/art_crop/i);
});

test("publishes a crawlable public robots file and sitemap", async () => {
  const robots = await render("https://metaforge.gg/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/metaforge\.gg\/sitemap\.xml/);
  assert.match(await render("https://metaforge.gg/robots.txt").then((response) => response.text()), /Disallow: \/profile\n/);

  const sitemap = await render("https://metaforge.gg/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type") ?? "", /^application\/xml/i);
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/terms<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/privacy<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy\/what-is-my-deck-actually-trying-to-do<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/tools\/mtg-deck-analyzer<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/tools\/commander-deck-builder<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/commanders\/muldrotha-the-gravetide<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/commanders\/nekusar-the-mindrazer<\/loc>/);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, 36);
  assert.equal(new Set(locations).size, locations.length);
});

test("blocks crawler discovery on the authenticated host", async () => {
  const robots = await render("https://app.metaforge.gg/robots.txt");
  assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");
  const sitemap = await render("https://app.metaforge.gg/sitemap.xml");
  assert.equal(sitemap.status, 404);
});
