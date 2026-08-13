// =============================================================================
// Strategic Recognition — Founder Issue #020
// =============================================================================
// Deterministic interpretation of existing structural evidence.
// Presentation only. Does not change Brain construction.
// Unknown is not absent. Ambiguous is not generic.
// =============================================================================

const freeze = (value) => Object.freeze(value);

/** Player-facing theme composition from system signals (not a giant archetype dictionary). */
const SIGNAL_LANGUAGE = freeze({
  evasion: freeze({
    shortLabel: "Evasive combat-value",
    snowball: "combat connection",
    tableMeaning: "Your creatures consistently get through blockers.",
    tableWhy: (commander) =>
      `${commander} wins because every successful attack feeds the rest of the deck — getting through blockers is how the plan snowballs.`,
    playerSystem: (commander) =>
      `Flying isn't your payoff — it is your fuel. Nearly every major engine around ${commander} becomes stronger once your evasive creatures consistently deal combat damage.`,
  }),
  combat: freeze({
    shortLabel: "Combat pressure",
    snowball: "attacks",
    tableMeaning: "Attacks are the resource that grows your advantage.",
    tableWhy: (commander) =>
      `${commander} wins because combat connection is the resource — every attack that lands makes the next turn scarier.`,
    playerSystem: (commander) =>
      `Combat isn't flavor — it is the resource. ${commander} and the rest of the deck get stronger every time your attackers connect.`,
  }),
  artifacts: freeze({
    shortLabel: "Artifact value",
    snowball: "artifact payoffs",
    tableMeaning: "Cheap rocks and equipment turn into escalating value.",
    tableWhy: (commander) =>
      `${commander} wins by converting a stream of cheap artifacts into more cards, mana, and pressure than the table can answer.`,
    playerSystem: (commander) =>
      `Cheap artifacts and equipment are the fuel. ${commander} turns each new piece into more value and pressure.`,
  }),
  treasure: freeze({
    shortLabel: "Treasure mana",
    snowball: "treasure production",
    tableMeaning: "Extra mana helps you redeploy after interaction.",
    tableWhy: () =>
      `Treasure is a support package — it helps you rebuild after interaction rather than serving as the primary win path.`,
    playerSystem: () =>
      `A smaller secondary package creates extra mana during your normal game plan, helping you redeploy threats after interaction rather than serving as the deck's primary strategy.`,
  }),
  etb: freeze({
    shortLabel: "Enter-the-battlefield value",
    snowball: "repeated enters",
    tableMeaning: "Creatures matter more when they enter repeatedly.",
    tableWhy: (commander) =>
      `${commander} wins by repeating enter-the-battlefield value until the board and hand pull ahead.`,
    playerSystem: () =>
      `Several creatures become more valuable when they enter repeatedly, so token makers and bounce or blink-style effects help the deck keep generating value.`,
  }),
  tokens: freeze({
    shortLabel: "Token pressure",
    snowball: "token makers",
    tableMeaning: "Wide boards give your payoffs more bodies to convert.",
    tableWhy: (commander) =>
      `${commander} wins by widening the board so combat and token payoffs have more bodies to convert into pressure.`,
    playerSystem: (commander) =>
      `Token makers widen the board so ${commander} and combat payoffs have more bodies to convert into pressure.`,
  }),
  counters: freeze({
    shortLabel: "Counter growth",
    snowball: "+1/+1 counters",
    tableMeaning: "Counters and proliferate make surviving pieces more dangerous over time.",
    tableWhy: (commander) =>
      `${commander} wins because every planeswalker and counter engine becomes more dangerous the longer it survives.`,
    playerSystem: (commander) =>
      `The deck stacks counters and proliferate so ${commander} turns surviving pieces — creatures and planeswalkers alike — into an escalating problem.`,
  }),
  sacrifice: freeze({
    shortLabel: "Aristocrats",
    snowball: "sacrifice outlets",
    tableMeaning: "Deaths become cards and pressure.",
    tableWhy: (commander) =>
      `${commander} wins by converting expendable creatures into cards and pressure through sacrifice outlets.`,
    playerSystem: (commander) =>
      `Your deck wants expendable creatures and outlets so ${commander} converts deaths into cards and pressure.`,
  }),
  graveyard: freeze({
    shortLabel: "Graveyard value",
    snowball: "graveyard recursion",
    tableMeaning: "Cards in the yard come back as advantage.",
    tableWhy: (commander) =>
      `${commander} wins by recycling the graveyard so spent cards keep generating advantage.`,
    playerSystem: (commander) =>
      `Your deck wants cards in the yard that ${commander} and recursion pieces can reuse.`,
  }),
  spells: freeze({
    shortLabel: "Spellslinger",
    snowball: "noncreature spells",
    tableMeaning: "Cheap spells keep rewarding each cast.",
    tableWhy: (commander) =>
      `${commander} wins by casting a stream of cheap spells that each add incremental advantage.`,
    playerSystem: (commander) =>
      `Your deck wants a stream of cheap spells so ${commander} rewards each cast with incremental advantage.`,
  }),
  draw: freeze({
    shortLabel: "Card flow",
    snowball: "card draw",
    tableMeaning: "Full hands keep the primary engine fueled.",
    tableWhy: () =>
      `Card flow keeps the primary engine from stalling — full hands are how the plan stays online.`,
    playerSystem: () =>
      `The deck keeps hands full so the primary engine never runs out of fuel.`,
  }),
  lands: freeze({
    shortLabel: "Landfall",
    snowball: "extra land drops",
    tableMeaning: "Extra land drops escalate your payoffs.",
    tableWhy: (commander) =>
      `${commander} wins by turning repeated land drops into escalating value.`,
    playerSystem: (commander) =>
      `Your deck wants repeated land drops so ${commander} turns landfall into escalating value.`,
  }),
  life: freeze({
    shortLabel: "Lifegain",
    snowball: "life totals",
    tableMeaning: "Life gain converts into cards, counters, or payoffs.",
    tableWhy: () =>
      `The deck wins by converting life gain into cards, counters, or other payoffs.`,
    playerSystem: () =>
      `The deck converts life gain into cards, counters, or payoffs.`,
  }),
  protection: freeze({
    shortLabel: "Protection",
    snowball: "protective keywords",
    tableMeaning: "Protective pieces keep the primary engine alive.",
    tableWhy: () =>
      `Protection exists so the primary engine survives interaction long enough to snowball.`,
    playerSystem: () =>
      `Protective pieces keep the primary engine alive through interaction.`,
  }),
  auras: freeze({
    shortLabel: "Aura stacking",
    snowball: "auras",
    tableMeaning: "Auras stacked on a protected threat multiply value.",
    tableWhy: (commander) =>
      `${commander} wins by stacking auras onto a protected threat so each enchantment multiplies the plan.`,
    playerSystem: (commander) =>
      `Your deck wants auras stacked onto a protected threat so ${commander} multiplies each enchantment.`,
  }),
});

