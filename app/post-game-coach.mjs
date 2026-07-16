const RESPONSES = {
  "My mana": ["Mana was the pressure point.", "Check whether this was variance, a mulligan decision, or a repeatable construction issue before changing lands."],
  "Their speed": ["The game was decided early.", "Watch whether your first meaningful play consistently arrives after the opponent is already ahead."],
  "I ran out of cards": ["Your resources dried up.", "Track the turn your hand emptied and whether your remaining draws could still affect the board."],
  "I lacked an answer": ["One threat went unanswered.", "Name the permanent or play pattern. Repetition matters more than one painful target."],
  "My plan worked": ["Your plan showed up.", "Record which card or sequence made it work, then protect that signal through the next games."],
  "I misplayed": ["This may be a decision problem, not a deck problem.", "Replay the decision point before changing cards. A cleaner test comes from holding the list steady."],
  "I'm not sure": ["Uncertainty is honest evidence.", "On the next game, watch one thing only: the turn your deck first does what it was built to do."],
};

export function buildPostGameCoach(match, read, history = []) {
  if (!match || !read) return null;
  const relevant = history.filter((item) => !match.deckFingerprint || !item.deckFingerprint || item.deckFingerprint === match.deckFingerprint).slice(0, 4);
  const repeats = relevant.filter((item) => item.read === read).length + 1;
  const [headline, action] = RESPONSES[read] || ["A useful signal was captured.", "Keep the next test focused on the same observation."];
  const pattern = repeats >= 3 ? `This is now a pattern: ${repeats} recent games carried the same tag.` : repeats === 2 ? "This is the second recent game with the same tag. Watch it closely." : "One game is a clue, not a deck verdict.";
  const urgency = repeats >= 3 ? "pattern" : repeats === 2 ? "watch" : "clue";
  return { headline, action, pattern, urgency, repeats, reviewed: history.length + 1, nextReviewIn: Math.max(0, 5 - ((history.length + 1) % 5)) };
}
