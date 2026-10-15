import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { revealWhenReady, scrollRevealBehavior } from "../app/reveal-when-ready.mjs";
import { centeredRailScrollLeft } from "../app/guided-step-rail.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("revealWhenReady waits for a lazy target and can be cancelled", () => {
  const frames = [];
  let found = null;
  const revealed = [];
  const cancel = revealWhenReady(
    () => found,
    (element) => revealed.push(element),
    { schedule: (callback) => { frames.push(callback); return frames.length; }, now: () => 0, deadlineMs: 1000, maxFrames: 5 },
  );
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(revealed.length, 0, "a missing target must not scroll");
  assert.equal(frames.length, 1);
  cancel();
  frames.shift()();
  found = { id: "coach-brief" };
  assert.equal(revealed.length, 0, "a cancelled wait must not scroll a later frame");
});

test("revealWhenReady reveals on the first frame the target exists, then stops", () => {
  const frames = [];
  let found = null;
  const revealed = [];
  revealWhenReady(
    () => found,
    (element) => revealed.push(element),
    { schedule: (callback) => { frames.push(callback); return frames.length; }, now: () => 0, deadlineMs: 5000, maxFrames: 10 },
  );
  frames.shift()();
  found = { id: "deck-gallery" };
  frames.shift()();
  assert.deepEqual(revealed, [{ id: "deck-gallery" }]);
  assert.equal(frames.length, 0, "it stops scheduling once the target has painted");
});

test("revealWhenReady gives up at the frame cap so a 404 cannot loop", () => {
  let ticks = 0;
  revealWhenReady(
    () => { ticks += 1; return null; },
    () => { throw new Error("should not reveal"); },
    {
      schedule: (callback) => { callback(); return 0; },
      now: () => 0,
      deadlineMs: 60_000,
      maxFrames: 3,
    },
  );
  assert.equal(ticks, 3);
});

test("revealWhenReady gives up once the deadline has passed", () => {
  let time = 0;
  let ticks = 0;
  revealWhenReady(
    () => { ticks += 1; return null; },
    () => { throw new Error("should not reveal"); },
    {
      schedule: (callback) => { time += 600; callback(); return 0; },
      now: () => time,
      deadlineMs: 1000,
      maxFrames: 50,
    },
  );
  assert.equal(ticks, 2);
});

test("a deadline in the past stops after the opening lookup", () => {
  let ticks = 0;
  revealWhenReady(
    () => { ticks += 1; return null; },
    () => { throw new Error("should not reveal"); },
    { schedule: (callback) => { callback(); return 0; }, now: () => 5_000, deadlineMs: 0, maxFrames: 20 },
  );
  assert.equal(ticks, 1);
});

test("scroll behavior follows prefers-reduced-motion", () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({ matches: query.includes("reduce"), media: query });
  assert.equal(scrollRevealBehavior(), "auto");
  globalThis.matchMedia = () => ({ matches: false, media: "" });
  assert.equal(scrollRevealBehavior(), "smooth");
  globalThis.matchMedia = previous;
});

test("the step rail centers an off-screen step and leaves a visible one alone", () => {
  const rail = { left: 0, right: 200, scrollLeft: 40 };
  assert.equal(centeredRailScrollLeft(rail, { left: 20, right: 80 }), 40);
  const next = centeredRailScrollLeft(rail, { left: 240, right: 300 });
  assert.ok(next > rail.scrollLeft);
  const centered = centeredRailScrollLeft({ left: 0, right: 100, scrollLeft: 0 }, { left: 180, right: 220 });
  assert.equal(centered, 150);
  assert.equal(centeredRailScrollLeft({ left: 0, right: 100, scrollLeft: 10 }, { left: -80, right: -40 }), 0);
});

test("lazy chambers wait for paint, share one loading boundary, and cannot blank the shell", () => {
  const page = read("app/page.tsx");
  const boundary = read("app/components/forge/chamber-load-boundary.tsx");
  const forging = read("app/components/forge/forging-chamber.tsx");
  const session = read("app/forge-session-context.tsx");
  const guided = read("app/components/forge/guided-build-chamber.tsx");
  const recovery = read("app/stale-chunk-recovery.ts");
  const layout = read("app/layout.tsx");

  for (const selector of ["#coach-brief", "#deck-gallery", ".tabletop-surface"]) {
    assert.ok(page.includes(`revealChamberTarget("${selector}"`), `${selector} must wait until the lazy chamber paints`);
  }
  assert.doesNotMatch(page, /requestAnimationFrame\(\(\) => \{[\s\S]{0,240}scrollIntoView/);
  assert.doesNotMatch(page, /fallback=\{null\}/);

  const suspense = page.slice(page.indexOf("<ChamberLoadBoundary"), page.indexOf("</ChamberLoadBoundary>"));
  assert.match(suspense, /<Suspense fallback=\{<p className="chamber-loading"/);
  assert.match(suspense, /chamber === "workbench" && <WorkbenchChamber \/>/);
  assert.match(suspense, /chamber === "workbench" && <WorkbenchEditorChamber \/>/);
  assert.match(suspense, /chamber === "forging" && <ForgingChamber \/>/);
  assert.ok(page.indexOf("<header") < page.indexOf("<ChamberLoadBoundary"), "the forge bar stays mounted if a chamber chunk fails");
  assert.match(boundary, /isChunkLoadError/);
  assert.match(boundary, /window\.location\.reload/);
  assert.match(boundary, /Failed to fetch dynamically imported module/);

  assert.match(forging, /setStage\(\(value\) => value \+ 1\)/);
  assert.match(forging, /setForgingCeremonyMounted\(true\)/);
  assert.doesNotMatch(session, /setTimeout\(\(\) => setStage\(\(value\) => value \+ 1\), 1150\)/);
  assert.match(session, /forgingCeremonyMounted/);
  assert.match(session, /revealWhenReady\(/);

  assert.match(guided, /centeredRailScrollLeft/);
  assert.match(guided, /stepRailRef/);
  assert.match(guided, /\.guided-step\.current/);
  assert.doesNotMatch(guided, /guided-steps[\s\S]{0,400}scrollIntoView/);

  assert.match(recovery, /vite:preloadError/);
  assert.match(recovery, /Failed to fetch dynamically imported module/);
  const head = layout.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
  assert.ok(head.indexOf("STALE_CHUNK_RECOVERY_SCRIPT") < head.indexOf("<link"));
});

test("the mobile step rail can scroll the current step without wrapping", () => {
  const css = read("app/guided-build.css");
  assert.match(css, /@media\(max-width:820px\)\{[\s\S]*\.guided-steps\{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto/);
  assert.match(css, /overscroll-behavior-x:contain/);
});
