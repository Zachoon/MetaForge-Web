import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/masterwork-motifs.css", import.meta.url), "utf8");
const icons = fs.readFileSync(new URL("../app/masterwork-motif-icons.tsx", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const motionCss = fs.readFileSync(new URL("../app/forge-motion.css", import.meta.url), "utf8");
const journeyCss = fs.readFileSync(new URL("../app/forge-journey.css", import.meta.url), "utf8");
// MilestoneMotion moved to forge-types.ts during the page.tsx decomposition
// (Phase 4).
const forgeTypes = fs.readFileSync(new URL("../app/forge-types.ts", import.meta.url), "utf8");
const benchCss = fs.readFileSync(new URL("../app/deck-bench-dock.css", import.meta.url), "utf8");

// Bug 1B retired the templated sealed/revealed MasterworkCard component
// entirely: the masterworks chamber now maps the engine's own three real,
// already-generated candidates directly (pendingCandidateChoice.nativeReport
// .candidates), keyed by the server's own candidate.id, with no local
// per-card reveal state to preserve across renders.
test("the masterworks chamber renders the engine's own real candidates, not a templated MasterworkCard", () => {
  assert.doesNotMatch(page, /function MasterworkCard\(/, "the templated reveal-ceremony component is retired");
  assert.match(page, /pendingCandidateChoice\.nativeReport\.candidates/);
  assert.match(page, /key=\{build\.id\}/);
  assert.match(page, /enterMasterwork\(candidate\.id\)/);
});

test("entering a Masterwork is a real, keyboard-focusable button, not a bare clickable div", () => {
  assert.match(page, /<button type="button" onClick=\{\(\) => enterMasterwork\(candidate\.id\)\}>/);
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
  assert.match(forgeTypes, /type MilestoneMotion/);
  assert.match(page, /className={`forge-milestone-motion milestone-\$\{milestoneMotion\.kind\}`}/);
  assert.doesNotMatch(page, /setMilestoneMotion\(\{[\s\S]*?kind: "masterwork-ready"/);
  assert.match(page, /kind: "experiment-chosen"/);
  assert.match(page, /kind: "revision-accepted"/);
  assert.match(motionCss, /\.milestone-shutter/);
  assert.match(motionCss, /\.milestone-smoke/);
  assert.match(motionCss, /\.milestone-flare/);
  assert.match(motionCss, /\.milestone-sparks/);
  assert.match(motionCss, /prefers-reduced-motion:reduce[^}]*\.forge-milestone-motion\{display:none!important\}/s);
});

test("the workbench replaces the long Forge Path with three task-focused destinations", () => {
  assert.doesNotMatch(page, /className="forge-path"/);
  assert.doesNotMatch(page, /YOUR FORGE PATH/);
  assert.match(page, /LivingWorkbench/);
  assert.match(page, /activeForgeChapter.*1 \| 2 \| 5/);
  assert.match(page, /id="match-evidence"/);
});

test("the Private Bench reads as a living archive instead of a plain saved-deck list", () => {
  assert.match(page, /className="bench-card-art"/);
  assert.match(page, /ON THE ANVIL/);
  assert.match(page, /family\.revisions\.length/);
  assert.match(page, /evidenceCount/);
  assert.match(page, /Open deck/);
  assert.match(benchCss, /\.bench-card-vitals/);
  assert.match(benchCss, /@keyframes bench-masterwork-rise/);
  assert.match(benchCss, /prefers-reduced-motion:reduce[^}]*\.bench-dock\.open/s);
});

test("recording a match is a bounded three-step evidence ritual", () => {
  assert.match(page, /pendingMatchResult/);
  assert.match(page, /STEP 1 · THE RESULT/);
  assert.match(page, /STEP 2 · WHAT DID YOU FACE/);
  assert.match(page, /STEP 3 · WHAT WAS THE CLEAREST LESSON/);
  assert.match(page, /No single lesson isolated/);
  assert.match(page, /kind: "evidence-recorded"/);
  assert.match(motionCss, /\.milestone-evidence-recorded/);
});
