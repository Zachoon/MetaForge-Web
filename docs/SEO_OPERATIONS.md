# SEO and discoverability operations

MetaForge's public search position is **a collaborative MTG and Commander deck coach**. Avoid describing it as a generic AI deck generator. The authenticated `app.metaforge.gg` experience, `/profile`, `/founder`, and `/api/*` are intentionally excluded from search.

## Launch setup

1. Verify `https://metaforge.gg` as a Domain property in Google Search Console and Bing Webmaster Tools (DNS verification is preferred).
2. Submit `https://metaforge.gg/sitemap.xml` to both services. Confirm it returns HTTP 200 with `application/xml` and only canonical public URLs.
3. Inspect `/`, `/academy`, and one Academy guide in Search Console. Request indexing only after the production deployment is live.
4. Keep provider verification tokens in deployment configuration or the public response layer. Never place secrets in the repository.

## Release checks

- Run `npm test`; rendered HTML checks cover canonical URLs, robots directives, social metadata, structured data, the sitemap, and private-host exclusion.
- Run Lighthouse against the deployed homepage and Academy index in mobile mode. Record SEO, Performance, Accessibility, LCP, CLS, INP/TBT, and the tested commit/date.
- Validate changed schemas with Schema.org Validator or Google Rich Results Test. Article and Breadcrumb schemas are used only on real editorial guides; FAQ and HowTo markup must not be added unless the visible page actually matches those types.
- Fetch `robots.txt` and `sitemap.xml` from both the apex and authenticated hosts after changes to routing or hosting.

## Monthly measurement

Export or record Search Console clicks, impressions, CTR, average position, indexed pages, sitemap errors, and Core Web Vitals by device. Review Bing crawl/indexing warnings as a second signal. Segment branded queries from problem-intent queries such as Commander deck consistency, interaction, mana, and game-plan questions.

Prioritize pages with high impressions and weak CTR for title/description revisions. Prioritize poor LCP/CLS/INP URLs by field data rather than lab score alone. Annotate deployments so changes can be compared over 28-day windows; avoid drawing conclusions from small alpha samples.

## Current performance watchlist

- The homepage is a large client experience and carries decorative autoplay video. Posters and conservative preload hints reduce initial contention, but production field data should decide whether a reduced-motion/static first render is needed.
- Google Fonts and Cloudflare Turnstile are third-party critical-path risks. Keep font connections preconnected and audit whether self-hosting/subsetting produces a meaningful field improvement.
- Card images appear after interaction and use lazy loading in major galleries. New images should include intrinsic dimensions or an aspect-ratio container to prevent layout shift.
- Academy pages are the stable, text-first discovery surface. Keep one descriptive H1, sequential H2/H3 structure, contextual links to related guides, and a clear route back to the coach.
