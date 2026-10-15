import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const session = readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
const entrance = readFileSync(new URL("../app/components/forge/entrance-chamber.tsx", import.meta.url), "utf8");

test("a first visit does not download Turnstile until a guest must prove they are human", () => {
  assert.doesNotMatch(layout, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(session, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(session, /if \(!guestMode \|\| !verificationRequested/);
  assert.match(session, /document\.head\.appendChild\(script\)/);
});

test("the shell keeps Newsreader, Inter, and Anton without a render-blocking font stylesheet", () => {
  assert.match(layout, /family=Newsreader:ital,wght@0,400\.\.700;1,400\.\.700/);
  assert.match(layout, /family=Inter:wght@400\.\.800/);
  assert.match(layout, /family=Anton/);
  assert.doesNotMatch(layout, /opsz/);
  assert.match(layout, /l\.media="print"/);
  assert.match(layout, /this\.media="all"/);
});

test("entrance films stay authored motion and do not outrank first paint", () => {
  assert.match(entrance, /autoPlay/);
  assert.match(entrance, /playsInline/);
  assert.match(entrance, /fetchPriority="low"/);
  assert.match(entrance, /entrance-embers\.mp4/);
  assert.match(entrance, /entrance-aperture\.mp4/);
});
