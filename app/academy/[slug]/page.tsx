import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import "../../legal.css";
import "../../academy.css";
import { NEW_ACADEMY_GUIDES, newAcademyGuideBySlug } from "../guides-data";
import { guideEvidenceBySlug } from "../guide-evidence";

export function generateStaticParams() { return NEW_ACADEMY_GUIDES.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = newAcademyGuideBySlug((await params).slug);
  if (!guide) return {};
  const url = `https://metaforge.gg/academy/${guide.slug}`;
  return { title: `${guide.title} | MetaForge`, description: guide.description, alternates: { canonical: url }, openGraph: { title: guide.title, description: guide.description, url } };
}

export default async function NewAcademyGuide({ params }: { params: Promise<{ slug: string }> }) {
  const guide = newAcademyGuideBySlug((await params).slug);
  if (!guide) notFound();
  const evidence = guideEvidenceBySlug(guide.slug);
  return <main className="legal-page"><div className="legal-shell">
    <Link className="legal-brand" href="/"><i>MF</i> METAFORGE</Link>
    <article className="legal-card"><small>METAFORGE ACADEMY · COMMANDER DECK BUILDING</small><h1>{guide.title}</h1><p className="updated">{guide.description}</p>
      <section><p>{guide.lead}</p></section>
      <section><h2>Build the answer from your deck</h2>{guide.sections.map(([heading, body], index) => <div key={heading}><h3>{index + 1}. {heading}</h3><p>{body}</p></div>)}</section>
      <section><h2>What to track in your next games</h2><ul>{guide.watch.map((item) => <li key={item}>{item}</li>)}</ul><p>Write down patterns across several hands and games. A repeatable failure is stronger evidence than one dramatic loss.</p></section>
      {evidence ? <section className="academy-examples" aria-labelledby="card-examples-heading">
        <small>CARDS AS EVIDENCE</small>
        <h2 id="card-examples-heading">See the tradeoffs on real cards</h2>
        <p>These examples are not automatic inclusions. Their current Oracle text makes the guide&rsquo;s reasoning concrete.</p>
        <div className="academy-card-grid">
          {evidence.cards.map((card) => <figure key={card.name} className="academy-card-example">
            <a href={card.cardUrl} target="_blank" rel="noreferrer"><img src={card.image} alt={`${card.name} Magic card`} loading="lazy" /></a>
            <figcaption>
              <h3>{card.name} <span>{card.manaCost}</span></h3><p>{card.lesson}</p>
              <details><summary>Read card facts</summary><p><strong>{card.typeLine}</strong></p><p>{card.oracleText}</p><small>{card.setName} · Art by {card.artist}. Card data and image via Scryfall.</small></details>
            </figcaption>
          </figure>)}
        </div>
      </section> : null}
      <section><h2>Investigate your own deck</h2><p>Use the focused tool below for a starting point, then bring the full list into MetaForge when you want the cards, roles, and game plan evaluated together.</p><div className="academy-cta"><p>{guide.description}</p><Link className="academy-cta-button" href={guide.toolHref}>{guide.toolLabel} →</Link></div></section>
      {evidence ? <details className="academy-sources"><summary>Sources and evidence behind this guide</summary><div><p>{evidence.evidenceNote}</p><ol>{evidence.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a><span>{source.publisher}</span><p>{source.usedFor}</p></li>)}</ol><p className="academy-source-boundary"><strong>Evidence boundary:</strong> Sources establish rules and card facts. Recommendations are MetaForge&rsquo;s interpretation and should be tested against your deck, budget, and playgroup.</p></div></details> : null}
    </article>
    <footer className="legal-links"><Link href="/academy">MetaForge Academy</Link><Link href="/tools">Free MTG tools</Link><Link href="/">Return to the Forge</Link></footer>
  </div></main>;
}
