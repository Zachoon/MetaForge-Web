import { SEED_ARTICLES, SEED_CLOCK } from "./seed-articles.mjs";
import { CATEGORIES, categoryById, slugify } from "./policy.mjs";
import { cardFactSentence, presentCard } from "./grounding.mjs";

export { SEED_CLOCK };

export function seedArticles() {
  return SEED_ARTICLES;
}

export function mergeArticles(extra = []) {
  const bySlug = new Map();
  for (const article of [...SEED_ARTICLES, ...extra]) {
    if (article?.slug) bySlug.set(article.slug, article);
  }
  return [...bySlug.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.title.localeCompare(b.title));
}

export function indexableArticles(extra = []) {
  return mergeArticles(extra).filter((article) => article.status === "published" && article.indexable);
}

export function articleBySlug(slug, extra = []) {
  return mergeArticles(extra).find((article) => article.slug === slug) || null;
}

export function articlesInCategory(categoryId, extra = []) {
  return indexableArticles(extra).filter((article) => article.category === categoryId || (categoryId === "spoilers" && article.tags?.includes("spoilers") && article.category !== "set-reviews"));
}

export function articlesWithTag(tag, extra = []) {
  return indexableArticles(extra).filter((article) => (article.tags || []).includes(tag));
}

export function relatedArticles(article, extra = [], limit = 3) {
  return indexableArticles(extra)
    .filter((other) => other.slug !== article.slug)
    .map((other) => ({
      other,
      score: (other.category === article.category ? 2 : 0) + (other.tags || []).filter((tag) => (article.tags || []).includes(tag)).length,
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.other.title.localeCompare(b.other.title))
    .slice(0, limit)
    .map((row) => row.other);
}

export function cardsInArticle(article) {
  const cards = new Map();
  for (const section of article?.sections || []) {
    for (const card of section.cards || []) {
      if (!card?.name || !card.oracleText) continue;
      const slug = card.slug || slugify(card.name);
      cards.set(slug, { ...card, slug });
    }
  }
  return [...cards.values()];
}

export function allCards(extra = []) {
  const cards = new Map();
  const inbound = new Map();
  for (const article of indexableArticles(extra)) {
    for (const card of cardsInArticle(article)) {
      cards.set(card.slug, card);
      inbound.set(card.slug, [...(inbound.get(card.slug) || []), article]);
    }
  }
  return [...cards.values()].map((card) => cardPageModel(card, inbound.get(card.slug) || []));
}

export function cardPageModel(card, referring = []) {
  const presented = presentCard(card);
  const paragraphs = [
    cardFactSentence(presented),
    presented.roles.length
      ? `${presented.name} is on this page because a published note already scored it. The roles are ${presented.roles.join(", ")}. A role is the pattern the rules text matched. It is not a ranking, a price, or a promise about how often the card shows up.`
      : `${presented.name} is on this page because a published note quoted it. The classifiers did not assign a role. That silence is a reason to read the rules text, not a reason to invent a job for the card.`,
    referring.length
      ? `Read it in context: ${referring.map((article) => article.title).join("; ")}. Those notes are the argument. This page is the card.`
      : "No published note currently points here.",
    "The coach's opinion: use the quoted sentence as the job. If the sentence does not solve the problem your last game had, the card does not belong in the deck yet, however new or famous it is.",
  ];
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  const indexable = words >= 80 && presented.oracleText.length >= 20 && referring.length > 0;
  return { ...presented, paragraphs, referring, words, indexable };
}

export function cardBySlug(slug, extra = []) {
  return allCards(extra).find((card) => card.slug === slug) || null;
}

export function staticLearnSitemapEntries(extra = []) {
  const articles = indexableArticles(extra);
  const clock = articles[0]?.updatedAt || SEED_CLOCK;
  const entries = [
    { loc: "https://metaforge.gg/learn", lastmod: clock, changefreq: "daily", priority: "0.8" },
    { loc: "https://metaforge.gg/learn/news", lastmod: clock, changefreq: "daily", priority: "0.6" },
  ];
  for (const category of CATEGORIES) {
    if (category.id === "news") continue;
    if (articlesInCategory(category.id, extra).length) {
      entries.push({ loc: `https://metaforge.gg/learn/category/${category.id}`, lastmod: clock, changefreq: "weekly", priority: "0.6" });
    }
  }
  const tags = new Map();
  for (const article of articles) {
    for (const tag of article.tags || []) tags.set(tag, (tags.get(tag) || 0) + 1);
  }
  for (const [tag, count] of tags) {
    if (count >= 2) entries.push({ loc: `https://metaforge.gg/learn/tag/${tag}`, lastmod: clock, changefreq: "weekly", priority: "0.4" });
  }
  for (const article of articles) {
    entries.push({ loc: `https://metaforge.gg/learn/${article.slug}`, lastmod: article.updatedAt || clock, changefreq: "monthly", priority: "0.7" });
  }
  for (const card of allCards(extra)) {
    if (!card.indexable) continue;
    entries.push({ loc: `https://metaforge.gg/learn/cards/${card.slug}`, lastmod: clock, changefreq: "monthly", priority: "0.4" });
  }
  return entries;
}

export function learnArticleSchema(article) {
  const url = `https://metaforge.gg/learn/${article.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "MetaForge" },
      publisher: { "@type": "Organization", name: "MetaForge", url: "https://metaforge.gg/" },
      articleSection: categoryById(article.category)?.label || article.category,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "MetaForge", item: "https://metaforge.gg/" },
        { "@type": "ListItem", position: 2, name: "Learn", item: "https://metaforge.gg/learn" },
        { "@type": "ListItem", position: 3, name: categoryById(article.category)?.label || "Article", item: `https://metaforge.gg/learn/category/${article.category}` },
        { "@type": "ListItem", position: 4, name: article.title, item: url },
      ],
    },
  ];
}

export function collectionSchema(name, url, description) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    description,
  };
}
