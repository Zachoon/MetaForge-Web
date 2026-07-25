import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8");

test("defaults the workbench to a remembered Guided View", () => {
  assert.match(page, /useState<"guided" \| "full">\("guided"\)/);
  assert.match(page, /metaforge\.resultViewMode/);
  assert.match(page, />\s*Guided View\s*</);
  assert.match(page, />\s*Full Forge\s*</);
});

test("places deck and refinement surfaces before the intelligence vault", () => {
  assert.match(css, /\.progressive-results \.deck-gallery[^}]*order:2/);
  assert.match(css, /\.progressive-results \.testing-loop\{order:4/);
  assert.match(css, /\.progressive-results \.forge-understanding-bridge\{order:5/);
  assert.match(css, /\.progressive-results \.forge-intelligence-vault\{order:6/);
  assert.match(page, /className="forge-intelligence-vault"/);
});

test("turns the result into one active chapter instead of a continuous instrument wall", () => {
  assert.match(page, /activeForgeChapter.*useState<1 \| 2 \| 3 \| 4>\(1\)/);
  assert.match(page, /id="forge-chapter-rail"/);
  assert.match(page, /chapter-\$\{activeForgeChapter\}-active/);
  assert.match(css, /\.chapter-1-active \.deck-manuscript>header\{display:flex\}/);
  assert.match(css, /\.chapter-2-active>\.testing-loop\{display:block/);
  assert.match(css, /\.chapter-3-active \.forge-understanding-bridge\{display:block/);
  assert.match(css, /\.chapter-4-active \.forge-intelligence-vault\{display:block/);
});

test("lets players revisit every commission step they have already reached", () => {
  assert.match(page, /furthestCommissionStep/);
  assert.match(page, /visitCommissionStep/);
  assert.match(page, /disabled=\{index > furthestCommissionStep\}/);
  assert.match(page, /aria-current=\{chapter === index \? "step" : undefined\}/);
});

test("turns deck stress experiments into concrete player insights", () => {
  assert.match(page, /WHAT THE MODEL SAW/);
  assert.match(page, /WHY THIS SWAP/);
  assert.match(page, /EXPECTED CHANGE/);
  assert.match(page, /HOW TO JUDGE IT/);
  assert.match(page, /scenarioPassRate/);
});

test("offers a contained Workbench and an unrestricted full ledger", () => {
  assert.match(page, /useState<"workbench" \| "ledger">\("workbench"\)/);
  assert.match(page, />\s*Workbench\s*</);
  assert.match(page, />\s*Full ledger\s*</);
  assert.match(css, /\.workbench-deck-view \.deck-gallery\{[^}]*max-height/);
  assert.match(css, /\.ledger-deck-view \.deck-gallery\{max-height:none/);
});

test("offers three evidence-led experiment tablets before optional match evidence", () => {
  assert.match(page, /Three evidence-led controlled experiments/i);
  assert.match(page, /buildExperimentTablets/);
  assert.match(page, /Field observation/);
  assert.match(page, /Structural pressure point/);
  assert.match(page, /Smallest honest test/);
  assert.match(page, /Expected benefit/);
  assert.match(page, /<dt>Tradeoff<\/dt>/);
  assert.match(page, /Evidence status/);
  assert.match(page, /className="match-evidence-drawer"/);
  assert.match(page, /className="custom-refinement-trigger"/);
  assert.match(page, /refinementComposerOpen && !forgeReply/);
});

test("keeps the Editing Anvil closed until the player asks for it", () => {
  assert.match(page, /useState\(false\);[\s\S]*?forgeGenerationError/);
  assert.match(page, /Raise the Editing Anvil/);
});

test("reveals only the strongest systems before the player requests the archive", () => {
  assert.match(page, /const visibleForgeSystems = useMemo/);
  assert.match(page, /forgeSystemsReport\.systems\.slice\(0, 3\)/);
  assert.match(page, /Reveal all \$\{forgeSystemsReport\.systems\.length\} detected systems/);
});

test("automatically exposes intelligence when a hard deck gate fails", () => {
  assert.match(
    page,
    /resultViewMode === "full"[\s\S]*?intelligenceOpen[\s\S]*?!deckIntegrity\.passed/,
  );
  assert.match(page, /ATTENTION REQUIRED/);
});

test("preserves match evidence on its exact revision", () => {
  assert.match(page, /prepareStoryBenchRevisions\(nextRevisions\)/);
  assert.match(
    page,
    /serializeStoryBenchRevision\(revision,\s*\{[\s\S]*?index[\s\S]*?record: nextRecord[\s\S]*?matches: nextMatches[\s\S]*?revisionCount: nextRevisions\.length/,
  );
  assert.match(page, /family\.revisions\.flatMap/);
});
