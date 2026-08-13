// =============================================================================
// Card Identity Resolution — Product Sprint Alpha A4
// =============================================================================
// Printed/flavor/display names are not gameplay identity.
// Alternate identity is not unknown.
// Presentation only for display fields. Brain construction untouched.
// =============================================================================

import {
  normalizeCardLookupKey,
  scryfallAliasKeys,
  scryfallLookupName,
} from "./deck-understanding.mjs";

const freeze = (value) => Object.freeze(value);

export const RESOLUTION_KINDS = freeze([
  "exact_canonical",
  "exact_printed_name",
  "flavor_name_alias",
  "face_name",
  "normalized_variant",
  "fuzzy_authoritative",
  "basic_land",
  "unresolved",
]);

/**
 * Canonical gameplay name for rules / Brain pool indexing.
 * Reversible Secret Lair printings often use "Name // Name"; collapse to one face.
 */
export function canonicalGameplayName(rawCard = {}) {
  const faces = rawCard.card_faces || [];
  if (faces.length >= 1) {
    const faceNames = faces.map((face) => String(face?.name || "").trim()).filter(Boolean);
    if (faceNames.length && faceNames.every((name) => normalizeCardLookupKey(name) === normalizeCardLookupKey(faceNames[0]))) {
      return faceNames[0];
    }
  }
  const full = String(rawCard.name || "").trim();
  if (!full) return "";
  // Keep true DFCs with distinct faces as the full Scryfall name.
  if (/\s\/\/\s/.test(full)) {
    const [front, back] = full.split(/\s*\/\/\s*/);
    if (normalizeCardLookupKey(front) === normalizeCardLookupKey(back)) return front.trim();
  }
  return full;
}

export function oracleIdFromRawCard(rawCard = {}) {
  return (
    rawCard.oracle_id
    || rawCard.card_faces?.[0]?.oracle_id
    || rawCard.card_faces?.find((face) => face?.oracle_id)?.oracle_id
    || null
  );
}

export function flavorOrPrintedNames(rawCard = {}) {
  return [
    rawCard.flavor_name,
    rawCard.printed_name,
    ...(rawCard.card_faces || []).flatMap((face) => [face?.flavor_name, face?.printed_name]),
  ].filter(Boolean);
}

export function displayNameForInput(inputName = "", rawCard = {}) {
  const requested = normalizeCardLookupKey(inputName);
  if (!requested) return canonicalGameplayName(rawCard);
  const aliases = flavorOrPrintedNames(rawCard).map((name) => normalizeCardLookupKey(name));
  if (aliases.includes(requested)) return String(inputName).trim();
  const canonical = canonicalGameplayName(rawCard);
  if (normalizeCardLookupKey(canonical) === requested) return canonical;
  if (normalizeCardLookupKey(rawCard.name) === requested) return canonical || String(rawCard.name).trim();
  const faceHit = (rawCard.card_faces || []).find(
    (face) => normalizeCardLookupKey(face?.name || "") === requested,
  );
  if (faceHit?.name) return String(faceHit.name).trim();
  return String(inputName).trim();
}

/**
 * Authoritative identity record after a Scryfall card has been chosen.
 */
export function buildResolvedCardIdentity({
  inputName = "",
  rawCard = null,
  resolutionKind = "exact_canonical",
  confidence = "authoritative",
} = {}) {
  if (!rawCard) {
    return freeze({
      inputName: String(inputName || "").trim(),
      displayName: String(inputName || "").trim(),
      canonicalName: null,
      oracleId: null,
      printingId: null,
      resolutionKind: "unresolved",
      confidence: "none",
      aliasNames: freeze([]),
    });
  }
  const canonicalName = canonicalGameplayName(rawCard);
  const displayName = displayNameForInput(inputName, rawCard);
  return freeze({
    inputName: String(inputName || "").trim(),
    displayName,
    canonicalName,
    oracleId: oracleIdFromRawCard(rawCard),
    printingId: rawCard.id || null,
    resolutionKind: RESOLUTION_KINDS.includes(resolutionKind) ? resolutionKind : "fuzzy_authoritative",
    confidence,
    aliasNames: freeze(scryfallAliasKeys(rawCard)),
  });
}

