const LEVELS = [
  { at:0, name:"Apprentice", next:3 }, { at:3, name:"Observer", next:8 },
  { at:8, name:"Analyst", next:15 }, { at:15, name:"Strategist", next:25 },
  { at:25, name:"Forgeborn", next:null },
];

export function inferCoachingTarget(recommendation = {}) {
  const text = `${recommendation.title || ""} ${recommendation.summary || ""} ${recommendation.expectedGain || ""}`.toLowerCase();
  if (/mana|land|color access|cast/.test(text)) return "My mana";
  if (/early|speed|tempo|turn two|turn-three/.test(text)) return "Their speed";
  if (/draw|card advantage|resource/.test(text)) return "I ran out of cards";
  if (/removal|interaction|answer|threat/.test(text)) return "I lacked an answer";
  return null;
}

export function coachingProgress(debriefs = []) {
  const reviewed = new Set(debriefs.map((item) => item.matchId)).size;
  const level = [...LEVELS].reverse().find((item) => reviewed >= item.at) || LEVELS[0];
  const grouped = new Map();
  for (const item of debriefs) { const key = `${item.deckFingerprint || "unknown"}|${item.read}`; grouped.set(key, (grouped.get(key) || 0) + 1); }
  const patternsCaught = [...grouped.values()].filter((count) => count >= 3).length;
  const plansConfirmed = debriefs.filter((item) => item.read === "My plan worked").length;
  return { reviewed, level:level.name, patternsCaught, plansConfirmed,
    nextAt:level.next, remaining:level.next ? Math.max(0, level.next-reviewed) : 0,
    progress:level.next ? (reviewed-level.at)/(level.next-level.at) : 1 };
}

export function evaluateIntervention(intervention, debriefs = []) {
  if (!intervention?.targetTag) return { status:"unmeasured", label:"Learning target not tagged", detail:"Keep collecting focused debriefs." };
  const before = debriefs.filter((item) => item.deckFingerprint === intervention.originalFingerprint);
  const after = debriefs.filter((item) => item.deckFingerprint === intervention.proposedFingerprint);
  const beforeHits = before.filter((item) => item.read === intervention.targetTag).length;
  const afterHits = after.filter((item) => item.read === intervention.targetTag).length;
  if (after.length < 3) return { status:"testing", label:`${after.length}/3 focused debriefs`, detail:`Watching for: ${intervention.targetTag}.` };
  if (beforeHits >= 2 && afterHits === 0) return { status:"promising", label:"Target issue has not repeated", detail:"Promising—not proven. Continue the exact revision." };
  if (afterHits >= 2) return { status:"unresolved", label:"Target issue is repeating", detail:"The intervention has not solved its stated problem yet." };
  return { status:"mixed", label:"Signal remains mixed", detail:"Hold the revision steady until the pattern is clearer." };
}
