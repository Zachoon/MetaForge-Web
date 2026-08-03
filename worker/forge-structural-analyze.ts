// Server-side structural intelligence. The interaction graph, systems
// intelligence, causality engine, goldfish/matchup simulation, and
// revision/intervention learning used to run entirely client-side,
// shipping their full reasoning (producer/payoff signal tables, system
// health scoring, causality weighting, simulation trial models, learning
// thresholds) to every visitor's browser. This endpoint runs the real
// engines here; only the finished report crosses back over the network.
//
// buildBoundedFailureAnalysis, the simulation gate/matrix, and the
// learning functions all moved here in the same pass rather than
// staying client-side as separate direct imports, each of which would
// have kept pulling its whole module (and its internals) back into the
// client bundle.
//
// Public-alpha hardening: authenticated (reuses the same account
// identity as every other /api/account and /api/forge endpoint — the
// site-wide bootstrap lock is not endpoint authentication), rate
// limited, and size/shape validated. See CAPTAINS_LOG.md for the
// reasoning behind the specific limits chosen.
import { buildForgeStructuralAnalysis } from "../app/forge-structural-pipeline.mjs";
import { buildContextualCardEvaluations } from "../app/contextual-card-evaluation.mjs";
import { buildBoundedFailureAnalysis } from "../app/forge-systems-intelligence.mjs";
import { evaluateSimulationGate } from "../app/goldfish-simulation.mjs";
import { evaluateMatchupMatrix } from "../app/matchup-simulation.mjs";
import { simulationRoleFor } from "../app/adaptive-recommendation.mjs";
import { colorPipsFromCost } from "../app/native-masterwork-engine.mjs";
import { learnRevisionPreferences } from "../app/revision-learning.mjs";
import { learnFromForgeInterventions } from "../app/forge-intervention-learning.mjs";
import { buildCoachingDiagnosis } from "../app/coaching-diagnosis.mjs";
import { buildProvingGroundsBrief } from "../app/proving-grounds.mjs";
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
// client debounce entirely. Match-recording and intervention events now
// also trigger this same endpoint (the union-of-triggers design), but
// those are rarer than edits, not an additional load concern.
const RATE_LIMIT = 150;
const RATE_WINDOW_MS = 5 * 60 * 1000;

// Structural cards carry oracle text and type lines for every unique
// card in the deck (up to ~100 rows for the largest supported formats,
// Commander/Brawl), plus match history and intervention history. 512KB
// gives generous headroom above any real deck/history payload while
// still rejecting a genuinely oversized/malicious body.
const MAX_BODY_BYTES = 512 * 1024;
const MAX_CARDS = 300;
const MAX_TEXT_FIELD = 4000;
const MAX_COMMANDER_NAME = 400;
const MAX_SHORT_STRING = 400;
const MAX_MATCH_LOG = 2000;
const MAX_INTERVENTIONS = 1000;

interface SanitizedCard {
  name: string;
  quantity: number;
  typeLine: string;
  oracleText: string;
  cmc: number;
  isCommander: boolean;
  colorIdentity: string[];
  manaCost: string;
}

function sanitizeCard(raw: any): SanitizedCard | null {
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
    colorIdentity: Array.isArray(raw.colorIdentity)
      ? raw.colorIdentity.filter((c: unknown): c is string => typeof c === "string").slice(0, 5).map((c: string) => c.slice(0, 2))
      : [],
    manaCost: String(raw.manaCost || "").slice(0, 80),
  };
}

