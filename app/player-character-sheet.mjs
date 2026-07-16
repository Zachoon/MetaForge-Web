const TRAITS={
  aggression:{label:"Pressure",low:"Patient",high:"Aggressive"},
  risk:{label:"Risk appetite",low:"Measured",high:"Greedy"},
  hesitation:{label:"Decision tempo",low:"Decisive",high:"Cagey"},
  discipline:{label:"Resource discipline",low:"Loose",high:"Disciplined"},
  adaptability:{label:"Adaptability",low:"Committed",high:"Adaptive"},
  reflection:{label:"Self-awareness",low:"Instinctive",high:"Reflective"},
};
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));

export function buildPlayerCharacterSheet({matches=[],debriefs=[]}={}){
  const scores=Object.fromEntries(Object.keys(TRAITS).map(key=>[key,{sum:0,weight:0,evidence:0}]));
  const add=(key,value,weight=1)=>{if(!scores[key])return;scores[key].sum+=clamp(value)*weight;scores[key].weight+=weight;scores[key].evidence+=1};
  for(const match of matches){for(const event of match.playerDecisions||[]){
    if(event.kind==="attack-window")add("aggression",event.tookPressureLine?78:32,event.confidence||1);
    if(event.kind==="risk-window")add("risk",event.acceptedRisk?76:28,event.confidence||1);
    if(event.kind==="decision-time")add("hesitation",clamp((Number(event.seconds)||0)*5),event.confidence||.7);
    if(event.kind==="resource-window")add("discipline",event.preservedResource?76:30,event.confidence||1);
    if(event.kind==="plan-pivot")add("adaptability",event.changedPlan?78:35,event.confidence||1);
  }}
  for(const item of debriefs){if(item.read==="I misplayed")add("reflection",80,.45);else if(item.read==="I'm not sure")add("reflection",58,.25);else add("reflection",62,.15)}
  const traits=Object.entries(TRAITS).map(([key,meta])=>{const row=scores[key];const value=row.weight?clamp(row.sum/row.weight):50;return {key,...meta,value,evidence:row.evidence,confidence:row.evidence>=8?"established":row.evidence>=3?"developing":row.evidence?"early":"unobserved"}});
  const decisionEvidence=traits.reduce((sum,trait)=>sum+(trait.key==="reflection"?0:trait.evidence),0);
  const minimumGames=8,minimumDecisions=6;
  return {traits,games:matches.length,decisionEvidence,ready:matches.length>=minimumGames&&decisionEvidence>=minimumDecisions,minimumGames,minimumDecisions,gamesRemaining:Math.max(0,minimumGames-matches.length),decisionsRemaining:Math.max(0,minimumDecisions-decisionEvidence)};
}
