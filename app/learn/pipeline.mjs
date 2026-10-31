// One scheduled pass: collect nothing here (the worker does IO), decide
// whether the new items are news or whether the queue owes an essay.

import { writeEvergreen, selectEvergreenTopic } from "./evergreen.mjs";
import { parseRedditListing } from "./feeds.mjs";
import { buildNewsArticle, buildSpoilerRoundup } from "./news.mjs";
import { uniqueSlug } from "./policy.mjs";
import { robotsAllows } from "./sources.mjs";

function allocate(article, existing) {
  if (!article) return null;
  const slugs = existing.map((item) => item.slug);
  const slug = slugs.includes(article.slug) ? uniqueSlug(article.slug, slugs) : article.slug;
  return { ...article, slug };
}

/** @param {any} [input] */
export function planSchedule(input = {}) {
  const {
    newsItems = [],
    cardBatches = [],
    existing = [],
    coverage = [],
    now,
    cardPool = [],
    olderSet = null,
    priorItems = [],
    sourcesSucceeded = 0,
    sourceFailures = 0,
    modelReady = false,
    summarize = null,
  } = input;
  if (sourcesSucceeded === 0 && sourceFailures > 0) {
    return { articles: [], reason: "sources-unreachable", topic: null };
  }
  const knownKeys = new Set(existing.map((article) => article.dedupeKey).filter(Boolean));
  const freshNews = newsItems.filter((item) => item && !knownKeys.has(item.dedupeKey));
  const freshCards = cardBatches.filter((batch) => batch && !knownKeys.has(batch.dedupeKey));
  const created = [];
  if (freshCards.length || freshNews.length) {
    for (const batch of freshCards.slice(0, 1)) {
      const article = allocate(buildSpoilerRoundup(batch.cards || [], {
        now: new Date(Number(now)).toISOString().slice(0, 10),
        sourceUrl: batch.sourceUrl,
        setName: batch.setName || null,
        existing: [...existing, ...created],
      }), [...existing, ...created]);
      if (article) created.push(article);
    }
    for (const item of freshNews.slice(0, 4)) {
      const article = allocate(buildNewsArticle(item, {
        now: new Date(Number(now)).toISOString().slice(0, 10),
        knownCards: cardPool,
        modelReady,
        summarize,
        existing: [...existing, ...created],
      }), [...existing, ...created]);
      if (article) created.push(article);
    }
    return { articles: created, reason: "news", topic: null };
  }
  const topic = selectEvergreenTopic({ coverage, now, priorItems, cardPool });
  const article = topic
    ? allocate(writeEvergreen({ topic, now, cardPool, olderSet, priorItems, coverage, existing }), existing)
    : null;
  return {
    articles: article ? [article] : [],
    reason: article ? "evergreen" : "no-topic",
    topic: topic ? topic.id : null,
  };
}

export async function collectSources({ sources, fetchImpl, cache = {}, now = Date.now(), robotsFor = null, parseFeed, parseCards }) {
  const items = [];
  const cardBatches = [];
  const failures = [];
  const succeeded = [];
  const requests = [];
  const nextCache = { ...cache };
  let lastAt = 0;
  for (const source of sources) {
    const gap = source.gapMs ?? 0;
    const wait = Math.max(0, gap - (Date.now() - lastAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    const robotsUrl = source.robotsUrl;
    let robotsText = robotsFor ? robotsFor(source) : nextCache[source.id]?.robots;
    if (robotsUrl && robotsText == null) {
      requests.push(robotsUrl);
      try {
        const response = await fetchImpl(robotsUrl, { headers: { "user-agent": "MetaForgeLearn/1.0" } });
        robotsText = response.ok ? await response.text() : "";
        nextCache[source.id] = { ...(nextCache[source.id] || {}), robots: robotsText, robotsCheckedAt: now };
      } catch (error) {
        failures.push({ sourceId: source.id, error: String(error).slice(0, 200) });
        lastAt = Date.now();
        continue;
      }
    }
    const path = new URL(source.feedUrl).pathname + new URL(source.feedUrl).search;
    if (robotsText != null && !robotsAllows(robotsText, path)) {
      failures.push({ sourceId: source.id, error: "robots-disallow" });
      lastAt = Date.now();
      continue;
    }
    requests.push(source.feedUrl);
    try {
      const headers = { "user-agent": "MetaForgeLearn/1.0", accept: source.kind === "scryfall" || source.kind === "reddit" ? "application/json" : "application/rss+xml, application/atom+xml, text/xml" };
      if (nextCache[source.id]?.etag) headers["if-none-match"] = nextCache[source.id].etag;
      const response = await fetchImpl(source.feedUrl, { headers });
      lastAt = Date.now();
      if (response.status === 304 && nextCache[source.id]?.body) {
        succeeded.push(source.id);
        continue;
      }
      if (!response.ok) {
        failures.push({ sourceId: source.id, error: `http-${response.status}` });
        continue;
      }
      const body = await response.text();
      const etag = response.headers?.get?.("etag") || null;
      nextCache[source.id] = { ...(nextCache[source.id] || {}), etag, body, fetchedAt: now, robots: robotsText };
      if (source.kind === "scryfall") {
        const cards = parseCards(body).filter((card) => !card.commanderLegal || card.commanderLegal === "legal");
        if (cards.length) {
          cardBatches.push({
            sourceId: source.id,
            sourceUrl: source.feedUrl,
            dedupeKey: `${source.id}:${cards.map((card) => card.id || card.name).sort().join(",")}`.slice(0, 500),
            cards,
          });
        }
        succeeded.push(source.id);
        continue;
      }
      if (source.kind === "reddit") {
        for (const entry of parseRedditListing(body)) {
          items.push({ ...entry, sourceId: source.id, sourceTitle: source.title, reachable: true, dedupeKey: `${source.id}:${entry.url}` });
        }
        succeeded.push(source.id);
        continue;
      }
      const parsed = parseFeed(body);
      if (!parsed.length && !/<(rss|feed)\b/i.test(body)) {
        failures.push({ sourceId: source.id, error: "not-a-feed" });
        continue;
      }
      for (const entry of parsed) {
        items.push({
          ...entry,
          sourceId: source.id,
          sourceTitle: source.title,
          reachable: true,
          dedupeKey: `${source.id}:${entry.url}`,
        });
      }
      succeeded.push(source.id);
    } catch (error) {
      failures.push({ sourceId: source.id, error: String(error).slice(0, 200) });
      lastAt = Date.now();
    }
  }
  return { items, cardBatches, failures, succeeded, requests, cache: nextCache };
}
