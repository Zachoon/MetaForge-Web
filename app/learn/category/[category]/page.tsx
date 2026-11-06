import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articlesInCategory, collectionSchema } from "../../catalog.mjs";
import { CATEGORIES, categoryById } from "../../policy.mjs";
import { ArticleList, BuildCta, CategoryNav, LearnFrame, LearnLinks } from "../../article-view";

export function generateStaticParams() {
  return CATEGORIES.filter((category) => category.id !== "news").map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const record = categoryById(category);
  if (!record || record.id === "news") return {};
  const url = `https://metaforge.gg/learn/category/${record.id}`;
  const hasArticles = articlesInCategory(record.id).length > 0;
  return {
    title: `${record.label} | MetaForge Learn`,
    description: record.blurb,
    alternates: { canonical: url },
    robots: hasArticles ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: `${record.label} | MetaForge Learn`, description: record.blurb, url, type: "website", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title: record.label, description: record.blurb, images: ["/og.png"] },
  };
}

export default async function LearnCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const record = categoryById(category);
  if (!record || record.id === "news") notFound();
  const articles = articlesInCategory(record.id);
  const schema = collectionSchema(record.label, `https://metaforge.gg/learn/category/${record.id}`, record.blurb);
  return (
    <LearnFrame crumbs={[{ href: "/", label: "Explore" }, { href: "/learn", label: "Learn" }, { label: record.label }]} noindex={articles.length === 0}>
      <article className="legal-card">
        <CategoryNav current={record.id} />
        <small>LEARN</small>
        <h1>{record.label}</h1>
        <p className="updated">{record.blurb}</p>
        <ArticleList articles={articles} />
        <BuildCta href="/?intent=build" label="Build this" text="Take the note into a deck. The forge starts from a commander." />
      </article>
      <LearnLinks />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </LearnFrame>
  );
}
