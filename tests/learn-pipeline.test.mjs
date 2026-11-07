import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { seedArticles } from "../app/learn/catalog.mjs";
import { articleDocument } from "../app/learn/render-html.mjs";
import { parseFeed, parseScryfallCards } from "../app/learn/feeds.mjs";
import { presentCard } from "../app/learn/grounding.mjs";
import { buildNewsArticle } from "../app/learn/news.mjs";
import { EVERGREEN_TOPICS, selectEvergreenTopic } from "../app/learn/evergreen.mjs";
import { collectSources, planSchedule } from "../app/learn/pipeline.mjs";
import { cardIsCurrent, decidePublication, isRecentNews, newsIntervalHours, quoteIsVerified, scheduleDue } from "../app/learn/policy.mjs";
import { buildSetReview } from "../app/learn/set-review.mjs";
import { NEWS_SOURCES, robotsAllows } from "../app/learn/sources.mjs";
import { buildTheoryArticles } from "../app/learn/theory.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("robots.txt blocks reddit and allows the EDHREC article feed", async () => {
  const reddit = await read("../app/learn/fixtures/robots-reddit.txt");
  const edhrec = await read("../app/learn/fixtures/robots-edhrec.txt");
  const scryfall = await read("../app/learn/fixtures/robots-scryfall.txt");
  assert.equal(robotsAllows(reddit, "/r/EDH/new.json"), false);
  assert.equal(robotsAllows(edhrec, "/articles/feed/"), true);
  assert.equal(robotsAllows(edhrec, "/articles/embed/story"), false);
  assert.equal(robotsAllows("<html>challenge</html>", "/feed"), false);
  const scryfallPath = "/cards/search?order=spoiled&dir=desc&q=legal%3Acommander";
  assert.equal(robotsAllows(scryfall, scryfallPath), true);
  assert.equal(NEWS_SOURCES.find((source) => source.id === "scryfall-spoiled").feedUrl.includes("legal%3Acommander"), true);
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

  const stale = planSchedule({
    newsItems: [{
      sourceId: "edhrec",
      sourceTitle: "EDHREC",
      title: "An old announcement that should not become another note",
      url: "https://edhrec.com/articles/old-announcement",
      text: "This item is months old. The feed still lists it. That is not new news.",
      publishedAt: "2026-08-01",
      reachable: true,
      dedupeKey: "edhrec:https://edhrec.com/articles/old-announcement",
    }],
    existing: seedArticles(),
    now,
    cardPool: staples,
    olderSet: older,
    sourcesSucceeded: 1,
  });
  assert.equal(stale.reason, "evergreen");
  assert.equal(stale.articles.length, 1);
  assert.notEqual(stale.articles[0].category, "news");

  const down = planSchedule({ sourcesSucceeded: 0, sourceFailures: 3, now, existing: seedArticles(), cardPool: staples, olderSet: older });
  assert.equal(down.reason, "feature-after-source-failure");
  assert.equal(down.articles.length, 1);
  assert.doesNotMatch(JSON.stringify(down.articles[0].sources || []), /edhrec|mtggoldfish|wizards/i);
  assert.equal(down.articles[0].category === "news", false);

  const silenced = planSchedule({ sourcesSucceeded: 0, sourceFailures: 2, now, existing: seedArticles(), cardPool: staples, topics: [] });
  assert.equal(silenced.reason, "sources-unreachable");
  assert.equal(silenced.articles.length, 0);
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

test("a worker article uses the shared frame, not a separate shell", () => {
  const html = articleDocument(seedArticles()[0], []);
  assert.match(html, /class="mf-site-header"/);
  const topNav = html.match(/<nav class="mf-site-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(topNav, /<a href="\/" aria-current="page">Explore<\/a>/);
  assert.match(topNav, /href="\/tools">Database</);
  assert.match(topNav, /Decks/);
  assert.match(topNav, /Analyze/);
  assert.match(topNav, /Community/);
  assert.doesNotMatch(topNav, />Learn</);
  assert.doesNotMatch(topNav, /Premium/);
  assert.match(html, /<a href="\/learn" aria-current="page"><i aria-hidden="true">☰<\/i><span>Learn<\/span><\/a>/);
  assert.match(html, /class="legal-shell"/);
  assert.match(html, /class="legal-card"/);
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /max-width:65ch/);
  assert.match(html, /width:min\(42rem,100%\)/);
  assert.match(html, /Build this/);
  assert.doesNotMatch(html, /learn-brand|learn-shell/);
});

test("a failed robots fetch is recorded and does not request the feed", async () => {
  const requested = [];
  const source = { ...NEWS_SOURCES.find((item) => item.id === "scryfall-spoiled"), gapMs: 0 };
  const result = await collectSources({
    sources: [source],
    fetchImpl: async (url) => {
      requested.push(String(url));
      return new Response("", { status: 503 });
    },
    parseFeed,
    parseCards: parseScryfallCards,
  });
  assert.deepEqual(requested, ["https://api.scryfall.com/robots.txt"]);
  assert.equal(result.cardBatches.length, 0);
  assert.equal(result.failures[0].error, "robots-http-503");
});

