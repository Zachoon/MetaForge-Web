// MetaForge Commander Power Signal
// A Commander-family-specific ("Commander", "Brawl", "Standard Brawl" —
// singleton, commander-led formats only, never Standard or any other
// competitive 60-card format) "how strong is this build" indicator.
//
// Every signal here traces to real, quoted oracle text on real cards in
// the actual build, or to a real mutual relationship in this exact
// build's own verified interaction graph — never to a named-card
// dataset. No blacklist/allowlist of specific cards exists anywhere in
// this module: it deliberately generalizes across every commander,
// theme, archetype, and card pool by classifying what a card's text
// *does* (repeatable value, efficient interaction, acceleration,
// tutoring, resource multiplication) rather than checking what a card
// *is named*. This is a load-bearing design choice, not an oversight —
// a named list would need a documented source, version, and update
// process to stay honest, and would silently miss every new printing
// and every off-list card that does the same thing. The tier label is
// Forge Theory (a bounded heuristic), never presented as a rule, a
// guaranteed pod fit, or a claim to reproduce any official bracket
// system's exact criteria.

function manaValueOf(card) {
  if (Number.isFinite(card?.cmc)) return card.cmc;
  const cost = card?.manaCost || card?.mana_cost || "";
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return 0;
  return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^[XYZ]$/.test(symbol) ? 0 : 1), 0);
}

function manaProducedByAddClause(card) {
  const text = card?.oracleText || "";
  return [...text.matchAll(/\badd\b[^.]*?((?:\{[^}]+\}){1,}|one mana|two mana|three mana|four mana|five mana)/gi)]
    .reduce((largest, match) => {
      const symbols = (match[1].match(/\{[^}]+\}/g) || []).length;
      const words = { "one mana": 1, "two mana": 2, "three mana": 3, "four mana": 4, "five mana": 5 }[match[1].toLowerCase()] || 0;
      return Math.max(largest, symbols || words);
    }, 0);
}

