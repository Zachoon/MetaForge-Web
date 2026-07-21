import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const forgeJourneyCss = await readFile(
  new URL("../app/forge-journey.css", import.meta.url),
  "utf8",
);

const testingAnvilCss = await readFile(
  new URL("../app/testing-anvil.css", import.meta.url),
  "utf8",
);

test("keeps the deck card preview attached to viewport scrolling", () => {
  assert.match(
    forgeJourneyCss,
    /\.great-forge\{[^}]*overflow:clip/,
    "The Forge root must clip decoration without becoming a sticky scroll container.",
  );

  assert.match(
    testingAnvilCss,
    /\.card-preview-stage\{position:sticky!important;[^}]*top:82px/,
    "The deck preview must remain sticky below the Forge navigation.",
  );

  assert.doesNotMatch(
    forgeJourneyCss,
    /\.great-forge\{[^}]*overflow:hidden/,
    "Overflow hidden on the Forge root prevents descendants from following viewport scroll.",
  );
});