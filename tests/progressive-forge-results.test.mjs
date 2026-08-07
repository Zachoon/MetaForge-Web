import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
const motifCss = await readFile(new URL("../app/masterwork-motifs.css", import.meta.url), "utf8");
const polishCss = await readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8");

test("defaults the workbench to a remembered deck-first view", () => {
  assert.match(page, /useState<"guided" \| "full">\("guided"\)/);
  assert.match(page, /metaforge\.resultViewMode/);
  assert.match(page, />\s*Deck first\s*</);
  assert.match(page, />\s*All analysis\s*</);
});

test("places deck and refinement surfaces before the intelligence vault", () => {
  assert.match(css, /\.progressive-results \.deck-gallery[^}]*order:2/);
  assert.match(css, /\.progressive-results \.testing-loop\{order:4/);
  assert.match(css, /\.progressive-results \.forge-understanding-bridge\{order:5/);
  assert.match(css, /\.progressive-results \.forge-intelligence-vault\{order:6/);
  assert.match(page, /className="forge-intelligence-vault"/);
});

test("turns the result into one active chapter instead of a continuous instrument wall", () => {
  assert.match(page, /activeForgeChapter.*useState<1 \| 2 \| 3 \| 4 \| 5>\(1\)/);
  assert.match(page, /id="forge-chapter-rail"/);
  assert.match(page, /WHAT TO DO NEXT/);
  assert.match(page, /Your deck is ready/);
  assert.match(page, /"Improve"/);
  assert.match(page, /"How it works"/);
  assert.match(page, /"Analysis"/);
  assert.match(page, /chapter-\$\{activeForgeChapter\}-active/);
  assert.match(css, /\.chapter-1-active \.deck-manuscript>header\{display:flex\}/);
  assert.match(css, /\.chapter-2-active>\.testing-loop\{display:block/);
  assert.match(page, /CHAPTER V · THE PROVING GROUNDS/);
  assert.match(page, /Begin this field test/);
  assert.match(page, /metaforge\.activeFieldTest/);
  assert.match(page, /This game did not test it/);
  assert.match(page, /The Forge will treat them as one clue/);
  assert.match(css, /\.chapter-5-active>\.proving-grounds\{display:block/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /flex:0 0 82%/);
  assert.match(page, /activeButton\.offsetLeft - \(rail\.clientWidth - activeButton\.clientWidth\) \/ 2/);
  assert.match(css, /\.opening-experiment-pending \.forge-map-intro\{display:none\}/);
  assert.match(css, /\.chapter-3-active \.forge-understanding-bridge\{display:block/);
  assert.match(css, /\.chapter-4-active \.forge-intelligence-vault\{display:block/);
});

test("reveals a complete deck immediately after the forge ceremony", () => {
  assert.match(page, /void inspectMasterwork\(0\)/);
  assert.match(page, /setOpeningExperimentPending\(false\)/);
  assert.doesNotMatch(page, /setOpeningExperimentPending\(mode === "commander"\)/);
  assert.match(page, /\[1, "Your deck"/);
  assert.match(page, /className="forge-guide-navigation"/);
  assert.match(page, /← Back/);
  assert.match(page, /Next · Improve →/);
});

test("turns new-deck setup into three progressively disclosed decisions", () => {
  assert.match(page, /useState<0 \| 1 \| 2>\(0\)/);
  assert.match(page, /aria-label="Deck setup progress"/);
  assert.match(page, /buildStepLabelsFor\(format\)\.map/);
  assert.match(page, /\["Commander", "Strategy", "Preferences"\]/);
  assert.match(page, /\["Format", "Strategy", "Preferences"\]/);
  assert.match(page, /Next · Choose strategy →/);
  assert.match(page, /Next · Optional preferences →/);
  assert.match(page, /buildStep === 0 && isCommanderFormat\(format\) && !selectedCommander/);
});

test("keeps the chapter connector below the labels instead of striking through them", () => {
  assert.match(
    polishCss,
    /\.progressive-results \.forge-chapter-rail:before\{top:auto;[^}]*bottom:6px/,
  );
  assert.match(polishCss, /\.progressive-results \.forge-chapter-rail>button\{padding-bottom:18px\}/);
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
  // Accepting a tablet must apply the exact swap directly — no free-text or
  // LLM round-trip composer standing between the evidence and the deck.
  assert.match(page, /function applyExperimentTablet/);
  assert.match(page, /className="tablet-accept"/);
  assert.doesNotMatch(page, /className="custom-refinement-trigger"/);
  assert.doesNotMatch(page, /className="refinement-composer"/);
  assert.doesNotMatch(page, /async function consultForge/);
});

test("makes a guided three-card experiment the doorway to a new Masterwork", () => {
  assert.match(page, /openingExperimentPending/);
  assert.match(
    page,
    /const openingExperimentGateActive\s*=\s*openingExperimentPending\s*&&\s*benchStatus !== "forging"\s*&&\s*openingExperimentChoices\.length > 0/,
    "The opening experiment must never hide the finished deck when there are no choices to render.",
  );
  assert.match(page, /openingExperimentGateActive \? "opening-experiment-pending" : ""/);
  assert.match(page, /YOUR FIRST OFFICIAL EXPERIMENT/);
  assert.match(page, /openingExperimentChoices\.map/);
  assert.match(page, /CONTROL EXPERIMENT/);
  assert.match(page, /Skip guidance · Reveal the full deck/);
  assert.match(page, /className="forge-journey-guide"/);
  assert.match(page, /deckRows\.length > 0 && resultViewMode === "guided"/);
  assert.match(page, /Next · Improve →/);
  assert.match(css, /\.opening-experiment-pending \.result-view-controls[^}]*display:none/);
  assert.match(css, /\.opening-experiment-options\{display:grid;grid-template-columns:repeat\(3/);
});

test("accepting an experiment tablet plays out where the player can actually see it", () => {
  // The deck list that receives the cut/materialize animation classes only
  // renders while Chapter I is active — the accept handler must jump there
  // itself instead of leaving the swap to happen behind the tablets screen.
  assert.match(page, /function applyExperimentTablet[\s\S]*?setActiveForgeChapter\(1\)/);
  // The tablet engine's own view of the deck must advance too, or the same
  // three tablets (some now stale) just keep reappearing after every accept.
  assert.match(page, /function applyExperimentTablet[\s\S]*?setNativeMasterworkContext\(/);
  // A forced, visible decision after the swap settles — not a silent return
  // to a screen that looks identical to before the click.
  assert.match(page, /const \[postAcceptChoice, setPostAcceptChoice\] = useState\(false\)/);
  assert.match(page, /className="post-accept-choice"/);
  assert.match(page, /Test Another Experiment/);
  assert.match(page, /This Is The One — Preserve as Finished Masterwork/);
  // Growth in the Forge Mastery record should be visible at the moment it
  // happens, not only on a separate /profile visit.
  assert.match(page, /Revision \{lastAcceptedRevisionCount\} recorded to your/);
  assert.match(page, /href="\/profile"/);
});

test("accepts a two-sided flip and shockwave burst on the tablet being applied, not a brief pulse", () => {
  assert.match(page, /className="tablet-flip-inner"/);
  assert.match(page, /className="tablet-face tablet-face-front"/);
  assert.match(page, /className="tablet-face tablet-face-back"/);
  assert.match(page, /EXPERIMENT ACCEPTED/);
  assert.match(motifCss, /\.experiment-tablet-card\.applying \.tablet-flip-inner\{transform:rotateY\(180deg\)/);
  assert.match(motifCss, /@keyframes tablet-shockwave/);
});

test("offers a confidence tablet in place of a missing third experiment slot", () => {
  assert.match(page, /tablet\.type === "confidence"/);
  assert.match(page, /className="experiment-tablet-card confidence-tablet"/);
  assert.match(page, /Seal it as a Finished Masterwork/);
  assert.match(motifCss, /\.confidence-tablet\{/);
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
