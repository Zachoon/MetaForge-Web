import { LEARN_DOCUMENT_CSS } from "./document-style.mjs";
import { learnArticleSchema } from "./catalog.mjs";
import { categoryById } from "./policy.mjs";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function liveSlotHtml(articles = []) {
  const fresh = articles.filter((article) => article.status === "published" && article.indexable).slice(0, 6);
  if (!fresh.length) return `<div data-learn-slot="live"></div>`;
  const items = fresh.map((article) => `<li><a href="/learn/${escapeHtml(article.slug)}"><span>${escapeHtml(article.category)}</span><strong>${escapeHtml(article.title)}</strong><p>${escapeHtml(article.description)}</p></a></li>`).join("");
  return `<div data-learn-slot="live"><h2>From the latest runs</h2><ul class="learn-index">${items}</ul></div>`;
}

export function injectLiveSlot(html, articles) {
  const slot = liveSlotHtml(articles);
  if (html.includes('<div data-learn-slot="live"></div>')) return html.replaceAll('<div data-learn-slot="live"></div>', slot);
  return html;
}

function paragraphs(items = []) {
  return items.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

export function articleDocument(article, related = []) {
  const category = categoryById(article.category);
  const canonical = `https://metaforge.gg/learn/${article.slug}`;
  const robots = article.indexable ? "index, follow" : "noindex, nofollow";
  const schemas = article.indexable ? learnArticleSchema(article) : [];
  const cards = (article.sections || []).map((section) => `
    <section id="${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.heading)}</h2>
      ${paragraphs(section.paragraphs)}
      ${(section.cards || []).map((card) => `<aside><h3><a href="/learn/cards/${escapeHtml(card.slug)}">${escapeHtml(card.name)}</a></h3>${card.quote ? `<blockquote class="learn-quote">${escapeHtml(card.quote)}</blockquote>` : ""}${card.oracleText ? `<pre class="learn-oracle">${escapeHtml(card.oracleText)}</pre>` : ""}<p>${escapeHtml(card.roles?.length ? `Classifier roles: ${card.roles.join(", ")}.` : "The classifiers assigned no role.")}</p></aside>`).join("")}
    </section>`).join("");
  const categoryHref = article.category === "news" ? "/learn/news" : `/learn/category/${escapeHtml(article.category)}`;
  const categoryLabel = escapeHtml(category?.label || article.category);
  const body = `<main class="legal-page learn-page" data-learn-schema="1"${article.indexable ? "" : ` data-robots="noindex"`}>
    <header class="mf-site-header">
      <a class="mf-brand" href="/"><img src="/assets/brand/metaforge-mf-anvil.webp" alt="" width="34" height="34"><span>METAFORGE</span></a>
      <nav class="mf-site-nav" aria-label="MetaForge">
        <a href="/">Explore</a>
        <a href="/commanders">Commanders</a>
        <a href="/?intent=build">Build</a>
        <a href="/learn" aria-current="page">Learn</a>
        <a href="/academy">Academy</a>
        <a href="/decks">Community</a>
      </nav>
    </header>
    <div class="legal-shell">
      <div class="mf-trail">
        <nav class="mf-crumbs" aria-label="Breadcrumb"><ol>
          <li><a href="/">Explore</a></li>
          <li><a href="/learn">Learn</a></li>
          <li><a href="${categoryHref}">${categoryLabel}</a></li>
          <li><span aria-current="page">${escapeHtml(article.title)}</span></li>
        </ol></nav>
        <nav class="mf-journey" aria-label="Where to go next">
          <a href="/commanders"><b>1</b><span>Start with your commander</span></a>
          <a href="/?intent=build"><b>2</b><span>Build</span></a>
          <a href="/academy"><b>3</b><span>Learn</span></a>
        </nav>
      </div>
      <article class="legal-card">
        <small>${categoryLabel}</small>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="updated">${escapeHtml(article.byline || "MetaForge Coach")}${article.updatedAt ? ` · ${escapeHtml(article.updatedAt)}` : ""}</p>
        ${article.hook ? `<p>${escapeHtml(article.hook)}</p>` : ""}
        ${article.thesis ? `<p>${escapeHtml(article.thesis)}</p>` : ""}
        ${article.externalQuote?.text ? `<blockquote class="learn-quote">${escapeHtml(article.externalQuote.text)} ${article.externalQuote.url ? `<a href="${escapeHtml(article.externalQuote.url)}">Source</a>` : ""}</blockquote>` : ""}
        ${cards}
        ${article.engineTake ? `<section><h2>The coach's score</h2><p>${escapeHtml(article.engineTake)}</p></section>` : ""}
        ${(article.takeaways || []).length ? `<section><h2>Takeaways</h2><ul>${article.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
        ${(article.commanderLinks || []).length ? `<section><h2>Commander guides</h2><ul>${article.commanderLinks.map((link) => `<li><a href="/commanders/${escapeHtml(link.slug)}">${escapeHtml(link.name)}</a></li>`).join("")}</ul></section>` : ""}
        ${related.length ? `<section><h2>Related notes</h2><ul>${related.map((item) => `<li><a href="/learn/${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a></li>`).join("")}</ul></section>` : ""}
        ${(article.sources || []).length ? `<section><h2>Sources</h2><ul>${article.sources.map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.label)}</a></li>`).join("")}</ul></section>` : ""}
        ${article.forgeCta ? `<div class="learn-cta"><p>${escapeHtml(article.forgeCta.commanderName ? `Build a deck with ${article.forgeCta.commanderName}.` : "Start a Commander deck in the forge.")}</p><a href="${escapeHtml(article.forgeCta.href)}">${escapeHtml(article.forgeCta.label || "Build this")}</a></div>` : ""}
      </article>
    </div>
  </main>
  ${schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("")}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(article.title)} | MetaForge Learn</title><meta name="description" content="${escapeHtml(article.description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(article.title)}"><meta property="og:description" content="${escapeHtml(article.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://metaforge.gg/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(article.title)}"><meta name="twitter:description" content="${escapeHtml(article.description)}"><meta name="twitter:image" content="https://metaforge.gg/og.png"><style>${LEARN_DOCUMENT_CSS}</style></head><body>${body}</body></html>`;
}
