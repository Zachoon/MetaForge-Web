// Server-held storage for a single Forge generation's authoritative
// context (the tournament's ranked candidates, the selected Masterwork,
// and the exact verified card pool it was built from). Introduced so the
// browser no longer has to round-trip this data (measured at ~362KB for
// a real Commander generation) just to run the Testing Anvil one-slot
// lab — the client now holds only an opaque generationId, and every
// later one-slot request re-fetches the authoritative context here.
//
// D1 was chosen over KV or a Durable Object: the first Testing Anvil
// request can follow generation within seconds, sometimes from a
// different colo, and KV's eventual consistency (~60s worst case cross-
// region propagation) risks a spurious "generation not found" right
// after a successful generation. D1 already gives read-after-write
// consistency and is the datastore everything else in this app already
// uses. A Durable Object would add real coordination machinery this
// doesn't need — this is a write-once, read-many, owned blob with an
// expiry, not multi-writer coordinated state.
//
// expires_at is stored as an epoch-millisecond INTEGER rather than a
// SQLite datetime string specifically so expiry can be checked with a
// plain JS Date.now() comparison — no datetime()/CURRENT_TIMESTAMP
// format mismatch to reconcile (see api-hardening.ts's comment on that
// exact class of bug) and no second round trip to ask SQLite to do the
// comparison itself.
//
// TTL is 24 hours, cleaned up by the same hourly scheduled() cron that
// already prunes api_rate_limits (see cleanupExpiredRateLimits). This
// isn't a new restriction on players: the practical (pool-backed)
// one-slot lab was already ephemeral, tab-scoped client state before
// this endpoint existed (SavedFamily, the type actually persisted to
// the Bench, never carried candidates/cardPool) — 24 hours comfortably
// covers a real single sitting, and expiry falls back to the exact same
// "no live engine context" theoretical-only degradation the client
// already handles for restored saved decks.
export const GENERATION_SCHEMA_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;

// Comfortably below D1's hard per-value ceiling (the same class of
// SQLITE_TOOBIG that previously discarded finished guest claims). Labs
// only need rows + pool + forgeInput — construction forensics and
// structural dumps are rebuilt on demand elsewhere and must not be the
// reason a finished Masterwork never reaches the browser.
const MAX_GENERATION_PAYLOAD_BYTES = 900_000;
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

// Diagnostic / forensic blobs attached during construction. One-slot and
// multi-refill only read id/score/rows (and row identity fields) plus
// cardPool + forgeInput — see forge-one-slot.ts / forge-multi-refill.ts.
const HEAVY_MASTERWORK_KEYS = new Set([
  "weakSlotForensics",
  "weakSlotRepair",
  "recoveryDiagnostics",
  "slotJustification",
  "slotJustificationLedger",
  "packagePlan",
  "constructionTrace",
  "structuralAnalysis",
  "forensics",
  "methodology",
  "laboratory",
  "reasoning",
  "recommendationRecord",
  "powerAudit",
  "unusedEnginePartners",
]);

export interface StoredGenerationPayload {
  selected: any;
  candidates: any[];
  cardPool: any[];
  options: { format: string; strategy: string; target: number };
  // Sanitized construction inputs required to refill user-created gaps
  // without asking the browser to resend engine context. `cards` is kept
  // separately in cardPool so this remains small and non-duplicative.
  forgeInput?: Record<string, unknown>;
}

interface GenerationStoreEnv {
  DB: D1Database;
}

function compactRow(row: any) {
  if (!row || typeof row !== "object") return row;
  return {
    quantity: row.quantity,
    name: row.name,
    roles: row.roles || [],
    cmc: row.cmc ?? 0,
    colorPips: row.colorPips,
    colorIdentity: row.colorIdentity,
    typeLine: row.typeLine,
    oracleText: row.oracleText,
    keywords: row.keywords,
    rarity: row.rarity,
    prices: row.prices,
  };
}

function compactMasterwork(deck: any) {
  if (!deck || typeof deck !== "object") return deck;
  const compact: Record<string, unknown> = {
    id: deck.id,
    score: deck.score,
    rows: Array.isArray(deck.rows) ? deck.rows.map(compactRow) : [],
  };
  // Preserve a few lightweight ranking/display fields when present; drop
  // every known forensic blob so D1 never absorbs construction dumps.
  for (const key of ["name", "label", "path", "recoveryStage", "powerSignal", "manaConsistency", "deckText"]) {
    if (key in deck) compact[key] = deck[key];
  }
  for (const key of Object.keys(deck)) {
    if (HEAVY_MASTERWORK_KEYS.has(key)) continue;
    if (key in compact) continue;
    // Keep unknown small scalars; skip nested objects/arrays that were
    // not explicitly allowlisted above (they are the usual size bombs).
    const value = deck[key];
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      compact[key] = value;
    }
  }
  return compact;
}

export function compactGenerationPayload(payload: StoredGenerationPayload): StoredGenerationPayload {
  return {
    selected: compactMasterwork(payload.selected),
    candidates: Array.isArray(payload.candidates) ? payload.candidates.map(compactMasterwork) : [],
    cardPool: Array.isArray(payload.cardPool) ? payload.cardPool : [],
    options: payload.options,
    ...(payload.forgeInput ? { forgeInput: payload.forgeInput } : {}),
  };
}

