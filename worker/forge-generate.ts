// Server-side deck generation. The actual construction algorithm
// (forgeNativeMasterwork/forgeImportedMasterwork — the tournament, the
// scoring, every weight and gate) used to run entirely client-side,
// which meant it shipped in full to every visitor's browser bundle,
// readable by anyone who opened dev tools. This endpoint is the fix:
// the browser sends commission parameters, this Worker runs the real
// engine, and only the finished result crosses back over the network.
// The card pool itself is still returned in the response — it's public
// Scryfall data, not the algorithm, and the client-side refinement
// features (Testing Anvil one-slot swaps) still need it locally for now.
import {
  forgeNativeMasterwork,
  forgeImportedMasterwork,
  parseNativeBlueprintIntent,
} from "../app/native-masterwork-engine.mjs";

type Env = Record<string, unknown>;

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
};

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

// Scryfall's own API guidelines ask for a descriptive User-Agent and have
// been known to reject server-to-server requests that arrive without
// one — a real failure caught live while verifying this endpoint (every
// pool-loading request came back non-ok in well under 100ms, far too
// fast for a genuine multi-page search, and the browser's own direct
// fetches never needed this because browsers always send a User-Agent
// automatically). Matches the header shape worker/edhrec-evidence.ts
// already uses for its own external fetch.
const SCRYFALL_HEADERS = { Accept: "application/json", "User-Agent": "MetaForge/0.1 (+https://metaforge-private-alpha.metaforge-labs.workers.dev)" };

const targetDeckSize = (format: string) =>
  format === "Commander" || format === "Brawl" ? 100 : 60;

const isCommanderFormat = (format: string) =>
  ["Commander", "Brawl", "Standard Brawl"].includes(format);

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

const BASIC_LANDS: Record<string, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
const BASIC_LAND_KEYS = new Set([...Object.values(BASIC_LANDS), "Wastes"].map(cardFactKey));

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
const parseDeckRows = (text: string): DeckRow[] =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });

async function loadNativeForgePool(
  format: string,
  commander: CommanderInput,
  lynchpin: string,
  note: string,
  secondCommander: CommanderInput,
) {
  let anchor: any = null;
  if (!commander && lynchpin) {
    const anchorResponse = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(lynchpin)}`, { headers: SCRYFALL_HEADERS });
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
  let popularityRank = 0;
  for (let page = 0; nextUrl && page < 4; page += 1) {
    const response = await fetch(nextUrl, { headers: SCRYFALL_HEADERS });
    if (!response.ok) throw new Error("The verified card catalog is unavailable");
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
    ...blueprint.desiredRoles.map((role: string) => roleQueries[role]).filter(Boolean),
  ].slice(0, 6);
  for (const identityQuery of identityQueries) {
    const targetedUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`${scryfallFormatTerms(format)}${colorQuery} ${identityQuery} -is:funny`)}&order=name&unique=cards`;
    const response = await fetch(targetedUrl, { headers: SCRYFALL_HEADERS });
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

async function resolveImportedDecklist(text: string, poolCards: NativeForgeCard[], format: string, commander: CommanderInput) {
  const parsed = parseDeckRows(text).filter((row) => Number.isFinite(row.quantity) && row.quantity > 0 && row.name);
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
      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { ...SCRYFALL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((row) => ({ name: row.name })) }),
      });
      const data: any = await response.json();
      for (const rawCard of data.data || []) rawByKey.set(cardFactKey(rawCard.name), rawCard);
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

export async function handleForgeGenerate(request: Request, _env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!body?.mode || !body.format || !body.strategy) return json({ error: "format, strategy, and mode are required" }, 400);

  try {
    const target = targetDeckSize(body.format);
    const pool = await loadNativeForgePool(body.format, body.commander, body.lynchpin || "", body.note || "", body.secondCommander);

    if (body.mode === "imported") {
      if (typeof body.deck !== "string" || !body.deck.trim()) return json({ error: "A decklist is required for the imported mode" }, 400);
      const resolution = await resolveImportedDecklist(body.deck, pool.cards, body.format, body.commander);
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
      return json({
        nativeReport,
        cardPool: resolution.pool,
        colors: pool.colors,
        importWarnings: { unresolvedNames: resolution.unresolvedNames, illegalNames: resolution.illegalNames },
      });
    }

    // "native" (three-masterwork reveal) and "direct" (locked commander,
    // no reveal) both run the same generation — they only differ in
    // lynchpin/path, already folded into the request above.
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
    return json({ nativeReport, cardPool: pool.cards, colors: pool.colors });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The native Forge could not complete this candidate." }, 500);
  }
}
