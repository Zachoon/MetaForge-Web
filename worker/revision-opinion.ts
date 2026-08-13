import { userKey } from "./account-bench";
// @ts-expect-error Runtime-neutral knowledge module.
import { buildExactRevisionOpinion, evaluateRevisionOpinionEligibility } from "../app/knowledge/opinion-eligibility.mjs";

interface Env { DB: D1Database; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string }
type BenchRow = { bench_json: string };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function handleRevisionOpinion(request: Request, env: Env): Promise<Response> {
  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Number(request.headers.get("content-length") || 0) > 10_000) return json({ error: "Request is too large" }, 413);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  // Deliberately accept identifiers only. Claims, commission, commander, card,
  // and question text come from the owner-bound saved Bench and server registry.
  const familyId = String(body?.familyId || "").slice(0, 200);
  const revisionId = String(body?.revisionId || "").slice(0, 200);
  const fingerprint = String(body?.fingerprint || "").slice(0, 200);
  const row = await env.DB.prepare("SELECT bench_json FROM account_deck_benches WHERE user_key = ?").bind(key).first<BenchRow>();
  if (!row) return json({ version: "revision-opinion-eligibility-v0", writesToBrain: false, eligible: false, reason: "bench_not_found", presentation: null });
  let bench: unknown;
  try { bench = JSON.parse(row.bench_json); } catch { return json({ error: "Stored Deck Bench is invalid" }, 500); }
  const eligibility = evaluateRevisionOpinionEligibility({ bench, familyId, revisionId, fingerprint });
  if (!eligibility.eligible) return json(eligibility);
  const built = buildExactRevisionOpinion(eligibility);
  const opinion = built.opinion;
  await env.DB.prepare(`INSERT OR IGNORE INTO opinion_revisions
    (user_key, opinion_id, revision, context_id, subject, commander_name, verdict, confidence_score, record_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(key, opinion.opinionId, opinion.revision, opinion.context.contextId, opinion.context.subject, opinion.context.commanderName, opinion.verdict, opinion.confidence.score, JSON.stringify(opinion)).run();
  return json({
    version: eligibility.version,
    writesToBrain: false,
    constructionReadOnly: true,
    eligible: true,
    revision: eligibility.revision,
    question: eligibility.question,
    cardIdentity: eligibility.cardIdentity,
    presentation: built.presentation,
    lineage: { opinionId: opinion.opinionId, revision: opinion.revision, archived: true },
  });
}

