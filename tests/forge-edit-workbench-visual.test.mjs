import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const motion = fs.readFileSync(new URL("../app/forge-motion.css", import.meta.url), "utf8");
const testingAnvil = fs.readFileSync(new URL("../app/testing-anvil.css", import.meta.url), "utf8");

test("the docked Editing Anvil isn't dragged back into normal flow by the section-layering rule", () => {
  // .great-forge>header,.great-forge>section{position:relative;z-index:2}
  // exists so ordinary content sections paint above the living-UI cursor
  // glow. .forge-edit-workbench is ALSO a <section> (docked, position:fixed,
  // slides in from off-screen) — that rule's specificity (class + type
  // selector) beats the plain .forge-edit-workbench{position:fixed} class
  // selector regardless of source order, silently dragging the docked
  // panel back into normal document flow: it renders wherever it falls in
  // the page instead of pinned to the viewport corner, with its "hidden"
  // slide-out transform still applied — exactly "way down low and off
  // screen."
  const sectionRule = motion.match(/\.great-forge>header,\.great-forge>section([^{]*)\{/);
  assert.ok(sectionRule, "expected to find the header/section layering rule");
  assert.match(sectionRule[1], /:not\(\.forge-edit-workbench\)/);

  // The panel's own docked/fixed rule must still exist and be unconditional
  // (not itself accidentally scoped away).
  assert.match(testingAnvil, /\.forge-edit-workbench\{position:fixed/);
});
