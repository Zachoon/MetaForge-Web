// Versioned official Commander Game Changers snapshot.
// Base list: Commander Brackets Beta Update, October 21, 2025.
// Additions: Farewell and Biorhythm, February 9, 2026.
// This deliberately lives outside the oracle-text classifier: names answer
// the official-list question, while mechanics continue to generalize to new
// cards and cards outside the list.
export const COMMANDER_GAME_CHANGERS = Object.freeze([
  "Ad Nauseam", "Ancient Tomb", "Aura Shards", "Biorhythm", "Bolas's Citadel",
  "Braids, Cabal Minion", "Chrome Mox", "Coalition Victory", "Consecrated Sphinx",
  "Crop Rotation", "Cyclonic Rift", "Demonic Tutor", "Drannith Magistrate",
  "Enlightened Tutor", "Farewell", "Field of the Dead", "Fierce Guardianship",
  "Force of Will", "Gaea's Cradle", "Gamble", "Gifts Ungiven", "Glacial Chasm",
  "Grand Arbiter Augustin IV", "Grim Monolith", "Humility", "Imperial Seal",
  "Intuition", "Jeska's Will", "Lion's Eye Diamond", "Mana Vault", "Mishra's Workshop",
  "Mox Diamond", "Mystical Tutor", "Narset, Parter of Veils", "Natural Order",
  "Necropotence", "Notion Thief", "Opposition Agent", "Orcish Bowmasters",
  "Panoptic Mirror", "Rhystic Study", "Seedborn Muse", "Serra's Sanctum",
  "Smothering Tithe", "Survival of the Fittest", "Teferi's Protection",
  "Tergrid, God of Fright", "Thassa's Oracle", "The One Ring",
  "The Tabernacle at Pendrell Vale", "Underworld Breach", "Vampiric Tutor", "Worldly Tutor",
]);

export const COMMANDER_GAME_CHANGER_SNAPSHOT = Object.freeze({
  asOf: "2026-02-09",
  sources: Object.freeze([
    "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025",
    "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026",
  ]),
});

const normalized = new Set(COMMANDER_GAME_CHANGERS.map((name) => name.normalize("NFKC").trim().toLocaleLowerCase("en")));
export function isCommanderGameChanger(name = "") {
  return normalized.has(String(name).normalize("NFKC").trim().toLocaleLowerCase("en"));
}
