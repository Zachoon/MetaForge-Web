import type { Metadata } from "next";
import "../../legal.css";
import "../../academy.css";

export const metadata: Metadata = {
  title: "What Is My Deck Actually Trying to Do? | MetaForge",
  description: "A deck full of individually good cards can still have no real plan. Here's the difference between a theme, real synergy, a repeatable plan, and the cards actually holding it together.",
  alternates: { canonical: "https://metaforge.gg/academy/what-is-my-deck-actually-trying-to-do" },
};

export default function WhatIsMyDeckActuallyTryingToDoGuide() {
  return (
    <main className="legal-page forge-atmosphere">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>METAFORGE ACADEMY · COMMANDER DECK BUILDING</small>
          <h1>What Is My Deck Actually Trying to Do?</h1>
          <p className="updated">A plain-language guide to the difference between a theme, a real plan, and the cards holding it together.</p>

          <section>
            <p>
              It&rsquo;s possible to build a deck out of forty or ninety-nine individually strong cards and still
              not be able to answer a simple question: what is this deck actually trying to do? A pile of good
              cards and a deck with a real plan can look identical on paper &mdash; same card quality, same
              average power level &mdash; and play completely differently at the table. The difference isn&rsquo;t
              how good the cards are. It&rsquo;s whether they actually connect to each other.
            </p>
          </section>

          <section>
            <h2>Four different things &ldquo;my deck&rsquo;s plan&rdquo; can mean</h2>

            <h3>1. A theme</h3>
            <p>
              A theme is a label: every card is a dragon, every card is an artifact, every card is your favorite
              color. A theme tells you what the cards look like. It doesn&rsquo;t tell you anything about what
              they do for each other &mdash; two dragons in the same deck can have absolutely nothing to do with
              one another mechanically, even though they share the theme perfectly.
            </p>

            <h3>2. Real synergy</h3>
            <p>
              This is a mechanical relationship: one card does something that specifically feeds what another card
              wants. A card that fills your graveyard and a card that cares what&rsquo;s in your graveyard are
              working together, regardless of whether they share a theme, a color, or even a card type. Two cards
              can look completely unrelated on their type lines and still be doing real work for each other.
            </p>

            <h3>3. A repeatable plan</h3>
            <p>
              When enough cards are genuinely feeding each other, not just once but turn after turn, that cluster
              becomes the deck&rsquo;s real plan &mdash; the thing it&rsquo;s actually built to do, as opposed to
              what its theme suggests it&rsquo;s built to do. Commander players often call a cluster like this an
              &ldquo;engine.&rdquo; A deck can have a strong theme and still have no real repeatable plan, if none
              of its cards are actually connected to each other this way.
            </p>

            <h3>4. The cards holding that plan together</h3>
            <p>
              Once a deck has a real plan, some cards matter more to it than others &mdash; specifically, the
              cards that connect more than one part of the plan at once. Losing one of these can fracture a
              working plan into disconnected pieces, even though the total number of cards in the deck
              didn&rsquo;t change. These are worth knowing by name, because they&rsquo;re exactly the cards a
              generic &ldquo;good stuff&rdquo; replacement won&rsquo;t actually replace.
            </p>
          </section>

          <section>
            <h2>How to tell which one you actually have</h2>
            <p>A few honest questions help separate them:</p>
            <ul>
              <li>Can you describe your deck&rsquo;s plan as &ldquo;if I have X, then Y happens&rdquo;? Or does your description stop at what type of cards are in it?</li>
              <li>Are you including a card because it fits the theme, or because you can point to another specific card it actually feeds?</li>
              <li>If you removed your single most important card, would the rest of the deck&rsquo;s plan keep functioning in some form, or would it stop making sense entirely?</li>
              <li>Do your best games follow a recognizable pattern, or does every win look completely different and slightly accidental?</li>
            </ul>
          </section>

          <section>
            <h2>What to watch during your next game</h2>
            <p>Instead of just noticing whether a game went well, track a few specific things:</p>
            <ul>
              <li>Which draws actually excite you &mdash; because the card is individually strong, or because of what it combines with already in play?</li>
              <li>Whether your winning turns share a common shape, or whether they&rsquo;re different every time.</li>
              <li>What happens to your gameplan the turn a specific key card gets removed &mdash; does the rest of the deck still have a direction, or does it stall out?</li>
            </ul>
            <p>A pattern across several games is what actually reveals a plan a decklist alone can&rsquo;t show you.</p>
          </section>

          <section>
            <h2>Investigate your own deck with MetaForge</h2>
            <p>
              Bring your decklist into MetaForge through the link below. It reads your deck&rsquo;s real
              card-to-card interactions &mdash; not card types, not colors, not a theme you told it about &mdash;
              and names the strongest cluster of cards it finds actually working together: your deck&rsquo;s real
              engine, if it has one. If a specific card isn&rsquo;t in your list but would plug directly into what
              that engine is already doing, it&rsquo;ll point that out too. The same structural analysis also
              identifies your deck&rsquo;s bridge cards &mdash; the specific cards holding more than one part of
              the plan together &mdash; so you can see exactly what your strategy actually depends on, by name.
            </p>
            <p>
              It won&rsquo;t tell you whether a theme you love is doing real mechanical work or is just flavor
              &mdash; that judgment is still yours to make &mdash; but every connection it shows you is a verified
              relationship between your actual cards, not a guess based on what they look like.
            </p>
            <div className="academy-cta">
              <p>Bring your decklist. MetaForge will find your deck&rsquo;s real engine and the cards holding it together.</p>
              <a className="academy-cta-button" href="/?guide=deck-plan">Investigate my deck →</a>
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
