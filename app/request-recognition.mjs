// =============================================================================
// Request Recognition — Founder Issue #023
// =============================================================================
// Presentation only. Answers "Did I actually hear you?" before the deck is
// judged. Does not change Brain construction. Does not invent intent that
// was not in the note. Never silently changes the user's vision — if the
// finished list departs from a requested theme, say so and explain why.
// =============================================================================

const freeze = (value) => Object.freeze(value);

/** Presentation themes — separate from construction PACKAGE_CATALOG. */
export const REQUEST_THEME_DICTIONARY = freeze([
  freeze({
    id: "superfriends",
    label: "Superfriends",
    patterns: [
      /\bsuperfriends?\b/i,
      /\bplaneswalkers?\b/i,
      /\bwalkers\b/i,
    ],
    constructionKnown: false,
  }),
  freeze({
    id: "doubling_season",
    label: "Doubling Season",
    patterns: [/\bdoubling\s+season\b/i],
    constructionKnown: false,
    namedCards: freeze(["Doubling Season"]),
  }),
  freeze({
    id: "proliferate",
    label: "Proliferate / counters",
    patterns: [/\bproliferat(?:e|ion)\b/i, /\b\+1\/\+1\s+counters?\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "tokens",
    label: "Tokens",
    patterns: [/\btokens?\b/i, /\bgo[\s-]?wide\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "aristocrats",
    label: "Aristocrats",
    patterns: [/\baristocrats?\b/i, /\bsacrifice\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "reanimator",
    label: "Reanimator",
    patterns: [/\breanimator\b/i, /\breanimat(?:e|ion)\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "voltron",
    label: "Voltron",
    patterns: [/\bvoltron\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "spellslinger",
    label: "Spellslinger",
    patterns: [/\bspellslinger\b/i, /\bspells?\s+matter\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "stax",
    label: "Stax",
    patterns: [/\bstax\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "blink",
    label: "Blink",
    patterns: [/\bblink\b/i, /\bflicker\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "landfall",
    label: "Landfall",
    patterns: [/\blandfall\b/i],
    constructionKnown: true,
  }),
  freeze({
    id: "theme_priority",
    label: "Theme over optimization",
    patterns: [
      /\btheme\s+over\b/i,
      /\bflavor\s+over\b/i,
      /\bfun\s+over\b/i,
      /\bexperience\s+over\b/i,
      /\btheme[\s-]?first\b/i,
      /\bprioritize\s+(?:the\s+)?theme\b/i,
      /\bnot\s+(?:fully\s+)?optimiz/i,
      /\bless\s+optimized\b/i,
      /\bfor\s+the\s+(?:vibe|feel|theme)\b/i,
      /\bdon'?t\s+mind\s+if\s+it\s+isn'?t\s+the\s+strongest\b/i,
      /\bisn'?t\s+the\s+strongest\s+version\b/i,
      /\bfeel\s+like\s+a\s+true\b/i,
      /\bstars?\s+of\s+the\s+show\b/i,
      /\bone\s+of\s+the\s+stars\b/i,
    ],
    constructionKnown: false,
    preference: true,
  }),
]);

const SUPERFRIENDS_DENSE_FLOOR = 8;
const SUPERFRIENDS_LIGHT_CEILING = 5;

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

function uniqueById(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    if (!entry?.id || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

/**
 * Detect presentation themes from free-text commission note.
 */
export function detectRequestedThemes(note = "") {
  const source = normalizeNote(note);
  if (!source) return freeze([]);

  const found = [];
  for (const theme of REQUEST_THEME_DICTIONARY) {
    if (theme.patterns.some((pattern) => pattern.test(source))) {
      found.push(
        freeze({
          id: theme.id,
          label: theme.label,
          constructionKnown: Boolean(theme.constructionKnown),
          preference: Boolean(theme.preference),
          namedCards: freeze([...(theme.namedCards || [])]),
        }),
      );
    }
  }
  return freeze(found);
}

function deckNamesFrom({ selected = null, deckCardNames = null } = {}) {
  if (Array.isArray(deckCardNames) && deckCardNames.length) {
    return deckCardNames.filter(Boolean).map(String);
  }
  return (selected?.rows || []).map((row) => row?.name).filter(Boolean);
}

function typeLineFor(name, { selected = null, cardFacts = null } = {}) {
  const key = normalizeName(name);
  const row = (selected?.rows || []).find(
    (entry) => normalizeName(entry?.name) === key,
  );
  if (row?.typeLine || row?.type_line) {
    return String(row.typeLine || row.type_line);
  }
  if (cardFacts && typeof cardFacts === "object") {
    for (const [factKey, fact] of Object.entries(cardFacts)) {
      if (normalizeName(factKey) === key || normalizeName(fact?.name) === key) {
        const face = fact?.card_faces?.[0]?.type_line;
        return String(face || fact?.type_line || "");
      }
    }
  }
  return "";
}

export function countPlaneswalkers({
  selected = null,
  deckCardNames = null,
  cardFacts = null,
} = {}) {
  const names = deckNamesFrom({ selected, deckCardNames });
  let count = 0;
  const found = [];
  for (const name of names) {
    const typeLine = typeLineFor(name, { selected, cardFacts });
    if (/\bPlaneswalker\b/i.test(typeLine)) {
      count += 1;
      found.push(name);
      continue;
    }
    // Fallback when facts are still loading: named Doubling Season-class
    // themes are handled separately; walker detection without type lines
    // stays conservative (no invented counts).
  }
  return freeze({ count, names: freeze(found) });
}

function cardPresent(targetName, names = []) {
  const want = normalizeName(targetName);
  return names.some((name) => normalizeName(name) === want);
}

function protectionSignal(selected = null) {
  const evaluation = selected?.evaluation || {};
  const resilience = Number(evaluation.resilience);
  const roles = evaluation.roles || selected?.roles || {};
  const protection =
    Number(roles.Protection || roles.protection || 0) ||
    Number(roles["Board wipe"] || 0) + Number(roles.Interaction || 0);
  return freeze({
    resilience: Number.isFinite(resilience) ? resilience : null,
    protectionCount: Number.isFinite(protection) ? protection : 0,
  });
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
 * Build Request Recognition for the coach report.
 * writesToBrain: false — explain-only.
 */
export function buildRequestRecognition({
  note = "",
  blueprint = null,
  selected = null,
  structuralSystems = null,
  cardFacts = null,
  deckCardNames = null,
} = {}) {
  const source = normalizeNote(note);
  const themes = detectRequestedThemes(source);
  const names = deckNamesFrom({ selected, deckCardNames });
  const walkers = countPlaneswalkers({ selected, deckCardNames, cardFacts });
  const protection = protectionSignal(selected);
  const blueprintPromises = freeze([...(blueprint?.promises || selected?.strategicIntent?.blueprint?.promises || [])]);
  const blueprintAlignment = selected?.blueprintAlignment || null;

  const heard = [];

  for (const theme of themes) {
    let status = "detected";
    let detail = "Heard in your commission note.";

    if (theme.id === "doubling_season") {
      const inDeck = theme.namedCards.some((card) => cardPresent(card, names));
      status = inDeck ? "present" : "detected";
      detail = inDeck ? "In this build." : "Heard in your note.";
    }

    if (theme.id === "superfriends") {
      if (walkers.count >= SUPERFRIENDS_DENSE_FLOOR) {
        status = "present";
        detail = `${walkers.count} planeswalkers in this build.`;
      } else if (walkers.count > 0) {
        status = "partial";
        detail = `${walkers.count} planeswalker${walkers.count === 1 ? "" : "s"} in this build.`;
      } else {
        status = "detected";
        detail = "Heard in your note.";
      }
    }

    if (theme.id === "theme_priority" || theme.preference) {
      status = "detected";
      detail = "Heard as a play priority — not a card package.";
    }

    if (theme.constructionKnown && blueprintPromises.length) {
      const promiseHit = blueprintPromises.some((promise) =>
        String(promise).toLocaleLowerCase("en").includes(
          theme.label.split(/[\/\s]/)[0].toLocaleLowerCase("en"),
        ),
      );
      if (promiseHit) {
        status = status === "detected" ? "present" : status;
        detail = `${detail} Also mirrored in Blueprint promises.`;
      }
    }

    heard.push(
      freeze({
        id: theme.id,
        label: theme.label,
        status,
        detail,
        constructionKnown: theme.constructionKnown,
      }),
    );
  }

  // Surface construction-heard promises that weren't covered by the theme dictionary.
  for (const promise of blueprintPromises) {
    const id = `blueprint:${normalizeName(promise).replace(/\s+/g, "_")}`;
    if (heard.some((entry) => entry.label.toLocaleLowerCase("en") === String(promise).toLocaleLowerCase("en"))) {
      continue;
    }
    if (themes.some((theme) => String(promise).toLocaleLowerCase("en").includes(theme.label.toLocaleLowerCase("en").split(" ")[0]))) {
      continue;
    }
    heard.push(
      freeze({
        id,
        label: promise,
        status: "present",
        detail: "Recognized as a Blueprint construction promise.",
        constructionKnown: true,
      }),
    );
  }

  const adjustments = [];
  const superfriends = themes.find((theme) => theme.id === "superfriends");
  const doubling = themes.find((theme) => theme.id === "doubling_season");

  if (superfriends && walkers.count > 0 && walkers.count <= SUPERFRIENDS_LIGHT_CEILING) {
    const resilience = protection.resilience;
    let mode = "density_choice";
    let reason = `You asked for Superfriends; this list keeps it to ${walkers.count} walkers.`;

    if (!superfriends.constructionKnown) {
      mode = "interpretation_gap";
      reason =
        `You asked for Superfriends; this list has ${walkers.count} walkers because that theme isn’t a construction package yet.`;
    } else if (Number.isFinite(resilience) && resilience >= 55) {
      mode = "constraint_tradeoff";
      reason =
        `You asked for Superfriends; this list keeps ${walkers.count} walkers so the ones that matter are more likely to survive.`;
    } else if (
      doubling &&
      doubling.namedCards.some((card) => cardPresent(card, names))
    ) {
      reason =
        `You asked for Superfriends; this list keeps ${walkers.count} walkers and leans on Doubling Season as the high-impact piece.`;
    }

    adjustments.push(
      freeze({
        id: "superfriends-density",
        themeId: "superfriends",
        mode,
        headline: "Adjustment made",
        reason,
        observed: freeze({
          planeswalkers: walkers.count,
          resilience: Number.isFinite(resilience) ? Math.round(resilience) : null,
          protectionCount: protection.protectionCount,
        }),
      }),
    );
  }

  if (
    doubling &&
    !doubling.namedCards.some((card) => cardPresent(card, names)) &&
    names.length > 0
  ) {
    const countersSystem = (structuralSystems?.systems || []).find((system) =>
      /counter|token|proliferat/i.test(`${system?.name || ""} ${system?.signal || ""}`),
    );
    adjustments.push(
      freeze({
        id: "doubling-season-missing",
        themeId: "doubling_season",
        mode: "theme_underdelivered",
        headline: "Adjustment made",
        reason: countersSystem
          ? `You asked for Doubling Season; it isn’t in this list, though a related ${countersSystem.name} is.`
          : "You asked for Doubling Season; it isn’t in this finished list.",
        observed: freeze({
          doublingSeasonPresent: false,
          relatedSystem: countersSystem?.name || null,
        }),
      }),
    );
  }

  if (
    blueprintAlignment?.status === "missed-supported-blueprint" &&
    blueprintAlignment?.boundary
  ) {
    adjustments.push(
      freeze({
        id: "blueprint-missed",
        themeId: "blueprint",
        mode: "blueprint_miss",
        headline: "Adjustment made",
        reason: blueprintAlignment.boundary,
        observed: freeze({
          status: blueprintAlignment.status,
        }),
      }),
    );
  }

  // Theme fidelity: requested themes realized in the finished list.
  let themeScore = null;
  if (themes.length) {
    let points = 0;
    for (const theme of themes) {
      if (theme.id === "superfriends") {
        points += walkers.count >= SUPERFRIENDS_DENSE_FLOOR ? 1 : walkers.count > 0 ? 0.45 : 0.15;
      } else if (theme.id === "doubling_season") {
        points += theme.namedCards.some((card) => cardPresent(card, names)) ? 1 : 0.2;
      } else {
        points += 0.7;
      }
    }
    themeScore = Math.round((points / themes.length) * 100);
  }

  const cohesion = Number(selected?.evaluation?.cohesion);
  const resilience = protection.resilience;
  const competitiveScore = Number.isFinite(cohesion) && Number.isFinite(resilience)
    ? Math.round((cohesion + resilience) / 2)
    : Number.isFinite(cohesion)
      ? Math.round(cohesion)
      : Number.isFinite(resilience)
        ? Math.round(resilience)
        : null;

  const whyDiffer =
    adjustments.length && Number.isFinite(themeScore) && Number.isFinite(competitiveScore)
      ? themeScore > competitiveScore + 15
        ? "Your request is recognized strongly; measured list health trails theme fidelity — the Forge may have under-built the theme."
        : competitiveScore > themeScore + 15
          ? "Measured list health outran theme fidelity — the Forge likely traded some of your requested theme for consistency or protection."
          : "Theme fidelity and measured list health are pulling in different directions; see Adjustment made for the specific tradeoff."
      : adjustments.length
        ? adjustments[0].reason
        : themes.length
          ? "Requested themes were recognized without a major silent departure."
          : source
            ? "No named archetype themes were detected in the commission note."
            : "No commission note was provided for this forge.";

  return freeze({
    writesToBrain: false,
    version: "request-recognition-v1",
    principle: "MetaForge never silently changes the user's vision.",
    hasNote: Boolean(source),
    heard: freeze(uniqueById(heard)),
    adjustments: freeze(adjustments),
    fidelity: freeze({
      themeFidelity: themeScore,
      themeFidelityBand: bandFromScore(themeScore),
      themeFidelityFill: barFill(themeScore),
      competitiveHealth: competitiveScore,
      competitiveHealthBand: bandFromScore(competitiveScore),
      competitiveHealthFill: barFill(competitiveScore),
      whyDiffer,
    }),
    evidence: freeze({
      planeswalkers: walkers.count,
      planeswalkerNames: walkers.names,
      blueprintPromiseCount: blueprintPromises.length,
      blueprintAlignmentStatus: blueprintAlignment?.status || null,
    }),
  });
}
