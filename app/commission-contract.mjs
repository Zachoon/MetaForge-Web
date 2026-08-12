// =============================================================================
// Commission Contract — Founder Issue #024
// =============================================================================
// Presentation only. The optional commission note is not flavor text — it is
// the player's design contract. Parse → display → grade → narrate through
// Player Fantasy. Does not change Brain construction or card evaluation.
// writesToBrain: false
// =============================================================================

import {
  buildRequestRecognition,
  countPlaneswalkers,
  detectRequestedThemes,
} from "./request-recognition.mjs";

const freeze = (value) => Object.freeze(value);

const SUPERFRIENDS_DENSE_FLOOR = 8;
const SUPERFRIENDS_PARTIAL_FLOOR = 1;

/** Fantasy → coach protagonist language (mechanisms stay supporting). */
const FANTASY_NARRATORS = freeze({
  superfriends: freeze({
    id: "superfriends",
    label: "Superfriends",
    protagonist: "Planeswalkers",
    tableWhy: (commander, anchors = []) => {
      const hasDoubling = anchors.some((name) => /doubling season/i.test(name));
      if (hasDoubling) {
        return `This deck is trying to overwhelm the table with planeswalker activations by using Doubling Season to unlock ultimates and snowball loyalty around ${commander}.`;
      }
      return `This deck is trying to overwhelm the table with planeswalker activations until ${commander} and the walkers take over the game.`;
    },
    supportLine: () =>
      "Your support packages exist to keep planeswalkers alive long enough to take over the game.",
  }),
  tokens: freeze({
    id: "tokens",
    label: "Tokens",
    protagonist: "Tokens",
    tableWhy: (commander) =>
      `${commander} wants a wide board of tokens that converts into pressure and payoffs every combat.`,
    supportLine: () =>
      "Support pieces exist to make and protect tokens so the go-wide plan stays online.",
  }),
  aristocrats: freeze({
    id: "aristocrats",
    label: "Aristocrats",
    protagonist: "Sacrifice value",
    tableWhy: (commander) =>
      `${commander} wins by converting expendable creatures into cards and pressure through sacrifice outlets.`,
    supportLine: () =>
      "Support packages exist to keep the sacrifice engine fed after interaction.",
  }),
  reanimator: freeze({
    id: "reanimator",
    label: "Reanimator",
    protagonist: "Graveyard recursion",
    tableWhy: (commander) =>
      `${commander} wins by putting big threats in the yard and returning them ahead of schedule.`,
    supportLine: () =>
      "Support packages exist to fill and protect the graveyard so reanimation stays reliable.",
  }),
  spellslinger: freeze({
    id: "spellslinger",
    label: "Spellslinger",
    protagonist: "Noncreature spells",
    tableWhy: (commander) =>
      `${commander} wins by casting a stream of cheap spells that each add incremental advantage.`,
    supportLine: () =>
      "Support packages exist to keep the spell pipeline full after interaction.",
  }),
  voltron: freeze({
    id: "voltron",
    label: "Voltron",
    protagonist: "Commander combat",
    tableWhy: (commander) =>
      `${commander} wins by stacking protection and equipment until commander damage closes the table.`,
    supportLine: () =>
      "Support packages exist to keep the voltron threat alive through removal.",
  }),
  landfall: freeze({
    id: "landfall",
    label: "Landfall",
    protagonist: "Land drops",
    tableWhy: (commander) =>
      `${commander} wins by turning repeated land drops into escalating value.`,
    supportLine: () =>
      "Support packages exist to keep landfall triggers coming after disruption.",
  }),
  blink: freeze({
    id: "blink",
    label: "Blink",
    protagonist: "Enter-the-battlefield value",
    tableWhy: (commander) =>
      `${commander} wins by blinking key creatures so enter-the-battlefield value repeats every turn cycle.`,
    supportLine: () =>
      "Support packages exist to protect and reuse the blink targets.",
  }),
  proliferate: freeze({
    id: "proliferate",
    label: "Proliferate / counters",
    protagonist: "Counters",
    tableWhy: (commander) =>
      `${commander} wins because every counter and planeswalker becomes more dangerous the longer the board survives.`,
    supportLine: () =>
      "Support packages exist to protect counter engines so proliferate can finish the table.",
  }),
  stax: freeze({
    id: "stax",
    label: "Stax",
    protagonist: "Resource denial",
    tableWhy: (commander) =>
      `${commander} wins by taxing and locking resources so opponents cannot develop while you finish the game on your terms.`,
    supportLine: () =>
      "Support packages exist to keep the lock pieces online after interaction — not to maximize raw speed.",
  }),
});

const FANTASY_THEME_IDS = freeze(Object.keys(FANTASY_NARRATORS));

function normalizeNote(note = "") {
  return String(note || "").replace(/\s+/g, " ").trim();
}

