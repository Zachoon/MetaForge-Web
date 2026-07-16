interface AccountEnv { DB: D1Database }

type StoredBench = { bench_json: string; revision: number; updated_at: string };

const EMAIL_HEADER = "cf-access-authenticated-user-email";
const MAX_BENCH_BYTES = 2_000_000;
const FEEDBACK_CATEGORIES = new Set(["broken", "confusing", "missed-interaction", "helped", "idea"]);

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function userKey(request: Request) {
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

export async function handleFounderFeedback(request: Request, env: AccountEnv): Promise<Response> {
  const key = await userKey(request);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  let payload: { category?: unknown; message?: unknown; context?: unknown };
  try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const category = String(payload.category || "");
  const message = String(payload.message || "").trim();
  if (!FEEDBACK_CATEGORIES.has(category) || message.length < 3 || message.length > 5000) return json({ error: "Valid category and message required" }, 400);
  const context = payload.context && typeof payload.context === "object" ? JSON.stringify(payload.context).slice(0, 20_000) : "{}";
  await env.DB.prepare("INSERT INTO founder_feedback (user_key, category, message, context_json) VALUES (?, ?, ?, ?)").bind(key, category, message, context).run();
  return json({ saved: true }, 201);
}

export async function handlePlayerProfile(request: Request, env: AccountEnv): Promise<Response> {
  const key=await userKey(request); if(!key)return json({error:"Authenticated account required"},401);
  if(request.method==="GET"){
    const row=await env.DB.prepare("SELECT profile_json, revision, updated_at FROM account_player_profiles WHERE user_key=?").bind(key).first<any>();
    return json(row?{profile:JSON.parse(row.profile_json),revision:row.revision,updatedAt:row.updated_at}:{profile:{},revision:0,updatedAt:null});
  }
  if(request.method!=="PUT")return json({error:"Method not allowed"},405);
  let body:any;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
  const profile=body.profile&&typeof body.profile==="object"?body.profile:null;if(!profile)return json({error:"Valid profile required"},400);
  const serialized=JSON.stringify(profile).slice(0,12000);
  await env.DB.prepare("INSERT INTO account_player_profiles (user_key,profile_json,revision,updated_at) VALUES (?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_key) DO UPDATE SET profile_json=excluded.profile_json,revision=account_player_profiles.revision+1,updated_at=CURRENT_TIMESTAMP").bind(key,serialized).run();
  return json({saved:true});
}
