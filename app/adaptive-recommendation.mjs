import { classifyRevealedOpponent } from "./opponent-classifier.mjs";

const PLANS = {
  Aggro: { add: ["sideboard-stabilizer", "sideboard-sweeper", "sideboard-removal"], cut: ["counter", "finisher"], purpose: "survive the opening turns and trade at a mana advantage" },
  Control: { add: ["sideboard-counter", "sideboard-finisher"], cut: ["sweeper", "removal"], purpose: "reduce dead interaction and protect a durable threat" },
  Ramp: { add: ["sideboard-counter", "sideboard-finisher"], cut: ["sweeper", "removal"], purpose: "interact with expensive payoffs before they resolve" },
  Midrange: { add: ["sideboard-finisher", "sideboard-removal"], cut: ["counter", "draw"], purpose: "match its threat quality without surrendering card economy" },
};

// The single source of the strategy-text-to-simulator-archetype mapping —
// matchup-simulation.mjs's PROFILES are keyed by these four names. Ported
// from page.tsx's own inline version of this same check, with one real fix
// caught while writing tests against it: native-masterwork-engine.mjs's own
// STRATEGY_WEIGHTS uses the exact key "Aggressive" (confirmed live in
// tests/native-masterwork-engine.test.mjs), but the original regex only
// matched "aggro" or "pressure" — a bare "Aggressive" strategy fell through
// to Midrange archetype modeling. Broadened rather than ported verbatim,
// since this function is a fresh consumer and shouldn't start from a known
// miss; page.tsx's own still-inline copy is unaffected either way.
export function strategyArchetypeFor(strategy = "") {
  if (/aggro|aggressive|pressure/i.test(strategy)) return "Aggro";
  if (/control/i.test(strategy)) return "Control";
  if (/tempo/i.test(strategy)) return "Tempo";
  return "Midrange";
}

// The single source of the matchup-facing role vocabulary (land, sweeper,
// removal, ramp, draw, protection, finisher, stabilizer) — the same coarse
// "what does this card do in a real match" labels goldfish-simulation.mjs
// and matchup-simulation.mjs already model, and now the vocabulary this
// module's own PLANS table above is written against. Previously this
// classification lived only inline in page.tsx (used to build the model
// fed to the two simulators); it's ported here unchanged so buildSideboard
// below can use the exact same roles without a second, drifting copy of
// the same nine regex checks.
export function displayRoleFor(card) {
  const text = [
    card?.typeLine || card?.type_line,
    card?.oracleText || card?.oracle_text,
    ...(card?.cardFaces || card?.card_faces || []).flatMap((face) => [face.typeLine || face.type_line, face.oracleText || face.oracle_text]),
  ].filter(Boolean).join(" ");
  // Checked against the card's own type line only, not the combined
  // text blob below: a ramp spell like Cultivate or Rampant Growth
  // mentions "land" in its effect text ("search your library for up to
  // two basic land cards") without itself being one, and matching the
  // combined text would misclassify it as a mana source instead of
  // Acceleration. \b, not a bare /Land/i, for the same reason
  // "nonland" (Anguished Unmaking, Vindicate) must never match here —
  // already called out for the same reason in
  // native-masterwork-engine.mjs's interactionQualityFor and
  // forge-interaction-graph.mjs's COLOR_TYPE_RESTRICTION.
  if (/\bLand\b/i.test(card?.typeLine || card?.type_line || "")) return "Mana source";
  // Damage-based sweepers (Pyroclasm: "deals 2 damage to each creature")
  // say "each creature", not "all creatures" — didn't match here at all,
  // so they fell through to the later, target-blind "Interaction" check
  // below. Requires "creature" as the actual target so a damage-ping
  // engine (Impact Tremors: "deals 1 damage to each opponent") is never
  // swept in — same fix and reasoning as ROLE_PATTERNS.sweeper in
  // blueprint-note-and-mana.mjs, including catching scaling-damage
  // sweepers with no fixed number (Chain Reaction).
  if (/destroy all|exile all|all creatures|get -\d+\/-\d+|deals? [^.]*?\bdamage\b[^.]*? to each (?:other |nontoken |non-Human )?creature/i.test(text)) return "Board reset";
  // Counterspells and removal used to share one "Interaction" bucket that
  // always mapped to "removal" below — meaning "counter" was a role every
  // PLANS entry above already searched for (Control's plan wants
  // sideboard-counter; Aggro's and Midrange's want to cut counter) but no
  // card could ever actually earn, silently making those PLANS entries
  // dead. Checked first since it's the more specific claim: a counterspell
  // that also mentions dealing damage on a rider clause is still a
  // counterspell first.
  if (/counter target spell/i.test(text)) return "Counter magic";
  if (/destroy target|exile target|deals? \d+ damage/i.test(text)) return "Interaction";
  // Many Partings class: a land search that only reaches hand (Many
  // Partings, Sylvan Scrying) isn't acceleration — it costs the same
  // land drop a topdecked land would. Requires "battlefield" in the
  // same clause, and the land/type alternation so a non-land toolbox
  // tutor is never swept in — see LAND_SEARCH_TO_BATTLEFIELD in
  // blueprint-note-and-mana.mjs for the identical pattern.
  if (/add .+ mana|search your library for [^.]*\b(?:lands?|plains|island|swamp|mountain|forest)\b[^.]*\bbattlefield\b|treasure token/i.test(text)) return "Acceleration";
  if (/draw (?:a|one|two|three|\d+)|look at the top|exile .+ you may play/i.test(text)) return "Card advantage";
  if (/hexproof|indestructible|protection from|phase out|regenerate/i.test(text)) return "Protection";
  if (/create .+ token|whenever|for each|double|copy/i.test(text)) return "Engine piece";
  if (/Creature|Planeswalker/i.test(text)) return "Threat";
  return "Flexible support";
}
const DISPLAY_ROLE_MAP = {
  "Mana source": "land",
  "Board reset": "sweeper",
  "Counter magic": "counter",
  Interaction: "removal",
  Acceleration: "ramp",
  "Card advantage": "draw",
  Protection: "protection",
  "Engine piece": "finisher",
  Threat: "finisher",
  "Flexible support": "stabilizer",
};
export function simulationRoleFor(card) {
  return DISPLAY_ROLE_MAP[displayRoleFor(card)] || "stabilizer";
}

