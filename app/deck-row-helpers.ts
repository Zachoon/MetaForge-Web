import { displayRoleFor } from "./adaptive-recommendation.mjs";
import { parseNativeBlueprintIntent } from "./blueprint-note-and-mana.mjs";
import { deckDisplaySection } from "./deck-display-classification.mjs";
import { colorIdentityName, colorsFromNote } from "./color-identity-labels.mjs";
import type { CardFact, DeckRow, Masterwork } from "./forge-types";

const MASTERWORK_LANES = [
  {
    path: "Fast Start · Focused Pressure",
    tone: "ember",
    nouns: ["Vanguard", "Breakthrough", "Charge"],
    verdict: "Best for players who want to act early, keep attacking, and make opponents answer them.",
  },
  {
    path: "Theme Engine · Compounding Growth",
    tone: "rune",
    nouns: ["Engine", "Confluence", "Workshop"],
    verdict: "Best for players who enjoy combining related cards so each new piece makes the others stronger.",
  },
  {
    path: "Patient Defense · Reliable Finish",
    tone: "steel",
    nouns: ["Bastion", "Bulwark", "Long Game"],
    verdict: "Best for players who prefer to survive the early fight, protect key cards, and win once the table slows down.",
  },
] as const;
export const hashText = (value: string) =>
  Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    2166136261,
  );
/**
 * A small, honest snapshot of Brain's own construction-time plan identity
 * (never fabricated — only ever what Brain itself produced), captured at
 * save time so it can survive a reopen from the archive, where the live
 * generation context is gone. Returns null when there's nothing real to
 * capture, so callers can fall back to whatever was captured previously.
 */
