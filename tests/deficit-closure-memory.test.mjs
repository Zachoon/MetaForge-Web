import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeficitClosureMemory,
  observeDeficitClosure,
  getNeedClosureView,
  incrementalFootprintNovelty,
  saturationMultiplier,
  footprintSignature,
} from "../app/deficit-closure-memory.mjs";
import {
  buildLiveDeficitState,
  marginalUtility,
  prospectiveSlotDelta,
} from "../app/prospective-slot-delta.mjs";
import { buildStrategicIntent, strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

function auraIntent() {
  return buildStrategicIntent(
    {
      format: "Commander",
      strategy: "Balanced midrange",
      commander: {
        name: "Pearl-Ear, Imperial Advisor",
        colors: ["W"],
        oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
        typeLine: "Legendary Creature — Fox Advisor",
      },
      note: "focus on auras",
    },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [], tribalTypes: [] },
      roleTargets: { ramp: 8, draw: 8, interaction: 8, protection: 4, recursion: 3, sweeper: 2 },
      commanderMechanics: { produces: [], rewards: ["auras"] },
    },
  );
}

function spellIntent() {
  return buildStrategicIntent(
    {
      format: "Commander",
      strategy: "Balanced midrange",
      commander: TORTURE_FIXTURES.find((entry) => entry.id === "spellslinger").commander,
      note: "cast many spells",
    },
    {
      blueprint: { source: "cast many spells", requestedMechanics: [], desiredRoles: [], packageSignals: ["spells"], promises: [], tribalTypes: [] },
      roleTargets: { ramp: 8, draw: 8, interaction: 8, protection: 3, recursion: 2, sweeper: 1 },
      commanderMechanics: { produces: [], rewards: ["spells"] },
    },
  );
}

test("recently closed deficit receives lower marginal urgency on subsequent similar picks", () => {
  const memory = createDeficitClosureMemory();
  const needKey = "package_core:spellslinger";
  const stateSatisfied = {
    packages: { spellslinger: { core: { current: 14, target: 14, deficit: 0, surplus: 0, status: "satisfied" } } },
  };
  observeDeficitClosure(memory, {
    pickIndex: 10,
    name: "Cantrip 0",
    deficitsFilled: [needKey],
    surplusIntroduced: [],
    deficitState: stateSatisfied,
    footprintSig: "r:|p:spells|w:|s:|pkg:spellslinger|c:",
  });
  observeDeficitClosure(memory, {
    pickIndex: 11,
    name: "Cantrip 1",
    deficitsFilled: [],
    surplusIntroduced: [needKey],
    deficitState: { packages: { spellslinger: { core: { current: 15, target: 14, deficit: 0, surplus: 1, status: "satisfied" } } } },
    footprintSig: "r:|p:spells|w:|s:|pkg:spellslinger|c:",
  });
  observeDeficitClosure(memory, {
    pickIndex: 12,
    name: "Cantrip 2",
    deficitsFilled: [],
    surplusIntroduced: [needKey],
    deficitState: { packages: { spellslinger: { core: { current: 16, target: 14, deficit: 0, surplus: 2, status: "satisfied" } } } },
    footprintSig: "r:|p:spells|w:|s:|pkg:spellslinger|c:",
  });
  const view = getNeedClosureView(memory, needKey, {
    packages: { spellslinger: { core: { current: 16, target: 14, deficit: 0, surplus: 2, status: "satisfied" } } },
  });
  assert.ok(view.fillsSinceSatisfied >= 2);
  assert.ok(view.recentFillVelocity >= 2);
  const fresh = marginalUtility(0, 2, 26);
  const saturated = marginalUtility(0, 2, 26, { needView: view, novelty: 0 });
  assert.ok(saturated < fresh, `saturated ${saturated} should be < fresh ${fresh}`);
});

