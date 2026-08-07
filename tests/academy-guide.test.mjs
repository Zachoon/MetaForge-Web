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

test("the guide route exists, server-renders, and carries real SEO metadata", async () => {
  const response = await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Why Can&#x27;t I Cast My Spells in Commander\? \| MetaForge<\/title>/i);
  assert.match(html, /Cards stuck in your hand every Commander game/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/academy\/why-cant-i-cast-my-spells"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1, "exactly one canonical tag — the global seoMarkup injector must not add a duplicate");
});

test("has exactly one real, semantic H1 with the actual guide question", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells")).text();
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1, "expected exactly one H1 on the page");
  assert.match(h1Matches[0][1], /Why Can.{1,6}t I Cast My Spells\?/);
});

test("contains real article copy covering every named cause, not a placeholder or stub", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells")).text();
  // The five real causes named in the brief — each must actually appear as
  // substantive coverage, not just a bullet-point label.
  assert.match(html, /not drawing enough lands/i);
  assert.match(html, /wrong colors/i);
  assert.match(html, /mana curve/i);
  assert.match(html, /small number of.{0,20}cards do all the setup|dependency/i);
  assert.match(html, /hands that can.{1,6}t actually do anything|mulligan/i);
  // Never reduces the answer to a single universal rule.
  assert.doesNotMatch(html, /run 3[0-9] lands|always run \d+ lands/i);
  // No placeholder/stub language anywhere.
  for (const placeholder of [/lorem ipsum/i, /coming soon/i, /placeholder/i, /TBD/i, /TODO/i, /\[insert/i]) {
    assert.doesNotMatch(html, placeholder, `found placeholder-shaped text matching ${placeholder}`);
  }
});

test("teaches jargon terms gently — plain language first, term second — never a bare unexplained term", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells")).text();
  assert.match(html, /players (?:sometimes |often )?call (?:this|that) .{0,40}(?:mana screwed|color-consistency problem)/i);
});

test("the CTA uses player-centered language and points to the public guide key, never the canonical reviewFocus string", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells")).text();
  assert.match(html, /href="\/\?guide=cast-spells"/);
  assert.doesNotMatch(html, /focus=/i, "the URL must never expose the internal reviewFocus query param or value");
  assert.match(html, /Investigate my deck/i);
  assert.match(html, /Bring your decklist/i);
});

test("the CTA section is honest about what MetaForge's consistency check does and does not cover in that pass", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-cant-i-cast-my-spells")).text();
  assert.match(html, /real odds/i);
  assert.doesNotMatch(html, /guarantee|100%|proves?\b.{0,15}(problem|issue)/i, "must never overclaim beyond what the engine can actually support");
  assert.match(html, /won.{1,6}t diagnose your curve or your opening-hand habits/i, "must be explicit that curve/mulligan discipline are not covered by this same pass");
});

test("the Academy index is a real page listing exactly the published guides — no coming-soon placeholders for the still-unwritten ones", async () => {
  const response = await render("https://metaforge.gg/academy");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>MetaForge Academy/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/academy"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1);
  assert.match(html, /href="\/academy\/why-cant-i-cast-my-spells"/);
  assert.match(html, /href="\/academy\/why-do-i-run-out-of-cards"/);
  assert.match(html, /href="\/academy\/why-does-my-deck-start-so-slowly"/);
  // The H1 owns search intent — the brand name is already in the logo and
  // the eyebrow label, so the visible heading names the actual topic
  // instead of repeating "MetaForge."
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1, "expected exactly one H1 on the Academy index");
  assert.equal(h1Matches[0][1], "Commander Deckbuilding Academy");
  assert.doesNotMatch(h1Matches[0][1], /MetaForge/);
  for (const placeholder of [/coming soon/i, /more guides on the way/i, /placeholder/i]) {
    assert.doesNotMatch(html, placeholder);
  }
});

test("the Academy index frames each entry as the player's own first-person thought, not a clinical guide title", async () => {
  const html = await (await render("https://metaforge.gg/academy")).text();
  assert.match(html, /What.{1,6}s happening in your games\?/);
  assert.match(html, /I can.{1,6}t cast my spells\./);
  assert.match(html, /I run out of cards\./);
  assert.match(html, /My deck starts too slowly\./);
});

test("all three Academy pages are listed in the public sitemap", async () => {
  const response = await render("https://metaforge.gg/sitemap.xml");
  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy\/why-cant-i-cast-my-spells<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy\/why-do-i-run-out-of-cards<\/loc>/);
  assert.match(xml, /<loc>https:\/\/metaforge\.gg\/academy\/why-does-my-deck-start-so-slowly<\/loc>/);
});

test("the guide is not crawl-blocked by robots.txt", async () => {
  const response = await render("https://metaforge.gg/robots.txt");
  const body = await response.text();
  assert.doesNotMatch(body, /Disallow: \/academy/);
});

// --- Second guide: Why Do I Always Run Out of Cards? ---

