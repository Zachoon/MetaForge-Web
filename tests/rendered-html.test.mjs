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
  assert.match(html, /<title>MetaForge — Forge a Better Deck<\/title>/i);
  assert.match(html, /MAGIC: THE GATHERING · DECK COACH/);
  assert.match(html, /Understand your deck/);
  assert.match(html, /MetaForge explains how your\s*\n?\s*deck works, shows what to improve, and helps you make\s*\n?\s*confident changes\./);
  assert.match(html, /class="forge-brand-logo"[^>]+src="\/assets\/brand\/metaforge-mf-anvil\.webp"/i);
  assert.doesNotMatch(html, /<i>MF<\/i>/i);
  assert.match(html, /<meta name="impact-site-verification" value="05208696-7452-434e-89b1-d6be551c7505">/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/">/i);
  assert.match(html, /<script type="application\/ld\+json">.*"WebApplication".*<\/script>/i);
  assert.match(html, /<meta name="robots" content="index, follow">/i);
  assert.doesNotMatch(html, /content="noindex/i);
  assert.match(html, /Help us improve MetaForge\?/i);
  assert.doesNotMatch(html, /utt\.impactcdn\.com/i);
  assert.match(html, /<meta property="og:image" content="https:\/\/metaforge\.gg\/og\.png"/i);
  assert.doesNotMatch(html, /20eee0f8-1f57-4304-a32d-17bba0f1ec2a/i);
  assert.match(html, /data-forge-state="dormant"/);
  assert.match(html, /data-forge-action="none"/);
  assert.match(html, /data-motion="full"/);
  assert.match(html, /class="forge-motion-layer"/);
  assert.match(html, /class="forge-action-burst"/);
  assert.match(html, /<summary>Menu<\/summary>/);
  assert.match(html, /Reduce motion/);
  assert.match(html, /Build a deck/);
  assert.match(html, /Review my decklist/);
  assert.doesNotMatch(html, /THE PRIVATE BENCH/);
  assert.doesNotMatch(html, /Your preserved Masterworks/);
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
});

test("blocks crawler discovery on the authenticated host", async () => {
  const robots = await render("https://app.metaforge.gg/robots.txt");
  assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");
  const sitemap = await render("https://app.metaforge.gg/sitemap.xml");
  assert.equal(sitemap.status, 404);
});
