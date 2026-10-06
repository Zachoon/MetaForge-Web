import assert from 'node:assert/strict';
import test, {before,after} from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
let directory,render;
before(async()=>{
  directory=mkdtempSync(join(root,'node_modules','.guided-review-'));
  const outfile=join(directory,'render.mjs');
  await build({stdin:{contents:`import {createElement} from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {GuidedCompletionReview} from ${JSON.stringify(join(root,'app/components/forge/guided-completion-review.tsx'))}; import {GuidedDraftCard} from ${JSON.stringify(join(root,'app/components/forge/guided-draft-card.tsx'))}; export function render(value,draft=false){globalThis.__reviewContext=value;return renderToStaticMarkup(createElement(draft?GuidedDraftCard:GuidedCompletionReview));}`,resolveDir:directory,loader:'js'},outfile,bundle:true,platform:'node',format:'esm',jsx:'automatic',external:['react','react/jsx-runtime','react-dom/server'],plugins:[{name:'session-fixture',setup(b){b.onResolve({filter:/forge-session-context$/},()=>({path:'context',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const useForgeSession=()=>globalThis.__reviewContext;',loader:'js'}));}}]});
  ({render}=await import(pathToFileURL(outfile).href));
});
after(()=>rmSync(directory,{recursive:true,force:true}));
const reviewContext=(overrides={})=>({hasValidatedDeck:true,guidedReview:{kept:['My pick'],missing:[],added:[{quantity:2,name:'Added card'}],preferences:{commonsOnly:true,maxCardPrice:5}},deckIntegrity:{checking:false,passed:true,issues:[]},deckPriceTotal:{unpricedCards:0},honestCoachSummary:{coachingAllowed:true,intentions:{accomplish:'Establish the engine.',establish:'Keep an early ramp hand.',firstVulnerability:'Protect it before committing.'},uncertaintyLead:'Table speed is uncertain.'},cardFacts:{'added card':{name:'Added card',rarity:'common',prices:{usd:'2'}}},...overrides});
test('completed review separates player picks and additions and uses existing coaching',()=>{
  const html=render(reviewContext());assert.match(html,/1 of your picks kept/);assert.match(html,/Forge added 2 cards/);assert.match(html,/My pick/);assert.match(html,/2 Added card/);assert.match(html,/structure checks passed/);assert.match(html,/meet the requested filters/);assert.match(html,/Keep an early ramp hand/);assert.match(html,/Table speed is uncertain/);
});
test('unknown evidence and violations never claim filter or legality success',()=>{
  const unknown=render(reviewContext({cardFacts:{},deckIntegrity:{checking:true,passed:false,issues:[]},deckPriceTotal:{unpricedCards:2}}));assert.match(unknown,/2 cards have unknown prices/);assert.match(unknown,/still need price or printing verification/);assert.doesNotMatch(unknown,/meet the requested filters|structure checks passed/);
  const invalid=render(reviewContext({cardFacts:{'added card':{rarity:'rare',prices:{usd:'8'}}}}));assert.match(invalid,/not common/);assert.match(invalid,/exceeds/);assert.doesNotMatch(invalid,/meet the requested filters/);
});
test('review stays hidden until a completed deck exists',()=>assert.equal(render(reviewContext({hasValidatedDeck:false})),''));
test('saved draft offers explicit resume, discard and export; conflict exposes both choices',()=>{
  const context={chamber:'entrance',guidedAvailableDraft:{draft:{commander:{name:'Commander'},session:{accepted:['Pick']}}},guidedSaveStatus:'Saved to your account'};
  const saved=render(context,true);assert.match(saved,/Resume build/);assert.match(saved,/Start over/);assert.match(saved,/Export picks/);
  const conflict=render({...context,guidedConflict:{phase:'completing'}},true);assert.match(conflict,/Use account copy/);assert.match(conflict,/<button disabled="">Keep this device/);
});
