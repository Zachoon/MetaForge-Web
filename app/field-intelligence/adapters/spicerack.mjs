// =============================================================================
// Field Intelligence — Spicerack Public Decklist Database adapter (Tier 1)
// =============================================================================
// Documented public corpus route:
//   GET https://api.spicerack.gg/api/export-decklists/
// Docs: https://docs.spicerack.gg/api-reference/public-decklist-database
//
// Important: the page is titled "Public Decklist Database API", but the
// official example request includes `X-API-Key: sk_*`. Authenticated Magic
// Events endpoints are NOT the preferred corpus route.
// =============================================================================

import { createCorpusDeckRecord } from "../corpus-schema.mjs";
import { calculateCompetitiveEvidenceWeight } from "../evidence-quality.mjs";
import { detectImportSource, parseTournamentDeckText } from "../decklist-parse.mjs";
import { liveFetch } from "../live-http.mjs";
import { DEFAULT_LIVE_SAMPLE, selectContrastStandings, resolveTopCutStatus } from "../live-sample.mjs";

const freeze = (value) => Object.freeze(value);
const SPICERACK_EXPORT = "https://api.spicerack.gg/api/export-decklists/";

export const SPICERACK_ATTRIBUTION = Object.freeze({
  name: "Spicerack",
  url: "https://spicerack.gg",
  docs: "https://docs.spicerack.gg/api-reference/public-decklist-database",
  required: true,
});

export const SPICERACK_DOC_BLOCKER = Object.freeze({
  endpoint: SPICERACK_EXPORT,
  claimedPublic: true,
  officialExampleRequiresApiKey: true,
  exampleHeader: "X-API-Key: sk_*",
  preferredRoute: "public_decklist_database_export",
  notPreferred: "authenticated_magic_events_decklist_endpoints",
  formats: freeze(["COMMANDER2"]),
  note: "Docs describe public access to completed tournament decklists/results, but the documented curl example sends an API key. Treat SPICERACK_API_KEY as required until Spicerack confirms unauthenticated access.",
});

/**
 * Fetch completed Commander tournaments from Spicerack's Public Decklist Database.
 */
export async function fetchSpicerackTournaments(options = {}) {
  const apiKey = options.apiKey || process.env.SPICERACK_API_KEY;
  const params = new URLSearchParams({
    num_days: String(options.numDays ?? DEFAULT_LIVE_SAMPLE.lastDays),
    event_format: options.eventFormat || "COMMANDER2",
    decklist_as_text: options.decklistAsText === false ? "false" : "true",
  });
  if (Number.isFinite(options.organizationId)) {
    params.set("organization_id", String(options.organizationId));
  }

  const headers = { Accept: "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  if (!apiKey && options.requireKey !== false) {
    // Soft gate: still attempt if explicitly allowUnauthenticated, else actionable.
    if (!options.allowUnauthenticated) {
      return freeze({
        ok: false,
        status: "needs_credentials",
        reason: "missing_SPICERACK_API_KEY",
        actionable: freeze({
          summary: "Spicerack Public Decklist Database docs show X-API-Key in the official example. Set SPICERACK_API_KEY locally (do not commit), or pass allowUnauthenticated:true to probe.",
          docs: SPICERACK_ATTRIBUTION.docs,
          blocker: SPICERACK_DOC_BLOCKER,
        }),
        tournaments: freeze([]),
        attribution: SPICERACK_ATTRIBUTION,
        docBlocker: SPICERACK_DOC_BLOCKER,
      });
    }
  }

  try {
    const response = await liveFetch(`${SPICERACK_EXPORT}?${params}`, { headers }, {
      fetchImpl: options.fetchImpl,
      minIntervalMs: options.minIntervalMs,
      maxRetries: options.maxRetries,
    });

    if (!response.ok) {
      const needsAuth = response.status === 401 || response.status === 403;
      return freeze({
        ok: false,
        status: needsAuth ? "auth_required" : "http_error",
        reason: `http_${response.status}`,
        actionable: freeze({
          summary: needsAuth
            ? "Spicerack rejected unauthenticated/invalid access to export-decklists. Obtain an API key and set SPICERACK_API_KEY."
            : `Spicerack returned HTTP ${response.status}.`,
          docs: SPICERACK_ATTRIBUTION.docs,
          blocker: SPICERACK_DOC_BLOCKER,
        }),
        tournaments: freeze([]),
        attribution: SPICERACK_ATTRIBUTION,
        docBlocker: SPICERACK_DOC_BLOCKER,
      });
    }

    const payload = await response.json();
    let tournaments = Array.isArray(payload) ? payload : payload?.results || [];
    const participantMin = options.participantMin ?? DEFAULT_LIVE_SAMPLE.participantMin;
    tournaments = tournaments.filter((event) => {
      const size = Number(event.players) || (event.standings || []).length || 0;
      return size >= participantMin;
    });
    if (Number.isFinite(options.maxEvents)) {
      tournaments = tournaments.slice(0, options.maxEvents);
    }

    return freeze({
      ok: true,
      status: "ok",
      reason: null,
      actionable: null,
      tournaments: freeze(tournaments),
      attribution: SPICERACK_ATTRIBUTION,
      usedApiKey: Boolean(apiKey),
      docBlocker: SPICERACK_DOC_BLOCKER,
    });
  } catch (error) {
    return freeze({
      ok: false,
      status: "network_error",
      reason: error.message || "fetch_failed",
      actionable: freeze({
        summary: "Network failure reaching Spicerack export-decklists. Retry later; do not fall back to scraping authenticated Magic Events HTML.",
        docs: SPICERACK_ATTRIBUTION.docs,
        blocker: SPICERACK_DOC_BLOCKER,
      }),
      tournaments: freeze([]),
      attribution: SPICERACK_ATTRIBUTION,
      docBlocker: SPICERACK_DOC_BLOCKER,
    });
  }
}

