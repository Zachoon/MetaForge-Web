// Server-side backend for the guided Build category loop
// (architecture/GUIDED_CONSTRUCTION_FLOW.md's flow step 3 — "the Forge
// offers one card with a stated reason"). Follows forge-one-slot.ts's exact
// pattern for the same underlying reason: a card pool is fetched and
// classified once (a real Scryfall cost), then every later request in the
// same session reloads that cached context via generationId (forge-
// generation-store.ts) and only re-runs cheap, pure scoring — never a
// second round of Scryfall requests.
//
// Accounts and guests both use this loop (guided-identity.ts). A guest's
// context is stored under `guest:<signed cookie id>`, the same key shape
// guest-generate already uses; start is the only place a guest session is
// minted and it requires Turnstile.
import { analyzeForgePool } from "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";
import { CATEGORY_SEQUENCE, buildCategoryBudgetLedger } from "../app/category-budget-ledger.mjs";
import { flattenAnalyzedEntries } from "../app/guided-build-rows.mjs";
import { POWER_TIERS, powerSignalCategoryFor } from "../app/commander-power-signal.mjs";
import { STRATEGIC_PACKAGE_IDS } from "../app/strategic-intent.mjs";
import {
  buildPreferenceProfile,
  explainOffer,
  orderRemainingCategories,
  sanitizeDeclineFeedback,
} from "../app/guided-preference-learning.mjs";
import { normalizePlayerCompass } from "../app/player-compass.mjs";
import {
  analyzePartialList,
  buildReasoningContext,
  commanderReasoningEntry,
  profileStepUrgencies,
  type reasonAboutCandidate,
  type buildDeckProfile,
} from "../app/reasoning-engine/index.mjs";

type ListAnalysis = ReturnType<typeof analyzePartialList>;
type DeckProfile = ReturnType<typeof buildDeckProfile>;
type CandidateReasoning = ReturnType<typeof reasonAboutCandidate>;
import {
  ALLOWED_FORMATS,
  MAX_ORACLE_TEXT,
  MAX_SHORT_STRING,
  loadNativeForgePool,
  nativeCardFact,
  sanitizeCommander,
  type CommanderInput,
  type ScryfallCounter,
} from "./forge-generate";
import { isCommanderFormat, targetDeckSize } from "./forge-result-validator.mjs";
import { guestStepLimit, guidedIdentity, guidedStartIdentity, type GuidedIdentityEnv } from "./guided-identity";
import { proposeManaBase, isLandEntry, finishStatus } from "../app/guided-finish.mjs";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { storeGeneration, loadGeneration } from "./forge-generation-store";

type Env = GuidedIdentityEnv;

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

// start does one real Scryfall pool fetch (comparable cost to a one-shot
// generation); next is pure CPU re-analysis of an already-cached pool, no
// network I/O. Separate, tighter limits than forge-generate.ts's own 15/5min
// reflect that a single guided session calls next many times (once per
// accept/decline/category change) but start only once per session.
const START_RATE_LIMIT = 15;
const START_RATE_WINDOW_MS = 5 * 60 * 1000;
const NEXT_RATE_LIMIT = 120;
const NEXT_RATE_WINDOW_MS = 5 * 60 * 1000;

// Manual search results can carry a full oracle-text card, so this endpoint
// allows a larger body than start's plain name lists.
const MAX_BODY_BYTES = 96 * 1024;
const MAX_ROWS = 100;
const MAX_ROW_NAME = 400;
const MAX_MANUAL_CARDS = 30;

function sanitizeNameList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, max)
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.slice(0, MAX_ROW_NAME))
    .filter((entry) => entry.length > 0);
}

// A card the player found through manual search rather than a Forge
// suggestion. The client's search already scopes to the legal format and the
// commander's color identity, so this only shapes the data (the same
// transform every pool card already goes through) — it does not re-verify
// legality against Scryfall, which would reintroduce the per-click network
// cost this whole endpoint design exists to avoid. Worst case for a
// fabricated entry is a player misleading their own build, not a security
// issue: the finish step's decklist import still resolves every card
// against real Scryfall data independently.
function sanitizeManualCards(raw: unknown): ReturnType<typeof nativeCardFact>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_MANUAL_CARDS)
    .filter((entry) => entry && typeof entry === "object" && typeof (entry as any).name === "string" && (entry as any).name.trim())
    .map((entry) => nativeCardFact(entry));
}

