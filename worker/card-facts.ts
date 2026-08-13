import CARD_TYPE_INDEX from "./card-type-index.mjs";

const SCRYFALL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MetaForge/1.0 (https://metaforge.gg)",
};

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "private, max-age=300" },
});

const scryfallLookupName = (name: string) => String(name || "").split(/\s*\/\/\s*/)[0].trim();

function localFact(name: string): { name: string; type_line: string; cmc?: number } | null {
  const local = (CARD_TYPE_INDEX as Record<string, [string, string]>)[name.toLowerCase()];
  if (!local) return null;
  const type_line = local[1];
  // Local catalog is type-only. Lands are cmc 0 by definition; nonlands stay
  // without cmc so clients can keep them out of Turn 1 instead of treating
  // "missing" as zero and dumping Atraxa into the opening turn.
  return /\bLand\b/i.test(type_line)
    ? { name: local[0], type_line, cmc: 0 }
    : { name: local[0], type_line };
}

async function fetchCollection(names: string[]) {
  let lastFailure: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { ...SCRYFALL_HEADERS, "Content-Type": "application/json" },
        // Scryfall's collection endpoint rejects canonical transform names in
        // "Front // Back" form even though its response uses that full name.
        // Query the castable/front face and preserve the canonical record it
        // returns so the client can index both faces and the full display name.
        body: JSON.stringify({ identifiers: names.map((name) => ({ name: scryfallLookupName(name) })) }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      return null;
    }
    if (response.ok) return response;
    lastFailure = response;
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
    }
    return response;
  }
  return lastFailure;
}

export async function handleCardFacts(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const contentLength = Number(request.headers.get("content-length") || 0);
  // Commander lists are ~100 unique names; leave headroom for partners / DFC aliases.
  if (contentLength > 40_000) return json({ error: "Request too large" }, 413);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const names = [...new Set((Array.isArray(body?.names) ? body.names : [])
    .map((name: unknown) => String(name || "").trim())
    .filter(Boolean))];
  if (!names.length || names.length > 120 || names.some((name) => name.length > 180)) {
    return json({ error: "Provide between 1 and 120 card names" }, 400);
  }
  const cards: any[] = [];
  const unresolved: string[] = [];
  for (let index = 0; index < names.length; index += 75) {
    const chunk = names.slice(index, index + 75);
    const response = await fetchCollection(chunk);
    if (!response?.ok) {
      for (const name of chunk) {
        const local = localFact(name);
        if (local) cards.push(local);
        else unresolved.push(name);
      }
      continue;
    }
    const payload: any = await response.json();
    cards.push(...(Array.isArray(payload?.data) ? payload.data : []));
    const originalByLookup = new Map(chunk.map((name) => [scryfallLookupName(name).toLowerCase(), name]));
    unresolved.push(...(Array.isArray(payload?.not_found) ? payload.not_found
      .map((entry: any) => originalByLookup.get(String(entry?.name || "").toLowerCase()) || String(entry?.name || ""))
      .filter(Boolean) : []));
  }
  const resolvedNames = new Set(cards.flatMap((card) => [
    card?.name,
    scryfallLookupName(card?.name),
    ...(Array.isArray(card?.card_faces) ? card.card_faces.map((face: any) => face?.name) : []),
  ]).filter(Boolean).map((name) => String(name).toLowerCase()));
  for (const name of names) {
    if (resolvedNames.has(name.toLowerCase())) continue;
    const local = localFact(name);
    if (local) cards.push(local);
    else if (!unresolved.includes(name)) unresolved.push(name);
  }
  return json({ cards, unresolved, source: unresolved.length ? "mixed" : "complete" });
}
