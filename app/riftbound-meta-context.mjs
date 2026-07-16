export const RIFTBOUND_META_SNAPSHOT = {
  game: "riftbound",
  format: "Unleashed constructed",
  asOf: "2026-06-23",
  source: "https://riftbound.gg/riftbound-meta-tier-list-best-decks-for-unleashed-one-more-regional-until-vendetta/",
  sourceTitle: "Riftbound Unleashed Meta Tier List — One More Regional Until Vendetta",
  coverage: "Seven regional tournaments plus 38 tournaments with 64+ players since May 15, 2026",
  confidence: "developing-current-field",
  tier1: [
    { legend:"Diana", evidence:"7 wins and 31 Top 8 finishes in 64+ player events; repeated regional finals" },
    { legend:"Irelia", evidence:"4 wins and 27 Top 8 finishes in 64+ player events; regional wins in China and the West" },
    { legend:"Master Yi — Wuju Bladesman", evidence:"2 wins and 56 Top 8 finishes in 64+ player events; two Chinese regional wins" },
    { legend:"Azir", evidence:"Regional wins in China and the West; 17 Top 8 finishes in 64+ player events" },
  ],
  tier2: ["LeBlanc","Annie","Sivir","Ezreal","Rek'Sai","Vex","Fiora","Viktor","Rengar","Kha'Zix","Miss Fortune"],
  fieldRead: "The most reliable preparation target is the Tier 1 quartet, but the Western field has shown more room for tuned Tier 2 or surprise lists than the more concentrated Chinese field.",
  pressures: [
    "A proposed anti-meta deck must explain its plan against Diana, Irelia, Origins Master Yi, and Azir rather than targeting one champion in isolation.",
    "Tier 2 is broad, so narrow hate can gain one matchup while becoming fragile across the rest of the field.",
    "Vendetta releases July 31, 2026; this snapshot describes the pre-Vendetta Unleashed field and should not be projected into the new set without fresh evidence.",
  ],
};

export function riftboundMetaContext(now = new Date()) {
  const snapshot = RIFTBOUND_META_SNAPSHOT;
  const ageDays = Math.max(0, Math.floor((now.getTime() - Date.parse(`${snapshot.asOf}T00:00:00Z`)) / 86_400_000));
  return { ...snapshot, ageDays, freshness: ageDays <= 21 ? "fresh" : ageDays <= 45 ? "usable-with-caution" : "stale" };
}
