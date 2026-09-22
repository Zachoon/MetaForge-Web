// Server-side backend for the guided Build category loop
// (architecture/GUIDED_CONSTRUCTION_FLOW.md's flow step 3 — "the Forge
// offers one card with a stated reason"). Follows forge-one-slot.ts's exact
// pattern for the same underlying reason: a card pool is fetched and
// classified once (a real Scryfall cost), then every later request in the
// same session reloads that cached context via generationId (forge-
// generation-store.ts) and only re-runs cheap, pure scoring — never a
// second round of Scryfall requests.
//
// Authenticated only (userKey requires a verified Access identity) — a
// guest session has no generationId to store this context under, so guests
// keep using the existing one-shot Build path (now shell-biased via
// focusPackageId) instead of the guided loop until a guest-compatible
// store exists. Not a stub: the guided loop simply isn't offered to guests
// yet, and the client is expected to gate on this rather than call these
// endpoints for a guest session.
import { analyzeForgePool } from "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";
import { CATEGORY_SEQUENCE, buildCategoryBudgetLedger } from "../app/category-budget-ledger.mjs";
import { flattenAnalyzedEntries } from "../app/guided-build-rows.mjs";
import { POWER_TIERS, powerSignalCategoryFor } from "../app/commander-power-signal.mjs";
import { STRATEGIC_PACKAGE_IDS } from "../app/strategic-intent.mjs";
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
import { isCommanderFormat } from "./forge-result-validator.mjs";
import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { storeGeneration, loadGeneration } from "./forge-generation-store";

interface Env {
  DB: D1Database;
}

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
  const analyzedByName = new Map(analysis.cards.map((entry: any) => [normalizeKey(entry.card?.name || entry.name || ""), entry]));
  const partialRows = acceptedNames
    .map((name) => analyzedByName.get(normalizeKey(name)))
    .filter((entry): entry is any => Boolean(entry));
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
    },
  } as any);
  const ledger = buildCategoryBudgetLedger(
    { rows: flattenAnalyzedEntries(partialRows) },
    analysis.strategicIntent,
    { targetPowerTier: input.targetPowerTier },
  );
  return { suggestion, ledger, analysis };
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

function serializeOffer(
  suggestion: ReturnType<typeof suggestCardForCategory>,
  ledger: ReturnType<typeof buildCategoryBudgetLedger>,
) {
  const card = suggestion.offer?.card || suggestion.offer;
  return {
    ledger: serializeLedger(ledger),
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

  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);

  const limitResult = await checkRateLimit(env, key, "forge-guided-start", START_RATE_LIMIT, START_RATE_WINDOW_MS);
  if (!limitResult.allowed) {
    return json({ error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds }, 429, {
      "Retry-After": String(limitResult.retryAfterSeconds),
    });
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status);
  const body = bodyResult.data as any;

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
  void MAX_ORACLE_TEXT; // sanitizeCommander already enforces this internally.

  try {
    const counter: ScryfallCounter = { count: 0 };
    const pool = await loadNativeForgePool(body.format, commander, "", note, secondCommander, counter);
    const input = { format: body.format, commander, secondCommander, note, focusPackageId, targetPowerTier, strategy, complexity, budget, maxCardPrice, commonsOnly };
    const { suggestion, ledger, analysis } = computeOffer(pool.cards, input, CATEGORY_SEQUENCE[0], [], []);

    const generationId = await storeGeneration(env, key, {
      selected: null,
      candidates: [],
      cardPool: pool.cards,
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

    return json({ generationId, colors: pool.colors, categorySequence: CATEGORY_SEQUENCE, ...serializeOffer(suggestion, ledger) });
  } catch (error) {
    console.error("forge-guided-start failed", error);
    return json({ error: "The guided Build could not be started." }, 500);
  }
}

export async function handleForgeGuidedNext(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);

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

  const generation = await loadGeneration(env, key, generationId);
  if (!generation.ok) {
    return json({ error: "This guided Build session is no longer available. Start a new one." }, 404);
  }

  try {
    const stored = generation.payload;
    const forgeInput = (stored.forgeInput || {}) as {
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
    const input = {
      format: stored.options.format,
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
    // generation.ok above already proved this caller owns generationId.
    const { suggestion, ledger } = computeOffer(stored.cardPool, input, body.category, acceptedNames, declinedNames, generationId, manualCards);
    return json(serializeOffer(suggestion, ledger));
  } catch (error) {
    console.error("forge-guided-next failed", error);
    return json({ error: "The guided Build could not continue for this session." }, 500);
  }
}
