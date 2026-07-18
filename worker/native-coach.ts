import { createRecommendation, parseDeck } from "../app/deck-analysis.mjs";
import { analyzeRiftboundStrategy } from "../app/riftbound-analysis.mjs";
import RIFTBOUND_CATALOG from "../app/riftbound-card-catalog.mjs";
import { riftboundMetaContext } from "../app/riftbound-meta-context.mjs";

function riftRows(text:string){return text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const match=line.match(/^(\d+)\s+(.+)$/);return match?{quantity:Number(match[1]),name:match[2]}:{quantity:1,name:line}})}

export function nativeCoachAnswer(messages:Array<{role:string;content:string}>,context:any){
  const question=String(messages.at(-1)?.content||"").trim(),deckText=String(context?.deckText||"").trim();
  const game=/riftbound/i.test(String(context?.game||""))?"riftbound":"mtg";
  if(/last match|last game|misplay|turning point|kept a risky|ran out of cards|lacked an answer/i.test(question)){
    return `I can review that without pretending the result proves the decision. Start with the decision window: what legal lines were available, what role were you playing (pressure, defense, or pivot), and what opponent cards or resources were actually known? I will compare the strongest line and alternative against tempo, cards, board position, downside, and the most credible punishment. If Companion captured alternatives, Forge will use them; otherwise this remains a bounded reflection, not a verdict.`;
  }
  if(!deckText){
    if(game==="riftbound"){
      const meta=riftboundMetaContext();
      return `Current Riftbound field: ${meta.fieldRead} The snapshot is dated ${meta.asOf} and is ${meta.freshness.replaceAll("-"," ")}; its Tier 1 preparation targets are ${meta.tier1.map(item=>item.legend).join(", ")}.\n\nDecision: choose the counter-field goal before choosing cards.\nTest: paste a 40-card Main Deck or name the Champion/Legend package you want to build around.\nReturn signal: tell Forge which Tier 1 matchup you most want to improve, and it will state the tradeoff instead of pretending one list beats everything.`;
    }
    return `Paste the decklist and name the format. Native Coach can explain the current Forge recommendation, its expected gain, downside, and measurable test. For an entirely new deck request, give me the intended strategy, format, and constraints; open-ended card-by-card construction becomes richer when the conversational model is connected.`;
  }
  if(game==="riftbound"){
    const read=analyzeRiftboundStrategy(riftRows(deckText),RIFTBOUND_CATALOG);
    if(!read.primary)return `I could not match enough names to the verified Riftbound gallery to make a strategy claim. Check the card names first; I will not invent text for unknown cards.`;
    const support=read.support.length?` Supporting packages: ${read.support.map((item:any)=>`${item.copies} ${item.label}`).join(", ")}.`:"";
    const meta=riftboundMetaContext();
    return `Field read (${meta.asOf}, ${meta.freshness.replaceAll("-"," ")}): ${meta.fieldRead} Prepare first for ${meta.tier1.map(item=>item.legend).join(", ")}.\n\nDecision: The clearest verified text pattern is ${read.primary.label} across ${read.primary.copies} copies.${support}\n\nPressure point: ${read.pressure.title}. ${read.pressure.detail}\n\nTest: ${read.testContract}\n\nReturn signal: after five games, report whether the package created its scoring or board-position advantage before the opponent stabilized, plus which Tier 1 plan stopped it. That result can refine the next test; it does not silently rewrite the list.\n\nBoundary: ${read.boundary}`;
  }
  const rows=parseDeck(deckText),count=rows.reduce((sum:number,row:any)=>sum+row.quantity,0);
  if(!count)return `I could not read a decklist from the current workspace. Use one quantity and card name per line, then ask again.`;
  const recommendation=createRecommendation(rows,String(context?.format||"Standard"));
  const changes=(recommendation.changes||[]).map((change:any)=>`${change.quantity>0?"+":""}${change.quantity} ${change.card}`).join(", ")||"No automatic card swap passed the current evidence gate";
  return `${recommendation.title}\n\nDecision: run this as a controlled change.\n\nChange: ${changes}.\n\nWhy: ${recommendation.reasoning}\n\nExpected gain: ${recommendation.expectedGain}\n\nTradeoff: ${recommendation.risk}\n\nTest: compare ${recommendation.testPlan?.openingHands||2500} opening hands, review after ${recommendation.testPlan?.earlyMatches||5} matched games, and make the first evidence decision at ${recommendation.testPlan?.reviewMatches||12}.\n\nReturn signal: report whether the stated gain appeared and what punished the change. One match can change the coaching question, not silently rewrite the deck.`;
}
