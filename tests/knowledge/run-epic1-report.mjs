#!/usr/bin/env node
// Epic 1 — Canonical Card Intelligence report (human-inspectable).
// Observation only. Brain unchanged.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import CARD_MECHANICS from "../../app/card-mechanics.mjs";
import {
  buildCanonicalCardIntelligence,
  aliasesShareCanonicalKnowledge,
} from "../../app/knowledge/canonical-card-intelligence.mjs";
import {
  auditSemanticCoverage,
  compareCoverageBeforeAfter,
} from "../../app/knowledge/semantic-coverage-audit.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const FIXTURE_CORPUS = [
  {
    name: "Doubling Season",
    typeLine: "Enchantment",
    oracleText:
      "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.",
  },
  {
    name: "Atraxa, Praetors' Voice",
    typeLine: "Legendary Creature — Phyrexian Angel Horror",
    oracleText:
      "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.",
    keywords: ["Flying", "Vigilance", "Deathtouch", "Lifelink"],
  },
  {
    name: "Jace, the Mind Sculptor",
    typeLine: "Legendary Planeswalker — Jace",
    oracleText:
      "+2: Look at the top card of target player's library. You may put that card on the bottom of that player's library.\n0: Draw three cards, then put two cards from your hand on top of your library in any order.\n−1: Return target creature to its owner's hand.\n−12: Exile all cards from target player's library, then that player shuffles their hand into their library.",
  },
  {
    name: "Teferi's Protection",
    typeLine: "Instant",
    oracleText:
      "Until your next turn, your life total can't change and you gain protection from everything. All permanents you control phase out.",
  },
  {
    name: "Demonic Tutor",
    typeLine: "Sorcery",
    oracleText: "Search your library for a card, put that card into your hand, then shuffle.",
  },
  {
    name: "Sol Ring",
    typeLine: "Artifact",
    oracleText: "{T}: Add {C}{C}.",
  },
  {
    name: "Sakura-Tribe Elder",
    typeLine: "Creature — Snake Shaman",
    oracleText: "Sacrifice Sakura-Tribe Elder: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
  },
  {
    name: "Goblin Electromancer",
    typeLine: "Creature — Goblin Wizard",
    oracleText: "Instant and sorcery spells you cast cost {1} less to cast.",
  },
  {
    name: "Reanimate",
    typeLine: "Sorcery",
    oracleText:
      "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to its mana value.",
  },
  {
    name: "Path of Ancestry",
    typeLine: "Land",
    oracleText:
      "Path of Ancestry enters tapped. Choose a creature type.\n{T}: Add one mana of any color in your commander's color identity. When that mana is spent to cast a creature spell of the chosen type, scry 1.",
  },
];

async function loadRecentSetSample() {
  const sets = ["one", "mkm", "otj", "blb", "dsk", "fdn"];
  const cards = [];
  for (const code of sets) {
    try {
      const mod = await import(`../../app/set-cards/${code}.mjs`);
      const payload = mod.default;
      for (const card of payload.cards || []) {
        cards.push({
          name: card.name,
          typeLine: card.typeLine,
          oracleText: card.oracleText,
          manaCost: card.manaCost,
          keywords: card.keywords || [],
          setCode: code,
          releasedAt: payload.set?.releasedAt || null,
        });
      }
    } catch {
      // set module optional
    }
  }
  return cards;
}

function mechanicsIndexStats() {
  const keys = Object.keys(CARD_MECHANICS);
  let tagged = 0;
  for (const key of keys) {
    if (CARD_MECHANICS[key]?.length) tagged += 1;
  }
  return {
    canonicalNamesIndexed: keys.length,
    namesWithMechanicTags: tagged,
    mechanicTagCoveragePct: keys.length ? Math.round((tagged / keys.length) * 1000) / 10 : 0,
  };
}

