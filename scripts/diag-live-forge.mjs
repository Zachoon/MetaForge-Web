// One-off live forge diagnostic: Scryfall pool + native construction.
// Does not touch Brain weights. Run: node scripts/diag-live-forge.mjs
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

const headers = {
  Accept: "application/json",
  "User-Agent": "MetaForge/0.1 (+local-diag)",
};

async function fetchJson(url, init) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function searchAll(query, maxPages = 6) {
  let next = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  const cards = [];
  for (let page = 0; next && page < maxPages; page += 1) {
    const result = await fetchJson(next);
    cards.push(...(result.data || []));
    next = result.has_more ? result.next_page : "";
    await new Promise((r) => setTimeout(r, 80));
  }
  return cards;
}

function toNative(raw, popularityRank) {
  const face = raw.card_faces?.[0];
  return {
    name: raw.name,
    manaCost: raw.mana_cost || face?.mana_cost || "",
    cmc: Number(raw.cmc ?? face?.cmc ?? 0),
    typeLine: raw.type_line || face?.type_line || "",
    oracleText: raw.oracle_text || face?.oracle_text || "",
    colors: raw.colors || face?.colors || [],
    colorIdentity: raw.color_identity || [],
    keywords: raw.keywords || [],
    rarity: raw.rarity || "",
    prices: raw.prices || {},
    popularityRank,
  };
}

const commanderName = process.argv[2] || "Atraxa, Praetors' Voice";
const note = process.argv[3] || "Doubling Season Superfriends proliferate planeswalkers";

const cmd = await fetchJson(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commanderName)}`);
const colors = cmd.color_identity || [];
const colorQuery = colors.length ? ` id<=${colors.join("").toLowerCase()}` : "";
const query = `legal:commander${colorQuery} -is:funny`;
console.log(JSON.stringify({ commanderName, note, colors, query }, null, 2));

const rawCards = await searchAll(query, 6);
const cards = rawCards.map((card, index) => toNative(card, index));
// Ensure commander is present
if (!cards.some((card) => card.name === cmd.name)) {
  cards.unshift(toNative(cmd, 0));
}

console.log(JSON.stringify({ poolSize: cards.length }, null, 2));

const t0 = Date.now();
try {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    path: "",
    note,
    seed: 42,
    colors,
    commander: { name: cmd.name, colors, oracleText: cmd.oracle_text || "" },
    secondCommander: null,
    cards,
    evidence: [],
    budget: "Flexible",
    complexity: "Standard",
  });
  const size = report.selected?.rows?.reduce((sum, row) => sum + row.quantity, 0);
  const fullBytes = Buffer.byteLength(JSON.stringify({ nativeReport: report, cardPool: cards }));
  const withoutStruct = Buffer.byteLength(
    JSON.stringify({
      nativeReport: { ...report, structuralAnalysis: undefined },
      cardPool: cards,
    }),
  );
  const withoutPool = Buffer.byteLength(JSON.stringify({ nativeReport: { ...report, structuralAnalysis: undefined } }));
  console.log(
    JSON.stringify(
      {
        ok: true,
        ms: Date.now() - t0,
        size,
        candidates: report.candidates?.length,
        fullBytes,
        withoutStructBytes: withoutStruct,
        withoutPoolBytes: withoutPool,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(JSON.stringify({ ok: false, ms: Date.now() - t0, error: String(error?.message || error) }, null, 2));
  process.exitCode = 1;
}
