import { createRecommendation, parseDeck } from "../app/deck-analysis.mjs";
import { analyzeRiftboundStrategy } from "../app/riftbound-analysis.mjs";
import RIFTBOUND_CATALOG from "../app/riftbound-card-catalog.mjs";

function riftRows(text:string){return text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const match=line.match(/^(\d+)\s+(.+)$/);return match?{quantity:Number(match[1]),name:match[2]}:{quantity:1,name:line}})}

export function nativeCoachAnswer(messages:Array<{role:string;content:string}>,context:any){
  const question=String(messages.at(-1)?.content||"").trim(),deckText=String(context?.deckText||"").trim();
  const game=/riftbound/i.test(String(context?.game||""))?"riftbound":"mtg";
  if(/last match|last game|misplay|turning point|kept a risky|ran out of cards|lacked an answer/i.test(question)){
    return `I can review that without pretending the result proves the decision. Start with the decision window: what legal lines were available, what role were you playing (pressure, defense, or pivot), and what opponent cards or resources were actually known? I will compare the strongest line and alternative against tempo, cards, board position, downside, and the most credible punishment. If Companion captured alternatives, Forge will use them; otherwise this remains a bounded reflection, not a verdict.`;
  }
  if(!deckText)return game==="riftbound"?`Paste the Riftbound Main Deck you want examined. Native Coach can identify the clearest rules-text package, pressure point, and five-game test without mixing in MTG evidence. Full Champion, Legend, domain, rune, ban, and errata eligibility still requires verified fields.`:`Paste the decklist and name the format. Native Coach can explain the current Forge recommendation, its expected gain, downside, and measurable test. For an entirely new deck request, give me the intended strategy, format, and constraints; open-ended card-by-card construction becomes richer when the conversational model is connected.`;
  if(game==="riftbound"){
    const read=analyzeRiftboundStrategy(riftRows(deckText),RIFTBOUND_CATALOG);
    if(!read.primary)return `I could not match enough names to the verified Riftbound gallery to make a strategy claim. Check the card names first; I will not invent text for unknown cards.`;
    const support=read.support.length?` Supporting packages: ${read.support.map((item:any)=>`${item.copies} ${item.label}`).join(", ")}.`:"";
    return `The clearest verified text pattern is ${read.primary.label} across ${read.primary.copies} copies.${support}\n\nPressure point: ${read.pressure.title}. ${read.pressure.detail}\n\nTest: ${read.testContract}\n\nBoundary: ${read.boundary}`;
  }
  const rows=parseDeck(deckText),count=rows.reduce((sum:number,row:any)=>sum+row.quantity,0);
  if(!count)return `I could not read a decklist from the current workspace. Use one quantity and card name per line, then ask again.`;
  const recommendation=createRecommendation(rows,String(context?.format||"Standard"));
  const changes=(recommendation.changes||[]).map((change:any)=>`${change.quantity>0?"+":""}${change.quantity} ${change.card}`).join(", ")||"No automatic card swap passed the current evidence gate";
  return `${recommendation.title}\n\nChange: ${changes}.\n\nWhy: ${recommendation.reasoning}\n\nExpected gain: ${recommendation.expectedGain}\n\nTradeoff: ${recommendation.risk}\n\nTest: compare ${recommendation.testPlan?.openingHands||2500} opening hands, review after ${recommendation.testPlan?.earlyMatches||5} matched games, and make the first evidence decision at ${recommendation.testPlan?.reviewMatches||12}. One match can change the coaching question, not silently rewrite the deck.`;
}
