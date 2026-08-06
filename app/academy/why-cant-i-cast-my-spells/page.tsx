import type { Metadata } from "next";
import "../../legal.css";
import "../../academy.css";

export const metadata: Metadata = {
  title: "Why Can't I Cast My Spells in Commander? | MetaForge",
  description: "Cards stuck in your hand every Commander game? Here's how to tell whether it's your land count, your colors, or something else — and what to check next.",
  alternates: { canonical: "https://metaforge.gg/academy/why-cant-i-cast-my-spells" },
};

export default function WhyCantICastMySpellsGuide() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>METAFORGE ACADEMY · COMMANDER DECK BUILDING</small>
          <h1>Why Can&rsquo;t I Cast My Spells?</h1>
          <p className="updated">A plain-language guide to the most common causes, and how to tell which one is actually yours.</p>

          <section>
            <p>
              If spells keep sitting dead in your hand while everyone else at the table is already doing things,
              the cause is almost always something about your mana — but &ldquo;something about your mana&rdquo; can
              mean several different, unrelated problems. Adding more lands fixes some of them and does nothing for
              the others, which is exactly why the usual advice (&ldquo;just run more lands&rdquo;) so often
              doesn&rsquo;t actually help.
            </p>
          </section>

          <section>
            <h2>The most common reasons this happens</h2>
            <p>
              These five causes can feel identical at the table — cards stuck in your hand, nothing to do — even
              though the fix for each one is completely different.
            </p>

            <h3>1. You&rsquo;re not drawing enough lands</h3>
            <p>
              The most literal version of the problem: your deck has plenty of lands in it, but this particular
              game you simply haven&rsquo;t drawn enough of them, so you don&rsquo;t have the mana to cast
              what&rsquo;s in your hand. Commander players sometimes call this getting &ldquo;mana screwed.&rdquo;
              It happens to every deck occasionally, just from bad luck — the real question is whether it&rsquo;s
              happening to your deck more often than it should.
            </p>

            <h3>2. Your lands produce the wrong colors</h3>
            <p>
              You might have plenty of lands on the battlefield, but if too few of them produce the specific color
              a card needs, that card is still stuck. A three-color deck where one color only has a handful of
              sources will strand cards of that color far more often than a deck built around one or two colors
              with a deep, even mana base. When your lands can&rsquo;t produce the colors your cards need at the
              right time, players often call that a color-consistency problem — a different problem from simply
              not having enough lands at all.
            </p>

            <h3>3. Too many expensive spells too early</h3>
            <p>
              If your hand is full of six- and seven-mana spells on turn four, it doesn&rsquo;t matter how many
              lands you&rsquo;ve drawn — you still can&rsquo;t cast anything yet. This is a question of your
              deck&rsquo;s mana curve: the spread of how much your cards cost, from cheap to expensive. A deck
              top-heavy with expensive spells will feel slow and stuck almost every game, even with a perfect mana
              base.
            </p>

            <h3>4. A small number of cards do all the setup</h3>
            <p>
              Some decks lean hard on just a few enabler or setup cards, and everything else in the hand is waiting
              on one of them. If those specific cards don&rsquo;t show up, the rest of the deck can feel like
              it&rsquo;s doing nothing — not because of mana at all, but because the cards you can cast
              aren&rsquo;t the ones your plan actually needs yet. This shows up as randomness: some games your deck
              runs perfectly, other games it feels dead, even with a similar opening hand of lands.
            </p>

            <h3>5. Keeping hands that can&rsquo;t actually do anything</h3>
            <p>
              Sometimes the deck is fine and the hand just wasn&rsquo;t a keeper. A hand with three lands and four
              expensive spells that all need a color you don&rsquo;t have yet can look reasonable at a glance and
              still be unable to do anything for the first several turns. Knowing which hands are worth keeping —
              and which ones only look fine — is its own skill, separate from how the deck itself is built.
            </p>
          </section>

          <section>
            <h2>How to tell which problem you actually have</h2>
            <p>
              Because all five feel the same in the moment, telling them apart takes looking at more than just how
              the last game felt. A few honest questions help narrow it down:
            </p>
            <ul>
              <li>Is it always the same color that&rsquo;s missing? That points to color consistency, not raw land count.</li>
              <li>Are you short on lands themselves, in games where the colors you do have are fine? That&rsquo;s closer to a land-count problem.</li>
              <li>Is your hand full of expensive cards specifically, even when your lands are fine? That&rsquo;s a curve problem.</li>
              <li>Does the deck feel completely different from game to game depending on one or two specific cards showing up? That&rsquo;s a dependency problem, not mana at all.</li>
              <li>Are you the one choosing to keep risky hands? That&rsquo;s a mulligan-discipline question, not a deckbuilding one.</li>
            </ul>
            <p>
              Most real decks have a mix of more than one of these, which is exactly why a blanket fix like
              &ldquo;add more lands&rdquo; can help one problem while leaving another one completely untouched.
            </p>
          </section>

          <section>
            <h2>What to watch during your next game</h2>
            <p>Instead of just the general feeling of being stuck, notice a few specific things:</p>
            <ul>
              <li>Which turn you&rsquo;re missing a color, and which color it is — every time it happens, not just once.</li>
              <li>Whether the lands you do have are actually the colors your hand needs, or just lands in general.</li>
              <li>What your hand&rsquo;s spells actually cost, compared to how many lands you have out.</li>
              <li>Whether the games that feel smooth share a specific card in common that the slow games are missing.</li>
            </ul>
            <p>A pattern across several games tells you a lot more than any single bad hand does.</p>
          </section>

          <section>
            <h2>Investigate your own deck with MetaForge</h2>
            <p>
              Reading through causes in the abstract only goes so far — the real answer is specific to your actual
              decklist. MetaForge&rsquo;s consistency check looks at every colored card in your deck and calculates
              the real odds of having the right color of mana by the turn you&rsquo;d want to cast it, based on your
              actual mana base — not a guess, and not a universal land-count rule. It&rsquo;ll tell you exactly
              which cards are the shakiest, and by how much.
            </p>
            <p>
              It won&rsquo;t diagnose your curve or your opening-hand habits for you in that same pass — those are
              still worth tracking yourself using the questions above — but it will tell you, in plain language,
              whether your colors are the real problem or whether you should be looking somewhere else.
            </p>
            <div className="academy-cta">
              <p>Bring your decklist. MetaForge will check which spells are hardest to cast on time and explain what to watch for next.</p>
              <a className="academy-cta-button" href="/?guide=cast-spells">Investigate my deck →</a>
            </div>
          </section>
        </article>
        <footer className="legal-links">
          <a href="/academy">MetaForge Academy</a>
          <a href="/">Return to the Forge</a>
          <a href="/terms">Terms of Use</a>
        </footer>
      </div>
    </main>
  );
}