// Mana rocks/dorks costing 1 or less accelerate a whole turn ahead of a
// normal land drop — a real, well-understood power signal distinct from
// ordinary ramp. Restricted to Artifact/Creature so an unrelated cheap
// card that happens to mention "add" in a rider clause isn't misread as a
// mana source.
function isFastManaRock(card) {
  const manaValue = manaValueOf(card);
  if (manaValue > 2) return false;
  if (!/\b(Artifact|Creature)\b/i.test(card.typeLine || "")) return false;
  const produced = manaProducedByAddClause(card);
  // One-mana rocks and dorks accelerate the following turn even when
  // they only make one mana. At mana value two, require a real positive
  // burst (three or more) so ordinary Signets/Talismans never become
  // "fast mana" merely because they are efficient ramp.
  return manaValue <= 1 ? produced >= 1 : produced > manaValue;
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

// A cheap (mana value <= 2), unconditional instant-speed answer — the
// efficient-interaction signal. Narrowed to a genuinely unconditional
// clause (no "unless" tax/condition in the same sentence) so a
// pay-to-not-happen effect (e.g. "destroy target creature unless its
// controller pays {3}") isn't credited the same as a hard answer.
function isEfficientInteraction(card) {
  if (manaValueOf(card) > 2) return false;
  if (!/\b(Instant|Sorcery)\b/i.test(card.typeLine || "")) return false;
  const text = card.oracleText || "";
  const firstClause = text.split(/(?<=\.)\s/)[0] || text;
  if (/\bunless\b/i.test(firstClause)) return false;
  return /\b(?:destroy|exile) target\b[^.]{0,40}\b(?:creature|permanent|planeswalker)\b/i.test(firstClause)
    || /\bcounter target spell\b/i.test(firstClause);
}

// The single highest-leverage new signal: a card that keeps generating
// real value (a card, a permanent, damage) every time a cheap, common
// game action happens, with no one-time ceiling — the actual mechanical
// shape of a "repeatable engine," whether or not it happens to also fit
// any of the categories above. Two independent shapes both qualify:
//   1. A recurring trigger (casting a spell, a creature dying, an
//      upkeep/end step) paired with a genuine value outcome (draw,
//      tutor, cheat a permanent into play, meaningful damage) anywhere
//      in the same card's text.
//   2. A repeatable activated sacrifice-outlet ("Sacrifice a
//      creature: ...") whose payoff is itself card advantage, damage,
//      or counter manipulation — the classic Commander sac-engine shape.
// Deliberately excludes single-shot triggers ("when this enters the
// battlefield") and narrow/conditional triggers (e.g. "whenever you
// draw your second card each turn") — those are ordinary value or
// synergy, not the compounding, low-friction engine shape this checks
// for. A card matching only a mild synergy trigger must not read the
// same as a genuine engine; false positives here are exactly the
// "synergistic isn't automatically powerful" trap this module has to
// avoid.
const REPEATABLE_TRIGGER = /\bwhenever you cast\b[^.]{0,60}\bspell\b|\bat the beginning of (?:your|each) (?:upkeep|end step)\b|\bwhenever (?:a|another) creature (?:you control )?dies\b|\bwhenever [^.]{0,40}\bdeals? combat damage to a (?:player|opponent)\b/i;
const VALUE_OUTCOME = /\bdraw(?:s)? (?:a|an|\d+|x|that many) cards?\b|\bsearch your library\b|\bonto the battlefield\b|\bdeals? (?:\d+|x) damage to (?:any target|each opponent|target player)\b|\bcreate[s]? [^.]{0,30}\btreasure\b/i;

function isRepeatableSacEngine(card) {
  const text = card.oracleText || "";
  return /\bsacrifice (?:a|an|another)\b[^:]{0,50}:/i.test(text)
    && /\bdraw a card\b|\bdeals? (?:\d+|x) damage\b|\bput[s]? a[^.]{0,10}counter\b/i.test(text);
}

function isRepeatableValueEngine(card) {
  if (isRepeatableSacEngine(card)) return true;
  const text = card.oracleText || "";
  return REPEATABLE_TRIGGER.test(text) && VALUE_OUTCOME.test(text);
}

// Extra combat, doubled mana, or copying a spell/ability all multiply a
// resource the rest of the deck already produces, rather than merely
// producing more of it once — a distinct shape from plain fast mana or
// an extra turn.
function isResourceMultiplier(card) {
  const text = card.oracleText || "";
  return /\ban? additional combat phase\b|\btakes? an (?:extra|additional) combat\b/i.test(text)
    || /\bdouble[s]? (?:the amount of )?mana\b|\bmana of any (?:one )?type (?:equal to|for each)\b/i.test(text)
    || /\bcopy target (?:instant|sorcery|spell|activated ability|triggered ability)\b/i.test(text);
}

// Every category a card independently matches, in a fixed evaluation
// order — used both for deck-level aggregation (a card can rightly
// count toward more than one category) and, via powerSignalCategoryFor
// below, for a single-category construction-time bias.
function powerCategoriesFor(card) {
  const categories = [];
  if (isFastManaRock(card) || isManaRitual(card)) categories.push("fastMana");
  if (tutorKind(card) === "unrestricted") categories.push("tutor");
  if (isExtraTurn(card)) categories.push("extraTurn");
  if (isMassLandDenial(card)) categories.push("massLandDenial");
  if (isEfficientInteraction(card)) categories.push("efficientInteraction");
  if (isRepeatableValueEngine(card)) categories.push("repeatableValueEngine");
  if (isResourceMultiplier(card)) categories.push("resourceMultiplier");
  return categories;
}

// How much each category contributes per matching card to the deck-level
// score (evaluateCommanderPowerSignal) and, reused as-is, to the
// construction-time target-tier bias (native-masterwork-engine.mjs's
// powerTierScoreFor) — one canonical weight table instead of two
// drifting copies. massLandDenial and repeatableValueEngine carry the
// heaviest single-card weight: a real "destroy all lands" effect and a
// genuine compounding engine are both rare, high-ceiling inclusions,
// unlike an efficient two-mana removal spell, which is common enough in
// even a casual pile to warrant a lighter weight.
export const CATEGORY_WEIGHT = Object.freeze({
  fastMana: 1,
  tutor: 1,
  extraTurn: 1,
  massLandDenial: 2,
  efficientInteraction: 0.5,
  repeatableValueEngine: 2,
  resourceMultiplier: 1.5,
});

const TIERS = [
  { max: 2, tier: "Casual", note: "Few or no verified acceleration, tutoring, repeatable-engine, or resource-multiplication signals detected — including at most one real high-ceiling inclusion, which alone is normal variety, not a build's defining shape." },
  { max: 6, tier: "Focused", note: "A handful of real power signals — a build with teeth, not a stax or combo-first list." },
  { max: 12, tier: "High-Power", note: "Multiple real signals, meaningful redundancy within a category, and/or a verified compact interaction between high-ceiling cards — likely to outpace a casual pod." },
  { max: Infinity, tier: "Maximum", note: "A dense concentration of power signals, redundant engines, and/or verified combo-proximate interactions — a competitive-leaning build." },
];

// Exposed so a caller choosing between tiers (a Blueprint target-tier
// selector, say) has the same ordinal ranking this module uses
// internally, instead of re-deriving or hardcoding a second copy of it.
export const POWER_TIERS = Object.freeze(TIERS.map((entry) => entry.tier));

// A single card's power-signal category, if any — reuses the exact same
// detectors evaluateCommanderPowerSignal itself runs per card, so a
// caller scoring construction-time candidates (native-masterwork-engine's
// scoreCard, biasing toward a player-chosen target tier) reads the same
// certain, evidence-anchored signals rather than a second, drifting
// copy. Returns the single category with the HIGHEST CATEGORY_WEIGHT
// among every category the card actually matches — not merely the first
// one powerCategoriesFor happens to check — so a card matching both a
// light signal (e.g. efficientInteraction) and a heavy one (e.g.
// repeatableValueEngine) is biased by its real strongest signal, not by
// evaluation order. Ties (equal weight) resolve to whichever category
// powerCategoriesFor listed first, which keeps this deterministic for
// the same card every time.
export function powerSignalCategoryFor(card) {
  const categories = powerCategoriesFor(card);
  if (!categories.length) return null;
  return categories.reduce((strongest, category) => (CATEGORY_WEIGHT[category] > CATEGORY_WEIGHT[strongest] ? category : strongest), categories[0]);
}

const normalizedCardName = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

// A card whose text alone unlocks or multiplies another card's ceiling —
// checked generically (any commander whose text says spells you cast get
// cheaper/replace themselves/make tokens), never by name, and only
// credited once the deck actually carries enough of the resource being
// amplified (15+ real instants/sorceries) to make the synergy a real,
// load-bearing part of the build rather than an incidental one-off.
function commanderAmplifiesSpells(commander, nonlands) {
  const text = commander?.oracleText || "";
  if (!/\b(?:instant|sorcery)\b[^.]{0,30}\byou cast\b/i.test(text)) return false;
  if (!/\bdraw a card\b|\bcopy\b|\bcosts? \{?\d\}? less\b|\bcreate[s]? (?:a|an|\d+)[^.]{0,30}\btoken\b/i.test(text)) return false;
  const spellCount = nonlands
    .filter((card) => /\b(Instant|Sorcery)\b/i.test(card.typeLine || ""))
    .reduce((sum, card) => sum + Math.max(1, Number(card.quantity) || 1), 0);
  return spellCount >= 15;
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
// and an empty interconnection/comboProximity section instead of a crash.
export function evaluateCommanderPowerSignal(cards, interactionGraph = null) {
  const nonlands = cards.filter((card) => !/\bLand\b/i.test(card.typeLine || ""));
  const commander = cards.find((card) => card.isCommander) || null;

  const buckets = {
    fastMana: [], tutor: [], extraTurn: [], massLandDenial: [],
    efficientInteraction: [], repeatableValueEngine: [], resourceMultiplier: [],
  };
  const tutorsRestricted = [];
  let cmcTotal = 0;
  let cmcCount = 0;

  for (const card of nonlands) {
    for (const category of powerCategoriesFor(card)) buckets[category].push(card.name);
    const kind = tutorKind(card);
    if (kind === "restricted") tutorsRestricted.push(card.name);
    if (!card.isCommander) {
      cmcTotal += manaValueOf(card) * Math.max(1, Number(card.quantity) || 1);
      cmcCount += Math.max(1, Number(card.quantity) || 1);
    }
  }
  for (const key of Object.keys(buckets)) buckets[key] = [...new Set(buckets[key])];
  const distinctTutorsRestricted = [...new Set(tutorsRestricted)];

  const baseScore = Object.entries(buckets).reduce((sum, [category, names]) => sum + names.length * CATEGORY_WEIGHT[category], 0);

  // efficientInteraction is a real, legitimate power signal — it
  // contributes to baseScore above like every other category — but it is
  // NOT a high-ceiling signal on its own: a cheap, unconditional removal
  // spell or counterspell is common enough in even a genuinely casual
  // pile that a healthy interaction package must never, by itself, read
  // as a repeatable engine, a compact combo piece, or mass land denial
  // do. Everything downstream that means "this card meaningfully raises
  // the deck's ceiling" (highCeilingCards, the density floor, combo
  // proximity eligibility) is deliberately computed only over the other,
  // genuinely high-ceiling categories.
  const HIGH_CEILING_CATEGORIES = ["fastMana", "tutor", "extraTurn", "massLandDenial", "repeatableValueEngine", "resourceMultiplier"];

  // Redundancy: a single tutor/engine/removal spell is a fine, ordinary
  // inclusion; two or more of the same HIGH-CEILING category is a real,
  // repeatable pattern of access rather than one splashy outlier —
  // credited on top of the base per-card weight, capped per category so
  // one enormous bucket can't dominate the whole score by itself.
  // Deliberately excludes efficientInteraction: redundancy is what a
  // large, ordinary interaction package would otherwise accumulate the
  // fastest (a healthy Commander deck routinely runs six-plus cheap
  // answers), and crediting it here is exactly how interaction density
  // alone used to reach High-Power before this exclusion.
  const redundancyBonus = HIGH_CEILING_CATEGORIES.reduce((sum, category) => sum + Math.min(Math.max(0, buckets[category].length - 1), 3), 0);

  const highCeilingCards = [...new Set(HIGH_CEILING_CATEGORIES.flatMap((category) => buckets[category]))];
  const highCeilingSet = new Set(highCeilingCards.map(normalizedCardName));

  // Density floor: enough independently-verified high-ceiling cards is
  // itself evidence a build isn't casual, regardless of what the rest of
  // a large singleton pool looks like. This is the direct fix for the
  // failure mode that motivated this module's redesign: several real
  // high-ceiling inclusions (each individually verified, never a single
  // splashy card alone, and never merely an efficient-interaction spell)
  // must not be averaged away by 90+ ordinary role players sitting
  // around them, since this score is never divided by deck size in the
  // first place.
  let densityFloor = 0;
  if (highCeilingCards.length >= 10) densityFloor = 13;
  else if (highCeilingCards.length >= 6) densityFloor = 7;
  else if (highCeilingCards.length >= 3) densityFloor = 3;

  // Combo proximity: a real mutual interaction-graph loop is ordinary
  // synergy on its own (see the interconnection section below, always
  // informational) — it only counts toward power here once *both* cards
  // in the loop are independently verified high-ceiling cards in their
  // own right. That keeps an interconnected-but-ordinary build (two
  // token/lifegain payoffs feeding each other, say) from ever being
  // misread as a compact combo, while still crediting a real build
  // where two independently powerful pieces also verifiably combine.
  const comboProximityPairs = [...new Set(
    (interactionGraph?.enginePairs || [])
      .filter((pair) => pair.cards.every((name) => highCeilingSet.has(normalizedCardName(name))))
      .map((pair) => pair.cards.join(" + ")),
  )];
  const comboProximityBonus = Math.min(comboProximityPairs.length, 3) * 2;

  // Commander-specific synergy: the commander is guaranteed access every
  // game, unlike a 1-of-99 inclusion, so its own signal (already counted
  // once above in the general per-card scan) earns one additional unit
  // of credit here. Separately, a commander whose text generically
  // amplifies a resource this exact build actually carries in real
  // quantity (see commanderAmplifiesSpells) is credited as unlocking or
  // multiplying the deck's ceiling beyond what summing individual cards
  // alone would show — never checked by the commander's name, only by
  // what its text does and what the deck actually contains.
  const commanderOwnCategories = commander ? powerCategoriesFor(commander) : [];
  const commanderAmplifiedCards = commander
    ? [...new Set(
        (interactionGraph?.enginePairs || [])
          .filter((pair) => pair.cards.includes(commander.name))
          .flatMap((pair) => pair.cards.filter((name) => name !== commander.name && highCeilingSet.has(normalizedCardName(name)))),
      )]
    : [];
  const commanderSpellSynergy = commander ? commanderAmplifiesSpells(commander, nonlands) : false;
  const commanderStrongestCategory = commander ? powerSignalCategoryFor(commander) : null;
  const commanderBonus =
    (commanderStrongestCategory ? CATEGORY_WEIGHT[commanderStrongestCategory] : 0)
    + commanderAmplifiedCards.length * 2
    + (commanderSpellSynergy ? 3 : 0);

  // A low curve only raises the ceiling when the list already contains a
  // repeatable high-ceiling package. This prevents a pile of cheap casual
  // creatures from being mislabeled while recognizing that several
  // tutors/engines/fast-mana pieces become materially more consistent in
  // a streamlined shell. The adjustment is deliberately small and capped.
  const averageCmc = cmcCount ? Number((cmcTotal / cmcCount).toFixed(2)) : 0;
  const streamlinedBonus = highCeilingCards.length >= 3 && averageCmc > 0 && averageCmc <= 2.5
    ? (averageCmc <= 2 ? 2 : 1)
    : 0;

  const rawScore = baseScore + redundancyBonus + comboProximityBonus + commanderBonus + streamlinedBonus;
  const signalScore = Number(Math.max(rawScore, densityFloor).toFixed(2));
  const { tier, note } = TIERS.find((entry) => signalScore <= entry.max);

  const weightedEvidenceCount = highCeilingCards.length + buckets.efficientInteraction.length + comboProximityPairs.length;
  const expectedDeckSize = cards.some((card) => card.isCommander) ? 100 : null;
  const representedCards = cards.reduce((sum, card) => sum + Math.max(1, Number(card.quantity) || 1), 0);
  const completeDeck = expectedDeckSize ? representedCards >= expectedDeckSize - 1 : representedCards >= 60;
  const confidence = completeDeck && weightedEvidenceCount >= 6
    ? "High"
    : completeDeck || weightedEvidenceCount >= 4
      ? "Moderate"
      : "Low";
  const tierIndex = TIERS.findIndex((entry) => entry.tier === tier);
  const assessedRange = confidence === "High"
    ? [tier]
    : [TIERS[Math.max(0, tierIndex - 1)].tier, tier].filter((value, index, values) => values.indexOf(value) === index);

  // Deliberately kept out of the score above unless it clears the
  // comboProximity bar: a mutual two-card loop is a *synergy* claim
  // (each card feeds the other something), and a trigger amplifier is a
  // *build-around* claim — neither one verifies the loop actually goes
  // infinite or costs nothing to repeat. Folding every synergy-dense but
  // ordinary-power casual deck's raw loop count into the score would
  // conflate "interconnected" with "powerful," the exact overreach this
  // module's evidence-anchored signals otherwise avoid. This section
  // stays exactly as informational as before this redesign; the new,
  // separately-labeled comboProximity section above is the only place a
  // real mutual loop is ever counted, and only for pairs of cards that
  // were already independently verified powerful on their own terms.
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

  return Object.freeze({
    tier,
    note,
    signalScore,
    averageCmc,
    confidence,
    assessedRange: Object.freeze(assessedRange),
    calibration: Object.freeze({
      completeDeck,
      representedCards,
      expectedDeckSize,
      baseScore: Number(baseScore.toFixed(2)),
      redundancyBonus,
      comboProximityBonus,
      commanderBonus: Number(commanderBonus.toFixed(2)),
      streamlinedBonus,
      densityFloor,
      explanation: "Confidence rises when the full deck is available and multiple independent evidence types agree. A streamlined curve only adds power when at least three high-ceiling cards are already present.",
    }),
    fastMana: Object.freeze(buckets.fastMana),
    tutors: Object.freeze({ unrestricted: Object.freeze(buckets.tutor), restricted: Object.freeze(distinctTutorsRestricted) }),
    extraTurns: Object.freeze(buckets.extraTurn),
    massLandDenial: Object.freeze(buckets.massLandDenial),
    efficientInteraction: Object.freeze(buckets.efficientInteraction),
    repeatableValueEngine: Object.freeze(buckets.repeatableValueEngine),
    resourceMultiplier: Object.freeze(buckets.resourceMultiplier),
    // Every card that matches ANY category, including efficientInteraction
    // — a real signal, but not by itself evidence of a high ceiling. See
    // highCeilingCards below for the narrower, genuinely-high-ceiling set.
    generalPowerSignalCards: Object.freeze([...new Set(Object.values(buckets).flat())]),
    // fastMana/tutor/extraTurn/massLandDenial/repeatableValueEngine/
    // resourceMultiplier only — deliberately excludes efficientInteraction
    // (see HIGH_CEILING_CATEGORIES above). This is the set the density
    // floor and comboProximity eligibility are both computed from.
    highCeilingCards: Object.freeze(highCeilingCards),
    highCeilingCount: highCeilingCards.length,
    comboProximity: Object.freeze({
      pairs: Object.freeze(comboProximityPairs),
      count: comboProximityPairs.length,
      evidence: "Real mutual interaction-graph loops between two cards that were each independently verified high-ceiling on their own oracle text — the only interconnection evidence this module ever counts toward the power tier.",
    }),
    commanderSynergy: Object.freeze({
      ownSignal: commanderOwnCategories.length > 0,
      ownCategories: Object.freeze(commanderOwnCategories),
      amplifiedCards: Object.freeze(commanderAmplifiedCards),
      spellSynergy: commanderSpellSynergy,
      evidence: "Whether the commander itself carries a verified power signal, verifiably combines with another high-ceiling card in this build's own interaction graph, or generically amplifies a resource (e.g. instants/sorceries) this build actually carries in real quantity — never checked by the commander's name.",
    }),
    interconnection: Object.freeze({
      comboLoops: Object.freeze(comboLoops),
      comboLoopTotal: allComboLoops.length,
      amplifiers: Object.freeze(amplifiers),
      resetShapes: Object.freeze(
        [...new Set((interactionGraph?.resetPairs || []).map((pair) => pair.cards.join(" + ")))].slice(0, 5),
      ),
      resetShapeTotal: (interactionGraph?.resetPairs || []).length,
      evidence: "Every real mutual mechanical loop and verified rules-text trigger amplifier from this build's own interaction graph — informational, not counted toward the power tier above (see comboProximity for the subset that is), and not a claim that any loop goes infinite. Reset/pay shapes are a separate observation pass and are also not counted.",
    }),
    evidence: "Forge Theory: a bounded heuristic over real, quoted oracle-text signals and this build's own verified interaction graph — no named-card dataset of any kind, so this generalizes across every commander, theme, and card pool rather than only cards on a fixed list. Not a claim to match any official bracket system's named-card criteria, and not a guarantee this deck fits a given pod.",
  });
}
