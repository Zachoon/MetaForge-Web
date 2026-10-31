import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { seedArticles } from "../app/learn/catalog.mjs";
import { parseFeed, parseScryfallCards } from "../app/learn/feeds.mjs";
import { presentCard } from "../app/learn/grounding.mjs";
import { buildNewsArticle } from "../app/learn/news.mjs";
import { collectSources, planSchedule } from "../app/learn/pipeline.mjs";
import { decidePublication, newsIntervalHours, quoteIsVerified, scheduleDue } from "../app/learn/policy.mjs";
import { buildSetReview } from "../app/learn/set-review.mjs";
import { NEWS_SOURCES, robotsAllows } from "../app/learn/sources.mjs";
import { buildTheoryArticles } from "../app/learn/theory.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("robots.txt blocks reddit and allows the EDHREC article feed", async () => {
  const reddit = await read("../app/learn/fixtures/robots-reddit.txt");
  const edhrec = await read("../app/learn/fixtures/robots-edhrec.txt");
  assert.equal(robotsAllows(reddit, "/r/EDH/new.json"), false);
  assert.equal(robotsAllows(edhrec, "/articles/feed/"), true);
  assert.equal(robotsAllows(edhrec, "/articles/embed/story"), false);
  assert.equal(robotsAllows("<html>challenge</html>", "/feed"), false);
});

test("recorded feeds parse without keeping a full article body", async () => {
  const edhrec = parseFeed(await read("../app/learn/fixtures/edhrec-sample.xml"));
  const goldfish = parseFeed(await read("../app/learn/fixtures/goldfish-sample.xml"));
  assert.equal(edhrec.length, 2);
  assert.match(edhrec[1].title, /Isshin/);
  assert.equal(edhrec[1].publishedAt, "2026-10-30");
  assert.doesNotMatch(edhrec[1].text, /<p/i);
  assert.equal(goldfish.length, 2);
  assert.match(goldfish[0].title, /Star Trek/);
  assert.equal(parseFeed("<html> </html>").length, 0);
  assert.equal(parseScryfallCards("not-json").length, 0);
});

test("the collector does not request a URL robots.txt disallows", async () => {
  const requested = [];
  const reddit = NEWS_SOURCES.find((source) => source.id === "reddit-edh");
  const result = await collectSources({
    sources: [reddit],
    fetchImpl: async (url) => {
      requested.push(url);
      if (String(url).endsWith("/robots.txt")) return new Response(await read("../app/learn/fixtures/robots-reddit.txt"));
      return new Response("nope", { status: 500 });
    },
    parseFeed,
    parseCards: parseScryfallCards,
  });
  assert.deepEqual(requested, ["https://www.reddit.com/robots.txt"]);
  assert.equal(result.items.length, 0);
  assert.match(result.failures[0].error, /robots/);
});

test("seed articles publish from engine output and stored oracle text", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const fracture = await json("../app/learn/fixtures/reality-fracture.json");
  const articles = seedArticles();
  assert.ok(articles.length >= 4 && articles.length <= 6);
  assert.ok(articles.every((article) => article.status === "published" && article.indexable));
  assert.equal(articles.filter((article) => article.category === "theory").length, 4);
  const review = articles.find((article) => article.topicKey === "set-review:fra");
  assert.equal(review.setReleasedAt, fracture.set.released_at);
  assert.match(review.thesis, new RegExp(fracture.set.released_at));
  for (const article of articles) {
    assert.equal(decidePublication(article, articles.filter((other) => other.slug !== article.slug)).status, "published");
    assert.doesNotMatch(JSON.stringify(article), /\$\d|\busd\b/i);
    for (const section of article.sections) {
      for (const card of section.cards || []) {
        if (!card.quote) continue;
        assert.ok(card.oracleText.replace(/\s+/g, " ").includes(card.quote), card.name);
      }
    }
  }
  const rebuilt = buildTheoryArticles(staples, "2026-10-31");
  assert.equal(rebuilt[0].engineTake.includes(String(rebuilt[0].wordCount)), false);
  const curve = articles.find((article) => article.topicKey === "theory:curve");
  assert.match(curve.thesis, /2\.6/);
  assert.match(curve.thesis, /4\.1/);
  const setReview = buildSetReview(fracture, "2026-10-31");
  assert.equal(setReview.status, "published");
  assert.equal(setReview.mentionedNames.every((name) => fracture.cards.some((card) => card.name === name) || articles.some((article) => article.commanderLinks?.some((link) => link.name === name))), true);
});

