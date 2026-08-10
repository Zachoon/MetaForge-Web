import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAIN_POLICY_V1_CONTROL,
  BRAIN_POLICY_V2_EXP001_INTERACTION,
  resolveBrainPolicy,
  activeInteractionWiring,
  brainPolicyAppliesToPowerTier,
} from "../app/brain-policy.mjs";
import { prospectiveSlotDelta, buildLiveDeficitState } from "../app/prospective-slot-delta.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

test("Brain v1 control is the default resolved policy", () => {
  assert.equal(resolveBrainPolicy(null).id, BRAIN_POLICY_V1_CONTROL);
  assert.equal(resolveBrainPolicy(BRAIN_POLICY_V1_CONTROL).partnerPresentWeight, 4);
  assert.equal(resolveBrainPolicy(BRAIN_POLICY_V1_CONTROL).partnerPresentCap, 16);
});

test("Exp001 is opt-in and isolated from Casual/Focused tiers", () => {
  assert.equal(
    brainPolicyAppliesToPowerTier(resolveBrainPolicy(BRAIN_POLICY_V2_EXP001_INTERACTION), "Casual"),
    false,
  );
  assert.equal(
    brainPolicyAppliesToPowerTier(resolveBrainPolicy(BRAIN_POLICY_V2_EXP001_INTERACTION), "Focused"),
    false,
  );
  assert.equal(
    brainPolicyAppliesToPowerTier(resolveBrainPolicy(BRAIN_POLICY_V2_EXP001_INTERACTION), "High-Power"),
    true,
  );
  assert.equal(
    activeInteractionWiring(BRAIN_POLICY_V2_EXP001_INTERACTION, "Casual").id,
    BRAIN_POLICY_V1_CONTROL,
  );
  assert.equal(
    activeInteractionWiring(BRAIN_POLICY_V2_EXP001_INTERACTION, "Maximum").id,
    BRAIN_POLICY_V2_EXP001_INTERACTION,
  );
});

test("interaction evidence influences prospective delta only under Exp001", () => {
  const intent = {
    packages: [],
    roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    brainPolicy: BRAIN_POLICY_V1_CONTROL,
    targetPowerTier: "High-Power",
  };
  const partial = [
    {
      name: "Producer",
      roles: ["ramp"],
      cmc: 2,
      mechanics: { produces: ["tokens"], rewards: [] },
      strategicSemantics: new Set(),
    },
  ];
  const candidate = {
    name: "Payoff",
    roles: ["threat", "draw"],
    cmc: 2,
    mechanics: { produces: [], rewards: ["tokens"] },
    strategicSemantics: new Set(),
    commanderConnectionSignals: [],
  };
  const deficitState = buildLiveDeficitState(partial, intent, {});
  const control = prospectiveSlotDelta(partial, candidate, intent, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V1_CONTROL,
    targetPowerTier: "High-Power",
  });
  const exp = prospectiveSlotDelta(partial, candidate, {
    ...intent,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  }, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
    targetPowerTier: "High-Power",
  });
  const controlPresent = control.positives.find((p) => p.kind === "interaction_present");
  const expPresent = exp.positives.find((p) => p.kind === "interaction_present");
  assert.ok(controlPresent);
  assert.ok(expPresent);
  assert.ok(expPresent.weight > controlPresent.weight);
});

test("multifunction connected interaction receives structural credit under Exp001", () => {
  const intent = {
    packages: [],
    roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
    targetPowerTier: "Maximum",
  };
  const partial = [{
    name: "Producer",
    roles: ["ramp"],
    cmc: 1,
    mechanics: { produces: ["artifacts"], rewards: [] },
    strategicSemantics: new Set(),
  }];
  const single = {
    name: "Single Role Payoff",
    roles: ["threat"],
    cmc: 3,
    mechanics: { produces: [], rewards: ["artifacts"] },
    strategicSemantics: new Set(),
    commanderConnectionSignals: [],
  };
  const multi = {
    name: "Multi Role Payoff",
    roles: ["threat", "draw"],
    cmc: 2,
    mechanics: { produces: [], rewards: ["artifacts"] },
    strategicSemantics: new Set(),
    commanderConnectionSignals: [],
  };
  const deficitState = buildLiveDeficitState(partial, intent, {});
  const singleDelta = prospectiveSlotDelta(partial, single, intent, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  });
  const multiDelta = prospectiveSlotDelta(partial, multi, intent, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  });
  const s = singleDelta.positives.find((p) => p.kind === "interaction_present")?.weight || 0;
  const m = multiDelta.positives.find((p) => p.kind === "interaction_present")?.weight || 0;
  assert.ok(m > s);
});

