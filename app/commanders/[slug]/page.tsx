import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../legal.css";
import "../commanders.css";
// Side effect only: configures the real card-mechanics tag lookup so
// typal/tribal detection works. Never imported for forgeNativeMasterwork
// itself — this route only needs commander-level occupancy analysis, and
// this import never reaches the client bundle (server component only).
import "../../native-masterwork-engine.mjs";
import {
  occupancySeatingForPackage,
  OCCUPANCY_PACKAGE_IDS,
} from "../../knowledge/mentor-shadow.mjs";
import { occupancyEngineCopyFor } from "../occupancy-copy.mjs";
import { COMMANDER_GUIDES, commanderGuideBySlug } from "../data.mjs";
import { commanderGuideProfile } from "../guide-profiles.mjs";

export function generateStaticParams() {
  return COMMANDER_GUIDES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = commanderGuideBySlug(slug);
  if (!entry) return {};
  const { card } = entry;
  const url = `https://metaforge.gg/commanders/${slug}`;
  return {
    title: `${card.name} Commander Deck Guide | MetaForge`,
    description: `${card.name}: ${entry.tagline}`,
    alternates: { canonical: url },
    openGraph: { title: `${card.name} Commander Deck Guide | MetaForge`, description: entry.tagline, url, type: "article", images: [{ url: card.image_uris.art_crop, alt: `${card.name} art` }] },
    twitter: { card: "summary_large_image", title: `${card.name} Commander Deck Guide | MetaForge`, description: entry.tagline, images: [card.image_uris.art_crop] },
  };
}

export default async function CommanderGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = commanderGuideBySlug(slug);
  if (!entry) notFound();
  const { card, tagline } = entry;
  const profile = commanderGuideProfile(slug);

  const engines = OCCUPANCY_PACKAGE_IDS
    .map((id) => {
      const seating = occupancySeatingForPackage(id, { name: card.name, oracleText: card.oracle_text });
      if (!seating.length) return null;
      return {
        id,
        label: seating[0].seat?.label || id,
        copy: occupancyEngineCopyFor(id),
      };
    })
    .filter((engine): engine is { id: string; label: string; copy: string } => Boolean(engine));

  const colorIdentity = card.color_identity.length ? card.color_identity : ["C"];
  const relatedCommanders = COMMANDER_GUIDES
    .filter((candidate) => candidate.slug !== slug)
    .map((candidate) => ({ candidate, overlap: candidate.card.color_identity.filter((color) => card.color_identity.includes(color)).length }))
    .sort((a, b) => b.overlap - a.overlap || a.candidate.card.name.localeCompare(b.candidate.card.name))
    .slice(0, 3)
    .map(({ candidate }) => candidate);

  return (
    <main className="legal-page forge-atmosphere">
      <div className="legal-shell">
        <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
        <article className="legal-card">
          <small>COMMANDER DECK GUIDE</small>
          <h1>{card.name}</h1>
          <p className="updated">{tagline}</p>

          <div className="commander-hero">
            <img src={card.image_uris.art_crop} alt={`${card.name} art`} />
            <div className="commander-hero-identity">
              <span className="commander-mana-cost">{card.mana_cost}</span>
              <span className="commander-type-line">{card.type_line}</span>
              <div className="commander-colors" aria-label="Color identity">
                {colorIdentity.map((color) => <i key={color}>{color}</i>)}
              </div>
            </div>
          </div>

          <section>
            <h2>Oracle text</h2>
            <blockquote className="commander-oracle">{card.oracle_text}</blockquote>
          </section>

          <section>
            <h2>What {card.name} wants to do</h2>
            {engines.length > 0 ? (
              <ul className="commander-engines">
                {engines.map((engine) => (
                  <li key={engine.id}>
                    <strong>{engine.label}</strong>
                    <span>{engine.copy}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="commander-no-engine">
                MetaForge doesn&rsquo;t name one of its ten specific engine types for {card.name} from oracle text
                alone. That doesn&rsquo;t mean there&rsquo;s no real plan here — it means this commander&rsquo;s
                payoff isn&rsquo;t one of those ten named shapes, and MetaForge would rather say nothing than guess.
              </p>
            )}
            <p>
              These are named directly from {card.name}&rsquo;s own printed rules text, not guessed from what the
              99 usually looks like — the same evidence-first approach MetaForge uses once you bring it a real
              decklist.
            </p>
          </section>

          {profile ? <>
            <section>
              <h2>{card.name} game plan</h2>
              <p>{profile.plan}</p>
            </section>
            <section>
              <h2>Key card roles and deckbuilding priorities</h2>
              <div className="commander-priorities">
                {profile.priorities.map(([heading, body]) => <div key={heading}><h3>{heading}</h3><p>{body}</p></div>)}
              </div>
            </section>
            <section>
              <h2>Mana, ramp, and color requirements</h2>
              <p>{profile.mana}</p>
              <p><a href="/tools/commander-color-source-calculator">Estimate the colored sources for a demanding spell</a> or use the <a href="/tools/commander-land-calculator">Commander land calculator</a> to choose a starting range.</p>
            </section>
            <section>
              <h2>Interaction and protection</h2>
              <p>{profile.interaction}</p>
            </section>
            <section>
              <h2>How {card.name} wins</h2>
              <p>{profile.wins}</p>
            </section>
            <section>
              <h2>Common {card.name} deckbuilding mistakes</h2>
              <ul>{profile.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
            </section>
            <section>
              <h2>Building {card.name} on a budget</h2>
              <p>{profile.budget}</p>
              <p><a href={profile.academy}>Read the related MetaForge Academy guide</a> for a deeper explanation of this structural problem.</p>
            </section>
          </> : null}

          <section>
            <h2>Build a deck around {card.name}</h2>
            <p>
              MetaForge builds a complete, explainable {card.name} decklist and shows its reasoning for every
              slot — not just a list of popular cards, but why each one earns its place with this commander
              specifically.
            </p>
            <div className="commander-cta">
              <p>Choose a strategy and MetaForge will build a full {card.name} deck and explain how it works.</p>
              <a className="commander-cta-button" href={`/?commander=${slug}`}>Build a {card.name} deck →</a>
            </div>
          </section>

          <section>
            <h2>Explore related Commander resources</h2>
            <ul className="commander-related-links">
              {relatedCommanders.map((candidate) => <li key={candidate.slug}><a href={`/commanders/${candidate.slug}`}>{candidate.card.name} Commander deck guide</a></li>)}
              <li><a href="/tools/commander-deck-builder">Build a Commander deck from a game plan</a></li>
              <li><a href="/academy/what-is-my-deck-actually-trying-to-do">Learn how to identify a deck&rsquo;s real game plan</a></li>
            </ul>
          </section>
        </article>
        <footer className="legal-links">
          <a href="/commanders">More commander guides</a>
          <a href="/academy">MetaForge Academy</a>
          <a href="/">Return to the Forge</a>
        </footer>
      </div>
    </main>
  );
}