function validateCategory(value: unknown): value is string {
  return typeof value === "string" && (CATEGORY_SEQUENCE as readonly string[]).includes(value);
}

function validateFocusPackageId(value: unknown): value is string {
  return typeof value === "string" && STRATEGIC_PACKAGE_IDS.includes(value);
}

const normalizeKey = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en");
const faceKey = (name: string) => normalizeKey(name).split(" // ")[0];

function indexAnalyzedCards(cards: any[]) {
  const analyzedByName = new Map<string, any>();
  for (const entry of cards) {
    const key = normalizeKey(String(entry?.card?.name || entry?.name || ""));
    if (!key) continue;
    if (!analyzedByName.has(key)) analyzedByName.set(key, entry);
    const face = key.split(" // ")[0];
    if (face !== key && !analyzedByName.has(face)) analyzedByName.set(face, entry);
  }
  return analyzedByName;
}

function analyzedEntry(analyzedByName: Map<string, any>, name: string) {
  const key = normalizeKey(name);
  return analyzedByName.get(key) || analyzedByName.get(faceKey(name)) || null;
}

// The popularity-ordered pool is capped, so a pasted list routinely names
// cards it does not contain. Those cards still belong in the ledger. Resolve
// the misses once, at start, and store them on the generation so later
// clicks stay local. A lookup failure leaves that name accepted but uncounted,
// which is the previous behavior, not a failed start.
async function resolveSeedCardsOutsidePool(poolCards: any[], seedNames: string[]) {
  const known = new Set<string>();
  for (const card of poolCards) {
    const key = normalizeKey(String(card?.name || ""));
    if (!key) continue;
    known.add(key);
    known.add(faceKey(key));
  }
  const missing = seedNames.filter((name) => {
    const key = normalizeKey(name);
    return Boolean(key) && !known.has(key) && !known.has(faceKey(name));
  });
  if (!missing.length) return [];
  const found: ReturnType<typeof nativeCardFact>[] = [];
  for (let index = 0; index < missing.length; index += 75) {
    const chunk = missing.slice(index, index + 75);
    try {
      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "MetaForge/1.0 (https://metaforge.gg)",
        },
        body: JSON.stringify({
          identifiers: chunk.map((name) => ({ name: name.split(/\s*\/\/\s*/)[0].trim() })),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const payload: any = await response.json();
      for (const card of Array.isArray(payload?.data) ? payload.data : []) {
        const fact = nativeCardFact(card);
        const key = normalizeKey(fact.name);
        if (!key || known.has(key)) continue;
        known.add(key);
        known.add(faceKey(key));
        found.push(fact);
      }
    } catch (error) {
      console.error("forge-guided-start seed lookup failed", error);
    }
  }
  return found;
}

// Learning signals the client resends in full on every request (the same
// stateless contract as acceptedNames/declinedNames): why each card was
// declined, the Player Compass answers given so far (partial answers count
// immediately), and the player's current step order.
type DeclineFeedback = ReturnType<typeof sanitizeDeclineFeedback>;
interface LearningInput {
  declineFeedback: DeclineFeedback;
  compass: ReturnType<typeof normalizePlayerCompass> | null;
}
function sanitizeCompass(raw: unknown) {
  return raw && typeof raw === "object" ? normalizePlayerCompass(raw) : null;
}
function sanitizeCategoryOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length !== CATEGORY_SEQUENCE.length) return null;
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!validateCategory(entry) || seen.has(entry)) return null;
    seen.add(entry);
  }
  return raw as string[];
}

/**
 * Re-runs analyzeForgePool against a cached raw pool and computes one
 * suggestion for the requested category. Shared by start (fresh pool) and
 * next (reloaded pool) so both endpoints score identically.
 */