// matchLog/forgeInterventions entries are passed through to pure,
// already-defensive learning functions (learnRevisionPreferences,
// learnFromForgeInterventions) rather than deeply shape-validated field
// by field — the same trust boundary buildForgeStructuralAnalysis
// already applies to malformed cards. Only array length and a generic
// string-field cap (against a single oversized entry) are enforced here.
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
  const cards: SanitizedCard[] = (payload.cards as unknown[])
    .map(sanitizeCard)
    .filter((card: SanitizedCard | null): card is SanitizedCard => card !== null);

  if (payload?.matchLog !== undefined && !Array.isArray(payload.matchLog)) {
    return json({ error: "matchLog must be an array" }, 400);
  }
  if (Array.isArray(payload?.matchLog) && payload.matchLog.length > MAX_MATCH_LOG) {
    return json({ error: `matchLog must not exceed ${MAX_MATCH_LOG} entries` }, 400);
  }
  if (payload?.forgeInterventions !== undefined && !Array.isArray(payload.forgeInterventions)) {
    return json({ error: "forgeInterventions must be an array" }, 400);
  }
  if (Array.isArray(payload?.forgeInterventions) && payload.forgeInterventions.length > MAX_INTERVENTIONS) {
    return json({ error: `forgeInterventions must not exceed ${MAX_INTERVENTIONS} entries` }, 400);
  }

  const commanderName =
    typeof payload?.commanderName === "string" ? payload.commanderName.slice(0, MAX_COMMANDER_NAME) : "";
  const strategy = typeof payload?.strategy === "string" ? payload.strategy.slice(0, MAX_SHORT_STRING) : "";
  const computeSimulation = payload?.computeSimulation === true;
  const matchLog = sanitizeHistoryArray(payload?.matchLog, MAX_MATCH_LOG);
  const forgeInterventions = sanitizeHistoryArray(payload?.forgeInterventions, MAX_INTERVENTIONS);
  const revisionsCount = Number.isFinite(payload?.revisionsCount) ? Math.max(1, Math.trunc(payload.revisionsCount)) : 1;

  try {
    let simulationDossier: ForgeAnalysisReport["simulationDossier"] = null;
    if (computeSimulation) {
      const model = cards.map((card) => {
        const role = simulationRoleFor({
          type_line: card.typeLine,
          oracle_text: card.oracleText,
          cmc: card.cmc,
          mana_cost: card.manaCost,
        });
        return {
          quantity: card.quantity,
          card: card.name,
          role,
          cmc: card.cmc,
          colorIdentity: role === "land" ? card.colorIdentity : undefined,
          colorPips: role === "land" ? undefined : colorPipsFromCost(card.manaCost || ""),
        };
      });
      const strategyName = /aggro|pressure/i.test(strategy)
        ? "Aggro"
        : /control/i.test(strategy)
          ? "Control"
          : /tempo/i.test(strategy)
            ? "Tempo"
            : "Midrange";
      const nonlandModel = model.filter((row) => row.role !== "land");
      const nonlandQuantity = nonlandModel.reduce((sum, row) => sum + row.quantity, 0);
      const roleCounts = nonlandModel.reduce((counts: Record<string, number>, row) => {
        counts[row.role] = (counts[row.role] || 0) + row.quantity;
        return counts;
      }, {});
      const averageCmc = nonlandQuantity
        ? nonlandModel.reduce((sum, row) => sum + row.cmc * row.quantity, 0) / nonlandQuantity
        : 0;
      simulationDossier = {
        goldfish: evaluateSimulationGate(model, strategyName, 1200, 8128),
        matrix: evaluateMatchupMatrix(model, undefined, 900, 991),
        roleCounts,
        averageCmc,
      };
    }

    const structuralAnalysis = buildForgeStructuralAnalysis(cards, { commanderName, simulationDossier });
    const analysis = {
      ...structuralAnalysis,
      cardEvaluations: buildContextualCardEvaluations(
        cards,
        structuralAnalysis.graph,
        structuralAnalysis.systems,
        structuralAnalysis.causality,
      ),
    };
    const failureAnalysis = buildBoundedFailureAnalysis(analysis.systems, simulationDossier);
    const revisionLearning = learnRevisionPreferences(matchLog, revisionsCount);
    const interventionLearning = learnFromForgeInterventions(forgeInterventions, matchLog);
    const coachingDiagnosis = buildCoachingDiagnosis({
      matches: matchLog,
      currentRevision: revisionsCount,
      interventionLearning,
    });
    const provingGrounds = buildProvingGroundsBrief({
      coachingDiagnosis,
      failureAnalysis,
      simulationDossier,
    });

    const report: ForgeAnalysisReport = {
      ...analysis,
      failureAnalysis,
      simulationDossier,
      revisionLearning,
      interventionLearning,
      coachingDiagnosis,
      provingGrounds,
    };
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