export const extractPlanIdentitySnapshot = (selected: any, commanderName: string) => {
  const intent = selected?.strategicIntent || {};
  const packages = (intent.packages || []).map((p: any) => p?.label).filter(Boolean);
  const plan = selected?.strategicPlan || intent.activePlan || null;
  const strategy = intent.strategy || selected?.strategy || null;
  const commanders = (intent.commanders || [])
    .map((c: any) => (typeof c === "string" ? c : c?.name))
    .filter(Boolean);
  const planLabel = plan?.label || plan?.id || null;
  if (!packages.length && !strategy && !commanders.length && !planLabel) return null;
  return {
    packages,
    strategy,
    planLabel,
    commanders: commanders.length ? commanders : commanderName ? [commanderName] : [],
  };
};
/** Coarse "updated N ago" for a saved family's real updatedAt timestamp. */
export const relativeUpdatedLabel = (isoTimestamp?: string | null): string | null => {
  if (!isoTimestamp) return null;
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Deck updated just now";
  if (minutes < 60) return `Deck updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Deck updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `Deck updated ${days} day${days === 1 ? "" : "s"} ago`;
};
export const masterworkIdentityWord = (commander = "", note = "") => {
  const promise = parseNativeBlueprintIntent({ note }).tribalTypes[0];
  if (promise) return promise.charAt(0).toUpperCase() + promise.slice(1);
  const colors = colorsFromNote(note);
  if (colors.length) return colorIdentityName(colors);
  return commander.split(/[ ,/]+/)[0] || "Forge";
};
export const createMasterworks = (seed: number, commander = "", note = ""): Masterwork[] => {
  const base = hashText(`${seed}-${commander}-${note}`);
  const identity = masterworkIdentityWord(commander, note);
  return Array.from({ length: 9 }, (_, index) => {
    const lane = MASTERWORK_LANES[index % MASTERWORK_LANES.length];
    const noun = lane.nouns[(Math.floor(index / 3) + base) % lane.nouns.length];
    return {
      rune: ["ᛋ", "ᛉ", "ᛟ", "ᚷ", "ᚱ", "ᛇ", "ᚾ", "ᛞ", "ᛜ"][index],
      name: `The ${identity} ${noun}`,
      path: lane.path,
      tone: lane.tone,
      verdict: lane.verdict,
    };
  });
};
export const parseDeckRows = (text: string): DeckRow[] =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line
      .trim()
      .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });
export const cardFactKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
export const scryfallLookupName = (name: string) => String(name || "").split(/\s*\/\/\s*/)[0].trim();
export const BASIC_LANDS: Record<string, string> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};
export const BASIC_LAND_KEYS = new Set(
  [
    ...Object.values(BASIC_LANDS), "Wastes",
    "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest",
  ].map(cardFactKey),
);
export const indexCardFact = (
  target: Record<string, CardFact>,
  fact: CardFact,
  requestedName = "",
) => {
  const aliases = [
    requestedName,
    String(fact.name || ""),
    String(fact.name || "").split(" // ")[0],
    ...(fact.card_faces || []).map((face) => String(face.name || "")),
  ];
  for (const alias of aliases) if (alias) target[cardFactKey(alias)] = fact;
};
export const cardFactFromNativeRow = (row: any): CardFact | null => {
  const card = row?.card;
  if (!row?.name || !card) return null;
  return {
    name: String(card.name || row.name),
    cmc: Number(card.cmc ?? row.cmc ?? 0),
    color_identity: Array.isArray(card.colorIdentity) ? card.colorIdentity : card.color_identity || [],
    mana_cost: String(card.manaCost || card.mana_cost || ""),
    oracle_text: String(card.oracleText || card.oracle_text || ""),
    type_line: String(card.typeLine || card.type_line || ""),
    ...(Number.isFinite(Number(card.priceUsd)) ? { prices: { usd: String(card.priceUsd) } } : {}),
  };
};
export const cardGroup = (fact?: CardFact, isCommander = false) =>
  // Founder #017: primary (front) face drives display sections — not joined
  // Oracle faces. Analysis still uses full type lines elsewhere.
  deckDisplaySection(fact || {}, isCommander);
// Reads whichever price the player actually wants — foil or nonfoil — and
// falls back to the other printing's price only when the requested one
// doesn't exist at all (foil-only promos have no usd price; some older or
// bulk commons have no usd_foil price). Basics and other truly priceless
// cards correctly return null, not 0 — a real $0.00 card and "no price
// data yet" are different things.
export const cardPriceUsd = (fact?: CardFact, foil = false): number | null => {
  const preferred = foil ? fact?.prices?.usd_foil : fact?.prices?.usd;
  const fallback = foil ? fact?.prices?.usd : fact?.prices?.usd_foil;
  const raw = preferred ?? fallback;
  const value = Number(raw);
  return raw != null && Number.isFinite(value) ? value : null;
};
// The cheaper of this same printing's nonfoil/foil prices — a lightweight
// "budget bling" reading that reuses prices already on hand, distinct from
// searching every printing a card has ever had (a separate, heavier feature).
export const cheapestCardPriceUsd = (fact?: CardFact): number | null => {
  const candidates = [fact?.prices?.usd, fact?.prices?.usd_foil]
    .map((raw) => (raw != null ? Number(raw) : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  return candidates.length ? Math.min(...candidates) : null;
};
// displayRoleFor lives in adaptive-recommendation.mjs alongside the
// server-side simulation role vocabulary it's the display counterpart
// of, so the two stay derived from one place instead of drifting. It
// already reads both typeLine/type_line and oracleText/oracle_text, so
// a raw Scryfall-shaped CardFact passes through directly.
export const cardRole = (fact?: CardFact) => displayRoleFor(fact);
export const BASIC_CARD_NAMES = new Set(["plains", "island", "swamp", "mountain", "forest", "wastes"]);

export const BLUEPRINT_DEFINITIONS = {
  format: {
    Standard: "A rotating 60-card format using recent Magic sets.",
    Brawl: "A 100-card singleton Arena format led by a commander.",
    "Standard Brawl": "A rotating 60-card singleton format led by a commander.",
    Commander: "A 100-card singleton multiplayer format led by a legendary commander.",
    Modern: "A nonrotating 60-card format using cards from Eighth Edition forward.",
    Premodern: "A community format using Fourth Edition through Scourge-era cards.",
    Pioneer: "A nonrotating 60-card format using Return to Ravnica forward.",
    Historic: "A broad, nonrotating digital format played on MTG Arena.",
  },
  strategy: {
    "Aggressive pressure": "Deploy threats quickly and shorten the game before slower plans stabilize.",
    "Balanced midrange": "Blend efficient threats, interaction, and staying power so the deck can adapt.",
    "Reactive control": "Trade resources, answer key threats, and win after taking control of the game.",
    "Synergy and combo": "Assemble cards whose combined effect is substantially stronger than each card alone.",
    "Tempo and disruption": "Advance an efficient threat while delaying the opponent just long enough to win.",
  },
  complexity: {
    Accessible: "Favor clear play patterns, forgiving sequencing, and fewer hidden dependencies.",
    Balanced: "Allow meaningful decisions without making every turn mechanically demanding.",
    Technical: "Welcome precise sequencing, layered interactions, and more matchup-dependent choices.",
    "Maximum depth": "Prioritize intricate lines and high decision density, even when they require more practice.",
  },
  budget: {
    "No strict limit": "Choose the strongest fitting cards without a price ceiling.",
    "Budget conscious": "Prefer affordable substitutes while preserving the deck's central promise.",
    "Moderate investment": "Allow selective premium cards when they materially improve the deck.",
    "Competitive optimization": "Prioritize performance and consistency over card cost.",
  },
  targetPowerTier: {
    "": "Let structure and strategy decide, with no power-level pressure either way.",
    Casual: "Lean away from fast mana, unrestricted tutors, extra turns, and mass land denial.",
    Focused: "Allow a modest amount of real power signals — a build with teeth, not a stax or combo-first list.",
    "High-Power": "Lean toward fast mana, tutors, and extra turns where they otherwise fit.",
    Maximum: "Actively seek fast mana, unrestricted tutors, extra turns, and mass land denial wherever legal.",
  },
} as const;

export const blueprintDefinition = (
  category: keyof typeof BLUEPRINT_DEFINITIONS,
  value: string,
) => (BLUEPRINT_DEFINITIONS[category] as Record<string, string>)[value] || "The Forge will explain this choice as its card pool and rules are verified.";
