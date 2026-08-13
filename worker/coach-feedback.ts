import { verifyAccessIdentity, type AccessEnv } from "./access-identity";
import { validateCoachFeedbackPayload, GUEST_FEEDBACK_LIMIT_PER_HOUR } from "../app/honest-coach-feedback.mjs";
import { userKey } from "./account-bench";

interface CoachEnv extends AccessEnv { DB: D1Database }

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function guestKey(request: Request) {
  // Privacy-conscious bucket: day + coarse network hint only. Never store raw IP.
  const day = new Date().toISOString().slice(0, 10);
  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const hash = await sha256Hex(`metaforge-coach-guest:${day}:${forwarded}`);
  return `guest:${hash.slice(0, 32)}`;
}

async function recentGuestCount(env: CoachEnv, key: string) {
  try {
    const row = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM founder_feedback WHERE user_key = ? AND created_at > datetime('now', '-1 hour')")
      .bind(key)
      .first<{ c: number }>();
    return Number(row?.c || 0);
  } catch {
    return 0;
  }
}

/**
 * Guest-safe Honest Coach feedback.
 * Auth optional. Rate-limited for guests. Preserves analysis/recommendation IDs.
 */
export async function handleCoachFeedback(request: Request, env: CoachEnv): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Number(request.headers.get("content-length") || 0) > 12_000) {
    return json({ error: "Payload too large" }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const identity = await verifyAccessIdentity(request, env);
  const signedInKey = identity ? await userKey(request, env) : null;
  const isGuest = !signedInKey;
  const validated = validateCoachFeedbackPayload({ ...payload, guest: isGuest });
  if (!validated.ok) return json({ error: validated.error }, validated.status);

  let key = signedInKey;
  if (!key) {
    key = await guestKey(request);
    const count = await recentGuestCount(env, key);
    if (count >= GUEST_FEEDBACK_LIMIT_PER_HOUR) {
      return json({ error: "Guest feedback rate limit reached. Try again later." }, 429);
    }
  }

  const context = JSON.stringify(validated.context).slice(0, 20_000);
  await env.DB
    .prepare("INSERT INTO founder_feedback (user_key, category, message, context_json) VALUES (?, ?, ?, ?)")
    .bind(key, validated.apiCategory, validated.message, context)
    .run();

  return json({
    saved: true,
    guest: isGuest,
    analysisId: validated.context.analysisId,
    recommendationId: validated.context.recommendationId,
  }, 201);
}
