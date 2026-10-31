import { categoryById } from "./policy.mjs";
import { learnArticleSchema } from "./catalog.mjs";

type Card = {
  name: string;
  slug: string;
  manaCost?: string;
  typeLine?: string;
  oracleText?: string;
  quote?: string | null;
  roles?: string[];
};

type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  status: string;
  indexable: boolean;
  publishedAt?: string | null;
  updatedAt?: string;
  byline?: string;
  hook?: string;
  thesis?: string;
  engineTake?: string;
  sections?: { id: string; heading: string; paragraphs?: string[]; cards?: Card[] }[];
  takeaways?: string[];
  decklist?: { title: string; note?: string; commanderSlug?: string | null; commanderName?: string | null; lines?: { name: string; slug?: string; quantity?: number; role?: string }[] } | null;
  commanderLinks?: { slug: string; name: string; reason?: string }[];
  forgeCta?: { href: string; label: string; commanderName?: string | null };
  sources?: { label: string; url: string }[];
  externalQuote?: { text: string; url?: string; sourceTitle?: string } | null;
};

export function LearnFrame({ children, noindex = false }: { children: React.ReactNode; noindex?: boolean }) {
  return (
    <main className="learn-page" data-learn-schema="1" data-robots={noindex ? "noindex" : undefined}>
      <div className="learn-shell">
        <a className="learn-brand" href="/"><i>MF</i> METAFORGE</a>
        {children}
      </div>
    </main>
  );
}

export function CategoryNav({ current }: { current?: string }) {
  const items = [
    { href: "/learn", id: "all", label: "All" },
    { href: "/learn/category/theory", id: "theory", label: "Theory" },
    { href: "/learn/category/spoilers", id: "spoilers", label: "New Cards" },
    { href: "/learn/category/set-reviews", id: "set-reviews", label: "Set Reviews" },
    { href: "/learn/category/commander-spotlights", id: "commander-spotlights", label: "Commanders" },
    { href: "/learn/news", id: "news", label: "News" },
  ];
  return (
    <ul className="learn-nav">
      {items.map((item) => (
        <li key={item.id}><a href={item.href} aria-current={current === item.id ? "page" : undefined}>{item.label}</a></li>
      ))}
    </ul>
  );
}

export function ArticleList({ articles }: { articles: Article[] }) {
  if (!articles.length) return <p className="learn-empty">Nothing in this category is published yet. Drafts stay off this list.</p>;
  return (
    <ul className="learn-index">
      {articles.map((article) => (
        <li key={article.slug}>
          <a href={`/learn/${article.slug}`}>
            <span>{categoryById(article.category)?.label || article.category}</span>
            <strong>{article.title}</strong>
            <p>{article.description}</p>
          </a>
        </li>
      ))}
    </ul>
  );
}

function CardBlock({ card }: { card: Card }) {
  return (
    <aside>
      <h3><a href={`/learn/cards/${card.slug}`}>{card.name}</a></h3>
      <p>{[card.manaCost, card.typeLine].filter(Boolean).join(" · ")}</p>
      {card.quote ? <blockquote className="learn-quote">{card.quote}</blockquote> : null}
      {card.oracleText ? <pre className="learn-oracle">{card.oracleText}</pre> : null}
      <p>{card.roles?.length ? `Classifier roles: ${card.roles.join(", ")}.` : "The classifiers assigned no role."}</p>
    </aside>
  );
}

export function ArticleBody({ article, related }: { article: Article; related: Article[] }) {
  const category = categoryById(article.category);
  const schemas = article.indexable ? learnArticleSchema(article) : [];
  return (
    <article>
      <nav className="learn-crumb" aria-label="Breadcrumb">
        <a href="/">MetaForge</a>
        <span aria-hidden="true">/</span>
        <a href="/learn">Learn</a>
        <span aria-hidden="true">/</span>
        {category ? <a href={article.category === "news" ? "/learn/news" : `/learn/category/${article.category}`}>{category.label}</a> : <span>{article.category}</span>}
      </nav>
      <p className="learn-kicker">{category?.label || article.category}</p>
      <h1>{article.title}</h1>
      <p className="learn-byline">{article.byline || "MetaForge Coach"}{article.updatedAt ? ` · ${article.updatedAt}` : ""}{article.indexable ? "" : " · Draft"}</p>
      <ul className="learn-tags">
        {(article.tags || []).map((tag) => <li key={tag}><a className="learn-tag" href={`/learn/tag/${tag}`}>{tag}</a></li>)}
      </ul>
      <div className="learn-measure">
        {article.hook ? <p>{article.hook}</p> : null}
        {article.thesis ? <p>{article.thesis}</p> : null}
        {article.externalQuote?.text ? (
          <blockquote className="learn-quote">
            {article.externalQuote.text}
            {article.externalQuote.url ? <> <a href={article.externalQuote.url}>Source</a></> : null}
          </blockquote>
        ) : null}
        {(article.sections || []).map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.heading}</h2>
            {(section.paragraphs || []).map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
            {(section.cards || []).map((card) => <CardBlock key={card.slug || card.name} card={card} />)}
          </section>
        ))}
        {article.engineTake ? <section><h2>The coach&apos;s score</h2><p>{article.engineTake}</p></section> : null}
        {(article.takeaways || []).length ? (
          <section>
            <h2>Takeaways</h2>
            <ul>{article.takeaways!.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {article.decklist?.lines?.length ? (
          <section>
            <h2>{article.decklist.title}</h2>
            {article.decklist.note ? <p>{article.decklist.note}</p> : null}
            <ul className="learn-package">
              {article.decklist.lines.map((line) => (
                <li key={`${line.slug}-${line.name}`}>
                  {line.quantity || 1}{" "}
                  {line.slug && line.role !== "commander" ? <a href={`/learn/cards/${line.slug}`}>{line.name}</a> : line.name}
                  {line.role ? ` · ${line.role}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {(article.commanderLinks || []).length ? (
          <section>
            <h2>Commander guides</h2>
            <ul>
              {article.commanderLinks!.map((link) => (
                <li key={link.slug}><a href={`/commanders/${link.slug}`}>{link.name}</a>{link.reason ? ` — ${link.reason}` : ""}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {related.length ? (
          <section>
            <h2>Related notes</h2>
            <ul>
              {related.map((item) => <li key={item.slug}><a href={`/learn/${item.slug}`}>{item.title}</a></li>)}
            </ul>
          </section>
        ) : null}
        {(article.sources || []).length ? (
          <section>
            <h2>Sources</h2>
            <ul>
              {article.sources!.map((source) => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}
            </ul>
          </section>
        ) : null}
        {article.forgeCta ? (
          <div className="learn-cta">
            <p>{article.forgeCta.commanderName ? `Build a deck with ${article.forgeCta.commanderName}.` : "Start a Commander deck in the forge."}</p>
            <a href={article.forgeCta.href}>{article.forgeCta.label}</a>
          </div>
        ) : null}
      </div>
      {schemas.map((schema) => (
        <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      ))}
    </article>
  );
}

export function articleMetadata(article: Article) {
  const url = `https://metaforge.gg/learn/${article.slug}`;
  const robots = article.indexable ? { index: true, follow: true } : { index: false, follow: false };
  return {
    title: `${article.title} | MetaForge Learn`,
    description: article.description,
    alternates: { canonical: url },
    robots,
    openGraph: { title: article.title, description: article.description, url, type: "article" as const, images: [{ url: "/og.png", width: 1200, height: 630, alt: "MetaForge" }] },
    twitter: { card: "summary_large_image" as const, title: article.title, description: article.description, images: ["/og.png"] },
  };
}