test("Brain v1 control forge output remains unchanged when Exp001 is not selected", () => {
  const fixture = TORTURE_FIXTURES[0];
  const a = forgeNativeMasterwork(fixtureInput(fixture, 11));
  const b = forgeNativeMasterwork({
    ...fixtureInput(fixture, 11),
    brainPolicy: BRAIN_POLICY_V1_CONTROL,
  });
  const namesA = (a.selected.rows || a.selected.mainboard).map((r) => r.name).sort();
  const namesB = (b.selected.rows || b.selected.mainboard).map((r) => r.name).sort();
  assert.deepEqual(namesA, namesB);
});

test("Casual target does not blindly inherit Exp001 wiring density", () => {
  const fixture = TORTURE_FIXTURES[0];
  const control = forgeNativeMasterwork({
    ...fixtureInput(fixture, 11),
    targetPowerTier: "Casual",
    brainPolicy: BRAIN_POLICY_V1_CONTROL,
  });
  const exp = forgeNativeMasterwork({
    ...fixtureInput(fixture, 11),
    targetPowerTier: "Casual",
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  });
  const namesA = (control.selected.rows || control.selected.mainboard).map((r) => r.name).sort();
  const namesB = (exp.selected.rows || exp.selected.mainboard).map((r) => r.name).sort();
  assert.deepEqual(namesA, namesB);
});

test("same seed remains deterministic under Exp001", () => {
  const fixture = TORTURE_FIXTURES[0];
  const input = {
    ...fixtureInput(fixture, 17),
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
    targetPowerTier: "High-Power",
  };
  const a = forgeNativeMasterwork(input);
  const b = forgeNativeMasterwork(input);
  const namesA = (a.selected.rows || a.selected.mainboard).map((r) => r.name).sort();
  const namesB = (b.selected.rows || b.selected.mainboard).map((r) => r.name).sort();
  assert.deepEqual(namesA, namesB);
});

test("interaction quality (connected+efficient) can beat raw partner count under Exp001 math", () => {
  // One efficient multifunction connected partner vs two missing-partner stubs:
  // connected efficient multi should outscore an orphan with equal raw roles.
  const intent = {
    packages: [],
    roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
    targetPowerTier: "High-Power",
  };
  const partial = [{
    name: "Producer",
    roles: ["ramp"],
    cmc: 1,
    mechanics: { produces: ["etb"], rewards: [] },
    strategicSemantics: new Set(),
  }];
  const connected = {
    name: "Efficient Connector",
    roles: ["interaction", "draw"],
    cmc: 1,
    mechanics: { produces: [], rewards: ["etb"] },
    strategicSemantics: new Set(),
    commanderConnectionSignals: [],
  };
  const orphanInteraction = {
    name: "Orphan Interaction",
    roles: ["interaction"],
    cmc: 4,
    mechanics: { produces: ["unmatched_signal"], rewards: ["other_missing"] },
    strategicSemantics: new Set(),
    commanderConnectionSignals: [],
  };
  const deficitState = buildLiveDeficitState(partial, intent, {});
  const connectedDelta = prospectiveSlotDelta(partial, connected, intent, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  });
  const orphanDelta = prospectiveSlotDelta(partial, orphanInteraction, intent, {
    deficitState,
    brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION,
  });
  assert.ok(connectedDelta.total > orphanDelta.total);
});
