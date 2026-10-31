import type { Metadata } from "next";
import { indexableArticles, SEED_CLOCK, collectionSchema } from "./catalog.mjs";
import { CATEGORIES } from "./policy.mjs";
import { ArticleList, BuildCta, CategoryNav, LearnFrame, LearnLinks } from "./article-view";

export const metadata: Metadata = {
  title: "Learn Commander | MetaForge",
  description: "Theory, set reviews, commander spotlights, and new-card notes from MetaForge's own deck coach. Card text comes from Scryfall. Counts come from the coach.",
  alternates: { canonical: "https://metaforge.gg/learn", types: { "application/rss+xml": "https://metaforge.gg/learn/news/rss.xml" } },
  openGraph: { title: "Learn Commander | MetaForge", description: "Theory, set reviews, and new-card notes from the MetaForge coach.", url: "https://metaforge.gg/learn", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Learn Commander | MetaForge", description: "Theory, set reviews, and new-card notes from the MetaForge coach.", images: ["/og.png"] },
};

export default function LearnIndex() {
  const articles = indexableArticles();
  const schema = collectionSchema("MetaForge Learn", "https://metaforge.gg/learn", "Commander theory, set reviews, spotlights, and new-card notes.");
  return (
    <LearnFrame crumbs={[{ href: "/", label: "Explore" }, { label: "Learn" }]}>
      <article className="legal-card">
        <small>LEARN</small>
        <h1>Commander, explained by the coach</h1>
        <p className="updated">Essays on how the deck coach counts a curve, a mana base, interaction, and card advantage, plus set reviews and commander notes grounded in printed text. Drafts are not listed.</p>
        <CategoryNav current="all" />
        {CATEGORIES.filter((category) => category.id !== "news").map((category) => (
          <section key={category.id}>
            <h2>{category.label}</h2>
            <p>{category.blurb}</p>
            <ArticleList articles={articles.filter((article) => article.category === category.id)} />
          </section>
        ))}
        <section>
          <h2>News</h2>
          <p>The scheduled notes land on the news feed. A run with nothing new still writes one essay from the topic queue, then a person can pull it from the review list.</p>
          <p><a href="/learn/news">Open the news feed</a> · <a href="/learn/news/rss.xml">RSS</a></p>
          <div data-learn-slot="live" />
        </section>
        <BuildCta href="/?intent=build" label="Build this" text="When a note names the commander, the next step is the forge." />
        <p className="updated">Library dated {SEED_CLOCK}</p>
      </article>
      <LearnLinks />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </LearnFrame>
  );
}
