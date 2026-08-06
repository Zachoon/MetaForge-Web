// Per-card "Intent + Clock" coaching read — server-only reasoning, the
// same family as native-masterwork-reasoning.mjs and
// review-focus-reasoning.mjs. Turns a card's already-detected signal (its
// commander-power-signal category, or its general display role when no
// power-signal category matches) into a plain-language answer to two
// questions a player actually asks at the table: what is this card trying
// to do, and when does that actually start mattering?
//
// Every category below reaches back to a real, existing signal — nothing
// here re-derives oracle-text detection of its own:
//   - powerSignalCategoryFor (commander-power-signal.mjs) supplies the
//     seven high-ceiling categories (fastMana, tutor, extraTurn,
//     massLandDenial, efficientInteraction, repeatableValueEngine,
//     resourceMultiplier) — each backed by its own oracle-text-verified
//     detector, so a card only lands in one of these because its real
//     text earned it.
//   - displayRoleFor (adaptive-recommendation.mjs) is the fallback for
//     every card that doesn't clear a high-ceiling bar — an ordinary
//     removal spell, a plain draw spell, a vanilla threat — so this never
//     leaves a card with no Intent at all.
//
// Clock is deliberately NOT always a bare turn number: a cheap removal
// spell doesn't have a fixed turn it matters, it matters whenever a real
// threat shows up. Forcing every card into a turn bucket would be a
// fabricated precision the underlying data doesn't support — qualitative
// clocks ("Reactive", "Flexible") are the honest answer for those
// categories, and turn-bucketed clocks are reserved for categories where
// mana value genuinely predicts when a card comes online.
import { powerSignalCategoryFor } from "./commander-power-signal.mjs";
import { displayRoleFor } from "./adaptive-recommendation.mjs";

function manaValueOf(card) {
  if (Number.isFinite(card?.cmc)) return card.cmc;
  const cost = card?.manaCost || card?.mana_cost || "";
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return 0;
  return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^[XYZ]$/.test(symbol) ? 0 : 1), 0);
}

// The same "turn a card is realistically castable" heuristic
// manaConsistencyReport already uses elsewhere in this app/ directory —
// reused here rather than re-derived, so a "turn 3" clock always means the
// same thing everywhere the Forge says it.
function castableTurn(card) {
  return Math.max(1, Math.round(manaValueOf(card)));
}

function turnClock(card) {
  const turn = castableTurn(card);
  if (turn <= 2) return { label: "Immediate", detail: `castable as early as turn ${turn}` };
  if (turn <= 4) return { label: "Early", detail: `usually online by turn ${turn}` };
  if (turn <= 6) return { label: "Mid-game", detail: `usually online around turn ${turn}` };
  return { label: "Late-game", detail: `rarely online before turn ${turn}` };
}

// Fine-grained read for the seven power-signal categories — each entry's
// clock is either turn-bucketed (when mana value genuinely predicts
// timing) or explicitly qualitative (when it doesn't), never a forced
// number.
const POWER_CATEGORY_TIMING = Object.freeze({
  fastMana: {
    intent: "This card is trying to accelerate your mana dramatically.",
    clock: (card) => ({ ...turnClock(card), qualifier: "and it speeds up everything you do after it" }),
    whyItMatters: "Early acceleration lets the rest of your plan happen several turns sooner than it otherwise would — judge it by what it enables, not just its own cost.",
  },
  tutor: {
    intent: "This card finds exactly the piece your plan needs, rather than hoping to draw it.",
    clock: () => ({ label: "Flexible", detail: "it matters whenever you need its target, not on a fixed turn", qualifier: "" }),
    whyItMatters: "Its real value is removing bad draws from the equation — track whether it's finding what your plan actually needs, or just your single best card, in a vacuum.",
  },
  extraTurn: {
    intent: "This card is trying to buy your deck an entire extra turn.",
    clock: () => ({ label: "Late-game", detail: "it's most dangerous once you're already ahead and have something worth doing twice", qualifier: "" }),
    whyItMatters: "An extra turn compounds whatever you can already do — it's a multiplier on your position, not a plan by itself.",
  },
  massLandDenial: {
    intent: "This card is trying to lock every other player out of their mana at once.",
    clock: () => ({ label: "Late-game", detail: "and only once you're already ahead — used too early it slows you down along with everyone else", qualifier: "" }),
    whyItMatters: "Denial only wins games when you can capitalize on the gap it creates — watch whether you're actually ahead when you cast it.",
  },
  efficientInteraction: {
    intent: "This card is one of your cheap, unconditional ways to deal with a real threat.",
    clock: () => ({ label: "Reactive", detail: "it matters whenever a real threat shows up, not on a set turn", qualifier: "" }),
    whyItMatters: "This is what keeps your plan alive long enough to actually happen — its value shows up in the games where you needed it, not the games where you didn't.",
  },
  repeatableValueEngine: {
    intent: "This card keeps paying off every time it triggers — not just once, like most cards do.",
    clock: (card) => ({ ...turnClock(card), qualifier: "but its real strength is compounding — it gets better every extra turn it survives" }),
    whyItMatters: "Its real strength comes from staying on the battlefield over time, not the turn it's cast — track how many times it actually triggers in a real game, not just whether you cast it.",
  },
  resourceMultiplier: {
    intent: "This card multiplies a resource the rest of your deck already produces, rather than producing more of it on its own.",
    clock: () => ({ label: "Scales with your plan", detail: "it has nothing to multiply when the rest of your deck hasn't gotten going yet", qualifier: "" }),
    whyItMatters: "This card is only ever as strong as the resource it's multiplying — judge it by what else is in the deck, not by itself in isolation.",
  },
});

