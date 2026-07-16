const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const bounded=(value)=>Math.max(-1,Math.min(1,Number(value)||0));

export const STRATEGIC_PARAMETERS=["tempo","cardEconomy","boardControl","resourceEfficiency","pressure","reach","information","flexibility","synergy","inevitability","risk","terminalValue"];
const ROLE_WEIGHTS={
  aggressor:{tempo:1.25,cardEconomy:.55,boardControl:.7,resourceEfficiency:.9,pressure:1.4,reach:1.15,information:.35,flexibility:.55,synergy:.75,inevitability:.25,risk:-.45,terminalValue:1.6},
  defender:{tempo:.85,cardEconomy:.9,boardControl:1.4,resourceEfficiency:1.05,pressure:.35,reach:.35,information:.7,flexibility:1.1,synergy:.55,inevitability:.85,risk:-1.1,terminalValue:1.6},
  pivot:{tempo:1,cardEconomy:1,boardControl:1,resourceEfficiency:1,pressure:.75,reach:.7,information:.9,flexibility:1.25,synergy:.7,inevitability:.7,risk:-.8,terminalValue:1.6},
};

export function inferStrategicRole(state={}){
  const ownClock=Math.max(1,Number(state.ownClock||99)),opponentClock=Math.max(1,Number(state.opponentClock||99));
  const pressure=(opponentClock-ownClock)/Math.max(ownClock,opponentClock);
  const score=bounded(pressure*.55+bounded(state.boardAdvantage)*.25-bounded(state.inevitability)*.35);
  const role=score>.18?"aggressor":score<-.18?"defender":"pivot";
  return {role,score,reason:role==="aggressor"?"Your credible clock and current board reward converting time into pressure.":role==="defender"?"The opponent's clock or your long-game advantage rewards survival and resource preservation.":"Neither player owns the role decisively; preserve the ability to change posture."};
}

export function evaluateStrategicActions(state={},actions=[]){
  const role=inferStrategicRole(state),weights=ROLE_WEIGHTS[role.role];
  const uncertainty=clamp(state.uncertainty??.5),fallbackExposure=clamp(state.rangeExposure||0);
  const hiddenCards=Array.isArray(state.opponentRange?.hiddenCards)?state.opponentRange.hiddenCards:[];
  const scored=actions.filter(action=>action?.legal!==false).map((action,index)=>{
    let utility=0;const contributions=[];
    for(const key of STRATEGIC_PARAMETERS){const value=bounded(action?.[key]),contribution=value*(weights[key]||0);utility+=contribution;if(Math.abs(contribution)>=.18)contributions.push({key,value,contribution});}
    const downside=clamp(action.downside),fragility=clamp(action.fragility),evidence=clamp(action.evidence??.5);
    const punishments=new Set((action.losesTo||[]).map(card=>String(card).toLocaleLowerCase()));
    const rangeExposure=punishments.size?clamp(hiddenCards.reduce((sum,item)=>sum+(punishments.has(String(item.card).toLocaleLowerCase())?clamp(item.probability):0),0)):fallbackExposure;
    const robustnessPenalty=(downside*(.45+uncertainty)+fragility*rangeExposure)*1.15;
    const final=utility-robustnessPenalty-(1-evidence)*uncertainty*.4;
    return {id:action.id||`line-${index+1}`,label:action.label||`Line ${index+1}`,score:final,rawUtility:utility,robustnessPenalty,rangeExposure,evidence,contributions:contributions.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)),assumptions:Array.isArray(action.assumptions)?action.assumptions:[]};
  }).sort((a,b)=>b.score-a.score);
  const margin=scored.length>1?scored[0].score-scored[1].score:0;
  const confidence=!scored.length?"unsupported":uncertainty>.65||margin<.2?"close":uncertainty>.35||margin<.65?"developing":"strong";
  const winner=scored[0]||null;
  return {role,winner,alternatives:scored.slice(1),confidence,margin,uncertainty,explanation:winner?`${winner.label} best matches the ${role.role} role. ${winner.contributions.slice(0,2).map(x=>`${x.key} ${x.contribution>0?"helps":"hurts"}`).join("; ")||"No single factor dominates"}.`:"No legal candidate lines were supplied."};
}

export function reviewStrategicDecision(decision={}){
  if(!decision.state||!Array.isArray(decision.options)||decision.options.length<2)return {status:"needs-context",message:"Forge observed the choice, but needs the available alternatives and board state before judging the line."};
  const result=evaluateStrategicActions(decision.state,decision.options),all=[result.winner,...result.alternatives].filter(Boolean),chosen=all.find(x=>x.id===decision.chosenId);
  if(!chosen)return {status:"needs-context",message:"The chosen line was not present in the captured legal options."};
  const regret=Math.max(0,(result.winner?.score||0)-chosen.score);
  return {status:regret<.2?"sound":regret<.7?"close":"review",regret,chosen,best:result.winner,confidence:result.confidence,role:result.role,message:regret<.2?"The chosen line remains competitive under the captured assumptions.":regret<.7?"A competing line scored slightly better; this is a useful review, not a declared mistake.":"The captured alternatives contain a materially stronger line under the stated assumptions."};
}
