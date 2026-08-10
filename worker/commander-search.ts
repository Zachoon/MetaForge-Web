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
  headers: { "Cache-Control": status === 200 ? "public, max-age=300" : "no-store" },
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
  if (!response) return json({ error: "Commander index is temporarily unavailable", retryable: true }, 503);
  if (response.status === 404) return json({ cards: [] });
  if (!response.ok) return json({ error: "Commander search failed", retryable: response.status === 429 || response.status >= 500 }, 502);
  const data: any = await response.json();
  const result = json({ cards: (Array.isArray(data?.data) ? data.data : []).slice(0, 8) });
  await cache.put(cacheKey, result.clone());
  return result;
}
