import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
// The viewport-tracking effect and AbortController wiring moved to
// forge-session-context.tsx during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("touching a portaled commander result cannot blur-unmount it before click", () => {
  const portalStart = page.indexOf('className="commander-search-portal"');
  const portalEnd = page.indexOf("document.body", portalStart);
  assert.ok(portalStart > -1 && portalEnd > portalStart, "commander result portal must exist");

  const portal = page.slice(portalStart, portalEnd);
  assert.match(portal, /role="option"/);
  assert.match(portal, /onPointerDown=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(portal, /onClick=\{\(\) => selectCommander\(option\)\}/);
});

test("mobile commander search prevents iOS zoom, stale results, and keyboard-hidden dropdowns", async () => {
  const [commanderCss, frameCss] = await Promise.all([
    readFile(new URL("../app/blueprint-commander.css", import.meta.url), "utf8"),
    readFile(new URL("../app/site-frame.css", import.meta.url), "utf8"),
  ]);
  assert.match(commanderCss, /commander-choice input[^}]*font-size:16px!important/);
  assert.match(frameCss, /html,body\{max-width:100%;overflow-x:hidden\}/);
  assert.match(forgeSessionContext, /window\.visualViewport\?\.addEventListener\("resize", updateRect\)/);
  assert.match(forgeSessionContext, /maxHeight: Math\.max\(96, viewportBottom - top - 12\)/);
  assert.match(page, /maxHeight: commanderSearchRect\.maxHeight/);
  assert.match(forgeSessionContext, /const controller = new AbortController\(\)/);
  assert.match(forgeSessionContext, /controller\.abort\(\)/);
});