const PACKAGE_SIGNAL_HINTS = freeze([
  [/artifact|equipment/i, "artifacts"],
  [/aura/i, "auras"],
  [/aristocrat|sacrifice/i, "sacrifice"],
  [/reanimator|graveyard/i, "graveyard"],
  [/token/i, "tokens"],
  [/landfall|lands/i, "lands"],
  [/proliferat|counter|\+1\/\+1|planeswalker|superfriend/i, "counters"],
  [/typal|tribal/i, "combat"],
  [/spell/i, "spells"],
  [/blink/i, "etb"],
]);

function signalOf(system = {}) {
  return String(system.signal || system.id || "").toLowerCase();
}

export function tableMeaningFor(signal = "") {
  return languageFor(signal)?.tableMeaning || null;
}

function systemScore(system = {}) {
  const health = Number(system.health?.overall ?? system.health?.cohesion ?? 0);
  const members = Array.isArray(system.members) ? system.members.length : Number(system.members || 0);
  const edges = Array.isArray(system.edges) ? system.edges.length : 0;
  return health * 1.2 + members * 4 + edges * 0.5;
}

function languageFor(signal) {
  return SIGNAL_LANGUAGE[signal] || null;
}

function packageHintSignal(packageLabels = []) {
  for (const label of packageLabels) {
    for (const [pattern, signal] of PACKAGE_SIGNAL_HINTS) {
      if (pattern.test(String(label || ""))) return signal;
    }
  }
  return null;
}

