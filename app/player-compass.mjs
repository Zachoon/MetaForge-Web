// Optional Player Compass — explicit preferences, not inferred skill or identity.
// Stored with the existing cross-device player profile. It can help explain
// differences among already-valid philosophies, but never overrides a player's
// commission and never writes to Brain.

const freeze = (value) => Object.freeze(value);

export const PLAYER_COMPASS_VERSION = "player-compass-v1";
export const PLAYER_COMPASS_MATCH_VERSION = "player-compass-match-v1";
export const PLAYER_COMPASS_TIE_THRESHOLD = 0.15;
const LOCAL_KEY = "metaforge.playerCompass";

export const PLAYER_COMPASS_OPTIONS = freeze({
  pace: freeze(["early", "midgame", "long-game"]),
  risk: freeze(["explosive", "balanced", "recoverable"]),
  interaction: freeze(["own-plan", "mixed", "reactive"]),
  complexity: freeze(["straightforward", "meaningful", "technical"]),
});

export const PLAYER_COMPASS_QUESTIONS = freeze([
  freeze({ id: "pace", prompt: "How quickly do you want the deck to act?", options: freeze([
    freeze({ id: "early", label: "Start applying pressure early" }),
    freeze({ id: "midgame", label: "Build toward a powerful middle game" }),
    freeze({ id: "long-game", label: "Set up patiently for a longer game" }),
  ]) }),
  freeze({ id: "risk", prompt: "How do you feel about risk?", options: freeze([
    freeze({ id: "explosive", label: "I enjoy explosive plays, even when they can fail" }),
    freeze({ id: "balanced", label: "I want a balance" }),
    freeze({ id: "recoverable", label: "I prefer plans that recover well from setbacks" }),
  ]) }),
  freeze({ id: "interaction", prompt: "How involved do you want to be with opponents?", options: freeze([
    freeze({ id: "own-plan", label: "Mostly advance my own plan" }),
    freeze({ id: "mixed", label: "Mix my plan with disruption" }),
    freeze({ id: "reactive", label: "Frequently react to opponents" }),
  ]) }),
  freeze({ id: "complexity", prompt: "How complicated should turns feel?", options: freeze([
    freeze({ id: "straightforward", label: "Straightforward" }),
    freeze({ id: "meaningful", label: "Some meaningful decisions" }),
    freeze({ id: "technical", label: "Highly technical" }),
  ]) }),
]);

function option(axis, value) {
  const clean = String(value || "").trim();
  return PLAYER_COMPASS_OPTIONS[axis].includes(clean) ? clean : null;
}

export function emptyPlayerCompass(overrides = {}) {
  return normalizePlayerCompass({
    version: PLAYER_COMPASS_VERSION,
    skipped: false,
    completed: false,
    answers: { pace: null, risk: null, interaction: null, complexity: null },
    updatedAt: null,
    ...overrides,
  });
}

export function normalizePlayerCompass(value) {
  const source = value && typeof value === "object" ? value : {};
  // Accept the compact flat form used by the server contract as well as the
  // UI's explicit answers envelope. Output one stable presentation shape.
  const raw = source.answers && typeof source.answers === "object" ? source.answers : source;
  const answers = freeze({
    pace: option("pace", raw.pace),
    risk: option("risk", raw.risk),
    interaction: option("interaction", raw.interaction),
    complexity: option("complexity", raw.complexity),
  });
  const answered = Object.values(answers).filter(Boolean).length;
  const completed = answered === 4 && source.completed !== false;
  return freeze({
    version: PLAYER_COMPASS_VERSION,
    skipped: Boolean(source.skipped) && !completed,
    completed,
    answers,
    answered,
    updatedAt: source.updatedAt ? String(source.updatedAt) : null,
  });
}

export function readLocalPlayerCompass() {
  if (typeof window === "undefined") return emptyPlayerCompass();
  try { return normalizePlayerCompass(JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "null")); }
  catch { return emptyPlayerCompass(); }
}

export function writeLocalPlayerCompass(value) {
  const normalized = normalizePlayerCompass({
    ...value,
    updatedAt: value?.updatedAt || new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized)); } catch { /* Account sync can still persist it. */ }
  }
  return normalized;
}

export function playerCompassFromBench(bench) {
  return normalizePlayerCompass(bench?.playerCompass);
}

export function withPlayerCompassOnBench(bench, value) {
  const base = bench && typeof bench === "object" ? bench : { schemaVersion: 1, families: [] };
  return { ...base, playerCompass: normalizePlayerCompass(value) };
}

const ANSWER_COORDINATES = freeze({
  pace: freeze({ early: -1, midgame: 0, "long-game": 1 }),
  risk: freeze({ explosive: -1, balanced: 0, recoverable: 1 }),
  interaction: freeze({ "own-plan": -1, mixed: 0, reactive: 1 }),
  complexity: freeze({ straightforward: -1, meaningful: 0, technical: 1 }),
});

