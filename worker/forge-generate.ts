// Server-side deck generation. The actual construction algorithm
// (forgeNativeMasterwork/forgeImportedMasterwork — the tournament, the
// scoring, every weight and gate) used to run entirely client-side,
// which meant it shipped in full to every visitor's browser bundle,
// readable by anyone who opened dev tools. This endpoint is the fix:
// the browser sends commission parameters, this Worker runs the real
// engine, and only the finished result crosses back over the network.
// The card pool itself is still returned in the response — it's public
// Scryfall data, not the algorithm, and the client still renders the
// initial reveal from it directly. The full generation context (pool,
// ranked candidates, selected build) is also cached server-side under a
// new opaque generationId (forge-generation-store.ts), so the Testing
// Anvil one-slot lab (forge-one-slot.ts) never needs the ~362KB pool
// round-tripped back from the browser to run a later experiment.
//
// Public-alpha hardening: authenticated (reuses the same account
// identity as every other /api/account and /api/forge endpoint — the
// site-wide bootstrap lock is not endpoint authentication), rate
// limited, and size/shape validated. See CAPTAINS_LOG.md for the
// reasoning behind the specific limits chosen.
import {
  forgeNativeMasterwork,
  forgeImportedMasterwork,
  parseNativeBlueprintIntent,
  blueprintMechanicQueryFor,
} from "../app/native-masterwork-engine.mjs";
import { userKey } from "./account-bench";
import { checkRateLimit, readJsonWithLimit } from "./api-hardening";
import { storeGeneration } from "./forge-generation-store";
import { isValidReviewFocus } from "../app/review-focus.mjs";
import { evaluateReviewFocus } from "../app/review-focus-reasoning.mjs";
import {
  targetDeckSize,
  isCommanderFormat,
  parseDeckRows,
  validateGeneratedResult,
  validateAllCandidatesComplete,
} from "./forge-result-validator.mjs";

interface Env {
  DB: D1Database;
}

type CommanderInput = { name: string; colors: string[]; oracleText: string } | null;

type GenerateRequest = {
  mode: "native" | "imported" | "direct";
  format: string;
  strategy: string;
  complexity: string;
  budget: string;
  note: string;
  path: string;
  seed: number;
  commander: CommanderInput;
  secondCommander: CommanderInput;
  evidenceCards: unknown[];
  maxCardPrice?: number;
  commonsOnly?: boolean;
  targetPowerTier?: string;
  lynchpin?: string;
  deck?: string;
  reviewFocus?: string;
};

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });

// This is the expensive endpoint: up to ~10 external Scryfall requests
// plus the full construction tournament per call. Real usage is bursty
// exploration — a handful of "forge three new Masterworks" calls per
// session, not a sustained stream. 15/5min comfortably covers heavy
// legitimate exploration (recycling results repeatedly while dialing in
// a commission) while blocking scripted hammering, which would rack up
// a real Scryfall request volume fast at this endpoint's cost.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 5 * 60 * 1000;

// The largest legitimate payload here is an imported decklist (up to
// ~100 lines with printing annotations, well under 10KB) plus an
// evidence-cards array of EDHREC-style signal objects. 256KB gives
// generous headroom while still rejecting a genuinely oversized body.
const MAX_BODY_BYTES = 256 * 1024;
const MAX_EVIDENCE_CARDS = 500;
const MAX_DECK_TEXT = 50_000;
const MAX_SHORT_STRING = 200;
const MAX_NOTE = 2000;
const MAX_ORACLE_TEXT = 4000;
const ALLOWED_MODES = new Set(["native", "imported", "direct"]);
const ALLOWED_FORMATS = new Set([
  "Standard",
  "Brawl",
  "Standard Brawl",
  "Commander",
  "Modern",
  "Premodern",
  "Pioneer",
  "Historic",
]);

// Scryfall's own API guidelines ask for a descriptive User-Agent and have
// been known to reject server-to-server requests that arrive without
// one — a real failure caught live while verifying this endpoint (every
// pool-loading request came back non-ok in well under 100ms, far too
// fast for a genuine multi-page search, and the browser's own direct
// fetches never needed this because browsers always send a User-Agent
// automatically). Matches the header shape worker/edhrec-evidence.ts
// already uses for its own external fetch.
const SCRYFALL_HEADERS = { Accept: "application/json", "User-Agent": "MetaForge/0.1 (+https://metaforge-private-alpha.metaforge-labs.workers.dev)" };

const CATALOG_UNAVAILABLE_MESSAGE = "The verified card catalog is unavailable";

