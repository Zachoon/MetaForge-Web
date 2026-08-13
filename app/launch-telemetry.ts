export type LaunchEvent =
  | "landing_view"
  | "forge_started"
  | "forge_succeeded"
  | "forge_failed"
  | "coaching_opened"
  | "experiment_started"
  | "save_continue_clicked"
  | "coach_brief_viewed"
  | "coach_why_opened"
  | "coach_recommendation_viewed"
  | "coach_feedback_submitted"
  | "coach_confidence_opened";

const CONSENT_KEY = "metaforge-measurement-consent";
const SESSION_KEY = "metaforge-launch-session";
const CAMPAIGN_KEY = "metaforge-launch-campaign";

export const measurementConsent = () => typeof window !== "undefined" ? window.localStorage.getItem(CONSENT_KEY) : null;
export const setMeasurementConsent = (choice: "allowed" | "declined") => window.localStorage.setItem(CONSENT_KEY, choice);

export function captureCampaign() {
  if (measurementConsent() !== "allowed") return;
  const query = new URLSearchParams(window.location.search);
  const campaign = {
    source: query.get("utm_source") || "",
    medium: query.get("utm_medium") || "",
    campaign: query.get("utm_campaign") || "",
    content: query.get("utm_content") || "",
    term: query.get("utm_term") || "",
  };
  if (Object.values(campaign).some(Boolean)) window.sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
}

export function trackLaunchEvent(event: LaunchEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || measurementConsent() !== "allowed") return;
  let session = window.localStorage.getItem(SESSION_KEY);
  if (!session) { session = crypto.randomUUID(); window.localStorage.setItem(SESSION_KEY, session); }
  let campaign = {};
  try { campaign = JSON.parse(window.sessionStorage.getItem(CAMPAIGN_KEY) || "{}"); } catch { /* empty campaign */ }
  void fetch("/api/telemetry", {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, session, campaign, properties }),
  }).catch(() => { /* measurement must never interrupt the Forge */ });
}
