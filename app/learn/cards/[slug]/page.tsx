import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCards, cardBySlug } from "../../catalog.mjs";
import { BuildCta, LearnFrame, LearnLinks } from "../../article-view";

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
    <LearnFrame crumbs={[{ href: "/", label: "Explore" }, { href: "/learn", label: "Learn" }, { label: card.name }]} noindex={!card.indexable}>
      <article className="legal-card">
        <small>CARD</small>
        <h1>{card.name}</h1>
        <p className="updated">{[card.manaCost, card.typeLine].filter(Boolean).join(" · ")}</p>
        {card.paragraphs.map((paragraph: string) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
        {card.oracleText ? <pre className="learn-oracle">{card.oracleText}</pre> : null}
        {card.referring?.length ? (
          <section>
            <h2>Discussed in</h2>
            <ul>{card.referring.map((article: { slug: string; title: string }) => <li key={article.slug}><a href={`/learn/${article.slug}`}>{article.title}</a></li>)}</ul>
          </section>
        ) : null}
        <BuildCta href="/?intent=build" label="Build this" text="Build a Commander deck in the forge." />
      </article>
      <LearnLinks />
    </LearnFrame>
  );
}
