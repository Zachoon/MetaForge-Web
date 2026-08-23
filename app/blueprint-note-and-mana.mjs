// The two native-masterwork-engine.mjs exports a CLIENT component needs
// (app/page.tsx, for the commission note field and the mana-consistency
// panel), extracted into their own leaf module with no path back to
// card-mechanics.mjs (~1.9MB) or any of the other server-only construction
// files (strategic-intent.mjs, forge-interaction-graph.mjs,
// commander-power-signal.mjs, etc.).
//
// native-masterwork-engine.mjs re-exports parseNativeBlueprintIntent,
// manaConsistencyReport, and hypergeometricAtLeast from here unchanged, so
// every existing import of them (worker/forge-generate.ts, tests, and this
// file's own internal callers) keeps working without modification — only
// page.tsx's import was ever the problem, and it now points here directly.
// Everything below was moved verbatim; see native-masterwork-engine.mjs's
// git history for where each piece used to live.

import { colorlessPipsFromCost, hasVariableGenericCost } from "./conditional-effect-credit.mjs";
import { MECHANIC_TAG_VOCABULARY } from "./mechanic-tag-vocabulary.mjs";

// Small, widely-duplicated utilities (also defined locally in
// native-masterwork-engine.mjs, which uses them 100+ times elsewhere) -
// duplicated here rather than imported back, so this file has zero import
// path into the rest of the engine.
const unique = (values) => [...new Set(values.filter(Boolean))];
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

// Many Partings class: "search your library for a basic land card, put
// it into your HAND" is a land tutor/fixer, not ramp — it costs the same
// turn's land drop a topdecked land would, so it never gets you ahead of
// schedule the way Farseek/Rampant Growth/Cultivate (put onto the
// BATTLEFIELD) do. Requires "battlefield" in the same sentence as the
// land search, so a hand-only fetch (Many Partings, Sylvan Scrying)
// stops matching. The land/type alternation (not just the literal word
// "land") is required too, so a non-land tutor that also happens to put
// its target onto the battlefield (a creature toolbox fetch) is never
// swept in — real cards phrase the searched-for land three ways: "basic
// land card" (Rampant Growth), a specific type's own name with no "land"
// word at all (Nature's Lore/Three Visits: "Forest card"), or an
// enumerated basic-type list (Farseek: "Plains, Island, Swamp, or
// Mountain card") — verified against all three's and Cultivate's real
// oracle text. A bare \bland\b alone previously also accidentally
// matched "Island" as a substring (Is-LAND) with no word boundary check;
// this pattern lists Island explicitly instead, so that's fixed too.
const LAND_SEARCH_TO_BATTLEFIELD = /search your library for [^.]*\b(?:lands?|plains|island|swamp|mountain|forest)\b[^.]*\bbattlefield\b/i;

// Founder #059: same real bug as forge-interaction-graph.mjs's Founder
// #056, duplicated here in this file's own parallel role classifier — a
// bare "whenever you cast" matched Sythis/Smith/Ugin/Chronicle Thief-style
// off-target triggers (enchantment/artifact/colorless/legendary spell
// payoffs, none of them spellslinger) as the "spells" role, exactly the
// same false positive #056 fixed in the mechanical-signal system. Reusing
// the identical, already-verified exclusion here rather than importing it
// back from forge-interaction-graph.mjs — this file's own header comment
// explains why it stays free of that import path (avoids bundling the
// ~1.9MB card-mechanics.mjs database into the client for the mana panel).
const OFF_TARGET_SPELL_TYPE_CAST_SUFFIX = /(?:an?|another) \b(?:artifact|creature|enchantment|colorless|legendary)\b spell/i;
// Exported so card-role-classification.mjs (already a light importer of
// this file) can guard its own separate "spell_payoff" tag lookup with the
// identical check — see that file's roleTagsFor for the matching bug.
export const OFF_TARGET_SPELL_TYPE_CAST = new RegExp(`whenever you cast ${OFF_TARGET_SPELL_TYPE_CAST_SUFFIX.source}`, "i");

