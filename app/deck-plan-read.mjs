// Deck Check — what is this deck trying to do, and how sure are we?
// -----------------------------------------------------------------
// MF-DECK-COACH-003. The coach used to read the plan from the commander's
// printed text alone (reasoning-engine/deck-profile.mjs readCommanderPlan).
// That missed commanders whose text names a plan in words the mechanic graph
// does not model (Sram: "Whenever you cast an Aura, Equipment, or Vehicle
// spell"; Ghalta: "the total power of creatures you control"), and it read a
// lone keyword as a plan (Tymna's lifelink made Thrasios + Tymna "Life gain").
//
// This module keeps that commander read, corrects those three shapes, and
// adds the other half of the evidence: which cards in the 99 actually pursue
// each plan. Every plan it names carries the evidence behind it and where
// that evidence came from (the commander's text, the deck's cards, or the
// player). It never calls a plan verified: the player can confirm or correct
// it, and Deck Check then coaches against the plan the player chose.
//
// Pure and synchronous; card facts only.

import { readCommanderPlan, ARCHETYPES } from "./reasoning-engine/deck-profile.mjs";
import { classifyPrintedCard } from "./curve-role-coach.mjs";

/** Plans the coach has role and curve bands for, in the order a player picks from. */
export const PLAN_CHOICES = Object.freeze([
  { id: "typal", label: "Typal (one creature type)" },
  { id: "tokens", label: "Go-wide tokens" },
  { id: "creatures", label: "Creature spells" },
  { id: "aristocrats", label: "Aristocrats (sacrifice and death triggers)" },
  { id: "combat", label: "Combat and voltron" },
  { id: "equipment", label: "Equipment" },
  { id: "auras", label: "Auras" },
  { id: "big-creatures", label: "Big creatures" },
  { id: "landfall", label: "Landfall and big mana" },
  { id: "spellslinger", label: "Spellslinger" },
  { id: "artifacts", label: "Artifacts" },
  { id: "enchantress", label: "Enchantments" },
  { id: "blink", label: "Blink and enter-the-battlefield value" },
  { id: "graveyard", label: "Graveyard value" },
  { id: "historic", label: "Historic spells" },
  { id: "control", label: "Control" },
  { id: "midrange", label: "No single plan (general bands)" },
]);

const BANDED = new Set(PLAN_CHOICES.map((choice) => choice.id));
const labelOf = (id) => PLAN_CHOICES.find((choice) => choice.id === id)?.label || ARCHETYPES[id]?.label || id;

const front = (fact) => String(fact?.typeLine || "").split(" // ")[0];
const textOf = (fact) => String(fact?.oracleText || "");
const isLand = (fact) => /\bLand\b/.test(front(fact));
const isCreature = (fact) => /\bCreature\b/.test(front(fact));

/**
 * Card-level signals: a card counts toward a plan when its printed text or
 * type line pursues it. Thresholds are deliberately plain so the evidence
 * line can say exactly what was counted.
 */
const SIGNALS = Object.freeze([
  { id: "landfall", what: "cards that trigger on or add land drops", test: (fact) => /\blandfall\b|\bwhenever a land (?:you control )?enters\b|\bplay (?:an )?additional lands?\b|\bplay lands from your graveyard\b/i.test(textOf(fact)) },
  { id: "tokens", what: "cards that make creature tokens", test: (fact) => /\bcreate[^.]*\bcreature tokens?\b/i.test(textOf(fact)) },
  { id: "aristocrats", what: "sacrifice outlets and death payoffs", test: (fact) => /\bsacrifice (?:a|another) creature\b|\bwhenever [^.]*\bcreature[^.]*\bdies\b/i.test(textOf(fact)) },
  { id: "artifacts", what: "nonland artifacts", test: (fact) => /\bArtifact\b/.test(front(fact)) },
  { id: "enchantress", what: "enchantments", test: (fact) => /\bEnchantment\b/.test(front(fact)) && !/\bAura\b/.test(front(fact)) || /\bwhenever you cast an enchantment\b/i.test(textOf(fact)) },
  { id: "spellslinger", what: "instants and sorceries", test: (fact) => /\b(?:Instant|Sorcery)\b/.test(front(fact)) },
  { id: "equipment", what: "Equipment", test: (fact) => /\bEquipment\b/.test(front(fact)) },
  { id: "auras", what: "Auras", test: (fact) => /\bAura\b/.test(front(fact)) },
  { id: "big-creatures", what: "creatures costing 6 or more", test: (fact) => isCreature(fact) && Number(fact.cmc) >= 6 },
  { id: "blink", what: "cards that exile and return your permanents", test: (fact) => /\bexile [^.]*\b(?:you control|your)\b[^.]*,? (?:then )?return\b/i.test(textOf(fact)) },
  { id: "graveyard", what: "cards that use your graveyard", test: (fact) => /\bfrom your graveyard\b|\bmill\b|\bsurveil\b/i.test(textOf(fact)) },
  { id: "control", what: "counterspells and board wipes", test: (fact) => { const roles = classifyPrintedCard(fact); return roles.counter || roles.wipes; } },
]);

