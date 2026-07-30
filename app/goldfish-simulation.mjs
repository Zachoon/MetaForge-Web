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

export function simulateGoldfish(deck, strategy="Midrange", games=1000, seed=8128, policy="expert") {
  const rng=mulberry32(seed); const cards=deck.flatMap(card=>Array(card.quantity).fill(card)); let totalSpent=0,totalRealization=0,realized=0,keeps=0;
  const unsupported=[...new Set(deck.filter(card=>card.role&&!card.role.includes("land")&&!SUPPORTED_ROLES.has(card.role)).map(card=>card.card))];
  const colorAware=deck.some(card=>hasPips(card.colorPips));
  let colorScrewed=0;
  for(let game=0;game<games;game++){
    const library=[...cards];shuffle(library,rng);
    const hand=library.splice(-7);
    const openingLandColors=hand.filter(isLand).map(landColors);
    const openingLands=hand.filter(isLand).length;
    // A hand isn't just "2-5 lands" — it's a trap if none of those lands
    // can produce a color its own nonland cards actually need. Only checks
    // presence of a source, not full pip count: with 7 cards you aren't
    // expected to already hold every double-pip requirement, just not be
    // completely locked out of a color your hand wants to play.
    const colorTrapped=hand.some(card=>!isLand(card)&&hasPips(card.colorPips)&&Object.keys(card.colorPips).some(color=>(card.colorPips[color]||0)>0&&!openingLandColors.some(colors=>colors.includes(color))));
    if(openingLands>=2&&openingLands<=5&&!colorTrapped)keeps++;
    const battlefieldLandColors=[];
    // Ramp spells (search-a-land, treasure-adjacent effects) don't just score
    // value like any other card — they mechanically accelerate every later
    // turn. Modeled as "enters tapped": a ramp spell cast this turn adds a
    // mana source starting next turn, not immediately, matching how the
    // common effects (Rampant Growth, Cultivate) actually resolve.
    let battlefieldLands=0,pendingRamp=0,spent=0,score=0,turnHit=null,firstColoredCastTurn=null;
    for(let turn=1;turn<=8;turn++){
      battlefieldLands+=pendingRamp;pendingRamp=0;
      if(library.length)hand.push(library.pop());
      const landIndex=hand.findIndex(isLand);
      if(landIndex>=0){const landCard=hand[landIndex];hand.splice(landIndex,1);battlefieldLands++;battlefieldLandColors.push(landColors(landCard));}
      let mana=battlefieldLands;
      while(mana>0){
        const castable=hand.filter(card=>!isLand(card)&&(card.cmc??99)<=mana&&canPayPips(battlefieldLandColors,card.colorPips));
        if(!castable.length)break;
        castable.sort((a,b)=>priority(b,strategy,policy,rng)-priority(a,strategy,policy,rng));
        const chosen=castable[0];hand.splice(hand.indexOf(chosen),1);mana-=chosen.cmc||0;spent+=chosen.cmc||0;score+=roleValue(chosen.role,strategy);
        if(chosen.role==="ramp")pendingRamp+=1;
        if(turnHit===null&&score>=8)turnHit=turn;
        if(firstColoredCastTurn===null&&hasPips(chosen.colorPips))firstColoredCastTurn=turn;
      }
    }
    if(colorAware&&firstColoredCastTurn===null)colorScrewed++;
    totalSpent+=spent;if(turnHit!==null){realized++;totalRealization+=turnHit;}
  }
  return {games,strategy,policy,keepableRate:keeps/games,averageManaSpent:totalSpent/games,planRealizationRate:realized/games,averageRealizationTurn:realized?totalRealization/realized:null,colorScrewRate:colorAware?colorScrewed/games:null,unsupportedCards:unsupported,modelCoverage:cards.length?1-unsupported.reduce((n,name)=>n+(deck.find(c=>c.card===name)?.quantity||0),0)/cards.length:0};
}

export function evaluateSimulationGate(deck,strategy="Midrange",games=2000,seed=8128){const expert=simulateGoldfish(deck,strategy,games,seed,"expert"),greedy=simulateGoldfish(deck,strategy,games,seed,"greedy");const sensitivity=Math.max(0,expert.planRealizationRate-greedy.planRealizationRate);return {expert,greedy,pilotSensitivity:sensitivity,sensitivityLabel:sensitivity>.12?"high":sensitivity>.05?"moderate":"low",gate:expert.modelCoverage<.8?"unsupported":expert.keepableRate<.65?"consistency-fail":expert.planRealizationRate<.55?"goldfish-fail":"goldfish-pass",warning:"Goldfish results model sequencing without an opponent. They are a viability gate, not a predicted match win rate."};}
function priority(card,strategy,policy,rng){const base=(STRATEGY_WEIGHTS[strategy]?.[card.role]||1)*10-(card.cmc||0);return policy==="greedy"?base+(card.role==="finisher"?8:0)+rng()*8:base;}
function roleValue(role,strategy){return (STRATEGY_WEIGHTS[strategy]?.[role]||1);}
function isLand(card){return card.role?.includes("land")||card.cmc===undefined;}
function landColors(card){return card?.colorIdentity||[];}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function mulberry32(seed){return()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
