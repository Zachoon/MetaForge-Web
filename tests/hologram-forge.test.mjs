import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { segmentsFromDiagnosis } from "../app/hologram-forge-segments.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("../app/hologram-forge.css");
const globals = read("../app/globals.css");
const entrance = read("../app/components/forge/entrance-chamber.tsx");
const anvil = read("../app/components/hero-anvil.tsx");
const deck = read("../app/components/forge/free-decklist.tsx");
const workbench = read("../app/components/forge/workbench-chamber.tsx");
const prop = read("../app/components/hologram-forge.tsx");

test("the hologram utilities are a scan, grain, edge, and perspective floor", () => {
  assert.match(globals, /hologram-forge\.css/);
  assert.match(css, /\.holo-scan\s*\{/);
  assert.match(css, /\.holo-noise\s*\{/);
  assert.match(css, /\.holo-edge\s*\{/);
  assert.match(css, /\.holo-floor\s*\{/);
  assert.match(css, /#00f0ff/);
  assert.match(css, /perspective\(170px\) rotateX\(64deg\)/);
  assert.match(prop, /feGaussianBlur/);
  assert.doesNotMatch(prop, /crystal\.webm/);
  assert.doesNotMatch(deck, /crystal\.webm/);
  assert.doesNotMatch(workbench, /HoloProp/);
});

test("quiet mode and reduced motion hold a static hologram", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.great-forge\[data-motion="quiet"\] \.holo-anvil-scan-band/);
  assert.match(css, /\.great-forge\[data-motion="quiet"\] \.holo-forge/);
  assert.match(css, /animation:\s*none !important/);
  assert.match(prop, /motionMode === "full" && !reduced/);
  assert.match(prop, /prefers-reduced-motion: reduce/);
  assert.match(css, /holo-anvil-scan-trail \{ top: 30%/);
});

test("the anvil scan is a feathered sweep masked to the anvil", () => {
  assert.match(anvil, /holo-anvil-scan-band/);
  assert.match(anvil, /holo-anvil-scan-trail/);
  assert.match(css, /mask-image:\s*url\("\/assets\/forge\/tripo\/hero-512\.webp"\)/);
  assert.match(css, /@keyframes holo-anvil-scan[\s\S]*from \{ top: -46%[\s\S]*to \{ top: 104%/);
  assert.match(css, /transparent 0%[\s\S]*transparent 100%/);
  assert.match(css, /filter:\s*blur\(7px\)/);
  assert.match(css, /filter:\s*blur\(16px\)/);
  assert.match(css, /\.holo-field-hero \.holo-scan \{ display: none/);
  assert.doesNotMatch(anvil, /hero-turntable-1024|anvil\.glb/);
});

test("the home anvil is larger and still the only one", () => {
  assert.match(entrance, /HoloField className="holo-hero-field holo-field-hero"/);
  assert.equal((entrance.match(/<HeroAnvil/g) || []).length, 1);
  assert.doesNotMatch(entrance, /hero-512\.webp|hero-1024\.webp|hero-turntable/);
  assert.match(css, /width:\s*136px/);
  assert.match(css, /width:\s*min\(100%,\s*540px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*148px/);
  assert.match(anvil, /sizes="\(max-width: 900px\) 140px, 560px"/);
});

test("the deck hologram fills from existing targets and forges when they are met", () => {
  const empty = segmentsFromDiagnosis({
    steps: [
      { id: "lands", actual: 0, target: 35, status: "under", order: 0 },
      { id: "ramp", actual: 0, target: 10, status: "under", order: 1 },
      { id: "synergy", actual: 0, target: 4, status: "waiting", order: 8 },
    ],
    cardCount: 0,
  }, { commander: false, deckSize: 100, cardCount: 0 });
  assert.equal(empty.shells.find((shell) => shell.id === "synergy"), undefined);
  assert.equal(empty.shells.find((shell) => shell.id === "lands").ratio, 0);
  assert.equal(empty.frame.ratio, 0);
  assert.equal(empty.complete, false);

  const half = segmentsFromDiagnosis({
    steps: [
      { id: "lands", actual: 35, target: 35, status: "ok", order: 0 },
      { id: "ramp", actual: 10, target: 10, status: "ok", order: 1 },
      { id: "draw", actual: 4, target: 10, status: "under", order: 2 },
      { id: "interaction", actual: 0, target: 8, status: "under", order: 3 },
    ],
    cardCount: 49,
  }, { commander: true, deckSize: 100, cardCount: 50 });
  assert.equal(half.shells.find((shell) => shell.id === "lands").ratio, 1);
  assert.equal(half.shells.find((shell) => shell.id === "draw").ratio, 0.4);
  assert.equal(half.shells.find((shell) => shell.id === "commander").ratio, 1);
  assert.equal(half.frame.actual, 50);
  assert.equal(half.complete, false);

  const forged = segmentsFromDiagnosis({
    steps: [
      { id: "lands", actual: 36, target: 35, status: "ok", order: 0 },
      { id: "ramp", actual: 10, target: 10, status: "ok", order: 1 },
    ],
    cardCount: 99,
  }, { commander: true, deckSize: 100, cardCount: 100 });
  assert.equal(forged.complete, true);
  assert.match(deck, /<HoloForge/);
  assert.match(deck, /segmentsFromDiagnosis/);
  assert.match(workbench, /<HoloForge/);
  assert.match(prop, /is-flourish/);
  assert.match(prop, /<title>/);
  assert.match(prop, /holo-deck-metal/);
  assert.match(prop, /holo-card-wire/);
  assert.match(prop, /holo-readout/);
  assert.match(css, /\.holo-forge\.is-forged \.holo-deck-metal \{ opacity: 1/);
  assert.match(css, /\.holo-forge\.is-forged \.holo-deck-holo \{ opacity: 0/);
  assert.match(css, /holo-forge-flash/);
});

test("coach and ghost accents stay off the text", () => {
  assert.match(deck, /<HoloRule \/>/);
  assert.match(deck, /data-holo="shimmer"/);
  assert.match(workbench, /<HoloRule \/>/);
  const coach = workbench.slice(workbench.indexOf('id="coach-brief"'), workbench.indexOf("<header>", workbench.indexOf('id="coach-brief"')));
  assert.match(coach, /<HoloRule \/>/);
  assert.match(css, /\.coach-brief > \.holo-rule[\s\S]*height:\s*14px/);
  assert.match(css, /\.deck-page-hero \.holo-forge[\s\S]*z-index:\s*1/);
});
