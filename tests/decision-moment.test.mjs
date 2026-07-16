import assert from "node:assert/strict";import test from "node:test";import {buildDecisionMoment}from"../app/decision-moment.mjs";
test("turns an explicit attack into a bounded coaching moment",()=>{const moment=buildDecisionMoment({playerDecisions:[{kind:"attack-window",turn:3,tookPressureLine:true,actors:2}]});assert.equal(moment.title,"You chose pressure.");assert.match(moment.detail,/not proof/) });
test("does not invent a decision moment from a result",()=>assert.equal(buildDecisionMoment({result:"loss"}),null));
