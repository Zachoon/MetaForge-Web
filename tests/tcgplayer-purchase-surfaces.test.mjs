import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// No component-render harness exists in this repo, so Phase 1's card
// inspector integration and excluded-surface boundaries are verified
// against the literal source that produces them — the same convention
// tests/review-focus.test.mjs and tests/guest-forge-boundary.test.mjs
// already use for page.tsx. tests/affiliate-links-isolation.test.mjs's
// "purchase surfaces ... consume buildTcgplayerLink" test already proves
// exactly 3 call sites exist in the whole file (decklist row, printing
// picker, card inspector) — this file adds named checks for the specific
// surfaces Phase 1 explicitly excludes, plus the card inspector's own
// preference/fallback and the disclosure gating.
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

// --- Card inspector: the one new Phase 1 consumer ---

test("the card inspector prefers the selected printing's real tcgplayerId, falling back to a name-only search — never a second lookup or a guessed ID", () => {
  assert.match(
    page,
    /const inspectorPurchaseLink = inspectedCard\s*\n\s*\? buildTcgplayerLink\(\{\s*\n\s*cardName: inspectedCard,\s*\n\s*tcgplayerProductId: inspectedPrinting\?\.tcgplayerId \?\? null,\s*\n\s*enabled: tcgplayerAffiliateEnabled,/,
  );
});

test("the card inspector's purchase link renders \"Buy on TCGplayer\", uses the shared link's real url/target/rel, and never selects a printing or closes the inspector on click", () => {
  const inspectorArtBlock = page.match(/<div className="card-inspector-art">[\s\S]*?<\/div>/)?.[0];
  assert.ok(inspectorArtBlock, "expected to find the card-inspector-art block");
  assert.match(inspectorArtBlock, /className="card-inspector-purchase-link"/);
  assert.match(inspectorArtBlock, /href=\{inspectorPurchaseLink\.url\}/);
  assert.match(inspectorArtBlock, /target=\{inspectorPurchaseLink\.target\}/);
  assert.match(inspectorArtBlock, /rel=\{inspectorPurchaseLink\.rel\}/);
  assert.match(inspectorArtBlock, />\s*Buy on TCGplayer\s*<\/a>/);
  assert.match(inspectorArtBlock, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test("the card inspector purchase link is visually secondary — inside the art panel, not the coaching dossier sections (WHY IT IS HERE, INTENT & CLOCK, etc.)", () => {
  const dossierBlock = page.match(/<div className="card-inspector-dossier">[\s\S]*?INTENT &amp; CLOCK[\s\S]{0,400}/)?.[0];
  assert.ok(dossierBlock, "expected to find the coaching dossier section including Intent & Clock");
  assert.doesNotMatch(dossierBlock, /card-inspector-purchase-link/, "the purchase link must not be mixed into the coaching prose");
});

// --- Disclosure gating ---

test("the disclosure renders exactly once, gated behind the same tcgplayerAffiliateEnabled flag every purchase link is gated behind — never per-row, per-printing, or per-link", () => {
  const occurrences = page.match(/className="affiliate-disclosure"/g) || [];
  assert.equal(occurrences.length, 1);
  assert.match(page, /\{tcgplayerAffiliateEnabled && \(\s*\n\s*<p className="affiliate-disclosure"/);
});

// --- Explicitly excluded surfaces (Phase 1 scope decision) ---
//
// tests/affiliate-links-isolation.test.mjs already proves the whole file
// contains exactly 3 buildTcgplayerLink call sites — structurally
// impossible for a 4th to exist anywhere, including below. These are
// named, block-scoped checks on top of that global proof, for the
// specific surfaces called out as excluded in this batch.

test("the Masterwork candidate reveal never gets a purchase action", () => {
  const masterworkBlock = page.match(/function MasterworkCard\([\s\S]*?\n}/)?.[0];
  assert.ok(masterworkBlock, "expected to find the MasterworkCard component");
  assert.doesNotMatch(masterworkBlock, /buildTcgplayerLink|TCGplayer/i);
});

test("the mobile\\/desktop card action menu never gets a purchase action — it's Phase 1B or later, not this batch", () => {
  const menuBlock = page.match(/cardActionMenu && createPortal\([\s\S]*?\n {14}\)\}/)?.[0];
  assert.ok(menuBlock, "expected to find the card-action-menu portal block");
  assert.doesNotMatch(menuBlock, /buildTcgplayerLink|TCGplayer/i);
});

test("recommendation\\/lab surfaces (experiment tablets, multi-refill, meta-breaker) never get a purchase action in this batch", () => {
  for (const marker of [/className="experiment-tablet[^"]*"[\s\S]{0,600}/, /className="multi-refill-packages"[\s\S]{0,600}/, /className="meta-breaker-dossier"[\s\S]{0,600}/]) {
    const block = page.match(marker)?.[0];
    assert.ok(block, `expected to find a block matching ${marker}`);
    assert.doesNotMatch(block, /buildTcgplayerLink|TCGplayer/i);
  }
});

test("no deck-level \"Shop Missing Cards\"\\/\"Buy on TCGplayer\" CTA exists near the deck price bar — deferred pending cart-deep-link verification", () => {
  const priceBarBlock = page.match(/className="deck-price-bar"[\s\S]{0,800}/)?.[0];
  assert.ok(priceBarBlock, "expected to find the deck-price-bar block");
  assert.doesNotMatch(priceBarBlock, /buildTcgplayerLink|Shop Missing Cards|Buy on TCGplayer/i);
});

test("no analytics/event-tracking call exists anywhere near the purchase links — explicitly out of scope for this batch", () => {
  assert.doesNotMatch(page, /buy_card_clicked|buy_recommendation_clicked|buy_missing_cards_clicked/);
});
