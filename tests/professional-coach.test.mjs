import assert from "node:assert/strict";
import test from "node:test";
import { professionalCoachLens } from "../app/professional-coach.mjs";

const claim=(changes={})=>({author:"Pro One",sourceTitle:"Interview",sourceUrl:"https://example.com/one",publishedAt:"2026-01-01",principle:"Protect the early turns",summary:"Keep enough early interaction to execute the rest of the plan.",format:"Standard",stance:"supports",tags:["tempo"],cards:[],...changes});
test("returns nothing when no approved published knowledge matches",()=>assert.equal(professionalCoachLens({format:"Standard",read:"My mana"},[]),null));
test("retrieves a format-scoped professional principle locally",()=>assert.equal(professionalCoachLens({format:"Standard",read:"Their speed"},[claim()]).principle,"Protect the early turns"));
test("marks multiple independent sources as corroborated",()=>assert.equal(professionalCoachLens({format:"Standard",read:"Their speed"},[claim(),claim({author:"Pro Two",sourceUrl:"https://example.org/two"})]).confidence,"corroborated"));
test("surfaces disagreement instead of manufacturing consensus",()=>assert.equal(professionalCoachLens({format:"Standard",read:"Their speed"},[claim(),claim({author:"Pro Two",sourceUrl:"https://example.org/two",stance:"challenges"})]).disagreement,true));
