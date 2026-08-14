import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { generateForgeResult, type ForgeGenerationResult } from "./forge-generate";
import { buildClientNativeReport, loadGeneration, storeGeneration } from "./forge-generation-store";

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

// Guest requests pass through two independent gates, and conflating them
// is exactly the bug this file used to have:
//
//   Gate B — guest_forge_sessions, keyed by the signed per-browser cookie
//   (sessionFromRequest below) — is the REAL one-preview entitlement. It
//   is healthy: a browser gets exactly one free preview, tracked by an
//   identity that follows that browser, not its network.
//
//   Gate A — NETWORK_RATE_LIMIT_PER_DAY below, keyed by IP+User-Agent —
//   is anti-abuse infrastructure ONLY. It must never be read, logged, or
//   messaged as if it were an entitlement: a network is not a player, and
//   a household/dorm/game-store/library/school/VPN-exit/carrier-NAT
//   sharing one IP+UA is not one "guest" that used up a shared preview.
//   Its old 3/day threshold was tuned against imaginary coordinated abuse
//   and was, in production, blocking real individual users retrying a
//   few times after an unrelated hiccup. Turnstile plus Gate B already
//   protect the free preview; this only needs to catch genuine
//   high-volume abuse, so it stays generous.
const NETWORK_RATE_LIMIT_PER_DAY = 50;
const NETWORK_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// A pending guest_forge_sessions row is a lease on this signed identity's
// one preview, not a permanent lock. A local reproduction of the exact
// production request (Commander/Atraxa, native mode, real Scryfall data)
// completed in ~12s end to end; production load, Scryfall retries, or a
// platform-level termination could push that further, but nothing about
// a legitimate single Forge attempt should approach minutes. 3 minutes
// gives generous headroom above any real generation while remaining
// drastically shorter than the 24h TTL a stuck 'pending' row used to
// block a guest for — see the reclaim logic below.
const PENDING_SESSION_LEASE_MS = 3 * 60 * 1000;

// A traced production incident found generateForgeResult's full body can
// reach ~2.3MB — dominated by nativeReport.structuralAnalysis (~79%) and
// the outer cardPool (~16%) — and that persisting the WHOLE thing into
// guest_forges.response_json hit D1's hard per-value limit with
// SQLITE_TOOBIG, discarding an otherwise-successful generation. A full
// audit of every client/claim/account/one-slot/multi-refill read site
// confirmed structuralAnalysis is never read from this payload by
// anyone — the client's own structural-analysis UI makes an independent
// authenticated request instead, which guests never even reach — and the
// outer cardPool is assigned to state but never read back. Both are
// already fully served elsewhere (forge_generations, or Scryfall directly)
// for the flows that actually need them. This function keeps only what
// the masterworks picker, workbench, and claim-restoration UI genuinely
// render, matching the field-by-field trace in the P0 finalization report.
//
// The immediate browser response must stay small enough to survive the
// Worker→browser hop. Live Commander builds measured ~3.8MB when the full
// nativeReport (dominated by structuralAnalysis) and cardPool were echoed
// wholesale — enough to discard an otherwise-finished Masterwork. Analysis
// is re-fetched via structural-analyze; the pool lives under generationId.
function buildClientForgePayload(body: Record<string, unknown>): Record<string, unknown> {
  const nativeReport = body.nativeReport;
  const clientBody: Record<string, unknown> = {
    ...body,
    nativeReport: buildClientNativeReport(nativeReport),
  };
  // Prefer the opaque generation handle; only keep cardPool when the
  // generate path had to skip persistence and already included a pool.
  if (body.generationId) delete clientBody.cardPool;
  return clientBody;
}

function buildGuestClaimPayload(body: Record<string, unknown>): Record<string, unknown> {
  const nativeReport = buildClientNativeReport(body.nativeReport || {});
  const claimPayload: Record<string, unknown> = { nativeReport };
  // Only present for the imported/refine path; harmless to omit otherwise.
  if ("importWarnings" in body) claimPayload.importWarnings = body.importWarnings;
  if ("deckUnderstanding" in body) claimPayload.deckUnderstanding = body.deckUnderstanding;
  if ("reviewFocusResult" in body) claimPayload.reviewFocusResult = body.reviewFocusResult;
  if ("colors" in body) claimPayload.colors = body.colors;
  return claimPayload;
}

