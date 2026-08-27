import { evaluateSituationalCard, situationalReliabilityFactor } from "./situational-card-evaluation.mjs";

const SUPPORTED_ROLES = new Set(["removal","counter","draw","sweeper","stabilizer","finisher","ramp","protection"]);
const STRATEGY_WEIGHTS = { Aggro:{stabilizer:4,finisher:3,draw:1,ramp:1,protection:2}, Tempo:{stabilizer:3,counter:3,draw:2,finisher:1,ramp:1,protection:2}, Midrange:{stabilizer:3,draw:2,removal:2,finisher:2,ramp:2,protection:2}, Control:{draw:3,counter:3,removal:2,sweeper:2,finisher:1,ramp:1.5,protection:1}, Ramp:{draw:2,finisher:4,ramp:4,protection:1} };

// Cards may optionally carry `colorPips` (nonland: {W,U,B,R,G} pip counts
// from their cost) and `colorIdentity` (land: which colors it can tap for).
// Both are undefined for the plain {quantity,card,role,cmc} shape older
// callers and the existing test fixture already pass, so every check below
// treats missing data as "no color constraint" — purely additive, never a
// stricter gate than before when color data isn't supplied.
function hasPips(pips) { return !!pips && Object.values(pips).some((count) => count > 0); }

// Greedy feasibility check, not a true assignment solver: each battlefield
// land is claimed by whichever still-unsatisfied color it can cover, one
// land per pip needed. A dual land that could cover either of two needed
// colors only ever pays one of them here, same as in a real game, but the
// greedy order can occasionally mis-credit an edge case with several
// overlapping duals — an approximation, not a rules engine.
function canPayPips(battlefieldColors, pips) {
  if (!hasPips(pips)) return true;
  const pool = [...battlefieldColors];
  for (const color of Object.keys(pips)) {
    let need = pips[color] || 0;
    for (let index = pool.length - 1; index >= 0 && need > 0; index -= 1) {
      if (pool[index].includes(color)) { pool.splice(index, 1); need -= 1; }
    }
    if (need > 0) return false;
  }
  return true;
}

// A hand is a London-mulligan keep candidate if it isn't land-flooded/
// -screwed and isn't a trap — its lands plus affordable persistent mana
// sources can eventually produce every color its nonland cards need. Only
// checks presence of a source, not
// full pip count: with 7 cards you aren't expected to already hold every
// double-pip requirement, just not be completely locked out of a color
// your hand wants to play.
export function isKeepable(hand){
  const openingLandColors=hand.filter(isLand).map(landColors);
  const openingLands=hand.filter(isLand).length;
  const reachableColors=[...openingLandColors];
  const uncreditedSources=hand.filter(card=>!isLand(card)&&producedColors(card).length);
  let changed=true;
  while(changed){
    changed=false;
    for(let index=uncreditedSources.length-1;index>=0;index-=1){
      const source=uncreditedSources[index];
      if((source.cmc??99)<=openingLands&&canPayPips(reachableColors,source.colorPips)){
        reachableColors.push(producedColors(source));
        uncreditedSources.splice(index,1);
        changed=true;
      }
    }
  }
  const colorTrapped=hand.some(card=>!isLand(card)&&hasPips(card.colorPips)&&Object.keys(card.colorPips).some(color=>(card.colorPips[color]||0)>0&&!reachableColors.some(colors=>colors.includes(color))));
  return openingLands>=2&&openingLands<=5&&!colorTrapped;
}