/**
 * Prefer unique exact flavor/printed/face matches over ambiguous name hits.
 * Collapses reversible/duplicate prints by oracle identity before counting.
 */
export function pickAuthoritativeCardMatch(requestedName = "", cards = []) {
  const requested = normalizeCardLookupKey(requestedName);
  if (!requested || !cards.length) {
    return freeze({ card: null, reason: "card_not_real", resolutionKind: "unresolved" });
  }

  const byOracle = new Map();
  for (const card of cards) {
    const oracleId = oracleIdFromRawCard(card) || `name:${normalizeCardLookupKey(canonicalGameplayName(card) || card.name)}`;
    if (!byOracle.has(oracleId)) byOracle.set(oracleId, card);
  }
  const uniqueCards = [...byOracle.values()];

  const flavorExact = uniqueCards.filter((card) =>
    flavorOrPrintedNames(card).some((name) => normalizeCardLookupKey(name) === requested),
  );
  if (flavorExact.length === 1) {
    return freeze({
      card: flavorExact[0],
      reason: "resolved_via_flavor_name",
      resolutionKind: "flavor_name_alias",
    });
  }
  if (flavorExact.length > 1) {
    return freeze({ card: null, reason: "ambiguous_name", resolutionKind: "unresolved" });
  }

  const canonicalExact = uniqueCards.filter((card) => {
    const names = [
      card.name,
      scryfallLookupName(card.name),
      canonicalGameplayName(card),
      ...(card.card_faces || []).map((face) => face?.name),
    ].filter(Boolean);
    return names.some((name) => normalizeCardLookupKey(name) === requested);
  });
  if (canonicalExact.length === 1) {
    const card = canonicalExact[0];
    const faceOnly = normalizeCardLookupKey(card.name) !== requested
      && (card.card_faces || []).some((face) => normalizeCardLookupKey(face?.name || "") === requested);
    return freeze({
      card,
      reason: faceOnly ? "resolved_via_face_name" : "resolved",
      resolutionKind: faceOnly ? "face_name" : "exact_canonical",
    });
  }
  if (canonicalExact.length > 1) {
    return freeze({ card: null, reason: "ambiguous_name", resolutionKind: "unresolved" });
  }

  // Never invent identity from a near-miss or unique unrelated hit.
  // Authoritative alias maps only (flavor / printed / face / exact name).
  return freeze({ card: null, reason: "card_not_real", resolutionKind: "unresolved" });
}

/**
 * Singleton / dedupe key: oracle identity when known, else canonical name.
 * Display aliases must not bypass singleton rules.
 */
export function gameplayIdentityKey({ oracleId = null, canonicalName = "", inputName = "" } = {}) {
  if (oracleId) return `oracle:${oracleId}`;
  const canonical = normalizeCardLookupKey(canonicalName);
  if (canonical) return `canonical:${canonical}`;
  return `input:${normalizeCardLookupKey(inputName)}`;
}

/**
 * Merge quantities that share gameplay identity.
 * Preserves the first display name encountered for that identity.
 */
export function mergeByGameplayIdentity(rows = []) {
  const merged = new Map();
  for (const row of rows) {
    if (!row) continue;
    const key = gameplayIdentityKey(row);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += Number(row.quantity || 0);
      continue;
    }
    merged.set(key, {
      ...row,
      quantity: Number(row.quantity || 0),
    });
  }
  return [...merged.values()];
}

/** Oracle text / type line for Brain pool cards, including reversible faces. */
export function oracleFieldsFromRawCard(rawCard = {}) {
  const faces = rawCard.card_faces || [];
  const typeLine = String(
    rawCard.type_line
    || faces.map((face) => face?.type_line || "").filter(Boolean).join(" // ")
    || "",
  );
  const oracleText = String(
    rawCard.oracle_text
    || faces.map((face) => face?.oracle_text || "").filter(Boolean).join("\n")
    || "",
  );
  const manaCost = String(
    rawCard.mana_cost
    || faces.find((face) => face?.mana_cost)?.mana_cost
    || "",
  );
  return freeze({ typeLine, oracleText, manaCost });
}
