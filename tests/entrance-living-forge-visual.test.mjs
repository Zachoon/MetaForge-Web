import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/entrance-living-forge.css", import.meta.url), "utf8");
const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const embers = new URL("../public/assets/forge/vfx/entrance-embers.mp4", import.meta.url);
const aperture = new URL("../public/assets/forge/vfx/entrance-aperture.mp4", import.meta.url);

test("entrance replaces the still-photo carousel with continuous authored motion", () => {
  assert.doesNotMatch(page, /entrance-hearth-cycle/);
  assert.match(page, /entrance-living-forge/);
  assert.match(page, /entrance-ember-film/);
  assert.match(page, /entrance-aperture-film/);
  assert.match(page, /autoPlay/);
  assert.match(page, /playsInline/);
  assert.match(globals, /entrance-living-forge\.css/);
});

test("entrance motion is layered, bounded, and has a quiet fallback", () => {
  assert.match(css, /mix-blend-mode:screen/);
  assert.match(css, /entrance-heat-lens/);
  assert.match(css, /entrance-forge-rails/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\.entrance-ember-film,.entrance-aperture-film\{display:none\}/);
  assert.equal(existsSync(embers), true);
  assert.equal(existsSync(aperture), true);
  assert.ok(statSync(embers).size < 8_000_000);
  assert.ok(statSync(aperture).size < 5_000_000);
});

test("the living Forge responds to both commission intents without requiring a pointer", () => {
  assert.match(css, /Intent response/);
  assert.match(css, /forge-commission-card\.ember:is\(:hover,:focus-visible\)/);
  assert.match(css, /forge-commission-card\.teal:is\(:hover,:focus-visible\)/);
  assert.match(css, /entrance-choice-surge/);
  assert.match(css, /entrance-choice-flash/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("the entrance rune is a forged high-resolution seal with Rive used as energy", () => {
  assert.match(css, /Forged MetaForge seal/);
  assert.match(css, /\.forge-rive-rune\{[^}]*opacity:\.08!important/);
  assert.doesNotMatch(css, /content:"F"/);
  assert.match(css, /clip-path:polygon/);
  assert.match(css, /top:50%;left:50%/);
  assert.match(css, /translate\(-50%,-50%\)/);
  assert.match(css, /metaforge-glyph-inlay/);
  assert.match(css, /metaforge-glyph-temper/);
  assert.match(css, /repeating-conic-gradient/);
  assert.match(css, /metaforge-seal-index/);
  assert.match(css, /metaforge-seal-counterspin/);
  assert.match(css, /metaforge-core-breathe/);
  assert.match(css, /metaforge-core-sheen/);
});
