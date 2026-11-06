// Publication, substance, and dedupe rules for Learn articles.
// A page is indexable only when it clears these checks.

export const MIN_WORDS = 320;
export const MIN_SECTIONS = 3;
export const MIN_TAKEAWAYS = 2;
export const DUPLICATE_JACCARD = 0.72;
export const DEFAULT_NEWS_INTERVAL_HOURS = 3;
export const MAX_EXTERNAL_QUOTE = 180;

export const CATEGORIES = Object.freeze([
  { id: "theory", label: "Theory", blurb: "How the coach thinks about curve, mana, interaction, and card advantage." },
  { id: "spoilers", label: "New Cards / Spoilers", blurb: "Newly released or previewed cards, scored from their printed text." },
  { id: "set-reviews", label: "Set Reviews", blurb: "What a set's new cards add to a Commander deck, counted by the coach." },
  { id: "commander-spotlights", label: "Commander Spotlights", blurb: "One legend at a time, from its own rules text." },
  { id: "news", label: "News", blurb: "Short original notes on public sources, with a link back." },
]);

export const RESERVED_SLUGS = new Set(["news", "category", "tag", "cards", "review", "rss", "rss.xml"]);

const STOP = new Set("a an the of to and or for in on with without from by is are was were be this that it its as at your you we our not".split(" "));

export function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  if (!slug || RESERVED_SLUGS.has(slug)) return slug ? `${slug}-note` : "note";
  return slug;
}

export function uniqueSlug(base, existingSlugs) {
  const taken = new Set(existingSlugs);
  let slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

export function articleText(article) {
  const parts = [
    article.hook,
    article.thesis,
    article.engineTake,
    ...(article.takeaways || []),
    ...((article.sections || []).flatMap((section) => [section.heading, ...(section.paragraphs || [])])),
  ];
  return parts.filter(Boolean).join(" ");
}

export function wordCount(article) {
  const text = articleText(article).replace(/\[\[[^\]]+\]\]/g, " ");
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

export function mentionsPrice(article) {
  const blob = articleText(article);
  return /\$\s?\d|\b\d+\.\d{2}\b|\busd\b|\btcgplayer\b/i.test(blob);
}

function significantWords(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

export function jaccard(left, right) {
  const a = significantWords(left);
  const b = significantWords(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function isNearDuplicate(article, other) {
  if (!other || article.slug === other.slug) return false;
  if (article.topicKey && article.topicKey === other.topicKey) return true;
  const left = `${article.title} ${article.thesis || ""}`;
  const right = `${other.title} ${other.thesis || ""}`;
  return jaccard(left, right) >= DUPLICATE_JACCARD;
}

function sentenceCount(value) {
  return (String(value || "").match(/[.!?]+/g) || []).length;
}

export function quoteIsVerified(quote, sourceText) {
  if (!quote) return true;
  const text = String(quote).replace(/\s+/g, " ").trim();
  const source = String(sourceText || "").replace(/\s+/g, " ");
  if (!text || text.length > MAX_EXTERNAL_QUOTE) return false;
  if (sentenceCount(text) !== 1) return false;
  return source.includes(text);
}

export function assessSubstance(article) {
  const failures = [];
  const words = article.wordCount ?? wordCount(article);
  if (words < MIN_WORDS) failures.push(`thin:${words}<${MIN_WORDS}`);
  if ((article.sections || []).length < MIN_SECTIONS) failures.push("too-few-sections");
  if ((article.takeaways || []).length < MIN_TAKEAWAYS) failures.push("too-few-takeaways");
  if (!article.topicKey) failures.push("missing-topic");
  if (mentionsPrice(article)) failures.push("price-claim");
  const known = new Set(article.grounding?.knownNames || []);
  for (const name of article.mentionedNames || []) {
    if (!known.has(name)) failures.push(`unknown-card:${name}`);
  }
  for (const section of article.sections || []) {
    for (const card of section.cards || []) {
      if (card.quote && !String(card.oracleText || "").replace(/\s+/g, " ").includes(String(card.quote).replace(/\s+/g, " "))) {
        failures.push(`unverified-oracle:${card.name}`);
      }
    }
  }
  if (article.setReleasedAt && article.grounding?.setReleasedAt && article.setReleasedAt !== article.grounding.setReleasedAt) {
    failures.push("release-date-mismatch");
  }
  if (article.setReleasedAt && !article.grounding?.setReleasedAt) failures.push("release-date-without-source");
  return { ok: failures.length === 0, failures, words };
}

export function assessConfidence(article) {
  const failures = [];
  const unknownCards = [];
  const known = new Set(article.grounding?.knownNames || []);
  for (const name of article.mentionedNames || []) {
    if (!known.has(name)) unknownCards.push(name);
  }
  if (unknownCards.length) failures.push("unknown-card-names");
  const quote = article.externalQuote?.text || "";
  const quotesVerified = quoteIsVerified(quote, article.grounding?.sourceText || "");
  if (quote && !quotesVerified) failures.push("quote-not-in-source");
  const dataDerived = article.provenance === "engine-template" || article.provenance === "card-data";
  const sourceReachable = dataDerived ? Boolean(article.grounding?.present) : article.grounding?.sourceReachable === true;
  if (!sourceReachable) failures.push("source-unreachable");
  return { sourceReachable, quotesVerified, unknownCards, failures };
}

export function decidePublication(article, existing = []) {
  const substance = assessSubstance(article);
  const confidence = assessConfidence(article);
  const duplicate = existing.find((other) => isNearDuplicate(article, other));
  const failures = [...substance.failures];
  if (duplicate) failures.push("near-duplicate");
  const dataDerived = article.provenance === "engine-template" || article.provenance === "card-data";
  if (failures.length) {
    return { status: "draft", indexable: false, reviewState: "needs_review", reasons: failures, confidence };
  }
  if (dataDerived) {
    return { status: "published", indexable: true, reviewState: "auto", reasons: [], confidence };
  }
  if (confidence.failures.length) {
    return { status: "draft", indexable: false, reviewState: "needs_review", reasons: confidence.failures, confidence };
  }
  return { status: "published", indexable: true, reviewState: "needs_review", reasons: [], confidence };
}

export function newsIntervalHours(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_NEWS_INTERVAL_HOURS;
  return Math.min(168, Math.max(1, Math.floor(parsed)));
}

export function scheduleDue(lastFinishedAt, now, intervalHours) {
  if (lastFinishedAt == null || lastFinishedAt === "") return true;
  const then = Number(lastFinishedAt);
  if (!Number.isFinite(then)) return true;
  return Number(now) - then >= intervalHours * 60 * 60 * 1000;
}

export function categoryById(id) {
  return CATEGORIES.find((category) => category.id === id) || null;
}
