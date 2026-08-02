import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { handleForgeGenerateForKey } from "./forge-generate";
import { loadGeneration, storeGeneration } from "./forge-generation-store";

interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  GUEST_SESSION_SECRET?: string;
}

const COOKIE = "mf_guest";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 260 * 1024;
const enc = new TextEncoder();
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

function cookieValue(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function sessionFromRequest(request: Request, secret: string): Promise<{ id: string; value: string }> {
  const existing = cookieValue(request);
  if (existing) {
    const [id, signature] = existing.split(".");
    if (id && signature && signature === await hmac(secret, id)) return { id, value: existing };
  }
  const id = crypto.randomUUID();
  return { id, value: `${id}.${await hmac(secret, id)}` };
}

async function validateTurnstile(request: Request, secret: string, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json<{ success?: boolean }>();
  return result.success === true;
}

export async function handleGuestForge(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  if (!env.TURNSTILE_SECRET_KEY || !env.GUEST_SESSION_SECRET) {
    return json({ error: "Guest forging is not available yet" }, 503);
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data;
  if (!(await validateTurnstile(request, env.TURNSTILE_SECRET_KEY, body?.turnstileToken))) {
    return json({ error: "Please complete the human verification and try again" }, 400);
  }

  const session = await sessionFromRequest(request, env.GUEST_SESSION_SECRET);
  const now = Date.now();
  const networkSignal = await hmac(
    env.GUEST_SESSION_SECRET,
    `${request.headers.get("CF-Connecting-IP") || "unknown"}|${request.headers.get("user-agent") || "unknown"}`,
  );
  const networkLimit = await checkRateLimit(env, networkSignal, "guest-forge-network", 3, 24 * 60 * 60 * 1000);
  if (!networkLimit.allowed) {
    return json({ error: "This network has used its preview Forge for now", retryAfterSeconds: networkLimit.retryAfterSeconds }, 429, {
      "Retry-After": String(networkLimit.retryAfterSeconds),
    });
  }

  const reserved = await env.DB.prepare(
    `INSERT INTO guest_forge_sessions (session_key, status, created_at, expires_at)
     VALUES (?, 'pending', ?, ?)
     ON CONFLICT(session_key) DO NOTHING`,
  ).bind(session.id, now, now + TTL_MS).run();
  if (Number(reserved.meta?.changes || 0) !== 1) {
    return json({ error: "Your free preview Forge has already been used. Create an account to keep forging." }, 409);
  }

  try {
    const forgeBody = { ...body };
    delete forgeBody.turnstileToken;
    const internalRequest = new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forgeBody),
    });
    const guestKey = `guest:${session.id}`;
    const forgeResponse = await handleForgeGenerateForKey(internalRequest, env, guestKey);
    const responseBody = await forgeResponse.json<Record<string, unknown>>();
    if (!forgeResponse.ok) {
      await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE session_key = ? AND status = 'pending'`).bind(session.id).run();
      return json(responseBody, forgeResponse.status);
    }

    const generationId = String(responseBody.generationId || "");
    delete responseBody.generationId;
    const claimToken = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(`UPDATE guest_forge_sessions SET status = 'used' WHERE session_key = ? AND status = 'pending'`).bind(session.id),
      env.DB.prepare(
        `INSERT INTO guest_forges (claim_token, session_key, generation_id, response_json, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(claimToken, session.id, generationId, JSON.stringify(responseBody), now, now + TTL_MS),
    ]);
    return json(
      { ...responseBody, claimToken, guestPreview: true },
      200,
      { "Set-Cookie": `${COOKIE}=${encodeURIComponent(session.value)}; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax` },
    );
  } catch (error) {
    await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE session_key = ? AND status = 'pending'`).bind(session.id).run();
    console.error("guest forge failed", error);
    return json({ error: "The Forge could not complete this preview. Please try again." }, 500);
  }
}

export async function handleGuestClaim(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const accountKey = await userKey(request, env);
  if (!accountKey) return json({ error: "Authenticated account required" }, 401);
  const bodyResult = await readJsonWithLimit(request, 4096);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const claimToken = typeof bodyResult.data?.claimToken === "string" ? bodyResult.data.claimToken : "";
  if (!claimToken) return json({ error: "A claim token is required" }, 400);

  const row = await env.DB.prepare(
    `SELECT session_key, generation_id, response_json, expires_at, claimed_by FROM guest_forges WHERE claim_token = ?`,
  ).bind(claimToken).first<{ session_key: string; generation_id: string; response_json: string; expires_at: number; claimed_by: string | null }>();
  if (!row || row.expires_at < Date.now() || row.claimed_by) return json({ error: "This preview is no longer available" }, 404);
  const loaded = await loadGeneration(env, `guest:${row.session_key}`, row.generation_id);
  if (!loaded.ok) return json({ error: "This preview is no longer available" }, 404);

  const claimed = await env.DB.prepare(
    `UPDATE guest_forges SET claimed_by = ?, claimed_at = ? WHERE claim_token = ? AND claimed_by IS NULL AND expires_at >= ?`,
  ).bind(accountKey, Date.now(), claimToken, Date.now()).run();
  if (Number(claimed.meta?.changes || 0) !== 1) return json({ error: "This preview is no longer available" }, 404);

  const generationId = await storeGeneration(env, accountKey, loaded.payload);
  return json({ ...JSON.parse(row.response_json), generationId, claimed: true, claimContext: loaded.payload.options });
}

export async function cleanupExpiredGuestForges(env: Env): Promise<void> {
  const now = Date.now();
  // Keep cleanup compatible with the small D1 test doubles used by the
  // scheduled-handler regression suite; atomicity is unnecessary for two
  // independent expiry deletes.
  await env.DB.prepare(`DELETE FROM guest_forges WHERE expires_at < ?`).bind(now).run();
  await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE expires_at < ?`).bind(now).run();
}
