import { buildDecisionMoment } from "./decision-moment.mjs";

const RESPONSES = {
  "My mana": ["Mana was the pressure point.", "Check whether this was variance, a mulligan decision, or a repeatable construction issue before changing lands."],
  "Their speed": ["The game was decided early.", "Watch whether your first meaningful play consistently arrives after the opponent is already ahead."],
  "I ran out of cards": ["Your resources dried up.", "Track the turn your hand emptied and whether your remaining draws could still affect the board."],
  "I lacked an answer": ["One threat went unanswered.", "Name the permanent or play pattern. Repetition matters more than one painful target."],
  "My plan worked": ["Your plan showed up.", "Record which card or sequence made it work, then protect that signal through the next games."],
  "I misplayed": ["This may be a decision problem, not a deck problem.", "Replay the decision point before changing cards. A cleaner test comes from holding the list steady."],
  "I'm not sure": ["Uncertainty is honest evidence.", "On the next game, watch one thing only: the turn your deck first does what it was built to do."],
  "I found the turning point": ["One sequence changed the game.", "Name the decision or card that shifted the game so Forge can watch for repeatable leverage."],
  "I stayed ahead on cards": ["Your resource advantage held.", "Record what created the extra cards and whether that advantage arrived early enough to matter."],
  "They nearly stabilized": ["Your win still exposed a pressure point.", "Identify when their position almost turned the corner; winning does not erase that useful warning."],
  "I kept a risky hand": ["The opening decision shaped the loss.", "Separate the keep decision from later draw variance before changing the deck."],
  "My plan never started": ["The deck did not establish its intended game plan.", "Track the first missing enabler, payoff, or setup turn before replacing cards."],
};

export const POST_GAME_READS={
  win:["My plan worked","I found the turning point","I stayed ahead on cards","My mana","They nearly stabilized","I misplayed","I'm not sure"],
  loss:["Their speed","I ran out of cards","I lacked an answer","My mana","I kept a risky hand","My plan never started","I misplayed","I'm not sure"],
};

export function buildPostGameCoach(match, read, history = []) {
  if (!match || !read) return null;
  const relevant = history.filter((item) => !match.deckFingerprint || !item.deckFingerprint || item.deckFingerprint === match.deckFingerprint).slice(0, 4);
  const repeats = relevant.filter((item) => item.read === read).length + 1;
  const [headline, action] = RESPONSES[read] || ["A useful signal was captured.", "Keep the next test focused on the same observation."];
  const pattern = repeats >= 3 ? `This is now a pattern: ${repeats} recent games carried the same tag.` : repeats === 2 ? "This is the second recent game with the same tag. Watch it closely." : "One game is a clue, not a deck verdict.";
  const urgency = repeats >= 3 ? "pattern" : repeats === 2 ? "watch" : "clue";
  const constructionSignals = new Set(["My mana", "Their speed", "I ran out of cards", "I lacked an answer", "My plan never started"]);
  const playSignals = new Set(["I misplayed", "I kept a risky hand"]);
  const positiveSignals = new Set(["My plan worked", "I found the turning point", "I stayed ahead on cards"]);
  const decision = repeats >= 3 && constructionSignals.has(read)
    ? { status:"reforge", label:"REFORGE", title:"A controlled deck change is now justified.", detail:"The same construction pressure appeared in three recent games with this exact revision. Preserve the original, create one narrow replacement, and compare the next five matched games." }
    : playSignals.has(read)
      ? { status:"continue", label:"CONTINUE", title:"Hold the deck steady; coach the decision.", detail:"This signal points first to mulligan or sequencing practice. Changing cards now would blur whether the next result came from the list or the decision." }
      : repeats >= 2
        ? { status:"watch", label:"WATCH", title:"Repeat the test before changing cards.", detail:"The same signal has appeared twice. Give the current list one focused observation window; a third same-version occurrence can justify a narrow reforge." }
        : positiveSignals.has(read)
          ? { status:"continue", label:"CONTINUE", title:"Keep the version and verify the strength.", detail:"The plan worked once. Hold the list steady and watch whether the same leverage appears against another opponent." }
          : { status:"continue", label:"CONTINUE", title:"Keep collecting clean evidence.", detail:"One match changes the watchlist, not the deck. Play the exact version again with the stated observation in mind." };
  const turns = match.turnTelemetry?.landPlayTurns || [];
  const decisionMoment = buildDecisionMoment(match);
  const observedFact = decisionMoment?.detail || (turns.length ? `Companion confirmed land plays on turn${turns.length === 1 ? "" : "s"} ${turns.join(", ")}. Partial coverage is not enough to label other turns as misses.` : null);
  return { headline, action, pattern, observedFact, decisionMoment, decision, urgency, repeats, reviewed: history.length + 1, nextReviewIn: Math.max(0, 5 - ((history.length + 1) % 5)) };
}
