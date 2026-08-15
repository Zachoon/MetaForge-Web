import CARD_MECHANICS from "./card-mechanics.mjs";
import { normalizeCardLookupKey } from "./deck-understanding.mjs";

const normalizeCardName = (name = "") => String(name).normalize("NFKC").trim().toLocaleLowerCase("en");

/** Evidence classes for relationship edges (Founder #018 grows this set). */
export const RELATIONSHIP_EVIDENCE = Object.freeze({
  ORACLE_EXPLICIT: "oracle_explicit",
  ORACLE_MECHANICAL_VERIFIED: "verified card-database mechanic",
  ORACLE_MECHANICAL_INFERRED: "inferred mechanical edge",
  ORACLE_SHARED_SIGNAL: "shared oracle signal",
  ORACLE_CONFLICT: "verified oracle-derived conflict",
  ORACLE_AMPLIFIER: "verified rules-text trigger amplifier",
  ORACLE_MUTUAL_LOOP: "inferred mutual mechanical loop",
  ORACLE_RESET_SHAPE: "inferred oracle reset shape",
});

export const LOOP_KINDS = Object.freeze({
  ENGINE: "engine",
  CLOSED_LOOP: "closed_loop",
  CONDITIONAL_WIN: "conditional_win",
});

export const RESET_SHAPES = Object.freeze({
  ARTIFACT_UNTAP: "artifact_untap",
  COPY_ACTIVATED: "copy_activated",
  COPY_ETB_UNTAP: "copy_etb_untap",
  IMPRINT_UNTAP_ALL: "imprint_untap_all",
});

const RESET_SHAPE_REASON = Object.freeze({
  [RESET_SHAPES.ARTIFACT_UNTAP]: "One card untaps itself for mana; the other untaps an artifact. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.COPY_ACTIVATED]: "One card untaps itself; the other copies an activated ability. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.COPY_ETB_UNTAP]: "One card copies a creature; the other untaps a permanent on enter. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.IMPRINT_UNTAP_ALL]: "One card can recast an imprinted instant; the other untaps nonlands. Reset shape — investigate, not a verified infinite.",
});

const SELF_UNTAP = /\{[^}]+\}: Untap this(?: artifact| creature| permanent)?/i;
const TAP_ADD = /\{T\}: Add \{/;
const UNTAP_TARGET_ARTIFACT = /untap target artifact/i;
const COPY_ACTIVATED = /copy target activated/i;
const COPIES_CREATURE = /create a token that's a copy of[^.]*creature/i;
const ETB_UNTAP_TARGET = /enters(?: the battlefield)?[^.]*untap target (?:creature|permanent|artifact)/i;
const IMPRINTS_INSTANT = /imprint|you may copy the exiled card/i;
const UNTAP_ALL_NONLANDS = /untap all nonland permanents you control/i;

/**
 * Two-card oracle shapes that can reset a tap or restage a spell.
 * Observation only. Not a combo solver and not a claim the loop goes infinite.
 */
export function resetPayShape(leftOracle = "", rightOracle = "") {
  const left = String(leftOracle || "");
  const right = String(rightOracle || "");
  const pair = (leftTest, rightTest) =>
    (leftTest.test(left) && rightTest.test(right)) || (leftTest.test(right) && rightTest.test(left));

  if (pair(SELF_UNTAP, UNTAP_TARGET_ARTIFACT)) return RESET_SHAPES.ARTIFACT_UNTAP;
  if (pair(SELF_UNTAP, COPY_ACTIVATED) && (TAP_ADD.test(left) || TAP_ADD.test(right))) {
    return RESET_SHAPES.COPY_ACTIVATED;
  }
  if (pair(COPIES_CREATURE, ETB_UNTAP_TARGET)) return RESET_SHAPES.COPY_ETB_UNTAP;
  if (pair(IMPRINTS_INSTANT, UNTAP_ALL_NONLANDS)) return RESET_SHAPES.IMPRINT_UNTAP_ALL;
  return null;
}

/**
 * Vocabulary on a pair of oracles. Engine is the default for ordinary
 * producer/payoff loops. Closed_loop is a reset shape. Conditional_win is
 * a board-state win, not a loop.
 */
export function classifyLoopKind(leftOracle = "", rightOracle = "") {
  const left = String(leftOracle || "");
  const right = String(rightOracle || "");
  const combined = `${left}\n${right}`;
  if (/you win the game/i.test(combined) && /if you (?:control|have|own)|, if you /i.test(combined)) {
    return LOOP_KINDS.CONDITIONAL_WIN;
  }
  if (resetPayShape(left, right)) return LOOP_KINDS.CLOSED_LOOP;
  return LOOP_KINDS.ENGINE;
}

export function findResetPayPairs(cards = []) {
  const nodes = (cards || []).filter((card) => card?.name && !/\bLand\b/i.test(card.typeLine || card.type_line || ""));
  const pairs = [];
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const shape = resetPayShape(textOf(left), textOf(right));
      if (!shape) continue;
      pairs.push({
        cards: [left.name, right.name],
        loopKind: LOOP_KINDS.CLOSED_LOOP,
        shape,
        reason: RESET_SHAPE_REASON[shape],
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_RESET_SHAPE,
      });
    }
  }
  return pairs;
}

