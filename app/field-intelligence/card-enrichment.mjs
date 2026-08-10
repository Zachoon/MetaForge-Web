// =============================================================================
// Field Intelligence v1.1 — Real corpus card enrichment
// =============================================================================
// Tournament lists arrive as name+qty. Enrich through the same Scryfall
// collection path MetaForge uses elsewhere, with offline type-index fallback.
// Does NOT mutate Brain construction policy.
// =============================================================================

import { liveFetch } from "./live-http.mjs";

const freeze = (value) => Object.freeze(value);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

const SCRYFALL_HEADERS = Object.freeze({
  Accept: "application/json",
  "User-Agent": "MetaForge-FieldIntelligence/1.1 (+https://metaforge.gg)",
});

/** Front-face lookup for DFCs / transform names (Scryfall collection quirk). */
export function scryfallLookupName(name = "") {
  return String(name || "").split(/\s*\/\/\s*/)[0].trim();
}

export function oracleTextFromScryfallCard(card = {}) {
  if (card.oracle_text) return String(card.oracle_text);
  const faces = card.card_faces || [];
  if (faces.length) {
    return faces.map((face) => face.oracle_text || "").filter(Boolean).join("\n");
  }
  return "";
}

export function cardFromScryfall(card = {}) {
  return freeze({
    name: card.name,
    typeLine: card.type_line || "",
    oracleText: oracleTextFromScryfallCard(card),
    manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || "",
    cmc: Number.isFinite(card.cmc) ? card.cmc : Number(card.cmc) || 0,
    colorIdentity: freeze([...(card.color_identity || [])]),
    colors: freeze([...(card.colors || card.color_identity || [])]),
    scryfallId: card.id || null,
    layout: card.layout || null,
  });
}

/**
 * Batch-resolve card names via Scryfall /cards/collection.
 * Optional typeIndex: Record<normalizedName, [canonicalName, type_line]>
 */
export async function resolveCardNames(names = [], options = {}) {
  const uniqueNames = [...new Set(names.map((n) => String(n || "").trim()).filter(Boolean))];
  const byLookup = new Map(); // lookupKey -> enriched card
  const byRequested = new Map(); // requested name -> enriched card
  const unresolved = [];
  const aliasFailures = [];
  const dfcFailures = [];
  const splitFailures = [];
  const typeIndex = options.typeIndex || null;
  const fetchImpl = options.fetchImpl;

  if (!uniqueNames.length) {
    return freeze({
      requested: 0,
      resolved: 0,
      unresolved: freeze([]),
      byRequested,
      aliasFailures: freeze([]),
      dfcFailures: freeze([]),
      splitFailures: freeze([]),
      source: "empty",
    });
  }

  const allowNetwork = options.allowNetwork !== false;
  for (let index = 0; index < uniqueNames.length; index += 75) {
    const chunk = uniqueNames.slice(index, index + 75);
    if (!allowNetwork && !fetchImpl) {
      for (const name of chunk) applyLocalFallback(name, typeIndex, byRequested, unresolved);
      continue;
    }
    try {
      const response = await liveFetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { ...SCRYFALL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: chunk.map((name) => ({ name: scryfallLookupName(name) })),
        }),
      }, {
        fetchImpl,
        minIntervalMs: options.minIntervalMs ?? 100,
        maxRetries: options.maxRetries ?? 2,
        timeoutMs: options.timeoutMs ?? 15000,
      });

      if (!response.ok) {
        for (const name of chunk) applyLocalFallback(name, typeIndex, byRequested, unresolved);
        continue;
      }

      const payload = await response.json();
      const originalByLookup = new Map(chunk.map((name) => [normalized(scryfallLookupName(name)), name]));
      for (const card of payload.data || []) {
        const enriched = cardFromScryfall(card);
        const keys = [
          card.name,
          scryfallLookupName(card.name),
          ...(card.card_faces || []).map((face) => face.name),
        ].filter(Boolean);
        for (const key of keys) {
          byLookup.set(normalized(key), enriched);
        }
      }
      for (const name of chunk) {
        const hit = byLookup.get(normalized(name))
          || byLookup.get(normalized(scryfallLookupName(name)));
        if (hit) {
          byRequested.set(normalized(name), hit);
        } else {
          const notFound = (payload.not_found || []).some((entry) =>
            normalized(entry?.name) === normalized(scryfallLookupName(name)));
          if (notFound || !applyLocalFallback(name, typeIndex, byRequested, unresolved)) {
            if (!unresolved.includes(name)) unresolved.push(name);
            if (/\s\/\/\s/.test(name)) dfcFailures.push(name);
            if (/\s\/\s/.test(name) && !/\s\/\/\s/.test(name)) splitFailures.push(name);
            aliasFailures.push(name);
          }
        }
      }
      // silence unused
      void originalByLookup;
    } catch {
      for (const name of chunk) applyLocalFallback(name, typeIndex, byRequested, unresolved);
    }
  }

  const resolved = [...byRequested.keys()].length;
  return freeze({
    requested: uniqueNames.length,
    resolved,
    unresolved: freeze([...new Set(unresolved)].sort()),
    byRequested,
    aliasFailures: freeze([...new Set(aliasFailures)].sort()),
    dfcFailures: freeze([...new Set(dfcFailures)].sort()),
    splitFailures: freeze([...new Set(splitFailures)].sort()),
    semanticCoverageRate: uniqueNames.length ? Number((resolved / uniqueNames.length).toFixed(3)) : 0,
    source: unresolved.length ? (resolved ? "mixed" : "unresolved") : "complete",
  });
}