// Only the roles PLANS.add above ever actually asks for — a sideboard full
// of ramp or protection tech nobody's plan references would just be dead
// weight relative to what this module can currently recommend bringing in.
const SIDEBOARD_ROLES = new Set(["stabilizer", "sweeper", "removal", "counter", "finisher"]);

// Builds a real sideboard from whatever of the verified pool didn't make
// the main deck, in the exact {quantity, card, role} shape every function
// above already expects — the missing half of the pipeline: PLANS could
// always describe a repair, but nothing ever supplied a real
// candidate.sideboard for it to search until this existed. Cards may
// optionally carry a `score` (native-masterwork-engine.mjs's role-fit
// score) to prefer the pool's strongest options per role; unscored callers
// get a stable, deterministic order instead of a silently arbitrary one.
export function buildSideboard(pool, mainDeckNames, options = {}) {
  const target = options.target ?? 15;
  const perRole = options.perRole ?? 3;
  const excluded = new Set([...mainDeckNames].map((name) => String(name).normalize("NFKC").trim().toLocaleLowerCase("en")));
  const isLand = (card) => /\bLand\b/i.test(card?.typeLine || card?.type_line || "");
  const candidates = pool
    .filter((card) => card?.name && !isLand(card) && !excluded.has(String(card.name).normalize("NFKC").trim().toLocaleLowerCase("en")))
    .map((card) => ({ card, role: simulationRoleFor(card) }))
    .filter(({ role }) => SIDEBOARD_ROLES.has(role))
    .sort((a, b) => (b.card.score || 0) - (a.card.score || 0) || a.card.name.localeCompare(b.card.name));

  const byRole = new Map();
  for (const { card, role } of candidates) {
    if (!byRole.has(role)) byRole.set(role, []);
    if (byRole.get(role).length < perRole) byRole.get(role).push(card);
  }

  const sideboard = [];
  let slotsLeft = target;
  // Round-robin across roles instead of filling one role to its cap first,
  // so a 15-card sideboard reads as a real matchup toolbox (some of
  // everything PLANS might ask for) rather than fifteen copies of
  // whatever the top-scoring single role happened to be.
  const roles = [...SIDEBOARD_ROLES].filter((role) => byRole.has(role));
  let index = 0;
  while (slotsLeft > 0 && roles.some((role) => byRole.get(role).length)) {
    const role = roles[index % roles.length];
    index += 1;
    const cards = byRole.get(role);
    if (!cards.length) continue;
    const card = cards.shift();
    const quantity = Math.min(3, slotsLeft);
    sideboard.push({ quantity, card: card.name, role: `sideboard-${role}` });
    slotsLeft -= quantity;
  }
  return sideboard;
}