// Browser-facing report: keep everything the masterworks picker and
// workbench dereference on first paint, drop the multi-megabyte dumps
// (structuralAnalysis ~0.7–2MB, forensics) that the client already
// re-fetches via /api/forge/structural-analyze. Live Atraxa Superfriends
// measurements: full response ~3.8MB, without structuralAnalysis ~2.2MB,
// client-slim report alone well under 500KB.
const CLIENT_REPORT_KEYS = [
  // Identity — client + e2e contracts key off engine name to distinguish
  // import vs native construction without re-fetching the full report.
  "engine",
  "selected",
  "candidates",
  "tournament",
  "practicalTiebreak",
  "reasoning",
  "laboratory",
  "powerSignal",
  "powerAudit",
  "recommendationRecord",
  "manaConsistency",
  "unusedEnginePartners",
  "methodology",
  "blueprintIntent",
  // Every deviation from the player's imported list (diffImportedChanges in
  // native-masterwork-engine.mjs) - small ({added: string[], trimmed:
  // {name,cut}[]}), but without it the client's revision-comparison stage
  // only ever sees the one-slot lab's single swap and silently drops every
  // other real change the Forge made while completing the list.
  "changes",
] as const;

function compactClientMasterwork(deck: any) {
  if (!deck || typeof deck !== "object") return deck;
  const row = (entry: any) => ({
    quantity: entry?.quantity,
    name: entry?.name,
    roles: entry?.roles || [],
    cmc: entry?.cmc ?? 0,
    colorPips: entry?.colorPips,
    colorIdentity: entry?.colorIdentity,
    typeLine: entry?.typeLine,
  });
  return {
    id: deck.id,
    score: deck.score,
    name: deck.name,
    label: deck.label,
    path: deck.path,
    deckText: deck.deckText,
    evaluation: deck.evaluation,
    tournament: deck.tournament,
    recoveryStage: deck.recoveryStage,
    powerSignal: deck.powerSignal,
    manaConsistency: deck.manaConsistency,
    rows: Array.isArray(deck.rows) ? deck.rows.map(row) : [],
  };
}

export function buildClientNativeReport(nativeReport: any) {
  if (!nativeReport || typeof nativeReport !== "object") return nativeReport;
  const compact: Record<string, unknown> = {};
  for (const key of CLIENT_REPORT_KEYS) {
    if (!(key in nativeReport)) continue;
    if (key === "selected") compact.selected = compactClientMasterwork(nativeReport.selected);
    else if (key === "candidates") {
      compact.candidates = Array.isArray(nativeReport.candidates)
        ? nativeReport.candidates.map(compactClientMasterwork)
        : [];
    } else compact[key] = nativeReport[key];
  }
  return compact;
}

function logPersistEvent(event: Record<string, unknown>) {
  console.log(JSON.stringify({ event: "forge_generation_persist", ...event }));
}

// Returns a generationId on success, or null when persistence cannot
// complete. Callers MUST treat null as "deck is still valid; labs that
// need generationId degrade" — never as a construction failure. Guest
// claim previously taught us that D1 size limits discarding a finished
// build is worse than a missing opaque id.
export async function storeGeneration(
  env: GenerationStoreEnv,
  userKey: string,
  payload: StoredGenerationPayload,
): Promise<string | null> {
  const compact = compactGenerationPayload(payload);
  const payloadJson = JSON.stringify(compact);
  const payloadBytes = byteLength(payloadJson);
  if (payloadBytes > MAX_GENERATION_PAYLOAD_BYTES) {
    logPersistEvent({
      outcome: "payload_too_large",
      payload_bytes: payloadBytes,
      ceiling: MAX_GENERATION_PAYLOAD_BYTES,
      candidate_count: compact.candidates?.length ?? 0,
      card_pool_count: compact.cardPool?.length ?? 0,
    });
    return null;
  }

  const generationId = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO forge_generations (generation_id, user_key, schema_version, payload_json, created_at, expires_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    )
      .bind(generationId, userKey, GENERATION_SCHEMA_VERSION, payloadJson, Date.now() + TTL_MS)
      .run();
    logPersistEvent({
      outcome: "success",
      payload_bytes: payloadBytes,
      candidate_count: compact.candidates?.length ?? 0,
      card_pool_count: compact.cardPool?.length ?? 0,
    });
    return generationId;
  } catch (error) {
    logPersistEvent({
      outcome: "insert_failed",
      payload_bytes: payloadBytes,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error("storeGeneration failed", error);
    return null;
  }
}

export type LoadGenerationResult =
  | { ok: true; payload: StoredGenerationPayload }
  | { ok: false; reason: "missing" | "expired" | "not-owned" | "incompatible-schema" };

export async function loadGeneration(
  env: GenerationStoreEnv,
  userKey: string,
  generationId: string,
): Promise<LoadGenerationResult> {
  const row = await env.DB.prepare(
    `SELECT user_key, schema_version, payload_json, expires_at FROM forge_generations WHERE generation_id = ?`,
  )
    .bind(generationId)
    .first<{ user_key: string; schema_version: number; payload_json: string; expires_at: number }>();
  if (!row) return { ok: false, reason: "missing" };
  // Ownership is checked before expiry so a guess against another
  // player's generationId never distinguishes "not yours" from "expired"
  // via timing or response shape — both real cases fold into the same
  // sanitized failure at the call site regardless.
  if (row.user_key !== userKey) return { ok: false, reason: "not-owned" };
  if (row.schema_version !== GENERATION_SCHEMA_VERSION) return { ok: false, reason: "incompatible-schema" };
  if (Number(row.expires_at) < Date.now()) return { ok: false, reason: "expired" };
  try {
    return { ok: true, payload: JSON.parse(row.payload_json) };
  } catch {
    return { ok: false, reason: "incompatible-schema" };
  }
}

export async function cleanupExpiredGenerations(env: GenerationStoreEnv): Promise<number> {
  const result = await env.DB.prepare(`DELETE FROM forge_generations WHERE expires_at < ?`).bind(Date.now()).run();
  return Number(result.meta?.changes || 0);
}
