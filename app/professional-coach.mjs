const READ_TAGS = {
  "My mana":["mana","lands","mulligan"], "Their speed":["tempo","aggro","early-game"],
  "I ran out of cards":["card-advantage","resources","attrition"], "I lacked an answer":["interaction","removal","answers"],
  "My plan worked":["game-plan","synergy","sequencing"], "I misplayed":["decision-making","sequencing","technical-play"],
  "I'm not sure":["review","learning"],
  "I found the turning point":["sequencing","decision-making","tempo"], "I stayed ahead on cards":["card-advantage","resources"],
  "They nearly stabilized":["pressure","tempo","closing"], "I kept a risky hand":["mulligan","risk","opening-hand"],
  "My plan never started":["game-plan","setup","consistency"],
};

export function professionalCoachLens({ format="General", read="", cards=[] }={}, knowledge=[]) {
  const tags = new Set((READ_TAGS[read] || []).map((tag)=>tag.toLowerCase()));
  const wantedCards = new Set(cards.map((card)=>card.toLowerCase()));
  const candidates = knowledge.filter((claim)=>claim?.sourceUrl && claim?.author && claim?.principle &&
    (claim.format === "General" || claim.format === format) &&
    ((claim.tags || []).some((tag)=>tags.has(tag.toLowerCase())) || (claim.cards || []).some((card)=>wantedCards.has(card.toLowerCase()))));
  if (!candidates.length) return null;
  const grouped = new Map();
  for (const claim of candidates) { const key=claim.principle.toLowerCase(); const group=grouped.get(key)||[]; group.push(claim); grouped.set(key,group); }
  const groups=[...grouped.values()].sort((a,b)=>new Set(b.map(x=>x.author.toLowerCase())).size-new Set(a.map(x=>x.author.toLowerCase())).size || b.length-a.length);
  const claims=groups[0]; const stances=new Set(claims.map((claim)=>claim.stance)); const disagreement=stances.has("supports")&&stances.has("challenges");
  const authors=new Set(claims.map((claim)=>claim.author.toLowerCase())).size;
  return { principle:claims[0].principle, summary:claims[0].summary, confidence:authors>=2&&!disagreement?"corroborated":"perspective",
    disagreement, sources:claims.slice(0,3).map(({author,sourceTitle,sourceUrl,publishedAt})=>({author,sourceTitle,sourceUrl,publishedAt})) };
}
