import RIFTBOUND_CATALOG from "./riftbound-card-catalog.mjs";

const RULES_SOURCE = "https://playriftbound.com/en-us/news/riftbound-deckbuilding-101/";
const STOP = new Set("a an and are as at be build can card cards counter current deck field for from have i in is it me meta of on or play please rest saying still strong that the this to will with you".split(" "));
const STRATEGY_TERMS = ["draw","predict","recycle","counter","kill","damage","stun","banish","recall","move","attack","defend","conquer","hold","score","buff","heal","ready","channel","rune","gear","equipment","token","temporary","hidden","reaction","assault"];

function plain(value = "") {
  return String(value).replace(/<br\s*\/?>/gi," ").replace(/<\/li>/gi,"; ").replace(/<[^>]+>/g," ").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
}

function tokens(value) {
  return [...new Set(String(value).toLocaleLowerCase().match(/[a-z0-9]+/g) || [])].filter(word => word.length > 2 && !STOP.has(word));
}

export function riftboundCoachContext(query = "", deckText = "", limit = 48) {
  const wanted = tokens(`${query} ${deckText}`);
  const records = Object.values(RIFTBOUND_CATALOG.cards).map(card => {
    const text = plain(card.text?.richText?.body || card.text?.label || card.type || "");
    const haystack = `${card.name} ${card.code} ${text}`.toLocaleLowerCase();
    let score = wanted.reduce((sum, word) => sum + (haystack.includes(word) ? (card.name.toLocaleLowerCase().includes(word) ? 8 : 3) : 0), 0);
    score += STRATEGY_TERMS.reduce((sum, word) => sum + (haystack.includes(word) ? 0.08 : 0), 0);
    return { card, text, score, haystack };
  });
  const selected = records.filter(row => row.score >= 3).sort((a,b) => b.score-a.score || a.card.name.localeCompare(b.card.name)).slice(0, limit);
  if (selected.length < Math.min(30, limit)) {
    const used = new Set(selected.map(row => row.card.name));
    for (const term of STRATEGY_TERMS) {
      const candidates = records.filter(row => !used.has(row.card.name) && row.haystack.includes(term)).sort((a,b) => b.score-a.score || a.card.name.localeCompare(b.card.name));
      for (const row of candidates.slice(0,2)) { selected.push(row); used.add(row.card.name); if (selected.length >= limit) break; }
      if (selected.length >= limit) break;
    }
  }
  return {
    rules: [
      "Verified constructed Main Deck rule: exactly 40 cards.",
      "Verified constructed Main Deck rule: no more than 3 copies of one card.",
      "Complete tournament legality also depends on Champion, Legend, domains, runes, bans, and errata; do not claim those gates passed without their verified fields.",
    ],
    rulesSource: RULES_SOURCE,
    catalogSource: RIFTBOUND_CATALOG.source,
    catalogUpdatedAt: RIFTBOUND_CATALOG.updatedAt,
    catalogSize: records.length,
    facts: selected.slice(0, limit).map(({card,text}) => `${card.name} [${card.code}]: ${text || "No ability text shown in the official gallery record."}`),
  };
}