function applyLocalFallback(name, typeIndex, byRequested, unresolved) {
  if (!typeIndex) {
    unresolved.push(name);
    return false;
  }
  const local = typeIndex[normalized(name)] || typeIndex[normalized(scryfallLookupName(name))];
  if (!local) {
    unresolved.push(name);
    return false;
  }
  const [canonical, typeLine] = Array.isArray(local) ? local : [local.name, local.typeLine];
  byRequested.set(normalized(name), freeze({
    name: canonical || name,
    typeLine: typeLine || "",
    oracleText: "",
    manaCost: "",
    cmc: 0,
    colorIdentity: freeze([]),
    colors: freeze([]),
    scryfallId: null,
    layout: null,
    enrichmentSource: "type_index_no_oracle",
  }));
  return true;
}

/**
 * Enrich CorpusDeckRecord commanders + rows. Reduces confidence when coverage is poor.
 */
export async function enrichCorpusRecord(record, options = {}) {
  const commanderNames = (record.commanders || []).map((c) => c.name).filter(Boolean);
  const rowNames = (record.rows || []).map((r) => r.name).filter(Boolean);
  const alreadyRich = (record.rows || []).filter((r) => r.oracleText || r.typeLine).length;
  const alreadyRichRate = (record.rows || []).length
    ? alreadyRich / (record.rows || []).length
    : 0;

  // Fixtures / pre-annotated decks: skip network if already sufficiently enriched.
  if (alreadyRichRate >= 0.8 && commanderNames.every((name) => {
    const commander = (record.commanders || []).find((c) => c.name === name);
    return Boolean(commander?.oracleText);
  }) && options.force !== true) {
    return freeze({
      record,
      enrichment: freeze({
        skipped: true,
        reason: "already_enriched",
        semanticCoverageRate: 1,
        commanderResolutionRate: 1,
        requested: commanderNames.length + rowNames.length,
        resolved: commanderNames.length + rowNames.length,
        unresolved: freeze([]),
      }),
      confidenceDiscount: 1,
    });
  }

  const resolution = await resolveCardNames([...commanderNames, ...rowNames], options);
  const commanders = (record.commanders || []).map((commander) => {
    const hit = resolution.byRequested.get(normalized(commander.name));
    if (!hit) {
      return freeze({
        ...commander,
        enrichmentStatus: "unresolved",
      });
    }
    return freeze({
      name: hit.name || commander.name,
      colors: hit.colorIdentity?.length ? [...hit.colorIdentity] : [...(commander.colors || [])],
      oracleText: hit.oracleText || commander.oracleText || "",
      typeLine: hit.typeLine || commander.typeLine || "Legendary Creature",
      manaCost: hit.manaCost || commander.manaCost || "",
      enrichmentStatus: hit.oracleText ? "resolved" : "type_only",
      enrichmentSource: hit.enrichmentSource || "scryfall",
    });
  });

  const rows = (record.rows || []).map((row) => {
    const hit = resolution.byRequested.get(normalized(row.name));
    if (!hit) {
      return freeze({
        ...row,
        enrichmentStatus: "unresolved",
      });
    }
    // Keep pre-annotated Brain fields when present; fill gaps from Scryfall.
    return freeze({
      ...row,
      name: hit.name || row.name,
      typeLine: row.typeLine || hit.typeLine || "",
      oracleText: row.oracleText || hit.oracleText || "",
      manaCost: row.manaCost || hit.manaCost || "",
      cmc: Number.isFinite(row.cmc) && row.cmc > 0 ? row.cmc : (hit.cmc || 0),
      colorIdentity: (row.colorIdentity?.length ? row.colorIdentity : hit.colorIdentity) || [],
      enrichmentStatus: (row.oracleText || hit.oracleText) ? "resolved" : (hit.typeLine ? "type_only" : "unresolved"),
    });
  });

  const commanderResolved = commanders.filter((c) => c.enrichmentStatus === "resolved" || c.oracleText).length;
  const rowResolved = rows.filter((r) => r.enrichmentStatus === "resolved" || r.oracleText || (r.roles?.length && r.mechanics)).length;
  const semanticCoverageRate = rows.length
    ? Number((rowResolved / rows.length).toFixed(3))
    : 0;
  const commanderResolutionRate = commanders.length
    ? Number((commanderResolved / commanders.length).toFixed(3))
    : 0;

  // Poor enrichment → reduced teaching mass (not equal weighting).
  let confidenceDiscount = 1;
  if (semanticCoverageRate < 0.5) confidenceDiscount = 0.35;
  else if (semanticCoverageRate < 0.75) confidenceDiscount = 0.6;
  else if (semanticCoverageRate < 0.9) confidenceDiscount = 0.85;
  if (commanderResolutionRate < 1) confidenceDiscount = Math.min(confidenceDiscount, 0.7);

  const enriched = {
    ...record,
    commanders,
    rows,
    evidenceQualityHints: {
      ...(record.evidenceQualityHints || {}),
      semanticCoverageRate,
      commanderResolutionRate,
      confidenceDiscount,
      unresolvedCards: resolution.unresolved.slice(0, 40),
    },
  };

  return freeze({
    record: enriched,
    enrichment: freeze({
      skipped: false,
      requested: resolution.requested,
      resolved: resolution.resolved,
      unresolved: resolution.unresolved,
      aliasFailures: resolution.aliasFailures,
      dfcFailures: resolution.dfcFailures,
      splitFailures: resolution.splitFailures,
      semanticCoverageRate,
      commanderResolutionRate,
      source: resolution.source,
    }),
    confidenceDiscount,
  });
}