function computeOffer(
  cards: any[],
  input: {
    format: string;
    commander: CommanderInput;
    secondCommander: CommanderInput;
    note: string;
    focusPackageId?: string;
    targetPowerTier?: string;
    strategy?: string;
    complexity?: string;
    budget?: string;
    maxCardPrice?: number;
    commonsOnly?: boolean;
  },
  category: string,
  acceptedNames: string[],
  declinedNames: string[],
  cacheKey?: string,
  manualCards: any[] = [],
  learning: LearningInput = { declineFeedback: [], compass: null },
) {
  // Manual search finds cards outside the pool loadNativeForgePool fetched
  // (a Scryfall search is popularity-ordered and capped in size). Without
  // merging them in here, a manually-added pick would still make it into the
  // finished deck (the finish step's decklist import resolves any name
  // independently) but would silently never appear in the live ledger while
  // the player is still building — exactly the kind of quiet mismatch this
  // project's own trust principle says not to ship. The client resends every
  // manual card it has added on each later request (there is no persistent
  // per-generation pool to append to without minting a new generationId), so
  // the cache key folds in which manual cards are present: unchanged between
  // clicks, the merged analysis is still reused; a newly added manual card
  // computes fresh once and is cached under its own key from then on.
  const effectiveKey = cacheKey && manualCards.length
    ? `${cacheKey}::${manualCards.map((card) => normalizeKey(String(card?.name || ""))).sort().join(",")}`
    : cacheKey;
  // maxCardPrice / commonsOnly are hard promises (analyzeForgePool drops
  // ineligible cards from `spells` entirely), and budget / Casual power are
  // the same soft pressures one-shot construction passes to its own scoring
  // — the guided loop must keep the preferences the player already set,
  // not quietly offer a $40 card to someone who asked for a budget build.
  const analysis = (effectiveKey && readCachedAnalysis(effectiveKey))
    || analyzeForgePool({ ...input, cards: manualCards.length ? [...cards, ...manualCards] : cards });
  if (effectiveKey) cacheAnalysis(effectiveKey, analysis);
  const analyzedByName = indexAnalyzedCards(analysis.cards);
  const partialRows = acceptedNames
    .map((name) => analyzedEntry(analyzedByName, name))
    .filter((entry): entry is any => Boolean(entry));
  // Decline reasons only shape ranking; the declined card itself is still
  // excluded through declinedNames exactly as before.
  const preferenceProfile = buildPreferenceProfile({
    acceptedRows: partialRows,
    declined: learning.declineFeedback.map((entry) => ({ row: analyzedEntry(analyzedByName, entry.name), reason: entry.reason })),
    compass: learning.compass,
  });
  // The reasoning engine's running deck profile, rebuilt from the full pick
  // list on every request (stateless, like everything else here).
  const commanderEntries = [input.commander, input.secondCommander].flatMap((commander) => {
    const entry = commanderReasoningEntry(commander);
    return entry ? [entry] : [];
  });
  const reasoningContext = buildReasoningContext({
    commanders: commanderEntries,
    picks: partialRows,
    deckSize: targetDeckSize(input.format),
    hints: `${input.strategy || ""} ${input.note || ""}`,
    colorIdentity: [...new Set(commanderEntries.flatMap((commander) => commander.colorIdentity))],
  });
  const suggestion = suggestCardForCategory({
    category,
    partialRows,
    // The scored view (raw card quality attached), same as chooseSpells ranks.
    pool: analysis.scoredSpells,
    intent: analysis.strategicIntent,
    declinedNames,
    options: {
      budgetConstraint: input.budget === "Budget conscious",
      powerConstraint: input.targetPowerTier === "Casual",
      powerSignalCategoryFor,
      preferenceProfile,
      reasoningContext,
    },
  } as any);
  const ledger = buildCategoryBudgetLedger(
    { rows: flattenAnalyzedEntries(partialRows) },
    analysis.strategicIntent,
    // Standard Brawl is 60 cards, not 100 — without this, its ledger
    // demanded the exact same absolute fundamentals counts as a Commander
    // deck (see fundamentals-target-table.mjs's fundamentalTargetFor),
    // which alone outsized the deck's own land count.
    { targetPowerTier: input.targetPowerTier, deckTarget: targetDeckSize(input.format) },
  );
  const explanation = explainOffer({
    offer: suggestion.offer,
    category,
    acceptedRows: partialRows,
    nearestAlternative: suggestion.reason?.nearestAlternative || null,
    adjustment: suggestion.adjustment || null,
  });
  const deckUrgency = profileStepUrgencies(reasoningContext.profile, [...CATEGORY_SEQUENCE]);
  return { suggestion, ledger, analysis, preferenceProfile, explanation, reasoningContext, deckUrgency, partialRows, commanderEntries };
}

