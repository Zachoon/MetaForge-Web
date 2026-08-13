import { userKey } from "./account-bench";
import { buildTrustCalibrationReport } from "../app/trust-calibration.mjs";

interface FounderEnv { DB: D1Database; METAFORGE_FOUNDER_USER_KEY?: string }

type BenchRow = { user_key: string; bench_json: string; revision: number; created_at: string; updated_at: string };
type FeedbackRow = { id: number; user_key: string; category: string; message: string; context_json: string; status: string; created_at: string };
type FunnelRow = { event_name: string; events: number; sessions: number };
type ReliabilityRow = { event_name: string; events: number; average_ms: number | null };
type CampaignRow = { source: string | null; medium: string | null; campaign: string | null; sessions: number; completed: number };

function response(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleFounderOverview(request: Request, env: FounderEnv) {
  const key = await userKey(request, env);
  if (!key || !env.METAFORGE_FOUNDER_USER_KEY || key !== env.METAFORGE_FOUNDER_USER_KEY) return response({ error: "Founder access required" }, 403);
  if (request.method !== "GET") return response({ error: "Method not allowed" }, 405);

  const [benchesResult, feedbackResult, funnelResult, reliabilityResult, campaignResult] = await Promise.all([
    env.DB.prepare("SELECT user_key, bench_json, revision, created_at, updated_at FROM account_deck_benches ORDER BY updated_at DESC LIMIT 500").all<BenchRow>(),
    env.DB.prepare("SELECT id, user_key, category, message, context_json, status, created_at FROM founder_feedback ORDER BY created_at DESC LIMIT 500").all<FeedbackRow>(),
    env.DB.prepare(`SELECT event_name, COUNT(*) events, COUNT(DISTINCT session_id) sessions
      FROM launch_events WHERE session_id IS NOT NULL AND occurred_at >= ? GROUP BY event_name`).bind(Date.now() - 30 * 86400000).all<FunnelRow>(),
    env.DB.prepare(`SELECT event_name, COUNT(*) events,
      AVG(CAST(json_extract(properties_json, '$.durationMs') AS REAL)) average_ms
      FROM launch_events WHERE event_name IN ('generation_succeeded','generation_failed') AND occurred_at >= ? GROUP BY event_name`)
      .bind(Date.now() - 7 * 86400000).all<ReliabilityRow>(),
    env.DB.prepare(`SELECT COALESCE(source,'direct') source, COALESCE(medium,'none') medium, COALESCE(campaign,'unattributed') campaign,
      COUNT(DISTINCT session_id) sessions,
      COUNT(DISTINCT CASE WHEN event_name='forge_succeeded' THEN session_id END) completed
      FROM launch_events WHERE session_id IS NOT NULL AND occurred_at >= ? GROUP BY source, medium, campaign ORDER BY sessions DESC LIMIT 20`)
      .bind(Date.now() - 30 * 86400000).all<CampaignRow>(),
  ]);
  const testers = (benchesResult.results || []).map((row) => {
    let bench: any = { families: [] };
    try { bench = JSON.parse(row.bench_json); } catch { /* surfaced through validData */ }
    const families = Array.isArray(bench.families) ? bench.families : [];
    const revisions = families.flatMap((family: any) => Array.isArray(family.revisions) ? family.revisions : []);
    const matches = revisions.flatMap((revision: any) => Array.isArray(revision.matches) ? revision.matches : []);
    const uniqueMatches = [...new Map(matches.map((match: any) => [match.id, match])).values()] as any[];
    return {
      id: row.user_key.slice(0, 8),
      firstSeen: row.created_at,
      lastSeen: row.updated_at,
      syncRevision: row.revision,
      decks: families.length,
      revisions: revisions.length,
      matches: uniqueMatches.length,
      wins: uniqueMatches.filter((match) => match.result === "win").length,
      losses: uniqueMatches.filter((match) => match.result === "loss").length,
      validData: Array.isArray(bench.families),
    };
  });
  const totals = testers.reduce((sum, tester) => ({
    decks: sum.decks + tester.decks,
    revisions: sum.revisions + tester.revisions,
    matches: sum.matches + tester.matches,
    wins: sum.wins + tester.wins,
    losses: sum.losses + tester.losses,
  }), { decks: 0, revisions: 0, matches: 0, wins: 0, losses: 0 });
  const feedback = (feedbackResult.results || []).map((item) => {
    let context: Record<string, unknown> = {};
    try { context = JSON.parse(item.context_json); } catch { /* retain empty context */ }
    return { id: item.id, testerId: item.user_key.slice(0, 8), category: item.category, message: item.message, status: item.status, createdAt: item.created_at, context };
  });
  const funnel = Object.fromEntries((funnelResult.results || []).map((row) => [row.event_name, { events: row.events, sessions: row.sessions }]));
  const reliabilityRows = reliabilityResult.results || [];
  const succeeded = reliabilityRows.find((row) => row.event_name === "generation_succeeded")?.events || 0;
  const failed = reliabilityRows.find((row) => row.event_name === "generation_failed")?.events || 0;
  const averageMs = reliabilityRows.find((row) => row.event_name === "generation_succeeded")?.average_ms || 0;
  const trustCalibration = buildTrustCalibrationReport({
    feedback,
    funnel,
    generatedAt: new Date().toISOString(),
  });
  return response({
    generatedAt: new Date().toISOString(),
    totals: { testers: testers.length, feedback: feedback.length, ...totals }, testers, feedback,
    launch: {
      funnel,
      reliability: { succeeded, failed, successRate: succeeded + failed ? Math.round(succeeded / (succeeded + failed) * 1000) / 10 : null, averageMs: Math.round(averageMs) },
      campaigns: campaignResult.results || [],
    },
    trustCalibration,
  });
}
