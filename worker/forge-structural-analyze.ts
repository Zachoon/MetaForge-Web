// Server-side structural intelligence. The interaction graph, systems
// intelligence, and causality engine used to run entirely client-side via
// buildForgeStructuralAnalysis, shipping their full reasoning (producer/
// payoff signal tables, system health scoring, causality weighting) to
// every visitor's browser. This endpoint runs the real engines here;
// only the finished report crosses back over the network.
//
// buildBoundedFailureAnalysis also moves here rather than staying
// client-side — it's the one other direct forge-systems-intelligence.mjs
// import page.tsx still had, and leaving it there would keep pulling the
// whole module (and its systems-building internals) back into the client
// bundle even after the pipeline import above it was removed.
//
// Public-alpha hardening: authenticated (reuses the same account
// identity as every other /api/account and /api/forge endpoint — the
// site-wide bootstrap lock is not endpoint authentication), rate
// limited, and size/shape validated. See CAPTAINS_LOG.md for the
// reasoning behind the specific limits chosen.
import { buildForgeStructuralAnalysis } from "../app/forge-structural-pipeline.mjs";
import { buildBoundedFailureAnalysis } from "../app/forge-systems-intelligence.mjs";
import type { ForgeAnalysisReport } from "../app/forge-analysis-contract";
import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";

interface Env {
  DB: D1Database;
}

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

// The client debounces edits to one request per ~800ms of quiet, but
// that's a client-side courtesy, not a guarantee — this cap is what
// actually protects the endpoint. A sustained, uninterrupted 5-minute
// editing burst hitting the debounce ceiling continuously would send
// roughly 375 requests; a real player pausing between edits sends far
// fewer. 150/5min (~30/min sustained) comfortably covers heavy real
// editing while still meaningfully throttling a script bypassing the
// client debounce entirely.
const RATE_LIMIT = 150;
const RATE_WINDOW_MS = 5 * 60 * 1000;

// Structural cards carry oracle text and type lines for every unique
// card in the deck (up to ~100 rows for the largest supported formats,
// Commander/Brawl) plus a simulation dossier (goldfish/matchup results,
// role counts). 512KB gives generous headroom above any real deck's
// payload while still rejecting a genuinely oversized/malicious body.
const MAX_BODY_BYTES = 512 * 1024;
const MAX_CARDS = 300;
const MAX_TEXT_FIELD = 4000;
const MAX_COMMANDER_NAME = 400;

function sanitizeCard(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").slice(0, MAX_COMMANDER_NAME);
  if (!name) return null;
  return {
    name,
    quantity: Number.isFinite(raw.quantity) ? Math.max(1, Math.min(99, Math.trunc(raw.quantity))) : 1,
    typeLine: String(raw.typeLine || "").slice(0, MAX_TEXT_FIELD),
    oracleText: String(raw.oracleText || "").slice(0, MAX_TEXT_FIELD),
    cmc: Number.isFinite(raw.cmc) ? raw.cmc : 0,
    isCommander: raw.isCommander === true,
  };
}

export async function handleForgeStructuralAnalyze(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);

  const limitResult = await checkRateLimit(env, key, "forge-structural-analyze", RATE_LIMIT, RATE_WINDOW_MS);
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

  if (!Array.isArray(payload?.cards)) return json({ error: "cards must be an array" }, 400);
  if (payload.cards.length > MAX_CARDS) return json({ error: `cards must not exceed ${MAX_CARDS} entries` }, 400);
  const cards = payload.cards.map(sanitizeCard).filter((card: unknown) => card !== null);

  const commanderName =
    typeof payload?.commanderName === "string" ? payload.commanderName.slice(0, MAX_COMMANDER_NAME) : "";

  const simulationDossier =
    payload?.simulationDossier && typeof payload.simulationDossier === "object" && !Array.isArray(payload.simulationDossier)
      ? payload.simulationDossier
      : null;

  try {
    const analysis = buildForgeStructuralAnalysis(cards, { commanderName, simulationDossier });
    const failureAnalysis = buildBoundedFailureAnalysis(analysis.systems, simulationDossier);
    const report: ForgeAnalysisReport = { ...analysis, failureAnalysis };
    return json({ report });
  } catch (error) {
    // Never echo the raw exception message — it can contain internal
    // implementation detail (variable names, stack fragments). This
    // engine has no external dependency to fail predictably (unlike
    // forge-generate.ts's Scryfall calls), so any throw here is
    // unexpected; log it server-side for founder debugging and return a
    // generic, safe message to the caller.
    console.error("forge-structural-analyze failed", error);
    return json({ error: "Structural analysis could not complete for this deck." }, 500);
  }
}
