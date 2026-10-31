import staples from "../app/learn/fixtures/staples.json";
import olderSet from "../app/learn/fixtures/older-set.json";
import { COMMANDER_GUIDES } from "../app/commanders/data.mjs";
import { indexableArticles, seedArticles, staticLearnSitemapEntries } from "../app/learn/catalog.mjs";
import { parseFeed, parseScryfallCards } from "../app/learn/feeds.mjs";
import { collectSources, planSchedule } from "../app/learn/pipeline.mjs";
import { decidePublication, newsIntervalHours, scheduleDue } from "../app/learn/policy.mjs";
import { articleDocument, escapeHtml } from "../app/learn/render-html.mjs";
import { NEWS_SOURCES } from "../app/learn/sources.mjs";
import { userKey } from "./account-bench";

interface LearnEnv {
  DB: D1Database;
  LEARN_NEWS_INTERVAL_HOURS?: string;
  METAFORGE_FOUNDER_USER_KEY?: string;
}

function log(event: Record<string, unknown>) {
  console.log(JSON.stringify({ component: "learn", ...event }));
}

async function rows(env: LearnEnv, sql: string, ...binds: unknown[]): Promise<Record<string, any>[]> {
  const result = await env.DB.prepare(sql).bind(...binds).all<Record<string, any>>();
  return result.results || [];
}

export async function loadDynamicArticles(env: LearnEnv) {
  try {
    const stored = await rows(env, "SELECT article_json FROM learn_articles");
    return stored.map((row) => JSON.parse(String(row.article_json || "{}"))).filter((article) => article?.slug);
  } catch {
    return [];
  }
}

export async function dynamicLearnSitemapEntries(env: LearnEnv) {
  const staticLocs = new Set(staticLearnSitemapEntries().map((entry) => entry.loc));
  try {
    const stored = await rows(env, "SELECT slug, updated_at, article_json FROM learn_articles WHERE status = 'published' AND indexable = 1");
    return stored.flatMap((row) => {
      const loc = `https://metaforge.gg/learn/${row.slug}`;
      if (!row.slug || staticLocs.has(loc)) return [];
      let updated = String(row.updated_at || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
        try { updated = String(JSON.parse(String(row.article_json || "{}")).updatedAt || "").slice(0, 10); } catch { updated = ""; }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) return [];
      return [{ loc, lastmod: updated, changefreq: "weekly", priority: "0.6" }];
    });
  } catch {
    return [];
  }
}