export async function enrichCorpusRecords(records = [], options = {}) {
  const out = [];
  const aggregate = {
    requested: 0,
    resolved: 0,
    unresolved: new Set(),
    aliasFailures: new Set(),
    dfcFailures: new Set(),
    splitFailures: new Set(),
    decks: records.length,
    decksFullyResolved: 0,
    decksDiscounted: 0,
  };

  // Shared name cache across decks — resolve once, apply per deck.
  const allNames = [...new Set(records.flatMap((record) => [
    ...(record.commanders || []).map((c) => c.name),
    ...(record.rows || []).map((r) => r.name),
  ]).filter(Boolean))];
  const shared = await resolveCardNames(allNames, options);

  for (const record of records) {
    const applied = applySharedResolution(record, shared, options);
    out.push(applied.record);
    aggregate.requested += applied.enrichment.requested;
    aggregate.resolved += applied.enrichment.resolved;
    for (const name of applied.enrichment.unresolved || []) aggregate.unresolved.add(name);
    for (const name of applied.enrichment.aliasFailures || []) aggregate.aliasFailures.add(name);
    for (const name of applied.enrichment.dfcFailures || []) aggregate.dfcFailures.add(name);
    for (const name of applied.enrichment.splitFailures || []) aggregate.splitFailures.add(name);
    if (applied.enrichment.semanticCoverageRate >= 0.95 && applied.enrichment.commanderResolutionRate >= 1) {
      aggregate.decksFullyResolved += 1;
    }
    if (applied.confidenceDiscount < 1) aggregate.decksDiscounted += 1;
  }

  const semanticCoverageRate = aggregate.requested
    ? Number((aggregate.resolved / aggregate.requested).toFixed(3))
    : 0;

  return freeze({
    records: freeze(out),
    stats: freeze({
      requestedCards: aggregate.requested,
      resolvedCards: aggregate.resolved,
      unresolvedCards: freeze([...aggregate.unresolved].sort()),
      unresolvedCount: aggregate.unresolved.size,
      aliasFailures: freeze([...aggregate.aliasFailures].sort()),
      dfcFailures: freeze([...aggregate.dfcFailures].sort()),
      splitFailures: freeze([...aggregate.splitFailures].sort()),
      semanticCoverageRate,
      decks: aggregate.decks,
      decksFullyResolved: aggregate.decksFullyResolved,
      decksDiscounted: aggregate.decksDiscounted,
      // Shared batch size — not sum of per-deck re-resolves.
      sharedResolutionRequested: shared.requested,
      sharedResolutionResolved: shared.resolved,
      source: shared.source,
    }),
  });
}

