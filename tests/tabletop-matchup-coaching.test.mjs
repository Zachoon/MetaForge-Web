import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getMatchupCardAdvice } from "../app/tabletop-matchup.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Tabletop Matchup lens — answers, not highlights", () => {
  it("priority Interaction vs Aggro teaches an early-answer verb", () => {
    const advice = getMatchupCardAdvice({
      matchup: "Aggro",
      role: "Interaction",
      cardName: "Swords to Plowshares",
    });
    assert.equal(advice.priority, true);
    assert.match(advice.verdict, /Priority vs Aggro/i);
    assert.match(advice.change, /early|stop|threat/i);
    assert.match(advice.why, /Survive|rush|corner/i);
  });

  it("non-priority Engine piece vs Aggro is marked secondary with hold-back copy", () => {
    const advice = getMatchupCardAdvice({
      matchup: "Aggro",
      role: "Engine piece",
      cardName: "Tireless Provisioner",
    });
    assert.equal(advice.priority, false);
    assert.match(advice.verdict, /Secondary vs Aggro/i);
    assert.match(advice.change, /Not the focus this matchup/i);
  });

  it("wires sticky coach strip + inspector matchup lead in UI", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const tabletop = readFileSync(join(root, "app/tabletop.tsx"), "utf8");
    const css = readFileSync(join(root, "app/tabletop.css"), "utf8");
    const anvil = readFileSync(join(root, "app/testing-anvil.css"), "utf8");

    assert.match(tabletop, /export function getMatchupCardAdvice/);
    assert.match(tabletop, /tabletop-matchup-card-coach/);
    assert.match(tabletop, /VERDICT/);
    assert.match(tabletop, /CHANGE/);
    assert.match(tabletop, /Priority tools for this job/);
    assert.match(tabletop, /Secondary this matchup/);
    assert.doesNotMatch(tabletop, /highlights the packages most likely/);

    assert.match(page, /onMatchupContext/);
    assert.match(page, /forge-context-matchup-coach/);
    assert.match(page, /Structural evidence/);
    assert.match(css, /\.tabletop-matchup-card-coach\b/);
    assert.match(anvil, /\.forge-context-matchup-coach\b/);
  });
});
