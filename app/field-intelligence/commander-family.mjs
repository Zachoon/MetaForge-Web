// =============================================================================
// Field Intelligence v1.1 — Commander family resolution
// =============================================================================
// No hardcoded commander names. Families come from Brain v1 strategic signals:
// mechanics produces/rewards, packages, scopes, partner-combined fingerprints.
// =============================================================================

import {
  extractMechanicalSignals,
} from "../forge-interaction-graph.mjs";
import {
  commanderMechanicalScopes,
  conceptSignals,
} from "../native-masterwork-engine.mjs";
import { buildStrategicIntent } from "../strategic-intent.mjs";

const freeze = (value) => Object.freeze(value);
const unique = (values) => [...new Set(values.filter(Boolean))];
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Resolve one commander (or partner pair) into a structural family fingerprint.
 */
export function resolveCommanderFamily(commanders = [], options = {}) {
  const list = (Array.isArray(commanders) ? commanders : [commanders]).filter(Boolean);
  if (!list.length) {
    return freeze({
      resolved: false,
      reason: "missing_commander",
      identityKey: null,
      familyId: null,
      familyKeys: freeze([]),
      packageIds: freeze([]),
      produces: freeze([]),
      rewards: freeze([]),
      scopes: freeze({ produces: freeze({}), rewards: freeze({}) }),
      partner: false,
    });
  }

  const identityKey = list.map((c) => c.name).sort((a, b) => a.localeCompare(b)).join(" / ");
  const missingOracle = list.filter((c) => !String(c.oracleText || c.oracle_text || "").trim());
  const mechanicRows = list.map((c) => extractMechanicalSignals(c));
  const scopeRows = list.map((c) => commanderMechanicalScopes(c));
  const produces = unique(mechanicRows.flatMap((m) => m.produces || [])).sort();
  const rewards = unique(mechanicRows.flatMap((m) => m.rewards || [])).sort();
  const signals = unique(list.flatMap((c) => conceptSignals(c))).sort();
  const scopes = freeze({
    produces: freeze(Object.assign({}, ...scopeRows.map((row) => row.produces || {}))),
    rewards: freeze(Object.assign({}, ...scopeRows.map((row) => row.rewards || {}))),
  });

  const intent = buildStrategicIntent({
    format: options.format || "Commander",
    strategy: "Balanced midrange",
    commander: list[0],
    secondCommander: list[1],
    note: options.note || "",
  }, {
    commanderMechanics: freeze({ produces, rewards }),
    commanderScopes: scopes,
    blueprint: {
      source: options.note || "",
      requestedMechanics: [],
      desiredRoles: [],
      packageSignals: [],
      promises: [],
    },
  });

  const packageIds = [...(intent.packageIds || [])].sort();
  const familyKeys = unique([
    ...packageIds.map((id) => `package:${id}`),
    ...rewards.map((signal) => `reward:${signal}`),
    ...produces.map((signal) => `produce:${signal}`),
    ...signals.slice(0, 6).map((signal) => `concept:${signal}`),
  ]).sort();

  const resolved = Boolean(
    packageIds.length
    || rewards.length
    || produces.length
    || signals.length
    || list.every((c) => String(c.oracleText || "").trim()),
  );

  let reason = null;
  if (!resolved) {
    reason = missingOracle.length
      ? "commander_oracle_unresolved"
      : "no_strategic_signals_detected";
  } else if (missingOracle.length) {
    reason = "partial_oracle_missing";
  }

  // Stable structural family id (not a popularity label).
  const familyId = familyKeys.length
    ? familyKeys.slice(0, 4).join("|")
    : `identity:${normalized(identityKey)}`;

  return freeze({
    resolved: Boolean(familyKeys.length) || Boolean(identityKey),
    structurallyTyped: Boolean(packageIds.length || rewards.length || produces.length),
    reason,
    identityKey,
    familyId,
    familyKeys: freeze(familyKeys),
    packageIds: freeze(packageIds),
    produces: freeze(produces),
    rewards: freeze(rewards),
    conceptSignals: freeze(signals),
    scopes,
    partner: list.length > 1,
    missingOracle: freeze(missingOracle.map((c) => c.name)),
  });
}

/**
 * Attach family resolution onto analyses / records.
 */
export function resolveCorpusFamilies(records = [], analyses = []) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const families = [];
  const distribution = {};
  let resolved = 0;
  let structurallyTyped = 0;
  let unresolved = 0;
  const unresolvedDetails = [];

  for (const record of records) {
    const family = resolveCommanderFamily(record.commanders || [], {
      format: record.format,
      note: record.statedArchetype || (record.archetypeTags || []).join(" "),
    });
    families.push(freeze({ deckId: record.id, ...family }));
    if (family.structurallyTyped) {
      structurallyTyped += 1;
      resolved += 1;
    } else if (family.identityKey) {
      resolved += 1;
      if (family.reason) unresolvedDetails.push(freeze({
        deckId: record.id,
        commanders: family.identityKey,
        reason: family.reason,
        structurallyTyped: false,
      }));
    } else {
      unresolved += 1;
      unresolvedDetails.push(freeze({
        deckId: record.id,
        commanders: null,
        reason: family.reason || "unresolved",
        structurallyTyped: false,
      }));
    }
    for (const key of family.familyKeys.length ? family.familyKeys : [`identity:${normalized(family.identityKey || "unknown")}`]) {
      distribution[key] = (distribution[key] || 0) + 1;
    }

    const analysis = analysisById.get(record.id);
    if (analysis) {
      analysisById.set(record.id, freeze({
        ...analysis,
        commanderFamily: family,
      }));
    }
  }

  const total = Math.max(1, records.length);
  return freeze({
    version: "commander-family-resolution-v1",
    commanderResolutionRate: round(resolved / total),
    familyResolutionRate: round(structurallyTyped / total),
    resolved,
    structurallyTyped,
    unresolved,
    unresolvedDetails: freeze(unresolvedDetails.slice(0, 40)),
    familyDistribution: freeze(Object.fromEntries(
      Object.entries(distribution).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    )),
    families: freeze(families),
    analyses: freeze([...analysisById.values()]),
  });
}