function applySharedResolution(record, shared, options = {}) {
  const commanders = (record.commanders || []).map((commander) => {
    if (commander.oracleText && options.force !== true) {
      return freeze({ ...commander, enrichmentStatus: "resolved" });
    }
    const hit = shared.byRequested.get(normalized(commander.name));
    if (!hit) return freeze({ ...commander, enrichmentStatus: "unresolved" });
    return freeze({
      name: hit.name || commander.name,
      colors: hit.colorIdentity?.length ? [...hit.colorIdentity] : [...(commander.colors || [])],
      oracleText: hit.oracleText || commander.oracleText || "",
      typeLine: hit.typeLine || commander.typeLine || "Legendary Creature",
      manaCost: hit.manaCost || commander.manaCost || "",
      enrichmentStatus: hit.oracleText ? "resolved" : (hit.typeLine ? "type_only" : "unresolved"),
      enrichmentSource: hit.enrichmentSource || "scryfall",
    });
  });

  const rows = (record.rows || []).map((row) => {
    if ((row.oracleText || (row.roles?.length && row.mechanics)) && options.force !== true) {
      return freeze({ ...row, enrichmentStatus: row.oracleText ? "resolved" : "preannotated" });
    }
    const hit = shared.byRequested.get(normalized(row.name));
    if (!hit) return freeze({ ...row, enrichmentStatus: "unresolved" });
    return freeze({
      ...row,
      name: hit.name || row.name,
      typeLine: row.typeLine || hit.typeLine || "",
      oracleText: row.oracleText || hit.oracleText || "",
      manaCost: row.manaCost || hit.manaCost || "",
      cmc: Number.isFinite(row.cmc) && row.cmc > 0 ? row.cmc : (hit.cmc || 0),
      colorIdentity: (row.colorIdentity?.length ? row.colorIdentity : hit.colorIdentity) || [],
      enrichmentStatus: (row.oracleText || hit.oracleText) ? "resolved" : (hit.typeLine ? "type_only" : "unresolved"),
    });
  });

  const commanderResolved = commanders.filter((c) => c.enrichmentStatus === "resolved" || c.oracleText).length;
  const rowResolved = rows.filter((r) =>
    r.enrichmentStatus === "resolved"
    || r.enrichmentStatus === "preannotated"
    || r.oracleText
    || (r.roles?.length && r.mechanics)).length;
  const semanticCoverageRate = rows.length ? Number((rowResolved / rows.length).toFixed(3)) : 0;
  const commanderResolutionRate = commanders.length
    ? Number((commanderResolved / commanders.length).toFixed(3))
    : 0;

  let confidenceDiscount = 1;
  if (semanticCoverageRate < 0.5) confidenceDiscount = 0.35;
  else if (semanticCoverageRate < 0.75) confidenceDiscount = 0.6;
  else if (semanticCoverageRate < 0.9) confidenceDiscount = 0.85;
  if (commanderResolutionRate < 1) confidenceDiscount = Math.min(confidenceDiscount, 0.7);

  const unresolved = [
    ...commanders.filter((c) => c.enrichmentStatus === "unresolved").map((c) => c.name),
    ...rows.filter((r) => r.enrichmentStatus === "unresolved").map((r) => r.name),
  ];

  return freeze({
    record: freeze({
      ...record,
      commanders: freeze(commanders),
      rows: freeze(rows),
      evidenceQualityHints: freeze({
        ...(record.evidenceQualityHints || {}),
        semanticCoverageRate,
        commanderResolutionRate,
        confidenceDiscount,
        unresolvedCards: freeze(unresolved.slice(0, 40)),
      }),
    }),
    enrichment: freeze({
      requested: commanders.length + rows.length,
      resolved: commanderResolved + rowResolved,
      unresolved: freeze(unresolved),
      aliasFailures: freeze([]),
      dfcFailures: freeze([]),
      splitFailures: freeze([]),
      semanticCoverageRate,
      commanderResolutionRate,
      source: shared.source,
    }),
    confidenceDiscount,
  });
}