// Analysis (classifying ~1000 cards) costs ~200ms and is identical for every
// request in a session, while the suggestion itself costs ~50ms. A small
// in-isolate cache keyed by generationId turns most clicks into the cheap
// part. It is only ever consulted after loadGeneration has verified the
// caller owns that generationId, and a cold isolate simply recomputes, so it
// is purely a latency optimisation, never a source of truth.
const ANALYSIS_CACHE_MAX = 8;
const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;
const analysisCache = new Map<string, { at: number; analysis: any }>();
function readCachedAnalysis(key: string) {
  const hit = analysisCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return hit.analysis;
}
function cacheAnalysis(key: string, analysis: any) {
  analysisCache.delete(key);
  analysisCache.set(key, { at: Date.now(), analysis });
  while (analysisCache.size > ANALYSIS_CACHE_MAX) {
    const oldest = analysisCache.keys().next().value;
    if (oldest === undefined) break;
    analysisCache.delete(oldest);
  }
}

function serializeLedger(ledger: ReturnType<typeof buildCategoryBudgetLedger>) {
  return ledger.categories.map((row: any) => ({
    category: row.category,
    actual: row.actual,
    target: row.target,
    status: row.status,
  }));
}

export function serializeListAnalysis(result: ListAnalysis, submitted: number) {
  return {
    plan: {
      id: result.plan.id,
      label: result.plan.label,
      confidence: result.plan.confidence,
      certaintyNote: result.plan.certaintyNote || null,
      restrictionNote: result.plan.restrictionNote || null,
    },
    planBalance: result.planBalance,
    recognized: result.profile.picks,
    submitted,
    flagged: result.flagged.slice(0, 12).map((entry) => ({ name: entry.name, severity: entry.severity, reasons: entry.reasons.map((reason) => reason.text) })),
    strengths: result.strengths.map((entry) => ({ name: entry.name, text: entry.text })),
    nextSteps: result.nextSteps,
    notes: result.notes,
  };
}

// The running deck profile, trimmed to what the guided UI shows.
export function serializeDeckProfile(profile: DeckProfile | null) {
  if (!profile) return null;
  return {
    plan: {
      id: profile.plan.id,
      label: profile.plan.label,
      confidence: profile.plan.confidence,
      secondary: profile.plan.secondary,
      certaintyNote: profile.plan.certaintyNote || null,
      restrictionNote: profile.plan.restrictionNote || null,
    },
    planBalance: profile.planBalance,
    roles: profile.roles.map((row) => ({ role: row.role, label: row.label, actual: row.actual, target: row.target, status: row.status })),
    gaps: profile.gaps.slice(0, 4).map((row) => ({ role: row.role, label: row.label, missing: row.missing })),
    curve: profile.curve,
    colors: profile.colors,
  };
}

export function serializeReasoning(reasoning: CandidateReasoning | null | undefined) {
  if (!reasoning) return null;
  return {
    confidence: reasoning.confidence,
    confidenceLabel: reasoning.confidenceLabel,
    confidenceNote: reasoning.confidenceNote || null,
    summary: reasoning.summary || null,
    reasons: reasoning.reasons.slice(0, 6).map((reason) => ({ kind: reason.kind, text: reason.text })),
    worksWith: reasoning.worksWith.map((partner) => ({ name: partner.name, mechanism: partner.mechanism })),
  };
}

