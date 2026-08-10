const SCRYFALL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MetaForge/1.0 (https://metaforge.gg)",
};

const FORMATS = new Set(["Commander", "Brawl", "Standard Brawl"]);

export function commanderFormatTerms(format: string): string {
  if (format === "Standard Brawl") return "legal:brawl legal:standard game:arena";
  if (format === "Brawl") return "legal:brawl game:arena";
  return "legal:commander";
}

export function commanderSearchQuery(format: string, name: string, exact = false): string {
  const safeName = String(name || "").replace(/["\\]/g, " ").trim();
  const nameClause = exact ? `!"${safeName}"` : `name:"${safeName}"`;
  return `${commanderFormatTerms(format)} is:commander ${nameClause}`;
}

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": status === 200 ? "public, max-age=2592000, stale-while-revalidate=31536000" : "no-store" },
});

async function fetchScryfall(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers: SCRYFALL_HEADERS, signal: AbortSignal.timeout(6000) });
      if (response.ok || (response.status !== 429 && response.status < 500)) return response;
    } catch {
      // One bounded retry turns a transient upstream failure into recovery,
      // never an endless "searching" state in the browser.
    }
  }
  return null;
}

function mtgApiCardIsLegal(card: any, format: string): boolean {
  const accepted = format === "Commander" ? ["commander"] : format === "Standard Brawl" ? ["brawl", "standardbrawl"] : ["brawl"];
  return (Array.isArray(card?.legalities) ? card.legalities : []).some((entry: any) =>
    accepted.includes(String(entry?.format || "").toLowerCase()) && String(entry?.legality || "").toLowerCase() === "legal");
}

function mtgApiCommanderCard(card: any) {
  return {
    name: card.name,
    mana_cost: card.manaCost || "",
    cmc: Number(card.cmc || 0),
    type_line: card.type || "Legendary card",
    color_identity: Array.isArray(card.colorIdentity) ? card.colorIdentity : [],
    oracle_text: card.text || "",
    image_uris: card.imageUrl ? { small: String(card.imageUrl).replace(/^http:/, "https:") } : undefined,
    set_name: card.setName || "",
    set: String(card.set || "").toLowerCase(),
    games: ["paper"],
    legalities: Object.fromEntries((card.legalities || []).map((entry: any) => [String(entry.format || "").toLowerCase(), String(entry.legality || "").toLowerCase()])),
  };
}

async function fetchSecondaryCommanderIndex(format: string, query: string, exact: boolean): Promise<any[] | null> {
  try {
    const response = await fetch(`https://api.magicthegathering.io/v1/cards?name=${encodeURIComponent(query)}&pageSize=100`, {
      headers: SCRYFALL_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const payload: any = await response.json();
    const seen = new Set<string>();
    return (Array.isArray(payload?.cards) ? payload.cards : [])
      .filter((card: any) => {
        const name = String(card?.name || "");
        const commanderType = /Legendary (?:Artifact )?Creature/i.test(card?.type || "") || /can be your commander/i.test(card?.text || "");
        const nameMatches = exact ? name.split(/\s*\/\/\s*/)[0].toLowerCase() === query.toLowerCase() : name.toLowerCase().includes(query.toLowerCase());
        if (!nameMatches || !commanderType || !mtgApiCardIsLegal(card, format) || seen.has(name.toLowerCase())) return false;
        seen.add(name.toLowerCase());
        return true;
      })
      .slice(0, 8)
      .map(mtgApiCommanderCard);
  } catch {
    return null;
  }
}

export async function handleCommanderSearch(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "Commander";
  const query = (url.searchParams.get("q") || "").trim();
  const exact = url.searchParams.get("exact") === "true";
  if (!FORMATS.has(format) || query.length < 2 || query.length > 120) {
    return json({ error: "Provide a supported Commander format and card name" }, 400);
  }
  const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(commanderSearchQuery(format, query, exact))}&order=name&unique=cards`;
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const response = await fetchScryfall(scryfallUrl);
  let cards: any[] | null = null;
  let source = "scryfall";
  if (response?.ok) {
    const data: any = await response.json();
    cards = (Array.isArray(data?.data) ? data.data : []).slice(0, 8);
  } else if (response?.status === 404) {
    cards = [];
  } else {
    cards = await fetchSecondaryCommanderIndex(format, query, exact);
    source = "secondary-index";
  }
  if (cards === null) return json({ error: "Commander index is temporarily unavailable", retryable: true }, 503);
  const result = json({ cards, source });
  await cache.put(cacheKey, result.clone());
  return result;
}
