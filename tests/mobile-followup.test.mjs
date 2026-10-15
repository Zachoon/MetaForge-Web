import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/mobile-experience.css", import.meta.url), "utf8");
const decks = await readFile(new URL("../worker/public-deck-report.ts", import.meta.url), "utf8");
const entrance = await readFile(new URL("../app/components/forge/entrance-chamber.tsx", import.meta.url), "utf8");
const workbench = await readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");
const glossary = await readFile(new URL("../app/components/forge/glossary-text.tsx", import.meta.url), "utf8");
const inspector = await readFile(new URL("../app/components/forge/commander-inspector.tsx", import.meta.url), "utf8");
const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

test("public decks use a cover viewport and 44px, 16px controls through tablet width", () => {
  assert.match(decks, /width=device-width,initial-scale=1,viewport-fit=cover/);
  const phone = decks.slice(decks.indexOf("@media(max-width:820px)"));
  assert.match(phone, /\.brand\{[^}]*min-height:44px/);
  assert.match(phone, /\.share-actions a,\.share-actions button[^}]*min-height:44px/);
  assert.match(phone, /font-size:16px/);
  assert.match(phone, /height:44px/);
});

test("guided controls keep a 44px target through tablet width", () => {
  assert.match(css, /\.guided-step button,\s*\.guided-actions button,\s*\.guided-nav button/);
  assert.match(css, /\.guided-finish button/);
  assert.match(css, /\.sample-result button/);
  assert.match(css, /\.chamber-loading button/);
  assert.match(css, /\.guided-finish-landcount button,\s*\.guided-finish-basics button \{\s*min-width: 44px;\s*min-height: 44px;/);
});

test("the second entrance film is not a phone source", () => {
  assert.match(entrance, /className="entrance-aperture-film"/);
  assert.match(entrance, /media="\(min-width: 761px\)"/);
  assert.match(entrance, /entrance-aperture\.mp4/);
  assert.doesNotMatch(entrance, /className="entrance-aperture-film"[\s\S]{0,80}src="\/assets\/forge\/vfx\/entrance-aperture\.mp4"/);
});

test("a deck row has a tap control for its printing", () => {
  assert.match(workbench, /className="card-row-printing"/);
  assert.match(workbench, /aria-label=\{`Change printing for \$\{row\.name\}`\}/);
  assert.match(workbench, /setPrintingMenu\(\{/);
  assert.match(css, /\.card-row-printing/);
  assert.match(css, /\.printing-picker \{[^}]*bottom: calc\(var\(--mf-frame-rail\) \+ 8px\) !important/s);
});

test("coach definitions and the commander card open from a tap", () => {
  assert.match(glossary, /aria-expanded=\{open\}/);
  assert.match(glossary, /className=\{`forge-term\$\{open \? " is-open" : ""\}`\}/);
  assert.match(css, /\.forge-term\.is-open:after/);
  assert.match(css, /bottom: calc\(var\(--mf-frame-rail, 0px\) \+ 12px\)/);
  assert.match(inspector, /className=\{`commander-inspector\$\{open \? " is-open" : ""\}`\}/);
  assert.match(inspector, /commander-zoom-close/);
  assert.match(css, /\.commander-inspector\.is-open \.commander-zoom/);
  assert.doesNotMatch(commission, /formatTipOpen/);
  assert.doesNotMatch(commission, /<select/);
  assert.match(workbench, /CommanderInspector/);
});