test("same-need candidate with novel secondary footprint can still win", () => {
  const intent = spellIntent();
  const memory = createDeficitClosureMemory();
  const shell = Array.from({ length: 14 }, (_, i) => ({
    quantity: 1,
    name: `Cantrip ${i}`,
    roles: ["draw"],
    cmc: 1,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }),
    mechanics: { produces: ["spells", "draw"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  }));
  for (const [index, row] of shell.entries()) {
    observeDeficitClosure(memory, {
      pickIndex: index + 1,
      name: row.name,
      deficitsFilled: index < 14 ? ["package_core:spellslinger"] : [],
      surplusIntroduced: index >= 14 ? ["package_core:spellslinger"] : [],
      deficitState: buildLiveDeficitState(shell.slice(0, index + 1), intent, { roleTargets: intent.roleTargets }),
      footprintSig: footprintSignature(row),
    });
  }
  const moreCantrip = {
    card: { name: "Cantrip Twin", typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 },
    name: "Cantrip Twin",
    roles: ["draw"],
    cmc: 1,
    score: 40,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }),
    mechanics: { produces: ["spells", "draw"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  };
  const interactive = {
    card: { name: "Spell Pierce Lite", typeLine: "Instant", oracleText: "Counter target noncreature spell unless its controller pays {2}.", cmc: 1 },
    name: "Spell Pierce Lite",
    roles: ["interaction"],
    cmc: 1,
    score: 38,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Counter target noncreature spell unless its controller pays {2}.", cmc: 1 }),
    mechanics: { produces: ["spells"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  };
  const state = buildLiveDeficitState(shell, intent, { roleTargets: intent.roleTargets });
  const twinDelta = prospectiveSlotDelta(shell, moreCantrip, intent, { deficitState: state, closureMemory: memory });
  const interactDelta = prospectiveSlotDelta(shell, interactive, intent, { deficitState: state, closureMemory: memory });
  assert.ok(interactDelta.total > twinDelta.total, `novel interaction ${interactDelta.total} should beat twin cantrip ${twinDelta.total}`);
  assert.ok(interactDelta.footprintNovelty >= twinDelta.footprintNovelty);
});

test("fifth near-identical filler loses to a card addressing a different unmet need", () => {
  const intent = auraIntent();
  const auras = Array.from({ length: 18 }, (_, i) => ({
    quantity: 1,
    name: `Aura Piece ${i}`,
    roles: ["protection"],
    cmc: 2,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +1/+1.", cmc: 2 }),
    mechanics: { produces: ["auras", "protection"], rewards: [] },
    commanderConnectionSignals: ["auras"],
  }));
  const memory = createDeficitClosureMemory();
  for (const [index, row] of auras.entries()) {
    observeDeficitClosure(memory, {
      pickIndex: index + 1,
      name: row.name,
      deficitsFilled: ["package_core:auras"],
      surplusIntroduced: index >= 16 ? ["package_core:auras"] : [],
      deficitState: buildLiveDeficitState(auras.slice(0, index + 1), intent, { roleTargets: intent.roleTargets }),
      footprintSig: footprintSignature(row),
    });
  }
  const anotherAura = {
    card: { name: "Aura Piece 99", typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +1/+1.", cmc: 2 },
    name: "Aura Piece 99",
    roles: ["protection"],
    cmc: 2,
    score: 50,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature gets +1/+1.", cmc: 2 }),
    mechanics: { produces: ["auras", "protection"], rewards: [] },
    commanderConnectionSignals: ["auras"],
  };
  const ramp = {
    card: { name: "Rampant Growth Lite", typeLine: "Sorcery", oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", cmc: 2 },
    name: "Rampant Growth Lite",
    roles: ["ramp"],
    cmc: 2,
    score: 35,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Sorcery", oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", cmc: 2 }),
    mechanics: { produces: ["lands"], rewards: [] },
    commanderConnectionSignals: [],
  };
  const state = buildLiveDeficitState(auras, intent, { roleTargets: intent.roleTargets });
  const auraDelta = prospectiveSlotDelta(auras, anotherAura, intent, { deficitState: state, closureMemory: memory });
  const rampDelta = prospectiveSlotDelta(auras, ramp, intent, { deficitState: state, closureMemory: memory });
  assert.ok(rampDelta.total > auraDelta.total, `unmet ramp ${rampDelta.total} should beat surplus aura ${auraDelta.total}`);
  assert.ok(auraDelta.oversupplyGuarded || auraDelta.surplusIntroduced.includes("package_core:auras"));
});

test("useful redundancy is not universally penalized", () => {
  const view = {
    key: "package_core:auras",
    deficit: 0,
    surplus: 1,
    fillsSinceSatisfied: 1,
    recentFillVelocity: 1,
  };
  const plain = saturationMultiplier(view, { novelty: 0 });
  const novel = saturationMultiplier(view, { novelty: 0.8 });
  assert.ok(novel > plain);
});

test("package-critical resilience can justify surplus", () => {
  const view = {
    key: "package_core:auras",
    deficit: 0,
    surplus: 1,
    fillsSinceSatisfied: 1,
    recentFillVelocity: 1,
  };
  const plain = saturationMultiplier(view, { novelty: 0, resilienceJustification: false });
  const resilient = saturationMultiplier(view, { novelty: 0, resilienceJustification: true });
  assert.ok(resilient > plain);
});

test("oversupply guardrail works across at least two package types", () => {
  for (const [fixtureId, packageId] of [["spellslinger", "spellslinger"], ["pearl-ear-auras", "auras"]]) {
    const fixture = TORTURE_FIXTURES.find((entry) => entry.id === fixtureId);
    const intent = buildStrategicIntent(
      { format: "Commander", strategy: "Balanced midrange", commander: fixture.commander, note: fixture.note },
      {
        blueprint: { source: fixture.note, requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [], tribalTypes: [] },
        roleTargets: { ramp: 8, draw: 8, interaction: 8, protection: 4, recursion: 3, sweeper: 2 },
        commanderMechanics: { produces: [], rewards: [] },
      },
    );
    assert.ok(intent.packageIds.includes(packageId), `${fixtureId} missing ${packageId}`);
    const memory = createDeficitClosureMemory();
    observeDeficitClosure(memory, {
      pickIndex: 20,
      name: "Prior Fill",
      deficitsFilled: [],
      surplusIntroduced: [`package_core:${packageId}`],
      deficitState: {
        packages: { [packageId]: { core: { current: 20, target: 14, deficit: 0, surplus: 6, status: "oversupplied" } } },
        roles: {},
      },
      footprintSig: "same",
    });
    observeDeficitClosure(memory, {
      pickIndex: 21,
      name: "Prior Fill 2",
      deficitsFilled: [],
      surplusIntroduced: [`package_core:${packageId}`],
      deficitState: {
        packages: { [packageId]: { core: { current: 21, target: 14, deficit: 0, surplus: 7, status: "oversupplied" } } },
        roles: {},
      },
      footprintSig: "same",
    });
    const twin = {
      card: { name: "Twin", typeLine: packageId === "auras" ? "Enchantment — Aura" : "Instant", oracleText: packageId === "auras" ? "Enchant creature." : "Draw a card.", cmc: 1 },
      name: "Twin",
      roles: ["draw"],
      cmc: 1,
      score: 30,
      strategicSemantics: strategicSemanticsFor({
        typeLine: packageId === "auras" ? "Enchantment — Aura" : "Instant",
        oracleText: packageId === "auras" ? "Enchant creature. Enchanted creature gets +1/+1." : "Draw a card.",
        cmc: 1,
      }),
      mechanics: { produces: packageId === "auras" ? ["auras"] : ["spells", "draw"], rewards: [] },
      commanderConnectionSignals: [],
    };
    const partial = Array.from({ length: 20 }, (_, i) => ({
      quantity: 1,
      name: `Prior ${i}`,
      roles: ["draw"],
      cmc: 1,
      strategicSemantics: twin.strategicSemantics,
      mechanics: twin.mechanics,
      commanderConnectionSignals: [],
    }));
    const state = buildLiveDeficitState(partial, intent, { roleTargets: intent.roleTargets });
    const delta = prospectiveSlotDelta(partial, twin, intent, { deficitState: state, closureMemory: memory });
    assert.ok(delta.oversupplyGuarded || delta.negatives.some((entry) => entry.kind === "oversupply_guardrail"), `${packageId} should guard oversupply`);
  }
});

test("phase-aware selection still behaves correctly under closure memory", () => {
  const report = forgeNativeMasterwork(fixtureInput(TORTURE_FIXTURES.find((entry) => entry.id === "pearl-ear-auras"), 11));
  assert.ok(report.selected.constructionPhaseDiagnostics);
  assert.ok(report.selected.selfEvaluation?.liveFillPicks > 0);
  assert.equal(report.selected.strategicCohesionGate?.passed, true);
});

test("induced oversupply fixture shows weakened same-need chase after closure", () => {
  const intent = spellIntent();
  const memory = createDeficitClosureMemory();
  const shell = Array.from({ length: 16 }, (_, i) => ({
    quantity: 1,
    name: `Cantrip ${i}`,
    roles: ["draw"],
    cmc: 1,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }),
    mechanics: { produces: ["spells", "draw"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  }));
  for (const [index, row] of shell.entries()) {
    observeDeficitClosure(memory, {
      pickIndex: index + 1,
      name: row.name,
      deficitsFilled: ["package_core:spellslinger"],
      surplusIntroduced: index >= 14 ? ["package_core:spellslinger"] : [],
      deficitState: buildLiveDeficitState(shell.slice(0, index + 1), intent, { roleTargets: intent.roleTargets }),
      footprintSig: footprintSignature(row),
    });
  }
  const early = prospectiveSlotDelta(shell.slice(0, 8), {
    card: { name: "Early Cantrip", typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 },
    roles: ["draw"],
    cmc: 1,
    score: 40,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }),
    mechanics: { produces: ["spells", "draw"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  }, intent, {
    deficitState: buildLiveDeficitState(shell.slice(0, 8), intent, { roleTargets: intent.roleTargets }),
    closureMemory: createDeficitClosureMemory(),
  });
  const late = prospectiveSlotDelta(shell, {
    card: { name: "Late Cantrip", typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 },
    roles: ["draw"],
    cmc: 1,
    score: 40,
    strategicSemantics: strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }),
    mechanics: { produces: ["spells", "draw"], rewards: [] },
    commanderConnectionSignals: ["spells"],
  }, intent, {
    deficitState: buildLiveDeficitState(shell, intent, { roleTargets: intent.roleTargets }),
    closureMemory: memory,
  });
  assert.ok(late.total < early.total, `late oversupply chase ${late.total} should be below early deficit fill ${early.total}`);
  assert.ok(late.oversupplyGuarded || late.negatives.some((entry) => entry.kind === "oversupply_guardrail"));
});

test("same seed remains deterministic after closure memory", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "spellslinger");
  const a = forgeNativeMasterwork(fixtureInput(fixture, 11));
  const b = forgeNativeMasterwork(fixtureInput(fixture, 11));
  assert.deepEqual(
    a.selected.rows.map((row) => `${row.quantity} ${row.name}`),
    b.selected.rows.map((row) => `${row.quantity} ${row.name}`),
  );
});

test("incrementalFootprintNovelty distinguishes identical vs distinct signatures", () => {
  const view = { footprintSamples: ["r:draw|p:spells|w:|s:|pkg:spellslinger|c:spells"] };
  assert.equal(incrementalFootprintNovelty("r:draw|p:spells|w:|s:|pkg:spellslinger|c:spells", view), 0);
  assert.ok(incrementalFootprintNovelty("r:interaction|p:spells|w:|s:|pkg:spellslinger|c:spells", view) > 0.2);
});
