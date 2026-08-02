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
import { buildForgeStructuralAnalysis } from "../app/forge-structural-pipeline.mjs";
import { buildBoundedFailureAnalysis } from "../app/forge-systems-intelligence.mjs";
import type { ForgeAnalysisReport } from "../app/forge-analysis-contract";

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function handleForgeStructuralAnalyze(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const commanderName = typeof payload?.commanderName === "string" ? payload.commanderName : "";
  const simulationDossier =
    payload?.simulationDossier && typeof payload.simulationDossier === "object" ? payload.simulationDossier : null;

  const analysis = buildForgeStructuralAnalysis(cards, { commanderName, simulationDossier });
  const failureAnalysis = buildBoundedFailureAnalysis(analysis.systems, simulationDossier);
  const report: ForgeAnalysisReport = { ...analysis, failureAnalysis };
  return json({ report });
}
