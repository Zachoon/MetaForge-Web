import type { Metadata } from "next";
import "../legal.css";
import "../academy.css";

export const metadata: Metadata = {
  title: "MetaForge Academy — Commander Deckbuilding Guides",
  description: "Plain-language guides to real Commander deckbuilding problems — why spells get stuck in hand, and how to investigate your own deck.",
  alternates: { canonical: "https://metaforge.gg/academy" },
};

// Framed as the player's own thought, not the guide's clinical title — a
// new player searches "why can't I cast my spells," not "mana consistency
// guide." The thought is the headline; title/description stay only for
// the link's accessible name and supporting copy.
const GUIDES = [
  {
    href: "/academy/why-cant-i-cast-my-spells",
    thought: "I can't cast my spells.",
    title: "Why Can't I Cast My Spells?",
    description: "The five most common reasons Commander decks feel stuck — and how to tell which one is actually yours.",
  },
  {
    href: "/academy/why-do-i-run-out-of-cards",
    thought: "I run out of cards.",
    title: "Why Do I Always Run Out of Cards?",
    description: "Two very different problems feel identical at the table — here's how to tell which one is actually yours.",
  },
  {
    href: "/academy/why-does-my-deck-start-so-slowly",
    thought: "My deck starts too slowly.",
    title: "Why Does My Deck Start So Slowly?",
    description: "Four separate causes feel identical at the table — here's how to tell which one is actually yours.",
  },
  {
    href: "/academy/how-much-interaction-do-i-actually-need",
    // Same phrasing as the "Better interaction" review-focus chip
    // (review-focus.mjs's REVIEW_FOCUS_LABELS) — a deliberate echo, not a
    // coincidence: the same question shows up in the same words whether a
    // player meets it here or already mid-session.
    thought: "I never seem to have the right answer.",
    title: "How Much Interaction Do I Actually Need?",
    description: "Too little and you get run over. Too much and you never do anything of your own — here's how to tell which side you're on.",
  },
  {
    href: "/academy/why-do-i-lose-after-getting-ahead",
    thought: "I always lose after getting ahead.",
    title: "Why Do I Lose After Getting Ahead?",
    description: "Getting ahead, staying ahead, and actually ending the game are three separate skills — here's which one you're missing.",
  },
  {
    href: "/academy/what-is-my-deck-actually-trying-to-do",
    thought: "I don't know what my deck is trying to do.",
    title: "What Is My Deck Actually Trying to Do?",
    description: "A theme, real synergy, a repeatable plan, and the cards holding it together are four different things — here's how to tell them apart.",
  },
];

export default function AcademyIndex() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>METAFORGE ACADEMY</small>
          <h1>Commander Deckbuilding Academy</h1>
          <p className="updated">Plain-language guides to real Commander deckbuilding problems.</p>
          <section>
            <p>
              These guides answer questions Commander players actually run into at the table, not abstract
              deckbuilding theory. Each one explains a real problem in plain language first, then shows what
              MetaForge&rsquo;s own analysis looks at when you bring it your own decklist.
            </p>
          </section>
          <section>
            <h2>What&rsquo;s happening in your games?</h2>
            <ul className="academy-thought-list">
              {GUIDES.map((guide) => (
                <li key={guide.href}>
                  <a href={guide.href}>
                    <strong>&ldquo;{guide.thought}&rdquo;</strong>
                    <span>{guide.title}</span>
                    <p>{guide.description}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </article>
        <footer className="legal-links">
          <a href="/">Return to the Forge</a>
          <a href="/terms">Terms of Use</a>
        </footer>
      </div>
    </main>
  );
}
