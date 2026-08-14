import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildDeepForgeUnderstandingDossier } from "../app/strategic-stance-voice.mjs";
import {
  containsResearchJargon,
  presentDeepForgeUnderstanding,
  presentDeepForgeUnderstandingEntry,
} from "../app/deep-forge-presentation.mjs";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/forge/deep-forge-dossier.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/components/forge/deep-forge-dossier.css", import.meta.url), "utf8");
const presentation = await readFile(new URL("../app/deep-forge-presentation.mjs", import.meta.url), "utf8");

test("Deep Forge default view is player language with research one click beneath", () => {
  assert.match(page, /DeepForgeDossier/);
  assert.match(page, /What MetaForge noticed — and how sure it is/);
  assert.doesNotMatch(page, /Exact numbers, detected relationships, and methodology/);
  assert.doesNotMatch(page, /CURRENT UNDERSTANDING · RESEARCH/);
  assert.match(component, /What MetaForge noticed/);
  assert.match(component, /What that could mean for this deck/);
  assert.match(component, /How confident we are/);
  assert.match(component, /What would prove this wrong/);
  assert.match(component, /See the research evidence/);
  assert.match(component, /BRAIN STATUS/);
  assert.match(component, /RETIRED IDEAS · STILL VISIBLE/);
  assert.match(css, /\.deep-forge-insight/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("curveLow and Brain-shadow claims become concrete player experience copy", () => {
  const dossier = buildDeepForgeUnderstandingDossier({ commanderName: "Atraxa, Praetors Voice" });
  assert.ok(dossier?.entries?.length);
  const presented = presentDeepForgeUnderstanding(dossier);
  const curve = presented.entries.find((entry) => /cheap early|early plays/i.test(entry.noticed))
    || presented.entries[0];
  assert.ok(curve);
  assert.equal(containsResearchJargon(curve.noticed), false);
  assert.equal(containsResearchJargon(curve.meaning), false);
  assert.doesNotMatch(curve.noticed, /curveLow|Brain inheritance|converter cohorts|structural seat/i);
  assert.match(curve.confidence, /confidence|evidence|signal|question/i);
  assert.ok(curve.proveWrong.length >= 1);
  assert.match(curve.research.claim || "", /./);
  assert.equal(curve.research.brainInheritance, "none");
});

test("absence of evidence is not rendered as support", () => {
  const entry = presentDeepForgeUnderstandingEntry({
    id: "empty",
    claim: "Expert reasoning independently recurs on sequencing as a decision concept.",
    state: "emerging",
    evidence: { tournament: "none", experts: "none", shadow: "none", simulation: "none", notes: [] },
    confidence: { level: "insufficient", score: 0.1 },
    retirementCriteria: ["No further independent expert replication"],
    brainInheritance: "none",
  });
  assert.match(entry.evidenceSummary, /No supporting evidence streams are recorded yet/i);
  assert.doesNotMatch(entry.evidenceSummary, /supports this|confirms this/i);
  assert.match(entry.confidence, /Insufficient evidence/i);
});

test("presentation module stays display-only", () => {
  assert.match(presentation, /writesToBrain: false/);
  assert.doesNotMatch(presentation, /forgeNativeMasterwork|native-masterwork-engine/);
  assert.doesNotMatch(page, /entry\.claim/);
});
