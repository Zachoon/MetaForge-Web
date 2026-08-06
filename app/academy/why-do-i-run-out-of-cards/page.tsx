import type { Metadata } from "next";
import "../../legal.css";
import "../../academy.css";

export const metadata: Metadata = {
  title: "Why Do I Always Run Out of Cards? | MetaForge",
  description: "Empty-handed by turn eight while everyone else keeps doing things? Here's how to tell whether you're actually short on cards, or short on useful ones.",
  alternates: { canonical: "https://metaforge.gg/academy/why-do-i-run-out-of-cards" },
};

export default function WhyDoIRunOutOfCardsGuide() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>METAFORGE ACADEMY · COMMANDER DECK BUILDING</small>
          <h1>Why Do I Always Run Out of Cards?</h1>
          <p className="updated">A plain-language guide to the two very different problems that both feel like &ldquo;I have nothing left.&rdquo;</p>

          <section>
            <p>
              Most advice for this stops at &ldquo;play more card draw.&rdquo; That&rsquo;s not wrong, exactly, but
              it skips the question that actually matters: are you running out of cards, or running out of{" "}
              <em>useful</em> cards? Those look identical at the table — an empty hand, nothing to do, everyone else
              still developing — but they come from opposite problems, and more card draw only fixes one of them.
            </p>
          </section>

          <section>
            <h2>Two problems that feel like the same problem</h2>

            <h3>True card advantage: literally more cards than your opponents</h3>
            <p>
              This is the most familiar version. Every card you play should ideally cost you one card and remove
              your opponent&rsquo;s ability to keep pace — but some cards do better than that. A removal spell that
              answers two threats, a spell that replaces itself with a new card, an enchantment that keeps handing
              you fresh cards turn after turn: these leave you with strictly more resources than a straight one-for-one
              trade would. Commander players call this <strong>true card advantage</strong>, and it&rsquo;s the
              version most &ldquo;play more draw&rdquo; advice is actually talking about. A deck that genuinely
              doesn&rsquo;t generate any of it is much more likely to run dry in a long game — that part of the
              standard advice is correct.
            </p>

            <h3>Virtual card advantage: the cards you have aren&rsquo;t doing anything</h3>
            <p>
              This is the one most advice skips. You can hold a perfectly normal number of cards and still be
              functionally empty-handed, because the cards in your hand aren&rsquo;t relevant to what&rsquo;s
              actually happening on the battlefield. A counterspell with nothing worth countering. Removal for a
              creature that already died. A card that needs a board state you don&rsquo;t have. None of that shows
              up as &ldquo;fewer cards&rdquo; — you&rsquo;re holding the same five cards you started the turn with —
              but it plays exactly like being out of gas, because none of those five cards can actually do anything
              right now. Commander players call this <strong>virtual card advantage</strong> (or virtual card
              disadvantage, when it&rsquo;s working against you): value that comes from a card being live and
              relevant at the right moment, not from raw card count.
            </p>
            <p>
              This is why &ldquo;just add more draw&rdquo; can genuinely make a deck worse instead of better. More
              cards in hand doesn&rsquo;t help if the new cards are exactly as dead as the old ones — you&rsquo;ve
              just made a bigger pile of things you can&rsquo;t use yet.
            </p>
          </section>

          <section>
            <h2>Why an expensive hand can feel completely empty</h2>
            <p>
              A hand of three seven-mana spells and a land, on turn five, looks like a full hand — five cards is
              five cards. But if you can only cast two-mana spells right now, that hand is doing exactly as much for
              you as an empty one. This is the same mana-curve idea covered in{" "}
              <a href="/academy/why-cant-i-cast-my-spells">Why Can&rsquo;t I Cast My Spells?</a>, showing up from a
              different angle: a curve that&rsquo;s too top-heavy doesn&rsquo;t just delay your plays, it makes your
              hand size lie to you. You&rsquo;re not short on cards. You&rsquo;re short on cards you can currently
              afford — which feels identical from across the table, but has nothing to do with how much draw is in
              the deck.
            </p>
          </section>

          <section>
            <h2>Why mana problems disguise themselves as card-draw problems</h2>
            <p>
              The same disguise happens with color, not just cost. A hand full of spells in a color you don&rsquo;t
              have mana for is, functionally, an empty hand — those cards exist, but none of them are usable yet.
              It&rsquo;s tempting to look at that game and think &ldquo;I need more card advantage,&rdquo; when the
              real fix is a more reliable mana base, not more cards competing for the same unreliable colors.
              Drawing a sixth uncastable card doesn&rsquo;t help; it just means one more card you&rsquo;ll likely
              have to discard at the end of your turn once your hand is over the limit, on top of everything else.
              Before blaming your card-draw count, it&rsquo;s worth ruling out
              whether the cards you already have are simply stuck, not spent.
            </p>
          </section>

          <section>
            <h2>How to tell which one you actually have</h2>
            <p>A few honest questions help separate a real shortage from a virtual one:</p>
            <ul>
              <li>By the midgame, are you literally holding fewer cards than your opponents — or a normal number that just isn&rsquo;t accomplishing anything?</li>
              <li>When you draw your card for turn, does it usually change something on the battlefield, or does it usually just join the pile waiting for a target, a color, or a turn that hasn&rsquo;t come yet?</li>
              <li>Do you have card draw in the deck at all, and does it resolve before or after you&rsquo;re already out of plays?</li>
              <li>Are your &ldquo;dead&rdquo; cards clustered around one theme — all reactive, all one color, all expensive — or scattered and random?</li>
              <li>Is this the mana-curve or color problem from <a href="/academy/why-cant-i-cast-my-spells">Why Can&rsquo;t I Cast My Spells?</a> wearing a different costume?</li>
            </ul>
            <p>
              A true shortage gets better with more card advantage. A virtual shortage gets better with a tighter
              curve, better color fixing, or cards that stay relevant in more situations — and can get quietly
              worse if you respond to it with more raw draw instead.
            </p>
          </section>

          <section>
            <h2>What to watch during your next game</h2>
            <p>Instead of the general feeling of being tapped out, track a few specific things:</p>
            <ul>
              <li>Of your last three draws, how many directly affected the board versus just sitting in hand?</li>
              <li>Are you replaying small, efficient spells while an opponent chains bigger plays together — a sign of a genuine resource gap, not a virtual one?</li>
              <li>When a hand goes dead, is it the same handful of card types every time (answers with no target, threats with no mana, one specific color)?</li>
              <li>Does the game usually turn on a specific draw-effect card actually resolving — and how often does it actually get there?</li>
            </ul>
            <p>A pattern across several games separates a real trend from one unlucky draw step.</p>
          </section>

          <section>
            <h2>Investigate your own deck with MetaForge</h2>
            <p>
              This distinction only means something applied to your actual list. Bring your decklist into MetaForge
              and tap any card to see its real job tag, including a dedicated <strong>Card advantage</strong> tag
              for the cards genuinely built to keep you supplied — draw spells, card selection, and similar effects
              — classified from the card&rsquo;s own printed text, not a guess. Seeing at a glance whether that tag
              is doing real work in your deck or is mostly absent is a much better starting point for the questions
              above than guessing from memory.
            </p>
            <p>
              It won&rsquo;t sort your dead hands into true versus virtual shortage for you automatically — that
              still takes watching your own games with the questions above — but it will show you, card by card,
              what your deck is actually built to do, so you&rsquo;re reasoning from your real list instead of a
              general feeling.
            </p>
            <div className="academy-cta">
              <p>Bring your decklist. MetaForge will show you what job every card is actually doing — including which ones are genuinely pulling card-advantage duty.</p>
              <a className="academy-cta-button" href="/?guide=out-of-cards">Investigate my deck →</a>
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
