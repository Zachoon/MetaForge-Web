// Who owns a guided build: a verified account, or an anonymous guest.
//
// Guests get the same guided loop as accounts. Their session is the signed
// mf_guest cookie guest-forge.ts already issues (HMAC over a random id with
// GUEST_SESSION_SECRET), so no new storage binding is needed: guided state
// lives in the existing D1 tables (forge_generations, guided_drafts) under
// the key `guest:<id>`, exactly how guest-generate already keys its
// generations. A guest cookie is only minted at the start of a guided build,
// and only after Turnstile passes; every later guided request must present
// a valid cookie and never mints one.
import { userKey } from "./account-bench";
import { checkRateLimit } from "./api-hardening";
import { GUEST_COOKIE, cookieValue, hmac, sessionFromRequest, validateTurnstile } from "./guest-session";

export interface GuidedIdentityEnv {
  DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  GUEST_SESSION_SECRET?: string;
}

export type GuidedIdentity = {
  key: string;
  guest: boolean;
  // Set only when a new guest session was minted for this response.
  setCookie?: string;
  // Opaque token a signed-in player uses to claim this guest build.
  claimToken?: string;
};

const GUEST_TTL_SECONDS = 24 * 60 * 60;
// Anti-abuse only, keyed by an HMAC of IP + user agent (never stored raw).
// Generous on purpose; see guest-forge.ts on shared networks.
export const GUEST_LIMITS = Object.freeze({
  startPerNetworkPerDay: 30,
  startPerSessionPerHour: 6,
  stepsPerNetworkPerHour: 900,
  completePerSessionPerDay: 6,
  completePerNetworkPerDay: 30,
});
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const guestCookieHeader = (value: string) =>
  `${GUEST_COOKIE}=${encodeURIComponent(value)}; Max-Age=${GUEST_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;

async function guestClaimToken(secret: string, id: string) {
  return `${id}.${await hmac(secret, `guided-claim:${id}`)}`;
}

/** Verifies a guided claim token and returns the guest id it names. */
export async function guestIdFromClaimToken(env: GuidedIdentityEnv, token: unknown): Promise<string | null> {
  if (!env.GUEST_SESSION_SECRET || typeof token !== "string" || token.length > 200) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return signature === await hmac(env.GUEST_SESSION_SECRET, `guided-claim:${id}`) ? id : null;
}

async function existingGuest(request: Request, env: GuidedIdentityEnv): Promise<string | null> {
  if (!env.GUEST_SESSION_SECRET) return null;
  const raw = cookieValue(request);
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  return id && signature && signature === await hmac(env.GUEST_SESSION_SECRET, id) ? id : null;
}

async function networkKey(request: Request, env: GuidedIdentityEnv) {
  return hmac(env.GUEST_SESSION_SECRET || "", `${request.headers.get("CF-Connecting-IP") || "unknown"}|${request.headers.get("user-agent") || "unknown"}`);
}

/** Account first; otherwise the guest named by a valid signed cookie. */
export async function guidedIdentity(request: Request, env: GuidedIdentityEnv): Promise<GuidedIdentity | null> {
  const account = await userKey(request, env);
  if (account) return { key: account, guest: false };
  const id = await existingGuest(request, env);
  if (!id) return null;
  return { key: `guest:${id}`, guest: true, claimToken: await guestClaimToken(env.GUEST_SESSION_SECRET!, id) };
}

type Limited = { ok: false; response: Response };
const limited = (error: string, retryAfterSeconds: number, code = "RATE_LIMITED"): Limited => ({
  ok: false,
  response: Response.json({ error, code, retryAfterSeconds }, {
    status: 429,
    headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfterSeconds) },
  }),
});

/**
 * Identity for the start of a guided build. Accounts pass straight through.
 * Guests must pass Turnstile here (the only place a guest session is
 * minted), and are rate limited per network and per session.
 */
export async function guidedStartIdentity(request: Request, env: GuidedIdentityEnv, turnstileToken: unknown): Promise<{ ok: true; identity: GuidedIdentity } | Limited> {
  const account = await userKey(request, env);
  if (account) return { ok: true, identity: { key: account, guest: false } };
  if (!env.TURNSTILE_SECRET_KEY || !env.GUEST_SESSION_SECRET) {
    return { ok: false, response: Response.json({ error: "Guest building is not available right now. Sign in to build.", code: "GUEST_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } }) };
  }
  if (!(await validateTurnstile(request, env.TURNSTILE_SECRET_KEY, turnstileToken))) {
    return { ok: false, response: Response.json({ error: "Please complete the human verification and try again.", code: "HUMAN_VERIFICATION_REQUIRED" }, { status: 400, headers: { "Cache-Control": "no-store" } }) };
  }
  const network = await checkRateLimit(env, await networkKey(request, env), "guided-guest-start-network", GUEST_LIMITS.startPerNetworkPerDay, DAY);
  if (!network.allowed) return limited("Too many guided builds have started from this network today. Try again later, or sign in.", network.retryAfterSeconds);
  const session = await sessionFromRequest(request, env.GUEST_SESSION_SECRET);
  const perSession = await checkRateLimit(env, `guest:${session.id}`, "guided-guest-start", GUEST_LIMITS.startPerSessionPerHour, HOUR);
  if (!perSession.allowed) return limited("You've started several builds in the last hour. Continue one, or try again shortly.", perSession.retryAfterSeconds);
  const minted = cookieValue(request) !== session.value;
  return {
    ok: true,
    identity: {
      key: `guest:${session.id}`,
      guest: true,
      claimToken: await guestClaimToken(env.GUEST_SESSION_SECRET, session.id),
      ...(minted ? { setCookie: guestCookieHeader(session.value) } : {}),
    },
  };
}

/** Extra per-network ceiling for a guest's many small guided steps. */
export async function guestStepLimit(request: Request, env: GuidedIdentityEnv, identity: GuidedIdentity): Promise<Limited | null> {
  if (!identity.guest) return null;
  const result = await checkRateLimit(env, await networkKey(request, env), "guided-guest-steps-network", GUEST_LIMITS.stepsPerNetworkPerHour, HOUR);
  return result.allowed ? null : limited("This network is sending a lot of guided steps. Wait a moment and try again.", result.retryAfterSeconds);
}

/** Finishing runs the full deck analysis, so guests get a tighter ceiling. */
export async function guestCompleteLimit(request: Request, env: GuidedIdentityEnv, identity: GuidedIdentity): Promise<Limited | null> {
  if (!identity.guest) return null;
  const perSession = await checkRateLimit(env, identity.key, "guided-guest-complete", GUEST_LIMITS.completePerSessionPerDay, DAY);
  if (!perSession.allowed) return limited("You've finished several decks today as a guest. Sign in to keep building.", perSession.retryAfterSeconds);
  const network = await checkRateLimit(env, await networkKey(request, env), "guided-guest-complete-network", GUEST_LIMITS.completePerNetworkPerDay, DAY);
  return network.allowed ? null : limited("Too many decks were finished from this network today. Try again later, or sign in.", network.retryAfterSeconds);
}
