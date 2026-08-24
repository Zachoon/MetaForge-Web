import { occupancyEngineLabelsForCommander } from "./knowledge/mentor-shadow.mjs";

export const commanderOracleText = (commander) =>
  String(commander?.verifiedFacts || "")
    .split("Oracle text:\n")
    .slice(1)
    .join("Oracle text:\n")
    .trim();
export const occupancyLabelsForOption = (option) => {
  if (!option?.name) return [];
  return occupancyEngineLabelsForCommander({
    name: option.name,
    typeLine: option.typeLine || "",
    oracleText: commanderOracleText(option),
  });
};
export const FORGE_LANES = ["pressure", "engine", "inevitability"];
export const commanderLaneScores = (commander) => {
  const text = `${commander.typeLine} ${commanderOracleText(commander)}`;
  const count = (pattern) => (text.match(pattern) || []).length;
  return {
    pressure:
      count(/attack|attacking|combat|haste|power|double strike|first strike|deals? damage|firebend/gi) * 3 +
      count(/creature|counter on|can(?:not|'t) block/gi),
    engine:
      count(/create|token|copy|cast|sacrifice|whenever|trigger|draw|counter on|proliferate|food|treasure/gi) * 2 +
      count(/artifact|enchantment|graveyard|exile.+play/gi),
    inevitability:
      count(/counter target|destroy|exile target|return target|tap target|opponent|each player|life|ward|prevent/gi) * 2 +
      count(/draw|graveyard|end step|upkeep/gi),
  };
};
export const arrangeCommanderStarters = (candidates) => {
  const available = [...candidates];
  return FORGE_LANES.flatMap((lane) => {
    if (!available.length) return [];
    let bestIndex = 0;
    for (let index = 1; index < available.length; index += 1)
      if (commanderLaneScores(available[index])[lane] > commanderLaneScores(available[bestIndex])[lane])
        bestIndex = index;
    return available.splice(bestIndex, 1);
  });
};
// Reads the same verifiedFacts oracle-text block already built for every
// commander to detect Partner, "Partner with <name>", and Background
// eligibility — no separate fetch needed, since the text is already on hand
// the moment a commander is chosen.
export const partnerEligibilityFor = (commander) => {
  if (!commander) return null;
  const text = commander.verifiedFacts || "";
  const specificMatch = text.match(/partner with ([^.\n]+)/i);
  if (specificMatch) return { kind: "partner-with", specificName: specificMatch[1].trim() };
  if (/\bpartner\b/i.test(text)) return { kind: "partner" };
  if (/choose a background/i.test(text)) return { kind: "background" };
  return null;
};