test("the second guide route exists, server-renders, and carries real SEO metadata", async () => {
  const response = await render("https://metaforge.gg/academy/why-do-i-run-out-of-cards");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Why Do I Always Run Out of Cards\? \| MetaForge<\/title>/i);
  assert.match(html, /Empty-handed by turn eight/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/academy\/why-do-i-run-out-of-cards"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1, "exactly one canonical tag — the global seoMarkup injector must not add a duplicate");
});

test("the second guide has exactly one real, semantic H1 with the actual guide question", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-do-i-run-out-of-cards")).text();
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1, "expected exactly one H1 on the guide");
  assert.match(h1Matches[0][1], /Why Do I Always Run Out of Cards\?/);
});

test("the second guide draws the true-vs-virtual card advantage distinction that's the whole point of the article — not a stub", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-do-i-run-out-of-cards")).text();
  assert.match(html, /true card advantage/i);
  assert.match(html, /virtual card advantage/i);
  assert.match(html, /players call this/i);
  // No placeholder/stub language anywhere.
  for (const placeholder of [/lorem ipsum/i, /coming soon/i, /placeholder/i, /TBD/i, /TODO/i, /\[insert/i]) {
    assert.doesNotMatch(html, placeholder, `found placeholder-shaped text matching ${placeholder}`);
  }
});

test("the second guide cross-links the first guide's mana-curve explanation instead of re-explaining it from scratch", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-do-i-run-out-of-cards")).text();
  assert.match(html, /href="\/academy\/why-cant-i-cast-my-spells"/);
});

test("the second guide's CTA uses the public guide key, never exposes the internal reviewFocus/focus param, and is honest about not automating the true/virtual split", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-do-i-run-out-of-cards")).text();
  assert.match(html, /href="\/\?guide=out-of-cards"/);
  assert.doesNotMatch(html, /focus=/i, "the URL must never expose the internal reviewFocus query param or value");
  assert.match(html, /Investigate my deck/i);
  assert.match(html, /Bring your decklist/i);
  assert.match(html, /Card advantage/, "must point to the real, generically visible per-card role tag — not an invented metric");
  assert.doesNotMatch(html, /guarantee|100%|proves?\b.{0,15}(problem|issue)/i, "must never overclaim beyond what the engine can actually support");
  assert.match(html, /won.{1,6}t sort your dead hands into true versus virtual shortage/i, "must be explicit that the true/virtual split still requires the player's own observation");
});

// --- Third guide: Why Does My Deck Start So Slowly? ---

test("the third guide route exists, server-renders, and carries real SEO metadata", async () => {
  const response = await render("https://metaforge.gg/academy/why-does-my-deck-start-so-slowly");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Why Does My Deck Start So Slowly\? \| MetaForge<\/title>/i);
  assert.match(html, /Still setting up on turn four/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/metaforge\.gg\/academy\/why-does-my-deck-start-so-slowly"\s*\/>/i);
  assert.equal(html.match(/rel="canonical"/gi)?.length, 1, "exactly one canonical tag — the global seoMarkup injector must not add a duplicate");
});

test("the third guide has exactly one real, semantic H1 with the actual guide question", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-does-my-deck-start-so-slowly")).text();
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(h1Matches.length, 1, "expected exactly one H1 on the guide");
  assert.match(h1Matches[0][1], /Why Does My Deck Start So Slowly\?/);
});

test("the third guide covers all four named causes, not a placeholder or stub", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-does-my-deck-start-so-slowly")).text();
  assert.match(html, /top-heavy/i);
  assert.match(html, /fast mana/i);
  assert.match(html, /stuck on color/i);
  assert.match(html, /relative to the table/i);
  for (const placeholder of [/lorem ipsum/i, /coming soon/i, /placeholder/i, /TBD/i, /TODO/i, /\[insert/i]) {
    assert.doesNotMatch(html, placeholder, `found placeholder-shaped text matching ${placeholder}`);
  }
});

test("the third guide cross-links the first and second guides instead of re-explaining their concepts from scratch", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-does-my-deck-start-so-slowly")).text();
  assert.match(html, /href="\/academy\/why-cant-i-cast-my-spells"/);
  assert.match(html, /href="\/academy\/why-do-i-run-out-of-cards"/);
});

test("the third guide's CTA uses the public guide key, never exposes the internal reviewFocus/focus param, and precisely scopes what the real fast-mana signal covers", async () => {
  const html = await (await render("https://metaforge.gg/academy/why-does-my-deck-start-so-slowly")).text();
  assert.match(html, /href="\/\?guide=starts-slow"/);
  assert.doesNotMatch(html, /focus=/i, "the URL must never expose the internal reviewFocus query param or value");
  assert.match(html, /Investigate my deck/i);
  assert.match(html, /Bring your decklist/i);
  // Must not overclaim "fast mana" as covering all ramp broadly.
  assert.match(html, /not every card that.{1,6}s loosely .{0,3}ramp.{0,3}/i);
  assert.doesNotMatch(html, /guarantee|100%|proves?\b.{0,15}(problem|issue)/i, "must never overclaim beyond what the engine can actually support");
  assert.match(html, /won.{1,6}t know how fast the rest of your table plays/i, "must be explicit that table-relative pace is not something the engine measures");
});
