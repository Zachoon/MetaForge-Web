/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleAccountBench, handleFounderFeedback, handlePlayerProfile } from "./account-bench";
import { handleCoachFeedback } from "./coach-feedback";
import { handleFounderOverview } from "./founder-dashboard";
import { handleForgeChat } from "./forge-chat";
import { handleCoachingKnowledge } from "./coaching-knowledge";
import { ensureDataGoblinsStarted, handleGoblinOperations, runDataGoblins } from "./data-goblins";
import { handleEdhrecEvidence } from "./edhrec-evidence";
import { handleForgeGenerate } from "./forge-generate";
import { handleForgeStructuralAnalyze } from "./forge-structural-analyze";
import { handleForgeOneSlot } from "./forge-one-slot";
import { handleForgeMultiRefill } from "./forge-multi-refill";
import { handleCardFacts } from "./card-facts";
import { handleCommanderSearch } from "./commander-search";
import { cleanupExpiredRateLimits } from "./api-hardening";
import { cleanupExpiredGenerations } from "./forge-generation-store";
import { cleanupExpiredGuestForges, handleGuestClaim, handleGuestForge } from "./guest-forge";
import { handleLaunchTelemetry, recordOperationalGeneration } from "./launch-telemetry";
import { handleOpinionQuery } from "./opinion-query";
import { handleRevisionOpinion } from "./revision-opinion";
import { handlePublicReportPublish, publicDeckIndexResponse, publicDeckReportResponse, publicDeckShareResponse, publicDeckSocialImageResponse, publicReportSitemapEntries } from "./public-deck-report";
const BUILD_ID = "2026.07.16-workspace1";
const IMPACT_SITE_VERIFICATION = "05208696-7452-434e-89b1-d6be551c7505";
const PUBLIC_HOSTS = new Set(["metaforge.gg"]);
const SEO_HEADERS = { "Cache-Control": "public, max-age=3600", "Content-Type": "text/plain; charset=utf-8" };
const ACADEMY_GUIDES: Record<string, { headline: string; description: string; datePublished: string }> = {
  "/academy/why-cant-i-cast-my-spells": { headline: "Why Can't I Cast My Spells?", description: "Diagnose land count, color access, mana curve, dependencies, and opening-hand problems in Commander.", datePublished: "2026-08-02" },
  "/academy/why-do-i-run-out-of-cards": { headline: "Why Do I Always Run Out of Cards?", description: "Learn whether a Commander deck needs more cards or more useful card flow.", datePublished: "2026-08-07" },
  "/academy/why-does-my-deck-start-so-slowly": { headline: "Why Does My Deck Start So Slowly?", description: "Separate the common causes of slow Commander starts and identify what to watch next.", datePublished: "2026-08-07" },
  "/academy/how-much-interaction-do-i-actually-need": { headline: "How Much Interaction Do I Actually Need?", description: "Balance answers with your own game plan instead of relying on a universal removal count.", datePublished: "2026-08-07" },
  "/academy/why-do-i-lose-after-getting-ahead": { headline: "Why Do I Lose After Getting Ahead?", description: "Distinguish getting ahead, protecting a lead, and closing a Commander game.", datePublished: "2026-08-07" },
  "/academy/what-is-my-deck-actually-trying-to-do": { headline: "What Is My Deck Actually Trying to Do?", description: "Tell the difference between a theme, synergy, a repeatable plan, and its supporting cards.", datePublished: "2026-08-07" },
  "/academy/how-many-lands-should-a-commander-deck-have": { headline: "How Many Lands Should a Commander Deck Have?", description: "Build a Commander land-count range from curve, ramp, draw, colors, and commander cost.", datePublished: "2026-08-23" },
  "/academy/how-much-ramp-does-a-commander-deck-need": { headline: "How Much Ramp Does a Commander Deck Need?", description: "Choose a Commander ramp package based on timing, colors, and resilience.", datePublished: "2026-08-23" },
  "/academy/how-many-board-wipes-should-i-play-in-commander": { headline: "How Many Board Wipes Should I Play in Commander?", description: "Choose sweepers from deck pace, recovery, and the problems in real games.", datePublished: "2026-08-23" },
  "/academy/how-to-fix-a-commander-mana-curve": { headline: "How to Fix a Commander Mana Curve", description: "Find missing early plays and expensive-card congestion without flattening a deck's identity.", datePublished: "2026-08-23" },
  "/academy/how-many-mana-sources-do-i-need-in-commander": { headline: "How Many Colored Mana Sources Do I Need in Commander?", description: "Count timely colored sources for demanding spells and multicolor commanders.", datePublished: "2026-08-23" },
  "/academy/how-to-balance-tokens-enablers-and-payoffs": { headline: "How to Balance Token Makers, Enablers, and Payoffs", description: "Build a Commander token deck with enough production, conversion, and recovery.", datePublished: "2026-08-23" },
  "/academy/how-much-card-draw-should-a-commander-deck-have": { headline: "How Much Card Draw Should a Commander Deck Have?", description: "Choose Commander card draw by timing, reliability, cost, and how quickly the deck spends cards.", datePublished: "2026-08-25" },
  "/academy/how-many-removal-spells-should-i-play-in-commander": { headline: "How Many Removal Spells Should I Play in Commander?", description: "Build a Commander interaction package around real threats, timing, and color access.", datePublished: "2026-08-25" },
  "/academy/how-to-build-a-commander-deck": { headline: "How to Build a Commander Deck", description: "Build a legal 100-card Commander deck from a commander, game plan, functional packages, mana, and a way to win.", datePublished: "2026-08-25" },
  "/academy/how-to-evaluate-commander-power-level": { headline: "How to Evaluate a Commander Deck's Power Level", description: "Evaluate Commander power through speed, consistency, interaction, resilience, tutors, fast mana, and closing patterns.", datePublished: "2026-08-25" },
  "/academy/how-many-tutors-should-a-commander-deck-have": { headline: "How Many Tutors Should a Commander Deck Have?", description: "Evaluate Commander tutors by efficiency, breadth, destination, and the lines they repeatedly enable.", datePublished: "2026-08-25" },
  "/academy/how-much-fast-mana-is-too-much-in-commander": { headline: "How Much Fast Mana Is Too Much in Commander?", description: "Distinguish ordinary ramp from explosive fast mana and evaluate its effect on table experience.", datePublished: "2026-08-25" },
};
const COMMANDER_GUIDES: Record<string, string> = {
  "/commanders/korvold-fae-cursed-king": "Korvold, Fae-Cursed King",
  "/commanders/edgar-markov": "Edgar Markov",
  "/commanders/yuriko-the-tigers-shadow": "Yuriko, the Tiger's Shadow",
  "/commanders/atraxa-grand-unifier": "Atraxa, Grand Unifier",
  "/commanders/the-ur-dragon": "The Ur-Dragon",
  "/commanders/muldrotha-the-gravetide": "Muldrotha, the Gravetide",
  "/commanders/atraxa-praetors-voice": "Atraxa, Praetors' Voice",
  "/commanders/krenko-mob-boss": "Krenko, Mob Boss",
  "/commanders/wilhelt-the-rotcleaver": "Wilhelt, the Rotcleaver",
  "/commanders/lathril-blade-of-the-elves": "Lathril, Blade of the Elves",
  "/commanders/miirym-sentinel-wyrm": "Miirym, Sentinel Wyrm",
  "/commanders/pantlaza-sun-favored": "Pantlaza, Sun-Favored",
  "/commanders/sauron-the-dark-lord": "Sauron, the Dark Lord",
  "/commanders/isshin-two-heavens-as-one": "Isshin, Two Heavens as One",
  "/commanders/kaalia-of-the-vast": "Kaalia of the Vast",
  "/commanders/meren-of-clan-nel-toth": "Meren of Clan Nel Toth",
  "/commanders/jodah-the-unifier": "Jodah, the Unifier",
  "/commanders/giada-font-of-hope": "Giada, Font of Hope",
  "/commanders/teysa-karlov": "Teysa Karlov",
  "/commanders/nekusar-the-mindrazer": "Nekusar, the Mindrazer",
};

