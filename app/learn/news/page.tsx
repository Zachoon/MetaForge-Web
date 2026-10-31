import type { Metadata } from "next";
import { articlesInCategory } from "../catalog.mjs";
import { ArticleList, BuildCta, CategoryNav, LearnFrame, LearnLinks } from "../article-view";

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
    <LearnFrame crumbs={[{ href: "/", label: "Explore" }, { href: "/learn", label: "Learn" }, { label: "News" }]}>
      <article className="legal-card">
        <CategoryNav current="news" />
        <small>NEWS</small>
        <h1>What changed, and what the coach will say about it</h1>
        <p className="updated">Each item is an original note. The source keeps its article. We quote at most one sentence, and only when that sentence was in the fetch. Card scores use oracle text. A run that finds nothing new writes one essay from the topic queue instead of an empty page.</p>
        <p>Prose stays in draft until the source was reachable, the quotation checks out, and every card name is one the source or the card data supplied. Data-only spoiler notes can publish on their own. Either way, a person can unpublish them from the review list.</p>
        <p><a href="/learn/news/rss.xml">Subscribe by RSS</a></p>
        <ArticleList articles={articles} />
        <div data-learn-slot="live" />
        <BuildCta href="/?intent=build" label="Build this" text="A news note is not a deck. Start one in the forge when you know the commander." />
      </article>
      <LearnLinks />
    </LearnFrame>
  );
}
