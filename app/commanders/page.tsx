import type { Metadata } from "next";
import "../legal.css";
import "./commanders.css";
import { COMMANDER_GUIDES } from "./data.mjs";

export const metadata: Metadata = {
  title: "Commander Deck Guides | MetaForge",
  description: "Evidence-grounded guides to popular Commander legends — what each one actually does, named straight from its own oracle text.",
  alternates: { canonical: "https://metaforge.gg/commanders" },
};

export default function CommandersIndex() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>METAFORGE COMMANDER GUIDES</small>
          <h1>Commander Deck Guides</h1>
          <p className="updated">What each commander actually does, named straight from its own oracle text.</p>
          <section>
            <p>
              Every guide below explains a popular Commander legend the same way MetaForge explains your own
              decklist: naming what the card&rsquo;s printed rules text actually supports, not what&rsquo;s
              popular or assumed. Pick one to see what it wants to do, then build a full deck around it.
            </p>
          </section>
          <section>
            <h2>Choose a commander</h2>
            <ul className="commander-guide-list">
              {COMMANDER_GUIDES.map((entry) => (
                <li key={entry.slug}>
                  <a href={`/commanders/${entry.slug}`}>
                    <strong>{entry.card.name}</strong>
                    <p>{entry.tagline}</p>
                  </a>
                </li>
              ))}
            </ul>
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
