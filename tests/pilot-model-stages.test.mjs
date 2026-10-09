import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildPilotModel } from "../app/pilot-model.mjs";

// The spells stage's protect line read `() => ... ${c}` without taking `c`.
// Minification happened to give an unrelated top-level variable that name,
// so production rendered whatever it held, until the Oct 8 build renamed it
// and every Spellslinger deck crashed on open with "c is not defined".
// Every stage of every signal must run and name the commander when it
// mentions one.

const source = await readFile(new URL("../app/pilot-model.mjs", import.meta.url), "utf8");
const signals = [...source.matchAll(/^  ([a-z]+): freeze\(\{$/gm)].map((match) => match[1]);

test("every stage line that interpolates the commander takes it as a parameter", () => {
  const offenders = [...source.matchAll(/^\s+(\w+): \(\) =>[^\n]*\$\{c\}/gm)].map((match) => match[0].trim());
  assert.deepEqual(offenders, []);
});

test("every signal's pilot story builds without throwing and names the commander it mentions", () => {
  assert.ok(signals.length >= 10, `expected the stage table, found ${signals.length} signals`);
  for (const signal of signals) {
    const pilot = buildPilotModel({ recognition: { resolvedSignal: signal }, commanderName: "Y'shtola, Night's Blessed" });
    for (const stage of ["establish", "deploy", "compound", "protect", "close"]) {
      assert.equal(typeof pilot[stage], "string", `${signal}.${stage}`);
      assert.doesNotMatch(pilot[stage], /undefined|\[object/, `${signal}.${stage} rendered a placeholder: ${pilot[stage]}`);
    }
  }
  const spells = buildPilotModel({ recognition: { resolvedSignal: "spells" }, commanderName: "Y'shtola, Night's Blessed" });
  assert.equal(spells.protect, "Hold interaction for the piece that actually stops Y'shtola, Night's Blessed.");
});
