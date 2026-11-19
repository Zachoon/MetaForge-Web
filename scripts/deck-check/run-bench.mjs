// MF-DECK-COACH-002 — run the Deck Check benchmark and score it.
//
//   node scripts/deck-check/run-bench.mjs                    # this checkout
//   node scripts/deck-check/run-bench.mjs --root <checkout>  # another engine
//   node scripts/deck-check/run-bench.mjs --json out.json --md out.md
//
// The fixtures and the expectations always come from this checkout; only the
// engine modules are imported from --root, so the same questions can be put
// to an older engine (the baseline) and to this one.
//
// Scoring is pass/fail per check. Passing checks is not proof that every
// recommendation is strategically right: the checks catch the failure modes
// listed in MF-DECK-COACH-002-20-DECK-BENCHMARK.md, nothing more.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { BENCH_CASES, BOARD_FINISHERS, GO_WIDE, SYMMETRIC_CREATURE_WIPES } from "./bench-cases.mjs";

const here = fileURLToPath(new URL("../../", import.meta.url));
const ROLE_IDS = ["ramp", "draw", "interaction", "wipes", "wincon"];
const FORBIDDEN_TEXT = /\bAI-powered\b|\bwin rate\b|\bguarantee|\bmatchup\b|\$\d|\bprice is\b/i;

async function loadEngine(root) {
  const mod = (path) => import(pathToFileURL(resolve(root, path)).href);
  const [parse, facts, report, coach] = await Promise.all([
    mod("app/deck-check-parse.mjs"),
    mod("app/deck-check-facts.mjs"),
    mod("app/deck-check-report.mjs"),
    mod("app/curve-role-coach.mjs"),
  ]);
  return { ...parse, ...facts, ...report, ...coach };
}

function loadFixture(engine, testCase) {
  const dir = resolve(here, "tests/fixtures", testCase.dir);
  const text = readFileSync(resolve(dir, `${testCase.file}.txt`), "utf8");
  const snapshot = JSON.parse(readFileSync(resolve(dir, `${testCase.file}.facts.json`), "utf8"));
  const facts = {};
  for (const fact of Object.values(snapshot.facts)) engine.indexFact(facts, fact);
  return { text, parsed: engine.parseDecklist(text), facts, notFound: snapshot.notFound, raw: snapshot.facts };
}

function catalogFacts() {
  const snapshot = JSON.parse(readFileSync(resolve(here, "tests/fixtures/deck-bench/swap-catalog.facts.json"), "utf8"));
  return snapshot.facts;
}

function check(results, dimension, name, pass, detail = "") {
  results.push({ dimension, name, pass: Boolean(pass), detail: pass ? "" : detail });
}

