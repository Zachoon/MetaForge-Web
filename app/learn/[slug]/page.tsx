import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleBySlug, relatedArticles, seedArticles } from "../catalog.mjs";
import { categoryById } from "../policy.mjs";
import { ArticleBody, LearnFrame, LearnLinks, articleMetadata } from "../article-view";

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
  const category = categoryById(article.category);
  return (
    <LearnFrame crumbs={[
      { href: "/", label: "Explore" },
      { href: "/learn", label: "Learn" },
      { href: article.category === "news" ? "/learn/news" : `/learn/category/${article.category}`, label: category?.label || article.category },
      { label: article.title },
    ]}>
      <ArticleBody article={article} related={related} />
      <LearnLinks />
    </LearnFrame>
  );
}
