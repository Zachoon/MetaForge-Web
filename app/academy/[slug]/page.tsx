import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import "../../legal.css";
import "../../academy.css";
import { NEW_ACADEMY_GUIDES, newAcademyGuideBySlug } from "../guides-data";

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
  return <main className="legal-page"><div className="legal-shell">
    <Link className="legal-brand" href="/"><i>MF</i> METAFORGE</Link>
    <article className="legal-card"><small>METAFORGE ACADEMY · COMMANDER DECK BUILDING</small><h1>{guide.title}</h1><p className="updated">{guide.description}</p>
      <section><p>{guide.lead}</p></section>
      <section><h2>Build the answer from your deck</h2>{guide.sections.map(([heading, body], index) => <div key={heading}><h3>{index + 1}. {heading}</h3><p>{body}</p></div>)}</section>
      <section><h2>What to track in your next games</h2><ul>{guide.watch.map((item) => <li key={item}>{item}</li>)}</ul><p>Write down patterns across several hands and games. A repeatable failure is stronger evidence than one dramatic loss.</p></section>
      <section><h2>Investigate your own deck</h2><p>Use the focused tool below for a starting point, then bring the full list into MetaForge when you want the cards, roles, and game plan evaluated together.</p><div className="academy-cta"><p>{guide.description}</p><Link className="academy-cta-button" href={guide.toolHref}>{guide.toolLabel} →</Link></div></section>
    </article>
    <footer className="legal-links"><Link href="/academy">MetaForge Academy</Link><Link href="/tools">Free MTG tools</Link><Link href="/">Return to the Forge</Link></footer>
  </div></main>;
}
