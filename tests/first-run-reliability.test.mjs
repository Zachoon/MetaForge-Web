import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the build wait and the choice screen speak in player language", async () => {
  const forging = await read("app/components/forge/forging-chamber.tsx");
  const choice = await read("app/components/forge/philosophy-compare.tsx");
  for (const source of [forging, choice]) {
    assert.match(source, /From this commander's card/);
    assert.doesNotMatch(source, /Occupancy engines/);
  }
  assert.match(forging, /The rest of the deck is still being built/);
  assert.match(choice, /not a judgment of the 99/);
});

test("Player Compass explains itself without commission or philosophy jargon", async () => {
  const compass = await read("app/components/forge/player-compass-card.tsx");
  assert.match(compass, /never block the Forge/i);
  assert.match(compass, /What you asked the Forge to build still comes first/);
  assert.match(compass, /between decks that already fit/);
  assert.doesNotMatch(compass, /commission/i);
  assert.doesNotMatch(compass, /philosoph/i);
});

test("a saved deck with no revision list does not crash My Decks or the profile", async () => {
  const archive = await read("app/components/forge/archive-chamber.tsx");
  const profile = await read("app/profile/page.tsx");
  for (const source of [archive, profile]) {
    assert.match(source, /function familyRevisions/);
    assert.match(source, /Array\.isArray\(family\.revisions\)/);
    assert.doesNotMatch(source, /family\.revisions\.at\(-1\)/);
    assert.doesNotMatch(source, /family\.revisions\.length/);
    assert.doesNotMatch(source, /family\.revisions\.flatMap/);
  }
  assert.match(archive, /String\(a\.name \|\| ""\)\.localeCompare/);
});

test("a new visitor sees three steps, then one start, with the example tucked away", async () => {
  const entrance = await read("app/components/forge/entrance-chamber.tsx");
  const frame = await read("app/site-frame.css");
  assert.match(entrance, /How a first deck starts/);
  assert.match(entrance, /Pick a commander/);
  assert.match(entrance, /Add the first card/);
  assert.match(entrance, /Read why it belongs/);
  assert.match(entrance, /<details className="entrance-more">/);
  assert.doesNotMatch(entrance, /<details className="entrance-more" open>/);
  assert.match(frame, /\.chamber-entrance \.entrance-copy\{justify-content:flex-start/);
  assert.match(frame, /overflow-y:auto!important/);
});

test("the first commander step leads with a suggestion and keeps the build button reachable", async () => {
  const commission = await read("app/components/forge/commission-chamber.tsx");
  const frame = await read("app/site-frame.css");
  assert.match(commission, /Start with a commander/);
  assert.match(commission, /Suggest one, or search for a legend you like/);
  assert.match(commission, /first-session-suggest-note/);
  assert.match(commission, /commander-suggest-first/);
  assert.match(commission, /<details className="shell-picker-optional">/);
  assert.doesNotMatch(commission, /Occupancy engines/);
  assert.match(frame, /\.chamber-commission \.commission-scroll\{[\s\S]*?overflow-y:auto!important/);
});

test("a partial coach vault does not map missing lists", async () => {
  const research = await read("app/research/page.tsx");
  assert.match(research, /observedFindings \|\| \[\]/);
  assert.match(research, /interpretiveGuidance \|\| \[\]/);
  assert.match(research, /const health = system\.health \|\| \{\}/);
  assert.match(research, /coachingDiagnosis\.primary &&/);
  assert.match(research, /Array\.isArray\(value\) \? value : \[\]/);
  assert.match(research, /Array\.isArray\(revisionSource\.actionable\)/);
  assert.match(research, /Array\.isArray\(activeSystem\.members\)/);
});
