import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articlesWithTag, indexableArticles } from "../../catalog.mjs";
import { ArticleList, BuildCta, CategoryNav, LearnFrame, LearnLinks } from "../../article-view";

export function generateStaticParams() {
  const tags = new Set<string>();
  for (const article of indexableArticles()) {
    for (const tag of article.tags || []) tags.add(tag);
  }
  return [...tags].map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const articles = articlesWithTag(tag);
  if (!articles.length) return { robots: { index: false, follow: false } };
  const url = `https://metaforge.gg/learn/tag/${tag}`;
  const description = `Commander notes tagged ${tag}.`;
  const indexable = articles.length >= 2;
  return {
    title: `${tag} | MetaForge Learn`,
    description,
    alternates: { canonical: url },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: `${tag} | MetaForge Learn`, description, url, images: ["/og.png"] },
    twitter: { card: "summary_large_image", title: `${tag} notes`, description, images: ["/og.png"] },
  };
}

export default async function LearnTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const articles = articlesWithTag(tag);
  if (!articles.length) notFound();
  const thin = articles.length < 2;
  return (
    <LearnFrame crumbs={[{ href: "/", label: "Explore" }, { href: "/learn", label: "Learn" }, { label: tag }]} noindex={thin}>
      <article className="legal-card">
        <CategoryNav />
        <small>TAG</small>
        <h1>{tag}</h1>
        <p className="updated">{articles.length === 1 ? "One note uses this tag. A single-note tag page is not indexed." : `${articles.length} notes use this tag.`}</p>
        <ArticleList articles={articles} />
        <BuildCta href="/?intent=build" label="Build this" text="Pick a commander from a note, then build the deck." />
      </article>
      <LearnLinks />
    </LearnFrame>
  );
}