function serializeOffer(
  suggestion: ReturnType<typeof suggestCardForCategory>,
  ledger: ReturnType<typeof buildCategoryBudgetLedger>,
  explanation: ReturnType<typeof explainOffer> = null,
  categoryOrder: string[] | null = null,
  deckProfile: DeckProfile | null = null,
) {
  const card = suggestion.offer?.card || suggestion.offer;
  return {
    reasoning: serializeReasoning(suggestion.reasoning as CandidateReasoning | null),
    deckProfile: serializeDeckProfile(deckProfile),
    ledger: serializeLedger(ledger),
    explanation,
    categoryOrder,
    category: suggestion.category,
    exhausted: suggestion.exhausted,
    remainingCandidates: suggestion.remainingCandidates,
    reason: suggestion.reason,
    offer: card
      ? {
          name: card.name,
          typeLine: card.typeLine,
          oracleText: card.oracleText,
          manaCost: card.manaCost,
          cmc: card.cmc,
          priceUsd: card.priceUsd,
        }
      : null,
  };
}

export async function handleForgeGuidedStart(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data as any;

  const started = await guidedStartIdentity(request, env, body?.turnstileToken);
  if (!started.ok) return started.response;
  const identity = started.identity;
  const key = identity.key;

  const limitResult = await checkRateLimit(env, key, "forge-guided-start", START_RATE_LIMIT, START_RATE_WINDOW_MS);
  if (!limitResult.allowed) {
    return json({ error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds }, 429, {
      "Retry-After": String(limitResult.retryAfterSeconds),
    });
  }

  if (typeof body?.format !== "string" || !ALLOWED_FORMATS.has(body.format) || !isCommanderFormat(body.format)) {
    return json({ error: "format must be a supported Commander-family format" }, 400);
  }
  const commander = sanitizeCommander(body?.commander);
  if (!commander) return json({ error: "A commander is required to start the guided Build" }, 400);
  const secondCommander = sanitizeCommander(body?.secondCommander);
  const note = typeof body?.note === "string" ? body.note.slice(0, MAX_SHORT_STRING * 10) : "";
  const focusPackageId = body?.focusPackageId !== undefined && body.focusPackageId !== ""
    ? (validateFocusPackageId(body.focusPackageId) ? body.focusPackageId : undefined)
    : undefined;
  if (body?.focusPackageId && !focusPackageId) {
    return json({ error: "focusPackageId must be one of the supported shell package ids" }, 400);
  }
  const targetPowerTier = typeof body?.targetPowerTier === "string" && (POWER_TIERS as readonly string[]).includes(body.targetPowerTier)
    ? body.targetPowerTier
    : undefined;
  const shortString = (value: unknown) => (typeof value === "string" ? value.slice(0, MAX_SHORT_STRING) : undefined);
  const strategy = shortString(body?.strategy) || "Balanced midrange";
  const complexity = shortString(body?.complexity);
  const budget = shortString(body?.budget);
  const maxCardPrice = typeof body?.maxCardPrice === "number" && Number.isFinite(body.maxCardPrice) && body.maxCardPrice >= 0 && body.maxCardPrice <= 100_000
    ? body.maxCardPrice
    : undefined;
  const commonsOnly = body?.commonsOnly === true;
  // A pasted partial list starts a guided review: its cards are kept as the
  // player's picks and the walk-through covers the roles still open.
  const seedNames = sanitizeNameList(body?.seedNames, MAX_ROWS);
  const compass = sanitizeCompass(body?.playerCompass);
  void MAX_ORACLE_TEXT; // sanitizeCommander already enforces this internally.

  try {
    const counter: ScryfallCounter = { count: 0 };
    const pool = await loadNativeForgePool(body.format, commander, "", note, secondCommander, counter);
    const seedCards = await resolveSeedCardsOutsidePool(pool.cards, seedNames);
    const cards = seedCards.length ? [...pool.cards, ...seedCards] : pool.cards;
    const input = { format: body.format, commander, secondCommander, note, focusPackageId, targetPowerTier, strategy, complexity, budget, maxCardPrice, commonsOnly };
    const learning = { declineFeedback: [], compass };
    // Order the steps before choosing the first one, so a pasted list that
    // already covers ramp opens on whatever it is actually missing.
    const probe = computeOffer(cards, input, CATEGORY_SEQUENCE[0], seedNames, [], undefined, [], learning);
    const categoryOrder = orderRemainingCategories([...CATEGORY_SEQUENCE], -1, {
      ledger: serializeLedger(probe.ledger),
      profile: probe.preferenceProfile,
      deckUrgency: probe.deckUrgency,
    });
    // A pasted list gets a read-only review: plan, flagged cards, and which
    // roles to walk through next. It never adds a card.
    const listAnalysis = seedNames.length
      ? serializeListAnalysis(analyzePartialList({
        commanders: probe.commanderEntries,
        entries: probe.partialRows,
        deckSize: targetDeckSize(body.format),
        hints: `${strategy} ${note}`,
        colorIdentity: [...new Set(probe.commanderEntries.flatMap((commander) => commander.colorIdentity))],
      }), seedNames.length)
      : null;
    const { suggestion, ledger, analysis, explanation, reasoningContext } = categoryOrder[0] === CATEGORY_SEQUENCE[0]
      ? probe
      : computeOffer(cards, input, categoryOrder[0], seedNames, [], undefined, [], learning);

    const generationId = await storeGeneration(env, key, {
      selected: null,
      candidates: [],
      cardPool: cards,
      options: { format: body.format, strategy, target: 0 },
      forgeInput: {
        commander, secondCommander, note,
        focusPackageId: focusPackageId || null,
        targetPowerTier: targetPowerTier || null,
        strategy, complexity: complexity || null, budget: budget || null,
        maxCardPrice: maxCardPrice ?? null, commonsOnly,
      },
    });
    if (!generationId) {
      return json({ error: "The guided Build could not be started for this commander right now." }, 500);
    }
    cacheAnalysis(generationId, analysis);

    return json(
      {
        generationId, colors: pool.colors, categorySequence: categoryOrder, seedNames, listAnalysis,
        owner: identity.guest ? "guest" : key,
        guest: identity.guest,
        ...(identity.claimToken ? { guestClaimToken: identity.claimToken } : {}),
        ...serializeOffer(suggestion, ledger, explanation, categoryOrder, reasoningContext.profile),
      },
      200,
      identity.setCookie ? { "Set-Cookie": identity.setCookie } : {},
    );
  } catch (error) {
    console.error("forge-guided-start failed", error);
    return json({ error: "The guided Build could not be started." }, 500);
  }
}