const DECKBUILDING_TOOLS: Record<string, { name: string; description: string }> = {
  "/tools/mtg-deck-analyzer": { name: "MTG Deck Analyzer", description: "Analyze a Magic: The Gathering decklist for mana, card flow, interaction, speed, and game plan." },
  "/tools/commander-deck-builder": { name: "Commander Deck Builder", description: "Build a legal 100-card Commander deck around a real game plan with clear reasons for its cards." },
  "/tools/commander-deck-checker": { name: "Commander Deck Checker", description: "Check a Commander decklist for legality, structural gaps, conflicting plans, and weak support." },
  "/tools/commander-mana-base-analyzer": { name: "Commander Mana Base Analyzer", description: "Diagnose Commander land count, color access, mana curve, ramp, and opening-hand problems." },
  "/tools/commander-land-calculator": { name: "Commander Land Calculator", description: "Estimate a starting Commander land range from curve, ramp, draw, commander cost, and pace." },
  "/tools/commander-color-source-calculator": { name: "Commander Color Source Calculator", description: "Estimate the timely colored mana sources needed to cast an important Commander spell on curve." },
  "/tools/commander-power-level-checker": { name: "Commander Power Level Checker", description: "Review Commander speed, consistency, interaction, tutors, fast mana, resilience, and closing patterns." },
  "/tools/commander-bracket-checker": { name: "Commander Bracket Checker", description: "Inspect the cards and play patterns that shape a Commander's expected table experience." },
  "/tools/commander-deck-optimizer": { name: "Commander Deck Optimizer", description: "Find focused Commander deck improvements that preserve the deck's commander, strategy, budget, and identity." },
  "/tools/mtg-mana-curve-analyzer": { name: "MTG Mana Curve Analyzer", description: "Analyze meaningful plays, color requirements, setup costs, and the turns when a Magic deck needs to act." },
};

