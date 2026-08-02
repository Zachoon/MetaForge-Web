// Shared hardening primitives for public-facing engine endpoints
// (forge-generate.ts, forge-structural-analyze.ts). Two concerns live
// here: durable per-user rate limiting (D1-backed — Workers have no
// persistent memory between invocations, so an in-memory counter would
// reset on every cold start and be trivially bypassed) and a real
// decoded-byte-count body-size cap (Content-Length is attacker-supplied
// and not trustworthy on its own).

interface RateLimitEnv {
  DB: D1Database;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Atomic upsert+increment+RETURNING in one statement — a naive
// SELECT-then-UPDATE has a race window where two concurrent requests
// from the same user can both read "under limit" before either writes
// its increment, letting more through than the limit allows. D1 is
// SQLite-based and supports RETURNING on an INSERT .. ON CONFLICT
// upsert, so the count check happens against the actual post-increment
// value from a single round trip.
export async function checkRateLimit(
  env: RateLimitEnv,
  userKey: string,
  endpoint: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowBucket = Math.floor(Date.now() / windowMs);
  const row = await env.DB.prepare(
    `INSERT INTO api_rate_limits (user_key, endpoint, window_bucket, requests, updated_at)
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(user_key, endpoint, window_bucket)
     DO UPDATE SET requests = requests + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING requests`,
  )
    .bind(userKey, endpoint, windowBucket)
    .first<{ requests: number }>();
  const requests = Number(row?.requests || 0);
  const nextBucketStartsAt = (windowBucket + 1) * windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((nextBucketStartsAt - Date.now()) / 1000));
  return { allowed: requests <= limit, retryAfterSeconds };
}

// Rate-limit buckets are cheap individually but accumulate forever
// without cleanup — every distinct (user, endpoint, 5-minute-window)
// combination is a permanent row otherwise. Called from the existing
// hourly scheduled() handler alongside the data-goblin collectors.
// Uses SQLite's own datetime() for the cutoff rather than formatting one
// in JS: CURRENT_TIMESTAMP produces "YYYY-MM-DD HH:MM:SS" (space-
// separated, no offset), which does not compare correctly against a
// JS-built ISO string ("...THH:MM:SS.sssZ") — letting SQLite compute
// both sides avoids that format mismatch entirely. Two hours is
// generous headroom past any current rate-limit window (both current
// limiters use 5-minute windows).
export async function cleanupExpiredRateLimits(env: RateLimitEnv, maxAgeHours = 2): Promise<number> {
  const result = await env.DB.prepare(
    `DELETE FROM api_rate_limits WHERE updated_at < datetime('now', ?)`,
  )
    .bind(`-${maxAgeHours} hours`)
    .run();
  return Number(result.meta?.changes || 0);
}

export type BodyReadResult =
  | { ok: true; data: any }
  | { ok: false; status: 400 | 413; error: string };

// Reads and JSON-parses a request body while enforcing a real cap on
// decoded bytes actually read, not just the (spoofable, sometimes
// absent, and chunked-encoding-defeatable) Content-Length header.
// Aborts the read the moment the cap is exceeded rather than buffering
// an arbitrarily large body first and checking afterward.
export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<BodyReadResult> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return { ok: false, status: 413, error: "Request body is too large" };

  if (!request.body) return { ok: false, status: 400, error: "Invalid JSON" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413, error: "Request body is too large" };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(body));
    return { ok: true, data };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}
