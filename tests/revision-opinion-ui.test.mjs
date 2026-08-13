import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/forge/revision-opinion.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/components/forge/revision-opinion.css", import.meta.url), "utf8");
const docs = await readFile(new URL("../docs/OPINION_ENGINE.md", import.meta.url), "utf8");
const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("Opinion Engine v0.3 Founder Confirmed stamp is recorded", () => {
  assert.match(docs, /v0\.3 \*\*Founder Confirmed\*\*/);
  assert.match(docs, /v0\.4 player surface in progress/);
});

test("player Mentor surface mounts on the exact-revision coach path", () => {
  assert.match(page, /RevisionOpinionPanel/);
  assert.match(page, /from "\.\/components\/forge\/revision-opinion"/);
  assert.match(page, /signedIn=\{!guestMode\}/);
  assert.match(page, /familyId=\{deckId \|\| null\}/);
  assert.match(page, /fingerprint=\{/);
  assert.doesNotMatch(page, /opinionKey:\s*["'`]/);
  assert.doesNotMatch(page, /opinionKey=\{/);
});

test("RevisionOpinionPanel consumes server eligibility and Mentor presentation fields", () => {
  assert.match(component, /\/api\/coach\/revision-opinion/);
  assert.match(component, /never invents a question from a card or commander name/i);
  assert.match(component, /Strongest objection/);
  assert.match(component, /What changes the opinion/);
  assert.match(component, /Suggested test/);
  assert.match(component, /Applicable context/);
  assert.match(component, /needs_auth/);
  assert.match(component, /needs_saved_revision/);
  assert.match(component, /stale_or_missing_revision/);
  assert.match(component, /auth_failed/);
  assert.match(component, /WRITES TO BRAIN: FALSE/);
  assert.match(component, /revisionOpinionReasonMessage/);
  assert.match(component, /revisionOpinionStanceTone/);
  assert.doesNotMatch(component, /JSON\.stringify\(\{[^}]*opinionKey/);
});

test("revision opinion UI states and responsive layout stay product-safe", () => {
  assert.match(globals, /revision-opinion\.css/);
  assert.match(css, /\.revision-opinion/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(component, /stale or missing from your saved Bench/i);
  assert.match(component, /will not invent one from a card name/i);
  assert.match(component, /leans against\|leans toward/i);
});