function robotsResponse(url: URL): Response {
  const body = PUBLIC_HOSTS.has(url.hostname)
    ? "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /founder\nDisallow: /profile\nSitemap: https://metaforge.gg/sitemap.xml\nHost: metaforge.gg\n"
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: SEO_HEADERS });
}

const SITEMAP_URLS: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
  { loc: "https://metaforge.gg/", lastmod: "2026-08-24", changefreq: "weekly", priority: "1.0" },
  { loc: "https://metaforge.gg/terms", lastmod: "2026-08-02", changefreq: "monthly", priority: "0.3" },
  { loc: "https://metaforge.gg/privacy", lastmod: "2026-08-02", changefreq: "monthly", priority: "0.3" },
  { loc: "https://metaforge.gg/about", lastmod: "2026-08-23", changefreq: "monthly", priority: "0.7" },
  { loc: "https://metaforge.gg/methodology", lastmod: "2026-08-23", changefreq: "monthly", priority: "0.7" },
  { loc: "https://metaforge.gg/decks", lastmod: "2026-08-23", changefreq: "daily", priority: "0.8" },
  { loc: "https://metaforge.gg/academy", lastmod: "2026-08-25", changefreq: "weekly", priority: "0.8" },
  ...Object.keys(ACADEMY_GUIDES).map((path) => ({ loc: `https://metaforge.gg${path}`, lastmod: ACADEMY_GUIDES[path].datePublished, changefreq: "monthly", priority: "0.7" })),
  { loc: "https://metaforge.gg/tools", lastmod: "2026-08-25", changefreq: "monthly", priority: "0.9" },
  ...Object.keys(DECKBUILDING_TOOLS).map((path) => ({ loc: `https://metaforge.gg${path}`, lastmod: path.includes("power-level") || path.includes("bracket") || path.includes("optimizer") || path.includes("mana-curve") ? "2026-08-25" : "2026-08-23", changefreq: "monthly", priority: "0.9" })),
  { loc: "https://metaforge.gg/commanders", lastmod: "2026-08-23", changefreq: "monthly", priority: "0.8" },
  ...Object.keys(COMMANDER_GUIDES).map((path) => ({ loc: `https://metaforge.gg${path}`, lastmod: "2026-08-23", changefreq: "monthly", priority: "0.7" })),
];

async function sitemapResponse(url: URL, env: Env): Promise<Response> {
  if (!PUBLIC_HOSTS.has(url.hostname)) return new Response("Not found", { status: 404 });
  let publicReports: typeof SITEMAP_URLS = [];
  try { publicReports = await publicReportSitemapEntries(env); } catch (error) { console.error("public report sitemap lookup failed", error); }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...SITEMAP_URLS, ...publicReports].map((entry) => `\n  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join("")}\n</urlset>\n`;
  return new Response(body, { headers: { ...SEO_HEADERS, "Cache-Control": "public, max-age=300, must-revalidate", "CDN-Cache-Control": "public, max-age=300", "Content-Type": "application/xml; charset=utf-8" } });
}

