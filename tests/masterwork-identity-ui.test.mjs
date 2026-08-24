import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("a completed deck receives a customizable Masterwork identity", async () => {
  const page = await read("app/page.tsx");
  // The deck hero and identity-personalization JSX moved to the workbench
  // chamber's own component during the page.tsx decomposition (Phase 4
  // Stage 4).
  const workbenchChamber = await read("app/components/forge/workbench-chamber.tsx");
  assert.match(workbenchChamber, /YOUR DECK/);
  assert.match(workbenchChamber, /Personalize deck/);
  assert.match(workbenchChamber, /Deck Identity/);
  assert.match(workbenchChamber, /Deck name/);
  assert.match(workbenchChamber, /masterwork-commander-medallion/);
  assert.match(workbenchChamber, /masterwork-identity-marks/);
  assert.match(page, /className="forge-global-rail"/);
  assert.doesNotMatch(page, /className="masterwork-shell-top"/);
  assert.doesNotMatch(page, /className="masterwork-shell-rail"/);
  assert.doesNotMatch(page, /aria-label="Masterwork workspace"/);
  assert.match(workbenchChamber, /masterwork-shell-bottom/);
  assert.match(workbenchChamber, /Goldfish this deck/);
  assert.match(workbenchChamber, /Featured art/);
  assert.match(workbenchChamber, /Stained Glass/);
  assert.match(workbenchChamber, /Etched Metal/);
  assert.match(workbenchChamber, /Clean Art/);
  assert.match(workbenchChamber, /Focus position/);
  assert.match(workbenchChamber, /Glow intensity/);
});

test("identity is deck-scoped local presentation state and never construction input", async () => {
  // masterworkIdentityKey's derivation moved to forge-session-context.tsx
  // during the page.tsx decomposition (Phase 4 Stage 2); the localStorage
  // write itself moved to the workbench chamber's own component during
  // Stage 4.
  const forgeSessionContext = await read("app/forge-session-context.tsx");
  const workbenchChamber = await read("app/components/forge/workbench-chamber.tsx");
  assert.match(forgeSessionContext, /metaforge\.masterworkIdentity\.\$\{deckId \|\| activeCommanderName \|\| chosenWork\.name\}/);
  assert.match(workbenchChamber, /localStorage\.setItem\(masterworkIdentityKey/);
  assert.doesNotMatch(workbenchChamber, /buildPreChoiceCoaching\([\s\S]{0,180}masterworkIdentity/);
});

test("the deck hero keeps art atmospheric and content readable", async () => {
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.masterwork-deck-hero:before/);
  assert.match(css, /\.masterwork-glass/);
  assert.match(css, /\.masterwork-deck-hero:after/);
  assert.match(css, /\.masterwork-identity-panel/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /repeating-conic-gradient/);
  assert.match(css, /masterwork-shell-top,.masterwork-shell-rail\{display:none!important\}/);
  assert.doesNotMatch(css, /\.masterwork-shell-top\{display:flex/);
  assert.doesNotMatch(css, /:has\(\.masterwork-shell-top\)/);
  assert.match(css, /@media\(max-width:560px\).*masterwork-deck-hero/s);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
