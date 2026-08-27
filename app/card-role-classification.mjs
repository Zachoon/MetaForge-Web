// classifyNativeCard/conceptSignals, extracted out of native-masterwork-
// engine.mjs into their own leaf module.
//
// Both are dual-use: native-masterwork-engine.mjs calls them internally for
// real deck-construction scoring (where the per-card tag lookup below MUST
// resolve real data), and app/deck-motif-scan.mjs — a CLIENT module,
// reachable from page.tsx — calls classifyNativeCard for a purely cosmetic
// feature (which visual "motif" art a Masterwork gets). That second, client
// path was pulling native-masterwork-engine.mjs's entire ~4,500-line import
// graph (the whole server-only construction engine, plus the ~1.9MB
// card-mechanics.mjs per-card database it needs for real scoring) into the
// browser bundle just to classify a few dozen cards for icon selection.
//
// Unlike strategic-intent.mjs's tagsOf (construction-critical — see
// configureCardTagLookup there, which throws if unconfigured so a missed
// server init fails loudly), the lookup here defaults to gracefully
// returning no tags rather than throwing: deck-motif-scan.mjs's cosmetic
// use is fine falling back to regex-only classification (ROLE_PATTERNS),
// and a real per-card lookup would just mean re-importing card-mechanics.mjs
// right back into the client — the exact thing this file exists to avoid.
// native-masterwork-engine.mjs configures the real lookup for its own
// internal (server-only) calls.

import { ROLE_PATTERNS, OFF_TARGET_SPELL_TYPE_CAST } from "./blueprint-note-and-mana.mjs";
import { isTreasureBurstAcceleration } from "./conditional-effect-credit.mjs";
import { isManaFilterOnly } from "./situational-card-evaluation.mjs";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const unique = (values) => [...new Set(values.filter(Boolean))];

let cardTagLookup = () => [];
export function configureCardRoleTagLookup(lookup) {
  cardTagLookup = lookup || (() => []);
}

function cardText(card) {
  return `${card.name || ""}\n${card.typeLine || card.type_line || ""}\n${card.oracleText || card.oracle_text || ""}\n${(card.keywords || []).join(" ")}`;
}

// Every basic land is tagged mana_acceleration in the database — "adds
// mana" is true of literally every land, which isn't what the "ramp" role
// means here (accelerating ahead of your land drops). Real mana rocks and
// dorks are never lands, so the tag is only trustworthy for the "ramp"
// role specifically when the card isn't one.
const ROLE_TAGS = Object.freeze({
  ramp: ["mana_acceleration"],
  protection: ["protection"],
  recursion: ["graveyard_recursion"],
  selection: ["scry", "surveil"],
  tokens: ["token_producer"],
  sacrifice: ["sacrifice_outlet"],
  counters: ["counter_producer"],
  graveyard: ["graveyard_setup", "mill"],
  spells: ["spell_payoff"],
  lifegain: ["lifegain", "lifegain_payoff"],
});

function roleTagsFor(card, isLand) {
  const tags = cardTagLookup(normalized(card?.name));
  if (!tags || !tags.length) return [];
  // Founder #059: same real bug as forge-interaction-graph.mjs's Founder
  // #057, duplicated here — the curated database's "spell_payoff" tag
  // (mapped to this file's own "spells" role) carries the identical
  // off-target-type false positive on Sythis/Ugin-style cards, unguarded.
  // This module is construction-critical (see this file's own header
  // comment), so the false "spells" role reached real deck scoring, not
  // just a cosmetic label. Guarded the same way #057 did.
  const offTargetSpellTag = OFF_TARGET_SPELL_TYPE_CAST.test(cardText(card));
  const text = cardText(card);
  const fixedTreasureOnly = /create[^.]*treasure/i.test(text)
    && !/add .{0,18}mana|land card.{0,30}battlefield/i.test(text)
    && !isTreasureBurstAcceleration(text);
  return Object.entries(ROLE_TAGS)
    .filter(([role, tagNames]) => !(isLand && role === "ramp")
      && !(role === "ramp" && fixedTreasureOnly)
      && !(role === "ramp" && isManaFilterOnly(card))
      && !(role === "spells" && offTargetSpellTag)
      && tagNames.some((tag) => tags.includes(tag)))
    .map(([role]) => role);
}

export function classifyNativeCard(card) {
  const typeLine = String(card.typeLine || card.type_line || "");
  const text = cardText(card);
  const roles = [];
  const isLand = /\bLand\b/i.test(typeLine);
  if (isLand) roles.push("land");
  for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
    if (role === "ramp" && isManaFilterOnly(card)) continue;
    if (patterns.some((pattern) => pattern.test(text))) roles.push(role);
  }
  roles.push(...roleTagsFor(card, isLand));
  if (!roles.includes("land") && (/\bCreature\b|Planeswalker/i.test(typeLine) || /you win the game/i.test(text))) roles.push("threat");
  return unique(roles);
}

// Same database cross-reference as classifyNativeCard, applied to a
// commander's own text so the synergy bonus below ("does this card do what
// my commander cares about") sees the same evidence a card's own role
// classification does — a commander whose ramp ability is phrased in a way
// the regex above doesn't cover would otherwise silently grant no ramp
// synergy bonus at all.
export function conceptSignals(card) {
  const text = normalized(card?.oracleText || card?.oracle_text || "");
  const regexSignals = Object.keys(ROLE_PATTERNS).filter((role) => ROLE_PATTERNS[role].some((pattern) => pattern.test(text)));
  const isLand = /\bLand\b/i.test(card?.typeLine || card?.type_line || "");
  return unique([...regexSignals, ...roleTagsFor(card, isLand)]);
}
