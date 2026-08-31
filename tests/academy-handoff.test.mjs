import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");
const session = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("Academy handoffs can still supply review context without adding another pre-build form", () => {
  assert.match(session, /resolveAcademyGuideEntry/);
  assert.match(session, /setReviewFocus\(entry\.reviewFocus\)/);
  assert.doesNotMatch(commission, /review-focus-picker|commission-note/);
});
