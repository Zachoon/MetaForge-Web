const SIGNAL_RULES = [
  [
    "more early interaction",
    /couldn(?:'|’|â€™)t answer|need(?:ed)? (?:more )?(?:early )?(?:removal|interaction|answers)|too fast for me|died before/i,
  ],
  [
    "lower curve / faster deployment",
    /too slow|clunky|stuck in hand|costs? too much|never cast/i,
  ],
  [
    "more card advantage",
    /ran out of (?:cards|gas|threats)|empty hand|need(?:ed)? (?:draw|cards)|topdeck/i,
  ],
  [
    "more resilience",
    /board wipe|sweeper|couldn(?:'|’|â€™)t rebuild|all my creatures died|folded to removal/i,
  ],
  [
    "mana repair",
    /mana screw|mana flood|missed land|too many lands|wrong colors?|couldn(?:'|’|â€™)t cast/i,
  ],
  [
    "more protection",
    /commander (?:kept dying|was removed)|protect|countered every|couldn(?:'|’|â€™)t keep/i,
  ],
  [
    "preserve pressure",
    /pressure felt good|fast enough|closed quickly|attack plan worked/i,
  ],
  [
    "preserve engine",
    /engine worked|synergy felt good|combo worked|value engine/i,
  ],
];

export function classifyPlayerSignal(signal = "") {
  return SIGNAL_RULES
    .filter(([, pattern]) => pattern.test(signal))
    .map(([label]) => label);
}

export function learnRevisionPreferences(
  matches = [],
  currentRevision = null,
) {
  const scoped = currentRevision == null
    ? matches
    : matches.filter(
        (match) =>
          Number(match.revision || currentRevision) ===
          Number(currentRevision),
      );

  const counts = new Map();
  const examples = new Map();

  for (const match of scoped) {
    for (const label of classifyPlayerSignal(match.signal || "")) {
      counts.set(
        label,
        (counts.get(label) || 0) + 1,
      );

      if (!examples.has(label)) {
        examples.set(label, []);
      }

      examples.get(label).push(match.signal);
    }
  }

  const patterns = [...counts.entries()]
    .map(([preference, count]) => ({
      preference,
      count,
      confidence:
        count >= 5
          ? "strong repeated signal"
          : count >= 3
            ? "developing pattern"
            : count >= 2
              ? "repeated clue"
              : "single clue",
      actionable: count >= 2,
      examples: examples
        .get(preference)
        .slice(-2),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.preference.localeCompare(
          right.preference,
        ),
    );

  const matchupMap = new Map();

  for (const match of scoped) {
    const opponent =
      match.opponent ||
      "Unknown / not sure";

    if (opponent === "Unknown / not sure") {
      continue;
    }

    const row =
      matchupMap.get(opponent) || {
        opponent,
        wins: 0,
        losses: 0,
      };

    if (match.result === "win") {
      row.wins += 1;
    } else {
      row.losses += 1;
    }

    matchupMap.set(
      opponent,
      row,
    );
  }

  const matchups = [...matchupMap.values()]
    .map((row) => {
      const sample =
        row.wins +
        row.losses;

      return {
        ...row,
        sample,
        observedRate:
          sample
            ? row.wins / sample
            : 0,
        actionable:
          sample >= 4,
        confidence:
          sample >= 8
            ? "meaningful sample"
            : sample >= 4
              ? "developing"
              : "early",
      };
    })
    .sort(
      (left, right) =>
        right.sample - left.sample ||
        left.observedRate -
          right.observedRate,
    );

  const actionable = patterns.filter(
    (pattern) =>
      pattern.actionable,
  );

  const guidance = actionable.length
    ? (
        "Repeated revision signals: " +
        actionable
          .map(
            (pattern) =>
              `${pattern.preference} (${pattern.count})`,
          )
          .join("; ") +
        ". Preserve unrelated packages and test the smallest change first."
      )
    : (
        "No repeated preference has cleared the two-signal learning " +
        "threshold. Preserve the list and collect another explicit " +
        "match signal."
      );

  return {
    revision: currentRevision,
    sampleSize: scoped.length,
    patterns,
    matchups,
    actionable,
    guidance,
  };
}