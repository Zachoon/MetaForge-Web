import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCards, cardBySlug } from "../../catalog.mjs";
import { LearnFrame } from "../../article-view";

export function generateStaticParams() {
  return allCards().filter((card) => card.indexable).map((card) => ({ slug: card.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) return {};
  const url = `https://metaforge.gg/learn/cards/${card.slug}`;
  const description = card.roles?.length
    ? `${card.name}: ${card.roles.join(", ")} from its printed text.`
    : `${card.name}, with the printed text the coach scored.`;
  return {
    title: `${card.name} | MetaForge Learn`,
    description,
    alternates: { canonical: url },
    robots: card.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: card.name, description, url, type: "article", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title: card.name, description, images: ["/og.png"] },
  };
}

export default async function LearnCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) notFound();
  return (
    <LearnFrame noindex={!card.indexable}>
      <nav className="learn-crumb" aria-label="Breadcrumb">
        <a href="/">MetaForge</a>
        <span aria-hidden="true">/</span>
        <a href="/learn">Learn</a>
        <span aria-hidden="true">/</span>
        <span>{card.name}</span>
      </nav>
      <p className="learn-kicker">CARD</p>
      <h1>{card.name}</h1>
      <p className="learn-dek">{[card.manaCost, card.typeLine].filter(Boolean).join(" · ")}</p>
      <div className="learn-measure">
        {card.paragraphs.map((paragraph: string) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
        {card.oracleText ? <pre className="learn-oracle">{card.oracleText}</pre> : null}
        {card.referring?.length ? (
          <section>
            <h2>Discussed in</h2>
            <ul>{card.referring.map((article: { slug: string; title: string }) => <li key={article.slug}><a href={`/learn/${article.slug}`}>{article.title}</a></li>)}</ul>
          </section>
        ) : null}
        <div className="learn-cta">
          <p>Build a Commander deck in the forge.</p>
          <a href="/?intent=build">Build this</a>
        </div>
      </div>
    </LearnFrame>
  );
}
