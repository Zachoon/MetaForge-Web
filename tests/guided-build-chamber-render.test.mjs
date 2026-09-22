import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after, before } from "node:test";
import { build } from "esbuild";

// The guided-build chamber had never been rendered by anything before it
// shipped. This bundles the real component (stubbing only the session
// context it reads) and server-renders it in every state a player can reach,
// so a render-time exception — an undefined read, a bad map — fails here
// instead of on the live site.

const CONTEXT_STUB = "export const useForgeSession = () => globalThis.__forgeSession;";

let workDir;
let render;

before(async () => {
  // React stays external (its server build is CommonJS and won't bundle as
  // ESM), so the output has to live where node can resolve it: inside the
  // project's node_modules rather than the OS temp dir.
  const projectRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  workDir = mkdtempSync(join(projectRoot, "node_modules", ".guided-render-"));
  const outfile = join(workDir, "render.mjs");
  const chamber = new URL("../app/components/forge/guided-build-chamber.tsx", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  await build({
    stdin: {
      contents: `
        import { renderToStaticMarkup } from "react-dom/server";
        import { createElement } from "react";
        import { GuidedBuildChamber } from ${JSON.stringify(chamber)};
        export const render = (session) => { globalThis.__forgeSession = session; return renderToStaticMarkup(createElement(GuidedBuildChamber)); };`,
      resolveDir: workDir,
      loader: "js",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    jsx: "automatic",
    logLevel: "silent",
    external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
    absWorkingDir: projectRoot,
    plugins: [{
      name: "stub-session-context",
      setup(b) {
        b.onResolve({ filter: /forge-session-context$/ }, () => ({ path: "ctx", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: CONTEXT_STUB, loader: "js" }));
      },
    }],
  });
  ({ render } = await import(pathToFileURL(outfile).href));
});

after(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

const noop = () => {};
const categories = ["ramp", "interaction", "protection", "sweeper", "recursion", "draw", "winConditions", "synergyPieces"];
const ledger = categories.map((category) => ({
  category,
  actual: category === "ramp" ? 3 : 0,
  target: category === "ramp" ? { min: 10, max: 12 } : category === "winConditions" ? null : { min: 1, max: 3 },
  status: category === "ramp" ? "under" : category === "winConditions" ? "no-target" : "under",
}));

const baseContext = (overrides = {}) => ({
  guidedSession: null,
  guidedLoading: false,
  guidedError: "",
  selectedCommander: { name: "Pearl-Ear, Imperial Advisor", colors: ["W"] },
  selectedSecondCommander: null,
  selectedShell: { id: "auras", label: "Aura package" },
  format: "Commander",
  startGuidedBuild: noop,
  acceptGuidedOffer: noop,
  declineGuidedOffer: noop,
  addGuidedManualCard: noop,
  removeGuidedPick: noop,
  goToGuidedCategory: noop,
  finishGuidedCategory: noop,
  finishGuidedBuild: noop,
  exitGuidedBuild: noop,
  ...overrides,
});

const session = (overrides = {}) => ({
  key: "k",
  generationId: "g1",
  categories,
  categoryIndex: 0,
  accepted: ["Sol Ring", "Arcane Signet"],
  declined: [],
  manualCards: {},
  offer: { name: "Cultivate", typeLine: "Sorcery", oracleText: "Search your library for two basic land cards.", manaCost: "{2}{G}", cmc: 3 },
  reason: { deficitsFilled: ["role:ramp", "curve:3"], topPositive: { kind: "tracked_role", key: "ramp" }, nearestAlternative: { name: "Rampant Growth", margin: 3.5 } },
  exhausted: false,
  remainingCandidates: 40,
  ledger,
  ...overrides,
});

test("while the pool loads, it says so and shows no controls that could act on nothing", () => {
  const html = render(baseContext({ guidedLoading: true }));
  assert.match(html, /Reading your commander/);
  assert.match(html, /Building your card pool/);
  assert.doesNotMatch(html, /Add to my deck/);
});

test("a failed start shows the real message with a retry and a way back", () => {
  const html = render(baseContext({ guidedError: "Your session expired." }));
  assert.match(html, /role="alert"/);
  assert.match(html, /Your session expired\./);
  assert.match(html, /Start the guided build again/);
  // The heading must not keep claiming it is still loading beside a failure.
  assert.match(html, /The guided build stopped/);
  assert.doesNotMatch(html, /Reading your commander|Building your card pool/);
});

test("a live session renders the offer, its plain-language reason, the ledger, the steps and the picks", () => {
  const html = render(baseContext({ guidedSession: session() }));
  assert.match(html, /Cultivate/);
  assert.match(html, /Add to my deck/);
  assert.match(html, /Show me another/);
  assert.match(html, /fills a real ramp gap/);
  assert.match(html, /edged out Rampant Growth/);
  assert.match(html, /3 of 10–12 — room for 7 more/);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /Sol Ring/);
  assert.match(html, /YOUR PICKS · 2/);
  assert.match(html, /Done with ramp/);
  assert.match(html, /Skip ahead/);
  // Win conditions has no numeric target and must still read sensibly, saying
  // what is counted (threats among all picks) rather than implying a step tally.
  assert.match(html, /0 threats among your picks/);
  assert.match(html, /STEP 1 OF 8/);
  // The heading card's summary replaces the commission chamber's fixed blurb.
  assert.match(html, /data-summary="Pearl-Ear, Imperial Advisor · Auras\n?2 cards picked so far"/);
  assert.match(html, /<details class="guided-oracle"><summary>Read the card text<\/summary>/);
});

test("a restart action is offered once there are picks, but never before there's anything to lose", () => {
  const withPicks = render(baseContext({ guidedSession: session() }));
  assert.match(withPicks, /Start this build over/);
  const empty = render(baseContext({ guidedSession: session({ accepted: [] }) }));
  assert.doesNotMatch(empty, /Start this build over/);
});

test("after several declines the manual search is emphasized", () => {
  const html = render(baseContext({ guidedSession: session({ declined: ["a", "b", "c"] }) }));
  assert.match(html, /guided-search emphasized/);
  assert.match(html, /Not seeing it\?/);
});

test("an exhausted category explains itself and still offers a way forward", () => {
  const html = render(baseContext({ guidedSession: session({ offer: null, exhausted: true, reason: null, declined: ["x"] }) }));
  assert.match(html, /No more ramp suggestions right now/);
  // Plural category labels must not produce "board wipes cards".
  const wipes = render(baseContext({ guidedSession: session({ categoryIndex: 3, offer: null, exhausted: true, reason: null }) }));
  assert.match(wipes, /No more board wipes suggestions right now/);
  assert.doesNotMatch(wipes, /wipes cards/);
  assert.match(html, /You(?:'|&#x27;)ve seen everything the Forge would offer/);
  assert.match(html, /guided-search emphasized/);
  assert.match(html, /Done with ramp/);
});

test("the last category finishes the build instead of advancing, and hides skip-ahead", () => {
  const html = render(baseContext({ guidedSession: session({ categoryIndex: 7, offer: null, exhausted: true }) }));
  assert.match(html, /Finish — the Forge fills the rest/);
  assert.doesNotMatch(html, /Skip ahead/);
});

test("controls are disabled while a request is in flight, and an empty pick list reads honestly", () => {
  const html = render(baseContext({ guidedLoading: true, guidedSession: session({ accepted: [] }) }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<button[^>]*disabled[^>]*>Add to my deck/);
  assert.match(html, /Nothing yet/);
});

test("a session with an empty ledger (older snapshot) still renders instead of throwing", () => {
  const html = render(baseContext({ guidedSession: session({ ledger: [] }) }));
  assert.match(html, /Cultivate/);
  assert.match(html, /0 picked/);
  assert.equal(render(baseContext({ guidedSession: session({ accepted: ["One"] }) })).includes("1 card picked so far"), true);
});