function formatReport({ fixtureAudit, setAudit, comparison, examples, mechanics }) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 1");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 1 — Canonical Card Intelligence");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Mechanics index cards | ${mechanics.canonicalNamesIndexed} |`);
  lines.push(`| Mechanics tag coverage | ${mechanics.mechanicTagCoveragePct}% |`);
  lines.push(`| Fixture corpus cards | ${fixtureAudit.totalCards} |`);
  lines.push(`| Recent-set sample cards | ${setAudit.totalCards} |`);
  lines.push(`| Fixture knowledge-class hit rate | ${fixtureAudit.knowledge.knowledgeClassHitPct}% |`);
  lines.push(`| Set-sample knowledge-class hit rate | ${setAudit.knowledge.knowledgeClassHitPct}% |`);
  lines.push(`| Fixture rich completeness | ${fixtureAudit.knowledge.richCompletenessPct}% |`);
  lines.push(`| Set-sample rich completeness | ${setAudit.knowledge.richCompletenessPct}% |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");
  lines.push("## Coverage before → after (fixture corpus)");
  lines.push("");
  lines.push("| Surface | Before | After |");
  lines.push("|---------|-------:|------:|");
  lines.push(`| Strategic semantics hit | ${comparison.before.strategicSemanticsHitPct}% | ${comparison.after.strategicSemanticsHitPct}% |`);
  lines.push(`| Mechanical signals hit | ${comparison.before.signalHitPct}% | ${comparison.after.signalHitPct}% |`);
  lines.push(`| Knowledge semantic classes | 0% (not tracked) | ${comparison.after.knowledgeClassHitPct}% |`);
  lines.push(`| Rich completeness band | — | ${comparison.after.richCompletenessPct}% |`);
  lines.push("");
  lines.push("## What MetaForge now knows (examples)");
  lines.push("");
  for (const example of examples) {
    lines.push(`### ${example.name}`);
    lines.push(`- Roles: ${example.roles.join(", ") || "—"}`);
    lines.push(`- Strategic semantics: ${example.strategicSemantics.join(", ") || "—"}`);
    lines.push(`- Knowledge classes: ${example.knowledgeClasses.map((entry) => entry.label).join(", ") || "—"}`);
    lines.push(`- Package hints: ${example.packageHints.join(", ") || "—"}`);
    lines.push(`- Completeness: ${example.completeness.band} (${example.completeness.score}%)`);
    lines.push("");
  }
  lines.push("## Largest remaining gaps (set sample)");
  lines.push("");
  for (const gap of setAudit.sampleGaps.slice(0, 15)) {
    lines.push(`- ${gap}`);
  }
  if (!setAudit.sampleGaps.length) lines.push("- No thin/empty gaps in this sample.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 2: Elite Tournament Intelligence (fingerprints / commander profiles)");
  lines.push("- Do not wire this layer into Brain construction without a harness report.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const mechanics = mechanicsIndexStats();
  const fixtureAudit = auditSemanticCoverage({ cards: FIXTURE_CORPUS, label: "epic1-fixtures" });
  const setCards = await loadRecentSetSample();
  const setAudit = auditSemanticCoverage({ cards: setCards, label: "recent-sets-sample" });
  const comparison = compareCoverageBeforeAfter(fixtureAudit);

  const examples = FIXTURE_CORPUS.map((card) => {
    const intelligence = buildCanonicalCardIntelligence({ card });
    return {
      name: intelligence.identity.canonicalName,
      roles: [...intelligence.roles],
      strategicSemantics: [...intelligence.strategicSemantics],
      knowledgeClasses: [...intelligence.knowledgeClasses],
      packageHints: [...intelligence.packageHints],
      completeness: intelligence.completeness,
    };
  });

  // Alias inheritance smoke (A4): Megatron display shares Blightsteel knowledge key shape.
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
        { name: "Blightsteel Colossus", flavor_name: "Megatron", oracle_id: "oracle-blightsteel", type_line: "Artifact Creature — Phyrexian Golem", oracle_text: "Trample, infect, indestructible" },
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
  const aliasOk = aliasesShareCanonicalKnowledge(megatron, blightsteel);

  const report = formatReport({ fixtureAudit, setAudit, comparison, examples, mechanics });
  const json = {
    writesToBrain: false,
    epic: 1,
    brainChanges: 0,
    mechanics,
    fixtureAudit,
    setAudit,
    comparison,
    aliasInheritanceOk: aliasOk,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(outDir, "epic1-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic1-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic1-knowledge-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