// Comfortably below D1's actual hard limit (which is what produced
// SQLITE_TOOBIG in the first place) — the compact payload above measures
// well under 200KB in production-equivalent testing, so 500KB gives ~2.5x
// headroom for format/candidate-count variance while still catching any
// future accidental re-bloat (e.g. a field added back to the compact list
// without checking its size) long before it could ever hit D1's real
// ceiling again. The application must be the first validator here, not D1.
const MAX_CLAIM_PAYLOAD_BYTES = 500_000;
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

// Non-PII structured logging so a support/observability pass can tell
// which gate actually fired without reproducing it by hand — never the
// raw IP, cookie value, session key, or full deck/nativeReport, only
// operational counters and phase timing. This is what should make the
// *next* "the Forge did nothing" report immediately legible: which phase
// (catalog/generation/validation/persistence/finalization) the time went
// into, without needing to reproduce it by hand.
function logGuestGateEvent(event: Record<string, unknown>) {
  console.log(JSON.stringify({ event: "guest_forge_gate", ...event }));
}

export async function handleGuestForge(request: Request, env: Env): Promise<Response> {
  const totalStart = Date.now();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  if (!env.TURNSTILE_SECRET_KEY || !env.GUEST_SESSION_SECRET) {
    return json({ error: "Guest forging is not available yet" }, 503);
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data;
  const hadGuestCookie = cookieValue(request) !== null;
  if (!(await validateTurnstile(request, env.TURNSTILE_SECRET_KEY, body?.turnstileToken))) {
    logGuestGateEvent({ outcome: "human_verification_required", hadGuestCookie });
    return json({ error: "Please complete the human verification and try again.", code: "HUMAN_VERIFICATION_REQUIRED" }, 400);
  }

  const session = await sessionFromRequest(request, env.GUEST_SESSION_SECRET);
  const now = Date.now();
  const gateStart = Date.now();

  // Gate A — anti-abuse only. See the module-level note above: this must
  // never imply a specific player's preview was consumed, because it has
  // no idea whether it was — it only knows this IP+UA made a lot of
  // requests recently.
  const networkSignal = await hmac(
    env.GUEST_SESSION_SECRET,
    `${request.headers.get("CF-Connecting-IP") || "unknown"}|${request.headers.get("user-agent") || "unknown"}`,
  );
  const networkLimit = await checkRateLimit(env, networkSignal, "guest-forge-network", NETWORK_RATE_LIMIT_PER_DAY, NETWORK_RATE_WINDOW_MS);
  if (!networkLimit.allowed) {
    logGuestGateEvent({
      outcome: "network_rate_limited",
      hadGuestCookie,
      threshold: NETWORK_RATE_LIMIT_PER_DAY,
    });
    return json(
      {
        error: "Too many Forge attempts have come from this network recently. Your preview has not been used. Try again later, or sign in to continue.",
        code: "NETWORK_RATE_LIMITED",
        retryAfterSeconds: networkLimit.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(networkLimit.retryAfterSeconds) },
    );
  }

  // Gate B — the real entitlement. A conflict here means this exact
  // signed browser identity already has a 'pending' or 'used' row.
  const reserved = await env.DB.prepare(
    `INSERT INTO guest_forge_sessions (session_key, status, created_at, expires_at)
     VALUES (?, 'pending', ?, ?)
     ON CONFLICT(session_key) DO NOTHING`,
  ).bind(session.id, now, now + TTL_MS).run();
  let holdsReservation = Number(reserved.meta?.changes || 0) === 1;
  let reclaimedStaleLease = false;
  if (!holdsReservation) {
    // A 'pending' row is a lease, not a permanent lock. It normally
    // transitions to 'used' (success) or gets deleted (any caught
    // failure) within seconds — see below. A row that's still 'pending'
    // well past PENDING_SESSION_LEASE_MS means whatever held it never
    // got the chance to do either, almost certainly because the request
    // was terminated in a way no try/catch in this file or worker/
    // index.ts's outer safety net could intercept. Reclaim is one atomic
    // UPDATE guarded by both status='pending' and staleness, so two
    // concurrent requests can never both believe they reclaimed it, and
    // a 'used' row (a real, completed entitlement) can never match this
    // WHERE clause at all.
    const reclaim = await env.DB.prepare(
      `UPDATE guest_forge_sessions SET created_at = ?, expires_at = ?
       WHERE session_key = ? AND status = 'pending' AND created_at < ?`,
    ).bind(now, now + TTL_MS, session.id, now - PENDING_SESSION_LEASE_MS).run();
    if (Number(reclaim.meta?.changes || 0) === 1) {
      holdsReservation = true;
      reclaimedStaleLease = true;
    }
  }
  let ephemeralContinue = false;
  if (!holdsReservation) {
    // A genuinely-used entitlement may still have a real, unclaimed
    // result sitting behind it. A fresh, not-yet-stale 'pending' row is a
    // second concurrent request for the same guest — do not steal that
    // in-flight forge. A 'used' row means this guest already got their
    // one persisted preview: they can keep forging (ephemeral), and sign
    // in only if they want to SAVE.
    const existingClaim = await env.DB.prepare(
      `SELECT claim_token FROM guest_forges WHERE session_key = ? AND claimed_by IS NULL AND expires_at >= ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(session.id, now).first<{ claim_token: string }>();
    const sessionRow = await env.DB.prepare(
      `SELECT status FROM guest_forge_sessions WHERE session_key = ?`,
    ).bind(session.id).first<{ status: string }>();
    if (sessionRow?.status !== "used") {
      logGuestGateEvent({ outcome: "preview_already_used", hadGuestCookie, hasClaimableResult: Boolean(existingClaim) });
      return json(
        {
          error: "This Forge is already in progress. Wait a moment and try again. You can keep forging without an account.",
          code: "GUEST_PREVIEW_ALREADY_USED",
          claimToken: existingClaim?.claim_token || undefined,
        },
        409,
      );
    }
    ephemeralContinue = true;
    logGuestGateEvent({ outcome: "ephemeral_continue", hadGuestCookie, hasClaimableResult: Boolean(existingClaim) });
  }
  const gate_ms = Date.now() - gateStart;

  // Declared outside the try so the outer catch (below) can still report
  // generation.timing when the failure happens AFTER generateForgeResult
  // already succeeded — the exact gap the live production trace exposed:
  // that catch's log used to carry only gate_ms/total_ms, even though
  // catalog/generation/validation had already completed and their timing
  // was sitting right there in scope, just not included in the log call.
  let generation: ForgeGenerationResult | undefined;
  const timingFields = () => {
    const t = generation?.timing;
    return {
      catalog_ms: t?.catalogMs ?? null,
      generation_ms: t?.generationMs ?? null,
      validation_ms: t?.validationMs ?? null,
      persistence_ms: t?.persistenceMs ?? null,
      scryfall_request_count: t?.scryfallRequestCount ?? null,
      candidate_count: t?.candidateCount ?? null,
      target_size: t?.targetSize ?? null,
    };
  };

  try {
    const forgeBody = { ...body };
    delete forgeBody.turnstileToken;
    const internalRequest = new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forgeBody),
    });
    const guestKey = `guest:${session.id}`;
    // generateForgeResult returns structured data, not a Response — the
    // old code called handleForgeGenerateForKey (which built a Response)
    // and then immediately forgeResponse.json()'d it back apart in this
    // same isolate: a full parse of the single largest object in the
    // request, for no reason beyond the old function signature. Using the
    // object directly removes that parse entirely.
    generation = await generateForgeResult(internalRequest, env, guestKey);
    if (generation.status !== 200) {
      if (!ephemeralContinue) {
        await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE session_key = ? AND status = 'pending'`).bind(session.id).run();
      }
      logGuestGateEvent({
        outcome: "retryable_generation_failure",
        hadGuestCookie,
        reclaimedStaleLease,
        status: generation.status,
        code: typeof generation.body.code === "string" ? generation.body.code : null,
        gate_ms,
        ...timingFields(),
        total_ms: Date.now() - totalStart,
      });
      return json(generation.body, generation.status);
    }

    const finalizationStart = Date.now();
    const { generationId, ...storedBody } = generation.body as Record<string, unknown> & { generationId?: unknown };
    const claimToken = crypto.randomUUID();
    // Persisted production trace: a fully successful generation (engine
    // ran, validated, forge_generations written) still discarded the
    // player's deck here, because storedBody — the FULL response,
    // dominated by nativeReport.structuralAnalysis — exceeded D1's
    // per-value limit and INSERT threw SQLITE_TOOBIG. A field-by-field
    // audit confirmed structuralAnalysis (and the outer cardPool) are
    // never read by any guest/claim/account/one-slot/multi-refill code
    // path, so buildGuestClaimPayload keeps only what those surfaces
    // actually render — see its own comment for the full trace summary.
    // D1 must never be the first thing to notice an oversized payload
    // again, so the size check below runs before any write is attempted.
    const claimBody = buildGuestClaimPayload(storedBody);
    const claimJson = JSON.stringify(claimBody);
    const claim_payload_bytes = byteLength(claimJson);
    if (claim_payload_bytes > MAX_CLAIM_PAYLOAD_BYTES) {
      if (!ephemeralContinue) {
        await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE session_key = ? AND status = 'pending'`).bind(session.id).run();
      }
      logGuestGateEvent({
        outcome: "claim_payload_too_large",
        hadGuestCookie,
        reclaimedStaleLease,
        status: 500,
        code: "GENERATION_FAILED",
        gate_ms,
        ...timingFields(),
        finalization_ms: Date.now() - finalizationStart,
        total_ms: Date.now() - totalStart,
        claim_payload_bytes,
      });
      console.error("guest forge claim payload exceeded the application size ceiling", { claim_payload_bytes, ceiling: MAX_CLAIM_PAYLOAD_BYTES });
      return json({ error: "The Forge could not complete this preview. Please try again.", code: "GENERATION_FAILED" }, 500);
    }
    if (ephemeralContinue) {
      await env.DB.prepare(
        `INSERT INTO guest_forges (claim_token, session_key, generation_id, response_json, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(claimToken, session.id, String(generationId || ""), claimJson, now, now + TTL_MS).run();
    } else {
      await env.DB.batch([
        env.DB.prepare(`UPDATE guest_forge_sessions SET status = 'used' WHERE session_key = ? AND status = 'pending'`).bind(session.id),
        env.DB.prepare(
          `INSERT INTO guest_forges (claim_token, session_key, generation_id, response_json, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(claimToken, session.id, String(generationId || ""), claimJson, now, now + TTL_MS),
      ]);
    }
    // The browser response stays the FULL body (buildClientForgePayload is
    // a pass-through for this hotfix — see its own comment) plus two
    // fields the stored copy deliberately omits: claimToken (regenerated
    // fresh on every claim lookup, not this request's problem to persist)
    // and guestPreview:true (a marker for THIS response; handleGuestClaim
    // later spreads the stored copy directly into its own response, and
    // neither field belongs in a claimed-by-an-account result). This is
    // now genuinely a different shape from claimBody above, not just a
    // different set of extra fields on top of the same object — the two
    // no longer need to be equal, and code must not assume they are.
    const clientBody = { ...buildClientForgePayload(storedBody), claimToken, guestPreview: true };
    const responseString = JSON.stringify(clientBody);
    const finalization_ms = Date.now() - finalizationStart;
    logGuestGateEvent({
      outcome: "success",
      hadGuestCookie,
      reclaimedStaleLease,
      gate_ms,
      ...timingFields(),
      finalization_ms,
      total_ms: Date.now() - totalStart,
      response_bytes: responseString.length,
      claim_payload_bytes,
      final_size: generation.timing.finalSize,
    });
    return new Response(responseString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": `${COOKIE}=${encodeURIComponent(session.value)}; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  } catch (error) {
    if (!ephemeralContinue) {
      await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE session_key = ? AND status = 'pending'`).bind(session.id).run();
    }
    logGuestGateEvent({
      outcome: "retryable_generation_failure",
      hadGuestCookie,
      reclaimedStaleLease,
      status: 500,
      code: "GENERATION_FAILED",
      gate_ms,
      ...timingFields(),
      total_ms: Date.now() - totalStart,
    });
    console.error("guest forge failed", error);
    return json({ error: "The Forge could not complete this preview. Please try again.", code: "GENERATION_FAILED" }, 500);
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

  // Best-effort re-key under the account. Claim restoration still returns
  // the compact guest response even if forge_generations cannot accept a
  // second copy — labs degrade without generationId; the deck does not.
  const generationId = await storeGeneration(env, accountKey, loaded.payload);
  return json({
    ...JSON.parse(row.response_json),
    ...(generationId ? { generationId } : {}),
    claimed: true,
    claimContext: loaded.payload.options,
  });
}

export async function cleanupExpiredGuestForges(env: Env): Promise<void> {
  const now = Date.now();
  // Keep cleanup compatible with the small D1 test doubles used by the
  // scheduled-handler regression suite; atomicity is unnecessary for two
  // independent expiry deletes.
  await env.DB.prepare(`DELETE FROM guest_forges WHERE expires_at < ?`).bind(now).run();
  await env.DB.prepare(`DELETE FROM guest_forge_sessions WHERE expires_at < ?`).bind(now).run();
}