type StoredForgeInput = {
  commander: CommanderInput;
  secondCommander: CommanderInput;
  note: string;
  focusPackageId: string | null;
  targetPowerTier?: string | null;
  strategy?: string | null;
  complexity?: string | null;
  budget?: string | null;
  maxCardPrice?: number | null;
  commonsOnly?: boolean;
};
function inputFromStored(stored: { options: { format: string; strategy?: string }; forgeInput?: Record<string, unknown> }) {
  const forgeInput = (stored.forgeInput || {}) as StoredForgeInput;
  return {
    format: stored.options.format as string,
    commander: forgeInput.commander,
    secondCommander: forgeInput.secondCommander,
    note: forgeInput.note || "",
    focusPackageId: forgeInput.focusPackageId || undefined,
    targetPowerTier: forgeInput.targetPowerTier || undefined,
    strategy: forgeInput.strategy || stored.options.strategy || undefined,
    complexity: forgeInput.complexity || undefined,
    budget: forgeInput.budget || undefined,
    maxCardPrice: forgeInput.maxCardPrice ?? undefined,
    commonsOnly: Boolean(forgeInput.commonsOnly),
  };
}

export async function handleForgeGuidedNext(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const identity = await guidedIdentity(request, env);
  if (!identity) return json({ error: "Your guided session expired. Start the build again." }, 401);
  const key = identity.key;
  const stepLimited = await guestStepLimit(request, env, identity);
  if (stepLimited) return stepLimited.response;

  const limitResult = await checkRateLimit(env, key, "forge-guided-next", NEXT_RATE_LIMIT, NEXT_RATE_WINDOW_MS);
  if (!limitResult.allowed) {
    return json({ error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds }, 429, {
      "Retry-After": String(limitResult.retryAfterSeconds),
    });
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data as any;

  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  if (!generationId) return json({ error: "generationId is required" }, 400);
  if (!validateCategory(body?.category)) return json({ error: "category must be one of the guided build's categories" }, 400);

  const acceptedNames = sanitizeNameList(body?.acceptedNames, MAX_ROWS);
  const declinedNames = sanitizeNameList(body?.declinedNames, MAX_ROWS);
  const manualCards = sanitizeManualCards(body?.manualCards);
  const declineFeedback = sanitizeDeclineFeedback(body?.declineFeedback, { max: MAX_ROWS, maxName: MAX_ROW_NAME });
  const compass = sanitizeCompass(body?.playerCompass);
  const clientOrder = sanitizeCategoryOrder(body?.categories);
  const categoryIndex = Number.isInteger(body?.categoryIndex) && clientOrder && clientOrder[body.categoryIndex] === body.category
    ? body.categoryIndex
    : null;

  const generation = await loadGeneration(env, key, generationId);
  if (!generation.ok) {
    return json({ error: "This guided Build session is no longer available. Start a new one." }, 404);
  }

  try {
    const stored = generation.payload;
    const input = inputFromStored(stored);
    // generation.ok above already proved this caller owns generationId.
    const { suggestion, ledger, explanation, preferenceProfile, deckUrgency, reasoningContext } = computeOffer(
      stored.cardPool, input, body.category, acceptedNames, declinedNames, generationId, manualCards,
      { declineFeedback, compass },
    );
    // Only the steps after the current one are reordered, and only when the
    // client told us its order and position; older clients get null and
    // keep their fixed sequence.
    const categoryOrder = clientOrder && categoryIndex !== null
      ? orderRemainingCategories(clientOrder, categoryIndex, { ledger: serializeLedger(ledger), profile: preferenceProfile, deckUrgency })
      : null;
    return json(serializeOffer(suggestion, ledger, explanation, categoryOrder, reasoningContext.profile));
  } catch (error) {
    console.error("forge-guided-next failed", error);
    return json({ error: "The guided Build could not continue for this session." }, 500);
  }
}

const MAX_PACKAGE_SIZE = 3;
type LedgerRow = { category: string; actual: number; target: { min: number; max: number } | null; status: string };
function sanitizeBasicsInput(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [name, count] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    if (/^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(name) && Number.isInteger(count) && (count as number) >= 0 && (count as number) <= 99) out[name] = count as number;
  }
  return out;
}

