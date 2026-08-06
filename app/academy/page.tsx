import type { Metadata } from "next";
import "../legal.css";
import "../academy.css";

export const metadata: Metadata = {
  title: "MetaForge Academy — Commander Deckbuilding Guides",
  description: "Plain-language guides to real Commander deckbuilding problems — why spells get stuck in hand, and how to investigate your own deck.",
  alternates: { canonical: "https://metaforge.gg/academy" },
};

const GUIDES = [
  {
    href: "/academy/why-cant-i-cast-my-spells",
    title: "Why Can't I Cast My Spells?",
    description: "The five most common reasons Commander decks feel stuck — and how to tell which one is actually yours.",
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
            <h2>Guides</h2>
            <ul className="academy-guide-list">
              {GUIDES.map((guide) => (
                <li key={guide.href}>
                  <a href={guide.href}>{guide.title}</a>
                  <p>{guide.description}</p>
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