// Broader fallback for every card that doesn't clear a power-signal
// category — the ordinary role players that make up most of a real deck.
// Interaction/protection-shaped roles get a Reactive clock for the same
// reason efficientInteraction does above; everything else is turn-bucketed
// off real mana value.
const REACTIVE_DISPLAY_ROLES = new Set(["Counter magic", "Interaction", "Protection", "Board reset"]);
const DISPLAY_ROLE_INTENT = Object.freeze({
  "Mana source": "This card develops your mana base so later turns come online on schedule.",
  "Board reset": "This card is a reset button for when things have gotten out of hand for you.",
  "Counter magic": "This card stops an opponent's spell before it can take effect.",
  Interaction: "This card removes or neutralizes a specific threat already in play.",
  Acceleration: "This card gets you extra mana early, so your bigger plays happen sooner.",
  "Card advantage": "This card gives you more cards back than you spent to play it, or draws you extra cards outright.",
  Protection: "This card protects something you already have from being destroyed, exiled, or otherwise taken away.",
  "Engine piece": "This card supports a repeatable plan alongside other cards in the deck.",
  Threat: "This card is one of the things actually trying to win you the game.",
  "Flexible support": "This card does a bit of everything rather than one specialized job.",
});
const DISPLAY_ROLE_WHY = Object.freeze({
  "Mana source": "A mana base is invisible when it works and glaring when it doesn't — judge it by how often you're stuck without the right color, not by any one land.",
  "Board reset": "A reset only helps if you're actually behind when you cast it — the exact same card can save your game or wreck your own position, depending on timing.",
  "Counter magic": "Its value is entirely about what it stops, not what it costs — sitting unused in your hand, it does nothing at all.",
  Interaction: "Judge it by what it's actually dealing with at your table, not by its cost in a vacuum.",
  Acceleration: "The extra mana only matters if it gets spent on something — track whether it's actually letting you play things earlier than you otherwise could.",
  "Card advantage": "This kind of edge compounds over a long game — its value is easiest to see in games that go long, not fast ones.",
  Protection: "It's only as valuable as the thing it's protecting — with nothing worth saving, it does nothing.",
  "Engine piece": "This kind of card alone does little — its value is entirely about what it's connected to in this specific deck.",
  Threat: "Its real clock is when it's actually pressuring life total, not just the turn you cast it.",
  "Flexible support": "Flexible cards rarely win the game alone — their value is smoothing out the games where your main plan is slow to arrive.",
});

// The single entry point. Never returns null — every real card gets an
// Intent (from its strongest power-signal category, or its general
// display role as fallback) and a Clock (turn-bucketed or explicitly
// qualitative, whichever the underlying signal actually supports).
export function describeCardTiming(card) {
  const category = powerSignalCategoryFor(card);
  if (category && POWER_CATEGORY_TIMING[category]) {
    const entry = POWER_CATEGORY_TIMING[category];
    const clock = entry.clock(card);
    return Object.freeze({
      intent: entry.intent,
      clockLabel: clock.label,
      clock: `${clock.label} — ${clock.detail}${clock.qualifier ? `, ${clock.qualifier}` : ""}.`,
      whyItMatters: entry.whyItMatters,
      source: `power-signal:${category}`,
    });
  }

  const role = displayRoleFor(card);
  const intent = DISPLAY_ROLE_INTENT[role] || "This card fills an ordinary functional role in the deck.";
  const whyItMatters = DISPLAY_ROLE_WHY[role] || "Judge this card by what it actually does in your real games, not by its cost alone.";
  if (REACTIVE_DISPLAY_ROLES.has(role)) {
    return Object.freeze({
      intent,
      clockLabel: "Reactive",
      clock: "Reactive — it matters whenever the situation calls for it, not on a fixed turn.",
      whyItMatters,
      source: `display-role:${role}`,
    });
  }
  const clock = turnClock(card);
  return Object.freeze({
    intent,
    clockLabel: clock.label,
    clock: `${clock.label} — ${clock.detail}.`,
    whyItMatters,
    source: `display-role:${role}`,
  });
}
