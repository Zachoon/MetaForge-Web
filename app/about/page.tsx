import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "About MetaForge — MTG Commander Deck Builder & Analyzer",
  description: "Learn why MetaForge was built, how its evidence-first MTG deck coaching works, and where its recommendations stop.",
  alternates: { canonical: "https://metaforge.gg/about" },
};

export default function AboutMetaForge() {
  return <main className="legal-page"><div className="legal-shell">
    <Link className="legal-brand" href="/"><i>MF</i> METAFORGE</Link>
    <article className="legal-card"><small>ABOUT METAFORGE</small><h1>An MTG deck coach built to explain itself</h1><p className="updated">MetaForge helps Magic players understand a deck as a connected system—not a pile of individually popular cards.</p>
      <section><h2>Why we built it</h2><p>Deckbuilding advice is often reduced to generic counts, staples, or a single score. Those shortcuts can miss the reason a card works in one Commander deck and fails in another. MetaForge was built to connect the commander, game plan, mana, engines, interaction, card flow, and closing plan before recommending a change.</p></section>
      <section><h2>What evidence-first means here</h2><p>A recommendation should name the problem it addresses, the role a card performs, and the tradeoff created by changing it. When evidence is incomplete, MetaForge should say so. A proposed swap is a testable hypothesis, not proof that every table will produce the same result.</p></section>
      <section><h2>Built for real player intent</h2><p>There is no single correct Commander deck. Budget, power expectations, favorite cards, local opponents, and the experience a player wants all matter. MetaForge treats those choices as part of the deckbuilding problem rather than noise to remove.</p></section>
      <section><h2>Independent Magic deckbuilding software</h2><p>MetaForge is an independent deckbuilding and analysis project. Magic: The Gathering and its card names are property of Wizards of the Coast. MetaForge is not affiliated with, endorsed by, or sponsored by Wizards of the Coast.</p></section>
      <section><h2>Start with your deck</h2><p>Use a focused calculator, read a Commander deckbuilding guide, or bring a complete list into the Forge for connected analysis.</p><p><Link href="/tools">Explore free MTG tools</Link> · <Link href="/academy">Read the Academy</Link> · <Link href="/methodology">Read our methodology</Link></p></section>
    </article>
    <footer className="legal-links"><Link href="/">Return to the Forge</Link><Link href="/methodology">Methodology</Link><a href="mailto:support@metaforge.gg">Contact</a></footer>
  </div></main>;
}