// A plain mutable counter, not a class, so call sites that don't care
// about it can omit it entirely. Threaded through loadNativeForgePool/
// resolveImportedDecklist/fetchScryfallWithRetry so generateForgeResult
// can report scryfall_request_count without every fetch call needing to
// return its own count up the stack.
type ScryfallCounter = { count: number };

// A single flaky Scryfall request (a rate-limit response under real load,
// or a transient 5xx) used to end the whole commission immediately — the
// pool-loading loop below threw CATALOG_UNAVAILABLE_MESSAGE on the very
// first non-ok page, even though the very next attempt, moments later,
// would often have succeeded. Bounded (never more than 2 retries, capped
// backoff) so a request that's genuinely down still fails promptly rather
// than hanging the commission — Workers have a real execution time
// budget. A non-transient failure (a malformed query, 404) is returned
// immediately on the first try; retrying it would just waste the budget
// reproducing the same result.
async function fetchScryfallWithRetry(url: string, init: RequestInit = {}, attempts = 3, counter?: ScryfallCounter): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (counter) counter.count += 1;
    const response = await fetch(url, { ...init, headers: { ...SCRYFALL_HEADERS, ...init.headers } });
    if (response.ok) return response;
    lastResponse = response;
    const transient = response.status === 429 || (response.status >= 500 && response.status < 600);
    if (!transient || attempt === attempts - 1) return response;
    const retryAfterSeconds = Number(response.headers.get("Retry-After"));
    const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, 2000)
      : 250 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return lastResponse as Response;
}

// --- Duplicated from the client's own small, non-secret utility
// functions (app/page.tsx) rather than imported from there, since
// page.tsx is a "use client" file and importing from it would pull
// this whole module back into the client bundle — exactly the problem
// this endpoint exists to avoid. These are plain string/regex plumbing,
// not the deck-construction algorithm; duplication here is deliberate
// and low-risk, not an oversight.

const NOTE_COLOR_NAMES: Record<string, string[]> = {
  white: ["W"], blue: ["U"], black: ["B"], red: ["R"], green: ["G"],
  azorius: ["W", "U"], dimir: ["U", "B"], rakdos: ["B", "R"], gruul: ["R", "G"], selesnya: ["G", "W"],
  orzhov: ["W", "B"], izzet: ["U", "R"], golgari: ["B", "G"], boros: ["R", "W"], simic: ["G", "U"],
  bant: ["W", "U", "G"], esper: ["W", "U", "B"], grixis: ["U", "B", "R"], jund: ["B", "R", "G"], naya: ["R", "G", "W"],
  abzan: ["W", "B", "G"], jeskai: ["U", "R", "W"], sultai: ["B", "G", "U"], mardu: ["R", "W", "B"], temur: ["G", "U", "R"],
};
const colorsFromNote = (note = ""): string[] => {
  for (const word of note.toLowerCase().match(/[a-z]+/g) || []) {
    const colors = NOTE_COLOR_NAMES[word];
    if (colors) return colors;
  }
  return [];
};

const scryfallFormatTerms = (format: string) =>
  format === "Standard Brawl"
    ? "legal:brawl legal:standard game:arena"
    : format === "Brawl"
      ? "legal:brawl game:arena"
      : `legal:${format.toLowerCase()}`;

const scryfallLegality = (format: string) =>
  format === "Commander"
    ? "commander"
    : format === "Brawl" || format === "Standard Brawl"
      ? "brawl"
      : format.toLowerCase();

const cardFactKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const scryfallLookupName = (name: string) => String(name || "").split(/\s*\/\/\s*/)[0].trim();

const BASIC_LANDS: Record<string, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
const BASIC_LAND_KEYS = new Set([
  ...Object.values(BASIC_LANDS), "Wastes",
  "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest",
].map(cardFactKey));

type NativeForgeCard = {
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  oracleText: string;
  colorIdentity: string[];
  keywords: string[];
  popularityRank?: number;
  priceUsd?: number;
  producedMana?: string[];
  rarity?: string;
};

const nativeCardFact = (card: any): NativeForgeCard => {
  const priceUsd = Number(card.prices?.usd ?? card.prices?.usd_foil ?? NaN);
  return {
    name: String(card.name || ""),
    manaCost: String(card.mana_cost || card.card_faces?.[0]?.mana_cost || ""),
    cmc: Number(card.cmc || 0),
    typeLine: String(card.type_line || ""),
    oracleText: String(card.oracle_text || (card.card_faces || []).map((face: any) => face.oracle_text || "").join("\n")),
    colorIdentity: card.color_identity || [],
    keywords: card.keywords || [],
    ...(Number.isFinite(priceUsd) ? { priceUsd } : {}),
    ...(Array.isArray(card.produced_mana) ? { producedMana: card.produced_mana } : {}),
    ...(typeof card.rarity === "string" ? { rarity: card.rarity } : {}),
  };
};