/**
 * Rank systems into primary / supporting / incidental from structural evidence.
 */
export function rankSystemHierarchy(systems = [], { strongestSystem = null, weakestSystem = null } = {}) {
  const scored = [...(systems || [])]
    .filter((system) => system?.name || signalOf(system))
    .map((system) => freeze({
      signal: signalOf(system) || String(system.name || "").toLowerCase(),
      name: system.name || languageFor(signalOf(system))?.shortLabel || "System",
      score: systemScore(system),
      memberCount: Array.isArray(system.members) ? system.members.length : 0,
      health: Number(system.health?.overall ?? 0),
    }))
    .sort((a, b) => b.score - a.score || b.memberCount - a.memberCount || a.name.localeCompare(b.name));

  if (!scored.length) {
    return freeze({
      primary: null,
      supporting: freeze([]),
      incidental: freeze([]),
      pressurePoint: weakestSystem?.name || null,
      ambiguous: true,
    });
  }

  // Prefer report strongest when present and near the top score.
  let primary = scored[0];
  if (strongestSystem?.name) {
    const named = scored.find((entry) => entry.name === strongestSystem.name);
    if (named && named.score >= scored[0].score * 0.85) primary = named;
  }

  const rest = scored.filter((entry) => entry.signal !== primary.signal || entry.name !== primary.name);
  const supporting = [];
  const incidental = [];
  for (const entry of rest) {
    if (entry.score >= primary.score * 0.55 && supporting.length < 3) supporting.push(entry);
    else incidental.push(entry);
  }

  // Peer soup: top two within 12% and different signals → ambiguous.
  const ambiguous = Boolean(
    scored[1]
    && scored[1].signal !== primary.signal
    && scored[1].score >= primary.score * 0.88,
  );

  return freeze({
    primary,
    supporting: freeze(supporting),
    incidental: freeze(incidental),
    pressurePoint: weakestSystem?.name || incidental[0]?.name || supporting[supporting.length - 1]?.name || null,
    ambiguous,
  });
}

function narrativeSignal({ hierarchy, commander = "", packageLabels = [] }) {
  const primary = hierarchy.primary?.signal || null;
  const hint = packageHintSignal(packageLabels);
  const signals = [hierarchy.primary, ...(hierarchy.supporting || [])]
    .filter(Boolean)
    .map((entry) => entry.signal);
  const counterishCommander = /atraxa|vorinclex|tekuthal|agatha.*cauldron|ezuri.*claws/i.test(String(commander || ""));
  if (
    hint === "counters"
    || counterishCommander
    || (signals.includes("counters") && (primary === "counters" || primary === "evasion" || primary === "protection"))
  ) {
    if (signals.includes("counters") || hint === "counters" || counterishCommander) {
      return "counters";
    }
  }
  return primary;
}

function composePlanLabel(hierarchy, packageLabels = [], commander = "") {
  const signal = narrativeSignal({ hierarchy, commander, packageLabels });
  const lang = languageFor(signal);
  if (hierarchy.ambiguous) return "Overlapping systems";
  if (lang?.shortLabel) return lang.shortLabel;
  if (packageLabels[0]) return String(packageLabels[0]).replace(/\s+package$/i, "");
  return hierarchy.primary?.name || "Structural plan";
}

function composeTableWhy({ hierarchy, commander, packageLabels, ambiguous }) {
  const signal = narrativeSignal({ hierarchy, commander, packageLabels });
  const lang = languageFor(signal);
  // Even when systems are peer-ambiguous, package/commander hints can still
  // answer "why this deck?" without inventing a false primary machine.
  if (typeof lang?.tableWhy === "function" && (signal === "counters" || !ambiguous)) {
    return lang.tableWhy(commander);
  }
  if (ambiguous || !hierarchy.primary) {
    return `MetaForge can see several overlapping systems around ${commander}, but none dominates enough to name the win path yet.`;
  }
  if (typeof lang?.tableWhy === "function") {
    return lang.tableWhy(commander);
  }
  return `Your strongest verified direction is ${lang?.shortLabel || hierarchy.primary.name} — that is what ${commander} is set up to convert into a win.`;
}

