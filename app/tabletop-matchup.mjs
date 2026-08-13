// =============================================================================
// Tabletop Matchup coaching — presentation only (Player Surface Law)
// =============================================================================
// Role × seat advice. Not Brain construction. Not per-card telepathy.
// =============================================================================

const freeze = (value) => Object.freeze(value);

export const MATCHUP_ROLES = freeze({
  Aggro: freeze(["Interaction", "Board reset", "Mana source", "Protection"]),
  Control: freeze(["Card advantage", "Protection", "Engine piece", "Threat"]),
  Combo: freeze(["Interaction", "Protection", "Acceleration", "Card advantage"]),
  Midrange: freeze(["Card advantage", "Engine piece", "Threat", "Board reset"]),
});

export const MATCHUP_GUIDANCE = freeze({
  Aggro: freeze({
    goal: "Survive the opening rush, then take over once their hand runs dry.",
    watchFor: "Keep hands that interact early. Spend removal before damage snowballs; save protection for the card that stabilizes the board.",
    roles: freeze({
      Interaction: "Use early to stop their fastest threat.",
      "Board reset": "Hold until it catches multiple threats, unless you would otherwise fall behind.",
      "Mana source": "Prioritize untapped sources so your answers arrive on time.",
      Protection: "Protect the card that stops the bleed, not a replaceable early play.",
    }),
  }),
  Control: freeze({
    goal: "Create more must-answer threats than their removal and counters can cover.",
    watchFor: "Do not expose every engine at once. Develop patiently, force an answer, then resolve the card that matters most.",
    roles: freeze({
      "Card advantage": "Resolve when you can recover from a trade or fight over it.",
      Protection: "Hold for the threat or engine that can win a long game.",
      "Engine piece": "Sequence after you have tested or exhausted their interaction.",
      Threat: "Present one meaningful question at a time to resist sweepers.",
    }),
  }),
  Combo: freeze({
    goal: "Disrupt the key turn while advancing a clock of your own.",
    watchFor: "Know which effect breaks the combo. Keep mana available near their likely go-off turn instead of spending every resource proactively.",
    roles: freeze({
      Interaction: "Reserve for the combo enabler or payoff, not incidental value.",
      Protection: "Use to keep your disruption or fastest clock online.",
      Acceleration: "Use to get ahead without tapping out on the danger turn.",
      "Card advantage": "Dig for disruption only when you can still answer their next turn.",
    }),
  }),
  Midrange: freeze({
    goal: "Win the resource exchanges and make the last meaningful threat stick.",
    watchFor: "Trade efficiently, but avoid spending premium answers on replaceable cards. Preserve the engine that gives you inevitability.",
    roles: freeze({
      "Card advantage": "Use to pull ahead after the first wave of trades.",
      "Engine piece": "Protect if it will keep generating value across several turns.",
      Threat: "Sequence from expendable to essential so the best one survives.",
      "Board reset": "Use when behind on board, not merely to trade one-for-one.",
    }),
  }),
});

const SECONDARY_CHANGE =
  "Not the focus this matchup — develop after answers and stabilization are online.";

/**
 * Role × matchup coaching. Honest about seat-level advice, not per-card telepathy.
 */
export function getMatchupCardAdvice({
  matchup,
  role,
  cardName = "",
} = {}) {
  const seat = matchup;
  const cardRole = String(role || "Utility").trim() || "Utility";
  const guidance = MATCHUP_GUIDANCE[seat];
  if (!guidance) {
    return freeze({
      matchup: seat,
      cardName: String(cardName || "").trim(),
      role: cardRole,
      priority: false,
      verdict: `Secondary · ${cardRole}`,
      change: SECONDARY_CHANGE,
      why: "Pick a matchup seat to get concrete coaching.",
    });
  }
  const priority = MATCHUP_ROLES[seat].includes(cardRole);
  const change = priority
    ? (guidance.roles[cardRole] || "Use this card to advance the matchup plan.")
    : SECONDARY_CHANGE;
  return freeze({
    matchup: seat,
    cardName: String(cardName || "").trim(),
    role: cardRole,
    priority,
    verdict: priority
      ? `Priority vs ${seat} · ${cardRole}`
      : `Secondary vs ${seat} · ${cardRole}`,
    change,
    why: guidance.goal,
  });
}