export async function runLearnSchedule(env: LearnEnv, fetchImpl: typeof fetch = fetch, now = Date.now()) {
  const intervalHours = newsIntervalHours(env.LEARN_NEWS_INTERVAL_HOURS);
  try {
    const last = await env.DB.prepare("SELECT finished_at, status FROM learn_runs WHERE status = 'complete' ORDER BY started_at DESC LIMIT 1").first<{ finished_at: number; status: string }>();
    if (last && !scheduleDue(last.finished_at, now, intervalHours)) {
      log({ event: "learn_schedule_skip", reason: "interval", intervalHours, lastFinishedAt: last.finished_at });
      return { skipped: true, intervalHours };
    }
    let cacheRows: { source_id?: string; robots_body?: string; etag?: string; body?: string }[] = [];
    try { cacheRows = await rows(env, "SELECT source_id, robots_body, etag, body FROM learn_source_cache"); } catch { cacheRows = []; }
    const cache: Record<string, { robots?: string; etag?: string; body?: string }> = {};
    for (const row of cacheRows) {
      if (!row.source_id) continue;
      cache[row.source_id] = { robots: row.robots_body || undefined, etag: row.etag || undefined, body: row.body || undefined };
    }
    const collected = await collectSources({
      sources: NEWS_SOURCES,
      fetchImpl,
      cache,
      now,
      parseFeed,
      parseCards: parseScryfallCards,
    });
    const dynamic = await loadDynamicArticles(env);
    const existing = [...seedArticles(), ...dynamic];
    let coverage: { topicId: string; coveredAt: number }[] = [];
    try {
      const covered = await rows(env, "SELECT topic_id, covered_at FROM learn_topic_coverage");
      coverage = covered.map((row) => ({ topicId: String(row.topic_id), coveredAt: Number(row.covered_at) }));
    } catch { coverage = []; }
    const priorItems = dynamic.filter((article) => article.category === "news" && article.grounding?.sourceText).slice(0, 4);
    const plan = planSchedule({
      newsItems: collected.items,
      cardBatches: collected.cardBatches,
      existing,
      coverage,
      now,
      cardPool: [
        ...staples.cards,
        ...olderSet.cards,
        ...COMMANDER_GUIDES.map((guide: { card: { name: string; mana_cost: string; type_line: string; oracle_text: string; color_identity: string[] } }) => ({
          name: guide.card.name,
          mana_cost: guide.card.mana_cost,
          type_line: guide.card.type_line,
          oracle_text: guide.card.oracle_text,
          color_identity: guide.card.color_identity,
        })),
      ],
      olderSet,
      priorItems,
      sourcesSucceeded: collected.succeeded.length,
      sourceFailures: collected.failures.length,
      modelReady: false,
    });
    for (const article of plan.articles) {
      await env.DB.prepare(`INSERT INTO learn_articles (slug, topic_key, dedupe_key, category, status, indexable, provenance, review_state, title, published_at, updated_at, article_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET status = excluded.status, indexable = excluded.indexable, review_state = excluded.review_state, title = excluded.title, updated_at = excluded.updated_at, article_json = excluded.article_json`)
        .bind(article.slug, article.topicKey, article.dedupeKey, article.category, article.status, article.indexable ? 1 : 0, article.provenance, article.reviewState, article.title, article.publishedAt, article.updatedAt, JSON.stringify(article))
        .run();
    }
    if (plan.topic) {
      const slug = plan.articles[0]?.slug || null;
      await env.DB.prepare("INSERT INTO learn_topic_coverage (topic_id, slug, covered_at) VALUES (?, ?, ?) ON CONFLICT(topic_id) DO UPDATE SET slug = excluded.slug, covered_at = excluded.covered_at")
        .bind(plan.topic, slug, now).run();
      const specific = plan.articles[0]?.topicId;
      if (specific && specific !== plan.topic) {
        await env.DB.prepare("INSERT INTO learn_topic_coverage (topic_id, slug, covered_at) VALUES (?, ?, ?) ON CONFLICT(topic_id) DO UPDATE SET slug = excluded.slug, covered_at = excluded.covered_at")
          .bind(specific, slug, now).run();
      }
    }
    for (const [sourceId, value] of Object.entries(collected.cache) as [string, { robots?: string; etag?: string; body?: string }][]) {
      await env.DB.prepare("INSERT INTO learn_source_cache (source_id, robots_body, etag, body, fetched_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET robots_body = excluded.robots_body, etag = excluded.etag, body = excluded.body, fetched_at = excluded.fetched_at")
        .bind(sourceId, value.robots || null, value.etag || null, value.body ? String(value.body).slice(0, 20000) : null, now).run();
    }
    const summary = {
      event: "learn_schedule_complete",
      intervalHours,
      reason: plan.reason,
      topic: plan.topic,
      sourcesSucceeded: collected.succeeded,
      failures: collected.failures,
      written: plan.articles.map((article) => ({ slug: article.slug, status: article.status, indexable: article.indexable })),
    };
    log(summary);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO learn_runs (id, started_at, finished_at, status, interval_hours, sources_checked, items_seen, items_new, evergreen_topic, error, log_json) VALUES (?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, now, now, intervalHours, NEWS_SOURCES.length, collected.items.length + collected.cardBatches.length, plan.articles.length, plan.topic, collected.failures.length ? JSON.stringify(collected.failures).slice(0, 500) : null, JSON.stringify(summary))
      .run();
    return { skipped: false, ...summary };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 300);
    log({ event: "learn_schedule_error", message });
    return { skipped: false, error: message };
  }
}

function rssDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return new Date().toUTCString();
  return parsed.toUTCString();
}

