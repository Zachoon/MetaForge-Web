import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const nativeEngine = fs.readFileSync(new URL("../app/native-masterwork-engine.mjs", import.meta.url), "utf8");
// The actual construction algorithm now runs server-side
// (worker/forge-generate.ts) rather than being called directly from
// page.tsx — several assertions below moved here with it.
const forgeGenerateWorker = fs.readFileSync(new URL("../worker/forge-generate.ts", import.meta.url), "utf8");
const start = page.indexOf("async function inspectMasterwork");
const end = page.indexOf("function openSavedMasterwork", start);
const generation = page.slice(start, end);

test("Masterwork selection uses the native engine instead of a model endpoint", () => {
  // The construction algorithm itself moved server-side (see the engine-
  // protection session) so it no longer ships in the client bundle — the
  // client now calls the real generation endpoint, and the endpoint
  // itself runs the real engine, not a model/chat call.
  assert.match(generation, /callForgeGenerate/);
  assert.match(generation, /mode:\s*"native"/);
  assert.doesNotMatch(generation, /api\/forge\/chat/);
  assert.doesNotMatch(generation, /task:\s*["']deck_generation/);
  assert.match(forgeGenerateWorker, /forgeNativeMasterwork/);
  assert.doesNotMatch(forgeGenerateWorker, /openai|chat\.completions/i);
});

test("the simulation dossier gets its roles from the shared simulationRoleFor classifier, not a re-inlined copy", () => {
  // Acceleration/Protection used to fold into "stabilizer"/"counter" via an
  // inline roleMap here — now sourced from adaptive-recommendation.mjs's
  // simulationRoleFor (see tests/adaptive-recommendation.test.mjs for the
  // actual ramp/protection regression coverage, tested behaviorally rather
  // than by pattern-matching page.tsx's source text). This just guards
  // against a second inline copy quietly reappearing and drifting from it.
  assert.match(page, /import \{[^}]*\bsimulationRoleFor\b[^}]*\} from "\.\/adaptive-recommendation\.mjs";/);
  const dossierStart = page.indexOf("const simulationDossier = useMemo");
  const dossierEnd = page.indexOf("}, [", dossierStart);
  const dossier = page.slice(dossierStart, dossierEnd);
  assert.match(dossier, /simulationRoleFor\(fact\)/);
  assert.doesNotMatch(dossier, /roleMap/);
});

test("the simulation dossier feeds real role counts and average curve into the interaction-density check", () => {
  const dossierStart = page.indexOf("const simulationDossier = useMemo");
  const dossierEnd = page.indexOf("}, [", dossierStart);
  const dossier = page.slice(dossierStart, dossierEnd);
  assert.match(dossier, /roleCounts/);
  assert.match(dossier, /averageCmc/);
  // forgeFailureAnalysis must actually receive the dossier this feeds,
  // or the interaction-density check in forge-systems-intelligence.mjs
  // never sees real data.
  assert.match(page, /buildBoundedFailureAnalysis\(\s*forgeSystemsReport,\s*simulationDossier,?\s*\)/);
});

test("Blueprint identity shapes previews and targeted verified-pool retrieval", () => {
  assert.match(page, /parseNativeBlueprintIntent/);
  assert.match(page, /This version puts \$\{blueprintPromise\} first/);
  // Verified-pool retrieval (loadNativeForgePool) now runs server-side,
  // same targeted-identity behavior, moved to worker/forge-generate.ts
  // along with the rest of the construction pipeline.
  assert.match(forgeGenerateWorker, /Popularity pages are intentionally broad/);
  assert.match(page, /lynchpin:\s*preview\.card/);
});

test("supports a second commander (Partner or Background) as a distinct, optional selection", () => {
  assert.match(page, /partnerEligibilityFor/);
  assert.match(page, /"partner-with"/);
  assert.match(page, /"background"/);
  assert.match(page, /selectedSecondCommander/);
  // Wired into both the imported-decklist and direct-commander build paths.
  const wiredCallSites = page.match(/secondCommander: secondCommanderInput/g) || [];
  assert.equal(wiredCallSites.length, 2);
});

test("native forging exposes visible elapsed progress and moving stages", () => {
  assert.match(page, /forgeElapsedSeconds/);
  assert.match(page, /Date\.now\(\) - forgeStartedAt/);
  assert.match(page, /setInterval\(updateElapsed, 250\)/);
  assert.match(page, /METAFORGE NATIVE ENGINE/);
  assert.match(page, /Forging three competing candidates/);
  assert.match(page, /role="status"/);
});

test("native forging explains the tournament verdict and bounded tradeoff", () => {
  assert.match(generation, /selected\.tournament\.reason/);
  assert.match(generation, /tradeoff frontier/);
  assert.match(generation, /reasoning\.boundary/);
});

test("native forging exposes bounded counterfactual reasoning", () => {
  assert.match(generation, /nativeReport\.reasoning\.summary/);
  assert.match(generation, /nativeReport\.reasoning\.boundary/);
});

test("native forging exposes the exact one-slot laboratory verdict", () => {
  assert.match(generation, /nativeReport\.laboratory\.summary/);
  assert.match(generation, /nativeReport\.laboratory\.contract/);
  assert.match(generation, /nativeReport\.laboratory\.boundary/);
});

test("Blueprint offers a persistent player-controlled reading size", () => {
  assert.match(page, /metaforge\.readingSize/);
  assert.match(page, /reading-\$\{readingSize\}/);
  assert.match(page, /Use \$\{size\} text/);
});

test("initial Blueprint choices explain game terms before submission", () => {
  assert.match(page, /BLUEPRINT_DEFINITIONS/);
  assert.match(page, /blueprint-glossary-tip/);
  assert.match(page, /blueprint-choice-definition/);
  assert.match(page, /aria-describedby="strategy-definition"/);
  assert.match(page, /Trade resources, answer key threats/i);
});

test("Workbench structural intelligence uses the shared Forge pipeline", () => {
  assert.match(
    page,
    /buildForgeStructuralAnalysis/,
  );

  assert.doesNotMatch(
    page,
    /import\s+\{\s*buildInteractionGraph\s*\}\s+from\s+["']\.\/forge-interaction-graph\.mjs["']/,
  );

  assert.doesNotMatch(
    page,
    /buildForgeSystemsReport/,
  );

  assert.doesNotMatch(
    page,
    /buildForgeCausalityReport/,
  );

  assert.match(
    page,
    /baseStructuralAnalysis\.graph/,
  );

  assert.match(
    page,
    /baseStructuralAnalysis\.systems/,
  );

  assert.match(
    page,
    /structuralAnalysis\.causality/,
  );
});

test(
  "native engine creates and exposes an inspectable recommendation ledger record",
  () => {
    assert.match(
      nativeEngine,
      /createForgeRecommendationRecord/,
    );

    assert.match(
      nativeEngine,
      /const recommendationRecord\s*=/,
    );

    assert.match(
      nativeEngine,
      /deckRows:\s*selected\.rows/,
    );

    assert.match(
      nativeEngine,
      /structuralAnalysis,/,
    );

    assert.match(
      nativeEngine,
      /blueprintIntent:\s*analysis\.context\s*\.blueprint/,
    );

    assert.match(
      nativeEngine,
      /recommendationRecord,/,
    );
  },
);