// Minimum count before a deck signal can lead or be named as a second plan.
// Most decks run a dozen instants and sorceries or a few artifacts without
// being "about" them, so those bars sit higher.
// Typal needs 15 of one type: ten mana Elves in a Ghalta list are not an
// Elf deck.
const LEAD_AT = Object.freeze({ spellslinger: 24, artifacts: 22, enchantress: 18, typal: 15, control: 12, "big-creatures": 12, graveyard: 12, combo: 5, default: 10 });
const lead = (id) => LEAD_AT[id] ?? LEAD_AT.default;

function typalSignal(cards) {
  const counts = new Map();
  for (const card of cards) {
    if (!isCreature(card.fact)) continue;
    const subtypes = (front(card.fact).split("—")[1] || "").trim().split(/\s+/).filter(Boolean);
    for (const subtype of subtypes) counts.set(subtype, (counts.get(subtype) || 0) + card.quantity);
  }
  const [type, count] = [...counts].sort((a, b) => b[1] - a[1])[0] || [];
  if (!type) return null;
  return { id: "typal", what: `${type} creatures`, count, names: cards.filter((card) => isCreature(card.fact) && front(card.fact).includes(type)).map((card) => card.fact.name), creatureType: type };
}

/** What the commander's printed text names, with the three known corrections. */
function commanderRead(commanders) {
  const read = readCommanderPlan(commanders.map((fact) => ({ name: fact.name, oracleText: fact.oracleText, typeLine: fact.typeLine, colorIdentity: fact.colorIdentity })));
  const text = commanders.map(textOf).join("\n");
  const corrections = [];
  let id = read.id;
  let confidence = read.confidence || 0;
  // A lifelink keyword is not a life-gain plan; a payoff for gaining life is.
  if (id === "lifegain" && !/\bwhenever you gain life\b|\byou gain (?:\d+|x|that much) life\b|\bgain life\b/i.test(text.replace(/\bLifelink\b/g, ""))) {
    corrections.push("Lifelink on the commander is not a life-gain plan by itself, so it is not read as one.");
    id = "midrange";
    confidence = 0;
  }
  if (id === "midrange") {
    if (/\bwhenever you cast an? (?:Aura|Equipment)\b|\bAura, Equipment\b|\bequipped creature\b|\battach(?:ed)? to\b/i.test(text)) {
      const equipment = /\bEquipment\b|\bequipped\b/i.test(text);
      id = equipment ? "equipment" : "auras";
      confidence = 0.7;
      corrections.push(`The commander's text names ${equipment ? "Equipment" : "Auras"} directly.`);
    } else if (/\btotal power of creatures you control\b|\bcreatures? you control with power \d+ or greater\b|\bpower \d+ or greater\b/i.test(text)) {
      id = "big-creatures";
      confidence = 0.7;
      corrections.push("The commander's text rewards creature power.");
    }
  }
  const quoteLine = text.split("\n").find((line) => line.trim() && !/^\(?(?:Partner|Choose a Background|Flying|Trample|Haste|Vigilance|Reach|Lifelink)\b/i.test(line.trim())) || "";
  return { id, label: id === read.id ? read.label : labelOf(id), confidence, quote: quoteLine.trim().slice(0, 200), corrections, raw: { id: read.id, label: read.label } };
}

/**
 * @param {{ commanders: any[], cards: Array<any & { quantity?: number }> }} input
 */
export function readDeckPlan({ commanders = [], cards = [] } = {}) {
  const pool = cards.filter((card) => card?.name && !isLand(card)).map((fact) => ({ fact, quantity: Number(fact.quantity) || 1 }));
  const nonlandCount = pool.reduce((sum, card) => sum + card.quantity, 0);
  const signals = SIGNALS.map((signal) => {
    const hits = pool.filter((card) => card.fact.oracleText !== undefined && signal.test(card.fact));
    return { id: signal.id, what: signal.what, count: hits.reduce((sum, card) => sum + card.quantity, 0), names: hits.map((card) => card.fact.name) };
  });
  const typal = typalSignal(pool);
  if (typal) signals.push(typal);
  // A pile of instants is not a spellslinger plan without cards that pay off
  // casting them (Thrasios + Tymna read as spellslinger from its counters).
  const spellPayoffs = pool.filter((card) => /\bwhenever you cast (?:an? )?(?:instant|sorcery|noncreature)\b|\binstant (?:and|or) sorcery spells? you cast\b|\bcopy target instant or sorcery\b/i.test(textOf(card.fact))).length;
  const spells = signals.find((signal) => signal.id === "spellslinger");
  if (spells && spellPayoffs < 3) spells.leadBlocked = `only ${spellPayoffs} card${spellPayoffs === 1 ? "" : "s"} pay off casting them`;
  // A printed "you win the game" plus several tutors is a combo finish. It
  // has no band of its own; it is named so the player sees it.
  const winners = pool.filter((card) => /\byou win the game\b/i.test(textOf(card.fact))).map((card) => card.fact.name);
  const tutors = pool.filter((card) => classifyPrintedCard(card.fact).tutor).map((card) => card.fact.name);
  if (winners.length && tutors.length >= 4) {
    signals.push({
      id: "combo",
      what: "win-the-game cards and tutors",
      count: winners.length + tutors.length,
      names: [...winners, ...tutors.slice(0, 3)],
      unbanded: true,
      sentence: `${winners.length} card${winners.length === 1 ? "" : "s"} that say${winners.length === 1 ? "s" : ""} “you win the game” (${winners.slice(0, 3).join(", ")}) and ${tutors.length} tutors to find ${winners.length === 1 ? "it" : "them"} (e.g. ${tutors.slice(0, 3).join(", ")}).`,
    });
  }
  const ranked = signals
    .filter((signal) => !signal.leadBlocked && (signal.id === "combo" || signal.count >= lead(signal.id)))
    .sort((a, b) => b.count / lead(b.id) - a.count / lead(a.id));

  const commander = commanders.length ? commanderRead(commanders) : { id: "midrange", label: labelOf("midrange"), confidence: 0, quote: "", corrections: [], raw: { id: "midrange" } };
  const commanderNamesPlan = commander.id !== "midrange";
  const supporting = (id) => signals.find((signal) => signal.id === id && signal.count > 0) || null;

  let primary;
  if (commanderNamesPlan) {
    const support = supporting(commander.id);
    const corroborated = Boolean(support && support.count >= Math.ceil(lead(commander.id) / 2));
    primary = {
      id: commander.id,
      label: commander.label,
      source: corroborated ? "commander-and-deck" : "commander-text",
      confidence: commander.confidence >= 0.7 && corroborated ? "high" : commander.confidence >= 0.45 ? "medium" : "low",
      evidence: [
        commander.quote ? `${commanders.map((fact) => fact.name).join(" + ")}: “${commander.quote}”` : "",
        support ? `${support.count} ${support.what} in the list${support.names.length ? `, e.g. ${support.names.slice(0, 4).join(", ")}` : ""}.` : "The list has few cards that pursue it directly.",
        ...commander.corrections,
      ].filter(Boolean),
    };
  } else if (ranked.some((signal) => !signal.unbanded)) {
    const top = ranked.find((signal) => !signal.unbanded);
    primary = {
      id: top.id,
      label: top.id === "typal" ? `${top.creatureType} typal` : labelOf(top.id),
      source: "deck-cards",
      confidence: "medium",
      evidence: [
        `The commander's printed text does not name one plan MetaForge reads${commander.quote ? ` (“${commander.quote}”)` : ""}.`,
        `${top.count} ${top.what} in the list, e.g. ${top.names.slice(0, 4).join(", ")}.`,
        ...commander.corrections,
      ],
    };
  } else {
    primary = {
      id: "midrange",
      label: labelOf("midrange"),
      source: "none",
      confidence: "low",
      evidence: [
        `The commander's printed text does not name one plan MetaForge reads, and no single kind of card dominates the list.`,
        ...commander.corrections,
      ],
    };
  }
  const second = ranked.find((signal) => signal.id !== primary.id);
  const secondary = second ? {
    id: second.id,
    label: second.id === "typal" ? `${second.creatureType} typal` : second.id === "combo" ? "Combo finish" : labelOf(second.id),
    banded: !second.unbanded,
    evidence: [second.sentence || `${second.count} ${second.what} in the list, e.g. ${second.names.slice(0, 4).join(", ")}.`],
  } : null;

  return {
    primary,
    secondary,
    // The plan the role and curve bands use. A plan with no bands of its own
    // (counters, life gain) is coached with the general bands, and says so.
    bandId: BANDED.has(primary.id) ? primary.id : "midrange",
    commanderRead: commander,
    signals: signals.filter((signal) => signal.count > 0).sort((a, b) => b.count - a.count),
    nonlandCount,
  };
}

/** A player's choice from PLAN_CHOICES, as the coach's plan. */
export function confirmedPlan(id) {
  const choice = PLAN_CHOICES.find((entry) => entry.id === id);
  return choice ? { id: choice.id, label: choice.id === "midrange" ? "General midrange" : choice.label, source: "player" } : null;
}