export const ROLE_PATTERNS = Object.freeze({
  ramp: [/add .{0,18}mana/i, /create .{0,18}(?:treasure|powerstone)/i, LAND_SEARCH_TO_BATTLEFIELD, /land card.{0,30}battlefield/i],
  // Founder #087 (found right after #086 shipped, same file): the
  // same real "draws" third-person verb gap forge-interaction-graph.mjs's
  // own PRODUCERS.draw already fixed (that file's own history: the
  // imperative "draw a card" phrasing missed the third-person "draws"
  // verb real wheel effects use — no space right after "draw" once an
  // "s" is added). Confirmed via direct test: Wheel of Fortune ("draws
  // seven cards") and Nekusar, the Mindrazer's own trigger ("that player
  // draws an additional card") both failed to register the "draw" role
  // here — two of the format's most iconic wheel/draw-punisher cards.
  // Reused forge-interaction-graph.mjs's exact already-verified pattern
  // rather than re-deriving it.
  draw: [/draws? [^.]*?\bcards?\b/i, /look at the top .{0,40}(?:hand|exile)/i, /impulse/i],
  // Founder #090 (found in the same audit pass as #086-#089): the
  // "deals N damage to" alternative missed the real "divided damage"
  // removal template — "deals N damage divided as you choose among...
  // targets" (Arc Lightning, Boulderfall: 73 real cards via Scryfall) has
  // no "to" immediately after "damage" at all. Confirmed via direct test:
  // Fire Covenant (a real, popular EDH removal spell — see #041's earlier
  // fix, which used this same card for a different signal) returned no
  // "interaction" role at all.
  // Founder #091 (found immediately after #090, same array): the
  // "return target...owner's hand" bounce alternative had a {0,25}
  // character window between "target" and "owner's hand" — too narrow
  // for Cyclonic Rift's real text ("target nonland permanent you don't
  // control to its owner's hand", 41 characters), arguably THE single
  // most iconic and powerful card in the entire Commander format.
  // Confirmed via direct test: Cyclonic Rift returned ZERO roles at all,
  // not just missing "interaction". Widened to {0,45} and anchored with
  // [^.] instead of a bare "." so the window still can't cross into an
  // unrelated later sentence.
  // Founder #092 (found sourcing a real, top-rated Kinnan, Bonder Prodigy
  // cEDH decklist from Moxfield to verify #086-#091's real-deck impact):
  // the bare "exile target" alternative required "exile" immediately
  // adjacent to "target", but the real "mass exile" template inserts a
  // quantifier between them — "Exile any number of target spells"
  // (Mindbreak Trap, a real free counterspell played in this exact
  // decklist). Confirmed via direct test: Mindbreak Trap returned ZERO
  // roles at all, the same failure class as #091's Cyclonic Rift. Widened
  // to allow up to 20 characters of filler between "exile" and "target",
  // matching the file's established narrow-window fix style.
  interaction: [/destroy target/i, /exile [^.]{0,20}target/i, /counter target/i, /deals? \d+ damage (?:to|divided)/i, /return target [^.]{0,45}owner'?s hand/i, /-\d+\/-\d+/i],
  protection: [/hexproof/i, /indestructible/i, /phase out/i, /protection from/i, /counter target spell or ability/i],
  // Unsummon/Vapor Snag/Boomerang class: "return target creature to its
  // owner's hand" is bounce (already the `interaction` role above), not
  // recursion — it never touches a graveyard at all. Requires "graveyard"
  // to actually appear as the stated source before the destination, so a
  // bounce spell that merely shares the word "return" with real graveyard
  // recursion (Raise Dead: "...from your graveyard to your hand", Sun
  // Titan: "...from your graveyard to the battlefield") stops matching
  // here. "put", not just "return", and no "target" requirement: Reanimate/
  // Necromancy ("Put target creature card from a graveyard onto the
  // battlefield") and Exhume ("Each player puts a creature card from
  // their graveyard onto the battlefield" — unconditional, no target at
  // all) are real, commonly-played reanimation spells that otherwise never
  // matched here — see strategicSemanticsFor's identical reanimation-
  // semantic fix for the full reasoning and more real-card verification.
  recursion: [/\b(?:put|return)s? [^.]*\bgraveyard\b[^.]*\b(?:battlefield|hand)\b/i, /cast .{0,30}from your graveyard/i, /reanimate/i],
  // Impact Tremors/Kessig Flamebreather class: "deals 1 damage to each
  // opponent" is a damage-ping engine, not a board wipe — it never
  // touches a creature at all, and pairs with go-wide/token strategies a
  // real sweeper (which kills your own board too) works against. Requires
  // "creature" as the actual target, matching real sweeper phrasing
  // (Pyroclasm/Blasphemous Act/Anger of the Gods: "each creature";
  // Pestilence: "each creature and each player" also matches, creature
  // still present). Not just a literal digit after "deals" — Chain
  // Reaction ("deals damage equal to the number of creatures on the
  // battlefield to each creature") is a real scaling-damage sweeper with
  // no fixed number at all.
  sweeper: [/destroy all/i, /exile all/i, /all creatures get -/i, /deals? [^.]*?\bdamage\b[^.]*? to each (?:other |nontoken |non-Human )?creature/i],
  selection: [/scry/i, /surveil/i, /discard .{0,20}draw/i, /draw .{0,20}discard/i],
  tokens: [/create (?:a|one|two|three|x|that many|\d+) .{0,45}token/i],
  // Founder #086: the same real "sacrifice"/"sacrifices" verb-form and
  // "dies"/"die" plural gaps #055/#062/#073 already found and fixed in
  // native-masterwork-engine.mjs's and forge-interaction-graph.mjs's own
  // sacrifice signals, duplicated here in this file's own parallel role
  // classifier — and this one is construction-critical (see
  // card-role-classification.mjs's own header comment: classifyNativeCard
  // feeds real deck-construction scoring, not just a cosmetic label).
  // Confirmed via direct test: Diabolic Edict and Innocent Blood (real,
  // classic forced-sacrifice edicts) returned zero roles at all — not
  // even "sacrifice" — because the old pattern required first-person
  // "sacrifice" immediately followed by a determiner, never the
  // third-person "sacrifices" real edicts use. Also added the plural
  // "die" verb form (Vraan, Executioner Thane's real "creatures you
  // control die") and widened the "whenever...dies" window from 25 to 45
  // characters to fit Vraan's real, longer subject clause. Verified
  // Viscera Seer's and Yawgmoth's existing outlet-cost cases stay
  // correctly classified.
  sacrifice: [/sacrifices? (?:a|an|another|one|target|any number of|\d+|two|three|four|five|six|seven|eight|nine|ten)\b/i, /\b(?:target player|each opponent|each player|that player) sacrifices?\b/i, /whenever .{0,45} (?:dies|die)\b/i],
  counters: [/[+\-]\d+\/[+\-]\d+ counter/i, /one or more counters/i, /proliferate/i],
  // Founder #088 (found right after #087, same file, same audit pass):
  // the same real "mill"/"mills" third-person verb gap forge-
  // interaction-graph.mjs's own PRODUCERS.graveyard already fixed
  // (Founder #042) — "mill " (with a trailing space) never matches "mills"
  // (no space right after "mill" once the "s" is added), duplicated in
  // this file's own parallel role classifier. The bare "/graveyard/i"
  // alternative doesn't rescue this the way it does for cards that also
  // separately mention "graveyard" elsewhere: Mindcrank and Psychic
  // Corrosion (the same two real mill-payoff cards #042 used) never say
  // "graveyard" anywhere in their own real text, so both returned zero
  // "graveyard" role at all — confirmed via direct test.
  graveyard: [/graveyard/i, /\bmills?\b/i, /surveil/i, /flashback/i, /escape/i],
  artifacts: [/artifact/i, /equipment/i, /treasure/i],
  spells: [/instant or sorcery/i, /noncreature spell/i, new RegExp(`whenever you cast(?! ${OFF_TARGET_SPELL_TYPE_CAST_SUFFIX.source})`, "i"), /prowess/i],
  lifegain: [/you gain .{0,12}life/i, /whenever you gain life/i, /lifelink/i],
  // Founder #089 (found in the same audit pass as #086-#088): "extra
  // combat" is not real Magic phrasing at all — verified via Scryfall,
  // zero real cards use this exact phrase, making this whole alternative
  // dead code. The actual, standard real template is "additional combat
  // phase" (46 real cards via Scryfall) — forge-interaction-graph.mjs's
  // own combat-doubler amplifier (a different signal, same underlying
  // rules fact) and archetype-catalog.mjs's own note aliases both
  // already correctly use this real phrase; this file's ROLE_PATTERNS
  // was the one place still using the never-real "extra combat" text.
  // Confirmed via direct test: Aggravated Assault, one of the format's
  // most iconic extra-combat enablers, returned no "combat" role at all.
  combat: [/whenever .{0,25} attacks/i, /combat damage/i, /double strike/i, /additional combat phase/i],
  // Hand disruption is its own deckbuilding axis, not covered by
  // "interaction" above (which only matches destroy/exile/counter/damage/
  // bounce). Scoped to the opponent discarding, not a self-loot effect
  // ("you may discard a card, then draw"), which "selection" already owns.
  discard: [/target (?:player|opponent) discards?/i, /each (?:player|opponent) discards?/i, /that player discards?/i],
});

const NOTE_ROLE_ALIASES = Object.freeze({
  ramp: [/\bramp\b/i, /\bmana ramp\b/i, /\bacceleration\b/i, /\baccelerate\b/i],
  draw: [/\bcard draw\b/i, /\bdraw(?:ing)? cards?\b/i, /\bcard advantage\b/i],
  interaction: [/\bremoval\b/i, /\bcounterspells?\b/i, /\binteraction\b/i, /\bdisruption\b/i, /\bspot removal\b/i],
  protection: [/\bprotection\b/i, /\bhexproof\b/i, /\bsafety\b/i],
  recursion: [/\brecursion\b/i, /\breanimator\b/i, /\breanimate\b/i, /\bbring(?:ing)? back\b/i],
  sweeper: [/\bboard wipes?\b/i, /\bwraths?\b/i, /\bsweepers?\b/i, /\bmass removal\b/i],
  selection: [/\bcard selection\b/i, /\bfiltering\b/i],
  tokens: [/\bgo wide\b/i, /\btoken(?:s)? strategy\b/i, /\btokens\b/i, /\bwide board\b/i],
  sacrifice: [/\baristocrats\b/i, /\bsac(?:rifice)? deck\b/i, /\bsacrifice\b/i, /\bsac(?:s)?\b/i],
  counters: [/\bcounters strategy\b/i, /\bproliferate\b/i],
  graveyard: [/\bgraveyard value\b/i, /\bself-?mill\b/i, /\bmill strategy\b/i],
  artifacts: [/\bartifact synerg(?:y|ies)\b/i, /\bartifacts matter\b/i],
  spells: [/\bspellslinger\b/i, /\bspells matter\b/i, /\binstants and sorceries\b/i],
  lifegain: [/\blife ?gain\b/i, /\bgaining life\b/i],
  combat: [/\bcombat tricks?\b/i, /\bbig combat\b/i],
  discard: [/\bdiscard\b/i, /\bhand disruption\b/i, /\bhand attack\b/i, /\bdisrupt(?:ion)? (?:their|the opponent'?s) hand\b/i],
});
const NOTE_NEGATION_CUE = /\b(no|not|never|avoid|avoiding|without|don'?t want|doesn'?t want|hate|skip|exclude|excluding)\b/i;
const toGlobal = (pattern) => new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);

// Every role signal in a note is either something the player asked for or
// something they explicitly ruled out ("no sacrifice"). A short lookbehind
// window decides which; "no" flips the nearest role mention, not the whole
// note, so "no sacrifice but plenty of removal" reads correctly.
function noteRoleSignals(source = "") {
  const desired = new Set();
  const excluded = new Set();
  for (const role of Object.keys(ROLE_PATTERNS)) {
    const patterns = [...ROLE_PATTERNS[role], ...(NOTE_ROLE_ALIASES[role] || [])];
    for (const pattern of patterns) {
      for (const match of source.matchAll(toGlobal(pattern))) {
        const windowStart = Math.max(0, match.index - 24);
        const negated = NOTE_NEGATION_CUE.test(source.slice(windowStart, match.index));
        (negated ? excluded : desired).add(role);
      }
    }
  }
  for (const role of excluded) desired.delete(role);
  return { desired: [...desired], excluded: [...excluded] };
}

export const BLUEPRINT_FILLER_WORDS = new Set([
  "tribal", "typal", "synergy", "synergies", "theme", "themed", "archetype",
  "build", "around", "plus", "counters", "counter", "and", "or", "with",
]);

const BLUEPRINT_MECHANICS = Object.freeze({
  power_up: Object.freeze({ label: "Power-Up", aliases: [/\bpower[\s-]?up\b/i], packageSignals: ["counters"], anchorLimit: { singleton: 14, constructed: 4 }, score: 34 }),
  creature_activated_ability: Object.freeze({ label: "creature activated abilities", aliases: [/\b(?:creature(?:s|['’]s)?\s+)?activated\s+abilit(?:y|ies)\b/i], anchorLimit: { singleton: 10, constructed: 4 }, score: 12 }),
  blink: Object.freeze({ label: "blink", aliases: [/\bblink(?:ing)?\b/i, /\bflicker(?:ing)?\b/i], tags: ["blink"], oracle: [/exile .{0,70}(?:return|battlefield)/i, /exile .{0,60}until/i], query: '(o:"exile" o:"return" o:"battlefield")', packageSignals: ["etb"], anchorLimit: { singleton: 12, constructed: 4 }, score: 26 }),
  aristocrats: Object.freeze({ label: "sacrifice and death payoffs", aliases: [/\baristocrats?\b/i], tags: ["sacrifice_outlet", "death_payoff"], query: '(o:"sacrifice" OR o:"dies")', packageSignals: ["sacrifice", "tokens"], anchorLimit: { singleton: 14, constructed: 4 }, score: 28 }),
  voltron: Object.freeze({ label: "commander enhancement", aliases: [/\bvoltron\b/i], tags: ["equip", "enchant", "protection"], query: '(kw:equip OR t:aura OR o:"commander creature")', packageSignals: ["evasion", "protection"], anchorLimit: { singleton: 14, constructed: 4 }, score: 26 }),
  spell_copying: Object.freeze({ label: "spell copying", aliases: [/\bcopy(?:ing)? (?:my |your )?(?:spells?|instants?|sorceries?)\b/i, /\bspell cop(?:y|ies|ying)\b/i], tags: ["copy"], oracle: [/copy target .{0,35}spell/i, /copy (?:that|it|this) spell/i], query: 'o:"copy" o:"spell"', packageSignals: ["spells"], anchorLimit: { singleton: 12, constructed: 4 }, score: 26 }),
  cast_from_exile: Object.freeze({ label: "casting from exile", aliases: [/\bcast(?:ing)?(?: cards?)? from exile\b/i, /\bplay(?:ing)?(?: cards?)? from exile\b/i], tags: ["exile_payoff"], oracle: [/(?:cast|play) .{0,65}from exile/i], query: '(o:"cast" o:"from exile")', packageSignals: ["spells"], anchorLimit: { singleton: 12, constructed: 4 }, score: 26 }),
});

const PACKAGE_SIGNAL_BY_MECHANIC = Object.freeze({
  landfall: ["lands"], tokens: ["tokens"], treasure: ["treasure", "artifacts"],
  proliferate: ["counters"], counters: ["counters"], cycling: ["draw", "graveyard"],
  lifelink: ["life"], magecraft: ["spells"], prowess: ["spells"], flashback: ["graveyard", "spells"],
  disturb: ["graveyard"], escape: ["graveyard"], reconfigure: ["artifacts", "evasion"], equip: ["artifacts", "evasion"],
});
const PACKAGE_SIGNAL_BY_ROLE = Object.freeze({
  tokens: ["tokens"], sacrifice: ["sacrifice", "tokens"], counters: ["counters"],
  graveyard: ["graveyard"], spells: ["spells"], lifegain: ["life"], artifacts: ["artifacts"],
  draw: ["draw"], combat: ["combat"], protection: ["protection"],
});

// The derived VALUE SET only (~880 short strings, ~15KB) — never the full
// name -> tags lookup (card-mechanics.mjs, ~1.9MB). See
// mechanic-tag-vocabulary.mjs's own header for how this was derived.
const KNOWN_MECHANIC_TAGS = MECHANIC_TAG_VOCABULARY;

export function blueprintMechanicDefinition(mechanic) {
  return BLUEPRINT_MECHANICS[mechanic] || Object.freeze({
    label: mechanic.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    tags: [mechanic], packageSignals: PACKAGE_SIGNAL_BY_MECHANIC[mechanic] || [], anchorLimit: { singleton: 12, constructed: 4 }, score: 26,
  });
}

function mechanicsMentionedIn(source = "") {
  const matches = [];
  for (const [mechanic, definition] of Object.entries(BLUEPRINT_MECHANICS)) {
    const indexes = definition.aliases.map((pattern) => source.search(pattern)).filter((index) => index >= 0);
    if (indexes.length) matches.push({ mechanic, index: Math.min(...indexes) });
  }
  for (const tag of KNOWN_MECHANIC_TAGS) {
    const phrase = tag.replaceAll("_", " ");
    const index = source.search(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
    if (index >= 0) matches.push({ mechanic: tag, index });
  }
  return unique(matches.sort((left, right) => left.index - right.index || left.mechanic.localeCompare(right.mechanic)).map(({ mechanic }) => mechanic));
}

function requestedBlueprintMechanics(source = "") {
  // Anything explicitly introduced as the focus is reserved first. The
  // remaining named mechanics keep their stable mention/dictionary order.
  const focus = source.match(/\b(?:focus(?:ed)? on|center(?:ed)? (?:on|around)|primarily|especially)\s+(.+)$/i)?.[1] || "";
  return unique([...mechanicsMentionedIn(focus), ...mechanicsMentionedIn(source)]);
}

function normalizeBlueprintText(value = "") {
  return normalized(value)
    .replace(/\+\s*1\s*(?:\+|\/)\s*1\s*counters?/g, "+1/+1 counter")
    .replace(/\bplus one plus one counters?\b/g, "+1/+1 counter");
}

export function parseNativeBlueprintIntent(input = {}) {
  const source = normalizeBlueprintText(input.note || "");
  // Tribe identity floors come from explicit note requests ("bear tribal").
  // Commander oracle still activates the typal PACKAGE via detectCommander
  // ("another Bear you control") without silently raising Blueprint identity
  // floors on every tribal-shaped commander.
  const tribalTypes = unique([
    ...[...source.matchAll(/\b([a-z][a-z0-9'-]{2,})\s+(?:tribal|typal)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/\b(?:tribal|typal)\s+([a-z][a-z0-9'-]{2,})\b/g)].map((match) => match[1]),
  ]).filter((term) => !BLUEPRINT_FILLER_WORDS.has(term));
  const roleSignals = noteRoleSignals(source);
  const desiredRoles = roleSignals.desired;
  const excludedRoles = roleSignals.excluded;
  const requestedMechanics = requestedBlueprintMechanics(source);
  const packageSignals = unique([
    ...requestedMechanics.flatMap((mechanic) => blueprintMechanicDefinition(mechanic).packageSignals || []),
    ...desiredRoles.flatMap((role) => PACKAGE_SIGNAL_BY_ROLE[role] || []),
  ]);
  const requestedTerms = unique(
    source
      .split(/[^a-z0-9+'/-]+/)
      .filter((term) => term.length >= 4 && !BLUEPRINT_FILLER_WORDS.has(term)),
  );
  const promises = [
    ...tribalTypes.map((type) => `${type} typal`),
    ...desiredRoles.map((role) => role === "counters" ? "+1/+1 counter growth" : role),
    ...requestedMechanics.map((mechanic) => blueprintMechanicDefinition(mechanic).label),
  ];
  return Object.freeze({ source, tribalTypes, desiredRoles, excludedRoles, requestedMechanics, packageSignals, requestedTerms, promises: unique(promises) });
}

// loop is cheap and exact enough for probabilities we're going to round to a
// percent anyway.
function logFactorial(n) {
  let sum = 0;
  for (let index = 2; index <= n; index += 1) sum += Math.log(index);
  return sum;
}
function logChoose(n, k) {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

// P(X >= minSuccesses) for X ~ Hypergeometric(populationSize, successStates,
// sampleSize) — e.g. "drawing at least 2 of your 9 black sources in your
// first 8 cards out of a 60-card deck." Computed in log space term-by-term
// (rather than naive factorials) so it stays numerically stable at
// Commander-sized (100-card) populations, where raw binomial coefficients
// overflow a double long before the final ratio would.
export function hypergeometricAtLeast(populationSize, successStates, sampleSize, minSuccesses) {
  const N = Math.max(0, Math.round(Number(populationSize) || 0));
  const K = Math.max(0, Math.min(N, Math.round(Number(successStates) || 0)));
  const n = Math.max(0, Math.min(N, Math.round(Number(sampleSize) || 0)));
  const min = Math.max(0, Math.round(Number(minSuccesses) || 0));
  if (min <= 0) return 1;
  const maxK = Math.min(n, K);
  if (min > maxK) return 0;
  const logDenominator = logChoose(N, n);
  let probability = 0;
  for (let k = min; k <= maxK; k += 1) {
    probability += Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logDenominator);
  }
  return clamp(probability, 0, 1);
}

// How many cards a player has seen by the turn they'd naturally cast a spell
// of this cost — opening hand plus one draw per turn, assuming the play (the
// more common, slightly less forgiving case; drawing on turn one moves this
// up by one card and is left as a deliberate simplification, not modeled
// separately).
function cardsSeenByTurn(turn) {
  return 6 + Math.max(1, Math.round(turn));
}

// Real mana math, not a heuristic: for each colored-pip spell in the built
// deck, what's the actual probability of having enough sources of every
// color it needs by the turn it wants to be cast? Land rows count via
// colorIdentity (a stand-in for "produces this color," accurate for real
// duals/fetches/basics but would overcredit a land that merely shares a
// color identity without actually tapping for it — no such lands exist in
// the current pool-selection logic). Nonland rows count via producesColors
// (Scryfall's produced_mana, threaded through at selection time) — a mana
// rock or dork is a real, static color source the same way a land is; this
// deliberately doesn't model WHEN it came down (a rock cast turn 3 isn't
// actually a source turn 1), matching the same whole-game simplification
// already made for lands. Multi-color requirements use the minimum across
// colors, a marginal-probability approximation rather than a true joint
// distribution (the two draws aren't independent) — deliberately
// conservative-leaning, not exact.
export function manaConsistencyReport(rows, deckSize) {
  const sourcesByColor = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const row of rows) {
    const produces = row.roles?.includes("land") ? row.colorIdentity : row.producesColors;
    for (const color of produces || []) {
      if (color in sourcesByColor) sourcesByColor[color] += row.quantity;
    }
  }
  const cards = [];
  for (const row of rows) {
    if (row.roles?.includes("land")) continue;
    const neededColors = Object.entries(row.colorPips || {}).filter(([, count]) => count > 0);
    const colorlessPips = Number(row.colorlessPips || colorlessPipsFromCost(row.manaCost || row.mana_cost || ""));
    if (colorlessPips > 0) neededColors.push(["C", colorlessPips]);
    if (!neededColors.length) continue;
    // Printed mana value treats X as zero, but an X spell is almost never
    // intended to be fired for X=0. Model its first meaningful window two
    // turns after the fixed portion (and never before turn four).
    const hasVariableCost = hasVariableGenericCost(row.manaCost || row.mana_cost || "");
    const turn = Math.max(hasVariableCost ? 4 : 1, Math.round(row.cmc));
    const draws = cardsSeenByTurn(turn);
    const probability = Math.min(
      ...neededColors.map(([color, count]) => hypergeometricAtLeast(deckSize, sourcesByColor[color] || 0, draws, count)),
    );
    cards.push({ name: row.name, turn, colors: neededColors.map(([color]) => color), probability: Number(probability.toFixed(3)) });
  }
  const overall = cards.length ? cards.reduce((sum, entry) => sum + entry.probability, 0) / cards.length : 1;
  const risky = [...cards].sort((left, right) => left.probability - right.probability).filter((entry) => entry.probability < 0.8);
  return { overall: Number(clamp(overall, 0, 1).toFixed(3)), sourcesByColor, cards, risky };
}
