// MetaForge Commander Power Signal
// A Commander-specific "how strong is this build" indicator, built from
// structurally verifiable oracle-text signals already available on the
// same reconnected card records buildForgeStructuralAnalysis consumes —
// not a claim to reproduce any official bracket system's exact named-card
// list, since that list can't be verified against this codebase's own
// evidence standard. Every signal here traces to real, quoted oracle text
// on real cards in the actual build; the tier label is Forge Theory (a
// bounded heuristic), never presented as a rule or a guaranteed pod fit.

function manaValueOf(card) {
  if (Number.isFinite(card?.cmc)) return card.cmc;
  const cost = card?.manaCost || card?.mana_cost || "";
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return 0;
  return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^[XYZ]$/.test(symbol) ? 0 : 1), 0);
}

// Mana rocks/dorks costing 1 or less accelerate a whole turn ahead of a
// normal land drop — a real, well-understood power signal distinct from
// ordinary ramp. Restricted to Artifact/Creature so an unrelated cheap
// card that happens to mention "add" in a rider clause isn't misread as a
// mana source.
function isFastManaRock(card) {
  if (manaValueOf(card) > 1) return false;
  if (!/\b(Artifact|Creature)\b/i.test(card.typeLine || "")) return false;
  return /\badd\b.{0,12}(\{[^}]+\}|one mana|mana of any)/i.test(card.oracleText || "");
}

// A one-shot ritual that nets more mana than it costs (Dark Ritual: pay 1,
// add 3) is the other classic "fast mana" shape — checked by counting mana
// symbols actually produced against the spell's own mana value, not just
// pattern-matching the word "add".
function isManaRitual(card) {
  if (!/\b(Instant|Sorcery)\b/i.test(card.typeLine || "")) return false;
  const text = card.oracleText || "";
  const addedSymbols = [...text.matchAll(/\badd\b[^.]*?((?:\{[^}]+\}){1,}|one mana|two mana|three mana)/gi)]
    .reduce((sum, match) => sum + ((match[1].match(/\{[^}]+\}/g) || []).length || { "one mana": 1, "two mana": 2, "three mana": 3 }[match[1].toLowerCase()] || 0), 0);
  return addedSymbols > manaValueOf(card);
}

// Deliberately narrow: only an unconditional "search your library for a
// card" clause counts, and a tutor that's explicitly restricted to basic
// lands is real ramp, not the same threat-tutoring signal as an
// unrestricted or combo-piece tutor. A card can only be one or the other,
// checked in that order.
function tutorKind(card) {
  const text = card.oracleText || "";
  const match = text.match(/search your library for [^.]{0,90}?\bcards?\b/i);
  if (!match) return null;
  return /\bbasic land\b/i.test(match[0]) ? "restricted" : "unrestricted";
}

function isExtraTurn(card) {
  return /takes? an (?:extra|additional) turn/i.test(card.oracleText || "");
}

// Deliberately scoped to the single, unmistakable "Destroy all lands"
// template (Armageddon and its reprints/analogues) rather than every
// phrasing that could plausibly deny land — a narrower, certain claim
// beats a broader, guessed one, same discipline forge-interaction-graph's
// NEGATIVE_RULES already follows.
function isMassLandDenial(card) {
  return /destroy all lands\b/i.test(card.oracleText || "");
}

const TIERS = [
  { max: 1, tier: "Casual", note: "Few or no fast-mana, unrestricted-tutor, extra-turn, or mass-land-denial signals detected." },
  { max: 4, tier: "Focused", note: "A handful of real power signals — a build with teeth, not a stax or combo-first list." },
  { max: 8, tier: "High-Power", note: "Multiple real fast-mana, tutor, or extra-turn signals — likely to outpace a casual pod." },
  { max: Infinity, tier: "Maximum", note: "A dense concentration of fast-mana, tutor, extra-turn, and/or mass-land-denial signals — a competitive-leaning build." },
];

// Exposed so a caller choosing between tiers (a Blueprint target-tier
// selector, say) has the same ordinal ranking this module uses
// internally, instead of re-deriving or hardcoding a second copy of it.
export const POWER_TIERS = Object.freeze(TIERS.map((entry) => entry.tier));