export async function learnRssResponse(env: LearnEnv) {
  const dynamic = await loadDynamicArticles(env);
  const articles = indexableArticles(dynamic);
  const items = articles.map((article) => `<item><title>${escapeHtml(article.title)}</title><link>https://metaforge.gg/learn/${article.slug}</link><guid>https://metaforge.gg/learn/${article.slug}</guid><pubDate>${rssDate(article.updatedAt || article.publishedAt || "")}</pubDate><description>${escapeHtml(article.description)}</description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>MetaForge Learn</title><link>https://metaforge.gg/learn/news</link><description>Commander notes from the MetaForge coach. Published essays only.</description><atom:link href="https://metaforge.gg/learn/news/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}

export async function maybeDynamicLearnArticle(url: URL, env: LearnEnv) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "learn" || parts.length !== 2) return null;
  if (["news", "category", "tag", "cards"].includes(parts[1])) return null;
  if (seedArticles().some((article) => article.slug === parts[1])) return null;
  const dynamic = await loadDynamicArticles(env);
  const article = dynamic.find((item) => item.slug === parts[1]);
  if (!article) return null;
  const related = indexableArticles(dynamic).filter((item) => item.slug !== article.slug && item.category === article.category).slice(0, 3);
  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" };
  if (!article.indexable || article.status !== "published") headers["x-robots-tag"] = "noindex, nofollow";
  return new Response(articleDocument(article, related), { headers });
}

async function founder(request: Request, env: LearnEnv) {
  const key = await userKey(request, env);
  return Boolean(key && env.METAFORGE_FOUNDER_USER_KEY && key === env.METAFORGE_FOUNDER_USER_KEY);
}

export async function handleLearnReview(request: Request, env: LearnEnv) {
  if (!(await founder(request, env))) return Response.json({ error: "Founder access required" }, { status: 403 });
  if (request.method === "GET") {
    try {
      const stored = await rows(env, "SELECT slug, title, status, review_state, category, updated_at, article_json FROM learn_articles WHERE status = 'draft' OR review_state = 'needs_review' ORDER BY updated_at DESC LIMIT 100");
      const items = stored.map((row) => {
        let reasons: string[] = [];
        try { reasons = JSON.parse(String(row.article_json || "{}")).reasons || []; } catch { reasons = []; }
        return { slug: row.slug, title: (row as { title?: string }).title, status: (row as { status?: string }).status, reviewState: (row as { review_state?: string }).review_state, category: (row as { category?: string }).category, updatedAt: row.updated_at, reasons };
      });
      const runs = await rows(env, "SELECT id, started_at, finished_at, status, interval_hours, sources_checked, items_seen, items_new, evergreen_topic, error FROM learn_runs ORDER BY started_at DESC LIMIT 10");
      return Response.json({ items, runs });
    } catch (error) {
      return Response.json({ items: [], runs: [], storage: "unavailable", detail: String(error).slice(0, 200) });
    }
  }
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const body = await request.json().catch(() => null) as { slug?: string; status?: string } | null;
  const slug = String(body?.slug || "");
  const status = body?.status === "published" ? "published" : body?.status === "draft" ? "draft" : "";
  if (!slug || !status) return Response.json({ error: "slug and status are required" }, { status: 400 });
  const dynamic = await loadDynamicArticles(env);
  const article = dynamic.find((item) => item.slug === slug);
  if (!article) return Response.json({ error: "Article not found" }, { status: 404 });
  if (status === "draft") {
    article.status = "draft";
    article.indexable = false;
    article.reviewState = "needs_review";
  } else {
    const decision = decidePublication(article, [...seedArticles(), ...dynamic.filter((item) => item.slug !== slug)]);
    if (decision.status !== "published") return Response.json({ error: "Confidence and substance checks failed", reasons: decision.reasons }, { status: 400 });
    article.status = "published";
    article.indexable = true;
    article.reviewState = "approved";
    article.reasons = [];
  }
  await env.DB.prepare("UPDATE learn_articles SET status = ?, indexable = ?, review_state = ?, article_json = ?, updated_at = ? WHERE slug = ?")
    .bind(article.status, article.indexable ? 1 : 0, article.reviewState, JSON.stringify(article), article.updatedAt, slug).run();
  return Response.json({ slug, status: article.status, indexable: article.indexable, reviewState: article.reviewState });
}
