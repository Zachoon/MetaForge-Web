import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const entrance = await read("../app/components/forge/entrance-chamber.tsx");
const chrome = await read("../app/components/site-chrome.tsx");
const learn = await read("../app/learn/render-html.mjs");
const report = await read("../worker/public-deck-report.ts");
const journey = await read("../app/secondary-journey.mjs");
const anvil = await read("../app/components/hero-anvil.tsx");
const tripo = await read("../app/tripo-assets.css");
const session = await read("../app/forge-session-context.tsx");

test("the homepage has one Start with your commander action, the guided picker", () => {
  const titles = entrance.match(/Start with your commander/g) || [];
  assert.deepEqual(titles, ["Start with your commander"]);
  assert.match(entrance, /title="Start with your commander"/);
  assert.match(entrance, /setChamber\("commission"\)/);
  assert.match(entrance, /setBuildPath\("discover"\)/);
  assert.match(entrance, /aria-label="How a first deck starts"/);
  assert.match(entrance, /Pick a commander/);
  assert.match(entrance, /Add the first card/);
  assert.match(entrance, /Read why it belongs/);
});

test("secondary links are an unnumbered row to different destinations", () => {
  assert.match(journey, /Commander guides/);
  assert.match(journey, /href: "\/commanders"/);
  assert.match(journey, /Build from a list/);
  assert.match(journey, /href: "\/\?intent=list"/);
  assert.match(journey, /Academy/);
  assert.match(journey, /href: "\/academy"/);
  assert.doesNotMatch(journey, /<b>|[123]/);
  for (const source of [chrome, learn, report, entrance]) {
    assert.doesNotMatch(source, /<b>1<\/b><span>Start with your commander/);
    assert.doesNotMatch(source, />Start with your commander</);
  }
  assert.match(entrance, /SecondaryJourney/);
  assert.match(entrance, /onBuildFromList=\{\(\) => beginFreeDecklist\("complete"\)\}/);
  assert.match(session, /intent !== "list"/);
  assert.match(session, /intent === "analyze" \|\| intent === "list"/);
});

test("the animated anvil replaces the still, and the oval frame does not sit behind it", () => {
  assert.match(anvil, /data-turntable=\{ready \? "ready" : "still"\}/);
  assert.match(anvil, /setTurntableReady\(false\)/);
  assert.match(anvil, /onLoad=\{\(\) => setTurntableReady\(true\)\}/);
  assert.match(tripo, /\.hero-anvil\[data-turntable="ready"\] \.hero-anvil-still \{ visibility: hidden; \}/);
  assert.match(tripo, /prefers-reduced-motion: reduce/);
  assert.match(tripo, /\.hero-anvil \.hero-anvil-still \{ visibility: visible !important; \}/);
  assert.match(tripo, /\.entrance-stage \.entrance-living-forge,\s*\.entrance-stage \.entrance-visual > \.forge-sigil \{\s*display: none;/);
  assert.match(tripo, /\.entrance-stage \.entrance-visual::before/);
});
