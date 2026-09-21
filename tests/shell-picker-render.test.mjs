import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after, before } from "node:test";
import { build } from "esbuild";

// Server-renders the real commission chamber (stubbing only the session
// context) with a commander chosen, to pin what the shell picker shows to an
// account, to a guest, and when nothing has been picked yet.

let workDir;
let render;

before(async () => {
  const projectRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  workDir = mkdtempSync(join(projectRoot, "node_modules", ".shell-render-"));
  const outfile = join(workDir, "render.mjs");
  await build({
    stdin: {
      contents: `
        import { renderToStaticMarkup } from "react-dom/server";
        import { createElement } from "react";
        import { CommissionChamber } from ${JSON.stringify(join(projectRoot, "app/components/forge/commission-chamber.tsx").replaceAll("\\", "/"))};
        export const render = (ctx) => { globalThis.__forgeSession = ctx; return renderToStaticMarkup(createElement(CommissionChamber)); };`,
      resolveDir: workDir,
      loader: "js",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    jsx: "automatic",
    logLevel: "silent",
    absWorkingDir: projectRoot,
    external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
    plugins: [{
      name: "stub-session-context",
      setup(b) {
        b.onResolve({ filter: /forge-session-context$/ }, () => ({ path: "ctx", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const useForgeSession = () => globalThis.__forgeSession;", loader: "js" }));
      },
    }],
  });
  ({ render } = await import(pathToFileURL(outfile).href));
});

after(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

const noop = () => {};
const ayula = { name: "Ayula, Queen Among Bears", typeLine: "Legendary Creature — Bear Warrior", colors: ["G"], image: "", verifiedFacts: "" };
const shells = [
  { id: "typal", label: "Typal package", coreMin: 14, supportMin: 2, legFloor: 0 },
  { id: "counters_matter", label: "Counters-matter package", coreMin: 10, supportMin: 6, legFloor: 0 },
];
// Any session-context field the chamber reads that isn't listed falls back to a no-op.
const context = (overrides = {}) => new Proxy({
  chamber: "commission", buildPath: "discover", format: "Commander", selectedCommander: ayula,
  commissionOccupancyLabels: [], commanderSearchRef: { current: null }, commanderSearchOpen: false,
  commanderSearching: false, commanderSearchError: "", commanderResults: [], commanderSearchRect: null,
  randomizingCommander: false, randomCommanderOptions: [], commanderQuery: "",
  secondCommanderSearchRef: { current: null }, partnerEligibility: null, selectedSecondCommander: null,
  secondCommissionOccupancyLabels: [], secondCommanderQuery: "", secondCommanderDropdownOpen: false,
  secondCommanderSearchRect: null, secondCommanderSearching: false, secondCommanderResults: [],
  deck: "", guestMode: false, turnstileToken: "", revealOccupancyLabels: [],
  shellOptions: shells, selectedShell: null, ...overrides,
}, { get: (target, key) => (key in target ? target[key] : noop) });

test("with a commander chosen, an account sees each shell by plain name and description, plus the skip path", () => {
  const html = render(context());
  assert.match(html, /Choose a shell to build around — or skip/);
  assert.match(html, /<b>Tribal<\/b>/);
  assert.match(html, /Build around a creature type/);
  assert.match(html, /<b>Counters<\/b>/);
  assert.doesNotMatch(html, /Typal package|Counters-matter package|core pieces/);
  assert.match(html, /Pick one to build step by step with the Forge — or skip/);
  assert.match(html, /BUILD MY DECK/);
});

test("picking a shell tells an account the build is step by step and relabels the button", () => {
  const html = render(context({ selectedShell: shells[0] }));
  assert.match(html, /Shell selected/);
  assert.match(html, /You(?:'|&#x27;)ll build this deck together, one step at a time/);
  assert.match(html, /BUILD IT TOGETHER/);
  assert.doesNotMatch(html, /shell-options-grid/);
});

test("a guest with a shell is told the Forge builds around it, and never promised step-by-step", () => {
  const html = render(context({ guestMode: true, selectedShell: shells[0] }));
  assert.match(html, /The Forge will build your deck around this shell/);
  assert.doesNotMatch(html, /one step at a time/);
  assert.doesNotMatch(html, /BUILD IT TOGETHER/);
  assert.match(html, /BUILD MY DECK/);
});

test("no picker at all when the commander supports no shells, or on the paste-a-list path", () => {
  assert.doesNotMatch(render(context({ shellOptions: [] })), /shell-picker/);
  assert.doesNotMatch(render(context({ chamber: "refine", buildPath: "complete" })), /shell-picker/);
});
