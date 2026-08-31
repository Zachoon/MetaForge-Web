import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isValidReviewFocus } from "../app/review-focus.mjs";

const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

test("review-focus values remain valid engine inputs", () => {
  assert.equal(isValidReviewFocus("More consistency"), true);
  assert.equal(isValidReviewFocus(""), false);
});

test("review-focus and free-text questions are no longer shown before deck generation", () => {
  assert.doesNotMatch(commission, /review-focus-picker|commission-note|WHAT.S HAPPENING WHEN YOU PLAY THIS DECK/);
});
