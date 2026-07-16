import assert from "node:assert/strict";
import test from "node:test";

import { attachMatches, emptyDeckBench, mergeDeckBenches, recordExperiment } from "../app/deck-bench.mjs";
import { createRecommendation, parseDeck } from "../app/deck-analysis.mjs";
import { buildDecisionMoment } from "../app/decision-moment.mjs";
import { sharedPlayerProfile } from "../app/game-registry.mjs";
import { buildPlayerCharacterSheet } from "../app/player-character-sheet.mjs";
import { analyzeRiftboundStrategy } from "../app/riftbound-analysis.mjs";

test("a player can move from an MTG experiment into Riftbound without losing identity or crossing evidence",()=>{
  const original="22 Mountain\n4 Core Threat\n34 Other Spell";
  const recommendation=createRecommendation(parseDeck(original),"Standard");
  assert.notEqual(recommendation.proposedDeck,original);
  const experiment={id:"journey",deckName:"Red Test",originalDeck:original,proposedDeck:recommendation.proposedDeck,originalFingerprint:"a".repeat(24),proposedFingerprint:"b".repeat(24),status:"testing",startedAt:"2026-07-16T00:00:00Z",intervention:{title:recommendation.title,targetTag:"mana"}};
  let local=recordExperiment(emptyDeckBench(),experiment,"Standard","mtg");
  const matches=Array.from({length:8},(_,index)=>({id:`mtg-${index}`,game:"mtg",source:"arena-player-log",deckFingerprint:"b".repeat(24),result:index<5?"win":"loss",playerDecisions:[{kind:"attack-window",turn:3,tookPressureLine:index%2===0,actors:2},{kind:"resource-window",preservedResource:index%2===1}]}));
  local=attachMatches(local,matches);
  const restored=mergeDeckBenches(emptyDeckBench(),local);
  assert.equal(restored.families[0].revisions[1].matches.length,8);
  const sheet=buildPlayerCharacterSheet({matches});
  assert.equal(sheet.ready,true);
  assert.ok(buildDecisionMoment(matches[0]));
  const identity=sharedPlayerProfile({coachingNotes:"Show the tradeoff and the strongest alternative.",riskPosture:"measured",mtgDecks:restored.families});
  assert.equal(identity.coachingNotes,"Show the tradeoff and the strongest alternative.");
  assert.equal("mtgDecks" in identity,false);

  const catalog={cards:{runner:{name:"Runner",code:"RB-1",text:{richText:{body:"When I move, draw 1."}}},ganker:{name:"Ganker",code:"RB-2",text:{richText:{body:"Ganking. When I attack, deal 2 to a unit."}}},answer:{name:"Answer",code:"RB-3",text:{richText:{body:"Stun a unit, then draw 1."}}}}};
  const riftbound=analyzeRiftboundStrategy([{name:"Runner",quantity:3},{name:"Ganker",quantity:3}],catalog);
  assert.equal(riftbound.primary.key,"movement");
  assert.match(riftbound.testContract,/five games/i);
  const riftExperiment={...experiment,id:"rift-journey",deckName:"Movement Test",originalDeck:"3 Runner\n3 Ganker",proposedDeck:"3 Runner\n3 Ganker",originalFingerprint:"c".repeat(24),proposedFingerprint:"d".repeat(24)};
  const combined=recordExperiment(restored,riftExperiment,"Constructed","riftbound");
  const afterArena=attachMatches(combined,[{id:"must-not-cross",game:"mtg",source:"arena-player-log",deckFingerprint:"d".repeat(24),result:"win"}]);
  const riftFamily=afterArena.families.find(family=>family.game==="riftbound");
  assert.ok(riftFamily);
  assert.equal(riftFamily.revisions.flatMap(revision=>revision.matches).length,0);
});
