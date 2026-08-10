// =============================================================================
// Field Intelligence — TopDeck.gg Tournaments V2 adapter (Tier 1)
// =============================================================================
// Spec: https://topdeck.gg/api/docs  (POST /v2/tournaments)
// Auth: Authorization header = API key from Developer Portal.
// Missing key => actionable status, not a hard pipeline failure.
// Never stores or logs the API key.
// Attribution to TopDeck.gg is required.
// =============================================================================

import { createCorpusDeckRecord } from "../corpus-schema.mjs";
import { calculateCompetitiveEvidenceWeight } from "../evidence-quality.mjs";
import {
  commandersFromDeckObj,
  deckObjImportSource,
  detectImportSource,
  parseTournamentDeckText,
  rowsFromDeckObj,
} from "../decklist-parse.mjs";
import { liveFetch } from "../live-http.mjs";
import { DEFAULT_LIVE_SAMPLE, selectContrastStandings, resolveTopCutStatus } from "../live-sample.mjs";

const freeze = (value) => Object.freeze(value);
const TOPDECK_BASE = "https://topdeck.gg/api";

export const TOPDECK_ATTRIBUTION = Object.freeze({
  name: "TopDeck.gg",
  url: "https://topdeck.gg",
  docs: "https://topdeck.gg/api/docs",
  developerPortal: "https://topdeck.gg",
  required: true,
});

export const TOPDECK_MISSING_KEY = Object.freeze({
  ok: false,
  status: "needs_credentials",
  reason: "missing_TOPDECK_API_KEY",
  actionable: freeze({
    summary: "Create a free TopDeck API key in the Developer Portal, then set TOPDECK_API_KEY in your local environment (do not commit it).",
    powershell: '$env:TOPDECK_API_KEY="YOUR_KEY_HERE"',
    cmd: "set TOPDECK_API_KEY=YOUR_KEY_HERE",
    then: "npm run report:field-intelligence:live",
    docs: TOPDECK_ATTRIBUTION.docs,
  }),
  tournaments: freeze([]),
  attribution: TOPDECK_ATTRIBUTION,
});

/**
 * Fetch completed EDH tournaments via TopDeck Tournaments V2.
 */
export async function fetchTopDeckTournaments(options = {}) {
  const apiKey = options.apiKey || process.env.TOPDECK_API_KEY;
  if (!apiKey) return TOPDECK_MISSING_KEY;

  const body = {
    game: options.game || "Magic: The Gathering",
    format: options.format || "EDH",
    last: options.lastDays ?? DEFAULT_LIVE_SAMPLE.lastDays,
    participantMin: options.participantMin ?? DEFAULT_LIVE_SAMPLE.participantMin,
    columns: options.columns || [
      "name", "id", "decklist", "wins", "draws", "losses",
      "winsSwiss", "lossesSwiss", "winsBracket", "lossesBracket", "winRate",
    ],
  };
  if (Number.isFinite(options.participantMax)) body.participantMax = options.participantMax;
  if (Number.isFinite(options.start)) body.start = options.start;
  if (Number.isFinite(options.end)) body.end = options.end;

  try {
    const response = await liveFetch(`${TOPDECK_BASE}/v2/tournaments`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }, {
      fetchImpl: options.fetchImpl,
      minIntervalMs: options.minIntervalMs,
      maxRetries: options.maxRetries,
    });

    if (!response.ok) {
      return freeze({
        ok: false,
        status: response.status === 401 || response.status === 403 ? "auth_failed" : "http_error",
        reason: `http_${response.status}`,
        actionable: response.status === 401 || response.status === 403
          ? freeze({ summary: "TopDeck rejected the API key. Rotate/recreate the key in the Developer Portal." })
          : freeze({ summary: `TopDeck returned HTTP ${response.status}. Retry later or narrow the date window.` }),
        tournaments: freeze([]),
        attribution: TOPDECK_ATTRIBUTION,
      });
    }

    const payload = await response.json();
    let tournaments = Array.isArray(payload) ? payload : payload?.tournaments || [];
    if (Number.isFinite(options.maxEvents)) {
      tournaments = tournaments.slice(0, options.maxEvents);
    }
    return freeze({
      ok: true,
      status: "ok",
      reason: null,
      actionable: null,
      tournaments: freeze(tournaments),
      attribution: TOPDECK_ATTRIBUTION,
      requestEcho: freeze({
        game: body.game,
        format: body.format,
        last: body.last,
        participantMin: body.participantMin,
        // Never echo Authorization.
      }),
    });
  } catch (error) {
    return freeze({
      ok: false,
      status: "network_error",
      reason: error.message || "fetch_failed",
      actionable: freeze({ summary: "Network failure talking to TopDeck. Check connectivity and retry." }),
      tournaments: freeze([]),
      attribution: TOPDECK_ATTRIBUTION,
    });
  }
}

function standingPlacement(standing, index) {
  if (Number.isFinite(standing.standing)) return standing.standing;
  if (Number.isFinite(standing.placement)) return standing.placement;
  return index + 1;
}

