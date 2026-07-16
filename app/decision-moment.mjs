import { reviewStrategicDecision } from "./strategic-reasoner.mjs";

function observedContext(decision){const state=decision?.observedState;if(!state)return "";const facts=[];if(Number.isFinite(state.ownLife)&&Number.isFinite(state.opponentLife))facts.push(`life ${state.ownLife}–${state.opponentLife}`);if(Number.isFinite(state.ownHandSize)&&Number.isFinite(state.opponentHandSize))facts.push(`hands ${state.ownHandSize}–${state.opponentHandSize}`);if(Number.isFinite(state.availableResources))facts.push(`${state.availableResources} resources available`);return facts.length?` Captured context: ${facts.join(", ")}.`:""}

export function buildDecisionMoment(match){
  const decisions=match?.playerDecisions||[];
  if(!decisions.length)return null;
  const captured=[...decisions].reverse().find(x=>x.state&&Array.isArray(x.options)&&x.options.length>=2);
  if(captured){
    const review=reviewStrategicDecision(captured);
    return {title:review.status==="sound"?"Your line held up.":review.status==="close"?"That was a close branch.":"There is a stronger line to review.",detail:`${review.message} Forge compared ${captured.options.length} captured legal lines as ${review.role?.role||"an uncertain role"} with ${review.confidence||"limited"} confidence.`,trait:"Strategic adaptability",source:"Captured alternatives and board state",strategicReview:review};
  }
  const attack=[...decisions].reverse().find(x=>x.kind==="attack-window");
  if(attack)return {title:attack.tookPressureLine?"You chose pressure.":"You chose patience.",detail:(attack.tookPressureLine?`Arena recorded ${attack.actors||"one or more"} attacker${attack.actors===1?"":"s"} on turn ${attack.turn}. This is evidence of that decision—not proof the line was correct.`:`Arena recorded an attack window with no attackers on turn ${attack.turn}. Forge needs board context before judging the choice.`)+observedContext(attack),trait:"Pressure",source:"Explicit Arena action"};
  const block=[...decisions].reverse().find(x=>x.kind==="block-window");
  if(block)return {title:block.blocked?"You committed to the block.":"You preserved your board.",detail:`Arena recorded this combat decision on turn ${block.turn}. Match context is still required before comparing alternatives.${observedContext(block)}`,trait:"Resource discipline",source:"Explicit Arena action"};
  const pass=[...decisions].reverse().find(x=>x.kind==="priority-pass");
  return pass?{title:"You passed the decision window.",detail:`Arena recorded a priority pass on turn ${pass.turn}. Forge will not call it hesitation without timing and available-action evidence.${observedContext(pass)}`,trait:"Decision tempo",source:"Explicit Arena action"}:null;
}
