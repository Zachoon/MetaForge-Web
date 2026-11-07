// Published notes shown in the Learn "latest runs" slot. The worker encodes
// them onto the request and the server component renders them, so the HTML
// document and the RSC payload describe the same tree.
export const LEARN_LIVE_HEADER = "x-metaforge-learn-live";
const LIVE_SLOT_LIMIT = 6;

export function liveSlotArticles(articles = []) {
  return articles
    .filter((article) => article && article.status === "published" && article.indexable && article.slug && article.title)
    .slice(0, LIVE_SLOT_LIMIT)
    .map((article) => ({
      slug: String(article.slug),
      category: String(article.category || ""),
      title: String(article.title),
      description: String(article.description || ""),
    }));
}

export function encodeLiveSlot(articles = []) {
  return encodeURIComponent(JSON.stringify(liveSlotArticles(articles)));
}

export function decodeLiveSlot(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((article) => article && typeof article.slug === "string" && article.slug && typeof article.title === "string")
      .slice(0, LIVE_SLOT_LIMIT)
      .map((article) => ({
        slug: article.slug,
        category: String(article.category || ""),
        title: article.title,
        description: String(article.description || ""),
      }));
  } catch {
    return [];
  }
}
