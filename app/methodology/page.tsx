import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "How MetaForge Evaluates MTG Decks",
  description: "See the deckbuilding evidence, structural checks, uncertainty boundaries, and testing process behind MetaForge recommendations.",
  alternates: { canonical: "https://metaforge.gg/methodology" },
};

export default function Methodology() {
  return <main className="legal-page forge-atmosphere"><div className="legal-shell">
    <Link className="legal-brand" href="/"><i>MF</i> METAFORGE</Link>
    <article className="legal-card"><small>METHOD &amp; EVIDENCE</small><h1>How MetaForge evaluates a Magic deck</h1><p className="updated">The goal is a useful explanation you can test—not an unexplained grade.</p>
      <section><h2>1. Establish the deck&rsquo;s contract</h2><p>Format legality, commander color identity, deck size, player preferences, budget, and intended game plan define the boundaries. A legal staple does not automatically fit the contract.</p></section>
      <section><h2>2. Read the structure</h2><p>MetaForge identifies the jobs cards perform: mana development, card flow, interaction, protection, setup, engine support, payoff, recovery, and closing pressure. Counts are interpreted in context rather than compared with one universal template.</p></section>
      <section><h2>3. Connect causes to consequences</h2><p>The analysis looks for dependencies and pressure points. Too many payoffs without enablers, colors without timely sources, or an advantage engine without a closing route are structural relationships—not simply weak cards.</p></section>
      <section><h2>4. Preserve uncertainty</h2><p>Card text and deck composition cannot fully reveal a local metagame, pilot decisions, or every interaction. MetaForge distinguishes observations from inferences and treats suggested changes as experiments when game evidence is still needed.</p></section>
      <section><h2>5. Test a bounded change</h2><p>A useful experiment changes as little as possible, names what should improve, and preserves the original list for comparison. Opening-hand tests and real games can then confirm or reject the hypothesis.</p></section>
      <section><h2>Data and limitations</h2><p>Card facts come from structured card data and are separated from strategic judgment. Prices can change and should be treated as estimates. MetaForge does not claim that popularity proves quality or that simulation proves match performance.</p></section>
      <section><h2>Use the method yourself</h2><p>Every Academy guide is written to help a player recognize the same evidence at the table, even without software.</p><p><Link href="/academy">Browse deckbuilding guides</Link> · <Link href="/tools/mtg-deck-analyzer">Analyze a deck</Link></p></section>
    </article>
    <footer className="legal-links"><Link href="/about">About MetaForge</Link><Link href="/">Return to the Forge</Link><Link href="/privacy">Privacy</Link></footer>
  </div></main>;
}
