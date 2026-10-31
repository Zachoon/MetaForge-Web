// RSS and Atom item extraction. content:encoded is ignored so a full
// article body is never stored or quoted. Dates are kept only when the
// feed itself printed one.

import { asCard } from "./grounding.mjs";

function decode(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#124;/g, "|")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return decode(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]).trim() : "";
}

function atomLink(block) {
  const alternate = block.match(/<link[^>]*rel=["']alternate["'][^>]*>/i) || block.match(/<link[^>]*href=["'][^"']+["'][^>]*>/i);
  if (!alternate) return "";
  const href = alternate[0].match(/href=["']([^"']+)["']/i);
  return href ? decode(href[1]) : "";
}

export function looksLikeFeed(body) {
  return /<(rss|feed)\b/i.test(String(body || ""));
}

export function parseFeed(body) {
  const xml = String(body || "");
  if (!looksLikeFeed(xml)) return [];
  const withoutEncoded = xml.replace(/<content:encoded>[\s\S]*?<\/content:encoded>/gi, "");
  if (/<entry\b/i.test(withoutEncoded)) {
    return withoutEncoded.split(/<entry\b/i).slice(1).map((chunk) => {
      const block = `<entry${chunk}`;
      const title = stripTags(tag(block, "title"));
      const url = atomLink(block);
      const text = stripTags(tag(block, "summary") || tag(block, "content"));
      const publishedAt = normalizeDate(tag(block, "updated") || tag(block, "published"));
      if (!title || !url) return null;
      return { title, url, text, publishedAt };
    }).filter(Boolean);
  }
  return withoutEncoded.split(/<item\b/i).slice(1).map((chunk) => {
    const block = `<item${chunk}`;
    const title = stripTags(tag(block, "title"));
    const url = stripTags(tag(block, "link"));
    const text = stripTags(tag(block, "description"));
    const publishedAt = normalizeDate(tag(block, "pubDate") || tag(block, "dc:date"));
    if (!title || !url) return null;
    return { title, url, text, publishedAt };
  }).filter(Boolean);
}

export function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseScryfallCards(body) {
  let json;
  try { json = JSON.parse(body); } catch { return []; }
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map((card) => {
    const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
    const oracle = card.oracle_text || faces.map((face) => face.oracle_text || "").filter(Boolean).join("\n");
    const normalized = asCard({
      ...card,
      oracle_text: oracle,
      mana_cost: card.mana_cost || faces[0]?.mana_cost || "",
      type_line: card.type_line || faces.map((face) => face.type_line).filter(Boolean).join(" // "),
      commanderLegal: card.legalities?.commander || null,
    });
    return normalized.name && normalized.oracleText ? normalized : null;
  }).filter(Boolean);
}

export function parseRedditListing(body) {
  let json;
  try { json = JSON.parse(body); } catch { return []; }
  const children = json?.data?.children || [];
  return children.map((child) => {
    const data = child?.data || {};
    if (!data.title || !data.permalink) return null;
    return {
      title: String(data.title),
      url: `https://www.reddit.com${data.permalink}`,
      text: String(data.selftext || "").slice(0, 1200),
      publishedAt: Number.isFinite(data.created_utc) ? new Date(data.created_utc * 1000).toISOString().slice(0, 10) : null,
    };
  }).filter(Boolean);
}
