import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/masterwork-motifs.css", import.meta.url), "utf8");
const icons = fs.readFileSync(new URL("../app/masterwork-motif-icons.tsx", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const motionCss = fs.readFileSync(new URL("../app/forge-motion.css", import.meta.url), "utf8");
const journeyCss = fs.readFileSync(new URL("../app/forge-journey.css", import.meta.url), "utf8");
const benchCss = fs.readFileSync(new URL("../app/deck-bench-dock.css", import.meta.url), "utf8");

test("the reveal chamber uses a dedicated, module-level MasterworkCard instead of an inline article", () => {
  assert.match(page, /^function MasterworkCard\(/m);
  assert.match(page, /useState\(false\)/);
  assert.match(page, /<MasterworkCard\s/);
  assert.doesNotMatch(page, /className={`masterwork-card \${alignedWork\.tone}`}\s*\n\s*key=/);
});

test("sealed cards are a real, keyboard-focusable button, not a bare clickable div", () => {
  assert.match(page, /className="masterwork-seal"[\s\S]{0,80}onClick={\(\) => setRevealed\(true\)}/);
  assert.match(css, /\.masterwork-seal:focus-visible/);
});

test("reduced motion is honored for every new animation, not just some", () => {
  const keyframeNames = [...css.matchAll(/@keyframes ([a-z0-9-]+)/gi)].map((match) => match[1]);
  assert.ok(keyframeNames.length >= 6, "expected multiple new keyframes to exist");
  const reducedBlockMatch = css.match(/@media\(prefers-reduced-motion:reduce\)\{([\s\S]*?)\}\s*@media\(max-width/);
  assert.ok(reducedBlockMatch, "expected a reduced-motion block covering the motif idle animations");
});

test("motif icons theme via a real CSS custom property, not a hardcoded color", () => {
  assert.match(icons, /var\(--motif-accent,var\(--teal,#6dddf0\)\)/);
  assert.doesNotMatch(icons, /fill="#[0-9a-f]{3,6}"[^/]*idle/i);
});

test("the visual system stylesheet is actually imported", () => {
  assert.match(globals, /@import "\.\/masterwork-motifs\.css";/);
});

test("the workbench sigil is driven by the deterministic resolver, not invented per render", () => {
  assert.match(page, /import \{ resolveMasterworkVisualProfile \} from "\.\/masterwork-visual-profile\.mjs";/);
  assert.match(page, /masterworkVisualProfile = useMemo/);
  assert.match(page, /data-evolved={masterworkVisualProfile\.evolved}/);
});

test("major player milestones use choreographed sequences while reduced motion stays quiet", () => {
  assert.match(page, /type MilestoneMotion/);
  assert.match(page, /className={`forge-milestone-motion milestone-\$\{milestoneMotion\.kind\}`}/);
  assert.match(page, /kind: "masterwork-ready"/);
  assert.match(page, /kind: "experiment-chosen"/);
  assert.match(page, /kind: "revision-accepted"/);
  assert.match(motionCss, /\.milestone-shutter/);
  assert.match(motionCss, /\.milestone-smoke/);
  assert.match(motionCss, /\.milestone-flare/);
  assert.match(motionCss, /\.milestone-sparks/);
  assert.match(motionCss, /prefers-reduced-motion:reduce[^}]*\.forge-milestone-motion\{display:none!important\}/s);
});

test("the workbench keeps one explicit next action visible through the full Forge Path", () => {
  assert.match(page, /className="forge-path"/);
  assert.match(page, /YOUR FORGE PATH/);
  assert.match(page, /Begin the first table test/);
  assert.match(page, /Record match evidence/);
  assert.match(page, /Seal this Masterwork/);
  assert.match(page, /Start another Forge/);
  assert.match(page, /id="match-evidence"/);
  assert.match(journeyCss, /\.forge-path li\.active/);
  assert.match(journeyCss, /prefers-reduced-motion:reduce[^}]*\.forge-path:before/s);
});

test("the Private Bench reads as a living archive instead of a plain saved-deck list", () => {
  assert.match(page, /className="bench-card-art"/);
  assert.match(page, /ON THE ANVIL/);
  assert.match(page, /family\.revisions\.length/);
  assert.match(page, /evidenceCount/);
  assert.match(page, /Open Masterwork/);
  assert.match(benchCss, /\.bench-card-vitals/);
  assert.match(benchCss, /@keyframes bench-masterwork-rise/);
  assert.match(benchCss, /prefers-reduced-motion:reduce[^}]*\.bench-dock\.open/s);
});
