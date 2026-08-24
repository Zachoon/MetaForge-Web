import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const nativeEngine = fs.readFileSync(new URL("../app/native-masterwork-engine.mjs", import.meta.url), "utf8");
// The actual construction algorithm now runs server-side
// (worker/forge-generate.ts) rather than being called directly from
// page.tsx — several assertions below moved here with it.
const forgeGenerateWorker = fs.readFileSync(new URL("../worker/forge-generate.ts", import.meta.url), "utf8");
// The interaction graph, systems intelligence, causality engine, and
// bounded failure analysis moved server-side the same way — several
// assertions below moved here with them too.
const forgeStructuralAnalyzeWorker = fs.readFileSync(new URL("../worker/forge-structural-analyze.ts", import.meta.url), "utf8");
const debouncedAnalysisRequest = fs.readFileSync(new URL("../app/debounced-analysis-request.mjs", import.meta.url), "utf8");
// masterworkIdentityWord/BLUEPRINT_DEFINITIONS moved to deck-row-helpers.ts
// during the page.tsx decomposition (Phase 4) — several assertions below
// moved here with them.
const deckRowHelpers = fs.readFileSync(new URL("../app/deck-row-helpers.ts", import.meta.url), "utf8");
// Handler logic (commitDirectForge, enterMasterwork, activeStructuralReport,
// runDebouncedAnalysis call site, etc.) moved to forge-session-context.tsx
// during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
// The commission/refine chamber's JSX (commander/partner search, Blueprint
// glossary tips) moved to its own component during the page.tsx
// decomposition (Phase 4 Stage 3).
const commissionChamber = fs.readFileSync(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");
// Bug 1B retired the separate per-candidate "native" reveal call
// (inspectMasterwork): commitDirectForge's commander branch now makes the
// one call that produces all three real candidates up front (mode:
// "direct" — forge-generate.ts's own comment confirms "native" and
// "direct" both run the identical forgeNativeMasterwork construction, they
// only ever differed in lynchpin/path), and enterMasterwork applies
// whichever the player explicitly picks with zero further network calls.
const commitStart = forgeSessionContext.indexOf('async function commitDirectForge(mode: "decklist" | "commander"');
const commitEnd = forgeSessionContext.indexOf("function openSavedMasterwork", commitStart);
const commitDirectForgeSource = forgeSessionContext.slice(commitStart, commitEnd);
const enterStart = forgeSessionContext.indexOf("function enterMasterwork(candidateId: string)");
const enterEnd = forgeSessionContext.indexOf("function resetGuestVerificationAfterFailure", enterStart);
const enterMasterworkSource = forgeSessionContext.slice(enterStart, enterEnd);

test("Masterwork selection uses the native engine instead of a model endpoint", () => {
  // The construction algorithm itself moved server-side (see the engine-
  // protection session) so it no longer ships in the client bundle — the
  // client now calls the real generation endpoint, and the endpoint
  // itself runs the real engine, not a model/chat call.
  assert.match(commitDirectForgeSource, /callForgeGenerate/);
  assert.match(commitDirectForgeSource, /mode:\s*"direct"/);
  assert.doesNotMatch(commitDirectForgeSource, /api\/forge\/chat/);
  assert.doesNotMatch(commitDirectForgeSource, /task:\s*["']deck_generation/);
  assert.match(forgeGenerateWorker, /forgeNativeMasterwork/);
  assert.doesNotMatch(forgeGenerateWorker, /openai|chat\.completions/i);
});

test("the simulation dossier gets its roles from the shared simulationRoleFor classifier, not a re-inlined copy", () => {
  // Acceleration/Protection used to fold into "stabilizer"/"counter" via an
  // inline roleMap here — now sourced from adaptive-recommendation.mjs's
  // simulationRoleFor (see tests/adaptive-recommendation.test.mjs for the
  // actual ramp/protection regression coverage, tested behaviorally rather
  // than by pattern-matching source text). The dossier itself, and its role
  // classification, moved server-side in the same pass as simulation and
  // revision/intervention learning — this just guards against a second
  // inline copy quietly reappearing in page.tsx and drifting from it.
  assert.doesNotMatch(page, /simulationRoleFor/);
  assert.match(
    forgeStructuralAnalyzeWorker,
    /import \{[^}]*\bsimulationRoleFor\b[^}]*\} from "\.\.\/app\/adaptive-recommendation\.mjs";/,
  );
  const dossierStart = forgeStructuralAnalyzeWorker.indexOf("const model = cards.map");
  const dossierEnd = forgeStructuralAnalyzeWorker.indexOf("simulationDossier = {", dossierStart);
  const dossier = forgeStructuralAnalyzeWorker.slice(dossierStart, dossierEnd);
  assert.match(dossier, /simulationRoleFor\(\{/);
  assert.doesNotMatch(dossier, /roleMap/);
});

test("the simulation dossier feeds real role counts and average curve into the interaction-density check", () => {
  const dossierStart = forgeStructuralAnalyzeWorker.indexOf("const model = cards.map");
  const dossierEnd = forgeStructuralAnalyzeWorker.indexOf("simulationDossier = {", dossierStart);
  const dossier = forgeStructuralAnalyzeWorker.slice(dossierStart, dossierEnd);
  assert.match(dossier, /roleCounts/);
  assert.match(dossier, /averageCmc/);
  // The client sends raw deck rows and a computeSimulation flag, not a
  // pre-computed dossier — the server now builds the dossier itself, then
  // buildBoundedFailureAnalysis (also server-side) must actually receive
  // it, or the interaction-density check in forge-systems-intelligence.mjs
  // never sees real data.
  const analyzeCallStart = forgeSessionContext.indexOf("return runDebouncedAnalysis({");
  const analyzeCallEnd = forgeSessionContext.indexOf("});", analyzeCallStart);
  const analyzeCall = forgeSessionContext.slice(analyzeCallStart, analyzeCallEnd);
  assert.match(analyzeCall, /computeSimulation/);
  assert.match(
    forgeStructuralAnalyzeWorker,
    /buildBoundedFailureAnalysis\(\s*analysis\.systems,\s*simulationDossier,?\s*\)/,
  );
});

test("Blueprint identity shapes targeted verified-pool retrieval", () => {
  assert.match(deckRowHelpers, /parseNativeBlueprintIntent/);
  // Verified-pool retrieval (loadNativeForgePool) now runs server-side,
  // same targeted-identity behavior, moved to worker/forge-generate.ts
  // along with the rest of the construction pipeline.
  assert.match(forgeGenerateWorker, /Popularity pages are intentionally broad/);
  // loadNativeForgePool only reads lynchpin when there's no commander to
  // anchor around — a non-Commander build (Standard, Modern, ...) still
  // needs a targeted identity, supplied from the curated FORMAT_PREVIEWS
  // flagship card instead of a per-candidate preview (there's no longer a
  // per-candidate call to hang one off of — one shared generation call now
  // produces all three real candidates together).
  assert.match(commitDirectForgeSource, /lynchpin:\s*commander \? undefined : previewFor\(0\)\.card/);
});

test("supports a second commander (Partner or Background) as a distinct, optional selection", () => {
  assert.match(forgeSessionContext, /partnerEligibilityFor/);
  assert.match(commissionChamber, /"partner-with"/);
  assert.match(commissionChamber, /"background"/);
  assert.match(commissionChamber, /selectedSecondCommander/);
  // Wired into both the imported-decklist and direct-commander build paths.
  const wiredCallSites = forgeSessionContext.match(/secondCommander: secondCommanderInput/g) || [];
  assert.equal(wiredCallSites.length, 2);
});

test("native forging exposes visible elapsed progress and moving stages", () => {
  assert.match(page, /forgeElapsedSeconds/);
  assert.match(forgeSessionContext, /Date\.now\(\) - forgeStartedAt/);
  assert.match(forgeSessionContext, /setInterval\(updateElapsed, 250\)/);
  assert.match(page, /METAFORGE NATIVE ENGINE/);
  assert.match(page, /Forging three competing candidates/);
  assert.match(page, /role="status"/);
});

test("native forging explains the tournament verdict and bounded tradeoff", () => {
  assert.match(enterMasterworkSource, /selected\.tournament\.reason/);
  assert.match(enterMasterworkSource, /tradeoff frontier/);
  assert.match(enterMasterworkSource, /reasoning\.boundary/);
});

test("native forging exposes bounded counterfactual reasoning", () => {
  assert.match(enterMasterworkSource, /nativeReport\.reasoning\.summary/);
  assert.match(enterMasterworkSource, /nativeReport\.reasoning\.boundary/);
});

test("native forging exposes the exact one-slot laboratory verdict", () => {
  assert.match(enterMasterworkSource, /nativeReport\.laboratory\.summary/);
  assert.match(enterMasterworkSource, /nativeReport\.laboratory\.contract/);
  assert.match(enterMasterworkSource, /nativeReport\.laboratory\.boundary/);
});

test("Blueprint offers a persistent player-controlled reading size", () => {
  assert.match(forgeSessionContext, /metaforge\.readingSize/);
  assert.match(page, /reading-\$\{readingSize\}/);
  assert.match(page, /Use \$\{size\} text/);
});

test("initial Blueprint choices explain game terms before submission", () => {
  assert.match(deckRowHelpers, /BLUEPRINT_DEFINITIONS/);
  assert.match(commissionChamber, /blueprint-glossary-tip/);
  assert.match(commissionChamber, /blueprint-choice-definition/);
  assert.match(commissionChamber, /aria-describedby="strategy-definition"/);
  assert.match(deckRowHelpers, /Trade resources, answer key threats/i);
});

test("Workbench structural intelligence runs server-side through the shared Forge pipeline", () => {
  // The interaction graph, systems intelligence, and causality engine no
  // longer run in the browser — page.tsx only holds a type-only import of
  // the response contract and calls the real analysis endpoint.
  assert.doesNotMatch(
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

  assert.doesNotMatch(
    page,
    /buildBoundedFailureAnalysis/,
  );

  // The actual fetch call lives in debounced-analysis-request.mjs now
  // (pulled out for testable race/staleness behavior — see
  // tests/debounced-analysis-request.test.mjs); page.tsx calls it with
  // the real endpoint URL.
  assert.match(
    forgeSessionContext,
    /runDebouncedAnalysis\(\{[\s\S]*?url:\s*"\/api\/forge\/structural-analyze"/,
  );

  assert.match(
    debouncedAnalysisRequest,
    /await fetchImpl\(url,/,
  );

  assert.match(
    forgeSessionContext,
    /activeStructuralReport\.graph/,
  );

  assert.match(
    forgeSessionContext,
    /activeStructuralReport\.systems/,
  );

  assert.match(
    forgeSessionContext,
    /activeStructuralReport\.causality/,
  );

  assert.match(
    forgeStructuralAnalyzeWorker,
    /buildForgeStructuralAnalysis/,
  );

  assert.match(
    forgeStructuralAnalyzeWorker,
    /buildBoundedFailureAnalysis/,
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
