import { userKey } from "./account-bench";
import { rankEdhrecSignals } from "../app/evidence-scoring.mjs";

type Env = { DB: D1Database };
type EdhrecCard = { name?: string; synergy?: number; num_decks?: number; potential_decks?: number };

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": status === 200 ? "public, max-age=900, s-maxage=21600" : "no-store" } });
const commanderSlug = (name: string) => name.split("//")[0].normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function handleEdhrecEvidence(request: Request, env: Env) {
  if (!(await userKey(request))) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const commander = new URL(request.url).searchParams.get("commander")?.trim() || "";
  if (!commander || commander.length > 180) return json({ error: "Commander required" }, 400);
  const slug = commanderSlug(commander);
  const upstream = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, { headers: { "User-Agent": "MetaForge/0.1 (+https://metaforge-private-alpha.metaforge-labs.workers.dev)", "Accept": "application/json;q=0.9,*/*;q=0.8" } });
  if (upstream.status === 404) return json({ commander, slug, available: false, reason: "EDHREC has not indexed this commander yet", cards: [] });
  if (!upstream.ok) return json({ commander, slug, available: false, reason: "EDHREC evidence is temporarily unavailable", cards: [] }, 502);
  const payload: any = await upstream.json();
  const lists = Array.isArray(payload?.container?.json_dict?.cardlists) ? payload.container.json_dict.cardlists : [];
  const useful = new Set(["New Cards", "High Synergy Cards", "Top Cards", "Game Changers"]);
  const rawCards = lists.filter((list: any) => useful.has(String(list?.header || ""))).flatMap((list: any) => (list.cardviews || []).map((card: EdhrecCard) => ({
    name: String(card.name || ""), category: String(list.header), decks: Number(card.num_decks || 0), eligibleDecks: Number(card.potential_decks || 0), synergy: Number(card.synergy || 0),
  }))).filter((card: any) => card.name);
  const cards = rankEdhrecSignals(rawCards).slice(0, 60);
  return json({ commander, slug, available: true, source: `https://edhrec.com/commanders/${slug}`, retrievedAt: new Date().toISOString(), sourceWindowKnown: false, methodology: "EDHREC adoption and commander-relative synergy are ranked with sample-size shrinkage and a conservative adoption lower bound. Popularity is descriptive, not proof of optimality. New cards remain discovery hypotheses even when their play sample is young.", cards });
}