// Real London mulligan: draw 7, shuffle the whole hand back and redraw 7
// again if it isn't keepable, then bottom one card per mulligan taken once
// you stop. Capped at two mulligans (a floor of a 5-card hand) — real
// pilots essentially always keep by then, and an uncapped loop would let a
// single bad manabase "successfully" mulligan its way to a good hand every
// single game, hiding the exact inconsistency this model exists to catch.
const MULLIGAN_CAP=2;
export function drawOpeningHand(deckCards,rng){
  const library=[...deckCards];shuffle(library,rng);
  let hand=library.splice(-7),mulligans=0;
  while(!isKeepable(hand)&&mulligans<MULLIGAN_CAP){
    library.push(...hand);shuffle(library,rng);
    hand=library.splice(-7);mulligans+=1;
  }
  // Recorded before bottoming: a hand forced to be kept at the mulligan cap
  // despite still failing the keep criteria is real evidence the manabase
  // is inconsistent, not a success — bottoming a couple of cards afterward
  // doesn't fix a hand that was fundamentally screwed or flooded.
  const wasKeepable=isKeepable(hand);
  if(mulligans>0)hand=bottomWorstCards(hand,mulligans,library);
  return {hand,library,mulligans,keepable:wasKeepable};
}

// Bottoms the cards a real pilot would actually part with: excess lands
// first once the hand is flooded (more than 4), otherwise the most
// expensive nonland card — the one least likely to be castable soon.
// Lands go to the front of the library array (the end is "top of deck" by
// this module's draw-by-pop convention below), so a bottomed card stays
// out of the way for the rest of the game, same as it would on paper.
function bottomWorstCards(hand,count,library){
  const kept=[...hand];
  for(let i=0;i<count&&kept.length;i+=1){
    let worstIndex=-1;
    if(kept.filter(isLand).length>4){
      worstIndex=kept.findIndex(isLand);
    }else{
      worstIndex=kept.reduce((best,card,index)=>{
        if(isLand(card))return best;
        return best===-1||(card.cmc||0)>(kept[best].cmc||0)?index:best;
      },-1);
    }
    if(worstIndex===-1)worstIndex=kept.length-1;
    library.unshift(kept.splice(worstIndex,1)[0]);
  }
  return kept;
}

