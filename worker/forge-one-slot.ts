// Server-side Testing Anvil one-slot lab. The counterfactual ranking
// (native-one-slot-lab.mjs), the practical goldfish/matchup gate
// (native-masterwork-engine.mjs's rankPracticalOneSlotCounterfactuals),
// and the tablet assembly (experiment-tablet.mjs) used to run entirely
// client-side against the full generation context (ranked candidates,
// selected Masterwork, and the ~700-card verified pool) shipped straight
// to the browser. This endpoint runs the real ranking here; the browser
// now holds only an opaque generationId (see forge-generation-store.ts)
// plus whatever legitimately changes between requests — the current
// revision's rows, recorded match evidence, and any explicit exclusions.
//
// Public-alpha hardening: authenticated, rate limited, size/shape
// validated, and every generation lookup is scoped to the caller's own
// verified user_key — see forge-generation-store.ts's loadGeneration.
import { buildExperimentTablets } from "../app/experiment-tablet.mjs";
import type { ForgeExperimentReport } from "../app/forge-experiment-contract";
import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { loadGeneration } from "./forge-generation-store";

interface Env {
  DB: D1Database;
}

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

// Triggered by the same union of events as forge-structural-analyze
// (revision changes, match recording, intervention accept/dismiss) —
// not per-keystroke editing, so real usage is lighter than that
// endpoint's. Matching its limit anyway leaves generous headroom rather
// than risking a too-tight cap on a legitimately active session.
const RATE_LIMIT = 150;
const RATE_WINDOW_MS = 5 * 60 * 1000;

// No card pool crosses the wire on this endpoint anymore — the request
// body is just current row quantities, match history, and the causality
// report the client already received from structural-analyze moments
// earlier. 256KB is generous headroom above any real payload here.
const MAX_BODY_BYTES = 256 * 1024;
const MAX_ROWS = 300;
const MAX_ROW_NAME = 400;
const MAX_MATCH_LOG = 2000;
const MAX_SHORT_STRING = 400;
const MAX_EXCLUDED_CARDS = 200;
const MAX_CAUSALITY_BYTES = 200 * 1024;

interface SanitizedRow {
  quantity: number;
  name: string;
}

function sanitizeRow(raw: any): SanitizedRow | null {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").slice(0, MAX_ROW_NAME);
  if (!name) return null;
  return { name, quantity: Number.isFinite(raw.quantity) ? Math.max(1, Math.min(99, Math.trunc(raw.quantity))) : 1 };
}

function sanitizeHistoryEntry(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const clipped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    clipped[k] = typeof v === "string" ? v.slice(0, MAX_SHORT_STRING) : v;
  }
  return clipped;
}

function sanitizeHistoryArray(raw: unknown, maxEntries: number) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, maxEntries).map(sanitizeHistoryEntry).filter((entry) => entry !== null);
}

function sanitizeExcludedCards(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_EXCLUDED_CARDS)
    .map((entry) => (entry && typeof entry === "object" ? String((entry as any).name || "") : typeof entry === "string" ? entry : ""))
    .map((name) => name.slice(0, MAX_ROW_NAME))
    .filter((name) => name.length > 0);
}

const normalizeKey = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en");

export async function handleForgeOneSlot(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);

  const limitResult = await checkRateLimit(env, key, "forge-one-slot", RATE_LIMIT, RATE_WINDOW_MS);
  if (!limitResult.allowed) {
    return json(
      { error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds },
      429,
      { "Retry-After": String(limitResult.retryAfterSeconds) },
    );
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const payload = bodyResult.data;

  const generationId = typeof payload?.generationId === "string" ? payload.generationId : "";
  if (!generationId) return json({ error: "generationId is required" }, 400);

  if (!Array.isArray(payload?.currentRows)) return json({ error: "currentRows must be an array" }, 400);
  if (payload.currentRows.length > MAX_ROWS) return json({ error: `currentRows must not exceed ${MAX_ROWS} entries` }, 400);
  const currentRows = (payload.currentRows as unknown[]).map(sanitizeRow).filter((row): row is SanitizedRow => row !== null);

  if (payload?.matchLog !== undefined && !Array.isArray(payload.matchLog)) {
    return json({ error: "matchLog must be an array" }, 400);
  }
  if (Array.isArray(payload?.matchLog) && payload.matchLog.length > MAX_MATCH_LOG) {
    return json({ error: `matchLog must not exceed ${MAX_MATCH_LOG} entries` }, 400);
  }
  const matchLog = sanitizeHistoryArray(payload?.matchLog, MAX_MATCH_LOG);

  if (payload?.causalityReport !== undefined && payload.causalityReport !== null && typeof payload.causalityReport !== "object") {
    return json({ error: "causalityReport must be an object or null" }, 400);
  }
  // causalityReport is opaque, already-server-computed data the client
  // received from structural-analyze and is only relaying back — trusted
  // at the same level it already carries, not re-derived here. Still
  // capped independently of the overall body limit so one oversized
  // field can't consume the whole budget meant for match history.
  const causalityReport = payload?.causalityReport ?? null;
  if (causalityReport && new TextEncoder().encode(JSON.stringify(causalityReport)).byteLength > MAX_CAUSALITY_BYTES) {
    return json({ error: "causalityReport is too large" }, 413);
  }

  const excludedCards = sanitizeExcludedCards(payload?.excludedCards);

  const generation = await loadGeneration(env, key, generationId);
  if (!generation.ok) {
    // missing / not-owned / expired / incompatible-schema all fold into
    // one honest-but-non-leaking message: a guess against another
    // player's generationId can't be distinguished from a genuinely
    // expired one of your own via this response.
    return json({ error: "This generation is no longer available. Regenerate to test one-slot changes." }, 404);
  }

  try {
    const stored = generation.payload;
    const knownRows = new Map<string, any>();
    for (const row of stored.selected?.rows || []) knownRows.set(normalizeKey(row.name), row);
    for (const candidate of stored.candidates || []) {
      for (const row of candidate.rows || []) {
        const rowKey = normalizeKey(row.name);
        if (!knownRows.has(rowKey)) knownRows.set(rowKey, row);
      }
    }
    const selectedRows = currentRows.map((row) => {
      const known = knownRows.get(normalizeKey(row.name));
      return {
        quantity: row.quantity,
        name: row.name,
        roles: known?.roles || [],
        cmc: known?.cmc ?? 0,
        colorPips: known?.colorPips,
        colorIdentity: known?.colorIdentity,
      };
    });
    const selected = { id: stored.selected?.id, rows: selectedRows };

    const input = stored.cardPool?.length
      ? { format: stored.options.format, strategy: stored.options.strategy, target: stored.options.target, cards: stored.cardPool }
      : null;

    const report = buildExperimentTablets({
      selected,
      candidates: stored.candidates || [],
      causalityReport,
      matchLog,
      input,
      options: { format: stored.options.format, strategy: stored.options.strategy, target: stored.options.target, excludedCards },
    }) as ForgeExperimentReport;

    return json({ report });
  } catch (error) {
    console.error("forge-one-slot failed", error);
    return json({ error: "The one-slot laboratory could not complete for this deck." }, 500);
  }
}
