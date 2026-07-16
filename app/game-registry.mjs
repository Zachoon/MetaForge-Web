export const GAMES = {
  mtg: { id: "mtg", label: "Magic Forge", short: "MTG", accent: "mint", status: "live" },
  riftbound: { id: "riftbound", label: "Riftbound Forge", short: "RIFTBOUND", accent: "rift", status: "alpha" },
};

export function gameStorageKey(game, surface) {
  if (!GAMES[game]) throw new Error(`Unsupported game: ${game}`);
  return `metaforge.${game}.${surface}`;
}

export function sharedPlayerProfile(profile = {}) {
  return {
    coachingNotes: String(profile.coachingNotes || "").slice(0, 2000),
    learningStyle: String(profile.learningStyle || "adaptive").slice(0, 40),
    riskPosture: String(profile.riskPosture || "unknown").slice(0, 40),
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
}
