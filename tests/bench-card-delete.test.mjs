import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/deck-bench-dock.css", import.meta.url), "utf8");

test("the always-visible bench dock offers a direct delete, not just a link to the full Archive", () => {
  // Delete already existed on the Entrance chamber's full Archive list —
  // reachable, but only via Bench dock -> "View full Archive" -> scroll to
  // the specific deck. This puts a real delete affordance directly on
  // each bench-dock card too, reachable from any chamber (including the
  // Workbench) without leaving it.
  assert.match(page, /className="bench-card-delete"/);
  assert.match(page, /void deleteSavedMasterwork\(family\.id\)/);
  assert.match(css, /\.bench-card-delete\s*\{/);
});

test("the bench card became a div so the delete button can nest inside it without invalid button-in-button HTML", () => {
  assert.match(page, /role="button"[\s\S]{0,40}tabIndex=\{0\}[\s\S]{0,400}className=\{\["bench-card"/);
  // Keyboard users lose nothing by the button->div swap: Enter/Space still
  // opens the Masterwork.
  assert.match(page, /event\.key === "Enter" \|\| event\.key === " "/);
});

test("clicking delete on a bench card doesn't also trigger opening that Masterwork", () => {
  const startIdx = page.indexOf('className="bench-card-delete"');
  assert.ok(startIdx > -1);
  const nearby = page.slice(startIdx - 200, startIdx + 300);
  assert.match(nearby, /event\.stopPropagation\(\)/);
});

test("CSS selectors targeting the bench card were updated from >button to >.bench-card", () => {
  assert.doesNotMatch(css, /\.bench-decks\s*>\s*button/);
  assert.match(css, /\.bench-decks\s*>\s*\.bench-card/);
});
