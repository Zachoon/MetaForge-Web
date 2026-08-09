const WINDOWS = new Set(["mulligan", "sequencing", "combat", "resource", "interaction", "other"]);
const ROLES = new Set(["pressure", "defense", "pivot", "uncertain"]);
const clean = (value, limit) => String(value || "").trim().slice(0, limit);

export function createPilotingDebrief(input = {}) {
  const chosenLine = clean(input.chosenLine, 500);
  const alternativeLine = clean(input.alternativeLine, 500);
  if (!chosenLine || !alternativeLine) throw new Error("Record both the chosen line and one legal alternative");
  const decision = Object.freeze({
    window: WINDOWS.has(input.window) ? input.window : "other",
    role: ROLES.has(input.role) ? input.role : "uncertain",
    knownInformation: clean(input.knownInformation, 800),
    chosenLine,
    alternativeLine,
    observedPunishment: clean(input.observedPunishment, 800),
  });
  return Object.freeze({
    read: clean(input.read, 120) || "I found a decision to review",
    detail: `At the ${decision.window} window, the player chose “${chosenLine}” and identified “${alternativeLine}” as an alternative.`,
    decisionMoments: Object.freeze([decision]),
    boundary: "This captures the decision for comparison. It does not declare a misplay without legal-state and outcome-independent evidence.",
  });
}
