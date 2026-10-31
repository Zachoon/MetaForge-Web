import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articlesInCategory, collectionSchema } from "../../catalog.mjs";
import { CATEGORIES, categoryById } from "../../policy.mjs";
import { ArticleList, CategoryNav, LearnFrame } from "../../article-view";

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
    <LearnFrame noindex={articles.length === 0}>
      <CategoryNav current={record.id} />
      <p className="learn-kicker">LEARN</p>
      <h1>{record.label}</h1>
      <div className="learn-measure"><p>{record.blurb}</p></div>
      <ArticleList articles={articles} />
      <footer className="learn-links"><a href="/learn">All notes</a></footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </LearnFrame>
  );
}