export function evaluateLastMatchSignal(match, candidate) {
  if (!match) return { status: "waiting", narrative: "Complete an Arena match with this test version and Forge will update its coaching signal here." };
  if (match.result !== "win" && match.result !== "loss") return {
    status: "coaching-only",
    result: match.result,
    narrative: "The table question was recorded without changing your win/loss record.",
  };
  const opponent = classifyRevealedOpponent(match.revealedOpponentCards);
  if (opponent.strategy === "Unknown") return {
    status: "low-information",
    result: match.result,
    narrative: `Latest match recorded as a ${match.result}, but too few opposing cards were revealed to make a strategy claim. Forge will keep watching without inventing a matchup.`,
  };
  const plan = PLANS[opponent.strategy];
  const candidateOption = plan && candidate
    ? plan.add.map((role) => candidate.sideboard.find((card) => card.role === role)).find(Boolean)
    : undefined;
  return {
    status: "watch",
    result: match.result,
    strategy: opponent.strategy,
    confidence: opponent.confidence,
    candidateOption,
    purpose: plan?.purpose,
    narrative: match.result === "loss"
      ? `Latest result: loss against a ${opponent.strategy} signal (${opponent.confidence} classification). ${candidateOption ? `${candidateOption.card} is the first validated sideboard option Forge will monitor` : "Forge has identified the strategic pressure but not a validated card swap"}. One match updates the watchlist, not the deck.`
      : `Latest result: win against a ${opponent.strategy} signal (${opponent.confidence} classification). Forge will watch whether the cards that supported this plan continue to perform before recommending more of them.`,
  };
}

export function evaluateMatchupEvidence(matches = [], candidate) {
  const groups = new Map();
  for (const match of matches) {
    if (match.result !== "win" && match.result !== "loss") continue;
    const opponent = classifyRevealedOpponent(match.revealedOpponentCards);
    if (opponent.strategy === "Unknown") continue;
    const group = groups.get(opponent.strategy) || { strategy: opponent.strategy, matches: 0, wins: 0, losses: 0, revealedCards: 0 };
    group.matches += 1;
    group.wins += Number(match.result === "win");
    group.losses += Number(match.result !== "win");
    group.revealedCards += opponent.revealedCount;
    groups.set(opponent.strategy, group);
  }
  const matchups = [...groups.values()].map((group) => ({
    ...group,
    winRate: group.wins / group.matches,
    confidence: group.matches >= 8 ? "meaningful" : group.matches >= 4 ? "developing" : "early",
  })).sort((a, b) => a.winRate - b.winRate || b.matches - a.matches);
  const weakness = matchups.find((group) => group.matches >= 3 && group.losses >= 2 && group.winRate <= 0.4);
  if (!weakness || !candidate) return {
    status: matchups.length ? "observe" : "unclassified",
    matchups,
    narrative: matchups.length
      ? "Matchup evidence is updating, but no repeated weakness has crossed the controlled-change gate."
      : "Arena has not revealed enough opposing cards to identify a matchup pattern yet.",
  };

  const plan = PLANS[weakness.strategy];
  if (!plan) return { status: "observe", matchups, narrative: `The ${weakness.strategy} signal needs more evidence before Forge can map a safe repair.` };
  const addition = plan.add.map((role) => candidate.sideboard.find((card) => card.role === role)).find(Boolean);
  const removal = plan.cut.map((role) => candidate.deck.find((card) => card.role === role && card.quantity >= Math.min(2, addition?.quantity || 0))).find(Boolean);
  if (!addition || !removal) return { status: "observe", matchups, narrative: `Forge detected a ${weakness.strategy} weakness, but this build has no validated one-for-one repair package.` };

  const quantity = Math.min(2, addition.quantity, removal.quantity);
  const proposed = candidate.deck.map((card) => ({ ...card }));
  proposed.find((card) => card.card === removal.card).quantity -= quantity;
  const existing = proposed.find((card) => card.card === addition.card);
  if (existing) existing.quantity += quantity;
  else proposed.push({ quantity, card: addition.card, role: addition.role });
  const proposedDeck = proposed.filter((card) => card.quantity > 0).map((card) => `${card.quantity} ${card.card}`).join("\n");
  return {
    status: "repair-ready",
    matchups,
    weakness,
    purpose: plan.purpose,
    changes: [{ quantity: -quantity, card: removal.card }, { quantity, card: addition.card }],
    proposedDeck,
    narrative: `${weakness.losses} of ${weakness.matches} classified matches against ${weakness.strategy} were losses. Test a narrow ${quantity}-card repair; do not treat it as a permanent verdict yet.`,
  };
}
