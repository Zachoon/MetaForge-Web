const PUBLIC_EVENTS = new Set([
  "landing_view", "forge_started", "forge_succeeded", "forge_failed",
  "coaching_opened", "experiment_started", "save_continue_clicked",
  "coach_brief_viewed", "coach_why_opened", "coach_recommendation_viewed",
  "coach_feedback_submitted", "coach_confidence_opened",
]);
const OPERATIONAL_EVENTS = new Set(["generation_succeeded", "generation_failed"]);
const MAX_BODY_BYTES = 8_000;

interface TelemetryEnv { DB: D1Database }

const clean = (value: unknown, max = 100) =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9._ -]/g, "").slice(0, max) || null : null;

export async function handleLaunchTelemetry(request: Request, env: TelemetryEnv): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return Response.json({ error: "Payload too large" }, { status: 413 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const event = clean(body?.event, 40);
  if (!event || !PUBLIC_EVENTS.has(event)) return Response.json({ error: "Unknown event" }, { status: 400 });
  const session = clean(body?.session, 64);
  if (!session) return Response.json({ error: "Anonymous session required" }, { status: 400 });
  const campaign = body?.campaign && typeof body.campaign === "object" ? body.campaign : {};
  const properties = body?.properties && typeof body.properties === "object"
    ? JSON.stringify(body.properties, (_key, value) => typeof value === "string" ? value.slice(0, 120) : value).slice(0, 2_000)
    : "{}";
  await env.DB.prepare(`INSERT INTO launch_events
    (event_name, session_id, source, medium, campaign, content, term, properties_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(event, session, clean(campaign.source), clean(campaign.medium), clean(campaign.campaign), clean(campaign.content), clean(campaign.term), properties, Date.now()).run();
  return Response.json({ recorded: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}

export async function recordOperationalGeneration(
  env: TelemetryEnv,
  outcome: "generation_succeeded" | "generation_failed",
  properties: Record<string, unknown>,
) {
  if (!OPERATIONAL_EVENTS.has(outcome)) return;
  await env.DB.prepare(`INSERT INTO launch_events
    (event_name, session_id, properties_json, occurred_at) VALUES (?, NULL, ?, ?)`)
    .bind(outcome, JSON.stringify(properties).slice(0, 2_000), Date.now()).run();
}