function seoMarkup(url: URL, html: string): string {
  const canonicalUrl = new URL(url.pathname === "/" ? "/" : url.pathname, "https://metaforge.gg").href;
  const canonical = /<link\s+rel=["']canonical["']/i.test(html) ? "" : `<link rel="canonical" href="${canonicalUrl}">`;
  const schemas: Record<string, unknown>[] = [];
  if (url.pathname === "/") schemas.push(
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "MetaForge",
      alternateName: "Meta Forge",
      url: "https://metaforge.gg/",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MetaForge MTG Deck Builder and Analyzer",
      url: "https://metaforge.gg/",
      description: "A collaborative Magic: The Gathering and Commander deck coach that explains pressure points and helps players test confident improvements.",
      applicationCategory: "GameApplication",
      operatingSystem: "Any modern web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ["Commander deck building", "MTG deck analysis", "Decklist recommendations", "Magic deck playtesting"],
    },
  );
  if (url.pathname === "/about") schemas.push({
    "@context": "https://schema.org", "@type": "AboutPage", name: "About MetaForge", url: canonicalUrl,
    mainEntity: { "@type": "Organization", name: "MetaForge", url: "https://metaforge.gg/", logo: "https://metaforge.gg/assets/brand/metaforge-mf-anvil.webp", description: "Independent MTG Commander deckbuilding and analysis software." },
  });
  if (url.pathname === "/methodology") schemas.push({
    "@context": "https://schema.org", "@type": "WebPage", name: "How MetaForge Evaluates MTG Decks", url: canonicalUrl,
    description: "The evidence, structural checks, uncertainty boundaries, and testing process behind MetaForge recommendations.",
    about: { "@type": "SoftwareApplication", name: "MetaForge MTG Deck Builder and Analyzer" },
  });
  if (url.pathname === "/academy") schemas.push({
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: "MetaForge Commander Deckbuilding Academy", url: canonicalUrl,
    description: "Plain-language guides to real Commander deckbuilding problems.",
  });
  const guide = ACADEMY_GUIDES[url.pathname];
  const commander = COMMANDER_GUIDES[url.pathname];
  const deckbuildingTool = DECKBUILDING_TOOLS[url.pathname];
  if (guide) schemas.push({
    "@context": "https://schema.org", "@type": "Article",
    headline: guide.headline, description: guide.description,
    datePublished: guide.datePublished, dateModified: guide.datePublished,
    mainEntityOfPage: canonicalUrl,
    author: { "@type": "Organization", name: "MetaForge" },
    publisher: { "@type": "Organization", name: "MetaForge", url: "https://metaforge.gg/" },
  });
  if (url.pathname === "/academy" || guide) {
    const items = [
      { "@type": "ListItem", position: 1, name: "MetaForge", item: "https://metaforge.gg/" },
      { "@type": "ListItem", position: 2, name: "Academy", item: "https://metaforge.gg/academy" },
    ];
    if (guide) items.push({ "@type": "ListItem", position: 3, name: guide.headline, item: canonicalUrl });
    schemas.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items });
  }
  if (url.pathname === "/commanders") schemas.push({
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: "MetaForge Commander Deck Guides", url: canonicalUrl,
    description: "Commander deck guides and an explainable Magic: The Gathering deck builder and analyzer.",
  });
  if (commander) schemas.push({
    "@context": "https://schema.org", "@type": "Article",
    headline: `${commander} Commander Deck Guide`,
    description: `A Magic: The Gathering Commander deckbuilding guide for ${commander}.`,
    datePublished: "2026-08-19", dateModified: "2026-08-23", mainEntityOfPage: canonicalUrl,
    author: { "@type": "Organization", name: "MetaForge" },
    publisher: { "@type": "Organization", name: "MetaForge", url: "https://metaforge.gg/" },
    about: { "@type": "Thing", name: "Magic: The Gathering Commander" },
  });
  if (url.pathname === "/commanders" || commander) {
    const items = [
      { "@type": "ListItem", position: 1, name: "MetaForge", item: "https://metaforge.gg/" },
      { "@type": "ListItem", position: 2, name: "Commander Deck Guides", item: "https://metaforge.gg/commanders" },
    ];
    if (commander) items.push({ "@type": "ListItem", position: 3, name: commander, item: canonicalUrl });
    schemas.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items });
  }
  if (url.pathname === "/tools") schemas.push({
    "@context": "https://schema.org", "@type": "CollectionPage", name: "MetaForge MTG Deckbuilding Tools", url: canonicalUrl,
    description: "Free tools for building, checking, and analyzing Magic: The Gathering and Commander decks.",
  });
  if (deckbuildingTool) schemas.push({
    "@context": "https://schema.org", "@type": "WebApplication", name: deckbuildingTool.name, url: canonicalUrl,
    description: deckbuildingTool.description, applicationCategory: "GameApplication", operatingSystem: "Any modern web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  });
  if (url.pathname === "/tools" || deckbuildingTool) {
    const items = [
      { "@type": "ListItem", position: 1, name: "MetaForge", item: "https://metaforge.gg/" },
      { "@type": "ListItem", position: 2, name: "MTG Deckbuilding Tools", item: "https://metaforge.gg/tools" },
    ];
    if (deckbuildingTool) items.push({ "@type": "ListItem", position: 3, name: deckbuildingTool.name, item: canonicalUrl });
    schemas.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items });
  }
  const structuredData = schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("");
  return `${canonical}${structuredData}`;
}

