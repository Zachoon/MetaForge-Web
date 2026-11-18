// Deck Check — the coaching report for a pasted list
// ----------------------------------------------------
// One pure function from (parsed list + printed facts) to a report a player
// can act on: what the deck is trying to do, whether it is a legal deck for
// the chosen format, which weaknesses the printed text shows (each one quoting
// a card from the list), and one concrete change replayed through the same
// coaches so the before/after is measured, not asserted.
//
// Rules-based only. Nothing here calls a model, prices a card or claims a win
// rate. The plan read, role ranges, curve bands, weakness ranking and swap
// catalog all come from the existing native coaches (curve-role-coach,
// plan-weakness-coach, mana-base-coach); this module adds format checks,
// the before/after replay, and the honest-limits list.

import { buildCurveRoleCoaching, swapCatalogCard } from "./curve-role-coach.mjs";
import { buildManaBaseCoaching } from "./mana-base-coach.mjs";
import { deckCheckKey, decklistText, playedEntries } from "./deck-check-parse.mjs";
import { factFor } from "./deck-check-facts.mjs";

export const DECK_CHECK_FORMATS = Object.freeze([
  { id: "commander", label: "Commander", legalityKey: "commander", commander: true, size: 100, copies: 1 },
  { id: "standard", label: "Standard", legalityKey: "standard", commander: false, size: 60, copies: 4 },
  { id: "pioneer", label: "Pioneer", legalityKey: "pioneer", commander: false, size: 60, copies: 4 },
  { id: "modern", label: "Modern", legalityKey: "modern", commander: false, size: 60, copies: 4 },
  { id: "legacy", label: "Legacy", legalityKey: "legacy", commander: false, size: 60, copies: 4 },
  { id: "vintage", label: "Vintage", legalityKey: "vintage", commander: false, size: 60, copies: 4 },
  { id: "pauper", label: "Pauper", legalityKey: "pauper", commander: false, size: 60, copies: 4 },
]);

export function deckCheckFormat(id = "commander") {
  return DECK_CHECK_FORMATS.find((format) => format.id === id) || DECK_CHECK_FORMATS[0];
}

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const COLOR_NAMES = { W: "white", U: "blue", B: "black", R: "red", G: "green" };

function isBasicLand(fact) {
  return /\bBasic\b/.test(fact?.typeLine || "") && /\bLand\b/.test(fact?.typeLine || "");
}

/** Printed copy limit, honouring "any number" and "up to seven" exceptions. */
export function copyLimitFor(fact, format) {
  if (!fact) return format.copies;
  if (isBasicLand(fact)) return Infinity;
  const text = fact.oracleText || "";
  if (/a deck can have any number of cards named/i.test(text)) return Infinity;
  const upTo = text.match(/a deck can have up to (\w+) cards named/i);
  if (upTo) return NUMBER_WORDS[upTo[1].toLowerCase()] || Number(upTo[1]) || format.copies;
  return format.copies;
}

function frontTypeLine(fact) {
  return String(fact?.typeLine || "").split(" // ")[0];
}

function canLeadAlone(fact) {
  if (!fact) return false;
  const front = frontTypeLine(fact);
  if (/\bLegendary\b/.test(front) && /\bCreature\b/.test(front)) return true;
  return /can be your commander/i.test(fact.oracleText || "");
}

