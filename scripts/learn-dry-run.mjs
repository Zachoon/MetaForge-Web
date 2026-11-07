// Read-only sample of the Learn scheduler. Prints articles. Writes nothing.
import { readFile } from "node:fs/promises";
import { COMMANDER_GUIDES } from "../app/commanders/data.mjs";
import { seedArticles } from "../app/learn/catalog.mjs";
import { EVERGREEN_TOPICS } from "../app/learn/evergreen.mjs";
import { parseFeed, parseScryfallCards } from "../app/learn/feeds.mjs";
import { collectSources, planSchedule } from "../app/learn/pipeline.mjs";
import { NEWS_SOURCES } from "../app/learn/sources.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const now = Date.parse("2026-11-07T16:00:00Z");

function block(article) {
  const sources = (article.sources || []).map((source) => `- ${source.label}: ${source.url}`).join("\n");
  const sections = (article.sections || []).map((section) => {
    const paragraphs = (section.paragraphs || []).map((paragraph) => paragraph).join("\n\n");
    return `### ${section.heading}\n\n${paragraphs}`;
  }).join("\n\n");
  const takeaways = (article.takeaways || []).map((item) => `- ${item}`).join("\n");
  return [
    `## ${article.title}`,
    "",
    `${article.category} · ${article.status} · ${article.provenance}`,
    article.engineTake ? `Engine: ${article.engineTake}` : "",
    sources ? `Sources:\n${sources}` : "Sources: none",
    "",
    article.hook || "",
    "",
    article.thesis || "",
    "",
    sections,
    "",
    "Takeaways:",
    takeaways,
  ].filter((line) => line !== undefined).join("\n");
}

const staples = JSON.parse(await read("../app/learn/fixtures/staples.json")).cards;
const older = JSON.parse(await read("../app/learn/fixtures/older-set.json"));
const existing = seedArticles();

const theory = planSchedule({
  existing,
  coverage: [],
  now,
  cardPool: staples,
  olderSet: older,
  sourcesSucceeded: 2,
  sourceFailures: 0,
});

const spotlightCoverage = EVERGREEN_TOPICS.filter((topic) => topic.kind !== "spotlight").flatMap((topic) => {
  if (topic.kind === "upgrade") return COMMANDER_GUIDES.map((guide) => ({ topicId: `upgrade:${guide.slug}`, coveredAt: now }));
  return [{ topicId: topic.id, coveredAt: now }];
});
const spotlight = planSchedule({
  existing,
  coverage: spotlightCoverage,
  now,
  cardPool: staples,
  olderSet: older,
  priorItems: [],
  sourcesSucceeded: 2,
});

const outage = planSchedule({
  existing,
  now,
  cardPool: staples,
  olderSet: older,
  sourcesSucceeded: 0,
  sourceFailures: 4,
  coverage: [{ topicId: theory.topic, coveredAt: now }],
});

let live = null;
let liveNote = "Live feeds were not used.";
try {
  const sources = NEWS_SOURCES.filter((source) => ["edhrec", "mtggoldfish", "scryfall-spoiled"].includes(source.id)).map((source) => ({ ...source, gapMs: 0 }));
  const collected = await collectSources({
    sources,
    fetchImpl: fetch,
    parseFeed,
    parseCards: parseScryfallCards,
    now,
  });
  live = planSchedule({
    newsItems: collected.items,
    cardBatches: collected.cardBatches,
    existing,
    now,
    cardPool: staples,
    olderSet: older,
    sourcesSucceeded: collected.succeeded.length,
    sourceFailures: collected.failures.length,
  });
  liveNote = `Live collect succeeded for ${collected.succeeded.join(", ") || "none"}; failures: ${collected.failures.map((failure) => `${failure.sourceId}:${failure.error}`).join(", ") || "none"}. Planner reason: ${live.reason}.`;
} catch (error) {
  liveNote = `Live collect failed: ${String(error).slice(0, 200)}`;
}

const liveNews = (live?.articles || []).find((article) => article.category === "news");
const samples = [theory.articles[0], spotlight.articles[0], liveNews || live?.articles?.[0] || outage.articles[0]].filter(Boolean);
console.log(`# Learn dry run\n\nClock: 2026-11-07T16:00:00Z\n\n${liveNote}\n\nQuiet-run reason: ${theory.reason} (${theory.topic}). Spotlight reason: ${spotlight.reason} (${spotlight.topic}). Outage reason: ${outage.reason} (${outage.topic}).\n`);
for (const article of samples.slice(0, 3)) console.log(`${block(article)}\n`);