async function addDocumentMetadata(response: Response, requestUrl: string): Promise<Response> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) return response;

  const url = new URL(requestUrl);
  const isPublicSite = PUBLIC_HOSTS.has(url.hostname);
  const html = (await response.text()).replace(/<meta\s+name=["']robots["'][^>]*>/gi, "");
  const metadata = isPublicSite
    ? `<meta name="robots" content="index, follow"><meta name="impact-site-verification" value="${IMPACT_SITE_VERIFICATION}">${seoMarkup(url, html)}`
    : '<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">';
  if (!html.includes("</head>")) return new Response(html, response);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  if (!isPublicSite) headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, noimageindex");
  return new Response(html.replace("</head>", `${metadata}</head>`), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

interface Env {
  ASSETS: Fetcher;
  METAFORGE_BOOTSTRAP_LOCK?: string;
  METAFORGE_FOUNDER_USER_KEY?: string;
  // Not a secret — a plain feature flag, same category as
  // ACCESS_TEAM_DOMAIN/ACCESS_AUD below. Controls only whether
  // /api/forge/status advertises the TCGplayer purchase-link feature as
  // on; the client never reads this var directly, only the derived
  // boolean in that response. Absent or anything other than exactly
  // "true" fails closed. See app/affiliate-links.mjs.
  TCGPLAYER_AFFILIATE_ENABLED?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// A minimal, uncorrelated-with-any-handler's-own-shape JSON envelope used
// only by this file's own safety net (unmatched /api/* paths and uncaught
// exceptions from any handler). Every handler already returns its own
// JSON on every path it anticipates; this exists strictly for the paths
// no handler ever anticipated — so callers under /api/* never get Cloudflare's
// default HTML error page (which starts a JSON parse on the client with
// `Unexpected token '<'`) for a route that doesn't exist or a dependency
// (e.g. D1) that unexpectedly throws.
function apiJson(value: unknown, status: number): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (env.METAFORGE_BOOTSTRAP_LOCK !== "unlocked") {
      return new Response("MetaForge private alpha is locked while access controls are configured.", {
        status: 403,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const url = new URL(request.url);

    // Search Console showed the insecure homepage as MetaForge's largest
    // impression-bearing URL. Canonicals alone do not consolidate a 200 OK
    // HTTP duplicate, so permanently move every insecure request to HTTPS.
    // Keep app.metaforge.gg on the app host; only www also collapses to apex.
    if (url.protocol === "http:") {
      url.protocol = "https:";
      if (url.hostname === "www.metaforge.gg") url.hostname = "metaforge.gg";
      return new Response(null, {
        status: 308,
        headers: { Location: url.href, "Cache-Control": "public, max-age=86400" },
      });
    }

    // Serve one crawlable public origin. Previously www returned a complete
    // 200 duplicate whose canonical pointed to the apex, which Search Console
    // correctly classified as "Alternate page with proper canonical tag".
    // A permanent redirect removes the duplicate document entirely while
    // preserving deep links and campaign parameters.
    if (url.hostname === "www.metaforge.gg") {
      url.hostname = "metaforge.gg";
      return new Response(null, {
        status: 308,
        headers: {
          Location: url.href,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (url.pathname === "/robots.txt") return robotsResponse(url);
    if (url.pathname === "/sitemap.xml") return sitemapResponse(url, env);
    if (url.pathname === "/decks" && PUBLIC_HOSTS.has(url.hostname)) return publicDeckIndexResponse(url, env);
    if (/^\/decks\/[a-z0-9-]+\/og\.svg$/.test(url.pathname) && PUBLIC_HOSTS.has(url.hostname)) return publicDeckSocialImageResponse(url, env);
    if (/^\/decks\/[a-z0-9-]+\/share\/[a-z]+$/.test(url.pathname) && PUBLIC_HOSTS.has(url.hostname)) return publicDeckShareResponse(request, url, env);
    if (/^\/decks\/[a-z0-9-]+$/.test(url.pathname) && PUBLIC_HOSTS.has(url.hostname)) return publicDeckReportResponse(url, env);

    try {
      if (url.pathname === "/api/account/deck-bench") {
        return await handleAccountBench(request, env);
      }
      if (url.pathname === "/api/account/feedback") {
        return await handleFounderFeedback(request, env);
      }
      if (url.pathname === "/api/coach/feedback") {
        return await handleCoachFeedback(request, env);
      }
      if (url.pathname === "/api/account/player-profile") return await handlePlayerProfile(request, env);
      if (url.pathname === "/api/founder/overview") {
        return await handleFounderOverview(request, env);
      }
      if (url.pathname === "/api/forge/chat") return await handleForgeChat(request, env);
      if (url.pathname === "/api/coach/opinion") return await handleOpinionQuery(request, env);
      if (url.pathname === "/api/coach/revision-opinion") return await handleRevisionOpinion(request, env);
      if (url.pathname === "/api/telemetry") return await handleLaunchTelemetry(request, env);
      if (url.pathname === "/api/forge/edhrec") return await handleEdhrecEvidence(request, env);
      if (url.pathname === "/api/forge/generate" || url.pathname === "/api/forge/guest-generate") {
        const startedAt = Date.now();
        const isGuest = url.pathname.includes("guest-");
        const response = isGuest ? await handleGuestForge(request, env) : await handleForgeGenerate(request, env);
        ctx.waitUntil(recordOperationalGeneration(env, response.ok ? "generation_succeeded" : "generation_failed", {
          endpoint: isGuest ? "guest" : "account",
          status: response.status,
          durationMs: Date.now() - startedAt,
        }).catch((error) => console.error("launch telemetry write failed", error)));
        return response;
      }
      if (url.pathname === "/api/account/claim-guest") return await handleGuestClaim(request, env);
      if (url.pathname === "/api/forge/structural-analyze") return await handleForgeStructuralAnalyze(request, env);
      if (url.pathname === "/api/forge/one-slot-experiment") return await handleForgeOneSlot(request, env);
      if (url.pathname === "/api/forge/multi-refill") return await handleForgeMultiRefill(request, env);
      if (url.pathname === "/api/decks/publish") return await handlePublicReportPublish(request, env);
      if (url.pathname === "/api/cards/facts") return await handleCardFacts(request);
      if (url.pathname === "/api/cards/commanders") return await handleCommanderSearch(request);
      if (url.pathname === "/api/forge/status") {ctx.waitUntil(ensureDataGoblinsStarted(env));return Response.json({ready:true,build:BUILD_ID,modelReady:false,mode:"native",fallback:"MetaForge Native Coach remains available without a model call",tcgplayerAffiliateEnabled:env.TCGPLAYER_AFFILIATE_ENABLED === "true"},{headers:{"Cache-Control":"no-store"}})}
      if (url.pathname === "/api/founder/knowledge") return await handleCoachingKnowledge(request, env, true);
      if (url.pathname === "/api/coach/knowledge") return await handleCoachingKnowledge(request, env, false);
      if (url.pathname === "/api/founder/goblins") return await handleGoblinOperations(request, env);

      // No handler above claimed this /api/ path — a mistyped or removed
      // route must still come back as JSON, not fall through to the SSR
      // handler below (which renders the HTML app shell/404 page for
      // unmatched routes; fine for real pages, wrong for API callers).
      if (url.pathname.startsWith("/api/")) return apiJson({ error: "Not found" }, 404);
    } catch (error) {
      // Last-resort net: every handler above already returns its own JSON
      // on the failure paths it anticipates (validation, auth, engine
      // exceptions). This only fires for what none of them anticipated —
      // e.g. a transient D1 failure on a query that isn't already inside
      // that handler's own try/catch. Without this, Cloudflare's runtime
      // turns an uncaught exception into an HTML error page, which is
      // exactly the "Unexpected token '<'" failure this exists to close.
      console.error("Unhandled exception for", url.pathname, error);
      return apiJson({ error: "Internal server error" }, 500);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return addDocumentMetadata(await handler.fetch(request, env, ctx), request.url);
  },
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(runDataGoblins(env));ctx.waitUntil(cleanupExpiredRateLimits(env));ctx.waitUntil(cleanupExpiredGenerations(env));ctx.waitUntil(cleanupExpiredGuestForges(env));},
};

export default worker;
