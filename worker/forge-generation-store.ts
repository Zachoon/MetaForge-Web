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

export async function storeGeneration(
  env: GenerationStoreEnv,
  userKey: string,
  payload: StoredGenerationPayload,
): Promise<string> {
  const generationId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO forge_generations (generation_id, user_key, schema_version, payload_json, created_at, expires_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
  )
    .bind(generationId, userKey, GENERATION_SCHEMA_VERSION, JSON.stringify(payload), Date.now() + TTL_MS)
    .run();
  return generationId;
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