function composePrimaryPlan({ hierarchy, commander, packageLabels, ambiguous }) {
  const signal = narrativeSignal({ hierarchy, commander, packageLabels });
  const lang = languageFor(signal);
  if (signal === "counters") {
    return `${commander} wins because every planeswalker and counter engine becomes more dangerous the longer it survives. Your strongest job is to protect that board, proliferate, and let the snowball finish the table.`;
  }
  if (ambiguous || !hierarchy.primary) {
    return "MetaForge can see several overlapping systems, but none is dominant enough to name as the primary plan yet.";
  }
  if (signal === "evasion" || signal === "combat") {
    return `Your deck wins by turning successful combat into an ever-growing board of evasive threats. Every time your creatures connect, ${commander} converts those attacks into even more pressure until opponents can't keep up.`;
  }
  if (signal === "artifacts") {
    return `Your deck wins by flooding cheap artifacts and equipment, landing ${commander}, and converting each new piece into escalating value until the table cannot keep up.`;
  }
  if (lang?.playerSystem) {
    return lang.playerSystem(commander);
  }
  if (packageLabels[0]) {
    return `Your deck is organized around ${packageLabels[0]} with ${commander}: develop that support early, get ${commander} online, and keep converting package pieces into board advantage.`;
  }
  return `Get ${commander} online, support that identity with cohesive pieces, and convert that advantage before opponents stabilize.`;
}

function recognitionConfidence({ hierarchy, packageLabels, systemsCount }) {
  if (!hierarchy.primary || systemsCount === 0) {
    return freeze({
      level: "limited",
      label: "Limited",
      detail: "Multiple peer systems or incomplete evidence — MetaForge will not invent a false primary plan.",
    });
  }
  if (hierarchy.ambiguous) {
    return freeze({
      level: "limited",
      label: "Limited",
      detail: "Several systems look similarly strong, so the primary plan stays deliberately humble.",
    });
  }
  const packageHint = packageHintSignal(packageLabels);
  const aligned = packageHint && packageHint === hierarchy.primary.signal;
  if (aligned || (hierarchy.supporting.length >= 1 && hierarchy.primary.health >= 70)) {
    return freeze({
      level: "high",
      label: "High",
      detail: "Commander-linked systems and support pieces converge on one primary direction.",
    });
  }
  return freeze({
    level: "moderate",
    label: "Moderate",
    detail: "A clear plan is readable, with several competing support systems.",
  });
}

/**
 * Strategic Recognition artifact from existing systems + Brain package labels.
 */
