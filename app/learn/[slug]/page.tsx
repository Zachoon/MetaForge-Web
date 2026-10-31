import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleBySlug, relatedArticles, seedArticles } from "../catalog.mjs";
import { ArticleBody, LearnFrame, articleMetadata } from "../article-view";

export function generateStaticParams() {
  return seedArticles().filter((article) => article.indexable).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  return articleMetadata(article);
}

export default async function LearnArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article || article.status !== "published" || !article.indexable) notFound();
  const related = relatedArticles(article);
  return (
    <LearnFrame>
      <ArticleBody article={article} related={related} />
    </LearnFrame>
  );
}