test("prose publishes only when the quote and card names check out", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const sword = presentCard(staples.find((card) => card.name === "Swords to Plowshares"));
  const sourceText = `Swords to Plowshares still exiles a creature. ${"The coach can talk about that printed effect without adding a price or a record. ".repeat(8)}`;
  const good = buildNewsArticle({
    sourceId: "edhrec",
    sourceTitle: "EDHREC",
    title: "A note that names Swords to Plowshares",
    url: "https://edhrec.com/articles/example",
    text: sourceText,
    publishedAt: "2026-10-30",
    reachable: true,
  }, { now: "2026-10-31", knownCards: [sword] });
  assert.equal(quoteIsVerified(good.externalQuote.text, sourceText), true);
  assert.equal(good.externalQuote.text.includes("."), true);
  assert.equal((good.externalQuote.text.match(/[.!?]/g) || []).length, 1);
  assert.ok(good.mentionedNames.includes("Swords to Plowshares"));

  const invented = buildNewsArticle({
    sourceId: "edhrec",
    sourceTitle: "EDHREC",
    title: "A note with a made-up card",
    url: "https://edhrec.com/articles/invented",
    text: sourceText,
    reachable: true,
  }, {
    now: "2026-10-31",
    knownCards: [sword],
    modelReady: true,
    summarize: () => ({ summary: "Also sleeve Definitely Not A Real Card from this set." }),
  });
  invented.mentionedNames = [...invented.mentionedNames, "Definitely Not A Real Card"];
  const decision = decidePublication({ ...invented, wordCount: 400 }, []);
  assert.equal(decision.status, "draft");
  assert.equal(decision.indexable, false);
  assert.ok(decision.reasons.some((reason) => reason.includes("unknown-card")));

  const offline = buildNewsArticle({
    sourceId: "wizards-news",
    sourceTitle: "Wizards of the Coast",
    title: "Unreachable dispatch",
    url: "https://magic.wizards.com/en/news/example",
    text: sourceText,
    reachable: false,
  }, { now: "2026-10-31", knownCards: [sword] });
  assert.equal(offline.status, "draft");
  assert.ok(offline.reasons.includes("source-unreachable"));
});

test("a failed model falls back to the native note", () => {
  let calls = 0;
  const article = buildNewsArticle({
    sourceId: "mtggoldfish",
    sourceTitle: "MTGGoldfish",
    title: "Gallery",
    url: "https://www.mtggoldfish.com/articles/example",
    text: "All the remaining cards from the Star Trek set, including the last two rares.",
    reachable: true,
  }, {
    now: "2026-10-31",
    modelReady: false,
    summarize: () => { calls += 1; return { summary: "should not run" }; },
  });
  assert.equal(calls, 0);
  assert.doesNotMatch(article.thesis, /should not run/);
  const crashed = buildNewsArticle({
    sourceId: "mtggoldfish",
    sourceTitle: "MTGGoldfish",
    title: "Gallery two",
    url: "https://www.mtggoldfish.com/articles/example-2",
    text: "Joe Dyer takes a look at the Metalcraft aggro deck floating around.",
    reachable: true,
  }, { now: "2026-10-31", modelReady: true, summarize: () => { throw new Error("model down"); } });
  assert.doesNotMatch(crashed.thesis, /model down/);
});

test("no new items writes one evergreen essay and news suppresses it", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const older = await json("../app/learn/fixtures/older-set.json");
  const now = Date.parse("2026-10-31T12:00:00Z");
  const quiet = planSchedule({
    existing: seedArticles(),
    coverage: [],
    now,
    cardPool: staples,
    olderSet: older,
    priorItems: [],
    sourcesSucceeded: 2,
    sourceFailures: 0,
  });
  assert.equal(quiet.reason, "evergreen");
  assert.equal(quiet.articles.length, 1);
  assert.equal(quiet.articles[0].reviewState, "needs_review");
  assert.doesNotMatch(JSON.stringify(quiet.articles[0]), /\$\d/);

  const noisy = planSchedule({
    newsItems: [{
      sourceId: "edhrec",
      sourceTitle: "EDHREC",
      title: "Isshin, Two Heavens as One returns in a headline",
      url: "https://edhrec.com/articles/isshin-example",
      text: "Isshin, Two Heavens as One is the subject of this note. The rest of the fetched text stays at the source.",
      publishedAt: "2026-10-30",
      reachable: true,
      dedupeKey: "edhrec:https://edhrec.com/articles/isshin-example",
    }],
    existing: seedArticles(),
    now,
    cardPool: staples,
    sourcesSucceeded: 1,
    sourceFailures: 0,
  });
  assert.equal(noisy.reason, "news");
  assert.equal(noisy.articles.length, 1);
  assert.notEqual(noisy.articles[0].provenance, "evergreen-prose");

  const down = planSchedule({ sourcesSucceeded: 0, sourceFailures: 3, now, existing: seedArticles(), cardPool: staples });
  assert.equal(down.reason, "sources-unreachable");
  assert.equal(down.articles.length, 0);
});

test("topic cooldown and duplicate keys skip a repeat", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const older = await json("../app/learn/fixtures/older-set.json");
  const now = Date.parse("2026-10-31T12:00:00Z");
  const first = planSchedule({ existing: seedArticles(), now, cardPool: staples, olderSet: older, sourcesSucceeded: 1 });
  const again = planSchedule({
    existing: [...seedArticles(), ...first.articles],
    coverage: [{ topicId: first.topic, coveredAt: now }],
    now: now + 60 * 60 * 1000,
    cardPool: staples,
    olderSet: older,
    sourcesSucceeded: 1,
  });
  assert.notEqual(again.topic, first.topic);
  assert.equal(newsIntervalHours("3"), 3);
  assert.equal(newsIntervalHours("nope"), 3);
  assert.equal(scheduleDue(now, now + 2 * 60 * 60 * 1000, 3), false);
  assert.equal(scheduleDue(now, now + 3 * 60 * 60 * 1000, 3), true);
});

test("a price or a thin page cannot publish", () => {
  const article = seedArticles()[0];
  const priced = { ...article, slug: "priced", topicKey: "theory:priced", thesis: `${article.thesis} It costs $12.00.` };
  assert.equal(decidePublication(priced, []).status, "draft");
  const thin = { ...article, slug: "thin", topicKey: "theory:thin", hook: "Short.", thesis: "Too short.", sections: [{ id: "a", heading: "A", paragraphs: ["One."] }], takeaways: ["Only one"] };
  assert.equal(decidePublication({ ...thin, wordCount: 12 }, []).indexable, false);
});