export function buildStrategicRecognition({
  structuralSystems = null,
  packageLabels = [],
  commanderName = "",
  strategy = null,
} = {}) {
  const commander = commanderName || "your commander";
  const systems = structuralSystems?.systems || [];
  const hierarchy = rankSystemHierarchy(systems, {
    strongestSystem: structuralSystems?.strongestSystem || null,
    weakestSystem: structuralSystems?.weakestSystem || null,
  });

  // Package-only fallback when no structural systems yet.
  if (!systems.length) {
    const hint = packageHintSignal(packageLabels);
    const lang = languageFor(hint);
    if (!hint) {
      return freeze({
        version: "strategic-recognition-v1",
        confidence: freeze({ level: "limited", label: "Limited", detail: "Not enough structural systems to name a primary plan yet." }),
        planLabel: strategy ? `${String(strategy)} approach` : "Plan still forming",
        tableWhy: strategy
          ? `This list is shaped around a ${String(strategy).toLowerCase()} approach with ${commander}, but MetaForge has not verified a dominant structural engine yet.`
          : `MetaForge can see the list around ${commander}, but none of the structural systems are verified enough to name as the primary plan yet.`,
        tableMeaning: null,
        primaryPlan: strategy
          ? `This list is shaped around a ${String(strategy).toLowerCase()} approach with ${commander}, but MetaForge has not verified a dominant structural engine yet.`
          : `MetaForge can see the list around ${commander}, but none of the structural systems are verified enough to name as the primary plan yet.`,
        hierarchy: freeze({ primary: null, supporting: freeze([]), incidental: freeze([]), pressurePoint: null, ambiguous: true }),
        whyEvidence: "Structural systems were not available for this recognition pass.",
        playerSystemLines: freeze([]),
        evidenceSources: freeze(["packageLabels", "strategy"]),
        ambiguous: true,
        resolvedSignal: null,
      });
    }
    const synthetic = freeze({
      primary: freeze({ signal: hint, name: lang?.shortLabel || hint, score: 80, memberCount: 0, health: 0 }),
      supporting: freeze([]),
      incidental: freeze([]),
      pressurePoint: null,
      ambiguous: false,
    });
    return freeze({
      version: "strategic-recognition-v1",
      confidence: recognitionConfidence({ hierarchy: synthetic, packageLabels, systemsCount: 0 }),
      planLabel: lang?.shortLabel || composePlanLabel(synthetic, packageLabels, commander),
      tableWhy: composeTableWhy({ hierarchy: synthetic, commander, packageLabels, ambiguous: false }),
      tableMeaning: lang?.tableMeaning || null,
      primaryPlan: composePrimaryPlan({ hierarchy: synthetic, commander, packageLabels, ambiguous: false }),
      hierarchy: synthetic,
      whyEvidence: `Recognition is grounded in Brain package labels (${packageLabels.slice(0, 2).join(", ") || "none"}) until structural systems bind.`,
      playerSystemLines: freeze([lang?.playerSystem?.(commander)].filter(Boolean)),
      evidenceSources: freeze(["packageLabels"]),
      ambiguous: false,
      resolvedSignal: narrativeSignal({ hierarchy: synthetic, commander, packageLabels }),
    });
  }

  const ambiguous = hierarchy.ambiguous;
  const confidence = recognitionConfidence({ hierarchy, packageLabels, systemsCount: systems.length });
  const planLabel = composePlanLabel(hierarchy, packageLabels, commander);
  const tableWhy = composeTableWhy({ hierarchy, commander, packageLabels, ambiguous });
  const narrative = narrativeSignal({ hierarchy, commander, packageLabels });
  const primaryPlan = composePrimaryPlan({ hierarchy, commander, packageLabels, ambiguous });

  const playerSystemLines = [
    hierarchy.primary,
    ...hierarchy.supporting.slice(0, 2),
  ]
    .filter(Boolean)
    .map((entry) => languageFor(entry.signal)?.playerSystem?.(commander))
    .filter(Boolean);

  const whyParts = [
    systems.length ? `MetaForge found ${systems.length} repeatable system${systems.length === 1 ? "" : "s"}` : null,
    hierarchy.primary
      ? ambiguous
        ? "but several look similarly strong, so no single primary is forced"
        : `and the strongest links converge on ${hierarchy.primary.name}`
      : null,
    hierarchy.supporting[0] ? `with support from ${hierarchy.supporting.map((s) => s.name).slice(0, 2).join(" and ")}` : null,
    hierarchy.pressurePoint ? `Pressure point: ${hierarchy.pressurePoint}` : null,
  ].filter(Boolean);

  return freeze({
    version: "strategic-recognition-v1",
    confidence,
    planLabel,
    tableWhy,
    tableMeaning: languageFor(narrative)?.tableMeaning || languageFor(hierarchy.primary?.signal)?.tableMeaning || null,
    primaryPlan,
    hierarchy,
    whyEvidence: `${whyParts.join(", ")}.`,
    playerSystemLines: freeze(playerSystemLines),
    evidenceSources: freeze(["structuralSystems", "packageLabels"].filter(Boolean)),
    ambiguous,
    systemCount: systems.length,
    strongestSystemName: structuralSystems?.strongestSystem?.name || hierarchy.primary?.name || null,
    weakestSystemName: structuralSystems?.weakestSystem?.name || hierarchy.pressurePoint || null,
    // The signal composeTableWhy/composePrimaryPlan actually told the story
    // with — may differ from hierarchy.primary.signal (e.g. a counters-shaped
    // commander leads with counters even when a different system measured
    // higher). Downstream consumers that generate more narrative text off
    // "the deck's signal" (pilot-model.mjs) must read this, not
    // hierarchy.primary.signal directly, or they silently tell a different
    // story than the one just rendered above.
    resolvedSignal: narrative,
  });
}