export function simulateGoldfish(deck, strategy="Midrange", games=1000, seed=8128, policy="expert") {
  const rng=mulberry32(seed); const cards=deck.flatMap(card=>Array(card.quantity).fill(card)); let totalSpent=0,totalRealization=0,realized=0,keeps=0,totalMulligans=0,mulliganGames=0;
  const unsupported=[...new Set(deck.filter(card=>card.role&&!card.role.includes("land")&&!SUPPORTED_ROLES.has(card.role)).map(card=>card.card))];
  const colorAware=deck.some(card=>hasPips(card.colorPips));
  let colorScrewed=0;
  for(let game=0;game<games;game++){
    const drawn=drawOpeningHand(cards,rng);
    const library=drawn.library,hand=drawn.hand;
    if(drawn.mulligans>0){totalMulligans+=drawn.mulligans;mulliganGames+=1;}
    if(drawn.keepable)keeps++;
    const battlefieldLandColors=[];
    // Ramp spells (search-a-land, treasure-adjacent effects) don't just score
    // value like any other card — they mechanically accelerate every later
    // turn. Modeled as "enters tapped": a ramp spell cast this turn adds a
    // mana source starting next turn, not immediately, matching how the
    // common effects (Rampant Growth, Cultivate) actually resolve.
    let battlefieldLands=0,pendingRamp=0,pendingRampColors=[],battlefieldCreatures=0,battlefieldArtifacts=0,graveyardCards=0,spent=0,score=0,turnHit=null,firstColoredCastTurn=null;
    for(let turn=1;turn<=8;turn++){
      battlefieldLands+=pendingRamp;pendingRamp=0;
      battlefieldLandColors.push(...pendingRampColors);pendingRampColors=[];
      if(library.length)hand.push(library.pop());
      const landIndex=hand.findIndex(isLand);
      if(landIndex>=0){const landCard=hand[landIndex];hand.splice(landIndex,1);battlefieldLands++;battlefieldLandColors.push(landColors(landCard));}
      let mana=battlefieldLands;
      while(mana>0){
        const castable=hand.filter(card=>{
          if(isLand(card)||!canPayPips(battlefieldLandColors,card.colorPips))return false;
          const read=evaluateSituationalCard(card);
          const cost=Math.max(card.cmc??99,read.minimumUsefulMana??0);
          if(cost>mana)return false;
          if(read.additionalCosts.includes("sacrifice-permanent")&&battlefieldCreatures+battlefieldArtifacts<1)return false;
          if(read.additionalCosts.includes("exile-from-graveyard")&&graveyardCards<1)return false;
          if(read.battlefieldRequirements.some(need=>["creature-target","creature-you-control"].includes(need))&&battlefieldCreatures<1)return false;
          if(read.battlefieldRequirements.includes("artifact-or-creature-fodder")&&battlefieldCreatures+battlefieldArtifacts<1)return false;
          return true;
        });
        if(!castable.length)break;
        castable.sort((a,b)=>priority(b,strategy,policy,rng)-priority(a,strategy,policy,rng));
        const chosen=castable[0];
        const chosenRead=evaluateSituationalCard(chosen);
        const chosenCost=Math.max(chosen.cmc||0,chosenRead.minimumUsefulMana||0);
        hand.splice(hand.indexOf(chosen),1);mana-=chosenCost;spent+=chosenCost;score+=roleValue(chosen.role,strategy)*situationalReliabilityFactor(chosen);
        if(chosenRead.additionalCosts.includes("sacrifice-permanent")){
          if(battlefieldArtifacts>0)battlefieldArtifacts-=1;else if(battlefieldCreatures>0)battlefieldCreatures-=1;
        }
        if(/\bCreature\b/i.test(chosen.typeLine||chosen.type_line||""))battlefieldCreatures+=1;
        if(/\bArtifact\b/i.test(chosen.typeLine||chosen.type_line||""))battlefieldArtifacts+=1;
        graveyardCards+=1;
        if(chosen.role==="ramp"){
          pendingRamp+=1;
          pendingRampColors.push(producedColors(chosen));
        }
        if(turnHit===null&&score>=8)turnHit=turn;
        if(firstColoredCastTurn===null&&hasPips(chosen.colorPips))firstColoredCastTurn=turn;
      }
    }
    if(colorAware&&firstColoredCastTurn===null)colorScrewed++;
    totalSpent+=spent;if(turnHit!==null){realized++;totalRealization+=turnHit;}
  }
  return {games,strategy,policy,keepableRate:keeps/games,mulliganRate:mulliganGames/games,averageMulligans:totalMulligans/games,averageManaSpent:totalSpent/games,planRealizationRate:realized/games,averageRealizationTurn:realized?totalRealization/realized:null,colorScrewRate:colorAware?colorScrewed/games:null,unsupportedCards:unsupported,modelCoverage:cards.length?1-unsupported.reduce((n,name)=>n+(deck.find(c=>c.card===name)?.quantity||0),0)/cards.length:0};
}

export function evaluateSimulationGate(deck,strategy="Midrange",games=2000,seed=8128){const expert=simulateGoldfish(deck,strategy,games,seed,"expert"),greedy=simulateGoldfish(deck,strategy,games,seed,"greedy");const sensitivity=Math.max(0,expert.planRealizationRate-greedy.planRealizationRate);return {expert,greedy,pilotSensitivity:sensitivity,sensitivityLabel:sensitivity>.12?"high":sensitivity>.05?"moderate":"low",gate:expert.modelCoverage<.8?"unsupported":expert.keepableRate<.65?"consistency-fail":expert.planRealizationRate<.55?"goldfish-fail":"goldfish-pass",warning:"Goldfish results model sequencing without an opponent. They are a viability gate, not a predicted match win rate."};}
function priority(card,strategy,policy,rng){const base=(STRATEGY_WEIGHTS[strategy]?.[card.role]||1)*10-(card.cmc||0);return policy==="greedy"?base+(card.role==="finisher"?8:0)+rng()*8:base;}
function roleValue(role,strategy){return (STRATEGY_WEIGHTS[strategy]?.[role]||1);}
function isLand(card){const role=String(card?.role||"");if(role==="land"||role==="Mana source"||/\bland\b/i.test(role))return true;const type=String(card?.typeLine||card?.type_line||"");if(/\bLand\b/i.test(type))return true;return false;}
function landColors(card){return card?.colorIdentity||[];}
function producedColors(card){return card?.producedMana||[];}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function mulberry32(seed){return()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