/**
 * The guided finish. Replaces the old "the Forge fills lands and open
 * slots" handoff with two walk-through steps that only ever propose:
 *
 *   stage "mana"  — land count with its reasoning, color-source targets,
 *                   ranked utility lands, and a basics split the player
 *                   adjusts before confirming.
 *   stage "slots" — the open-slot count and a small package (up to three
 *                   cards) aimed at the roles still under target, each with
 *                   its own explanation. The player accepts, swaps or skips
 *                   each one; nothing is added without them.
 *
 * Pure re-analysis of the cached pool, same cost profile as next.
 */
export async function handleForgeGuidedFinish(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const identity = await guidedIdentity(request, env);
  if (!identity) return json({ error: "Your guided session expired. Start the build again." }, 401);
  const key = identity.key;
  const stepLimited = await guestStepLimit(request, env, identity);
  if (stepLimited) return stepLimited.response;
  const limitResult = await checkRateLimit(env, key, "forge-guided-next", NEXT_RATE_LIMIT, NEXT_RATE_WINDOW_MS);
  if (!limitResult.allowed) {
    return json({ error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds }, 429, {
      "Retry-After": String(limitResult.retryAfterSeconds),
    });
  }
  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- validated field by field below
  const stage = body?.stage;
  if (stage !== "mana" && stage !== "slots") return json({ error: "stage must be mana or slots" }, 400);
  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  if (!generationId) return json({ error: "generationId is required" }, 400);
  const acceptedNames = sanitizeNameList(body?.acceptedNames, MAX_ROWS);
  const declinedNames = sanitizeNameList(body?.declinedNames, MAX_ROWS);
  const manualCards = sanitizeManualCards(body?.manualCards);
  const declineFeedback = sanitizeDeclineFeedback(body?.declineFeedback, { max: MAX_ROWS, maxName: MAX_ROW_NAME });
  const compass = sanitizeCompass(body?.playerCompass);
  const basics = sanitizeBasicsInput(body?.basics);
  const landTarget = Number.isInteger(body?.landTarget) && body.landTarget >= 0 && body.landTarget <= 99 ? body.landTarget : null;

  const generation = await loadGeneration(env, key, generationId);
  if (!generation.ok) return json({ error: "This guided Build session is no longer available. Start a new one." }, 404);

  try {
    const stored = generation.payload;
    const input = inputFromStored(stored);
    const learning = { declineFeedback, compass };
    const deckTarget = targetDeckSize(input.format);
    const commanderCount = input.secondCommander ? 2 : 1;
    const colors = [...new Set([...(input.commander?.colors || []), ...(input.secondCommander?.colors || [])])];
    const base = computeOffer(stored.cardPool, input, CATEGORY_SEQUENCE[0], acceptedNames, declinedNames, generationId, manualCards, learning);
    type AnalyzedEntry = { card?: { name?: string }; name?: string; roles?: string[]; cmc?: number };
    const analyzedByName = new Map<string, AnalyzedEntry>((base.analysis.cards as AnalyzedEntry[]).map((entry) => [normalizeKey(entry.card?.name || entry.name || ""), entry]));
    const pickedRows = acceptedNames.map((name) => analyzedByName.get(normalizeKey(name)) || { card: { name }, roles: [], cmc: 0 });

    if (stage === "mana") {
      const proposal = proposeManaBase({ deckTarget, colors, pickedRows, poolLands: base.analysis.lands || [], landTarget });
      return json({
        stage,
        deckTarget,
        commanderCount,
        ...proposal,
        status: finishStatus({ deckTarget, commanderCount, picks: acceptedNames, basics: Object.keys(basics).length ? basics : proposal.basics }),
      });
    }

    const status = finishStatus({ deckTarget, commanderCount, picks: acceptedNames, basics });
    const ledger = serializeLedger(base.ledger);
    const under = ledger
      .filter((row: LedgerRow) => row.status === "under" && row.target)
      .sort((a: LedgerRow, b: LedgerRow) => ((b.target?.min || 0) - b.actual) - ((a.target?.min || 0) - a.actual))
      .map((row: LedgerRow) => row.category);
    const categories = [...under, ...CATEGORY_SEQUENCE.filter((category) => !under.includes(category))];
    const size = Math.min(MAX_PACKAGE_SIZE, status.open);
    const offers: Array<Record<string, unknown>> = [];
    const taken = [...acceptedNames];
    const skip = [...declinedNames];
    for (const category of categories) {
      if (offers.length >= size) break;
      const next = computeOffer(stored.cardPool, input, category, taken, skip, generationId, manualCards, learning);
      const card = next.suggestion.offer?.card || next.suggestion.offer;
      if (!card?.name || isLandEntry(card)) continue;
      offers.push({
        category,
        name: card.name,
        typeLine: card.typeLine,
        oracleText: card.oracleText,
        manaCost: card.manaCost,
        cmc: card.cmc,
        priceUsd: card.priceUsd,
        explanation: next.explanation,
        reason: next.suggestion.reason,
      });
      taken.push(card.name);
      skip.push(card.name);
    }
    return json({ stage, deckTarget, commanderCount, status, ledger, package: offers });
  } catch (error) {
    console.error("forge-guided-finish failed", error);
    return json({ error: "The guided finish could not continue for this session." }, 500);
  }
}
