import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { handleForgeGenerateForKey } from "./forge-generate";
import { guidedCompletionReview, guidedGenerationPayload, validGuidedDraft } from "../app/guided-draft.mjs";

interface Env { DB: D1Database }
type Row = { revision: number; draft_json: string | null; phase: string; completion_id: string | null; result_json: string | null; updated_at: string };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const load = (env: Env, key: string) => env.DB.prepare("SELECT revision, draft_json, phase, completion_id, result_json, updated_at FROM guided_drafts WHERE user_key = ?").bind(key).first<Row>();
const publicRow = (row: Row | null, key: string) => ({
  owner: key, revision: row?.revision || 0, phase: row?.phase || "cleared", updatedAt: row?.updated_at || null,
  draft: row?.draft_json ? JSON.parse(row.draft_json) : null,
  result: row?.result_json ? JSON.parse(row.result_json) : null,
});

export async function handleGuidedDraft(request: Request, env: Env): Promise<Response> {
  const key = await userKey(request, env);
  if (!key) return json({ error: "Sign in to save or resume your guided build." }, 401);
  if (request.method === "GET") return json(publicRow(await load(env, key), key));
  if (request.method !== "PUT" && request.method !== "DELETE") return json({ error: "Method not allowed" }, 405);
  const limit = await checkRateLimit(env, key, "guided-draft", 120, 300_000);
  if (!limit.allowed) return json({ error: "Draft saving is busy. Your local copy is safe; try again shortly." }, 429);
  const parsed = await readJsonWithLimit(request, 192_000);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.data as any;
  if (!Number.isSafeInteger(body?.baseRevision) || body.baseRevision < 0) return json({ error: "A draft revision is required." }, 400);
  const draft = request.method === "DELETE" ? null : body.draft;
  if (draft && (!validGuidedDraft(draft) || new TextEncoder().encode(JSON.stringify(draft)).length > 180_000)) return json({ error: "The draft is invalid or too large." }, 400);
  if (request.method === "PUT" && !draft) return json({ error: "A valid draft is required." }, 400);
  const current = await load(env, key);
  if (current?.phase === "completing") return json({ error: "The Forge is finishing this draft. Check its result before changing it.", ...publicRow(current, key) }, 409);
  if ((current?.revision || 0) !== body.baseRevision) return json({ error: "Another copy of this build has changed. Choose which copy to keep.", ...publicRow(current, key) }, 409);
  // Both first insert and later updates compare revisions inside SQLite, not only above.
  const saved = current
    ? await env.DB.prepare("UPDATE guided_drafts SET draft_json = ?, phase = ?, completion_id = NULL, result_json = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_key = ? AND revision = ? AND phase != 'completing' RETURNING revision")
      .bind(draft ? JSON.stringify(draft) : null, draft ? "active" : "cleared", key, body.baseRevision).first<{ revision: number }>()
    : await env.DB.prepare("INSERT INTO guided_drafts (user_key, draft_json, phase) VALUES (?, ?, ?) ON CONFLICT(user_key) DO NOTHING RETURNING revision")
      .bind(key, draft ? JSON.stringify(draft) : null, draft ? "active" : "cleared").first<{ revision: number }>();
  if (!saved) return json({ error: "Another copy changed while saving.", ...publicRow(await load(env, key), key) }, 409);
  return json({ saved: true, revision: saved.revision, owner: key });
}

export async function handleGuidedComplete(request: Request, env: Env): Promise<Response> {
  const key = await userKey(request, env);
  if (!key) return json({ error: "Sign in again; your guided picks are safe." }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = await readJsonWithLimit(request, 2048);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.data as any;
  if (!Number.isSafeInteger(body?.baseRevision) || typeof body?.completionId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.completionId)) return json({ error: "A valid completion request is required." }, 400);
  const current = await load(env, key);
  // A repeated request can retrieve the original result even after its revision advanced.
  if (current && current.completion_id === body.completionId && current.phase === "complete") return json(JSON.parse(current.result_json!));
  const interrupted = current?.phase === "completing" && current.completion_id === body.completionId
    && Date.now() - Date.parse(`${current.updated_at.replace(" ", "T")}Z`) >= 15 * 60_000;
  if (current?.phase === "completing" && !interrupted) return json({ pending: true, error: "This build is still finishing. Check again shortly. An interrupted finish can be retried after 15 minutes." }, 202);
  if (!current?.draft_json || current.revision !== body.baseRevision || (current.phase !== "active" && !interrupted)) return json({ error: "The saved draft changed. Resume its latest copy before finishing." }, 409);
  const draft = JSON.parse(current.draft_json);
  if (!validGuidedDraft(draft) || draft.completion?.id !== body.completionId) return json({ error: "Save this completion request with your draft first." }, 400);
  const claimed = await env.DB.prepare("UPDATE guided_drafts SET phase = 'completing', completion_id = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_key = ? AND revision = ? AND (phase = 'active' OR (phase = 'completing' AND completion_id = ? AND updated_at <= datetime('now', '-15 minutes'))) RETURNING revision")
    .bind(body.completionId, key, body.baseRevision, body.completionId).first<{ revision: number }>();
  if (!claimed) return json({ pending: true }, 202);
  try {
    const generation = await handleForgeGenerateForKey(new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guidedGenerationPayload(draft)) }), env, key);
    const result = await generation.json() as any;
    if (!generation.ok) {
      await env.DB.prepare("UPDATE guided_drafts SET phase = 'active', completion_id = NULL, revision = revision + 1 WHERE user_key = ? AND completion_id = ? AND phase = 'completing' AND revision = ?").bind(key, body.completionId, claimed.revision).run();
      return json(result, generation.status);
    }
    const review = guidedCompletionReview(result.nativeReport?.selected?.deckText, draft.session.accepted, [draft.commander?.name, draft.second?.name].filter(Boolean));
    if (review.missing.length) {
      await env.DB.prepare("UPDATE guided_drafts SET phase = 'active', completion_id = NULL, revision = revision + 1 WHERE user_key = ? AND completion_id = ? AND phase = 'completing' AND revision = ?").bind(key, body.completionId, claimed.revision).run();
      return json({ error: `These picks could not be kept: ${review.missing.join(", ")}. Remove or resolve them before finishing.`, missingPicks: review.missing }, 422);
    }
    const guidedReview = { ...review, preferences: draft.preferences };
    const completed = { ...result, nativeReport: { ...result.nativeReport, guidedReview }, guidedReview, guidedDeckId: draft.completion.deckId };
    const serialized = JSON.stringify(completed);
    if (new TextEncoder().encode(serialized).length > 1_800_000) throw new Error("Completion result exceeds durable storage limit");
    const stored = await env.DB.prepare("UPDATE guided_drafts SET phase = 'complete', result_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_key = ? AND completion_id = ? AND phase = 'completing' AND revision = ?").bind(serialized, key, body.completionId, claimed.revision).run();
    if (!stored.meta?.changes) return json({ pending: true, error: "Another request is recovering this finish. Check the saved result shortly." }, 202);
    return json(completed);
  } catch (error) {
    // Retain the claim after ambiguous failures. A bounded lease allows recovery
    // with the same seed; the revision guard prevents late work overwriting it.
    console.error("guided completion needs reconciliation", error);
    return json({ pending: true, error: "Finishing was interrupted. Your picks are saved. Check the saved result before retrying; export your picks if it remains unavailable." }, 202);
  }
}