/**
 * Display / face names a card may be referred to by in Oracle text.
 */
export function referenceNamesForCard(card = {}) {
  const raw = [
    card.name,
    ...String(card.name || "").split(/\s*\/\/\s*/),
    ...(card.card_faces || []).map((face) => face?.name),
  ].filter(Boolean).map((name) => String(name).trim());
  const unique = [];
  const seen = new Set();
  for (const name of raw) {
    const key = normalizeCardLookupKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

/**
 * True when Oracle text explicitly references targetName via authoritative
 * phrasing (named / Partner with / Meld with). Not a bare name mention.
 */
export function oracleExplicitlyNames(oracleText = "", targetName = "") {
  const text = String(oracleText || "");
  const target = String(targetName || "").trim();
  if (!text || !target) return false;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow flexible internal whitespace; require the explicit cue words.
  const nameBody = escaped.replace(/\s+/g, "\\s+");
  const patterns = [
    new RegExp(`\\bnamed\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
    new RegExp(`\\bpartner with\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
    new RegExp(`\\bmeld with\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
  ];
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Explicit Oracle name references from source → other cards in the same set.
 * Self-references are ignored. Only matches cards present in `cards`.
 */
export function findExplicitOracleReferences(cards = []) {
  const nodes = cards.filter((card) => card?.name);
  const catalog = [];
  for (const card of nodes) {
    for (const displayName of referenceNamesForCard(card)) {
      catalog.push({
        key: normalizeCardLookupKey(displayName),
        displayName,
        cardName: card.name,
      });
    }
  }
  // Longer names first so "Sword of Fire and Ice" wins over accidental shorts.
  catalog.sort((a, b) => b.displayName.length - a.displayName.length);

  const refs = [];
  const seen = new Set();
  for (const source of nodes) {
    const sourceText = textOf(source);
    const sourceKeys = new Set(referenceNamesForCard(source).map((name) => normalizeCardLookupKey(name)));
    for (const entry of catalog) {
      if (sourceKeys.has(entry.key)) continue;
      if (!oracleExplicitlyNames(sourceText, entry.displayName)) continue;
      const pairKey = `${normalizeCardLookupKey(source.name)}→${entry.key}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      refs.push({
        from: source.name,
        to: entry.cardName,
        namedAs: entry.displayName,
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
        evidenceClass: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
        reason: `${source.name}'s Oracle text explicitly names ${entry.displayName}.`,
      });
    }
  }
  return refs;
}

function tagSignalsFor(card, table) {
  const tags = CARD_MECHANICS[normalizeCardName(card?.name)];
  if (!tags) return [];
  return Object.entries(table)
    .filter(([, tagNames]) => tagNames.some((tag) => tags.includes(tag)))
    .map(([signal]) => signal);
}

// Curated tags from the offline card-mechanics database confirm a producer or
// payoff role with certainty an oracle-text regex can't match — no keyword
// drift, no missed synonyms. Only mapped where the database draws a clean
// producer/payoff line; ambiguous tags (e.g. broad "card_advantage") are left
// to the regex heuristics below rather than forced into a pairing they don't
// cleanly support.
const TAG_PRODUCERS = {
  tokens: ["token_producer"],
  counters: ["counter_producer"],
  graveyard: ["graveyard_setup"],
  sacrifice: ["sacrifice_outlet"],
  lands: ["land_search"],
  life: ["lifegain"],
  treasure: ["treasure"],
};

const TAG_PAYOFFS = {
  tokens: ["token_payoff"],
  counters: ["counter_payoff"],
  graveyard: ["graveyard_recursion"],
  sacrifice: ["death_payoff"],
  lands: ["landfall_payoff"],
  life: ["lifegain_payoff"],
  spells: ["spell_payoff"],
};

const SIGNALS = [
  ["tokens", /create(?:s)? [^.]* token|token(?:s)? you control/i],
  ["treasure", /treasure token|treasures? you control/i],
  ["clues", /clue token|investigate|clues? you control/i],
  ["artifacts", /artifact(?:s)? you control|artifact spell|artifact enters|sacrifice an artifact/i],
  // Aura is deliberately narrower than enchantment: Pearl-Ear-class
  // commanders reward Auras specifically, and generic enchantments must
  // not form a false synergy edge merely by sharing the enchantment type.
  ["auras", /\bAura\b|affinity for auras|auras? you control|whenever [^.]*\baura\b/i],
  ["counters", /(?:put|remove|double)[^.]* counter|counter(?:s)? on/i],
  ["graveyard", /from your graveyard|in your graveyard|mill [a-z\d]|surveil/i],
  ["sacrifice", /sacrifice (?:a|another|one|any number)|whenever [^.]* dies/i],
  ["draw", /draw (?:a|one|two|three|\d+)|whenever you draw/i],
  ["spells", /whenever you cast|instant or sorcery|noncreature spell/i],
  ["lands", /land enters|landfall|play an additional land|land card/i],
  ["life", /gain(?:s)? [^.]* life|whenever you gain life|life total/i],
  ["etb", /enters the battlefield|when(?:ever)? [^.]* enters/i],
  ["combat", /whenever [^.]* attacks|combat damage|attacking creature/i],
  // Flying/menace/trample/unblockable are printed as literal words in a
  // card's own oracle text whenever it has or grants them — no separate
  // keywords field needed, textOf() already sees them.
  ["evasion", /\bflying\b|\bmenace\b|\btrample\b|can(?:'|’)t be blocked|\bskulk\b/i],
  ["protection", /\bhexproof\b|\bindestructible\b|protection from|\bward\b \d|phase out/i],
];

const PRODUCERS = {
  tokens: /create(?:s)? [^.]* token/i,
  treasure: /create(?:s)? [^.]* treasure|treasure token/i,
  clues: /investigate|create(?:s)? [^.]* clue/i,
  artifacts: /create(?:s)? [^.]* artifact token|artifact spell|investigate/i,
  // Only the Aura subtype produces this signal — "Enchantment" alone does not,
  // and oracle phrases like "affinity for Auras" must not mark the commander
  // itself as an Aura producer. Type-line membership is applied in
  // extractMechanicalSignals.
  counters: /put [^.]* counter|proliferate/i,
  graveyard: /mill [a-z\d]|surveil|discard [^.]* card/i,
  sacrifice: /create(?:s)? [^.]* token|when [^.]* dies/i,
  draw: /draw (?:a|one|two|three|\d+)/i,
  spells: /copy [^.]* spell|cast [^.]* without paying/i,
  lands: /search your library for [^.]* land|play an additional land/i,
  life: /gain(?:s)? [^.]* life|lifelink/i,
  etb: /create(?:s)? [^.]* token|return [^.]* to the battlefield/i,
  combat: /haste|create(?:s)? [^.]* creature token/i,
  // Having or granting the keyword itself is what "produces" evasion — a
  // vanilla flier and an aura that says "target creature gains flying"
  // are the same producer shape from a synergy-detection standpoint.
  evasion: /\bflying\b|\bmenace\b|\btrample\b|can(?:'|’)t be blocked|\bskulk\b/i,
  protection: /\bhexproof\b|\bindestructible\b|protection from|\bward\b|phase out|gains? indestructible|gains? hexproof/i,
  // Producer-only: no PAYOFFS.damage or SIGNALS entry, since "damage
  // matters" payoffs (as opposed to sources that deal damage) don't have a
  // clean, confidently-verified generic phrasing the way tokens/counters/
  // graveyard payoffs do — narrow scope, just enough to support the Fiery
  // Emancipation/Furnace of Rath amplifier below rather than a full
  // producer/payoff pairing built on an unverified guess.
  damage: /deals? \d+ damage/i,
};

const PAYOFFS = {
  tokens: /token(?:s)? you control|for each token|sacrifice a token/i,
  treasure: /treasures? you control|sacrifice a treasure/i,
  clues: /clues? you control|sacrifice a clue|clue token|whenever you (?:sacrifice|create) a clue/i,
  artifacts: /artifact(?:s)? you control|whenever (?:you cast |an? )?artifact|sacrifice an artifact/i,
  auras: /affinity for auras|whenever [^.]*\baura\b|auras? you control|enchanted creature you control/i,
  // "Put counters on target X" is a producer, not a payoff. The old broad
  // `counters on` branch classified Ayula as both sides of a counter engine,
  // letting any unrelated counter producer masquerade as commander synergy.
  // A payoff must react to, scale from, replace, or spend existing counters.
  counters: /whenever [^,.;]*counter|if [^,.;]*counter|for each [^.]*counter|remove [^.]* counter|modified creature/i,
  graveyard: /from your graveyard|in your graveyard|delirium|threshold/i,
  sacrifice: /whenever [^.]* dies|whenever you sacrifice|sacrifice another/i,
  draw: /whenever you draw|second card|cards? in your hand/i,
  spells: /whenever you cast|magecraft|instant and sorcery/i,
  lands: /landfall|whenever a land enters|lands you control/i,
  life: /whenever you gain life|if your life total|life you gained/i,
  // A permanent's own one-shot "When this enters" ability is not an ETB
  // payoff package. Payoffs must repeatedly watch other or categorized
  // permanents entering; otherwise every ordinary ETB creature appears to
  // reward every token maker in the deck.
  // Also match "Whenever NAME or another TRIBE enters" (Ayula-class), which
  // does not contain the contiguous phrase "whenever another".
  etb: /whenever another [^.]* enters|whenever (?:a|an|one or more|nontoken) [^.]* enters|whenever [^.]+ or another [^.]* enters/i,
  combat: /whenever [^.]* attacks|combat damage|attacking creatures/i,
  // Deliberately narrower than PRODUCERS.evasion — this is cards that
  // specifically reward flying/menace/unblocked creatures (an anthem
  // that only boosts fliers), not a token that happens to have flying.
  evasion: /creatures? you control with (?:flying|menace)|with (?:flying|menace) get |unblocked|can(?:'|’)t be blocked except/i,
  // Real "protection matters" payoffs are rare (protection is mostly a
  // standalone defensive tool, not a two-card engine axis) — this stays
  // narrow on purpose rather than over-matching unrelated text.
  protection: /creatures? you control with hexproof|creatures? you control with indestructible|whenever [^.]* with hexproof|whenever [^.]* with indestructible/i,
};

const NEGATIVE_RULES = [
  ["graveyard", /cards? in graveyards? can(?:'|’)t|exile all graveyards|if a card would be put into a graveyard, exile/i, "Graveyard denial conflicts with the deck's recursion or graveyard payoffs."],
  ["etb", /creatures? entering (?:the battlefield )?don(?:'|’)t cause abilities to trigger|abilities don(?:'|’)t trigger when [^.]* enters/i, "ETB suppression conflicts with the deck's own enter-the-battlefield package."],
  ["tokens", /tokens? can(?:'|’)t be created|if a token would be created, no/i, "Token prevention conflicts with the deck's token engine."],
  ["counters", /counters? can(?:'|’)t be put|players can(?:'|’)t get counters/i, "Counter prevention conflicts with the deck's counter package."],
  ["sacrifice", /players can(?:'|’)t sacrifice|permanents can(?:'|’)t be sacrificed/i, "Sacrifice prevention conflicts with the deck's sacrifice outlets or death payoffs."],
  ["spells", /players can(?:'|’)t cast noncreature spells|each player can(?:'|’)t cast more than one spell/i, "Spell restriction conflicts with the deck's own spell-heavy engine."],
  // Sulfuric Vortex-style: a symmetric lifegain lock a deck's own lifegain
  // package can't work around, unlike a one-sided "opponents can't gain
  // life" hoser (already excluded below by the opponent-text filter).
  ["life", /players can(?:'|’)t gain life|if a player would gain life, (?:that player|they) (?:gains? no life|loses? that much life instead)/i, "Life-gain denial conflicts with the deck's own lifegain package."],
  // Stranglehold-style: shuts off the deck's own fetch/tutor-to-battlefield
  // land package along with everyone else's.
  ["lands", /players can(?:'|’)t search (?:their )?libraries|players can(?:'|’)t play lands from (?:their )?libraries/i, "Library-search denial conflicts with the deck's own land-tutoring or fetch package."],
  // Mornsong Aria-style: a symmetric draw lock that also conflicts with
  // the deck's own draw package, same shape as the life/lands rules above.
  ["draw", /players can(?:'|’)t draw cards?/i, "Draw denial conflicts with the deck's own card-draw package."],
];

// Certain rules facts, not inferred patterns — a card with one of these
// texts objectively doubles a real resource or trigger elsewhere in the
// deck. The positive counterpart to NEGATIVE_RULES: same "verified"
// evidence tier, just an amplifier instead of a conflict. Each entry names
// which side of a card's mechanics the doubling actually reaches:
// Panharmonicon-style trigger doublers amplify the "rewards" side (the
// card's own "whenever X enters" ability is what fires twice), while
// Doubling Season-style resource doublers amplify the "produces" side
// (every effect that creates the resource makes twice as many, whether or
// not it's phrased as a trigger).
const DOUBLER_PATTERNS = [
  {
    signal: "etb",
    side: "rewards",
    pattern: /(?:enters?(?: the battlefield)?|entering the battlefield)[^.]{0,80}triggers? an additional time/i,
    verb: "makes every enters-the-battlefield trigger in the deck happen an additional time",
  },
  {
    signal: "tokens",
    side: "produces",
    pattern: /if an effect would create (?:one or more|1 or more) tokens?[^.]*, it creates? twice that many/i,
    verb: "doubles every token this deck creates",
  },
  {
    signal: "counters",
    side: "produces",
    pattern: /if an effect would put (?:one or more|1 or more) counters?[^.]*, it puts twice that many/i,
    verb: "doubles every counter this deck places",
  },
  // Aggravated Assault/Combat Celebrant-style: a literal extra combat
  // phase is a certain rules fact, not an inferred pattern — every "whenever
  // ~ attacks" trigger in the deck gets a second attack step to fire from
  // this turn. Amplifies "rewards," same as the ETB doubler above: the
  // combat trigger itself is what fires twice, not what a card produces.
  {
    signal: "combat",
    side: "rewards",
    pattern: /additional combat phase/i,
    verb: "grants an additional combat phase, giving every attack trigger in the deck a second chance to fire this turn",
  },
  // Fiery Emancipation/Furnace of Rath/Gratuitous Violence-style: a source
  // dealing double (or triple) damage instead is a certain rules
  // replacement effect, not an inferred pattern. Amplifies "produces" —
  // every burn spell or damage-dealing ability in the deck hits harder,
  // whether or not it's phrased as a trigger.
  {
    signal: "damage",
    side: "produces",
    pattern: /if a source (?:you control )?would deal damage to[^.]*, it deals (?:double|triple) that damage/i,
    verb: "doubles (or triples) the damage every source in the deck deals",
  },
];

function textOf(card) {
  return [
    card.typeLine,
    card.type_line,
    card.oracleText,
    card.oracle_text,
  ].filter(Boolean).join(" ");
}

export function extractMechanicalSignals(card) {
  const text = textOf(card);
  const typeLine = String(card?.typeLine || card?.type_line || "");
  const signals = SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const regexProduces = Object.entries(PRODUCERS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const regexRewards = Object.entries(PAYOFFS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const tagProduces = tagSignalsFor(card, TAG_PRODUCERS);
  const tagRewards = tagSignalsFor(card, TAG_PAYOFFS);
  // Aura production is subtype-precise: only cards printed as Aura.
  const auraProducer = /\bAura\b/i.test(typeLine) ? ["auras"] : [];
  // Instant/Sorcery type line produces the "spells" signal the same way Aura
  // subtype produces "auras": a spellslinger payoff rewards cast events, and
  // the actual castable spells are the producers — not only copy/cheat effects.
  const spellProducer = /\bInstant\b|\bSorcery\b/i.test(typeLine) ? ["spells"] : [];
  const produces = [...new Set([...regexProduces, ...tagProduces, ...auraProducer, ...spellProducer])];
  // "Whenever this attacks, create a token" is production, not a combat-matters
  // payoff. Extra-combat amplifiers still see real attack payoffs (draw, pump,
  // damage) because those do not need a create clause to match.
  const attackToProduceOnly = /whenever [^.]* attacks[^.]*create/i.test(text)
    && !/combat damage|attacking creatures|whenever another [^.]* attacks/i.test(text);
  const rewards = [...new Set([...regexRewards, ...tagRewards])].filter((signal) => !(signal === "combat" && attackToProduceOnly));
  if (auraProducer.length && !signals.includes("auras")) signals.push("auras");
  if (spellProducer.length && !signals.includes("spells")) signals.push("spells");
  return { signals, produces, rewards, tagProduces, tagRewards };
}

export function buildInteractionGraph(cards, options = {}) {
  const nodes = cards.filter((card) => card?.name).map((card) => ({
    ...card,
    quantity: Math.max(1, Number(card.quantity || 1)),
    mechanics: extractMechanicalSignals(card),
  }));
  const nonlands = nodes.filter((card) => !/\bLand\b/i.test(card.typeLine || ""));
  const edges = [];
  for (let leftIndex = 0; leftIndex < nonlands.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nonlands.length; rightIndex += 1) {
      const left = nonlands[leftIndex];
      const right = nonlands[rightIndex];
      const forward = left.mechanics.produces.filter((signal) => right.mechanics.rewards.includes(signal));
      const reverse = right.mechanics.produces.filter((signal) => left.mechanics.rewards.includes(signal));
      const shared = left.mechanics.signals.filter((signal) => right.mechanics.signals.includes(signal));
      // evasion/protection are deliberately left out of this shared-theme
      // whitelist: two random fliers, or two creatures that each happen to
      // have hexproof, aren't synergizing just because they share a
      // keyword the way two graveyard cards share a real theme. Those two
      // signals only ever form an edge through genuine producer/payoff
      // wiring below (an aura granting flying feeding an anthem that
      // rewards fliers), never merely by both mentioning the same keyword.
      // Merely making tokens on both cards is too broad to be a relationship:
      // a Clue engine and an unrelated Angel-token spell do not support each
      // other. Token edges require a real producer/payoff direction.
      const reasons = [...new Set([...forward, ...reverse, ...shared.filter((signal) => ["spells", "graveyard", "counters", "artifacts", "clues", "combat"].includes(signal))])];
      // A signal counts as database-confirmed only when the producing side's
      // tag AND the rewarding side's tag both come from the curated
      // card-mechanics database rather than a regex guess — e.g. a real
      // sacrifice_outlet feeding a real death_payoff, not two cards that
      // merely mention "sacrifice" and "dies" in unrelated ways.
      const tagForward = forward.filter((signal) => left.mechanics.tagProduces.includes(signal) && right.mechanics.tagRewards.includes(signal));
      const tagReverse = reverse.filter((signal) => right.mechanics.tagProduces.includes(signal) && left.mechanics.tagRewards.includes(signal));
      const tagConfirmed = tagForward.length + tagReverse.length;
      // A one-way edge (A feeds B) is an ordinary synergy pairing. A mutual
      // edge — each card produces a signal the other one rewards — is the
      // shape of a real two-card engine (a token maker plus a sac outlet
      // that pays off tokens and whose own death trigger the maker doesn't
      // care about, say). Still inferred from text patterns, not a verified
      // combo database, so it's surfaced as a structural pattern to
      // investigate, never as a guaranteed interaction — unless the curated
      // mechanics database confirms both ends, in which case it's labeled
      // verified rather than inferred.
      // A reciprocal engine needs different directional resources: A feeds
      // B through one signal and B feeds A through another. Two cards that
      // merely produce and reward the same broad resource are related, but
      // do not form a loop or justify combo language.
      const mutual = forward.some((signal) => !reverse.includes(signal))
        && reverse.some((signal) => !forward.includes(signal));
      if (reasons.length) edges.push({
        from: left.name,
        to: right.name,
        signals: reasons,
        strength: Math.min(100, 52 + reasons.length * 14 + (forward.length + reverse.length) * 9 + tagConfirmed * 6),
        reason: `${left.name} and ${right.name} connect through ${reasons.join(", ")}.`,
        evidence: tagConfirmed
          ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_VERIFIED
          : forward.length || reverse.length
            ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_INFERRED
            : RELATIONSHIP_EVIDENCE.ORACLE_SHARED_SIGNAL,
        evidenceClass: tagConfirmed
          ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_VERIFIED
          : forward.length || reverse.length
            ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_INFERRED
            : RELATIONSHIP_EVIDENCE.ORACLE_SHARED_SIGNAL,
        mutual,
        forwardSignals: forward,
        reverseSignals: reverse,
      });
    }
  }

  // Founder #018 — Relationship Evidence: Explicit Oracle.
  // Cards whose Oracle literally names another deck card (named X /
  // Partner with X / Meld with X). Authoritative, not inferred synergy.
  const explicitReferences = findExplicitOracleReferences(nodes);
  const edgeKey = (from, to) => {
    const a = normalizeCardLookupKey(from);
    const b = normalizeCardLookupKey(to);
    return a < b ? `${a}||${b}` : `${b}||${a}`;
  };
  const edgesByPair = new Map(edges.map((edge) => [edgeKey(edge.from, edge.to), edge]));
  for (const ref of explicitReferences) {
    const key = edgeKey(ref.from, ref.to);
    const existing = edgesByPair.get(key);
    if (existing) {
      if (!existing.signals.includes("oracle_explicit")) existing.signals = [...existing.signals, "oracle_explicit"];
      existing.evidence = RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT;
      existing.evidenceClass = RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT;
      existing.namedAs = ref.namedAs;
      existing.strength = Math.max(existing.strength, 94);
      existing.reason = `${existing.reason} ${ref.reason}`;
      continue;
    }
    const edge = {
      from: ref.from,
      to: ref.to,
      signals: ["oracle_explicit"],
      strength: 94,
      reason: ref.reason,
      evidence: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
      evidenceClass: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
      namedAs: ref.namedAs,
      mutual: false,
      forwardSignals: ["oracle_explicit"],
      reverseSignals: [],
    };
    edges.push(edge);
    edgesByPair.set(key, edge);
  }

  edges.sort((a, b) => b.strength - a.strength || a.from.localeCompare(b.from));

  const packageMap = new Map();
  for (const card of nonlands) for (const signal of card.mechanics.signals) {
    if (!packageMap.has(signal)) packageMap.set(signal, []);
    packageMap.get(signal).push(card.name);
  }
  if (explicitReferences.length) {
    const namedMembers = [...new Set(explicitReferences.flatMap((ref) => [ref.from, ref.to]))];
    if (namedMembers.length >= 2) {
      packageMap.set("oracle_explicit", namedMembers);
    }
  }
  const packages = [...packageMap.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([signal, members]) => ({
      signal,
      members,
      count: members.length,
      evidence: signal === "oracle_explicit" ? RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT : "modeled package",
    }))
    .sort((a, b) => b.count - a.count || a.signal.localeCompare(b.signal));

  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const isolated = nonlands
    .filter((card) => !card.isCommander && !connected.has(card.name))
    .map((card) => card.name);
  const nonbos = [];
  for (const source of nonlands) for (const [signal, denial, reason] of NEGATIVE_RULES) {
    if (!denial.test(textOf(source)) || /your opponents?|opponents? can(?:'|’)t/i.test(textOf(source))) continue;
    const conflicts = nonlands.filter((card) => card.name !== source.name && (card.mechanics.produces.includes(signal) || card.mechanics.rewards.includes(signal)));
    if (conflicts.length) nonbos.push({ source: source.name, signal, conflicts: conflicts.map((card) => card.name), reason, evidence: RELATIONSHIP_EVIDENCE.ORACLE_CONFLICT });
  }
  // A trigger doubler amplifies every card with a real "whenever X enters"
  // payoff already in the deck — not just cards it shares a produces/
  // rewards pairing with, since it doesn't need to produce anything itself
  // to double an existing trigger. A separate pass from the edges above,
  // same as nonbos: a fundamentally different (and here, positive) claim
  // than an inferred producer/payoff pairing.
  const amplifiers = [];
  for (const source of nonlands) for (const { signal, side, pattern, verb } of DOUBLER_PATTERNS) {
    if (!pattern.test(textOf(source))) continue;
    const amplified = nonlands.filter((card) => card.name !== source.name && card.mechanics[side].includes(signal));
    if (amplified.length) amplifiers.push({
      source: source.name,
      signal,
      // Which side of a card's mechanics the doubling reaches — exposed so
      // a caller evaluating a candidate not yet in the deck (Meta Breaker
      // Lab) can check card.mechanics[side].includes(signal) directly,
      // without re-deriving DOUBLER_PATTERNS' own side mapping a second
      // time elsewhere.
      side,
      amplifies: amplified.map((card) => card.name),
      reason: `${source.name} ${verb} — a certain rules fact, not an inferred pattern.`,
      evidence: RELATIONSHIP_EVIDENCE.ORACLE_AMPLIFIER,
    });
  }
  const commander = nonlands.find((card) => card.isCommander);
  const commanderLinks = commander ? edges.filter((edge) => edge.from === commander.name || edge.to === commander.name) : [];
  const coverage = nonlands.length ? connected.size / nonlands.length : 0;
  const confidence = nonlands.length < 8 ? "LOW · INCOMPLETE CARD SET" : coverage >= .75 ? "HIGH · ORACLE-DERIVED" : coverage >= .45 ? "MEDIUM · PARTIAL PACKAGE COVERAGE" : "LOW · MANY ISOLATED SLOTS";
  const byName = new Map(nonlands.map((card) => [card.name, card]));
  const enginePairs = edges
    .filter((edge) => edge.mutual)
    .map((edge) => {
      const left = byName.get(edge.from);
      const right = byName.get(edge.to);
      const loopKind = classifyLoopKind(textOf(left || {}), textOf(right || {}));
      return {
        cards: [edge.from, edge.to],
        strength: edge.strength,
        loopKind,
        reason: `${edge.from} feeds ${edge.to}'s ${edge.forwardSignals.join("/")} payoff, while ${edge.to} feeds ${edge.from}'s ${edge.reverseSignals.join("/")} payoff back — a genuine two-way loop, not just a shared theme.`,
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_MUTUAL_LOOP,
      };
    })
    .sort((a, b) => b.strength - a.strength);
  const resetPairs = findResetPayPairs(nonlands);
  return {
    nodes,
    edges,
    packages,
    isolated,
    nonbos,
    amplifiers,
    enginePairs,
    resetPairs,
    commanderLinks,
    explicitReferences,
    coverage,
    confidence,
    methodology: "Relationships come from oracle text and type lines: mechanical producer/payoff inference, plus oracle_explicit edges when Oracle literally names another card in the deck. Mutual pairs are labeled engine / closed_loop / conditional_win as vocabulary. Reset/pay shapes are a separate observation pass — not verified infinites and not construction credit.",
    commanderName: options.commanderName || commander?.name || "",
  };
}

// enginePairs above only ever looks inside the built deck — a genuine
// two-way loop sitting in the broader fetched pool, one swap away from a
// card already in the deck, goes unnoticed. For each pool card not already
// in the deck, finds its single best mutual-loop partner already in the
// deck (if any) and ranks the results — the same mutual forward/reverse
// signal test as enginePairs, just run deck-card-against-pool-card instead
// of deck-card-against-deck-card. Same inferred-pattern caveat applies:
// this is a structural read, not a verified combo.
export function findUnusedEnginePartners(deckCards, poolCards, options = {}) {
  const normalizeName = (name = "") => String(name).normalize("NFKC").trim().toLocaleLowerCase("en");
  const isLand = (card) => /\bLand\b/i.test(card?.typeLine || "");
  const deckNames = new Set(deckCards.filter((card) => card?.name).map((card) => normalizeName(card.name)));
  const deckNodes = deckCards
    .filter((card) => card?.name && !isLand(card))
    .map((card) => ({ ...card, mechanics: extractMechanicalSignals(card) }));
  const poolNodes = poolCards
    .filter((card) => card?.name && !isLand(card) && !deckNames.has(normalizeName(card.name)))
    .map((card) => ({ ...card, mechanics: extractMechanicalSignals(card) }));

  const suggestions = [];
  for (const poolCard of poolNodes) {
    let best = null;
    for (const deckCard of deckNodes) {
      const forward = poolCard.mechanics.produces.filter((signal) => deckCard.mechanics.rewards.includes(signal));
      const reverse = deckCard.mechanics.produces.filter((signal) => poolCard.mechanics.rewards.includes(signal));
      if (!forward.length || !reverse.length) continue;
      const strength = Math.min(100, 52 + (forward.length + reverse.length) * 14);
      if (!best || strength > best.strength) best = { partner: deckCard.name, partnerCard: deckCard, strength, forward, reverse };
    }
    if (best) {
      suggestions.push({
        card: poolCard.name,
        partner: best.partner,
        strength: best.strength,
        loopKind: classifyLoopKind(textOf(poolCard), textOf(best.partnerCard || {})),
        reason: `${poolCard.name} feeds ${best.partner}'s ${best.forward.join("/")} payoff, while ${best.partner} feeds ${poolCard.name}'s ${best.reverse.join("/")} payoff back — sitting unused in your pool.`,
        evidence: "inferred mutual mechanical loop",
      });
    }
  }
  suggestions.sort((left, right) => right.strength - left.strength || left.card.localeCompare(right.card));
  return suggestions.slice(0, options.limit ?? 5);
}
