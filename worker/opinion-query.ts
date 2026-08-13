import { userKey } from "./account-bench";
// @ts-expect-error JavaScript knowledge modules intentionally remain runtime-neutral.
import { buildRegisteredOpinion, registeredOpinionCatalog } from "../app/knowledge/opinion-claim-registry.mjs";
// @ts-expect-error JavaScript knowledge modules intentionally remain runtime-neutral.
import { compileOpinionContext, presentOpinionForMentor, synthesizeStrategicOpinion } from "../app/knowledge/opinion-engine.mjs";

interface OpinionEnv { DB: D1Database; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string }

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown, max: number) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, max); }

export async function handleOpinionQuery(request: Request, env: OpinionEnv): Promise<Response> {
  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  if (request.method === "GET") return json(registeredOpinionCatalog());
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Number(request.headers.get("content-length") || 0) > 20_000) return json({ error: "Opinion question is too large" }, 413);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const question = text(body.question, 1000);
  if (question.length < 5) return json({ error: "A strategic question is required" }, 400);
  const commanderName = text(body.commanderName, 200);
  const subject = text(body.subject, 200);
  // Named server-owned proof paths may carry registered evidence. Card-name
  // similarity alone must never borrow another player's commission.
  const opinionKey = text(body.opinionKey, 200);
  const registered = buildRegisteredOpinion(opinionKey);
  const opinion = registered
    ? registered
    : synthesizeStrategicOpinion({
        context: compileOpinionContext({
          question,
          format: text(body.format, 80) || "Commander",
          commanderName,
          subject,
          decision: text(body.decision, 100) || "evaluate",
          deckRevision: text(body.deckRevision, 200) || null,
          commission: body.commission && typeof body.commission === "object" ? body.commission : null,
          constraints: Array.isArray(body.constraints) ? body.constraints.slice(0, 20).map((value: unknown) => text(value, 300)) : [],
        }),
        claims: [],
      });

  const serialized = JSON.stringify(opinion);
  await env.DB.prepare(`INSERT OR IGNORE INTO opinion_revisions
    (user_key, opinion_id, revision, context_id, subject, commander_name, verdict, confidence_score, record_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(key, opinion.opinionId, opinion.revision, opinion.context.contextId, opinion.context.subject, opinion.context.commanderName, opinion.verdict, opinion.confidence.score, serialized)
    .run();

  return json({
    version: "opinion-query-response-v0",
    constructionReadOnly: true,
    writesToBrain: false,
    opinion: presentOpinionForMentor(opinion),
    lineage: { opinionId: opinion.opinionId, revision: opinion.revision, archived: true },
  });
}
