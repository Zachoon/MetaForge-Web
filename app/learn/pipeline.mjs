// One scheduled pass: collect nothing here (the worker does IO), decide
// whether the new items are news or whether the queue owes an essay.

import { writeEvergreen, selectEvergreenTopic } from "./evergreen.mjs";
import { parseRedditListing } from "./feeds.mjs";
import { buildNewsArticle, buildSpoilerRoundup } from "./news.mjs";
import { cardIsCurrent, isRecentNews, uniqueSlug } from "./policy.mjs";
import { looksLikeRobots, robotsAllows } from "./sources.mjs";

function allocate(article, existing) {
  if (!article) return null;
  const slugs = existing.map((item) => item.slug);
  const slug = slugs.includes(article.slug) ? uniqueSlug(article.slug, slugs) : article.slug;
  return { ...article, slug };
}

function currentSpoilBatch(batch, now) {
  const cards = (batch?.cards || []).filter((card) => cardIsCurrent(card, now)).slice(0, 12);
  if (!cards.length) return null;
  const dedupeKey = `${batch.sourceId || "scryfall"}:current:${cards.map((card) => card.id || card.name).sort().join(",")}`.slice(0, 500);
  return { ...batch, cards, dedupeKey };
}

function writeFeature(input) {
  const skipped = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const coverage = [...(input.coverage || []), ...skipped.map((topicId) => ({ topicId, coveredAt: input.now }))];
    const topic = selectEvergreenTopic({ ...input, coverage });
    if (!topic) return { article: null, topic: null };
    const article = allocate(writeEvergreen({ ...input, topic, coverage }), input.existing || []);
    if (article) return { article, topic };
    skipped.push(topic.id);
  }
  return { article: null, topic: null };
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
    newsLookbackHours,
    topics,
    guides,
  } = input;
  const outage = sourcesSucceeded === 0 && sourceFailures > 0;
  const knownKeys = new Set(existing.map((article) => article.dedupeKey).filter(Boolean));
  const freshNews = outage
    ? []
    : newsItems.filter((item) => item && !knownKeys.has(item.dedupeKey) && isRecentNews(item.publishedAt, now, newsLookbackHours));
  const freshCards = outage
    ? []
    : cardBatches.map((batch) => currentSpoilBatch(batch, now)).filter((batch) => batch && !knownKeys.has(batch.dedupeKey));
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
    if (created.length) return { articles: created, reason: "news", topic: null };
  }
  const feature = writeFeature({
    coverage,
    now,
    priorItems,
    cardPool,
    olderSet,
    existing,
    topics,
    guides,
  });
  if (!feature.article) {
    return { articles: [], reason: outage ? "sources-unreachable" : "no-topic", topic: null };
  }
  return {
    articles: [feature.article],
    reason: outage ? "feature-after-source-failure" : "evergreen",
    topic: feature.topic.id,
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
        const response = await fetchImpl(robotsUrl, { headers: { "user-agent": "MetaForgeLearn/1.0", accept: "text/plain" } });
        const status = Number(response.status) || 0;
        const body = response.ok ? await response.text() : "";
        if (!response.ok || !looksLikeRobots(body)) {
          failures.push({ sourceId: source.id, error: response.ok ? "robots-unreadable" : `robots-http-${status}` });
          lastAt = Date.now();
          continue;
        }
        robotsText = body;
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
