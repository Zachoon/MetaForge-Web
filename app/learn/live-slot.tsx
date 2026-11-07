import { headers } from "next/headers";
import { LEARN_LIVE_HEADER, decodeLiveSlot } from "./live-slot-payload.mjs";

export async function LiveArticleSlot() {
  const requestHeaders = await headers();
  const articles = decodeLiveSlot(requestHeaders.get(LEARN_LIVE_HEADER));
  if (!articles.length) return <div data-learn-slot="live" />;
  return (
    <div data-learn-slot="live">
      <h2>From the latest runs</h2>
      <ul className="learn-index">
        {articles.map((article) => (
          <li key={article.slug}>
            <a href={`/learn/${article.slug}`}>
              <span>{article.category}</span>
              <strong>{article.title}</strong>
              <p>{article.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
