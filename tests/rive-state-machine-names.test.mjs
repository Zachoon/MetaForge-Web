import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// Regression coverage for a real live defect: page.tsx referenced a Rive
// state machine name ("Forge Loader Machine") that didn't exist in the
// actually-exported .riv binary (whose real internal name was Rive's
// default "State Machine 1"), which the asset-registry.json documentation
// also incorrectly claimed. Rive silently falls back rather than throwing,
// so this only surfaced as a console error in a live authenticated
// session, not a crash or a failing existing test. This test reads the
// same source strings the app actually uses at runtime and confirms each
// one is present in its .riv asset's own string table — not a full Rive
// binary-format parser, but a direct, practical check against the exact
// class of drift that caused the live bug.
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

function rivAssetPaths() {
  const paths = new Set();
  const pattern = /src:\s*"(\/assets\/forge\/animations\/[^"]+\.riv)"/g;
  let match;
  while ((match = pattern.exec(page))) paths.add(match[1]);
  return [...paths];
}

function stateMachineNamesNear(assetPath) {
  // Find every `src: "<assetPath>"` occurrence, then the nearest
  // `stateMachines: "..."` that follows it in the same object literal —
  // mirrors how these are always written together in page.tsx.
  const names = new Set();
  let searchFrom = 0;
  for (;;) {
    const srcIndex = page.indexOf(`src: "${assetPath}"`, searchFrom);
    if (srcIndex === -1) break;
    const stateMachineMatch = /stateMachines:\s*"([^"]+)"/.exec(page.slice(srcIndex, srcIndex + 1200));
    if (stateMachineMatch) names.add(stateMachineMatch[1]);
    searchFrom = srcIndex + 1;
  }
  return [...names];
}

function readableStrings(buffer) {
  const text = buffer.toString("latin1");
  return text.match(/[\x20-\x7e]{4,}/g) || [];
}

for (const assetPath of rivAssetPaths()) {
  test(`page.tsx's stateMachines name for ${assetPath} actually exists in the exported .riv asset`, () => {
    const names = stateMachineNamesNear(assetPath);
    assert.ok(names.length > 0, `expected to find at least one stateMachines reference for ${assetPath} in page.tsx`);
    const assetFile = new URL(`../public${assetPath}`, import.meta.url);
    const buffer = fs.readFileSync(assetFile);
    const strings = readableStrings(buffer);
    for (const name of names) {
      assert.ok(
        strings.includes(name),
        `"${name}" (referenced in page.tsx for ${assetPath}) was not found in the asset's own string table — this is exactly the drift that caused a live "State Machine ... not found" console error`,
      );
    }
  });
}
