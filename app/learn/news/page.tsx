import type { Metadata } from "next";
import { articlesInCategory } from "../catalog.mjs";
import { ArticleList, CategoryNav, LearnFrame } from "../article-view";

export const metadata: Metadata = {
  title: "Commander news | MetaForge Learn",
  description: "Original notes on public Magic news, plus the essay the coach writes when a run finds nothing new. Sources stay linked. Drafts stay off the feed.",
  alternates: { canonical: "https://metaforge.gg/learn/news", types: { "application/rss+xml": "https://metaforge.gg/learn/news/rss.xml" } },
  openGraph: { title: "Commander news | MetaForge Learn", description: "Original notes on public Magic news from the MetaForge coach.", url: "https://metaforge.gg/learn/news", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Commander news | MetaForge Learn", description: "Original notes on public Magic news from the MetaForge coach.", images: ["/og.png"] },
};

export default function LearnNewsPage() {
  const articles = articlesInCategory("news");
  return (
    <LearnFrame>
      <CategoryNav current="news" />
      <p className="learn-kicker">NEWS</p>
      <h1>What changed, and what the coach will say about it</h1>
      <div className="learn-measure">
        <p>Each item is an original note. The source keeps its article. We quote at most one sentence, and only when that sentence was in the fetch. Card scores use oracle text. A run that finds nothing new writes one essay from the topic queue instead of an empty page.</p>
        <p>Prose stays in draft until the source was reachable, the quotation checks out, and every card name is one the source or the card data supplied. Data-only spoiler notes can publish on their own. Either way, a person can unpublish them from the review list.</p>
        <p><a href="/learn/news/rss.xml">Subscribe by RSS</a></p>
      </div>
      <ArticleList articles={articles} />
      <div data-learn-slot="live" />
      <footer className="learn-links"><a href="/learn">All notes</a></footer>
    </LearnFrame>
  );
}