// A single card's power-signal category, if any — reuses the exact same
// detectors evaluateCommanderPowerSignal itself runs per card, so a
// caller scoring construction-time candidates (native-masterwork-engine's
// scoreCard, biasing toward a player-chosen target tier) reads the same
// certain, oracle-text-anchored signals rather than a second, drifting
// copy of the same regexes. Returns at most one category — a card is
// scored for its *strongest* signal, not summed across all of them,
// mirroring how each category already only counts a card once above.
export function powerSignalCategoryFor(card) {
  if (isFastManaRock(card) || isManaRitual(card)) return "fastMana";
  if (tutorKind(card) === "unrestricted") return "tutor";
  if (isExtraTurn(card)) return "extraTurn";
  if (isMassLandDenial(card)) return "massLandDenial";
  return null;
}

// cards: the same {name, typeLine, oracleText, quantity, isCommander}[]
// shape buildSelectedStructuralCards already produces for
// buildForgeStructuralAnalysis — reused here rather than re-deriving a
// second reconnection to the verified pool.
//
// interactionGraph: the same graph buildForgeStructuralAnalysis already
// computes for this exact build (its own `.graph` field) — passed in
// rather than recomputed, so this costs nothing extra on the generation
// path. Optional: callers without one (direct unit tests, or a future
// caller that hasn't built a graph yet) get every other signal unaffected
// and an empty interconnection section instead of a crash.
export function evaluateCommanderPowerSignal(cards, interactionGraph = null) {
  const nonlands = cards.filter((card) => !/\bLand\b/i.test(card.typeLine || ""));
  const fastMana = [];
  const tutors = { unrestricted: [], restricted: [] };
  const extraTurns = [];
  const massLandDenial = [];
  let cmcTotal = 0;
  let cmcCount = 0;

  for (const card of nonlands) {
    if (isFastManaRock(card) || isManaRitual(card)) fastMana.push(card.name);
    const kind = tutorKind(card);
    if (kind) tutors[kind].push(card.name);
    if (isExtraTurn(card)) extraTurns.push(card.name);
    if (isMassLandDenial(card)) massLandDenial.push(card.name);
    if (!card.isCommander) {
      cmcTotal += manaValueOf(card) * Math.max(1, Number(card.quantity) || 1);
      cmcCount += Math.max(1, Number(card.quantity) || 1);
    }
  }

  // Deliberately kept out of signalScore/tier below: a mutual two-card
  // loop is a *synergy* claim (each card feeds the other something),
  // and a trigger amplifier is a *build-around* claim — neither one
  // verifies the loop actually goes infinite or costs nothing to repeat.
  // Folding a synergy-dense but ordinary-power casual deck's loop count
  // into the same score as fast mana/tutors/extra turns would conflate
  // "interconnected" with "powerful," the exact overreach this module's
  // narrow, oracle-text-anchored signals otherwise avoid.
  //
  // enginePairs already arrives sorted by edge strength (buildInteractionGraph
  // sorts it before returning), so slicing to the top 5 keeps the strongest,
  // most notable loops — verified against a real 100-card build that
  // returned 551 total mutual pairs: a real number, but useless as a raw
  // count to a player, so comboLoopTotal keeps that honest without forcing
  // every consumer to render a list of hundreds.
  const allComboLoops = [...new Set((interactionGraph?.enginePairs || []).map((pair) => pair.cards.join(" + ")))];
  const comboLoops = allComboLoops.slice(0, 5);
  const amplifiers = [...new Set((interactionGraph?.amplifiers || []).map((entry) => entry.source))];

  const signalScore = fastMana.length + tutors.unrestricted.length + extraTurns.length + massLandDenial.length * 2;
  const { tier, note } = TIERS.find((entry) => signalScore <= entry.max);

  return Object.freeze({
    tier,
    note,
    signalScore,
    averageCmc: cmcCount ? Number((cmcTotal / cmcCount).toFixed(2)) : 0,
    fastMana: Object.freeze([...new Set(fastMana)]),
    tutors: Object.freeze({ unrestricted: [...new Set(tutors.unrestricted)], restricted: [...new Set(tutors.restricted)] }),
    extraTurns: Object.freeze([...new Set(extraTurns)]),
    massLandDenial: Object.freeze([...new Set(massLandDenial)]),
    interconnection: Object.freeze({
      comboLoops: Object.freeze(comboLoops),
      comboLoopTotal: allComboLoops.length,
      amplifiers: Object.freeze(amplifiers),
      evidence: "Real mutual mechanical loops and verified rules-text trigger amplifiers from this build's own interaction graph — informational, not counted toward the power tier above, and not a claim that any loop goes infinite.",
    }),
    evidence: "Forge Theory: a bounded heuristic over real, quoted oracle-text signals in this exact build — not a claim to match any official bracket system's named-card criteria, and not a guarantee this deck fits a given pod.",
  });
}
