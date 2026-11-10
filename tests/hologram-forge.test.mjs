import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("../app/hologram-forge.css");
const globals = read("../app/globals.css");
const entrance = read("../app/components/forge/entrance-chamber.tsx");
const anvil = read("../app/components/hero-anvil.tsx");
const deck = read("../app/components/forge/free-decklist.tsx");
const workbench = read("../app/components/forge/workbench-chamber.tsx");
const prop = read("../app/components/hologram-forge.tsx");
const loop = new URL("../public/assets/forge/hologram/crystal.webm", import.meta.url);
const still = new URL("../public/assets/forge/hologram/crystal-still.webp", import.meta.url);

test("the hologram utilities are a scan, grain, edge, and perspective floor", () => {
  assert.match(globals, /hologram-forge\.css/);
  assert.match(css, /\.holo-scan\s*\{/);
  assert.match(css, /\.holo-noise\s*\{/);
  assert.match(css, /\.holo-edge\s*\{/);
  assert.match(css, /\.holo-floor\s*\{/);
  assert.match(css, /#00f0ff/);
  assert.match(css, /perspective\(170px\) rotateX\(64deg\)/);
  assert.match(prop, /feGaussianBlur/);
  assert.match(prop, /holo-emissive/);
  assert.match(prop, /crystal\.webm/);
  assert.match(prop, /crystal-still\.webp/);
});

test("quiet mode and reduced motion hold a static hologram", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.great-forge\[data-motion="quiet"\] \.holo-scan/);
  assert.match(css, /\.free-decklist\[data-motion="static"\] \.ghost-glass::after/);
  assert.match(css, /animation:\s*none !important/);
  assert.match(prop, /motionMode === "full" && !reduced/);
  assert.match(prop, /prefers-reduced-motion: reduce/);
});

test("hologram motion pauses offscreen and does not cover text", () => {
  assert.match(prop, /IntersectionObserver/);
  assert.match(prop, /data-holo-live/);
  assert.match(css, /\[data-holo-live="off"\] \.holo-scan/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /\.deck-page-hero \.holo-prop[\s\S]*z-index:\s*1/);
  assert.match(css, /\.coach-brief > \.holo-rule[\s\S]*height:\s*14px/);
  assert.match(css, /rgba\(16,\s*15,\s*13,\s*0\.96\)|pointer-events:\s*none/);
  assert.match(deck, /className="ghost-glass"/);
  assert.match(css, /\.ghost-glass::after/);
  assert.doesNotMatch(css, /\.deck-hero-plate[\s\S]*holo-scan/);
});

test("the home hero keeps a single anvil and puts the grid behind it", () => {
  assert.match(entrance, /HoloField className="holo-hero-field holo-field-hero"/);
  assert.equal((entrance.match(/<HeroAnvil/g) || []).length, 1);
  assert.doesNotMatch(entrance, /hero-512\.webp|hero-1024\.webp|hero-turntable/);
  assert.doesNotMatch(anvil, /hologram|crystal\.webm/);
  assert.match(css, /\.entrance-stage > \.holo-hero-field[\s\S]*grid-column:\s*2/);
  assert.match(css, /mask-image:\s*linear-gradient\(#000 0 82%, transparent 96%\)/);
  assert.doesNotMatch(entrance, /prop_hammer|prop_tome|anvil\.glb/);
});

test("deck, coach, and ghost placements use the same system", () => {
  assert.match(deck, /<HoloProp \/>/);
  assert.match(deck, /<HoloRule \/>/);
  assert.match(deck, /data-holo="shimmer"/);
  assert.match(workbench, /<HoloProp \/>/);
  assert.match(workbench, /<HoloRule \/>/);
  const coach = workbench.slice(workbench.indexOf('id="coach-brief"'), workbench.indexOf("<header>", workbench.indexOf('id="coach-brief"')));
  assert.match(coach, /<HoloRule \/>/);
  assert.ok(statSync(loop).size < 500_000, `crystal loop is ${statSync(loop).size} bytes`);
  assert.ok(statSync(still).size < 80_000, `crystal still is ${statSync(still).size} bytes`);
});
