// =============================================================================
// Knowledge — Semantic Coverage Audit (Epic 1)
// =============================================================================
// Human-inspectable coverage of what MetaForge understands about cards.
// Observation only. writesToBrain: false
// =============================================================================

import CARD_MECHANICS from "../card-mechanics.mjs";
import {
  buildCanonicalCardIntelligence,
} from "./canonical-card-intelligence.mjs";
import { KNOWLEDGE_SEMANTIC_CLASSES } from "./semantic-class-detector.mjs";

const freeze = (value) => Object.freeze(value);

function normalizeKey(name = "") {
  return String(name || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function cardTypeBucket(typeLine = "") {
  if (/\bPlaneswalker\b/i.test(typeLine)) return "planeswalker";
  if (/\bCreature\b/i.test(typeLine)) return "creature";
  if (/\bArtifact\b/i.test(typeLine)) return "artifact";
  if (/\bEnchantment\b/i.test(typeLine)) return "enchantment";
  if (/\bInstant\b/i.test(typeLine)) return "instant";
  if (/\bSorcery\b/i.test(typeLine)) return "sorcery";
  if (/\bLand\b/i.test(typeLine)) return "land";
  return "other";
}

/**
 * Audit a list of card objects for semantic / role / knowledge coverage.
 */
export function auditSemanticCoverage({
  cards = [],
  label = "corpus",
} = {}) {
  const rows = [];
  const byType = {};
  const missingClasses = Object.fromEntries(
    KNOWLEDGE_SEMANTIC_CLASSES.map((entry) => [entry.id, 0]),
  );
  let mechanicsHits = 0;
  let signalHits = 0;
  let semanticHits = 0;
  let knowledgeHits = 0;
  let roleHits = 0;
  let richHits = 0;
  let emptyKnowledge = 0;
  let thinBaseline = 0;

  for (const card of cards) {
    if (!card?.name && !card?.typeLine && !card?.type_line) continue;
    const intelligence = buildCanonicalCardIntelligence({ card });
    const typeBucket = cardTypeBucket(intelligence.faces.typeLine);
    byType[typeBucket] = (byType[typeBucket] || 0) + 1;

    const key = normalizeKey(intelligence.identity.canonicalName || card.name);
    const hasMechanics = Boolean(CARD_MECHANICS[key]?.length);
    if (hasMechanics) mechanicsHits += 1;
    if (intelligence.mechanics.signals.length) signalHits += 1;
    if (intelligence.strategicSemantics.length) semanticHits += 1;
    if (intelligence.knowledgeClasses.length) knowledgeHits += 1;
    else emptyKnowledge += 1;
    if (intelligence.roles.length) roleHits += 1;
    if (intelligence.completeness.band === "rich") richHits += 1;
    if (
      intelligence.strategicSemantics.length === 0
      && intelligence.mechanics.signals.length === 0
      && !/\bLand\b/i.test(intelligence.faces.typeLine)
    ) {
      thinBaseline += 1;
    }

    for (const entry of KNOWLEDGE_SEMANTIC_CLASSES) {
      if (!intelligence.knowledgeClasses.some((hit) => hit.id === entry.id)) {
        // counted as "not present on this card" — used for class inventory later
      }
    }

    rows.push(
      freeze({
        name: intelligence.identity.canonicalName || card.name,
        typeBucket,
        completeness: intelligence.completeness.band,
        knowledgeClassCount: intelligence.knowledgeClasses.length,
        strategicSemanticCount: intelligence.strategicSemantics.length,
        signalCount: intelligence.mechanics.signals.length,
        packageHints: intelligence.packageHints,
      }),
    );

    for (const hit of intelligence.knowledgeClasses) {
      missingClasses[hit.id] = (missingClasses[hit.id] || 0) + 1;
    }
  }

  const total = rows.length;
  const baseline = freeze({
    mechanicsHitPct: percent(mechanicsHits, total),
    signalHitPct: percent(signalHits, total),
    strategicSemanticsHitPct: percent(semanticHits, total),
    roleHitPct: percent(roleHits, total),
    thinNonlandCount: thinBaseline,
  });
  const knowledge = freeze({
    knowledgeClassHitPct: percent(knowledgeHits, total),
    richCompletenessPct: percent(richHits, total),
    emptyKnowledgeCount: emptyKnowledge,
    classPresence: freeze(
      Object.fromEntries(
        Object.entries(missingClasses)
          .map(([id, count]) => [id, freeze({ cardsWithClass: count, pct: percent(count, total) })])
          .sort((a, b) => b[1].cardsWithClass - a[1].cardsWithClass),
      ),
    ),
  });

  return freeze({
    writesToBrain: false,
    version: "semantic-coverage-audit-v1",
    label,
    totalCards: total,
    byType: freeze(byType),
    baseline,
    knowledge,
    delta: freeze({
      // Knowledge overlay adds class hits beyond empty baseline understanding.
      knowledgeLiftPctPoints:
        Math.round((knowledge.knowledgeClassHitPct - baseline.strategicSemanticsHitPct) * 10) / 10,
      richSharePct: knowledge.richCompletenessPct,
    }),
    sampleGaps: freeze(
      rows
        .filter((row) => row.completeness === "thin" || row.completeness === "empty")
        .slice(0, 25)
        .map((row) => `${row.name} · ${row.typeBucket} · ${row.completeness}`),
    ),
  });
}

/**
 * Build before/after comparison when knowledge overlay is applied.
 * "Before" = existing Brain observation surfaces only.
 * "After" = same + knowledge classes.
 */
export function compareCoverageBeforeAfter(audit) {
  return freeze({
    writesToBrain: false,
    before: freeze({
      strategicSemanticsHitPct: audit.baseline.strategicSemanticsHitPct,
      signalHitPct: audit.baseline.signalHitPct,
      mechanicsHitPct: audit.baseline.mechanicsHitPct,
      note: "Existing observation APIs only (no knowledge overlay).",
    }),
    after: freeze({
      knowledgeClassHitPct: audit.knowledge.knowledgeClassHitPct,
      richCompletenessPct: audit.knowledge.richCompletenessPct,
      strategicSemanticsHitPct: audit.baseline.strategicSemanticsHitPct,
      signalHitPct: audit.baseline.signalHitPct,
      note: "Same APIs + Epic 1 knowledge semantic classes.",
    }),
    lift: freeze({
      knowledgeClassHitPct: audit.knowledge.knowledgeClassHitPct,
      knowledgeLiftVsStrategicSemanticsPctPoints: audit.delta.knowledgeLiftPctPoints,
    }),
  });
}