test("news needs a citation, and two different stories are not the same note", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const sword = presentCard(staples.find((card) => card.name === "Swords to Plowshares"));
  const first = buildNewsArticle({
    sourceId: "edhrec",
    sourceTitle: "EDHREC",
    title: "Swords to Plowshares in a removal column",
    url: "https://edhrec.com/articles/swords-column",
    text: "Swords to Plowshares still exiles a creature. The rest of the column stays at the source.",
    publishedAt: "2026-10-30",
    reachable: true,
  }, { now: "2026-10-31", knownCards: [sword] });
  assert.equal(first.sources[0].url, "https://edhrec.com/articles/swords-column");
  const uncited = { ...first, slug: "uncited", topicKey: "news:uncited", sources: [] };
  const decision = decidePublication(uncited, []);
  assert.equal(decision.status, "draft");
  assert.ok(decision.reasons.includes("missing-citation"));

  const second = buildNewsArticle({
    sourceId: "mtggoldfish",
    sourceTitle: "MTGGoldfish",
    title: "A different column about a different deck",
    url: "https://www.mtggoldfish.com/articles/different-column",
    text: "Joe Dyer takes a look at the Metalcraft aggro deck floating around.",
    publishedAt: "2026-10-30",
    reachable: true,
  }, { now: "2026-10-31", knownCards: [sword] });
  assert.equal(decidePublication(second, [first]).reasons.includes("near-duplicate"), false);
});

test("a current spoiler batch is news and an old printing is not", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const older = await json("../app/learn/fixtures/older-set.json");
  const now = Date.parse("2026-10-31T12:00:00Z");
  const sword = staples.find((card) => card.name === "Swords to Plowshares");
  const current = planSchedule({
    cardBatches: [{
      sourceId: "scryfall-spoiled",
      sourceUrl: "https://api.scryfall.com/cards/search?q=legal%3Acommander",
      cards: [{ ...sword, id: "sword-current", releasedAt: "2026-10-20" }],
    }],
    existing: seedArticles(),
    now,
    cardPool: staples,
    olderSet: older,
    sourcesSucceeded: 1,
  });
  assert.equal(current.reason, "news");
  assert.equal(current.articles[0].category, "spoilers");
  assert.match(current.articles[0].sources[0].url, /^https:\/\/api\.scryfall\.com/);

  const aged = planSchedule({
    cardBatches: [{
      sourceId: "scryfall-spoiled",
      sourceUrl: "https://api.scryfall.com/cards/search?q=legal%3Acommander",
      cards: [{ ...sword, id: "sword-old", releasedAt: "2020-01-01" }],
    }],
    existing: seedArticles(),
    now,
    cardPool: staples,
    olderSet: older,
    sourcesSucceeded: 1,
  });
  assert.equal(aged.reason, "evergreen");
  assert.equal(isRecentNews("2026-10-30", now), true);
  assert.equal(isRecentNews("2026-08-01", now), false);
  assert.equal(cardIsCurrent({ releasedAt: "2026-11-13" }, now), true);
  assert.equal(cardIsCurrent({ releasedAt: "2020-01-01" }, now), false);
});

test("commander spotlights rotate one legend at a time", async () => {
  const staples = (await json("../app/learn/fixtures/staples.json")).cards;
  const now = Date.parse("2026-10-31T12:00:00Z");
  const covered = EVERGREEN_TOPICS
    .filter((topic) => topic.kind !== "spotlight" && topic.kind !== "upgrade")
    .map((topic) => ({ topicId: topic.id, coveredAt: now }));
  const first = selectEvergreenTopic({ coverage: covered, now, priorItems: [], cardPool: staples });
  const second = selectEvergreenTopic({
    coverage: [...covered, { topicId: first.id, coveredAt: now }],
    now,
    priorItems: [],
    cardPool: staples,
  });
  assert.match(first.id, /^upgrade:/);
  assert.match(second.id, /^upgrade:/);
  assert.notEqual(first.id, second.id);
});

test("a price or a thin page cannot publish", () => {
  const article = seedArticles()[0];
  const priced = { ...article, slug: "priced", topicKey: "theory:priced", thesis: `${article.thesis} It costs $12.00.` };
  assert.equal(decidePublication(priced, []).status, "draft");
  const thin = { ...article, slug: "thin", topicKey: "theory:thin", hook: "Short.", thesis: "Too short.", sections: [{ id: "a", heading: "A", paragraphs: ["One."] }], takeaways: ["Only one"] };
  assert.equal(decidePublication({ ...thin, wordCount: 12 }, []).indexable, false);
});
