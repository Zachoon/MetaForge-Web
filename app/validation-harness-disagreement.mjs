// =============================================================================
// Validation Harness — Brain-built vs corpus list disagreement
// =============================================================================
// Field Validation milestone step 3: compare forgeNativeMasterwork output to
// tournament-shaped corpus lists in the **same** report family.
//
// Observational only. Does not change construction weights or planning.
// Fixture corpus is not live Commander truth.
// writesToBrain: false
// =============================================================================

import { TORTURE_FIXTURES } from "../tests/commander-torture-bench/fixtures.mjs";
import { forgeNativeMasterwork, forgeImportedMasterwork } from "./native-masterwork-engine.mjs";
import {
  buildValidationRecord,
} from "./validation-harness.mjs";
import {
  loadOfflineFieldCorpusCases,
  withCorpusProvenance,
} from "./validation-harness-corpus.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export const LIST_DISAGREEMENT_VERSION = "list-disagreement-v1";

function normalized(name = "") {
  return String(name || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BASIC_LANDS = new Set(
  ["plains", "island", "swamp", "mountain", "forest", "wastes"].map(normalized),
);

function isSkippableRow(row, commanderName = "") {
  const name = normalized(row?.name);
  if (!name) return true;
  if (BASIC_LANDS.has(name)) return true;
  if (commanderName && name === normalized(commanderName)) return true;
  const type = String(row?.typeLine || row?.type_line || "");
  if (/\bLand\b/i.test(type) && !/\bCreature\b|\bArtifact\b|\bEnchantment\b/i.test(type)) {
    return true;
  }
  return false;
}

function spellNameSet(rows = [], commanderName = "") {
  const set = new Set();
  for (const row of rows || []) {
    if (isSkippableRow(row, commanderName)) continue;
    set.add(normalized(row.name));
  }
  return set;
}

function displayNames(keys, rows = []) {
  const byKey = new Map();
  for (const row of rows || []) {
    const key = normalized(row?.name);
    if (key && !byKey.has(key)) byKey.set(key, String(row.name));
  }
  return [...keys].map((key) => byKey.get(key) || key).sort((a, b) => a.localeCompare(b));
}

/**
 * Compare two finished decklists (Brain-built vs corpus/import).
 */
export function compareConstructedLists({
  brainRows = [],
  corpusRows = [],
  commanderName = "",
} = {}) {
  const brain = spellNameSet(brainRows, commanderName);
  const corpus = spellNameSet(corpusRows, commanderName);
  const shared = [...brain].filter((key) => corpus.has(key));
  const onlyBrain = [...brain].filter((key) => !corpus.has(key));
  const onlyCorpus = [...corpus].filter((key) => !brain.has(key));
  const union = new Set([...brain, ...corpus]);
  const jaccard = union.size ? shared.length / union.size : 1;
  const brainCoverageOfCorpus = corpus.size ? shared.length / corpus.size : null;
  const corpusCoverageOfBrain = brain.size ? shared.length / brain.size : null;

  return freeze({
    version: LIST_DISAGREEMENT_VERSION,
    writesToBrain: false,
    commanderName: commanderName || null,
    brainSpellCount: brain.size,
    corpusSpellCount: corpus.size,
    sharedCount: shared.length,
    onlyBrainCount: onlyBrain.length,
    onlyCorpusCount: onlyCorpus.length,
    jaccard: round(jaccard),
    brainCoverageOfCorpus: brainCoverageOfCorpus == null ? null : round(brainCoverageOfCorpus),
    corpusCoverageOfBrain: corpusCoverageOfBrain == null ? null : round(corpusCoverageOfBrain),
    onlyBrain: freeze(displayNames(onlyBrain, brainRows).slice(0, 24)),
    onlyCorpus: freeze(displayNames(onlyCorpus, corpusRows).slice(0, 24)),
    sharedSample: freeze(displayNames(shared, [...brainRows, ...corpusRows]).slice(0, 12)),
  });
}

function nativeInputFromCorpusCase(caseSpec) {
  const commanderName = caseSpec?.forgeInput?.commander?.name || "";
  const poolFixture = TORTURE_FIXTURES.find(
    (fixture) => normalized(fixture.commander?.name) === normalized(commanderName),
  );
  return freeze({
    format: caseSpec.forgeInput.format || "Commander",
    target: caseSpec.forgeInput.target || 100,
    strategy: "Balanced midrange",
    seed: caseSpec.seed,
    commander: caseSpec.forgeInput.commander,
    note: poolFixture?.note || "",
    cards: caseSpec.forgeInput.cards,
  });
}

/**
 * Run Brain-built + corpus-import forges for one harness case and attach disagreement.
 */
export function runListDisagreementCase(caseSpec) {
  const started = Date.now();
  let brainReport = null;
  let corpusReport = null;
  let brainError = null;
  let corpusError = null;

  try {
    brainReport = forgeNativeMasterwork(nativeInputFromCorpusCase(caseSpec));
  } catch (err) {
    brainError = err;
  }
  try {
    corpusReport = forgeImportedMasterwork(caseSpec.forgeInput);
  } catch (err) {
    corpusError = err;
  }

  const brainRecord = withCorpusProvenance(
    buildValidationRecord(caseSpec, brainReport, brainError, Date.now() - started),
    caseSpec,
  );

  const disagreement = (brainReport?.selected?.rows && corpusReport?.selected?.rows)
    ? compareConstructedLists({
      brainRows: brainReport.selected.rows,
      corpusRows: corpusReport.selected.rows,
      commanderName: caseSpec.forgeInput?.commander?.name || "",
    })
    : freeze({
      version: LIST_DISAGREEMENT_VERSION,
      writesToBrain: false,
      unavailable: true,
      reason: brainError?.message || corpusError?.message || "missing_selected_rows",
    });

  return freeze({
    ...brainRecord,
    forgePath: "native-vs-imported",
    listDisagreement: disagreement,
    paired: freeze({
      brainEngine: brainReport?.engine || null,
      corpusEngine: corpusReport?.engine || null,
      brainPassed: Boolean(brainRecord.passed),
      corpusHardFailures: corpusError ? freeze([String(corpusError.message || corpusError)]) : freeze([]),
    }),
  });
}

/**
 * Expand offline corpus cases and run disagreement observation.
 */
export function runOfflineListDisagreement(options = {}) {
  const packed = loadOfflineFieldCorpusCases(options);
  const records = packed.cases.map((caseSpec) => runListDisagreementCase(caseSpec));
  return freeze({
    version: LIST_DISAGREEMENT_VERSION,
    writesToBrain: false,
    source: packed.source,
    records: freeze(records),
  });
}

/**
 * Aggregate disagreement across a harness run.
 */
export function summarizeListDisagreement(records = []) {
  const rows = (records || []).map((record) => record?.listDisagreement).filter(Boolean);
  const usable = rows.filter((row) => !row.unavailable && Number.isFinite(row.jaccard));
  if (!usable.length) {
    return freeze({
      present: false,
      note: "No Brain-vs-corpus list disagreements in this run.",
    });
  }
  const mean = (key) => round(
    usable.reduce((sum, row) => sum + Number(row[key] || 0), 0) / usable.length,
  );
  const lowOverlap = usable
    .filter((row) => row.jaccard < 0.25)
    .sort((a, b) => a.jaccard - b.jaccard)
    .slice(0, 5)
    .map((row) => freeze({
      commanderName: row.commanderName,
      jaccard: row.jaccard,
      onlyBrainCount: row.onlyBrainCount,
      onlyCorpusCount: row.onlyCorpusCount,
    }));

  return freeze({
    present: true,
    adapterVersion: LIST_DISAGREEMENT_VERSION,
    cases: usable.length,
    meanJaccard: mean("jaccard"),
    meanBrainCoverageOfCorpus: mean("brainCoverageOfCorpus"),
    meanCorpusCoverageOfBrain: mean("corpusCoverageOfBrain"),
    meanOnlyBrainCount: mean("onlyBrainCount"),
    meanOnlyCorpusCount: mean("onlyCorpusCount"),
    lowOverlapSamples: freeze(lowOverlap),
    honesty: "Compares Brain-built lists to tournament-shaped corpus imports. Fixture corpus is not live truth. Construction unchanged.",
    writesToBrain: false,
  });
}
