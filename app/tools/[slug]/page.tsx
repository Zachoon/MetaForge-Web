import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import "../../legal.css";
import "../tools.css";
import { TOOL_PAGES, toolPageBySlug } from "../data";
import { ToolCalculator } from "../calculator";

export function generateStaticParams() { return TOOL_PAGES.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const tool = toolPageBySlug((await params).slug);
  if (!tool) return {};
  const url = `https://metaforge.gg/tools/${tool.slug}`;
  return { title: `${tool.title} | MetaForge`, description: tool.description, alternates: { canonical: url }, openGraph: { title: `${tool.title} | MetaForge`, description: tool.description, url }, twitter: { card: "summary_large_image", title: `${tool.title} | MetaForge`, description: tool.description } };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolPageBySlug((await params).slug);
  if (!tool) notFound();
  return <main className="legal-page"><div className="legal-shell">
    <Link className="legal-brand" href="/"><i>MF</i> METAFORGE</Link>
    <article className="legal-card tool-page"><small>{tool.eyebrow}</small><h1>{tool.title}</h1><p className="updated">{tool.promise}</p>
      <section><p>{tool.intro}</p></section>
      {'calculator' in tool ? <section><h2>Calculate a starting point</h2><ToolCalculator kind={tool.calculator} /></section> : null}
      <section><h2>What MetaForge checks</h2><div className="tool-benefits">{tool.sections.map(([heading, body]) => <div key={heading}><h3>{heading}</h3><p>{body}</p></div>)}</div></section>
      <section className="tool-action"><h2>Bring your deck to the Forge</h2><p>{tool.description}</p><Link href={tool.href}>{tool.cta} →</Link></section>
      <section><h2>Keep learning</h2><p><Link href="/academy/why-cant-i-cast-my-spells">Diagnose spells stuck in hand</Link>, explore <Link href="/academy/what-is-my-deck-actually-trying-to-do">what your deck is actually trying to do</Link>, or browse <Link href="/commanders">Commander deck guides</Link>.</p></section>
    </article>
    <footer className="legal-links"><Link href="/tools">All MTG tools</Link><Link href="/academy">Deckbuilding Academy</Link><Link href="/">Return to the Forge</Link></footer>
  </div></main>;
}
