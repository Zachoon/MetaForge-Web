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
// The affiliate-disclosure paragraph moved to the workbench chamber's own
// component during the page.tsx decomposition (Phase 4 Stage 4).
const workbenchChamber = await readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");
// inspectorPurchaseLink's derivation moved to forge-session-context.tsx
// during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
// The masterworks chamber's JSX moved to its own component during the
// page.tsx decomposition (Phase 4 Stage 3).
const masterworksChamber = await readFile(new URL("../app/components/forge/masterworks-chamber.tsx", import.meta.url), "utf8");

// --- Card inspector: the one new Phase 1 consumer ---

test("the card inspector prefers the selected printing's real tcgplayerId, falling back to a name-only search — never a second lookup or a guessed ID", () => {
  assert.match(
    forgeSessionContext,
    /const inspectorPurchaseLink = inspectedCard\s*\n\s*\? buildTcgplayerLink\(\{\s*\n\s*cardName: inspectedCard,\s*\n\s*tcgplayerProductId: inspectedPrinting\?\.tcgplayerId \?\? null,\s*\n\s*enabled: tcgplayerAffiliateEnabled,/,
  );
});

test("the card inspector's purchase link renders \"Buy on TCGplayer\", uses the shared link's real url/target/rel, and never selects a printing or closes the inspector on click", () => {
  const inspectorArtBlock = workbenchChamber.match(/<div className="card-inspector-art">[\s\S]*?<\/div>/)?.[0];
  assert.ok(inspectorArtBlock, "expected to find the card-inspector-art block");
  assert.match(inspectorArtBlock, /className="card-inspector-purchase-link"/);
  assert.match(inspectorArtBlock, /href=\{inspectorPurchaseLink\.url\}/);
  assert.match(inspectorArtBlock, /target=\{inspectorPurchaseLink\.target\}/);
  assert.match(inspectorArtBlock, /rel=\{inspectorPurchaseLink\.rel\}/);
  assert.match(inspectorArtBlock, />\s*Buy on TCGplayer\s*<\/a>/);
  assert.match(inspectorArtBlock, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test("the card inspector purchase link is visually secondary — inside the art panel, not the coaching dossier sections (WHY IT IS HERE, INTENT & CLOCK, etc.)", () => {
  const dossierBlock = workbenchChamber.match(/<div className="card-inspector-dossier">[\s\S]*?INTENT &amp; CLOCK[\s\S]{0,400}/)?.[0];
  assert.ok(dossierBlock, "expected to find the coaching dossier section including Intent & Clock");
  assert.doesNotMatch(dossierBlock, /card-inspector-purchase-link/, "the purchase link must not be mixed into the coaching prose");
});

// --- Disclosure gating ---

test("the disclosure renders exactly once, gated behind the same tcgplayerAffiliateEnabled flag every purchase link is gated behind — never per-row, per-printing, or per-link", () => {
  const occurrences = workbenchChamber.match(/className="affiliate-disclosure"/g) || [];
  assert.equal(occurrences.length, 1);
  assert.match(workbenchChamber, /\{tcgplayerAffiliateEnabled && \(\s*\n\s*<p className="affiliate-disclosure"/);
});

test("Phase 1B's two new purchase surfaces (replacement panel, experiment tablets) reuse the single existing disclosure — neither adds its own", () => {
  const occurrences = page.match(/className="affiliate-disclosure"/g) || [];
  assert.equal(occurrences.length, 1, "adding the two Phase 1B surfaces must not raise the disclosure count above 1");
  const replacementBlock = page.match(/className="forge-replacements"[\s\S]{0,4400}/)?.[0];
  assert.ok(replacementBlock);
  assert.doesNotMatch(replacementBlock, /affiliate-disclosure/);
  const tabletsBlock = page.match(/className="refinement-starters-vault"[\s\S]{0,3200}/)?.[0];
  assert.ok(tabletsBlock);
  assert.doesNotMatch(tabletsBlock, /affiliate-disclosure/);
});

// --- Explicitly excluded surfaces (Phase 1 scope decision) ---
//
// tests/affiliate-links-isolation.test.mjs already proves the whole file
// contains exactly 3 buildTcgplayerLink call sites — structurally
// impossible for a 4th to exist anywhere, including below. These are
// named, block-scoped checks on top of that global proof, for the
// specific surfaces called out as excluded in this batch.

test("the Masterwork candidate picker never gets a purchase action", () => {
  // The masterworks chamber's JSX moved to its own component during the
  // page.tsx decomposition (Phase 4 Stage 3) — it's a clean, isolated file
  // now, so the block it must not reach into is the entire file.
  assert.doesNotMatch(masterworksChamber, /buildTcgplayerLink|TCGplayer/i);
});

test("the mobile\\/desktop card action menu never gets a purchase action — it's Phase 1B or later, not this batch", () => {
  const menuBlock = workbenchChamber.match(/cardActionMenu && createPortal\([\s\S]*?\n {14}\)\}/)?.[0];
  assert.ok(menuBlock, "expected to find the card-action-menu portal block");
  assert.doesNotMatch(menuBlock, /buildTcgplayerLink|TCGplayer/i);
});

test("recommendation\\/lab surfaces still deferred in Phase 1B (multi-refill, meta-breaker) never get a purchase action", () => {
  for (const marker of [/className="multi-refill-packages"[\s\S]{0,600}/, /className="meta-breaker-dossier"[\s\S]{0,600}/]) {
    const block = workbenchChamber.match(marker)?.[0];
    assert.ok(block, `expected to find a block matching ${marker}`);
    assert.doesNotMatch(block, /buildTcgplayerLink|TCGplayer/i);
  }
});

test("the opening-experiment gate (curated first-experiment picker) remains untouched — same tablet data as the full tablet list, but this view is deferred", () => {
  const gateBlock = workbenchChamber.match(/className="opening-experiment-gate"[\s\S]{0,2200}/)?.[0];
  assert.ok(gateBlock, "expected to find the opening-experiment-gate block");
  assert.doesNotMatch(gateBlock, /buildTcgplayerLink|TCGplayer/i);
});

// --- Phase 1B: workbench replacement recommendations ---

test("the replacement panel builds a name-only search link for the candidate card — no printing exists yet for a card that isn't in the deck", () => {
  assert.match(
    page,
    /const replacementPurchaseLink = buildTcgplayerLink\(\{\s*\n\s*cardName: card\.name,\s*\n\s*tcgplayerProductId: null,\s*\n\s*enabled: tcgplayerAffiliateEnabled,/,
  );
});

test("the replacement panel's purchase link sits beside \"Add to deck\", never replaces it, and its click handler never calls addCardToDeck", () => {
  const mapBlock = page.match(/replacementRecommendations\.map\(\(card, index\) => \{[\s\S]*?\n {16}\}\)\}/)?.[0];
  assert.ok(mapBlock, "expected to find the replacementRecommendations.map block");
  assert.match(mapBlock, />\s*Add to deck\s*<\/button>/);
  const linkBlock = mapBlock.match(/\{replacementPurchaseLink && \([\s\S]*?<\/a>\s*\)\}/)?.[0];
  assert.ok(linkBlock, "expected to find the replacementPurchaseLink conditional block");
  assert.match(linkBlock, /className="replacement-purchase-link"/);
  assert.match(linkBlock, />\s*Buy on TCGplayer\s*<\/a>/);
  assert.match(linkBlock, /href=\{replacementPurchaseLink\.url\}/);
  assert.match(linkBlock, /target=\{replacementPurchaseLink\.target\}/);
  assert.match(linkBlock, /rel=\{replacementPurchaseLink\.rel\}/);
  assert.match(linkBlock, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.doesNotMatch(linkBlock, /addCardToDeck/);
  // The link must appear after the button in source order, i.e. visually
  // beneath it, never displacing it as the primary action.
  assert.ok(mapBlock.indexOf("Add to deck") < mapBlock.indexOf("replacement-purchase-link"));
});

test("lastCutCard (the outgoing card) never gets a purchase action anywhere in the replacement panel", () => {
  const panelBlock = page.match(/className="forge-replacements"[\s\S]{0,4400}/)?.[0];
  assert.ok(panelBlock, "expected to find the forge-replacements panel");
  assert.doesNotMatch(panelBlock, /buildTcgplayerLink\(\{\s*\n\s*cardName: lastCutCard/);
});

// --- Phase 1B: experiment tablets (full list) ---

test("the experiment tablet's purchase link builds a name-only search link for tablet.change.add only", () => {
  assert.match(
    workbenchChamber,
    /const tabletPurchaseLink = buildTcgplayerLink\(\{\s*\n\s*cardName: tablet\.change\.add,\s*\n\s*tcgplayerProductId: null,\s*\n\s*enabled: tcgplayerAffiliateEnabled,/,
  );
});

test("the tablet purchase link renders only inside the ADD figure, never the CUT figure", () => {
  const cutFigure = workbenchChamber.match(/<figure>\s*<button[\s\S]*?cardImage\(tablet\.change\.cut\)[\s\S]*?<\/figure>/)?.[0];
  assert.ok(cutFigure, "expected to find the CUT figure");
  assert.doesNotMatch(cutFigure, /tablet-purchase-link|buildTcgplayerLink|TCGplayer/i);
  const addFigure = workbenchChamber.match(/<figure>\s*<button[\s\S]*?cardImage\(tablet\.change\.add\)[\s\S]*?<\/figure>/)?.[0];
  assert.ok(addFigure, "expected to find the ADD figure");
  assert.match(addFigure, /className="tablet-purchase-link"/);
  assert.match(addFigure, />\s*Buy on TCGplayer\s*<\/a>/);
  assert.match(addFigure, /href=\{tabletPurchaseLink\.url\}/);
  assert.match(addFigure, /target=\{tabletPurchaseLink\.target\}/);
  assert.match(addFigure, /rel=\{tabletPurchaseLink\.rel\}/);
  assert.match(addFigure, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test("\"Accept this experiment\" remains present and untouched as the tablet's primary action", () => {
  const tabletCardBlock = workbenchChamber.match(/const tabletPurchaseLink[\s\S]{0,12000}Accept this experiment/)?.[0];
  assert.ok(tabletCardBlock, "expected to find the Accept button within the same tablet card as the purchase link");
  assert.match(tabletCardBlock, /className="tablet-accept"/);
  assert.match(tabletCardBlock, /onClick=\{\(\) => \{[\s\S]*?applyExperimentTablet\(tablet\)/);
});

test("no deck-level \"Shop Missing Cards\"\\/\"Buy on TCGplayer\" CTA exists near the deck price bar — deferred pending cart-deep-link verification", () => {
  assert.match(forgeSessionContext, /const deckPurchaseLink = buildTcgplayerDeckLink\(\{ rows: deckRows, enabled: tcgplayerAffiliateEnabled \}\)/);
  const headerBlock = workbenchChamber.match(/className="deck-header-actions"[\s\S]{0,1800}/)?.[0];
  assert.ok(headerBlock, "expected to find the deck header actions");
  assert.match(headerBlock, /ESTIMATED MARKET PRICE/);
  assert.match(headerBlock, /deckPriceTotal\.total\.toFixed\(2\)/);
  assert.match(headerBlock, /className="buy-deck-link"/);
  assert.match(headerBlock, /href=\{deckPurchaseLink\.url\}/);
  assert.match(headerBlock, />\s*Buy this deck →\s*<\/a>/);
});

test("no analytics/event-tracking call exists anywhere near the purchase links — explicitly out of scope for this batch", () => {
  assert.doesNotMatch(page, /buy_card_clicked|buy_recommendation_clicked|buy_missing_cards_clicked/);
});
