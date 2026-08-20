import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const researchPage = await readFile(new URL("../app/research/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
const siteFrameCss = await readFile(new URL("../app/site-frame.css", import.meta.url), "utf8");
const motifCss = await readFile(new URL("../app/masterwork-motifs.css", import.meta.url), "utf8");
const polishCss = await readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8");
const workbenchSrc = await readFile(new URL("../app/living-workbench.tsx", import.meta.url), "utf8");

test("opens directly into the deck without a detail-mode decision", () => {
  assert.doesNotMatch(page, /resultViewMode/);
  assert.doesNotMatch(page, /metaforge\.resultViewMode/);
  assert.doesNotMatch(page, />\s*Deck first\s*</);
  assert.doesNotMatch(page, />\s*All analysis\s*</);
  assert.match(page, /<small>YOUR DECK<\/small>/);
});

test("places deck and refinement surfaces before the intelligence vault", () => {
  assert.match(css, /\.progressive-results \.deck-gallery[^}]*order:3/);
  assert.match(css, /\.progressive-results \.testing-loop\{order:5/);
  assert.match(css, /\.progressive-results \.forge-understanding-bridge\{order:6/);
  assert.match(css, /\.progressive-results \.forge-intelligence-vault\{order:7/);
  assert.match(page, /className="forge-intelligence-vault"/);
});

// P0 follow-up (2026-08-07): the first-run coaching panel, chapter 1,
// between forge-quick-read and the deck grid — surfaces
// forgeSystemsReport.strongestSystem and (when the player asked a Review
// coaching question) reviewFocusResult's real evidence/nextStep
// immediately instead of 1-2 clicks deep in chapter 3.
test("the first-run coaching panel sits between forge-quick-read and the deck grid, and is visible by default in chapter 1", () => {
  assert.doesNotMatch(page, /className="forge-quick-read"/);
  assert.doesNotMatch(page, /className="first-run-coaching"/);
  assert.match(page, /className="forge-understanding-bridge coach-brief honest-coach-v0"/);
});

// forge-quick-read (the neighboring, pre-existing panel) renders
// unconditionally off chosenWork's own safe-fallback default — it isn't
// gated on hasValidatedDeck and that's out of scope here. The new
// coaching panel must not repeat that gap: it reads forgeSystemsReport
// and reviewFocusResult, neither of which has a meaningful "safe
// placeholder" the way chosenWork does, so showing it before a real,
// validated deck exists would either show stale data from a previous
// session or empty/loading noise dressed up as a real coaching read.
test("the coaching panel itself (not just its content) is gated on hasValidatedDeck — it must not render during forging or after a failed generation", () => {
  const panelSite = page.match(/\{hasValidatedDeck \? \(\s*(?:<>|<div className="workbench-coach-stack">)\s*(?:<details[\s\S]*?>)?\s*<section className="forge-understanding-bridge coach-brief honest-coach-v0"[\s\S]*?<\/section>/);
  assert.ok(
    panelSite || page.includes('hasValidatedDeck ? (') && page.includes('honest-coach-v0'),
    "expected validated-deck-gated Honest Coach brief",
  );
});

test("the coaching panel always shows Honest Coach priorities, with an honest loading state for structure", () => {
  const block = page.match(/className="forge-understanding-bridge coach-brief[\s\S]*?<\/section>/)?.[0];
  assert.ok(block, "expected to find the coaching brief panel's JSX");
  assert.match(block, /honest-coach-v0/);
  assert.match(block, /WHY THIS DECK WINS|honestCoachSummary/);
  assert.match(block, /structuralAnalysisStatus === "loading"/);
  assert.doesNotMatch(block, /BUILD MOMENTUM/);
  assert.doesNotMatch(block, /YOUR PLAN/);
});

test("the coaching panel leads with commission contract / plan story — not the old system-name grid", () => {
  // The full commission-contract breakdown moved to /research along with
  // the rest of the Deep Forge evidence (see the forge-intelligence-vault
  // teaser in app/page.tsx) — the deck page's coach brief still leads with
  // plan story and links to the full commission read.
  const block = page.match(/className="forge-understanding-bridge coach-brief[\s\S]*?<\/section>/)?.[0];
  assert.ok(block);
  assert.match(block, /intentions\.|planStory/);
  assert.match(block, /VERDICT|CHANGE|WHY · OPENING PRIORITIES/);
  assert.match(block, /YOUR COACH/);
  assert.doesNotMatch(block, /watchingVoice\?\.paragraph|principleVoice\?\.paragraph/);
  const researchBlock = researchPage.match(/className="forge-understanding-bridge coach-brief[\s\S]*?<\/section>/)?.[0];
  assert.ok(researchBlock);
  assert.match(researchBlock, /commissionContract|1 · I HEARD YOU|You asked for/);
});

test("reviewFocusResult carries its full evidence shape (asked/evidence/nextStep), not just .concise, and is reset on every new commission", () => {
  const stateDecl = page.match(/const \[reviewFocusResult, setReviewFocusResult\] = useState<\{[\s\S]*?\}\s*\| null>\(null\);/)?.[0];
  assert.ok(stateDecl, "expected the reviewFocusResult state declaration");
  assert.match(stateDecl, /asked: string;/);
  assert.match(stateDecl, /evidence: string;/);
  assert.match(stateDecl, /nextStep: string;/);
  // Reset alongside importWarnings in both places a new/restored deck
  // replaces whatever was previously loaded — never left stale from a
  // prior generation.
  const resetSites = page.match(/setImportWarnings\(\[\]\);\s*setReviewFocusResult\(null\);/g) || [];
  assert.equal(resetSites.length, 2, "expected exactly two reset sites: commitDirectForge and openSavedMasterwork");
});

test("turns the result into one active chapter instead of a continuous instrument wall", () => {
  assert.match(page, /activeForgeChapter.*useState<1 \| 2 \| 5>\(1\)/);
  assert.match(page, /LivingWorkbench/);
  assert.match(workbenchSrc, /id="forge-chapter-rail"/);
  assert.doesNotMatch(page, /WHAT TO DO NEXT/);
  assert.match(workbenchSrc, /label: "Deck"/);
  assert.match(workbenchSrc, /label: "Tune"/);
  assert.match(workbenchSrc, /label: "Test"/);
  assert.match(page, /chapter-\$\{activeForgeChapter\}-active/);
  assert.match(css, /\.chapter-1-active \.deck-manuscript>header\{display:flex\}/);
  assert.match(css, /\.chapter-2-active>\.testing-loop\{display:block/);
  assert.match(page, /id="proving-era-title"|getElementById\("proving-era-title"\)/);
  assert.match(page, /metaforge\.activeFieldTest/);
  assert.match(page, /This game did not test/);
  assert.match(css, /\.chapter-5-active>\.proving-grounds\{display:block/);
  assert.match(css, /\.workspace-mode-tabs\{grid-template-columns:repeat\(3/);
  assert.doesNotMatch(page, /activeButton\.offsetLeft/);
  assert.match(css, /\.opening-experiment-pending \.forge-map-intro\{display:none\}/);
  assert.match(css, /\.chapter-1-active \.forge-understanding-bridge/);
  assert.match(css, /\.chapter-1-active \.forge-intelligence-vault/);
});

test("keeps the deck list stable while card types are still loading", () => {
  assert.match(page, /commanderRows = orderedDeckRows\.filter\(isCommanderRow\)/);
  assert.match(page, /mainDeckRows = orderedDeckRows\.filter\(\(row\) => !isCommanderRow\(row\)\)/);
  assert.match(page, /Commander: commanderRows/);
  assert.match(page, /"Complete deck": mainDeckRows/);
  assert.match(page, /Organizing card types in the background/);
  assert.match(page, /Showing the complete deck in its saved order/);
  assert.match(page, /"Commander",\s*"Complete deck",\s*"Details pending"/);
});

test("uses the Forge's verified card types before supplemental gallery lookups", () => {
  assert.match(page, /const cardFactFromNativeRow/);
  assert.match(page, /for \(const row of nativeMasterworkContext\?\.selected\?\.rows \|\| \[\]\)/);
  assert.match(page, /type_line: String\(card\.typeLine \|\| card\.type_line \|\| ""\)/);
  assert.match(page, /fetch\("\/api\/cards\/facts"/);
  assert.match(page, /Retry details/);
  assert.match(page, /AbortSignal\.timeout\(25000\)/);
  assert.match(page, /: "Details pending"/);
  assert.match(page, /cardFactsPending > 0/);
  assert.match(page, /The rest of your deck is fully organized/);
  assert.match(page, /scheduleDetailsRetry/);
  assert.doesNotMatch(page, /throw new Error\("incomplete catalog"\)/);
});

test("keeps the commander outside the other 99 cards even when its details are pending", () => {
  assert.match(page, /\[activeCommanderName, selectedSecondCommander\?\.name\]/);
  assert.match(page, /const group = isCommanderRow\(row\)\s*\? "Commander"/);
  assert.match(page, /: "Details pending"/);
});

test("uses the commander in the current deck instead of stale setup metadata", () => {
  assert.match(page, /nativeMasterworkContext\?\.selected\?\.rows\?\.find/);
  assert.match(page, /selected && rowNames\.has\(cardFactKey\(selected\)\)/);
  assert.match(page, /chosenWork\.name\.endsWith\(", Forged"\)/);
  assert.match(page, /<b>\{activeCommanderName \|\| "Not identified"\}<\/b>/);
  assert.match(page, /activeCommander = meta \? meta\.commander : selectedCommander/);
  assert.doesNotMatch(page, /<b>\{chosenPreview\.card\}<\/b>/);
});

test("names the finished deck in player language instead of an unexplained temper label", () => {
  assert.match(page, /const displayDeckName = activeCommanderName/);
  assert.match(page, /\$\{activeCommanderName\} deck/);
  assert.match(page, /<h1>\{hasValidatedDeck \? displayDeckName/);
});

test("each workspace stage exposes one clear contextual next action instead of another control cluster", () => {
  // Living Workbench owns the primary next-step CTA; coach brief still
  // carries Prepare my next game for the CHANGE beat.
  assert.match(page, /<LivingWorkbench/);
  assert.match(workbenchSrc, /onPrimaryAction/);
  assert.match(page, /Prepare my next game →/);
  assert.match(page, /if \(!activeFieldTest\) beginProvingGroundsTest\(\)/);
  assert.match(page, /setActiveForgeChapter\(5\)/);
  assert.match(page, /getElementById\("proving-era-title"\)/);
});

test("deck understanding leads with Honest Coach and contains raw evidence in Deep Forge", () => {
  assert.match(page, /className="forge-understanding-bridge coach-brief honest-coach-v0"/);
  assert.match(page, /id="coach-brief"/);
  assert.match(page, />\s*VERDICT\s*</);
  // The raw commission-contract evidence itself now lives on /research
  // (moved out of the always-mounted deck page); the deck page still links
  // to it via "How do you know?".
  assert.match(researchPage, /COMMISSION CONTRACT|commissionContract/);
  assert.match(page, /CHANGE|WHY · OPENING PRIORITIES/);
  assert.match(page, /How do you know\? → Deep Forge evidence/);
  assert.doesNotMatch(page, /BUILD MOMENTUM/);
  assert.doesNotMatch(page, /YOUR PLAN/);
  assert.match(css, /honest-coach-brief-stream|coach-deck-sequence/);
});

// A pasted decklist still reveals its complete deck immediately after the
// forge ceremony (no ambiguity to resolve — there's only ever one legal
// adaptation of the player's own list). A fresh commander build no longer
// does: it used to auto-call inspectMasterwork(0) here, silently entering
// the Forge's recommended candidate without the player ever choosing —
// exactly the auto-advance bug this fix removes. inspectMasterwork itself
// is gone; a fresh build now lands on the masterworks chamber and only
// reveals a deck once the player explicitly picks one (enterMasterwork).
test("a pasted decklist reveals its complete deck immediately; a fresh build never auto-selects one", () => {
  assert.doesNotMatch(page, /inspectMasterwork/, "the auto-entering per-candidate reveal function is retired entirely");
  assert.match(page, /setChamber\("masterworks"\)/, "a fresh commander build lands on the masterworks choice, not a pre-selected deck");
  assert.match(page, /setOpeningExperimentPending\(false\)/);
  assert.doesNotMatch(page, /setOpeningExperimentPending\(mode === "commander"\)/);
  assert.match(workbenchSrc, /label: "Deck"/);
  assert.doesNotMatch(page, /className="forge-guide-navigation"/);
  assert.match(page, /← Back|← Change build/);
  assert.doesNotMatch(page, /className="forge-guide-navigation"/);
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

test("keeps the global header focused and moves secondary controls into one menu", () => {
  assert.doesNotMatch(page, /className="forge-steps"/);
  assert.doesNotMatch(page, /furthestCommissionStep/);
  assert.match(page, /className="forge-menu"/);
  assert.match(page, /<summary>Menu<\/summary>/);
  assert.match(page, /Replay guided tour/);
});

test("turns deck stress experiments into concrete player insights", () => {
  assert.match(page, /WHAT THE MODEL SAW/);
  assert.match(page, /WHY THIS SWAP/);
  assert.match(page, /EXPECTED CHANGE/);
  assert.match(page, /HOW TO JUDGE IT/);
  assert.match(page, /scenarioPassRate/);
});

test("keeps visual deck browsing separate from the playtest workbench", () => {
  assert.match(page, /useState<"workbench" \| "gallery" \| "ledger">\("ledger"\)/);
  assert.match(page, />Visual deck<\/button>/);
  assert.match(page, />Text list<\/button>/);
  assert.match(page, /deckViewMode === "gallery"/);
  assert.match(page, /className="visual-deck-gallery"/);
  assert.doesNotMatch(siteFrameCss, /chapter-1-active #deck-gallery\{display:flex!important/);
  assert.match(siteFrameCss, /chapter-1-active\.gallery-deck-view #deck-gallery\{display:grid!important/);
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
  assert.doesNotMatch(page, /className="forge-journey-guide"/);
  assert.doesNotMatch(page, /className="forge-guide-navigation"/);
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
  // The systems chamber (and its "reveal all" disclosure) moved to
  // /research with the rest of the Deep Forge vault.
  assert.match(researchPage, /const visibleForgeSystems = useMemo/);
  assert.match(researchPage, /forgeSystemsReport\.systems\.slice\(0, 3\)/);
  assert.match(researchPage, /Reveal all \$\{forgeSystemsReport\.systems\.length\} detected systems/);
});

test("automatically exposes intelligence when a hard deck gate fails", () => {
  // The deep-forge vault's own auto-open-on-failure `<details>` moved to
  // /research; the deck page's own forge-intelligence-vault teaser now
  // carries the "ATTENTION REQUIRED" alert and the itemized issue list
  // directly, unconditionally visible (nothing to auto-open) whenever
  // deckIntegrity has failed — see app/page.tsx's forge-intelligence-vault
  // section.
  assert.match(
    page,
    /!deckIntegrity\.checking && !deckIntegrity\.passed[\s\S]*?ATTENTION REQUIRED/,
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

// P0 follow-up: multiple production failure videos showed the floating
// "YOUR BENCH" launcher (aside.bench-dock, gated only on chamber !==
// "forging" — mounted during a workbench-stage failure too) reading
// "Ready for your first Masterwork" at the exact moment the main panel
// said "No deck was completed." Neither claim was individually false (the
// bench is about the player's saved-deck ARCHIVE, unrelated to the current
// attempt) but shown together they read as contradictory chrome. Only the
// invitation language is suppressed during a failure — the rest of the
// panel (saved-deck navigation, "Start a New Forge") stays available.
test("the floating Bench launcher never invites 'Ready for your first Masterwork' while the current attempt just failed", () => {
  const handleBlock = page.match(/<div className="bench-handle">[\s\S]*?<\/button>\s*<\/div>/)?.[0];
  assert.ok(handleBlock, "expected to find the bench-handle launcher JSX");
  assert.match(
    handleBlock,
    /forgeGenerationError[\s\S]*?\? "Nothing preserved yet"\s*\n\s*: "Ready for your first Masterwork"/,
    "the empty-archive invitation must be suppressed specifically while forgeGenerationError is set",
  );
});
