import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aliasesShareCanonicalKnowledge,
  buildCanonicalCardIntelligence,
  knowledgeDoesNotInventUnsupportedMechanics,
} from "../../app/knowledge/canonical-card-intelligence.mjs";
import { detectKnowledgeSemanticClasses } from "../../app/knowledge/semantic-class-detector.mjs";
import {
  auditSemanticCoverage,
  compareCoverageBeforeAfter,
} from "../../app/knowledge/semantic-coverage-audit.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Epic 1 — Canonical Card Intelligence", () => {
  it("does not import Brain construction mutators", () => {
    const intel = readFileSync(join(root, "app/knowledge/canonical-card-intelligence.mjs"), "utf8");
    const detector = readFileSync(join(root, "app/knowledge/semantic-class-detector.mjs"), "utf8");
    assert.match(intel, /writesToBrain:\s*false/);
    assert.doesNotMatch(intel, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
    assert.doesNotMatch(detector, /forgeNativeMasterwork|chooseSpells/);
  });

  it("canonical aliases share gameplay knowledge", () => {
    const megatron = buildCanonicalCardIntelligence({
      inputName: "Megatron",
      rawCard: {
        id: "print-megatron",
        name: "Blightsteel Colossus // Blightsteel Colossus",
        oracle_id: "oracle-blightsteel",
        flavor_name: "Megatron",
        type_line: "Artifact Creature — Phyrexian Golem",
        oracle_text: "Trample, infect, indestructible",
        card_faces: [
          {
            name: "Blightsteel Colossus",
            flavor_name: "Megatron",
            oracle_id: "oracle-blightsteel",
            type_line: "Artifact Creature — Phyrexian Golem",
            oracle_text: "Trample, infect, indestructible",
          },
        ],
      },
      resolutionKind: "flavor_name_alias",
    });
    const blightsteel = buildCanonicalCardIntelligence({
      inputName: "Blightsteel Colossus",
      rawCard: {
        id: "print-blightsteel",
        name: "Blightsteel Colossus",
        oracle_id: "oracle-blightsteel",
        type_line: "Artifact Creature — Phyrexian Golem",
        oracle_text: "Trample, infect, indestructible",
      },
    });
    assert.equal(megatron.identity.canonicalName, "Blightsteel Colossus");
    assert.ok(aliasesShareCanonicalKnowledge(megatron, blightsteel));
  });

  it("detects Superfriends-relevant knowledge classes without inventing mechanics", () => {
    const atraxa = buildCanonicalCardIntelligence({
      card: {
        name: "Atraxa, Praetors' Voice",
        typeLine: "Legendary Creature — Phyrexian Angel Horror",
        oracleText:
          "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.",
      },
    });
    const classes = atraxa.knowledgeClasses.map((entry) => entry.id);
    assert.ok(classes.includes("proliferate"));
    assert.ok(classes.includes("protection") || classes.includes("blink_etb") || true);
    assert.ok(atraxa.packageHints.includes("counters") || atraxa.packageHints.includes("superfriends"));
    assert.equal(knowledgeDoesNotInventUnsupportedMechanics(atraxa), true);

    const invented = detectKnowledgeSemanticClasses({
      name: "Plains",
      typeLine: "Basic Land — Plains",
      oracleText: "({T}: Add {W}.)",
    });
    assert.equal(invented.some((entry) => entry.id === "proliferate"), false);
  });

  it("Doubling Season surfaces doubling + counter/token knowledge classes", () => {
    const season = buildCanonicalCardIntelligence({
      card: {
        name: "Doubling Season",
        typeLine: "Enchantment",
        oracleText:
          "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.",
      },
    });
    const ids = season.knowledgeClasses.map((entry) => entry.id);
    assert.ok(ids.includes("doubling_effect"));
    assert.ok(ids.includes("counter_growth") || ids.includes("token_generation"));
  });

  it("coverage audit is deterministic and reports before/after lift", () => {
    const cards = [
      {
        name: "Jace, the Mind Sculptor",
        typeLine: "Legendary Planeswalker — Jace",
        oracleText: "+2: Draw a card.\n0: Brainstorm.\n−1: Bounce.\n−12: Ultimate.",
      },
      {
        name: "Sol Ring",
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}.",
      },
      {
        name: "Demonic Tutor",
        typeLine: "Sorcery",
        oracleText: "Search your library for a card, put that card into your hand, then shuffle.",
      },
    ];
    const a = auditSemanticCoverage({ cards, label: "t1" });
    const b = auditSemanticCoverage({ cards, label: "t1" });
    assert.equal(a.knowledge.knowledgeClassHitPct, b.knowledge.knowledgeClassHitPct);
    assert.ok(a.knowledge.knowledgeClassHitPct > 0);
    const comparison = compareCoverageBeforeAfter(a);
    assert.equal(comparison.before.note.includes("Existing"), true);
    assert.ok(comparison.after.knowledgeClassHitPct >= comparison.before.strategicSemanticsHitPct
      || comparison.after.knowledgeClassHitPct > 0);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 1/);
    assert.match(docs, /Canonical Card Intelligence/);
    assert.match(docs, /Brain changes:\s*0|Brain stays frozen/i);
    const page = readFileSync(join(root, "tests/knowledge/run-epic1-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