function normalizeName(name = "") {
  return String(name || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cardPresent(targetName, names = []) {
  const want = normalizeName(targetName);
  return names.some((name) => normalizeName(name) === want);
}

function deckNamesFrom({ selected = null, deckCardNames = null } = {}) {
  if (Array.isArray(deckCardNames) && deckCardNames.length) {
    return deckCardNames.filter(Boolean).map(String);
  }
  return (selected?.rows || []).map((row) => row?.name).filter(Boolean);
}

function bandFromScore(score) {
  if (!Number.isFinite(score)) return "unknown";
  if (score >= 80) return "high";
  if (score >= 55) return "moderate";
  return "limited";
}

function barFill(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Parse the commission note into contract clauses (no deck grading yet).
 */
export function parseCommissionContract({
  note = "",
  commanderName = "",
} = {}) {
  const source = normalizeNote(note);
  const themes = detectRequestedThemes(source);
  const youAskedFor = [];

  if (commanderName) {
    youAskedFor.push(
      freeze({
        id: "commander",
        role: "commander",
        label: String(commanderName),
        check: true,
      }),
    );
  }

  for (const theme of themes) {
    if (theme.preference || theme.id === "theme_priority") {
      youAskedFor.push(
        freeze({
          id: theme.id,
          role: "priority",
          label: theme.label,
          check: true,
        }),
      );
      continue;
    }
    if (theme.namedCards?.length) {
      for (const card of theme.namedCards) {
        youAskedFor.push(
          freeze({
            id: `anchor:${normalizeName(card).replace(/\s+/g, "_")}`,
            role: "anchor",
            label: card,
            themeId: theme.id,
            check: true,
          }),
        );
      }
      continue;
    }
    if (FANTASY_THEME_IDS.includes(theme.id)) {
      youAskedFor.push(
        freeze({
          id: theme.id,
          role: "fantasy",
          label: theme.label,
          check: true,
        }),
      );
      continue;
    }
    youAskedFor.push(
      freeze({
        id: theme.id,
        role: "experience",
        label: theme.label,
        check: true,
      }),
    );
  }

  // Theme-first feel language without dictionary hit still surfaces as priority
  // when the note clearly de-emphasizes raw power.
  if (
    source
    && !youAskedFor.some((entry) => entry.role === "priority")
    && /\b(feel|fantasy|theme|true\s+\w+\s+deck|stars?\s+of\s+the\s+show)\b/i.test(source)
    && /\b(strongest|optimiz|competitive|win\s*rate)\b/i.test(source)
  ) {
    youAskedFor.push(
      freeze({
        id: "theme_priority",
        role: "priority",
        label: "Theme over optimization",
        check: true,
      }),
    );
  }

  const fantasyTheme =
    themes.find((theme) => FANTASY_THEME_IDS.includes(theme.id) && !theme.preference)
    || null;
  const anchors = youAskedFor
    .filter((entry) => entry.role === "anchor")
    .map((entry) => entry.label);
  const narrator = fantasyTheme ? FANTASY_NARRATORS[fantasyTheme.id] : null;
  const commander = commanderName || "your commander";

  return freeze({
    writesToBrain: false,
    hasNote: Boolean(source),
    hasContract: youAskedFor.some((entry) => entry.role !== "commander"),
    youAskedFor: freeze(youAskedFor),
    playerFantasy: narrator
      ? freeze({
          id: narrator.id,
          label: narrator.label,
          protagonist: narrator.protagonist,
          tableWhy: narrator.tableWhy(commander, anchors),
          supportLine: narrator.supportLine(),
          anchors: freeze(anchors),
        })
      : null,
    themes: freeze(themes),
  });
}

function gradeClause({ clause, names, walkers }) {
  if (clause.role === "commander") {
    return freeze({
      id: clause.id,
      label: clause.label,
      role: clause.role,
      status: "met",
      detail: "Commander on the commission.",
      score: 1,
      densityScored: true,
    });
  }

  if (clause.role === "priority") {
    return freeze({
      id: clause.id,
      label: clause.label,
      role: clause.role,
      status: "met",
      detail: "Recorded as your priority — the Forge grades theme fidelity against it.",
      score: 1,
      densityScored: true,
    });
  }

  if (clause.role === "anchor") {
    const present = cardPresent(clause.label, names);
    return freeze({
      id: clause.id,
      label: clause.label,
      role: clause.role,
      status: present ? "met" : "missed",
      detail: present ? "In this build." : "Not in this finished list.",
      score: present ? 1 : 0,
      densityScored: true,
    });
  }

  if (clause.id === "superfriends" || clause.label === "Superfriends") {
    if (walkers.count >= SUPERFRIENDS_DENSE_FLOOR) {
      return freeze({
        id: clause.id,
        label: `${clause.label} · ${walkers.count} planeswalkers`,
        role: clause.role,
        status: "met",
        detail: `${walkers.count} planeswalkers in this build.`,
        score: 1,
        densityScored: true,
      });
    }
    if (walkers.count >= SUPERFRIENDS_PARTIAL_FLOOR) {
      return freeze({
        id: clause.id,
        label: `${clause.label} · ${walkers.count} planeswalkers`,
        role: clause.role,
        status: "partial",
        detail: `Only ${walkers.count} planeswalker${walkers.count === 1 ? "" : "s"} — light for a true Superfriends fantasy.`,
        score: 0.35,
        densityScored: true,
      });
    }
    return freeze({
      id: clause.id,
      label: clause.label,
      role: clause.role,
      status: "missed",
      detail: "No planeswalkers detected in this finished list.",
      score: 0,
      densityScored: true,
    });
  }

  // Generic fantasy / experience: present if recognition heard it — soft credit
  // when we cannot measure density without inventing construction packages.
  // Honest: soft credit is labeled and excluded from match % (see gradeCommissionContract).
  return freeze({
    id: clause.id,
    label: clause.label,
    role: clause.role,
    status: "partial",
    detail: "Heard in your contract; density not scored as a construction package.",
    score: 0.55,
    densityScored: false,
  });
}

/**
 * Grade a finished list against the parsed commission contract.
 */
export function gradeCommissionContract({
  note = "",
  commanderName = "",
  selected = null,
  deckCardNames = null,
  cardFacts = null,
  structuralSystems = null,
  blueprint = null,
} = {}) {
  const parsed = parseCommissionContract({ note, commanderName });
  const recognition = buildRequestRecognition({
    note,
    blueprint,
    selected,
    structuralSystems,
    cardFacts,
    deckCardNames,
  });
  const names = deckNamesFrom({ selected, deckCardNames });
  const walkers = countPlaneswalkers({ selected, deckCardNames, cardFacts });

  const gradeable = parsed.youAskedFor.filter((entry) => entry.role !== "commander");
  const whatIBuilt = gradeable.map((clause) => gradeClause({ clause, names, walkers }));

  // Match % grades measurable fulfillment only (anchors + density-scored fantasies).
  // Soft-heard clauses stay visible but never inflate the percentage.
  const fulfillment = whatIBuilt.filter(
    (entry) => entry.role !== "priority" && entry.densityScored !== false,
  );
  const softHeard = whatIBuilt.filter((entry) => entry.densityScored === false);
  let matchPercent = null;
  if (fulfillment.length) {
    const total = fulfillment.reduce((sum, entry) => sum + Number(entry.score || 0), 0);
    matchPercent = Math.round((total / fulfillment.length) * 100);
  } else if (whatIBuilt.length && !softHeard.length) {
    matchPercent = 100;
  } else if (softHeard.length && !fulfillment.length) {
    matchPercent = null;
  }

  const matchLabel =
    matchPercent == null && softHeard.length
      ? "Heard · density not scored"
      : matchPercent == null
        ? "No contract clauses to grade"
        : matchPercent >= 80
          ? "Strong match"
          : matchPercent >= 55
            ? "Partial match"
            : "Weak match";

  return freeze({
    writesToBrain: false,
    version: "commission-contract-v1.1",
    principle: "The optional description isn't a suggestion. It is the player's contract.",
    hasNote: parsed.hasNote,
    hasContract: parsed.hasContract,
    youAskedFor: parsed.youAskedFor,
    whatIBuilt: freeze(whatIBuilt),
    matchPercent,
    matchBand: bandFromScore(matchPercent),
    matchFill: barFill(matchPercent),
    matchLabel,
    softHeardCount: softHeard.length,
    matchHonesty:
      softHeard.length > 0
        ? "Some clauses were heard but not density-scored — they do not inflate match %."
        : null,
    playerFantasy: parsed.playerFantasy,
    requestRecognition: recognition,
    evidence: freeze({
      planeswalkers: walkers.count,
      planeswalkerNames: walkers.names,
    }),
  });
}

/** Alias used by coach / UI. */
export function buildCommissionContract(args) {
  return gradeCommissionContract(args);
}

/**
 * Prefer Player Fantasy narration when a contract fantasy exists.
 * Mechanisms remain available as supporting evidence.
 */
export function applyFantasyNarrator({
  recognition = null,
  commissionContract = null,
} = {}) {
  const fantasy = commissionContract?.playerFantasy;
  if (!fantasy?.tableWhy || !recognition) return recognition;

  return freeze({
    ...recognition,
    tableWhy: fantasy.tableWhy,
    planLabel: fantasy.label || recognition.planLabel,
    primaryPlan: fantasy.tableWhy,
    playerFantasy: fantasy,
    fantasySupportLine: fantasy.supportLine || null,
  });
}