function sameSet(a, b) {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function scoreCase(engine, testCase, catalog) {
  const results = [];
  const fixture = loadFixture(engine, testCase);
  let report;
  try {
    report = engine.buildDeckCheckReport({ parsed: fixture.parsed, facts: fixture.facts, notFound: fixture.notFound, format: testCase.format });
  } catch (error) {
    check(results, "runs", "report builds", false, `threw: ${String(error.message).slice(0, 120)}`);
    return { results, report: null, weaknessTexts: [] };
  }
  const expectedStatus = testCase.status || "ready";
  check(results, "runs", "report builds", report.status === expectedStatus, `status ${report.status}, expected ${expectedStatus}`);

  // Legality: the exact set of error codes, and any expected info codes.
  const errors = (report.structure?.issues || []).filter((issue) => issue.severity === "error").map((issue) => issue.code);
  check(results, "legality", "error codes", sameSet(errors, testCase.errors), `got [${[...new Set(errors)].sort()}], expected [${[...testCase.errors].sort()}]`);
  for (const code of testCase.info || []) {
    check(results, "legality", `info ${code}`, (report.structure?.issues || []).some((issue) => issue.code === code), `no ${code} note`);
  }
  check(results, "trust", "no invented numbers or AI claims", !FORBIDDEN_TEXT.test(JSON.stringify(report)), "forbidden phrase in report");
  if (expectedStatus === "structure-only") {
    check(results, "trust", "says coaching is Commander-only", (report.limits || []).some((limit) => /not shown for this format/.test(limit)), "no format limit stated");
    return { results, report, weaknessTexts: [] };
  }
  if (report.status !== "ready") return { results, report, weaknessTexts: [] };

  check(results, "trust", "states no model is called", (report.limits || []).some((limit) => /No AI model is called/.test(limit)), "limit missing");

  // Plan.
  const planId = report.plan?.readId || report.plan?.id;
  if (testCase.plan) check(results, "strategy", "plan read", testCase.plan.includes(planId) || testCase.plan.includes(report.plan?.id), `read ${planId}, expected ${testCase.plan.join("|")}`);

  // Card roles, from the engine's own classifier against printed text.
  for (const [name, expected] of Object.entries(testCase.roles || {})) {
    const fact = fixture.raw[name];
    if (!fact) { check(results, "roles", `${name}`, false, "fact missing"); continue; }
    const flags = engine.classifyPrintedCard(fact);
    const wrong = Object.entries(expected).filter(([key, value]) => (key === "wipeScope" ? flags.wipeScope : Boolean(flags[key])) !== value);
    check(results, "roles", name, wrong.length === 0, wrong.map(([key, value]) => `${key} should be ${value}`).join(", "));
  }

  const weaknesses = (report.weaknesses || []).filter((weakness) => weakness.id !== "sound");
  const ids = weaknesses.map((weakness) => weakness.id);
  for (const id of testCase.forbidWeakness || []) check(results, "false-positive", `no ${id}`, !ids.includes(id), `${id} reported`);
  for (const id of testCase.requireWeakness || []) check(results, "strategy", `finds ${id}`, ids.includes(id), `${id} missing`);
  if (testCase.firstWeakness) check(results, "strategy", `${testCase.firstWeakness} first`, ids[0] === testCase.firstWeakness, `first was ${ids[0]}`);
  const hasWinner = Object.values(fixture.raw).some((fact) => /\byou win the game\b/i.test(fact.oracleText || ""));
  if (hasWinner) {
    check(results, "false-positive", "does not claim nothing ends the game", !weaknesses.some((weakness) => /No card here actually ends the game/.test(weakness.title)), "absolute wincon claim with a printed win card in the list");
  }

  // Specificity: cards from this list, and this list's own counts.
  const deckNames = new Set([...fixture.parsed.entries.map((entry) => entry.name), ...Object.keys(fixture.raw)]);
  check(results, "specificity", "every weakness cites a card in the list", weaknesses.every((weakness) => (weakness.citations || []).length && weakness.citations.every((citation) => deckNames.has(citation.name))), "a weakness cites nothing, or a card not in the list");
  const roleRows = Object.fromEntries((report.roles || []).map((row) => [row.id, row]));
  check(results, "specificity", "role weaknesses state this list's count", weaknesses.filter((weakness) => weakness.id.startsWith("role-")).every((weakness) => new RegExp(`\\b${roleRows[weakness.id.slice(5)]?.actual}\\b`).test(weakness.plain || "")), "count missing from text");

  // Recommendations.
  const identity = new Set(report.identity || report.structure?.identity || []);
  const creatures = Object.values(fixture.raw).filter((fact) => /\bCreature\b/.test(String(fact.typeLine || "").split(" // ")[0])).length;
  const core = new Set(testCase.core || []);
  const typeWord = (report.plan?.id === "typal" || planId === "typal") ? String(report.plan?.label || "").replace(/(?:es|s)$/i, "").replace(/ve$/i, "f") : "";
  for (const comparison of report.comparisons || []) {
    const label = `${comparison.cut} → ${comparison.add}`;
    const addFact = catalog[comparison.add] || fixture.raw[comparison.add];
    const cutFact = fixture.raw[comparison.cut];
    const addColors = addFact?.colorIdentity || [];
    check(results, "swap-validity", `${label}: legal add`, addFact && addColors.every((color) => identity.has(color)) && addFact.legalities?.commander === "legal" && !deckNames.has(comparison.add) && cutFact,
      "add off-identity, not Commander-legal, already in the list, or cut not in the list");
    const offPlan = (GO_WIDE.has(report.plan?.id) && SYMMETRIC_CREATURE_WIPES.has(comparison.add))
      || (BOARD_FINISHERS.has(comparison.add) && creatures < 25)
      || (comparison.add === "Skullclamp" && creatures < 20);
    check(results, "false-positive", `${label}: add fits the plan`, !offPlan, `${comparison.add} works against this deck's plan (${creatures} creatures)`);
    const cutFlags = cutFact ? engine.classifyPrintedCard(cutFact) : {};
    const onType = typeWord && cutFact && new RegExp(`\\b${typeWord}`, "i").test(cutFact.typeLine || "");
    const opensHole = (comparison.tradeOffs || []).some((text) => /falls below/.test(text)) || (comparison.introduced || []).length > 0;
    // A card the format check already flagged (banned, off-identity) has to go, so cutting it is always safe.
    const mustGo = Boolean(comparison.cutFlag) || (report.structure?.issues || []).some((issue) => ["banned", "color-identity", "not-legal"].includes(issue.code) && issue.cards.includes(comparison.cut));
    check(results, "false-positive", `${label}: safe cut`, mustGo || !(core.has(comparison.cut) || cutFlags.tutor || onType || opensHole),
      core.has(comparison.cut) ? "cuts a core plan card" : cutFlags.tutor ? "cuts a tutor" : onType ? "cuts an on-type creature" : "opens a new hole");
    // Before/after: every role moves by exactly what the two cards add and remove.
    const addFlags = addFact ? engine.classifyPrintedCard(addFact) : {};
    const consistent = (comparison.roles || []).every((role) => ROLE_IDS.includes(role.id) ? role.after - role.before === (addFlags[role.id] ? 1 : 0) - (cutFlags[role.id] ? 1 : 0) : true);
    const afterCount = engine.playedCount(engine.parseDecklist(comparison.afterText || ""));
    check(results, "before-after", `${label}: deltas match the two cards`, consistent, "a role moved by more than the swap explains");
    check(results, "before-after", `${label}: updated list keeps its size`, afterCount === engine.playedCount(fixture.parsed), `after list has ${afterCount}`);
  }

  // Uncertainty.
  const u = testCase.uncertainty || {};
  if (u.planConfidenceNot) check(results, "uncertainty", `plan confidence is not ${u.planConfidenceNot}`, report.plan?.confidence?.level !== u.planConfidenceNot, `confidence ${report.plan?.confidence?.level}`);
  if (u.limitMatches) check(results, "uncertainty", "limits name the rough read", (report.limits || []).some((limit) => u.limitMatches.test(limit)), "limit missing");
  if (u.sentenceMatches) check(results, "uncertainty", "plan sentence is honest about the read", u.sentenceMatches.test(report.plan?.sentence || ""), report.plan?.sentence);
  if (u.winconNote) check(results, "uncertainty", "win-condition finding names the combo finish", weaknesses.some((weakness) => weakness.id === "role-wincon" && (weakness.notes || []).some((note) => u.winconNote.test(note))) || !ids.includes("role-wincon"), "no combo note");
  if (u.drawNote) check(results, "uncertainty", "draw finding credits the commander", weaknesses.some((weakness) => weakness.id === "role-draw" && (weakness.notes || []).some((note) => u.drawNote.test(note))) || !ids.includes("role-draw"), "no commander note");
  check(results, "uncertainty", "every finding says strong or heuristic", weaknesses.every((weakness) => ["strong", "heuristic"].includes(weakness.strength)), "finding has no strength label");
  if (testCase.mana?.landsStatus) check(results, "strategy", `lands ${testCase.mana.landsStatus}`, report.mana?.lands?.status === testCase.mana.landsStatus, `lands status ${report.mana?.lands?.status}`);

  return { results, report, weaknessTexts: weaknesses.map((weakness) => weakness.plain || "") };
}

export async function runBench({ root = here } = {}) {
  const engine = await loadEngine(root);
  const catalog = catalogFacts();
  const cases = [];
  const allTexts = [];
  for (const testCase of BENCH_CASES) {
    const { results, report, weaknessTexts } = scoreCase(engine, testCase, catalog);
    allTexts.push(...weaknessTexts);
    const passed = results.filter((result) => result.pass).length;
    cases.push({ id: testCase.id, kind: testCase.kind, format: testCase.format, passed, total: results.length, results, plan: report?.plan?.sentence || "", weaknesses: (report?.weaknesses || []).map((weakness) => weakness.id), comparisons: (report?.comparisons || []).map((comparison) => `${comparison.cut} → ${comparison.add}`) });
  }
  const dimensions = {};
  for (const testCase of cases) {
    for (const result of testCase.results) {
      const entry = dimensions[result.dimension] || (dimensions[result.dimension] = { passed: 0, total: 0 });
      entry.total += 1;
      if (result.pass) entry.passed += 1;
    }
  }
  const unique = new Set(allTexts);
  const passed = cases.reduce((sum, testCase) => sum + testCase.passed, 0);
  const total = cases.reduce((sum, testCase) => sum + testCase.total, 0);
  const falsePositives = cases.flatMap((testCase) => testCase.results.filter((result) => result.dimension === "false-positive" && !result.pass).map((result) => `${testCase.id}: ${result.name} — ${result.detail}`));
  return {
    root,
    cases,
    dimensions,
    passed,
    total,
    score: total ? Number(((passed / total) * 100).toFixed(1)) : 0,
    falsePositives,
    weaknessTexts: { total: allTexts.length, unique: unique.size },
  };
}

function markdown(result) {
  const lines = [];
  lines.push(`Engine: \`${result.root}\``);
  lines.push("");
  lines.push(`**Overall: ${result.passed}/${result.total} checks (${result.score}%)** · false-positive advice: ${result.falsePositives.length} · weakness texts unique: ${result.weaknessTexts.unique}/${result.weaknessTexts.total}`);
  lines.push("");
  lines.push("| Dimension | Passed |");
  lines.push("|---|---|");
  for (const [name, entry] of Object.entries(result.dimensions)) lines.push(`| ${name} | ${entry.passed}/${entry.total} |`);
  lines.push("");
  lines.push("| Case | Kind | Format | Score | Failed checks |");
  lines.push("|---|---|---|---|---|");
  for (const testCase of result.cases) {
    const failed = testCase.results.filter((entry) => !entry.pass).map((entry) => `${entry.name}${entry.detail ? ` (${entry.detail})` : ""}`).join("; ");
    lines.push(`| ${testCase.id} | ${testCase.kind} | ${testCase.format} | ${testCase.passed}/${testCase.total} | ${failed.replace(/\|/g, "/") || "—"} |`);
  }
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const result = await runBench({ root: option("--root") || here });
  if (option("--json")) writeFileSync(option("--json"), `${JSON.stringify(result, null, 1)}\n`);
  if (option("--md")) writeFileSync(option("--md"), `${markdown(result)}\n`);
  console.log(markdown(result));
}
