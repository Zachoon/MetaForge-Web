import assert from "node:assert/strict";
import test from "node:test";
import { commanderShellOptions } from "../app/strategic-intent.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
};

const artifactsCommander = {
  name: "Made-Up Artificer",
  oracleText: "Whenever an artifact you control enters the battlefield, draw a card.",
};

const vanillaCommander = {
  name: "Plain Bear",
  oracleText: "Vigilance.",
};

test("a hand-authored PACKAGE_CATALOG shell (auras) surfaces from commander oracle text alone", () => {
  const options = commanderShellOptions([pearlEar], { format: "Commander" });
  const auras = options.find((option) => option.id === "auras");
  assert.ok(auras, "expected an auras shell option");
  assert.equal(auras.label, "Aura package");
  assert.ok(auras.coreMin > 0);
  assert.ok(auras.supportMin >= 0);
});

test("an ARCHETYPE_CATALOG shell (artifacts_matter) also surfaces, not just the original 10", () => {
  const options = commanderShellOptions([artifactsCommander], { format: "Commander" });
  const artifacts = options.find((option) => option.id === "artifacts_matter");
  assert.ok(artifacts, "expected an artifacts_matter shell option");
  assert.equal(artifacts.label, "Artifacts-matter package");
});

test("a commander with no package-triggering oracle text returns no shell options", () => {
  const options = commanderShellOptions([vanillaCommander], { format: "Commander" });
  assert.deepEqual(options, []);
});

test("singleton (Commander/Brawl) targets differ from constructed targets for the same commander", () => {
  const singletonOptions = commanderShellOptions([pearlEar], { format: "Commander" });
  const constructedOptions = commanderShellOptions([pearlEar], { format: "Standard" });
  const singletonAuras = singletonOptions.find((option) => option.id === "auras");
  const constructedAuras = constructedOptions.find((option) => option.id === "auras");
  assert.ok(singletonAuras.coreMin > constructedAuras.coreMin);
});

test("returns no shell options for an empty or missing commander list", () => {
  assert.deepEqual(commanderShellOptions([], { format: "Commander" }), []);
  assert.deepEqual(commanderShellOptions(undefined, { format: "Commander" }), []);
});

test("a two-commander partner pair triggers a shell either one alone supports", () => {
  const options = commanderShellOptions([vanillaCommander, pearlEar], { format: "Commander" });
  assert.ok(options.some((option) => option.id === "auras"));
});
