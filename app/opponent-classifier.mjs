import CARD_FACTS from "./standard-card-facts.mjs";

const COLORS = ["W", "U", "B", "R", "G"];

export function classifyRevealedOpponent(cardNames = []) {
  let colorMask = 0;
  const signals = { aggro: 0, interaction: 0, draw: 0, ramp: 0 };
  const known = [];
  for (const name of new Set(cardNames)) {
    const facts = CARD_FACTS[name.toLocaleLowerCase()];
    if (!facts) continue;
    known.push(facts[0]);
    colorMask |= facts[1] || 0;
    const strategy = facts[2] || 0;
    signals.aggro += Number(Boolean(strategy & 1));
    signals.interaction += Number(Boolean(strategy & 2));
    signals.draw += Number(Boolean(strategy & 4));
    signals.ramp += Number(Boolean(strategy & 8));
  }
  const colors = COLORS.filter((_, index) => colorMask & (1 << index));
  let strategy = "Unknown";
  if (signals.aggro >= 2 && signals.aggro >= signals.interaction) strategy = "Aggro";
  else if (signals.interaction + signals.draw >= 2 && signals.aggro <= 1) strategy = "Control";
  else if (signals.ramp >= 2) strategy = "Ramp";
  else if (known.length >= 3) strategy = "Midrange";
  const confidence = known.length >= 8 ? "moderate" : known.length >= 4 ? "developing" : "low";
  return { strategy, colors, confidence, revealedCount: known.length, signals };
}
