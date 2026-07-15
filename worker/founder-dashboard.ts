import { userKey } from "./account-bench";

interface FounderEnv { DB: D1Database; METAFORGE_FOUNDER_USER_KEY?: string }

type BenchRow = { user_key: string; bench_json: string; revision: number; created_at: string; updated_at: string };
type FeedbackRow = { id: number; user_key: string; category: string; message: string; context_json: string; status: string; created_at: string };

function response(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleFounderOverview(request: Request, env: FounderEnv) {
  const key = await userKey(request);
  if (!key || !env.METAFORGE_FOUNDER_USER_KEY || key !== env.METAFORGE_FOUNDER_USER_KEY) return response({ error: "Founder access required" }, 403);
  if (request.method !== "GET") return response({ error: "Method not allowed" }, 405);

  const [benchesResult, feedbackResult] = await Promise.all([
    env.DB.prepare("SELECT user_key, bench_json, revision, created_at, updated_at FROM account_deck_benches ORDER BY updated_at DESC LIMIT 500").all<BenchRow>(),
    env.DB.prepare("SELECT id, user_key, category, message, context_json, status, created_at FROM founder_feedback ORDER BY created_at DESC LIMIT 100").all<FeedbackRow>(),
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
  return response({ generatedAt: new Date().toISOString(), totals: { testers: testers.length, feedback: feedback.length, ...totals }, testers, feedback });
}
