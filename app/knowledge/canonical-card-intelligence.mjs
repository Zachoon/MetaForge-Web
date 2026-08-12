// =============================================================================
// Knowledge — Canonical Card Intelligence (Epic 1)
// =============================================================================
// Every card MetaForge inspects should resolve to one strategic identity.
// Reuses A4 identity + existing mechanics/roles/semantics, then adds a
// knowledge-layer class overlay. Observation only. writesToBrain: false
// =============================================================================

import {
  buildResolvedCardIdentity,
  canonicalGameplayName,
  gameplayIdentityKey,
  oracleFieldsFromRawCard,
  oracleIdFromRawCard,
} from "../card-identity.mjs";
import { extractMechanicalSignals, oracleExplicitlyNames } from "../forge-interaction-graph.mjs";
import { strategicSemanticsFor } from "../strategic-intent.mjs";
import { classifyNativeCard } from "../native-masterwork-engine.mjs";
import {
  detectKnowledgeSemanticClasses,
  knowledgePackageHintsFor,
} from "./semantic-class-detector.mjs";

const freeze = (value) => Object.freeze(value);

function normalizeName(name = "") {
  return String(name || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asCard(input = {}) {
  if (!input || typeof input !== "object") return {};
  if (input.card && typeof input.card === "object") {
    return {
      ...input.card,
      name: input.name || input.card.name,
      quantity: input.quantity,
    };
  }
  return input;
}

function manaValueOf(card = {}) {
  const cmc = Number(card.cmc);
  if (Number.isFinite(cmc)) return cmc;
  const cost = String(card.manaCost || card.mana_cost || "");
  const pips = (cost.match(/\{[^}]+\}/g) || []).length;
  return pips;
}

function sequenceStagesFor({ roles = [], mechanics = {}, cmc = 0, knowledgeClasses = [] } = {}) {
  const stages = [];
  if (cmc <= 3 && roles.some((role) => ["ramp", "draw", "selection"].includes(role))) stages.push("setup");
  if (cmc <= 3 && roles.some((role) => ["interaction", "protection"].includes(role))) stages.push("stabilize");
  if ((mechanics.rewards || []).length || knowledgeClasses.some((entry) => entry.id === "combat_damage_payoff")) {
    stages.push("convert");
  }
  if (roles.some((role) => ["recursion", "draw", "protection"].includes(role))) stages.push("recover");
  if ((cmc >= 4 && roles.includes("threat")) || roles.includes("combat") || (mechanics.rewards || []).includes("combat")) {
    stages.push("close");
  }
  return freeze([...new Set(stages)]);
}

function completenessFor({
  hasOracleText = false,
  mechanicsTagCount = 0,
  signalCount = 0,
  semanticCount = 0,
  knowledgeClassCount = 0,
  roleCount = 0,
} = {}) {
  const checks = [
    hasOracleText,
    mechanicsTagCount > 0,
    signalCount > 0,
    semanticCount > 0,
    knowledgeClassCount > 0,
    roleCount > 0,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return freeze({
    score,
    band: score >= 80 ? "rich" : score >= 50 ? "partial" : score > 0 ? "thin" : "empty",
    checks: freeze({
      hasOracleText,
      hasMechanicsTags: mechanicsTagCount > 0,
      hasMechanicalSignals: signalCount > 0,
      hasStrategicSemantics: semanticCount > 0,
      hasKnowledgeClasses: knowledgeClassCount > 0,
      hasRoles: roleCount > 0,
    }),
  });
}

/**
 * Build one canonical strategic identity for a card (observation only).
 */
export function buildCanonicalCardIntelligence({
  inputName = "",
  card = null,
  rawCard = null,
  resolutionKind = "exact_canonical",
  confidence = "authoritative",
  commanderContext = null,
} = {}) {
  const source = asCard(card || rawCard || {});
  const identity = rawCard
    ? buildResolvedCardIdentity({ inputName: inputName || source.name, rawCard, resolutionKind, confidence })
    : freeze({
        inputName: String(inputName || source.name || "").trim(),
        displayName: String(inputName || source.name || "").trim(),
        canonicalName: canonicalGameplayName(source) || String(source.name || "").trim() || null,
        oracleId: oracleIdFromRawCard(source),
        printingId: source.id || source.printingId || null,
        resolutionKind: source.name ? resolutionKind : "unresolved",
        confidence: source.name ? confidence : "none",
        aliasNames: freeze([]),
      });

  const oracleFields = rawCard
    ? oracleFieldsFromRawCard(rawCard)
    : freeze({
        typeLine: String(source.typeLine || source.type_line || ""),
        oracleText: String(source.oracleText || source.oracle_text || ""),
        manaCost: String(source.manaCost || source.mana_cost || ""),
      });

  const working = freeze({
    ...source,
    name: identity.canonicalName || source.name || inputName,
    typeLine: oracleFields.typeLine || source.typeLine || source.type_line || "",
    type_line: oracleFields.typeLine || source.type_line || source.typeLine || "",
    oracleText: oracleFields.oracleText || source.oracleText || source.oracle_text || "",
    oracle_text: oracleFields.oracleText || source.oracle_text || source.oracleText || "",
    manaCost: oracleFields.manaCost || source.manaCost || source.mana_cost || "",
    mana_cost: oracleFields.manaCost || source.mana_cost || source.manaCost || "",
    cmc: manaValueOf(source),
  });

  const mechanics = extractMechanicalSignals(working);
  const roles = classifyNativeCard(working);
  const strategicSemantics = [...strategicSemanticsFor(working)].sort();
  const knowledgeClasses = detectKnowledgeSemanticClasses(working);
  const packageHints = knowledgePackageHintsFor(working);
  const keywords = freeze([...(working.keywords || [])].map(String).filter(Boolean));
  const sequenceStages = sequenceStagesFor({
    roles,
    mechanics,
    cmc: working.cmc,
    knowledgeClasses,
  });

  const explicitNamedRefs = [];
  // Surface explicit Oracle naming patterns as relationship seeds (deck-local
  // pairing still happens in buildInteractionGraph).
  if (/\bnamed |Partner with |Meld with /i.test(working.oracleText || "")) {
    explicitNamedRefs.push("oracle_named_pattern_present");
  }

  const completeness = completenessFor({
    hasOracleText: Boolean(working.oracleText),
    mechanicsTagCount: (mechanics.tagProduces?.length || 0) + (mechanics.tagRewards?.length || 0),
    signalCount: (mechanics.signals || []).length,
    semanticCount: strategicSemantics.length,
    knowledgeClassCount: knowledgeClasses.length,
    roleCount: roles.length,
  });

  return freeze({
    writesToBrain: false,
    version: "canonical-card-intelligence-v1",
    identity: freeze({
      ...identity,
      gameplayKey: gameplayIdentityKey({
        oracleId: identity.oracleId,
        canonicalName: identity.canonicalName,
        inputName: identity.inputName,
      }),
    }),
    faces: freeze({
      typeLine: working.typeLine,
      oracleText: working.oracleText,
      manaCost: working.manaCost,
      manaValue: working.cmc,
      colorIdentity: freeze([...(working.colorIdentity || working.color_identity || [])]),
      keywords,
    }),
    mechanics: freeze({
      signals: freeze([...(mechanics.signals || [])]),
      produces: freeze([...(mechanics.produces || [])]),
      rewards: freeze([...(mechanics.rewards || [])]),
      tagProduces: freeze([...(mechanics.tagProduces || [])]),
      tagRewards: freeze([...(mechanics.tagRewards || [])]),
    }),
    roles: freeze([...roles]),
    strategicSemantics: freeze(strategicSemantics),
    knowledgeClasses,
    packageHints,
    sequenceStages,
    relationships: freeze({
      explicitOraclePattern: explicitNamedRefs.length > 0,
      notes: freeze(explicitNamedRefs),
    }),
    commanderContext: commanderContext
      ? freeze({ connected: Boolean(commanderContext) })
      : null,
    completeness,
  });
}

/**
 * True when two display aliases share the same gameplay knowledge key.
 */
export function aliasesShareCanonicalKnowledge(left, right) {
  if (!left?.identity?.gameplayKey || !right?.identity?.gameplayKey) return false;
  return left.identity.gameplayKey === right.identity.gameplayKey;
}

/**
 * Does NOT invent unsupported mechanics — only detects from Oracle/type text.
 */
export function knowledgeDoesNotInventUnsupportedMechanics(intelligence) {
  const text = String(intelligence?.faces?.oracleText || "");
  const typeLine = String(intelligence?.faces?.typeLine || "");
  for (const entry of intelligence?.knowledgeClasses || []) {
    if (entry.id === "planeswalker_permanent" && !/\bPlaneswalker\b/i.test(typeLine)) return false;
    if (entry.id === "proliferate" && !/\bproliferate\b/i.test(text)) return false;
    if (entry.id === "named_oracle_reference" && !/\bnamed |Partner with |Meld with /i.test(text)) return false;
  }
  return true;
}

export { oracleExplicitlyNames, normalizeName };