// Authored baselines are keyed by stable engine temper, never display label.
// A future structural inference adapter can supply candidate.vector directly.
export const PLAYER_COMPASS_PHILOSOPHY_VECTORS = freeze({
  resilient: freeze({ pace: 0.6, risk: 0.8, interaction: 0.4, complexity: 0.2 }),
  precision: freeze({ pace: -0.8, risk: -0.9, interaction: -0.6, complexity: -0.3 }),
  synergy: freeze({ pace: 0, risk: 0, interaction: -0.2, complexity: 0.7 }),
  imported: freeze({ pace: 0, risk: 0.2, interaction: 0, complexity: 0 }),
  default: freeze({ pace: 0, risk: 0, interaction: 0, complexity: 0 }),
});

const REASONS = freeze({
  pace: freeze({ early: "you want the deck to act early", midgame: "you want a strong middle game", "long-game": "you enjoy patient plans that improve over longer games" }),
  risk: freeze({ explosive: "you accept risk for more explosive turns", balanced: "you want a balance between ceiling and reliability", recoverable: "you value recovering after setbacks" }),
  interaction: freeze({ "own-plan": "you prefer advancing your own plan", mixed: "you want to mix your plan with disruption", reactive: "you like responding to opponents" }),
  complexity: freeze({ straightforward: "you prefer straightforward turns", meaningful: "you want a few meaningful choices each turn", technical: "you enjoy highly technical sequencing" }),
});

export function playerCompassFitForTemper(compassValue, temper = "default") {
  const compass = normalizePlayerCompass(compassValue);
  if (!compass.completed || compass.skipped) return null;
  const vector = PLAYER_COMPASS_PHILOSOPHY_VECTORS[temper] || PLAYER_COMPASS_PHILOSOPHY_VECTORS.default;
  const playerVector = playerCompassVector(compass);
  const distance = vectorDistance(playerVector, vector);
  const percent = Math.round((1 - distance / 4) * 100);
  const matches = Object.keys(ANSWER_COORDINATES)
    .map((axis) => ({ axis, closeness: Math.abs(playerVector[axis] - vector[axis]) }))
    .sort((left, right) => left.closeness - right.closeness)
    .map(({ axis }) => REASONS[axis][compass.answers[axis]])
    .filter(Boolean);
  const label = percent >= 75 ? "Strong fit" : percent >= 45 ? "Possible fit" : "Different from your usual preferences";
  return freeze({
    score: percent,
    distance,
    label,
    reasons: freeze(matches.slice(0, 2)),
    explanation: matches.length
      ? `${label} because ${matches.slice(0, 2).join(" and ")}.`
      : `${label}; this philosophy emphasizes a different kind of game than your current Player Compass.`,
    answered: compass.answered,
    complete: compass.completed,
  });
}

export function playerCompassVector(compassValue) {
  const compass = normalizePlayerCompass(compassValue);
  if (!compass.completed || compass.skipped) return null;
  return freeze(Object.fromEntries(
    Object.keys(ANSWER_COORDINATES).map((axis) => [axis, ANSWER_COORDINATES[axis][compass.answers[axis]]]),
  ));
}

export function vectorDistance(left, right, weights = {}) {
  if (!left || !right) return null;
  const squared = Object.keys(ANSWER_COORDINATES).reduce((sum, axis) => {
    const weight = Number.isFinite(Number(weights[axis])) ? Number(weights[axis]) : 1;
    return sum + weight * ((Number(left[axis]) || 0) - (Number(right[axis]) || 0)) ** 2;
  }, 0);
  return Math.sqrt(squared);
}

export function matchPlayerCompassCandidates(compassValue, candidates = [], { tieThreshold = PLAYER_COMPASS_TIE_THRESHOLD } = {}) {
  const playerVector = playerCompassVector(compassValue);
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!playerVector || list.length < 2) return null;
  const ranked = list.map((candidate) => {
    const vector = candidate.vector || PLAYER_COMPASS_PHILOSOPHY_VECTORS[candidate.temper] || PLAYER_COMPASS_PHILOSOPHY_VECTORS.default;
    const distance = vectorDistance(playerVector, vector);
    return freeze({ id: candidate.id, distance, fitScore: Math.max(0, 1 - distance / 4), vector });
  }).sort((left, right) => left.distance - right.distance || String(left.id).localeCompare(String(right.id)));
  const first = ranked[0], second = ranked[1];
  const nearTie = second.distance - first.distance <= tieThreshold;
  let winner = first;
  let tieBreak = null;
  let trueTie = false;
  if (nearTie) {
    const tied = ranked.filter((entry) => entry.distance - first.distance <= tieThreshold);
    const resilient = [...tied].sort((left, right) => right.vector.risk - left.vector.risk);
    if (resilient[0].vector.risk > resilient[1].vector.risk) {
      winner = resilient[0];
      tieBreak = "resilience";
    } else {
      const spread = (entry) => Math.max(...Object.values(entry.vector)) - Math.min(...Object.values(entry.vector));
      const steady = [...tied].sort((left, right) => spread(left) - spread(right));
      if (spread(steady[0]) < spread(steady[1])) {
        winner = steady[0];
        tieBreak = "consistency";
      } else {
        winner = [...tied].sort((left, right) => String(left.id).localeCompare(String(right.id)))[0];
        trueTie = true;
        tieBreak = "stable-display-order";
      }
    }
  }
  return freeze({
    version: PLAYER_COMPASS_MATCH_VERSION,
    winnerId: winner.id,
    trueTie,
    tieBreak,
    ranked: freeze(ranked),
  });
}