type DeckRow = { quantity: number; name: string };

async function loadNativeForgePool(
  format: string,
  commander: CommanderInput,
  lynchpin: string,
  note: string,
  secondCommander: CommanderInput,
  counter?: ScryfallCounter,
) {
  let anchor: any = null;
  if (!commander && lynchpin) {
    const anchorResponse = await fetchScryfallWithRetry(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(lynchpin)}`, {}, 3, counter);
    if (anchorResponse.ok) anchor = await anchorResponse.json();
  }
  const noteColors = colorsFromNote(note);
  const commanderColors = [...new Set([...(commander?.colors || []), ...(secondCommander?.colors || [])])];
  const colors = commanderColors.length ? commanderColors : noteColors.length ? noteColors : anchor?.color_identity?.length ? anchor.color_identity : [];
  const colorQuery = colors.length ? ` id<=${colors.join("").toLowerCase()}` : commander ? " id:c" : "";
  const query = encodeURIComponent(`${scryfallFormatTerms(format)}${colorQuery} -is:funny`);
  const cards: NativeForgeCard[] = [];
  const seen = new Set<string>();
  const addRawCard = (rawCard: any, popularityRank?: number) => {
    const card = nativeCardFact(rawCard);
    const key = cardFactKey(card.name);
    if (!card.name || seen.has(key)) return;
    seen.add(key);
    if (popularityRank !== undefined) card.popularityRank = popularityRank;
    cards.push(card);
  };
  let nextUrl = `https://api.scryfall.com/cards/search?q=${query}&order=edhrec&unique=cards`;

  // Scryfall's edhrec ordering is a real, already-fetched signal for "how
  // good/played is this card" — free popularity evidence the engine used to
  // discard entirely for every non-Commander format. Rank position (not the
  // raw page) is threaded through so the engine can weigh it later.
  // Popularity pages are intentionally broad, but explicit player identity
  // is fetched directly below so niche/lore themes cannot disappear before
  // scoring.
  // Capped at 6 pages (up from 4): a real, if uncommon, cause of thin
  // eligible pools was simply not asking Scryfall for enough of them in
  // the first place — 4 pages tops out at ~700 raw cards before any
  // preference filtering, which is comfortable for a typical build but
  // leaves little margin once a narrow color identity meets a strict
  // budget/commons-only preference. 6 pages (~1050 cards) gives the
  // recovery ladder (relaxAnalysisPreferences, native-masterwork-engine
  // .mjs) more room to actually succeed instead of hitting the same wall.
  let popularityRank = 0;
  for (let page = 0; nextUrl && page < 6; page += 1) {
    const response = await fetchScryfallWithRetry(nextUrl, {}, 3, counter);
    if (!response.ok) throw new Error(CATALOG_UNAVAILABLE_MESSAGE);
    const result: any = await response.json();
    for (const rawCard of result.data || []) {
      addRawCard(rawCard, popularityRank);
      popularityRank += 1;
    }
    nextUrl = result.has_more ? String(result.next_page || "") : "";
  }

  const blueprint = parseNativeBlueprintIntent({ note });
  const roleQueries: Record<string, string> = {
    counters: 'o:"+1/+1 counter"', tokens: "o:create o:token", sacrifice: "o:sacrifice", graveyard: "o:graveyard",
    artifacts: "(t:artifact OR o:artifact)", spells: '(o:"instant or sorcery" OR o:"noncreature spell")',
    lifegain: '(o:"gain life" OR kw:lifelink)', combat: "(o:combat OR o:attack)", discard: "o:discard",
  };
  const identityQueries = [
    ...blueprint.tribalTypes.map((term: string) => `(t:"${term}" OR o:"${term}" OR name:"${term}")`),
    ...blueprint.requestedMechanics.map((mechanic: string) => mechanic === "creature_activated_ability"
      ? "t:creature o:\":\""
      : blueprintMechanicQueryFor(mechanic)),
    ...blueprint.desiredRoles.map((role: string) => roleQueries[role]).filter(Boolean),
  ].slice(0, 6);
  for (const identityQuery of identityQueries) {
    const targetedUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`${scryfallFormatTerms(format)}${colorQuery} ${identityQuery} -is:funny`)}&order=name&unique=cards`;
    const response = await fetchScryfallWithRetry(targetedUrl, {}, 3, counter);
    if (!response.ok) continue;
    const result: any = await response.json();
    for (const rawCard of result.data || []) addRawCard(rawCard);
  }

  const anchorFitsColors = !anchor || !colors.length || (anchor.color_identity || []).every((color: string) => colors.includes(color));
  if (anchor && anchorFitsColors) {
    const fact = nativeCardFact(anchor);
    if (!seen.has(cardFactKey(fact.name))) cards.unshift(fact);
  }
  return { cards, colors };
}

async function resolveImportedDecklist(text: string, poolCards: NativeForgeCard[], format: string, commander: CommanderInput, counter?: ScryfallCounter) {
  const parsed = parseDeckRows(text).filter((row: DeckRow) => Number.isFinite(row.quantity) && row.quantity > 0 && row.name);
  const commanderKeys = commander ? new Set([commander.name, commander.name.split(" // ")[0]].map(cardFactKey)) : new Set<string>();
  const merged = new Map<string, DeckRow>();
  for (const row of parsed) {
    const key = cardFactKey(row.name);
    if (commanderKeys.has(key)) continue;
    const existing = merged.get(key);
    if (existing) existing.quantity += row.quantity;
    else merged.set(key, { name: row.name, quantity: row.quantity });
  }
  const rows = [...merged.values()];

  const poolByKey = new Map(poolCards.map((card) => [cardFactKey(card.name), card]));
  const needsLookup = rows.filter((row) => {
    const key = cardFactKey(row.name);
    return !BASIC_LAND_KEYS.has(key) && !poolByKey.has(key);
  });

  const rawByKey = new Map<string, any>();
  for (let index = 0; index < needsLookup.length; index += 75) {
    const chunk = needsLookup.slice(index, index + 75);
    try {
      const response = await fetchScryfallWithRetry("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((row) => ({ name: scryfallLookupName(row.name) })) }),
      }, 3, counter);
      const data: any = await response.json();
      for (const rawCard of data.data || []) {
        const aliases = [
          rawCard.name,
          scryfallLookupName(rawCard.name),
          ...(rawCard.card_faces || []).map((face: any) => face.name),
        ].filter(Boolean);
        for (const alias of aliases) rawByKey.set(cardFactKey(alias), rawCard);
      }
    } catch {
      /* Unresolved names are reported below via the unresolvedNames list. */
    }
  }

  const legalityKey = scryfallLegality(format);
  const arenaRequired = format === "Brawl" || format === "Standard Brawl";
  const importedRows: DeckRow[] = [];
  const additionalPoolCards: NativeForgeCard[] = [];
  const unresolvedNames: string[] = [];
  const illegalNames: string[] = [];
  for (const row of rows) {
    const key = cardFactKey(row.name);
    if (BASIC_LAND_KEYS.has(key)) { importedRows.push(row); continue; }
    if (poolByKey.has(key)) { importedRows.push({ name: poolByKey.get(key)!.name, quantity: row.quantity }); continue; }
    const raw = rawByKey.get(key);
    if (!raw) { unresolvedNames.push(row.name); continue; }
    const legality = raw.legalities?.[legalityKey];
    if (legality !== "legal" || (arenaRequired && !raw.games?.includes("arena"))) { illegalNames.push(row.name); continue; }
    importedRows.push({ name: raw.name, quantity: row.quantity });
    additionalPoolCards.push(nativeCardFact(raw));
  }

  return { importedRows, pool: [...poolCards, ...additionalPoolCards], unresolvedNames, illegalNames };
}

function sanitizeCommander(raw: unknown): CommanderInput {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const name = String(source.name || "").slice(0, MAX_SHORT_STRING);
  if (!name) return null;
  const colors = Array.isArray(source.colors)
    ? source.colors.filter((c): c is string => typeof c === "string").slice(0, 5).map((c) => c.slice(0, 2))
    : [];
  const oracleText = String(source.oracleText || "").slice(0, MAX_ORACLE_TEXT);
  return { name, colors, oracleText };
}

function validateRequest(body: any): { ok: true; value: GenerateRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "A request body is required" };
  if (!ALLOWED_MODES.has(body.mode)) return { ok: false, error: "mode must be one of native, imported, direct" };
  if (typeof body.format !== "string" || !ALLOWED_FORMATS.has(body.format)) return { ok: false, error: "format is not a supported format" };
  if (typeof body.strategy !== "string" || !body.strategy.trim() || body.strategy.length > MAX_SHORT_STRING) {
    return { ok: false, error: "strategy is required" };
  }
  if (body.mode === "imported" && (typeof body.deck !== "string" || !body.deck.trim())) {
    return { ok: false, error: "A decklist is required for the imported mode" };
  }
  if (typeof body.deck === "string" && body.deck.length > MAX_DECK_TEXT) {
    return { ok: false, error: "deck text is too long" };
  }
  if (body.evidenceCards !== undefined && !Array.isArray(body.evidenceCards)) {
    return { ok: false, error: "evidenceCards must be an array" };
  }
  if (Array.isArray(body.evidenceCards) && body.evidenceCards.length > MAX_EVIDENCE_CARDS) {
    return { ok: false, error: `evidenceCards must not exceed ${MAX_EVIDENCE_CARDS} entries` };
  }
  if (body.maxCardPrice !== undefined && body.maxCardPrice !== null) {
    if (typeof body.maxCardPrice !== "number" || !Number.isFinite(body.maxCardPrice) || body.maxCardPrice < 0 || body.maxCardPrice > 100_000) {
      return { ok: false, error: "maxCardPrice is out of range" };
    }
  }
  if (body.seed !== undefined && (typeof body.seed !== "number" || !Number.isFinite(body.seed))) {
    return { ok: false, error: "seed must be a number" };
  }
  // reviewFocus is a player-stated coaching intent for this review session
  // (app/review-focus.mjs is the single source of truth for the six
  // canonical values), never a deck characteristic — validated the same
  // way mode/format are, against a fixed allowed set, rather than passed
  // through as free text the way note/commissionNote are.
  if (body.reviewFocus !== undefined && body.reviewFocus !== "" && !isValidReviewFocus(body.reviewFocus)) {
    return { ok: false, error: "reviewFocus must be one of the supported coaching focus values" };
  }

  const value: GenerateRequest = {
    mode: body.mode,
    format: body.format,
    strategy: body.strategy,
    complexity: typeof body.complexity === "string" ? body.complexity.slice(0, MAX_SHORT_STRING) : "",
    budget: typeof body.budget === "string" ? body.budget.slice(0, MAX_SHORT_STRING) : "",
    note: typeof body.note === "string" ? body.note.slice(0, MAX_NOTE) : "",
    path: typeof body.path === "string" ? body.path.slice(0, MAX_SHORT_STRING) : "",
    seed: typeof body.seed === "number" ? body.seed : Date.now(),
    commander: sanitizeCommander(body.commander),
    secondCommander: sanitizeCommander(body.secondCommander),
    evidenceCards: Array.isArray(body.evidenceCards) ? body.evidenceCards.slice(0, MAX_EVIDENCE_CARDS) : [],
    maxCardPrice: typeof body.maxCardPrice === "number" ? body.maxCardPrice : undefined,
    commonsOnly: body.commonsOnly === true,
    targetPowerTier: typeof body.targetPowerTier === "string" ? body.targetPowerTier.slice(0, MAX_SHORT_STRING) : undefined,
    lynchpin: typeof body.lynchpin === "string" ? body.lynchpin.slice(0, MAX_SHORT_STRING) : undefined,
    deck: typeof body.deck === "string" ? body.deck : undefined,
    reviewFocus: typeof body.reviewFocus === "string" && body.reviewFocus ? body.reviewFocus : undefined,
  };
  return { ok: true, value };
}

// Bug 2's validateGeneratedResult/validateAllCandidatesComplete now live in
// ./forge-result-validator.mjs (imported above) — pure logic split out so
// tests can import it directly without pulling in this file's D1/account
// dependencies. That file has no TypeScript declarations of its own, so
// its inferred return type loses the { ok: true } | { ok: false, ... }
// discriminated union — annotated explicitly at each call site below so
// `if (!resultCheck.ok)` still narrows to the failure branch's fields.
type GeneratedResultValidation = { ok: true } | { ok: false; code: string; message: string };

// Structured, log-only observability for construction recovery — never
// returned to the player, never includes anything about who they are.
// format/commander/target/strategy are all public game data (the same
// things visible in the request itself); commander name is included only
// where the request already carries one. This is the whole answer to
// "why did this deck fail (or need to relax a preference) for this
// commander/format" without needing to reproduce it by hand afterward.
function logConstructionOutcome(event: {
  outcome: "success" | "incomplete";
  format: string;
  commanderName?: string | null;
  target: number;
  recoveryStage?: string;
  finalSize?: number;
  failureCategory?: string;
  failureMessage?: string;
  recoveryDiagnostics?: unknown;
}) {
  const logFn = event.outcome === "success" && event.recoveryStage === "ideal" ? undefined : console.log;
  // The common case (ideal, no recovery needed) is deliberately not
  // logged at all — logging every successful generation would drown the
  // signal this exists to surface. Only recoveries and failures log.
  if (!logFn) return;
  logFn(JSON.stringify({
    event: "forge-construction-outcome",
    outcome: event.outcome,
    format: event.format,
    commander: event.commanderName || null,
    target: event.target,
    recoveryStage: event.recoveryStage || null,
    finalSize: event.finalSize ?? null,
    failureCategory: event.failureCategory || null,
    failureMessage: event.failureMessage || null,
    recoveryDiagnostics: event.recoveryDiagnostics || null,
  }));
}

// Phase timing for observability only — never sent to the browser, only
// logged (worker/guest-forge.ts folds these into its own structured event).
// candidateCount/targetSize/finalSize are null wherever generation never
// reached that point (e.g. a rate-limit or validation-body rejection).
export type ForgeGenerationTiming = {
  catalogMs: number;
  generationMs: number;
  validationMs: number;
  persistenceMs: number;
  scryfallRequestCount: number;
  candidateCount: number | null;
  targetSize: number | null;
  finalSize: number | null;
};

// Structured result of a generation attempt: an HTTP status/body pair
// that the caller serializes itself, plus timing metadata that never goes
// over the wire. Replaces the old design where this function returned a
// Response and its only caller inside this same Worker (guest-forge.ts)
// immediately parsed that Response back into an object — a full parse and
// re-serialize of the single largest object in the request, for no reason
// beyond "that's what the function signature returned."
export type ForgeGenerationResult = {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
  timing: ForgeGenerationTiming;
};

const emptyTiming = (scryfallRequestCount = 0): ForgeGenerationTiming => ({
  catalogMs: 0, generationMs: 0, validationMs: 0, persistenceMs: 0,
  scryfallRequestCount, candidateCount: null, targetSize: null, finalSize: null,
});

export async function handleForgeGenerate(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);

  const result = await generateForgeResult(request, env, key);
  return json(result.body, result.status, result.headers);
}

// Guest forging has its own Turnstile, one-use-session, and rate-limit
// boundary (worker/guest-forge.ts). Once that boundary authorizes a
// request it calls generateForgeResult below directly — using the same
// construction path as this function, so guest previews and account
// builds never drift into two different engines — without ever going
// through this Response wrapper. This function exists only so the
// authenticated /api/forge/generate endpoint keeps exactly the same
// external contract it always had: one JSON serialization, at this one
// HTTP boundary.
export async function handleForgeGenerateForKey(request: Request, env: Env, key: string): Promise<Response> {
  const result = await generateForgeResult(request, env, key);
  return json(result.body, result.status, result.headers);
}

export async function generateForgeResult(request: Request, env: Env, key: string): Promise<ForgeGenerationResult> {
  if (request.method !== "POST") {
    return { status: 405, headers: { Allow: "POST" }, body: { error: "Method not allowed" }, timing: emptyTiming() };
  }

  let limitResult;
  try {
    limitResult = await checkRateLimit(env, key, "forge-generate", RATE_LIMIT, RATE_WINDOW_MS);
  } catch (error) {
    console.error("forge-generate rate limit check failed", error);
    return { status: 500, body: { error: "The native Forge could not complete this candidate. Try again or adjust the commission.", code: "GENERATION_FAILED" }, timing: emptyTiming() };
  }
  if (!limitResult.allowed) {
    return {
      status: 429,
      headers: { "Retry-After": String(limitResult.retryAfterSeconds) },
      body: { error: "Rate limit exceeded", retryAfterSeconds: limitResult.retryAfterSeconds },
      timing: emptyTiming(),
    };
  }

  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return { status: bodyResult.status, body: { error: bodyResult.error }, timing: emptyTiming() };

  const validated = validateRequest(bodyResult.data);
  if (!validated.ok) return { status: 400, body: { error: validated.error }, timing: emptyTiming() };
  const body = validated.value;
  const target = targetDeckSize(body.format);
  const counter: ScryfallCounter = { count: 0 };

  try {
    const catalogStart = Date.now();
    const pool = await loadNativeForgePool(body.format, body.commander, body.lynchpin || "", body.note || "", body.secondCommander, counter);

    if (body.mode === "imported") {
      const resolution = await resolveImportedDecklist(body.deck!, pool.cards, body.format, body.commander, counter);
      const catalogMs = Date.now() - catalogStart;

      const generationStart = Date.now();
      const nativeReport = forgeImportedMasterwork({
        format: body.format,
        target,
        strategy: body.strategy,
        path: "",
        note: body.note || "",
        seed: body.seed,
        colors: pool.colors,
        commander: body.commander,
        secondCommander: body.secondCommander,
        cards: resolution.pool,
        importedRows: resolution.importedRows,
        evidence: body.evidenceCards || [],
        budget: body.budget,
        complexity: body.complexity,
      });
      const generationMs = Date.now() - generationStart;

      const validationStart = Date.now();
      const resultCheck = validateGeneratedResult(nativeReport, body.format) as GeneratedResultValidation;
      const validationMs = Date.now() - validationStart;
      const candidateCount = nativeReport.candidates?.length ?? null;
      if (!resultCheck.ok) {
        logConstructionOutcome({
          outcome: "incomplete", format: body.format, commanderName: body.commander?.name, target,
          failureCategory: resultCheck.code, failureMessage: resultCheck.message,
        });
        return {
          status: 422,
          body: { error: resultCheck.message, code: resultCheck.code },
          timing: { catalogMs, generationMs, validationMs, persistenceMs: 0, scryfallRequestCount: counter.count, candidateCount, targetSize: target, finalSize: null },
        };
      }
      logConstructionOutcome({
        outcome: "success", format: body.format, commanderName: body.commander?.name, target,
        recoveryStage: (nativeReport.selected as any)?.recoveryStage,
        finalSize: (nativeReport.selected as any)?.rows.reduce((sum: number, row: any) => sum + row.quantity, 0),
        recoveryDiagnostics: (nativeReport.selected as any)?.recoveryDiagnostics,
      });
      const persistenceStart = Date.now();
      const generationId = await storeGeneration(env, key, {
        selected: nativeReport.selected,
        candidates: nativeReport.candidates,
        cardPool: resolution.pool,
        options: { format: body.format, strategy: body.strategy, target },
        forgeInput: {
          format: body.format, target, strategy: body.strategy, path: "", note: body.note || "",
          seed: body.seed, colors: pool.colors, commander: body.commander,
          secondCommander: body.secondCommander, evidence: body.evidenceCards || [],
          budget: body.budget, complexity: body.complexity, maxCardPrice: body.maxCardPrice,
          commonsOnly: body.commonsOnly, targetPowerTier: isCommanderFormat(body.format) ? body.targetPowerTier || undefined : undefined,
        },
      });
      const persistenceMs = Date.now() - persistenceStart;
      const finalSize = (nativeReport.selected as any)?.rows.reduce((sum: number, row: any) => sum + row.quantity, 0) ?? null;
      return {
        status: 200,
        body: {
          nativeReport,
          cardPool: resolution.pool,
          colors: pool.colors,
          generationId,
          importWarnings: { unresolvedNames: resolution.unresolvedNames, illegalNames: resolution.illegalNames },
          // Only the imported/refine path carries a reviewFocus selection
          // today (the entrance chip only renders in that chamber — see
          // app/review-focus.mjs and app/page.tsx). evaluateReviewFocus
          // reads real fields already present on nativeReport above; it
          // never re-runs or duplicates the construction algorithm.
          reviewFocusResult: evaluateReviewFocus(body.reviewFocus, nativeReport),
        },
        timing: { catalogMs, generationMs, validationMs, persistenceMs, scryfallRequestCount: counter.count, candidateCount, targetSize: target, finalSize },
      };
    }

    const catalogMs = Date.now() - catalogStart;

    // "native" (three-masterwork reveal) and "direct" (locked commander,
    // no reveal) both run the same generation — they only differ in
    // lynchpin/path, already folded into the request above.
    const generationStart = Date.now();
    const nativeReport = forgeNativeMasterwork({
      format: body.format,
      target,
      strategy: body.strategy,
      path: body.path || "",
      note: body.note || "",
      seed: body.seed,
      colors: pool.colors,
      commander: body.commander,
      secondCommander: body.secondCommander,
      cards: pool.cards,
      evidence: body.evidenceCards || [],
      budget: body.budget,
      complexity: body.complexity,
      maxCardPrice: body.maxCardPrice,
      commonsOnly: body.commonsOnly,
      targetPowerTier: isCommanderFormat(body.format) ? body.targetPowerTier || undefined : undefined,
    });
    const generationMs = Date.now() - generationStart;

    const validationStart = Date.now();
    const resultCheck = validateGeneratedResult(nativeReport, body.format) as GeneratedResultValidation;
    const candidateCount = nativeReport.candidates?.length ?? null;
    if (!resultCheck.ok) {
      const validationMs = Date.now() - validationStart;
      logConstructionOutcome({
        outcome: "incomplete", format: body.format, commanderName: body.commander?.name, target,
        failureCategory: resultCheck.code, failureMessage: resultCheck.message,
      });
      return {
        status: 422,
        body: { error: resultCheck.message, code: resultCheck.code },
        timing: { catalogMs, generationMs, validationMs, persistenceMs: 0, scryfallRequestCount: counter.count, candidateCount, targetSize: target, finalSize: null },
      };
    }
    const candidatesCheck = validateAllCandidatesComplete(nativeReport, body.format) as GeneratedResultValidation;
    const validationMs = Date.now() - validationStart;
    if (!candidatesCheck.ok) {
      logConstructionOutcome({
        outcome: "incomplete", format: body.format, commanderName: body.commander?.name, target,
        failureCategory: candidatesCheck.code, failureMessage: candidatesCheck.message,
      });
      return {
        status: 422,
        body: { error: candidatesCheck.message, code: candidatesCheck.code },
        timing: { catalogMs, generationMs, validationMs, persistenceMs: 0, scryfallRequestCount: counter.count, candidateCount, targetSize: target, finalSize: null },
      };
    }
    logConstructionOutcome({
      outcome: "success", format: body.format, commanderName: body.commander?.name, target,
      recoveryStage: (nativeReport.selected as any)?.recoveryStage,
      finalSize: (nativeReport.selected as any)?.rows.reduce((sum: number, row: any) => sum + row.quantity, 0),
      recoveryDiagnostics: (nativeReport.selected as any)?.recoveryDiagnostics,
    });
    const persistenceStart = Date.now();
    const generationId = await storeGeneration(env, key, {
      selected: nativeReport.selected,
      candidates: nativeReport.candidates,
      cardPool: pool.cards,
      options: { format: body.format, strategy: body.strategy, target },
      forgeInput: {
        format: body.format, target, strategy: body.strategy, path: body.path || "", note: body.note || "",
        seed: body.seed, colors: pool.colors, commander: body.commander,
        secondCommander: body.secondCommander, evidence: body.evidenceCards || [],
        budget: body.budget, complexity: body.complexity, maxCardPrice: body.maxCardPrice,
        commonsOnly: body.commonsOnly, targetPowerTier: isCommanderFormat(body.format) ? body.targetPowerTier || undefined : undefined,
      },
    });
    const persistenceMs = Date.now() - persistenceStart;
    const finalSize = (nativeReport.selected as any)?.rows.reduce((sum: number, row: any) => sum + row.quantity, 0) ?? null;
    return {
      status: 200,
      body: { nativeReport, cardPool: pool.cards, colors: pool.colors, generationId },
      timing: { catalogMs, generationMs, validationMs, persistenceMs, scryfallRequestCount: counter.count, candidateCount, targetSize: target, finalSize },
    };
  } catch (error) {
    const timing = emptyTiming(counter.count);
    // Never echo a raw exception message — it can contain internal
    // implementation detail. The one exception: the catalog-unavailable
    // message is written by this file itself specifically for players
    // to see when Scryfall is unreachable, a real and expected failure
    // mode worth surfacing plainly rather than masking.
    if (error instanceof Error && error.message === CATALOG_UNAVAILABLE_MESSAGE) {
      logConstructionOutcome({ outcome: "incomplete", format: body.format, commanderName: body.commander?.name, target, failureCategory: "CATALOG_UNAVAILABLE" });
      return { status: 503, body: { error: CATALOG_UNAVAILABLE_MESSAGE, code: "CATALOG_UNAVAILABLE" }, timing };
    }
    // Everything past the recovery ladder (relaxAnalysisPreferences)
    // throwing again, or every candidate failing its own hard gate —
    // real structural exhaustion, not an unexpected bug. Distinguished
    // from a genuine unhandled exception so the two failure classes
    // don't drown each other out in logs.
    const structuralExhaustion = error instanceof Error && /could not fill \d+ spell slot|failed a hard gate|could not adapt your list/.test(error.message);
    logConstructionOutcome({
      outcome: "incomplete",
      format: body.format,
      commanderName: body.commander?.name,
      target,
      failureCategory: structuralExhaustion ? "CONSTRUCTION_EXHAUSTED" : "UNEXPECTED_EXCEPTION",
      failureMessage: error instanceof Error ? error.message : String(error),
    });
    if (!structuralExhaustion) console.error("forge-generate failed", error);
    return { status: 500, body: { error: "The native Forge could not complete this candidate. Try again or adjust the commission.", code: "GENERATION_FAILED" }, timing };
  }
}