function pairKeyword(fact) {
  const text = fact?.oracleText || "";
  if (/\bPartner with\b/i.test(text)) return "partner-with";
  if (/\bPartner\b/.test(text)) return "partner";
  if (/\bFriends forever\b/i.test(text)) return "friends-forever";
  if (/\bChoose a Background\b/i.test(text)) return "choose-background";
  if (/\bDoctor's companion\b/i.test(text)) return "doctors-companion";
  return null;
}

function validPair(a, b) {
  const ka = pairKeyword(a);
  const kb = pairKeyword(b);
  const background = (fact) => /\bBackground\b/.test(frontTypeLine(fact));
  if (ka === "choose-background" && background(b)) return true;
  if (kb === "choose-background" && background(a)) return true;
  if (ka === "partner" && kb === "partner") return true;
  if (ka === "friends-forever" && kb === "friends-forever") return true;
  if (ka === "partner-with" && kb === "partner-with") {
    return new RegExp(`Partner with ${escapeRegExp(b.name)}`, "i").test(a.oracleText || "");
  }
  if (ka === "doctors-companion" || kb === "doctors-companion") {
    const doctor = (fact) => /\bTime Lord Doctor\b/.test(frontTypeLine(fact));
    return (ka === "doctors-companion" && doctor(b)) || (kb === "doctors-companion" && doctor(a));
  }
  return false;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function identityWords(colors = []) {
  if (!colors.length) return "colorless";
  return colors.map((color) => COLOR_NAMES[color] || color).join("-");
}

/** Legendary creatures (or "can be your commander" cards) in the list, for the commander picker. */
export function commanderCandidates(parsed, facts) {
  return playedEntries(parsed)
    .map((entry) => factFor(facts, entry.name))
    .filter((fact) => canLeadAlone(fact))
    .map((fact) => fact.name)
    .filter((name, index, all) => all.indexOf(name) === index);
}

/**
 * Format and construction checks. Every legality claim cites Scryfall's
 * legality field; nothing is inferred from a card name.
 */
export function checkDeckStructure({ parsed, facts = {}, notFound = [], format: formatId = "commander", commanderNames } = {}) {
  const format = deckCheckFormat(formatId);
  const issues = [];
  const entries = parsed?.entries || [];
  const played = playedEntries(parsed);
  const main = entries.filter((entry) => entry.section === "main" || entry.section === "commander");
  const side = entries.filter((entry) => entry.section === "sideboard");
  const notFoundKeys = new Set(notFound.map(deckCheckKey));

  for (const problem of parsed?.problems || []) {
    issues.push({ severity: "error", code: "unread-line", message: `Line ${problem.line} could not be read: ${problem.reason}.`, lines: [problem.line], cards: [] });
  }
  const unknown = entries.filter((entry) => entry.section !== "maybeboard" && (notFoundKeys.has(entry.key) || !factFor(facts, entry.name)));
  for (const entry of unknown) {
    issues.push({
      severity: "error",
      code: "unknown-card",
      message: `“${entry.name}” is not a card name Scryfall recognises. Check the spelling; it is left out of every count below.`,
      lines: entry.lines,
      cards: [entry.name],
    });
  }
  const implied = parsed?.notes?.filter((note) => /read as 1 copy/.test(note.reason)) || [];
  if (implied.length) {
    issues.push({
      severity: "info",
      code: "implied-quantity",
      message: `${implied.length} line${implied.length === 1 ? " had" : "s had"} no quantity, so ${implied.length === 1 ? "it was" : "each was"} read as one copy.`,
      lines: implied.map((note) => note.line),
      cards: [],
    });
  }

  // Commander checks.
  const chosenCommanders = (commanderNames || parsed?.commanderNames || []).map((name) => factFor(facts, name) || { name, unresolved: true });
  let identity = [];
  if (format.commander) {
    if (!chosenCommanders.length) {
      issues.push({ severity: "error", code: "commander-missing", message: "No commander was found. Put it under a “Commander” heading, or pick it from the list below.", lines: [], cards: [] });
    }
    for (const commander of chosenCommanders) {
      if (commander.unresolved) continue;
      if (chosenCommanders.length === 1 && !canLeadAlone(commander)) {
        issues.push({ severity: "error", code: "commander-not-eligible", message: `${commander.name} is not a legendary creature and its text does not say it can be your commander.`, lines: [], cards: [commander.name] });
      }
    }
    if (chosenCommanders.length === 2) {
      const [a, b] = chosenCommanders;
      if (!a.unresolved && !b.unresolved && !validPair(a, b)) {
        issues.push({ severity: "error", code: "commander-pair", message: `${a.name} and ${b.name} do not have a printed pairing ability (Partner, Partner with, Friends forever, Choose a Background, Doctor's companion) that lets them share the command zone.`, lines: [], cards: [a.name, b.name] });
      }
    }
    if (chosenCommanders.length > 2) {
      issues.push({ severity: "error", code: "commander-count", message: `${chosenCommanders.length} cards are marked as commander. A Commander deck has one, or two with a pairing ability.`, lines: [], cards: chosenCommanders.map((card) => card.name) });
    }
    identity = [...new Set(chosenCommanders.flatMap((commander) => commander.colorIdentity || []))];
  }

  const playedTotal = main.reduce((sum, entry) => sum + entry.quantity, 0);
  const sideTotal = side.reduce((sum, entry) => sum + entry.quantity, 0);
  if (format.commander) {
    if (playedTotal !== format.size) {
      issues.push({
        severity: "error",
        code: "deck-size",
        message: `The deck has ${playedTotal} cards including the commander. A Commander deck is exactly ${format.size}.`,
        lines: [],
        cards: [],
      });
    }
  } else {
    if (playedTotal < format.size) {
      issues.push({ severity: "error", code: "deck-size", message: `The main deck has ${playedTotal} cards. ${format.label} needs at least ${format.size}.`, lines: [], cards: [] });
    }
    if (sideTotal > 15) {
      issues.push({ severity: "error", code: "sideboard-size", message: `The sideboard has ${sideTotal} cards. The limit is 15.`, lines: [], cards: [] });
    }
  }

  // Copy limits: Commander counts the deck; 60-card formats count main + side.
  const counted = new Map();
  for (const entry of format.commander ? played : [...main, ...side]) {
    const fact = factFor(facts, entry.name);
    const key = fact ? deckCheckKey(fact.name) : entry.key;
    const current = counted.get(key) || { name: fact?.name || entry.name, fact, quantity: 0, lines: [] };
    current.quantity += entry.quantity;
    current.lines.push(...entry.lines);
    counted.set(key, current);
  }
  for (const { name, fact, quantity, lines } of counted.values()) {
    if (!fact) continue;
    let limit = copyLimitFor(fact, format);
    if (format.id === "vintage" && fact.legalities?.vintage === "restricted") limit = 1;
    if (quantity > limit) {
      issues.push({
        severity: "error",
        code: "copy-limit",
        message: format.commander
          ? `${quantity} copies of ${name}. Commander is singleton: one copy of each card except basic lands.`
          : `${quantity} copies of ${name}. ${format.label} allows ${limit === 1 ? "one copy (restricted)" : `up to ${limit}`}.`,
        lines,
        cards: [name],
      });
    }
  }

  // Colour identity (Commander only).
  if (format.commander && chosenCommanders.some((commander) => !commander.unresolved)) {
    const allowed = new Set(identity);
    for (const entry of played) {
      if (entry.section === "commander") continue;
      const fact = factFor(facts, entry.name);
      if (!fact) continue;
      const outside = (fact.colorIdentity || []).filter((color) => !allowed.has(color));
      if (outside.length) {
        issues.push({
          severity: "error",
          code: "color-identity",
          message: `${fact.name} is ${identityWords(fact.colorIdentity)}, outside the commander's ${identityWords(identity)} color identity.`,
          lines: entry.lines,
          cards: [fact.name],
        });
      }
    }
  }

  // Legality per Scryfall.
  for (const entry of format.commander ? played : [...main, ...side]) {
    const fact = factFor(facts, entry.name);
    const status = fact?.legalities?.[format.legalityKey];
    if (!fact || !status || status === "legal" || (status === "restricted" && format.id === "vintage")) continue;
    issues.push({
      severity: "error",
      code: status === "banned" ? "banned" : "not-legal",
      message: status === "banned"
        ? `${fact.name} is banned in ${format.label} (Scryfall legality data).`
        : `${fact.name} is not legal in ${format.label} (Scryfall legality data).`,
      lines: entry.lines,
      cards: [fact.name],
    });
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  return {
    format,
    playedTotal,
    sideTotal,
    commanders: chosenCommanders.map((commander) => commander.name),
    identity,
    issues,
    legal: errors.length === 0,
    errorCount: errors.length,
  };
}

function coachCards(parsed, facts, commanderNames) {
  const commanderKeys = new Set(commanderNames.map(deckCheckKey));
  return playedEntries(parsed)
    .filter((entry) => !commanderKeys.has(deckCheckKey(entry.name)) && !commanderKeys.has(deckCheckKey(factFor(facts, entry.name)?.name || "")))
    .map((entry) => {
      const fact = factFor(facts, entry.name);
      return fact ? { ...fact, quantity: entry.quantity } : { name: entry.name, quantity: entry.quantity };
    });
}

function runCoaches(commanders, cards, strategy) {
  return {
    curveRole: buildCurveRoleCoaching({ commanders, commander: commanders[0], cards, strategy }),
    mana: buildManaBaseCoaching({ commanders, commander: commanders[0], cards }),
  };
}

/** Swaps from the weaknesses first, then from the lessons, that can actually be replayed. */
function replayableSwaps(curveRole, cards) {
  const inDeck = new Map(cards.map((card) => [deckCheckKey(card.name), card]));
  const seen = new Set();
  const out = [];
  const consider = (swap, source) => {
    if (!swap?.cut || !swap?.add) return;
    const cut = inDeck.get(deckCheckKey(swap.cut));
    const add = swapCatalogCard(swap.add);
    if (!cut || !add || inDeck.has(deckCheckKey(add.name))) return;
    const id = `${deckCheckKey(swap.cut)}->${deckCheckKey(swap.add)}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, cut: cut.name, add: add.name, reason: swap.reason, addQuote: swap.addQuote || add.oracleText, source });
  };
  for (const weakness of curveRole?.weaknesses || []) for (const swap of weakness.swaps || []) consider(swap, weakness.id);
  for (const lesson of curveRole?.lessons || []) for (const swap of lesson.swaps || []) consider(swap, lesson.id);
  return out;
}

function roleSnapshot(curveRole) {
  return Object.fromEntries((curveRole?.roles || []).map((role) => [role.id, { label: role.label, actual: role.actual, min: role.min, max: role.max, status: role.status }]));
}

/**
 * Replay one cut/add through the same coaches and report what moved.
 * @returns {null | { cut: string, add: string, reason: string, addQuote: string, roles: any[], curve: any, lands: any, resolved: string[], introduced: string[], remaining: string[], verdict: string, tradeOffs: string[], afterText: string }}
 */
export function compareSwap({ swap, addFact = null, commanders, cards, strategy, before, parsed }) {
  const addCard = addFact
    ? { name: addFact.name, typeLine: addFact.typeLine, manaCost: addFact.manaCost, oracleText: addFact.oracleText, colorIdentity: addFact.colorIdentity || [], cmc: addFact.cmc, cardFaces: addFact.cardFaces || [] }
    : swapCatalogCard(swap.add);
  if (!addCard) return null;
  const cutKey = deckCheckKey(swap.cut);
  const afterCards = cards
    .map((card) => deckCheckKey(card.name) === cutKey ? { ...card, quantity: card.quantity - 1 } : card)
    .filter((card) => card.quantity > 0)
    .concat([{ ...addCard, quantity: 1, legalities: {} }]);
  const after = runCoaches(commanders, afterCards, strategy);
  const beforeRoles = roleSnapshot(before.curveRole);
  const afterRoles = roleSnapshot(after.curveRole);
  const roles = Object.keys(beforeRoles).map((id) => ({
    id,
    label: beforeRoles[id].label,
    min: beforeRoles[id].min,
    max: beforeRoles[id].max,
    before: beforeRoles[id].actual,
    after: afterRoles[id]?.actual ?? beforeRoles[id].actual,
    beforeStatus: beforeRoles[id].status,
    afterStatus: afterRoles[id]?.status ?? beforeRoles[id].status,
  }));
  const beforeWeak = (before.curveRole?.weaknesses || []).filter((weakness) => weakness.id !== "sound");
  const afterWeak = (after.curveRole?.weaknesses || []).filter((weakness) => weakness.id !== "sound");
  const afterIds = new Set(afterWeak.map((weakness) => weakness.id));
  const beforeIds = new Set(beforeWeak.map((weakness) => weakness.id));
  const resolved = beforeWeak.filter((weakness) => !afterIds.has(weakness.id)).map((weakness) => weakness.title);
  const introduced = afterWeak.filter((weakness) => !beforeIds.has(weakness.id)).map((weakness) => weakness.title);
  const remaining = afterWeak.filter((weakness) => beforeIds.has(weakness.id)).map((weakness) => weakness.title);

  const target = roles.find((role) => swap.source === `role-${role.id}` || swap.source === `${role.id}-short`)
    || roles.find((role) => role.after > role.before)
    || null;
  let verdict;
  if (!target) {
    verdict = `The role counts do not move. The case for ${swap.add} is the quality of the card, not the count.`;
  } else if (target.after === target.before) {
    verdict = `${target.label} stays at ${target.before}. The coach's reason is about what the card does, not the count.`;
  } else if (target.beforeStatus === "short" && target.afterStatus !== "short") {
    verdict = `${target.label} goes from ${target.before} to ${target.after}, inside the ${target.min}–${target.max} range for this plan.`;
  } else if (target.afterStatus === "short") {
    verdict = `${target.label} goes from ${target.before} to ${target.after}. The plan wants ${target.min}–${target.max}, so this is ${target.min - target.after} short of the range: one swap starts the fix, it does not finish it.`;
  } else {
    verdict = `${target.label} goes from ${target.before} to ${target.after} (range ${target.min}–${target.max}).`;
  }
  const tradeOffs = roles
    .filter((role) => role.after < role.before)
    .map((role) => `${role.label} drops from ${role.before} to ${role.after}${role.afterStatus === "short" && role.beforeStatus !== "short" ? `, which falls below the ${role.min}–${role.max} range` : role.afterStatus === "short" ? " (already short)" : ` (still within ${role.min}–${role.max})`}.`);
  const beforeLands = before.mana?.lands;
  const afterLands = after.mana?.lands;
  if (beforeLands && afterLands && afterLands.count < beforeLands.count) {
    tradeOffs.push(`Lands drop from ${beforeLands.count} to ${afterLands.count} (this curve wants ${afterLands.targetLow}–${afterLands.targetHigh}).`);
  }

  const afterEntries = (parsed?.entries || [])
    .filter((entry) => entry.section === "main" || entry.section === "commander")
    .map((entry) => ({ ...entry, name: entry.name }))
    .map((entry) => deckCheckKey(entry.name) === cutKey ? { ...entry, quantity: entry.quantity - 1 } : entry)
    .concat([{ name: addCard.name, quantity: 1, section: "main" }]);

  return {
    source: swap.source || "coach",
    cut: swap.cut,
    add: addCard.name,
    reason: swap.reason,
    addQuote: swap.addQuote || addCard.oracleText,
    addTypeLine: addCard.typeLine,
    addManaCost: addCard.manaCost,
    roles,
    curve: { before: before.curveRole?.curve?.average ?? null, after: after.curveRole?.curve?.average ?? null, ideal: before.curveRole?.curve?.ideal ?? null },
    lands: beforeLands && afterLands ? { before: beforeLands.count, after: afterLands.count, targetLow: afterLands.targetLow, targetHigh: afterLands.targetHigh, beforeStatus: beforeLands.status, afterStatus: afterLands.status } : null,
    resolved,
    introduced,
    remaining,
    verdict,
    tradeOffs,
    afterText: decklistText(afterEntries, commanders.map((commander) => commander.name)),
  };
}

function strongestJobs(curveRole) {
  return (curveRole?.roles || [])
    .filter((role) => role.status === "ok" || role.status === "over")
    .map((role) => ({ id: role.id, label: role.label, actual: role.actual, min: role.min, max: role.max, status: role.status, cards: (role.cards || []).slice(0, 4).map((card) => card.name) }));
}

function nonCommanderSummary(parsed, facts) {
  const cards = playedEntries(parsed).map((entry) => ({ entry, fact: factFor(facts, entry.name) })).filter(({ fact }) => fact);
  const lands = cards.filter(({ fact }) => /\bLand\b/.test(frontTypeLine(fact)));
  const spells = cards.filter(({ fact }) => !/\bLand\b/.test(frontTypeLine(fact)));
  const landCount = lands.reduce((sum, { entry }) => sum + entry.quantity, 0);
  const spellCount = spells.reduce((sum, { entry }) => sum + entry.quantity, 0);
  const mvTotal = spells.reduce((sum, { entry, fact }) => sum + (Number(fact.cmc) || 0) * entry.quantity, 0);
  const buckets = [0, 0, 0, 0, 0, 0];
  for (const { entry, fact } of spells) buckets[Math.min(5, Math.max(0, Math.floor(Number(fact.cmc) || 0)))] += entry.quantity;
  const curveBuckets = [
    { label: "0–1", actual: buckets[0] + buckets[1] },
    { label: "2", actual: buckets[2] },
    { label: "3", actual: buckets[3] },
    { label: "4", actual: buckets[4] },
    { label: "5+", actual: buckets[5] },
  ];
  const colors = {};
  for (const { entry, fact } of spells) {
    for (const symbol of String(fact.manaCost || "").matchAll(/\{([WUBRG])(?:\/[WUBRGP])?\}/g)) colors[symbol[1]] = (colors[symbol[1]] || 0) + entry.quantity;
  }
  return {
    landCount,
    spellCount,
    averageManaValue: spellCount ? Number((mvTotal / spellCount).toFixed(2)) : null,
    curve: curveBuckets,
    pips: Object.entries(colors).map(([color, pips]) => ({ color, word: COLOR_NAMES[color], pips })),
  };
}

/**
 * Why a player-proposed add cannot go in, or null when it can. Rules only:
 * colour identity, Scryfall legality, singleton, and "already in the list".
 */
export function proposedAddIssue(addFact, { identity = [], cards = [], format: formatId = "commander" } = {}) {
  const format = deckCheckFormat(formatId);
  if (!addFact?.name) return "That card could not be found on Scryfall. Check the spelling.";
  const status = addFact.legalities?.[format.legalityKey];
  if (status === "banned") return `${addFact.name} is banned in ${format.label} (Scryfall legality data).`;
  if (status && status !== "legal" && status !== "restricted") return `${addFact.name} is not legal in ${format.label} (Scryfall legality data).`;
  const allowed = new Set(identity);
  const outside = (addFact.colorIdentity || []).filter((color) => !allowed.has(color));
  if (format.commander && outside.length) return `${addFact.name} is ${identityWords(addFact.colorIdentity)}, outside the commander's ${identityWords(identity)} color identity.`;
  const present = cards.find((card) => deckCheckKey(card.name) === deckCheckKey(addFact.name));
  if (present && copyLimitFor(addFact, format) <= present.quantity) return `${addFact.name} is already in the list.`;
  return null;
}

/**
 * Replay a cut/add the player chose through the same coaches.
 * @param {{ parsed?: any, facts?: Record<string, any>, commanderNames?: string[], strategy?: string, cut?: string, addFact?: any, format?: string }} [input]
 * @returns {{ ok: true, comparison: any } | { ok: false, message: string }}
 */
export function comparePlayerSwap({ parsed, facts = {}, commanderNames, strategy = "", cut, addFact, format = "commander" } = {}) {
  const names = commanderNames || parsed?.commanderNames || [];
  const commanders = names.map((name) => factFor(facts, name)).filter(Boolean);
  if (!commanders.length) return { ok: false, message: "Pick a commander first." };
  const cards = coachCards(parsed, facts, commanders.map((commander) => commander.name));
  const cutCard = cards.find((card) => deckCheckKey(card.name) === deckCheckKey(cut || ""));
  if (!cutCard) return { ok: false, message: "Choose a card from your list to cut." };
  const identity = [...new Set(commanders.flatMap((commander) => commander.colorIdentity || []))];
  const issue = proposedAddIssue(addFact, { identity, cards, format });
  if (issue) return { ok: false, message: issue };
  if (deckCheckKey(cutCard.name) === deckCheckKey(addFact.name)) return { ok: false, message: "The cut and the add are the same card." };
  const before = runCoaches(commanders, cards, strategy);
  const comparison = compareSwap({
    swap: { cut: cutCard.name, add: addFact.name, reason: "", source: "player" },
    addFact,
    commanders,
    cards,
    strategy,
    before,
    parsed,
  });
  return comparison ? { ok: true, comparison } : { ok: false, message: "That change could not be replayed." };
}

/**
 * Build the whole Deck Check report.
 * @param {{ parsed: any, facts: Record<string, any>, notFound?: string[], format?: string, strategy?: string, commanderNames?: string[] }} input
 */
export function buildDeckCheckReport(input = {}) {
  const { parsed, facts = {}, notFound = [], strategy = "" } = input;
  const format = deckCheckFormat(input.format);
  if (!parsed || !parsed.entries?.length) {
    return { status: "empty", format, structure: null, message: "Paste a decklist to check it." };
  }
  const commanderNames = input.commanderNames || parsed.commanderNames || [];
  const structure = checkDeckStructure({ parsed, facts, notFound, format: format.id, commanderNames });
  const limits = [
    "MetaForge reads each card's printed text from Scryfall and applies its own rules. No AI model is called.",
    "Role ranges and curve bands are MetaForge's starting points for this kind of plan, not rules of the game.",
    "It does not know your playgroup, your budget or the cards you own, and it does not check prices.",
  ];

  if (!format.commander) {
    return {
      status: "structure-only",
      format,
      structure,
      summary: nonCommanderSummary(parsed, facts),
      limits: [
        ...limits.slice(0, 1),
        `For ${format.label}, Deck Check confirms legality, copy limits, deck size, curve and color needs. Plan, weakness and swap coaching is calibrated for 100-card Commander decks and is not shown for this format.`,
      ],
    };
  }

  const commanders = commanderNames.map((name) => factFor(facts, name)).filter(Boolean);
  if (!commanders.length) {
    return {
      status: "needs-commander",
      format,
      structure,
      candidates: commanderCandidates(parsed, facts),
      limits,
    };
  }

  const cards = coachCards(parsed, facts, commanders.map((commander) => commander.name));
  const before = runCoaches(commanders, cards, strategy);
  if (!before.curveRole?.readable) {
    return { status: "unreadable", format, structure, message: before.curveRole?.message || "The printed text could not be read.", limits };
  }
  const swaps = replayableSwaps(before.curveRole, cards);
  const comparisons = swaps.slice(0, 3).map((swap) => compareSwap({ swap, commanders, cards, strategy, before, parsed })).filter(Boolean);
  // The coach lists every nonland with no rules text as unread. A vanilla
  // creature (Leatherback Baloth) was read fine; it just has no text. Only
  // names Scryfall did not return are truly unread.
  const unread = (before.curveRole.unread || []).filter((name) => !factFor(facts, name));
  const reportLimits = [...limits];
  if (unread.length) reportLimits.push(`${unread.length} card${unread.length === 1 ? " was" : "s were"} not found and ${unread.length === 1 ? "is" : "are"} not counted: ${unread.slice(0, 6).join(", ")}${unread.length > 6 ? "…" : ""}.`);
  if (before.curveRole.partial) reportLimits.push("The list is well short of 100 cards, so the role ranges are scaled down and the read is rougher.");
  if (!structure.legal) reportLimits.push("The list has construction problems (see Format check). The coaching below still reads the cards that are there.");

  const plan = before.curveRole.plan;
  const commanderLabel = commanders.map((commander) => commander.name).join(" + ");
  const planSentence = plan.id === "midrange" && !strategy
    ? `${commanderLabel}'s printed text does not name a sharp plan, so the deck is judged as a general midrange deck.`
    : `${commanderLabel} reads as ${plan.label}.`;

  return {
    status: "ready",
    format,
    structure,
    commanders: commanders.map((commander) => ({ name: commander.name, typeLine: commander.typeLine, manaCost: commander.manaCost, colorIdentity: commander.colorIdentity })),
    identity: structure.identity,
    plan: {
      id: plan.id,
      label: plan.label,
      sentence: planSentence,
      quote: plan.excerpt,
      confidence: before.curveRole.confidence,
      strategyNote: before.curveRole.strategyNote || "",
    },
    strengths: strongestJobs(before.curveRole),
    curve: before.curveRole.curve,
    roles: before.curveRole.roles,
    weaknessHeading: before.curveRole.weaknessHeading,
    weaknessIntro: before.curveRole.weaknessIntro,
    weaknesses: before.curveRole.weaknesses,
    mana: before.mana?.readable ? {
      summary: before.mana.summary || before.mana.lands?.summary || "",
      lands: before.mana.lands,
      colors: (before.mana.colors || []).map((color) => ({ color: color.color, word: color.word, status: color.status, summary: color.summary, have: color.have, needed: color.needed })),
      confidence: before.mana.confidence,
    } : null,
    comparisons,
    noSwapNote: comparisons.length
      ? ""
      : (before.curveRole.lessons || []).map((lesson) => lesson.swapNote).find(Boolean)
        || "No swap from the cards MetaForge can vouch for fits this list. You can still test your own change below.",
    deckCards: [...new Set(cards.filter((card) => card.typeLine).map((card) => card.name))].sort((a, b) => a.localeCompare(b)),
    limits: reportLimits,
  };
}
