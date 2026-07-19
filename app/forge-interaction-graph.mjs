const SIGNALS = [
  ["tokens", /create(?:s)? [^.]* token|token(?:s)? you control/i],
  ["treasure", /treasure token|treasures? you control/i],
  ["artifacts", /artifact(?:s)? you control|artifact spell|artifact enters|sacrifice an artifact/i],
  ["counters", /(?:put|remove|double)[^.]* counter|counter(?:s)? on/i],
  ["graveyard", /from your graveyard|in your graveyard|mill [a-z\d]|surveil/i],
  ["sacrifice", /sacrifice (?:a|another|one|any number)|whenever [^.]* dies/i],
  ["draw", /draw (?:a|one|two|three|\d+)|whenever you draw/i],
  ["spells", /whenever you cast|instant or sorcery|noncreature spell/i],
  ["lands", /land enters|landfall|play an additional land|land card/i],
  ["life", /gain(?:s)? [^.]* life|whenever you gain life|life total/i],
  ["etb", /enters the battlefield|when(?:ever)? [^.]* enters/i],
  ["combat", /whenever [^.]* attacks|combat damage|attacking creature/i],
];

const PRODUCERS = {
  tokens: /create(?:s)? [^.]* token/i,
  treasure: /create(?:s)? [^.]* treasure|treasure token/i,
  artifacts: /create(?:s)? [^.]* artifact token|artifact spell/i,
  counters: /put [^.]* counter|proliferate/i,
  graveyard: /mill [a-z\d]|surveil|discard [^.]* card/i,
  sacrifice: /create(?:s)? [^.]* token|when [^.]* dies/i,
  draw: /draw (?:a|one|two|three|\d+)/i,
  spells: /copy [^.]* spell|cast [^.]* without paying/i,
  lands: /search your library for [^.]* land|play an additional land/i,
  life: /gain(?:s)? [^.]* life|lifelink/i,
  etb: /create(?:s)? [^.]* token|return [^.]* to the battlefield/i,
  combat: /haste|create(?:s)? [^.]* creature token/i,
};

const PAYOFFS = {
  tokens: /token(?:s)? you control|for each token|sacrifice a token/i,
  treasure: /treasures? you control|sacrifice a treasure/i,
  artifacts: /artifact(?:s)? you control|whenever (?:you cast |an? )?artifact|sacrifice an artifact/i,
  counters: /counter(?:s)? on|remove [^.]* counter|modified creature/i,
  graveyard: /from your graveyard|in your graveyard|delirium|threshold/i,
  sacrifice: /whenever [^.]* dies|whenever you sacrifice|sacrifice another/i,
  draw: /whenever you draw|second card|cards? in your hand/i,
  spells: /whenever you cast|magecraft|instant and sorcery/i,
  lands: /landfall|whenever a land enters|lands you control/i,
  life: /whenever you gain life|if your life total|life you gained/i,
  etb: /whenever another [^.]* enters|when [^.]* enters/i,
  combat: /whenever [^.]* attacks|combat damage|attacking creatures/i,
};

const NEGATIVE_RULES = [
  ["graveyard", /cards? in graveyards? can(?:'|’)t|exile all graveyards|if a card would be put into a graveyard, exile/i, "Graveyard denial conflicts with the deck's recursion or graveyard payoffs."],
  ["etb", /creatures? entering (?:the battlefield )?don(?:'|’)t cause abilities to trigger|abilities don(?:'|’)t trigger when [^.]* enters/i, "ETB suppression conflicts with the deck's own enter-the-battlefield package."],
  ["tokens", /tokens? can(?:'|’)t be created|if a token would be created, no/i, "Token prevention conflicts with the deck's token engine."],
  ["counters", /counters? can(?:'|’)t be put|players can(?:'|’)t get counters/i, "Counter prevention conflicts with the deck's counter package."],
  ["sacrifice", /players can(?:'|’)t sacrifice|permanents can(?:'|’)t be sacrificed/i, "Sacrifice prevention conflicts with the deck's sacrifice outlets or death payoffs."],
  ["spells", /players can(?:'|’)t cast noncreature spells|each player can(?:'|’)t cast more than one spell/i, "Spell restriction conflicts with the deck's own spell-heavy engine."],
];

function textOf(card) {
  return [card.typeLine, card.oracleText].filter(Boolean).join(" ");
}

export function extractMechanicalSignals(card) {
  const text = textOf(card);
  const signals = SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const produces = Object.entries(PRODUCERS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const rewards = Object.entries(PAYOFFS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return { signals, produces, rewards };
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
      const reasons = [...new Set([...forward, ...reverse, ...shared.filter((signal) => ["spells", "graveyard", "counters", "tokens", "artifacts", "combat"].includes(signal))])];
      if (reasons.length) edges.push({
        from: left.name,
        to: right.name,
        signals: reasons,
        strength: Math.min(100, 52 + reasons.length * 14 + (forward.length + reverse.length) * 9),
        reason: `${left.name} and ${right.name} connect through ${reasons.join(", ")}.`,
        evidence: forward.length || reverse.length ? "inferred mechanical edge" : "shared oracle signal",
      });
    }
  }
  edges.sort((a, b) => b.strength - a.strength || a.from.localeCompare(b.from));

  const packageMap = new Map();
  for (const card of nonlands) for (const signal of card.mechanics.signals) {
    if (!packageMap.has(signal)) packageMap.set(signal, []);
    packageMap.get(signal).push(card.name);
  }
  const packages = [...packageMap.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([signal, members]) => ({ signal, members, count: members.length, evidence: "modeled package" }))
    .sort((a, b) => b.count - a.count || a.signal.localeCompare(b.signal));

  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const isolated = nonlands
    .filter((card) => !card.isCommander && !connected.has(card.name))
    .map((card) => card.name);
  const nonbos = [];
  for (const source of nonlands) for (const [signal, denial, reason] of NEGATIVE_RULES) {
    if (!denial.test(textOf(source)) || /your opponents?|opponents? can(?:'|’)t/i.test(textOf(source))) continue;
    const conflicts = nonlands.filter((card) => card.name !== source.name && (card.mechanics.produces.includes(signal) || card.mechanics.rewards.includes(signal)));
    if (conflicts.length) nonbos.push({ source: source.name, signal, conflicts: conflicts.map((card) => card.name), reason, evidence: "verified oracle-derived conflict" });
  }
  const commander = nonlands.find((card) => card.isCommander);
  const commanderLinks = commander ? edges.filter((edge) => edge.from === commander.name || edge.to === commander.name) : [];
  const coverage = nonlands.length ? connected.size / nonlands.length : 0;
  const confidence = nonlands.length < 8 ? "LOW · INCOMPLETE CARD SET" : coverage >= .75 ? "HIGH · ORACLE-DERIVED" : coverage >= .45 ? "MEDIUM · PARTIAL PACKAGE COVERAGE" : "LOW · MANY ISOLATED SLOTS";
  return {
    nodes,
    edges,
    packages,
    isolated,
    nonbos,
    commanderLinks,
    coverage,
    confidence,
    methodology: "Relationships are inferred from current oracle text and type lines; they are not adoption claims or guaranteed combos.",
    commanderName: options.commanderName || commander?.name || "",
  };
}
