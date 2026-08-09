"use client";

import { useEffect, useState } from "react";
import { captureCampaign, measurementConsent, setMeasurementConsent, trackLaunchEvent } from "./launch-telemetry";

function loadOptionalTracking() {
  if (document.querySelector("script[data-metaforge-impact]")) return;
  const win = window as any;
  win.ire_o = "impactStat";
  win.impactStat = win.impactStat || function (...args: unknown[]) {
    win.impactStat.a = win.impactStat.a || [];
    win.impactStat.a.push(args);
  };
  const script = document.createElement("script");
  script.async = true;
  script.dataset.metaforgeImpact = "true";
  script.src = "https://utt.impactcdn.com/P-A7552660-2ee5-4ed4-85e2-de6538ca98fe1.js";
  script.onload = () => {
    const impact = win.impactStat;
    if (typeof impact === "function") { impact("transformLinks"); impact("trackImpression"); }
  };
  document.head.appendChild(script);
}

export default function PrivacyControls() {
  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    const current = measurementConsent();
    setChoice(current);
    if (current === "allowed") { captureCampaign(); loadOptionalTracking(); trackLaunchEvent("landing_view", { path: window.location.pathname }); }
  }, []);
  const decide = (next: "allowed" | "declined") => {
    setMeasurementConsent(next); setChoice(next);
    if (next === "allowed") { captureCampaign(); loadOptionalTracking(); trackLaunchEvent("landing_view", { path: window.location.pathname }); }
  };
  if (choice) return null;
  return <aside className="privacy-choice" aria-label="Privacy choices">
    <div><b>Help us improve MetaForge?</b><span>Allow anonymous journey measurement and affiliate tracking. No decklists, card choices, names, emails, or advertising profiles.</span></div>
    <footer><button type="button" onClick={() => decide("declined")}>No thanks</button><button type="button" onClick={() => decide("allowed")}>Allow anonymous measurement</button><a href="/privacy">Privacy details</a></footer>
  </aside>;
}
