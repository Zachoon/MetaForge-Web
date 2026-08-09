import CARD_TYPE_INDEX from "./card-type-index.mjs";

const SCRYFALL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MetaForge/1.0 (https://metaforge.gg)",
};

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "private, max-age=300" },
});

async function fetchCollection(names: string[]) {
  for (let attempt = 0; attempt < 1; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { ...SCRYFALL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      if (attempt === 0) return null;
      continue;
    }
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) return response;
  }
  return null;
}

export async function handleCardFacts(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) return json({ error: "Request too large" }, 413);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const names = [...new Set((Array.isArray(body?.names) ? body.names : [])
    .map((name: unknown) => String(name || "").trim())
    .filter(Boolean))];
  if (!names.length || names.length > 100 || names.some((name) => name.length > 180)) {
    return json({ error: "Provide between 1 and 100 card names" }, 400);
  }
  const cards: any[] = [];
  const unresolved: string[] = [];
  for (let index = 0; index < names.length; index += 75) {
    const chunk = names.slice(index, index + 75);
    const response = await fetchCollection(chunk);
    if (!response?.ok) {
      for (const name of chunk) {
        const local = (CARD_TYPE_INDEX as Record<string, [string, string]>)[name.toLowerCase()];
        if (local) cards.push({ name: local[0], type_line: local[1] });
        else unresolved.push(name);
      }
      continue;
    }
    const payload: any = await response.json();
    cards.push(...(Array.isArray(payload?.data) ? payload.data : []));
    unresolved.push(...(Array.isArray(payload?.not_found) ? payload.not_found.map((entry: any) => String(entry?.name || "")).filter(Boolean) : []));
  }
  const resolvedNames = new Set(cards.map((card) => String(card?.name || "").toLowerCase()));
  for (const name of names) {
    if (resolvedNames.has(name.toLowerCase())) continue;
    const local = (CARD_TYPE_INDEX as Record<string, [string, string]>)[name.toLowerCase()];
    if (local) cards.push({ name: local[0], type_line: local[1] });
    else if (!unresolved.includes(name)) unresolved.push(name);
  }
  return json({ cards, unresolved, source: unresolved.length ? "mixed" : "complete" });
}
