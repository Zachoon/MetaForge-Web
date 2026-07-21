import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8");

test("defaults the workbench to a remembered Guided View", () => {
  assert.match(page, /useState<"guided" \| "full">\("guided"\)/);
  assert.match(page, /metaforge\.resultViewMode/);
  assert.match(page, />\s*Guided View\s*</);
  assert.match(page, />\s*Full Forge\s*</);
});

test("places deck and refinement surfaces before the intelligence vault", () => {
  assert.match(css, /\.progressive-results \.deck-gallery[^}]*order:2/);
  assert.match(css, /\.progressive-results \.testing-loop\{order:4/);
  assert.match(css, /\.progressive-results \.forge-understanding-bridge\{order:5/);
  assert.match(css, /\.progressive-results \.forge-intelligence-vault\{order:6/);
  assert.match(page, /className="forge-intelligence-vault"/);
});

test("offers three simple refinement paths before optional match evidence", () => {
  assert.match(page, /Three refinement starting points/i);
  assert.match(page, /Protect the plan/);
  assert.match(page, /Tighten the opening/);
  assert.match(page, /Improve card flow/);
  assert.match(page, /className="match-evidence-drawer"/);
});

test("keeps the Editing Anvil closed until the player asks for it", () => {
  assert.match(page, /useState\(false\);[\s\S]*?forgeGenerationError/);
  assert.match(page, /Raise the Editing Anvil/);
});

test("reveals only the strongest systems before the player requests the archive", () => {
  assert.match(page, /const visibleForgeSystems = useMemo/);
  assert.match(page, /forgeSystemsReport\.systems\.slice\(0, 3\)/);
  assert.match(page, /Reveal all \$\{forgeSystemsReport\.systems\.length\} detected systems/);
});

test("automatically exposes intelligence when a hard deck gate fails", () => {
  assert.match(
    page,
    /resultViewMode === "full"[\s\S]*?intelligenceOpen[\s\S]*?!deckIntegrity\.passed/,
  );
  assert.match(page, /ATTENTION REQUIRED/);
});

test("preserves match evidence on its exact revision", () => {
  assert.match(
    page,
    /matches:\s*nextMatches\.filter\([\s\S]*?match\.revision[\s\S]*?index \+ 1/,
  );
  assert.match(page, /family\.revisions\.flatMap/);
});
