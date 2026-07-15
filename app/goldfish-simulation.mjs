const SUPPORTED_ROLES = new Set(["removal","counter","draw","sweeper","stabilizer","finisher"]);
const STRATEGY_WEIGHTS = { Aggro:{stabilizer:4,finisher:3,draw:1}, Tempo:{stabilizer:3,counter:3,draw:2,finisher:1}, Midrange:{stabilizer:3,draw:2,removal:2,finisher:2}, Control:{draw:3,counter:3,removal:2,sweeper:2,finisher:1}, Ramp:{draw:2,finisher:4} };

export function simulateGoldfish(deck, strategy="Midrange", games=1000, seed=8128, policy="expert") {
  const rng=mulberry32(seed); const cards=deck.flatMap(card=>Array(card.quantity).fill(card)); let totalSpent=0,totalRealization=0,realized=0,keeps=0;
  const unsupported=[...new Set(deck.filter(card=>card.role&&!card.role.includes("land")&&!SUPPORTED_ROLES.has(card.role)).map(card=>card.card))];
  for(let game=0;game<games;game++){const library=[...cards];shuffle(library,rng);let hand=library.splice(-7),lands=hand.filter(isLand).length;if(lands>=2&&lands<=5)keeps++;let battlefieldLands=0,spent=0,score=0,turnHit=null;
    for(let turn=1;turn<=8;turn++){if(library.length)hand.push(library.pop());const land=hand.findIndex(isLand);if(land>=0){hand.splice(land,1);battlefieldLands++;}let mana=battlefieldLands;while(mana>0){const castable=hand.filter(card=>!isLand(card)&&(card.cmc??99)<=mana);if(!castable.length)break;castable.sort((a,b)=>priority(b,strategy,policy,rng)-priority(a,strategy,policy,rng));const chosen=castable[0];hand.splice(hand.indexOf(chosen),1);mana-=chosen.cmc||0;spent+=chosen.cmc||0;score+=roleValue(chosen.role,strategy);if(turnHit===null&&score>=8)turnHit=turn;} }
    totalSpent+=spent;if(turnHit!==null){realized++;totalRealization+=turnHit;}
  }
  return {games,strategy,policy,keepableRate:keeps/games,averageManaSpent:totalSpent/games,planRealizationRate:realized/games,averageRealizationTurn:realized?totalRealization/realized:null,unsupportedCards:unsupported,modelCoverage:cards.length?1-unsupported.reduce((n,name)=>n+(deck.find(c=>c.card===name)?.quantity||0),0)/cards.length:0};
}

export function evaluateSimulationGate(deck,strategy="Midrange",games=2000,seed=8128){const expert=simulateGoldfish(deck,strategy,games,seed,"expert"),greedy=simulateGoldfish(deck,strategy,games,seed,"greedy");const sensitivity=Math.max(0,expert.planRealizationRate-greedy.planRealizationRate);return {expert,greedy,pilotSensitivity:sensitivity,sensitivityLabel:sensitivity>.12?"high":sensitivity>.05?"moderate":"low",gate:expert.modelCoverage<.8?"unsupported":expert.keepableRate<.65?"consistency-fail":expert.planRealizationRate<.55?"goldfish-fail":"goldfish-pass",warning:"Goldfish results model sequencing without an opponent. They are a viability gate, not a predicted match win rate."};}
function priority(card,strategy,policy,rng){const base=(STRATEGY_WEIGHTS[strategy]?.[card.role]||1)*10-(card.cmc||0);return policy==="greedy"?base+(card.role==="finisher"?8:0)+rng()*8:base;}
function roleValue(role,strategy){return (STRATEGY_WEIGHTS[strategy]?.[role]||1);}
function isLand(card){return card.role?.includes("land")||card.cmc===undefined;}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function mulberry32(seed){return()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
