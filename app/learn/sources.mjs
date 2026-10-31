// Official or public feeds the news job is allowed to read.
// Reddit's robots.txt disallows the whole site for User-agent: *, so the
// collector never requests those JSON URLs. Star City Games' article host
// often answers with a challenge page; a non-feed body is treated as
// unreachable rather than parsed. Goldfish's content signal allows
// reference use and forbids training; we keep a short quote, write an
// original note, and link the source.

export const LEARN_USER_AGENT = "MetaForgeLearn/1.0 (+https://metaforge.gg/learn; source discovery and short quotation)";

export const NEWS_SOURCES = Object.freeze([
  {
    id: "wizards-news",
    title: "Wizards of the Coast",
    kind: "rss",
    feedUrl: "https://magic.wizards.com/rss.xml",
    robotsUrl: "https://magic.wizards.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
  {
    id: "edhrec",
    title: "EDHREC",
    kind: "rss",
    feedUrl: "https://edhrec.com/articles/feed/",
    robotsUrl: "https://edhrec.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
  {
    id: "mtggoldfish",
    title: "MTGGoldfish",
    kind: "atom",
    feedUrl: "https://www.mtggoldfish.com/feed",
    robotsUrl: "https://www.mtggoldfish.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
  {
    id: "starcitygames",
    title: "Star City Games",
    kind: "rss",
    feedUrl: "https://articles.starcitygames.com/feed/",
    robotsUrl: "https://www.starcitygames.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
  {
    id: "scryfall-spoiled",
    title: "Scryfall",
    kind: "scryfall",
    feedUrl: "https://api.scryfall.com/cards/search?order=spoiled&dir=desc&q=game%3Apaper",
    robotsUrl: "https://api.scryfall.com/robots.txt",
    dataOnly: true,
    gapMs: 150,
  },
  {
    id: "reddit-magictcg",
    title: "r/magicTCG",
    kind: "reddit",
    feedUrl: "https://www.reddit.com/r/magicTCG/new.json?limit=15",
    robotsUrl: "https://www.reddit.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
  {
    id: "reddit-edh",
    title: "r/EDH",
    kind: "reddit",
    feedUrl: "https://www.reddit.com/r/EDH/new.json?limit=15",
    robotsUrl: "https://www.reddit.com/robots.txt",
    prose: true,
    gapMs: 1000,
  },
]);

function applicableGroup(text, userAgent) {
  const groups = [];
  let current = null;
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ kind: key, path: value });
    }
  }
  const agent = String(userAgent || "*").toLowerCase();
  const specific = groups.filter((group) => group.agents.includes(agent));
  if (specific.length) return specific.flatMap((group) => group.rules);
  return groups.filter((group) => group.agents.includes("*")).flatMap((group) => group.rules);
}

export function robotsAllows(robotsText, path, userAgent = "*") {
  const body = String(robotsText || "");
  if (!body.trim()) return false;
  if (/^\s*</.test(body)) return false;
  const rules = applicableGroup(body, userAgent);
  if (!rules.length) return true;
  const target = path.startsWith("/") ? path : `/${path}`;
  let winner = null;
  for (const rule of rules) {
    if (!rule.path) continue;
    if (target.startsWith(rule.path) && (!winner || rule.path.length > winner.path.length)) winner = rule;
  }
  if (!winner) return true;
  return winner.kind === "allow";
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid") url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return String(value || "").trim();
  }
}

export function dedupeKeyFor(sourceId, url) {
  return `${sourceId}:${canonicalizeUrl(url)}`;
}
