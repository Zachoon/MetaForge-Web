import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("touching a portaled commander result cannot blur-unmount it before click", () => {
  const portalStart = page.indexOf('className="commander-search-portal"');
  const portalEnd = page.indexOf("document.body", portalStart);
  assert.ok(portalStart > -1 && portalEnd > portalStart, "commander result portal must exist");

  const portal = page.slice(portalStart, portalEnd);
  assert.match(portal, /role="option"/);
  assert.match(portal, /onPointerDown=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(portal, /onClick=\{\(\) => selectCommander\(option\)\}/);
});
