import assert from "node:assert/strict";
import test from "node:test";

import {
  buildForgeStructuralAnalysis,
} from "../app/forge-structural-pipeline.mjs";


const cards = [
  {
    name: "Foundry Sage",
    typeLine:
      "Legendary Creature — Artificer",
    oracleText:
      "Whenever you create a token, draw a card.",
    quantity: 1,
    isCommander: true,
  },
  {
    name: "Ember Fabricator",
    typeLine:
      "Creature — Artificer",
    oracleText:
      "Whenever Ember Fabricator enters the battlefield, create a Treasure token.",
    quantity: 1,
  },
  {
    name: "Archive Crucible",
    typeLine:
      "Artifact",
    oracleText:
      "Whenever an artifact enters the battlefield under your control, put a charge counter on Archive Crucible.",
    quantity: 1,
  },
  {
    name: "Vault Interpreter",
    typeLine:
      "Creature — Wizard",
    oracleText:
      "Whenever you sacrifice a Treasure, draw a card.",
    quantity: 1,
  },
  {
    name: "Island",
    typeLine:
      "Basic Land — Island",
    oracleText:
      "{T}: Add {U}.",
    quantity: 36,
  },
];


test(
  "builds the complete structural-analysis contract",
  () => {
    const report =
      buildForgeStructuralAnalysis(
        cards,
        {
          commanderName:
            "Foundry Sage",
        },
      );

    assert.equal(
      report.engine,
      "metaforge-structural-pipeline-v1",
    );

    assert.equal(
      report.commanderName,
      "Foundry Sage",
    );

    assert.equal(
      report.cardCount,
      40,
    );

    assert.equal(
      report.uniqueCardCount,
      5,
    );

    assert.ok(
      Array.isArray(
        report.graph.nodes,
      ),
    );

    assert.ok(
      Array.isArray(
        report.systems.systems,
      ),
    );

    assert.ok(
      Array.isArray(
        report.causality.systems,
      ),
    );
  },
);


test(
  "is deterministic for the same verified card set",
  () => {
    const first =
      buildForgeStructuralAnalysis(
        cards,
      );

    const second =
      buildForgeStructuralAnalysis(
        cards,
      );

    assert.deepEqual(
      first,
      second,
    );
  },
);


test(
  "does not mutate supplied card records",
  () => {
    const before =
      structuredClone(cards);

    buildForgeStructuralAnalysis(
      cards,
    );

    assert.deepEqual(
      cards,
      before,
    );
  },
);


test(
  "merges duplicate card records into one graph node",
  () => {
    const report =
      buildForgeStructuralAnalysis([
        {
          name: "Repeated Engine",
          typeLine: "Artifact",
          oracleText:
            "Create a Treasure token.",
          quantity: 2,
        },
        {
          name: "Repeated Engine",
          type_line: "Artifact",
          oracle_text:
            "Create a Treasure token.",
          quantity: 3,
        },
      ]);

    assert.equal(
      report.uniqueCardCount,
      1,
    );

    assert.equal(
      report.cardCount,
      5,
    );

    assert.equal(
      report.graph.nodes[0].quantity,
      5,
    );
  },
);


test(
  "returns bounded insufficient structure instead of inventing systems",
  () => {
    const report =
      buildForgeStructuralAnalysis([
        {
          name: "Solitary Blade",
          typeLine:
            "Creature — Warrior",
          oracleText:
            "Solitary Blade has vigilance.",
        },
      ]);

    assert.equal(
      report.status,
      "insufficient-structure",
    );

    assert.equal(
      report.causality.status,
      "insufficient-structure",
    );

    assert.deepEqual(
      report.causality.criticalNodes,
      [],
    );
  },
);


test(
  "deep-freezes the public structural contract",
  () => {
    const report =
      buildForgeStructuralAnalysis(
        cards,
      );

    assert.equal(
      Object.isFrozen(report),
      true,
    );

    assert.equal(
      Object.isFrozen(report.graph),
      true,
    );

    assert.equal(
      Object.isFrozen(report.systems),
      true,
    );

    assert.equal(
      Object.isFrozen(report.causality),
      true,
    );
  },
);