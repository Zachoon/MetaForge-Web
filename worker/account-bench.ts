interface AccountEnv { DB: D1Database }

type StoredBench = { bench_json: string; revision: number; updated_at: string };

const EMAIL_HEADER = "cf-access-authenticated-user-email";
const MAX_BENCH_BYTES = 2_000_000;

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function userKey(request: Request) {
  const email = request.headers.get(EMAIL_HEADER)?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`metaforge-account:${email}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validBench(value: unknown): value is { schemaVersion: number; families: unknown[] } {
  if (!value || typeof value !== "object") return false;
  const bench = value as { schemaVersion?: unknown; families?: unknown };
  return bench.schemaVersion === 1 && Array.isArray(bench.families) && bench.families.length <= 500;
}

async function load(env: AccountEnv, key: string) {
  return env.DB.prepare("SELECT bench_json, revision, updated_at FROM account_deck_benches WHERE user_key = ?").bind(key).first<StoredBench>();
}

export async function handleAccountBench(request: Request, env: AccountEnv): Promise<Response> {
  const key = await userKey(request);
  if (!key) return json({ error: "Authenticated account required" }, 401);

  if (request.method === "GET") {
    const row = await load(env, key);
    if (!row) return json({ bench: null, revision: 0, updatedAt: null });
    try { return json({ bench: JSON.parse(row.bench_json), revision: row.revision, updatedAt: row.updated_at }); }
    catch { return json({ error: "Stored account data is invalid" }, 500); }
  }

  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405, { Allow: "GET, PUT" });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BENCH_BYTES) return json({ error: "Deck Bench is too large" }, 413);
  let payload: { bench?: unknown; baseRevision?: unknown };
  try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!validBench(payload.bench)) return json({ error: "Invalid Deck Bench" }, 400);
  const serialized = JSON.stringify(payload.bench);
  if (new TextEncoder().encode(serialized).byteLength > MAX_BENCH_BYTES) return json({ error: "Deck Bench is too large" }, 413);

  const current = await load(env, key);
  const currentRevision = current?.revision || 0;
  const baseRevision = Number(payload.baseRevision ?? 0);
  if (baseRevision !== currentRevision) {
    return json({ error: "Account data changed on another device", bench: current ? JSON.parse(current.bench_json) : null, revision: currentRevision, updatedAt: current?.updated_at || null }, 409);
  }
  const nextRevision = currentRevision + 1;
  await env.DB.prepare(`INSERT INTO account_deck_benches (user_key, bench_json, revision, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_key) DO UPDATE SET bench_json = excluded.bench_json, revision = excluded.revision, updated_at = CURRENT_TIMESTAMP`)
    .bind(key, serialized, nextRevision).run();
  return json({ saved: true, revision: nextRevision });
}
