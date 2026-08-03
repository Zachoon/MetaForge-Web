// Quantity-aware multi-card cut-and-refill laboratory. The browser sends
// only the current list and explicit cuts; the authoritative verified pool
// and commission stay behind the owner-bound generationId in D1.
import { forgeMultiSlotRefills } from "../app/native-masterwork-engine.mjs";
import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { loadGeneration } from "./forge-generation-store";

interface Env { DB: D1Database }
type Row = { name: string; quantity: number };

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("en");
const MAX_BODY_BYTES = 128 * 1024;
const MAX_ROWS = 300;
const MAX_CUTS = 12;
const MAX_NAME = 400;

function rows(raw: unknown): Row[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ROWS) return null;
  return raw.map((entry: any) => ({
    name: String(entry?.name || "").slice(0, MAX_NAME),
    quantity: Number.isFinite(entry?.quantity) ? Math.max(1, Math.min(99, Math.trunc(entry.quantity))) : 0,
  })).filter((entry) => entry.name && entry.quantity > 0);
}

function cuts(raw: unknown): Row[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_CUTS) return null;
  return raw.map((entry: any) => ({
    name: String(entry?.name || "").slice(0, MAX_NAME),
    quantity: Number.isFinite(entry?.quantity) ? Math.max(1, Math.min(4, Math.trunc(entry.quantity))) : 0,
  })).filter((entry) => entry.name && entry.quantity > 0);
}

function subtractCuts(current: Row[], requested: Row[]) {
  const remaining = current.map((row) => ({ ...row }));
  let total = 0;
  for (const cut of requested) {
    const row = remaining.find((entry) => normalize(entry.name) === normalize(cut.name));
    if (!row || cut.quantity > row.quantity) return null;
    row.quantity -= cut.quantity;
    total += cut.quantity;
  }
  return { rows: remaining.filter((row) => row.quantity > 0), total };
}

export async function handleForgeMultiRefill(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  const limited = await checkRateLimit(env, key, "forge-multi-refill", 40, 5 * 60 * 1000);
  if (!limited.allowed) return json({ error: "Rate limit exceeded", retryAfterSeconds: limited.retryAfterSeconds }, 429, { "Retry-After": String(limited.retryAfterSeconds) });

  const parsed = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const generationId = typeof parsed.data?.generationId === "string" ? parsed.data.generationId : "";
  const currentRows = rows(parsed.data?.currentRows);
  const requestedCuts = cuts(parsed.data?.cuts);
  if (!generationId) return json({ error: "generationId is required" }, 400);
  if (!currentRows) return json({ error: `currentRows must be an array of at most ${MAX_ROWS} valid rows` }, 400);
  if (!requestedCuts) return json({ error: `cuts must contain 1-${MAX_CUTS} valid entries` }, 400);

  const subtracted = subtractCuts(currentRows, requestedCuts);
  if (!subtracted) return json({ error: "Every cut must exist in the current deck at the requested quantity" }, 400);
  const generation = await loadGeneration(env, key, generationId);
  if (!generation.ok || !generation.payload.forgeInput) {
    return json({ error: "This generation is no longer available. Regenerate before refilling slots." }, 404);
  }

  try {
    const stored = generation.payload;
    const commanderNames = new Set([
      (stored.forgeInput as any).commander?.name,
      (stored.forgeInput as any).secondCommander?.name,
    ].filter(Boolean).map((name) => normalize(String(name))));
    if (requestedCuts.some((cut) => commanderNames.has(normalize(cut.name)))) {
      return json({ error: "A commander cannot be cut in a refill experiment" }, 400);
    }
    const report = forgeMultiSlotRefills({
      ...stored.forgeInput,
      cards: stored.cardPool,
      seed: Number((stored.forgeInput as any).seed || Date.now()) + subtracted.total,
    }, subtracted.rows, requestedCuts);
    const candidates = (report.packages || []).slice(0, 3);
    if (!candidates.length) return json({ error: "The Forge could not fill every open slot without breaking the commission." }, 422);
    return json({
      cuts: requestedCuts,
      slots: subtracted.total,
      packages: candidates,
      summary: `The Forge filled ${subtracted.total} open slot${subtracted.total === 1 ? "" : "s"} while preserving deck size, legality, the remaining list, and every explicit exclusion.`,
      boundary: "These are modeled replacement packages. Test the chosen revision before treating it as an improvement.",
    });
  } catch (error) {
    console.error("forge-multi-refill failed", error);
    return json({ error: "The Forge could not complete this refill experiment." }, 500);
  }
}
