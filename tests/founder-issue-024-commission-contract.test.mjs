import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  applyFantasyNarrator,
  buildCommissionContract,
  parseCommissionContract,
} from "../app/commission-contract.mjs";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";
import { buildStrategicRecognition } from "../app/strategic-recognition.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const JAY_NOTE =
  "Build me a Commander deck around Doubling Season Superfriends. I don't mind if it isn't the strongest version. I want the deck to feel like a true Superfriends deck where Doubling Season is one of the stars of the show.";

function jaySelected() {
  return {
    evaluation: { cohesion: 78, resilience: 72, roleCoverage: 0.7 },
    strategicIntent: {
      strategy: "Focused",
      packages: [{ id: "tokens", label: "Tokens package" }],
      blueprint: { promises: ["+1/+1 counter growth"] },
      commanders: [{ name: "Atraxa, Praetors' Voice" }],
    },
    strategicCohesionGate: { ok: true },
    slotJustificationLedger: { critique: { weaklyJustified: [] } },
    rows: [
      { name: "Atraxa, Praetors' Voice", quantity: 1, roles: ["commander"], typeLine: "Legendary Creature — Phyrexian Angel Horror" },
      { name: "Doubling Season", quantity: 1, typeLine: "Enchantment" },
      { name: "Jace, the Mind Sculptor", quantity: 1, typeLine: "Legendary Planeswalker — Jace" },
      { name: "Teferi, Hero of Dominaria", quantity: 1, typeLine: "Legendary Planeswalker — Teferi" },
      { name: "Narset Transcendent", quantity: 1, typeLine: "Legendary Planeswalker — Narset" },
      { name: "Chandra, Torch of Defiance", quantity: 1, typeLine: "Legendary Planeswalker — Chandra" },
      { name: "Sol Ring", quantity: 1, typeLine: "Artifact" },
    ],
  };
}

function system(signal, name, { health = 80, members = 6, edges = 4 } = {}) {
  return {
    id: signal,
    signal,
    name,
    members: Array.from({ length: members }, (_, i) => `${name} Piece ${i}`),
    edges: Array.from({ length: edges }, () => ({})),
    health: { overall: health, cohesion: health },
    producers: [],
    payoffs: [],
  };
}

