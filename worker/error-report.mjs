// Durable error reports live in D1, not Workers Analytics Engine.
// Analytics Engine can accept writes from the Worker, but listing recent
// groups for the founder view requires the Cloudflare Analytics GraphQL API
// and an API token this Worker does not have. D1 is already bound, so the
// same request that stores a report can list it. Volume stays small because
// every report is redacted, rate-limited, and collapsed onto one row per
// fingerprint.
import {
  finalizeClientError,
  groupErrorRows,
  prepareClientError,
  prepareWorkerError,
  sanitizeBuild,
} from "../app/error-report-sanitize.mjs";

const MAX_BODY_BYTES = 8_000;
const CLIENT_LIMIT = 20;
const CLIENT_WINDOW_MS = 10 * 60 * 1000;
const CLIENT_GLOBAL_LIMIT = 120;
const CLIENT_GLOBAL_WINDOW_MS = 5 * 60 * 1000;
const WORKER_LIMIT = 300;
const WORKER_WINDOW_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ROWS = 2000;
const LIST_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export const ERROR_REPORT_INSERT_SQL = `INSERT INTO error_reports
      (fingerprint, source, kind, message, route, build_id, browser, user_agent, viewport, session_id, stack, context_json, count, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET
       count = count + 1,
       last_seen = excluded.last_seen,
       build_id = excluded.build_id,
       browser = COALESCE(excluded.browser, error_reports.browser),
       user_agent = COALESCE(excluded.user_agent, error_reports.user_agent),
       viewport = COALESCE(excluded.viewport, error_reports.viewport),
       session_id = COALESCE(excluded.session_id, error_reports.session_id),
       stack = COALESCE(excluded.stack, error_reports.stack),
       context_json = excluded.context_json`;

export const ERROR_REPORT_DELETE_OLD_SQL = "DELETE FROM error_reports WHERE last_seen < ?";

export const ERROR_REPORT_CAP_SQL = `DELETE FROM error_reports WHERE id IN (
      SELECT id FROM error_reports ORDER BY last_seen DESC LIMIT -1 OFFSET ?
    )`;

function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function rateKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`metaforge-error:${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function fingerprint(row) {
  const material = `${row.source}\n${row.kind}\n${row.message}\n${row.route}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Same atomic upsert as worker/api-hardening.ts, with a distinct endpoint
// name so error ingest does not share a budget with Forge generation.
async function takeRateSlot(env, userKey, endpoint, limit, windowMs) {
  const windowBucket = Math.floor(Date.now() / windowMs);
  const row = await env.DB.prepare(
    `INSERT INTO api_rate_limits (user_key, endpoint, window_bucket, requests, updated_at)
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(user_key, endpoint, window_bucket)
     DO UPDATE SET requests = requests + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING requests`,
  ).bind(userKey, endpoint, windowBucket).first();
  const requests = Number(row?.requests || 0);
  const retryAfterSeconds = Math.max(1, Math.ceil(((windowBucket + 1) * windowMs - Date.now()) / 1000));
  return { allowed: requests <= limit, retryAfterSeconds };
}

async function insertErrorReport(env, row, now) {
  const id = await fingerprint(row);
  const context = row.detail ? JSON.stringify({ detail: row.detail }) : "{}";
  await env.DB.prepare(ERROR_REPORT_INSERT_SQL).bind(
    id,
    row.source,
    row.kind,
    row.message,
    row.route,
    row.build,
    row.browser,
    row.userAgent,
    row.viewport,
    row.session,
    row.stack,
    context,
    now,
    now,
  ).run();
}

async function enforceClientRateLimit(request, env) {
  const key = await rateKey(request);
  const perCaller = await takeRateSlot(env, key, "error-report:client", CLIENT_LIMIT, CLIENT_WINDOW_MS);
  if (!perCaller.allowed) return json({ error: "Too many error reports" }, 429, { "Retry-After": String(perCaller.retryAfterSeconds) });
  const global = await takeRateSlot(env, "global", "error-report:client-global", CLIENT_GLOBAL_LIMIT, CLIENT_GLOBAL_WINDOW_MS);
  if (!global.allowed) return json({ error: "Too many error reports" }, 429, { "Retry-After": String(global.retryAfterSeconds) });
  return null;
}

// Same idea as worker/api-hardening.ts readJsonWithLimit: Content-Length is
// attacker-controlled, so the cap is the number of bytes actually read.
async function readJsonBody(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
  if (!request.body) return { ok: false, status: 400, error: "Invalid JSON" };
  const reader = request.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413, error: "Payload too large" };
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
    return { ok: true, data: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

export async function handleClientErrorReport(request, env, options = {}) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const limited = await enforceClientRateLimit(request, env);
    if (limited) return limited;
  } catch {
    console.error("client error report rate limit failed");
    return json({ error: "Error reports are unavailable" }, 503);
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = await readJsonBody(request, MAX_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.data;
  const prepared = prepareClientError(body);
  if (!prepared) return json({ error: "Invalid error report" }, 400);
  try {
    const row = finalizeClientError(prepared, {
      userAgent: request.headers.get("user-agent"),
      viewport: body.viewport,
      session: body.session,
      build: body.build,
    });
    await insertErrorReport(env, row, options.now || Date.now());
  } catch {
    console.error("client error report write failed");
    return json({ error: "Error reports are unavailable" }, 503);
  }
  return json({ recorded: true }, 202);
}

export async function recordWorkerException(env, input) {
  try {
    const error = input?.error;
    const row = prepareWorkerError({
      message: error instanceof Error ? error.message : String(error || "Worker exception"),
      stack: error instanceof Error ? error.stack : "",
      route: input?.route,
      userAgent: input?.userAgent,
      build: input?.buildId,
    });
    if (!row || !env?.DB) return;
    const budget = await takeRateSlot(env, "worker", "error-report:worker", WORKER_LIMIT, WORKER_WINDOW_MS);
    if (!budget.allowed) return;
    await insertErrorReport(env, row, Date.now());
  } catch {
    console.error("worker error report write failed");
  }
}

export async function handleFounderErrors(request, env, options = {}) {
  if (!options.founder) return json({ error: "Founder access required" }, 403);
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const now = options.now || Date.now();
  try {
    const result = await env.DB.prepare(
      `SELECT source, kind, message, route, build_id, browser, user_agent, viewport, session_id, stack, context_json, count, first_seen, last_seen
       FROM error_reports WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 200`,
    ).bind(now - LIST_WINDOW_MS).all();
    return json({
      generatedAt: new Date(now).toISOString(),
      windowDays: 14,
      build: sanitizeBuild(options.build),
      groups: groupErrorRows(result?.results || []),
    });
  } catch {
    return json({ error: "Error reports are unavailable. Apply migration 0019_error_reports.sql." }, 503);
  }
}

export async function cleanupErrorReports(env) {
  try {
    const cutoff = Date.now() - RETENTION_MS;
    await env.DB.prepare(ERROR_REPORT_DELETE_OLD_SQL).bind(cutoff).run();
    // Newest MAX_ROWS stay. OFFSET after ORDER BY last_seen DESC skips those
    // and deletes everything older. LIMIT -1 is SQLite's "no upper bound".
    await env.DB.prepare(ERROR_REPORT_CAP_SQL).bind(MAX_ROWS).run();
  } catch {
    console.error("error report cleanup failed");
  }
}