function isoFromUnix(seconds) {
  if (!Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString().slice(0, 10);
}

export function normalizeSpicerackTournament(tournament = {}, options = {}) {
  const eventId = tournament.TID || tournament.tid || tournament.id;
  const eventSize = Number(tournament.players) || (tournament.standings || []).length || null;
  const topCutSize = Number(tournament.topCut) || 0;
  const observedAt = isoFromUnix(tournament.startDate);
  const rawStandings = [...(tournament.standings || [])];
  const standings = options.selectContrast === false
    ? rawStandings
    : selectContrastStandings(rawStandings, {
      topCutSize,
      topCutSlots: options.topCutSlots,
      lowerComparisonSlots: options.lowerComparisonSlots,
      maxDecksPerEvent: options.maxDecksPerEvent ?? DEFAULT_LIVE_SAMPLE.maxDecksPerEvent,
    });

  const records = [];
  const skippedExternal = [];

  for (let i = 0; i < standings.length; i += 1) {
    const standing = standings[i];
    const placement = Number.isFinite(standing.standing) ? standing.standing : i + 1;
    const text = standing.decklist_text || "";
    const url = typeof standing.decklist === "string" && /^https?:/i.test(standing.decklist)
      ? standing.decklist
      : null;

    let commanders = [];
    let rows = [];
    let deckText = text;
    let importSource = null;

    if (text) {
      const parsed = parseTournamentDeckText(text);
      commanders = parsed.commanders;
      rows = parsed.rows;
      deckText = parsed.deckText;
      importSource = parsed.importSource || "plaintext";
    } else if (url) {
      importSource = detectImportSource(url);
      skippedExternal.push(freeze({
        eventId: String(eventId),
        placement,
        playerKey: standing.name || `standing-${i}`,
        url,
        importSource,
        reason: "moxfield_or_external_url_not_auto_fetched",
      }));
      if (!options.includeExternalUrlStubs) continue;
    } else {
      continue;
    }

    if (!rows.length && !options.allowEmptyDecklists) continue;

    const matchRecord = freeze({
      wins: (Number(standing.winsSwiss) || 0) + (Number(standing.winsBracket) || 0),
      losses: (Number(standing.lossesSwiss) || 0) + (Number(standing.lossesBracket) || 0),
      draws: Number(standing.draws) || 0,
      winsSwiss: Number.isFinite(standing.winsSwiss) ? standing.winsSwiss : null,
      lossesSwiss: Number.isFinite(standing.lossesSwiss) ? standing.lossesSwiss : null,
      winsBracket: Number.isFinite(standing.winsBracket) ? standing.winsBracket : null,
      lossesBracket: Number.isFinite(standing.lossesBracket) ? standing.lossesBracket : null,
    });
    const topCut = resolveTopCutStatus(placement, topCutSize);

    const draft = {
      id: `spicerack:${eventId}:${standing.name || i}:${placement}`,
      commanders,
      rows,
      deckText,
      format: "Commander",
      sourceType: "spicerack_tournament",
      sourceKey: String(standing.name || i),
      sourceUri: url || tournament.bracketUrl || null,
      observedAt,
      evidenceTier: "tournament_performance",
      eventId: String(eventId),
      eventName: tournament.tournamentName || null,
      eventSize,
      placement,
      topCut,
      topCutSize: topCutSize > 0 ? topCutSize : null,
      matchRecord,
      tournamentSource: "spicerack",
      authorKey: standing.name ? `spicerack-player:${standing.name}` : null,
      deckImportSource: importSource,
      selectionRole: standing._selectedAs || null,
      provenance: {
        adapter: "spicerack-public-decklist-database",
        attribution: SPICERACK_ATTRIBUTION,
        note: url && !text ? "decklist_was_external_url" : null,
        tournamentId: String(eventId),
        eventDate: observedAt,
        eventSize,
        placement,
        topCut,
        matchRecord,
        deckImportSource: importSource,
      },
    };
    const weight = calculateCompetitiveEvidenceWeight(draft, {
      independentEventCount: options.independentEventCount || 1,
    });
    records.push(createCorpusDeckRecord({ ...draft, performanceWeight: weight.weight }));
  }

  return freeze({
    eventId: String(eventId || "unknown"),
    eventName: tournament.tournamentName || null,
    eventSize,
    topCutSize,
    observedAt,
    records: freeze(records),
    skippedExternal: freeze(skippedExternal),
    attribution: SPICERACK_ATTRIBUTION,
  });
}

export function normalizeSpicerackCorpus(tournaments = [], options = {}) {
  const events = [];
  const records = [];
  const skippedExternal = [];
  for (const tournament of tournaments) {
    const normalized = normalizeSpicerackTournament(tournament, options);
    events.push(freeze({
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      eventSize: normalized.eventSize,
      observedAt: normalized.observedAt,
      deckCount: normalized.records.length,
    }));
    records.push(...normalized.records);
    skippedExternal.push(...normalized.skippedExternal);
  }
  return freeze({
    source: "spicerack",
    events: freeze(events),
    records: freeze(records),
    skippedExternal: freeze(skippedExternal),
    attribution: SPICERACK_ATTRIBUTION,
    docBlocker: SPICERACK_DOC_BLOCKER,
  });
}