describe("Founder Issue #024 — Commission Contract", () => {
  it("does not invent Brain construction imports", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../app/commission-contract.mjs", import.meta.url), "utf8");
    assert.doesNotMatch(source, /native-masterwork-engine|package-plan-optimizer|prospective-slot-delta/);
    assert.match(source, /writesToBrain:\s*false/);
  });

  it("parses fantasy, anchor, and theme-priority from the Jay commission", () => {
    const parsed = parseCommissionContract({
      note: JAY_NOTE,
      commanderName: "Atraxa, Praetors' Voice",
    });
    assert.equal(parsed.writesToBrain, false);
    assert.ok(parsed.hasContract);
    assert.ok(parsed.youAskedFor.some((entry) => entry.role === "fantasy" && entry.label === "Superfriends"));
    assert.ok(parsed.youAskedFor.some((entry) => entry.role === "anchor" && entry.label === "Doubling Season"));
    assert.ok(parsed.youAskedFor.some((entry) => entry.role === "priority"));
    assert.equal(parsed.playerFantasy?.protagonist, "Planeswalkers");
    assert.match(parsed.playerFantasy.tableWhy, /planeswalker|Doubling Season/i);
  });

  it("grades light walker density as a partial / weak match, not silent success", () => {
    const contract = buildCommissionContract({
      note: JAY_NOTE,
      commanderName: "Atraxa, Praetors' Voice",
      selected: jaySelected(),
    });
    assert.equal(contract.writesToBrain, false);
    assert.match(contract.principle, /contract/i);
    assert.ok(Number.isFinite(contract.matchPercent));
    assert.ok(contract.matchPercent < 80, "four walkers should not look like a strong Superfriends match");
    const fantasyGrade = contract.whatIBuilt.find((entry) => /superfriends/i.test(entry.label));
    assert.equal(fantasyGrade.status, "partial");
    assert.equal(fantasyGrade.densityScored, true);
    const anchorGrade = contract.whatIBuilt.find((entry) => entry.label === "Doubling Season");
    assert.equal(anchorGrade.status, "met");
  });

  it("does not inflate match % with soft-heard fantasies that lack density scoring", () => {
    const contract = buildCommissionContract({
      note: "Build a token aristocrats deck that feels thematic",
      commanderName: "Teysa Karlov",
      selected: {
        rows: [
          { name: "Teysa Karlov", quantity: 1, typeLine: "Legendary Creature — Human Spirit" },
          { name: "Sol Ring", quantity: 1, typeLine: "Artifact" },
        ],
      },
    });
    const soft = contract.whatIBuilt.filter((entry) => entry.densityScored === false);
    assert.ok(soft.length >= 1);
    assert.equal(contract.matchPercent, null);
    assert.match(contract.matchLabel, /density not scored/i);
    assert.match(contract.matchHonesty || "", /do not inflate/i);
  });

  it("narrates Stax as a Player Fantasy when commissioned", () => {
    const parsed = parseCommissionContract({
      note: "I want a true stax deck that taxes the table",
      commanderName: "Grand Arbiter Augustin IV",
    });
    assert.equal(parsed.playerFantasy?.id, "stax");
    assert.match(parsed.playerFantasy.tableWhy, /tax|lock|resource/i);
  });

  it("filters coach narration through Player Fantasy instead of mechanism taxonomy", () => {
    const atraxaSystems = {
      systems: [
        system("evasion", "Evasion Engine", { health: 88, members: 10, edges: 12 }),
        system("treasure", "Treasure Engine", { health: 70, members: 5, edges: 4 }),
        system("counters", "Counter Engine", { health: 84, members: 9, edges: 11 }),
      ],
      strongestSystem: { name: "Evasion Engine", signal: "evasion" },
      weakestSystem: { name: "Treasure Engine", signal: "treasure" },
    };
    const contract = buildCommissionContract({
      note: JAY_NOTE,
      commanderName: "Atraxa, Praetors' Voice",
      selected: jaySelected(),
    });
    const recognition = buildStrategicRecognition({
      structuralSystems: atraxaSystems,
      packageLabels: ["+1/+1 counter growth"],
      commanderName: "Atraxa, Praetors' Voice",
    });
    const narrated = applyFantasyNarrator({ recognition, commissionContract: contract });
    assert.match(narrated.tableWhy, /planeswalker|Doubling Season/i);
    assert.doesNotMatch(narrated.tableWhy, /^Evasion Engine$/i);
    assert.equal(narrated.hierarchy.pressurePoint, null, "Treasure must not headline coach CHANGE under Superfriends");
    assert.equal(narrated.hierarchy.supportSoftSpot, "Treasure Engine");
    assert.equal(narrated.resolvedSignal, "counters", "Pilot must follow Superfriends, not measured Treasure/Evasion");

    const summary = buildHonestCoachSummary({
      selected: jaySelected(),
      structuralSystems: atraxaSystems,
      commissionNote: JAY_NOTE,
      activeCommanderName: "Atraxa, Praetors' Voice",
      deckCardNames: jaySelected().rows.map((row) => row.name),
    });
    assert.equal(summary.version, "honest-coach-v0.9");
    assert.ok(summary.commissionContract?.hasContract);
    assert.match(summary.planStory.title, /planeswalker|Doubling Season/i);
    assert.match(summary.intentions.accomplish, /planeswalker|Doubling Season/i);
    assert.equal(summary.commissionMismatch, true);
    assert.match(summary.headline, /Superfriends|partly kept/i);
    assert.doesNotMatch(summary.strengths.join(" "), /Clearest engine so far: Evasion/i);
    // Default coach beats must not mention Treasure/ramp at all.
    assert.doesNotMatch(summary.intentions.firstVulnerability, /Watch your treasure and ramp pieces first/i);
    assert.doesNotMatch(
      [
        summary.intentions.accomplish,
        summary.intentions.establish,
        summary.intentions.dependsOn,
        summary.intentions.firstVulnerability,
        summary.planStory?.stop,
        summary.planStory?.early,
      ].join("\n"),
      /Treasure Engine|treasure and ramp|overvalue treasure|treasure is support/i,
    );
    assert.match(summary.intentions.establish, /counter|proliferate|planeswalker/i);
    assert.match(
      summary.intentions.firstVulnerability,
      /protect|planeswalker|Superfriends|counter|Doubling Season/i,
    );
  });

  it("wires Commission Contract into masterworks + coach UI", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    // The coach brief's full commission breakdown ("WHAT STILL NEEDS WORK" /
    // "Full commission breakdown") moved off the always-mounted deck page
    // and onto /research (see app/research/page.tsx) — the masterworks
    // candidate-choice ceremony screen still renders its own "1 · I HEARD
    // YOU" / "You asked for" / commission-verdict summary directly in
    // page.tsx, untouched by that move.
    const researchPage = readFileSync(join(root, "app/research/page.tsx"), "utf8");
    const css = readFileSync(join(root, "app/testing-anvil.css"), "utf8");
    // The masterworks chamber's own commission-contract summary moved to
    // its own component during the page.tsx decomposition (Phase 4 Stage 3).
    const masterworksChamber = readFileSync(join(root, "app/components/forge/masterworks-chamber.tsx"), "utf8");
    assert.match(masterworksChamber, /1 · I HEARD YOU/);
    assert.match(masterworksChamber, /You asked for/);
    assert.match(researchPage, /WHAT STILL NEEDS WORK|Full commission breakdown/);
    assert.match(page, /buildCommissionContract/);
    assert.match(researchPage, /commissionContract/);
    assert.match(page, /commission-verdict/);
    assert.match(css, /\.commission-verdict\b/);
    assert.match(css, /\.commission-built-list\b/);
  });
});
