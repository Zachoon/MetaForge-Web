/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleAccountBench, handleFounderFeedback, handlePlayerProfile } from "./account-bench";
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
import { cleanupExpiredRateLimits } from "./api-hardening";
import { cleanupExpiredGenerations } from "./forge-generation-store";
import { cleanupExpiredGuestForges, handleGuestClaim, handleGuestForge } from "./guest-forge";
import { handleLaunchTelemetry, recordOperationalGeneration } from "./launch-telemetry";
const BUILD_ID = "2026.07.16-workspace1";
const IMPACT_SITE_VERIFICATION = "05208696-7452-434e-89b1-d6be551c7505";
const PUBLIC_HOSTS = new Set(["metaforge.gg"]);
const SEO_HEADERS = { "Cache-Control": "public, max-age=3600", "Content-Type": "text/plain; charset=utf-8" };

function robotsResponse(url: URL): Response {
  const body = PUBLIC_HOSTS.has(url.hostname)
    ? "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /founder\nDisallow: /profile\nSitemap: https://metaforge.gg/sitemap.xml\nHost: metaforge.gg\n"
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: SEO_HEADERS });
}

function sitemapResponse(url: URL): Response {
  if (!PUBLIC_HOSTS.has(url.hostname)) return new Response("Not found", { status: 404 });
  const urls = [
    "https://metaforge.gg/",
    "https://metaforge.gg/terms",
    "https://metaforge.gg/privacy",
    "https://metaforge.gg/academy",
    "https://metaforge.gg/academy/why-cant-i-cast-my-spells",
    "https://metaforge.gg/academy/why-do-i-run-out-of-cards",
    "https://metaforge.gg/academy/why-does-my-deck-start-so-slowly",
    "https://metaforge.gg/academy/how-much-interaction-do-i-actually-need",
    "https://metaforge.gg/academy/why-do-i-lose-after-getting-ahead",
    "https://metaforge.gg/academy/what-is-my-deck-actually-trying-to-do",
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((pageUrl, index) => `\n  <url><loc>${pageUrl}</loc><lastmod>${index >= urls.length - 5 ? "2026-08-07" : "2026-08-02"}</lastmod><changefreq>${index === 0 ? "weekly" : "monthly"}</changefreq><priority>${index === 0 ? "1.0" : "0.3"}</priority></url>`).join("")}\n</urlset>\n`;
  return new Response(body, { headers: { ...SEO_HEADERS, "Content-Type": "application/xml; charset=utf-8" } });
}

function seoMarkup(url: URL, html: string): string {
  const canonicalUrl = new URL(url.pathname === "/" ? "/" : url.pathname, "https://metaforge.gg").href;
  const canonical = /<link\s+rel=["']canonical["']/i.test(html) ? "" : `<link rel="canonical" href="${canonicalUrl}">`;
  if (url.pathname !== "/") return canonical;

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MetaForge",
    url: "https://metaforge.gg/",
    description: "Explainable Magic: The Gathering deck analysis that finds pressure points and gives you changes worth testing.",
    applicationCategory: "GameApplication",
    operatingSystem: "Any modern web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }).replace(/</g, "\\u003c");
  return `${canonical}<script type="application/ld+json">${structuredData}</script>`;
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
    if (url.pathname === "/sitemap.xml") return sitemapResponse(url);

    try {
      if (url.pathname === "/api/account/deck-bench") {
        return await handleAccountBench(request, env);
      }
      if (url.pathname === "/api/account/feedback") {
        return await handleFounderFeedback(request, env);
      }
      if (url.pathname === "/api/account/player-profile") return await handlePlayerProfile(request, env);
      if (url.pathname === "/api/founder/overview") {
        return await handleFounderOverview(request, env);
      }
      if (url.pathname === "/api/forge/chat") return await handleForgeChat(request, env);
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
      if (url.pathname === "/api/cards/facts") return await handleCardFacts(request);
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