function isoFromUnix(seconds) {
  if (!Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString().slice(0, 10);
}

function resolveDeckPayload(standing = {}) {
  const deckObj = standing.deckObj || standing.decklistObj || null;
  let commanders = commandersFromDeckObj(deckObj || {});
  let rows = rowsFromDeckObj(deckObj || {});
  let deckText = typeof standing.decklist === "string" ? standing.decklist : "";
  let externalUrl = null;
  let importSource = deckObj ? deckObjImportSource(deckObj) : null;

  if (!rows.length && deckText) {
    const parsed = parseTournamentDeckText(deckText);
    if (parsed.needsExternalFetch) {
      externalUrl = parsed.externalUrl;
      importSource = parsed.importSource || detectImportSource(deckText);
      commanders = standing.leader
        ? freeze(String(standing.leader).split(/\s*\/\s*/).map((name) => freeze({ name: name.trim() })))
        : commanders;
    } else {
      commanders = parsed.commanders.length ? parsed.commanders : commanders;
      rows = parsed.rows;
      deckText = parsed.deckText;
      importSource = parsed.importSource || "plaintext";
    }
  }

  if (!commanders.length && standing.leader) {
    commanders = freeze(String(standing.leader).split(/\s*\/\s*/).map((name) => freeze({ name: name.trim() })));
  }

  return { commanders, rows, deckText, externalUrl, importSource, deckObj };
}

/**
 * Normalize one TopDeck tournament into CorpusDeckRecords with contrast sampling.
 */
export function normalizeTopDeckTournament(tournament = {}, options = {}) {
  const eventId = tournament.TID || tournament.tid || tournament.id;
  const eventSize = Number(tournament.players)
    || Number(tournament.participantCount)
    || (tournament.standings || []).length
    || null;
  const topCutSize = Number(tournament.topCut) || 0;
  const observedAt = isoFromUnix(Number(tournament.startDate));
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
    const placement = standingPlacement(standing, i);
    const resolved = resolveDeckPayload(standing);

    if (resolved.externalUrl) {
      skippedExternal.push(freeze({
        eventId: String(eventId),
        placement,
        playerKey: standing.id || standing.name || `standing-${i}`,
        url: resolved.externalUrl,
        importSource: resolved.importSource,
        reason: "external_deck_url_not_auto_fetched",
      }));
      if (!options.includeExternalUrlStubs) continue;
    }
    if (!resolved.rows.length && !options.allowEmptyDecklists) continue;

    const matchRecord = freeze({
      wins: Number(standing.wins) || ((Number(standing.winsSwiss) || 0) + (Number(standing.winsBracket) || 0)),
      losses: Number(standing.losses) || ((Number(standing.lossesSwiss) || 0) + (Number(standing.lossesBracket) || 0)),
      draws: Number(standing.draws) || 0,
      winsSwiss: Number.isFinite(standing.winsSwiss) ? standing.winsSwiss : null,
      lossesSwiss: Number.isFinite(standing.lossesSwiss) ? standing.lossesSwiss : null,
      winsBracket: Number.isFinite(standing.winsBracket) ? standing.winsBracket : null,
      lossesBracket: Number.isFinite(standing.lossesBracket) ? standing.lossesBracket : null,
      winRate: Number.isFinite(standing.winRate) ? standing.winRate : null,
    });

    const topCut = resolveTopCutStatus(placement, topCutSize);
    const draft = {
      id: `topdeck:${eventId}:${standing.id || standing.name || i}:${placement}`,
      commanders: resolved.commanders,
      rows: resolved.rows,
      deckText: resolved.deckText,
      format: tournament.format === "EDH" ? "Commander" : (tournament.format || "Commander"),
      sourceType: "topdeck_tournament",
      sourceKey: String(standing.id || standing.name || i),
      sourceUri: resolved.externalUrl || `https://topdeck.gg/tournament/${eventId}`,
      observedAt,
      evidenceTier: "tournament_performance",
      eventId: String(eventId),
      eventName: tournament.tournamentName || tournament.name || null,
      eventSize,
      placement,
      topCut,
      topCutSize: topCutSize > 0 ? topCutSize : null,
      matchRecord,
      tournamentSource: "topdeck",
      authorKey: standing.id ? `topdeck-player:${standing.id}` : null,
      deckImportSource: resolved.importSource,
      selectionRole: standing._selectedAs || null,
      provenance: {
        adapter: "topdeck-tournaments-v2",
        attribution: TOPDECK_ATTRIBUTION,
        note: resolved.externalUrl ? "decklist_was_external_url" : null,
        tournamentId: String(eventId),
        eventDate: observedAt,
        eventSize,
        placement,
        topCut,
        matchRecord,
        deckImportSource: resolved.importSource,
        hasDeckObj: Boolean(resolved.deckObj),
      },
    };
    const weight = calculateCompetitiveEvidenceWeight(draft, {
      independentEventCount: options.independentEventCount || 1,
    });
    records.push(createCorpusDeckRecord({ ...draft, performanceWeight: weight.weight }));
  }

  return freeze({
    eventId: String(eventId || "unknown"),
    eventName: tournament.tournamentName || tournament.name || null,
    eventSize,
    topCutSize,
    observedAt,
    records: freeze(records),
    skippedExternal: freeze(skippedExternal),
    attribution: TOPDECK_ATTRIBUTION,
  });
}

export function normalizeTopDeckCorpus(tournaments = [], options = {}) {
  const events = [];
  const records = [];
  const skippedExternal = [];
  for (const tournament of tournaments) {
    const normalized = normalizeTopDeckTournament(tournament, options);
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
    source: "topdeck",
    events: freeze(events),
    records: freeze(records),
    skippedExternal: freeze(skippedExternal),
    attribution: TOPDECK_ATTRIBUTION,
  });
}
