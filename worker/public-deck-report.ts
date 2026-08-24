import { userKey } from "./account-bench";
import { loadGeneration } from "./forge-generation-store";

interface PublicReportEnv {
  DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ALLOW_DEV_AUTH_BYPASS?: string;
}

type PublicRow = { quantity: number; name: string; typeLine: string; roles: string[]; cmc: number };

const FEATURED_COMMANDER_GUIDES = [
  ["korvold-fae-cursed-king", "Korvold, Fae-Cursed King"],
  ["edgar-markov", "Edgar Markov"],
  ["yuriko-the-tigers-shadow", "Yuriko, the Tiger's Shadow"],
  ["atraxa-grand-unifier", "Atraxa, Grand Unifier"],
  ["the-ur-dragon", "The Ur-Dragon"],
  ["muldrotha-the-gravetide", "Muldrotha, the Gravetide"],
  ["atraxa-praetors-voice", "Atraxa, Praetors' Voice"],
  ["krenko-mob-boss", "Krenko, Mob Boss"],
  ["wilhelt-the-rotcleaver", "Wilhelt, the Rotcleaver"],
  ["lathril-blade-of-the-elves", "Lathril, Blade of the Elves"],
  ["miirym-sentinel-wyrm", "Miirym, Sentinel Wyrm"],
  ["pantlaza-sun-favored", "Pantlaza, Sun-Favored"],
  ["sauron-the-dark-lord", "Sauron, the Dark Lord"],
  ["isshin-two-heavens-as-one", "Isshin, Two Heavens as One"],
  ["kaalia-of-the-vast", "Kaalia of the Vast"],
  ["meren-of-clan-nel-toth", "Meren of Clan Nel Toth"],
  ["jodah-the-unifier", "Jodah, the Unifier"],
  ["giada-font-of-hope", "Giada, Font of Hope"],
  ["teysa-karlov", "Teysa Karlov"],
  ["nekusar-the-mindrazer", "Nekusar, the Mindrazer"],
] as const;

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const safeText = (value: unknown, max = 120) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "commander-deck";
const rowType = (typeLine: string) => {
  const line = typeLine.toLowerCase();
  if (line.includes("land")) return "Lands";
  if (line.includes("creature")) return "Creatures";
  if (line.includes("planeswalker")) return "Planeswalkers";
  if (line.includes("instant")) return "Instants";
  if (line.includes("sorcery")) return "Sorceries";
  if (line.includes("artifact")) return "Artifacts";
  if (line.includes("enchantment")) return "Enchantments";
  return "Other";
};

function sanitizeRows(rows: unknown): PublicRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 250).map((value) => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      quantity: Math.max(1, Math.min(99, Number(row.quantity) || 1)),
      name: safeText(row.name, 100),
      typeLine: safeText(row.typeLine, 140),
      roles: Array.isArray(row.roles) ? row.roles.slice(0, 6).map((role: unknown) => safeText(role, 50)).filter(Boolean) : [],
      cmc: Math.max(0, Math.min(30, Number(row.cmc) || 0)),
    };
  }).filter((row) => row.name);
}

function deckInsights(rows: PublicRow[]) {
  const expanded = rows.flatMap((row) => Array.from({ length: row.quantity }, () => row));
  const nonlands = expanded.filter((row) => rowType(row.typeLine) !== "Lands");
  const landCount = expanded.length - nonlands.length;
  const averageManaValue = nonlands.length ? nonlands.reduce((sum, row) => sum + row.cmc, 0) / nonlands.length : 0;
  const earlyPlays = nonlands.filter((row) => row.cmc > 0 && row.cmc <= 2).length;
  const roleCount = new Map<string, number>();
  for (const row of expanded) for (const role of row.roles) roleCount.set(role, (roleCount.get(role) || 0) + 1);
  const roleTotal = (terms: string[]) => expanded.filter((row) => row.roles.some((role) => terms.some((term) => role.toLowerCase().includes(term)))).length;
  const topRoles = [...roleCount]
    .filter(([role]) => !/commander|land|creature|artifact|instant|sorcery|enchantment/i.test(role))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  return {
    landCount,
    averageManaValue,
    earlyPlays,
    interaction: roleTotal(["interaction", "removal", "counter", "answer"]),
    cardFlow: roleTotal(["draw", "card flow", "advantage"]),
    ramp: roleTotal(["ramp", "mana acceleration"]),
    topRoles,
  };
}

export async function handlePublicReportPublish(request: Request, env: PublicReportEnv): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const owner = await userKey(request, env);
  if (!owner) return json({ error: "Authenticated account required" }, 401);
  let body: { generationId?: unknown; title?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const generationId = safeText(body.generationId, 80);
  if (!generationId) return json({ error: "A completed generation is required" }, 400);
  const loaded = await loadGeneration(env, owner, generationId);
  if (!loaded.ok) return json({ error: "That completed deck is unavailable" }, 404);

  const rows = sanitizeRows(loaded.payload.selected?.rows);
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  if (rows.length < 20 || total < 40 || total > 250) return json({ error: "Only complete deck reports can be published" }, 422);
  const forgeInput = loaded.payload.forgeInput && typeof loaded.payload.forgeInput === "object" ? loaded.payload.forgeInput as Record<string, unknown> : {};
  const commanderInput = forgeInput.commander && typeof forgeInput.commander === "object" ? forgeInput.commander as Record<string, unknown> : {};
  const commander = safeText(commanderInput.name || rows.find((row) => row.roles.some((role) => role.toLowerCase() === "commander"))?.name || "Commander Deck", 100);
  const format = safeText(loaded.payload.options?.format || "Commander", 40);
  const strategy = safeText(loaded.payload.options?.strategy || "Custom strategy", 80);
  const requestedTitle = safeText(body.title, 100);
  const title = requestedTitle || `${commander} ${format} Deck`;
  const summary = `${total}-card ${format} deck built around ${commander}${strategy ? ` with a ${strategy} game plan` : ""}. Explore the complete grouped decklist and build your own version with MetaForge.`;
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const slug = `${slugify(commander)}-${suffix}`;
  await env.DB.prepare(`INSERT INTO public_deck_reports (slug, owner_key, title, commander_name, format_name, strategy_name, summary, deck_rows_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(slug, owner, title, commander, format, strategy, summary, JSON.stringify(rows)).run();
  return json({ published: true, slug, url: `https://metaforge.gg/decks/${slug}` }, 201);
}

type StoredReport = { slug: string; title: string; commander_name: string; format_name: string; strategy_name: string; summary: string; deck_rows_json: string; created_at: string; updated_at: string };

function pageShell(title: string, description: string, canonical: string, body: string, schema: unknown) {
  const safeTitle = escapeHtml(title); const safeDescription = escapeHtml(description);
  const schemaType = schema && typeof schema === "object" && "@type" in schema ? String((schema as Record<string, unknown>)["@type"]) : "";
  const ogType = schemaType === "Article" ? "article" : "website";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} | MetaForge</title><meta name="description" content="${safeDescription}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}"><meta property="og:type" content="${ogType}"><meta property="og:site_name" content="MetaForge"><meta property="og:title" content="${safeTitle} | MetaForge"><meta property="og:description" content="${safeDescription}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://metaforge.gg/og.png"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script><style>body{margin:0;background:#030b09;color:#eee2cf;font:16px/1.6 Inter,system-ui,sans-serif}a{color:#9edfd0}.shell{width:min(1080px,calc(100% - 32px));margin:auto;padding:34px 0 70px}.brand{font-weight:900;letter-spacing:.12em;color:#eda75a;text-decoration:none}.hero,.group{margin-top:22px;padding:clamp(20px,4vw,38px);border:1px solid #345249;background:#081411}.hero small,.group header span{color:#46d8b8;font-weight:800;letter-spacing:.1em}.hero h1{margin:.2rem 0;font:600 clamp(2.2rem,6vw,4.5rem) Newsreader,Georgia,serif}.hero p{max-width:760px;color:#b9c4bf}.meta{display:flex;gap:10px;flex-wrap:wrap}.meta i{padding:5px 9px;border:1px solid #6b3d22;color:#ffd09b;font-style:normal}.group header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #345249}.cards,.guide-grid,.insights{list-style:none;margin:0;padding:0}.cards li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-bottom:1px solid #1d332d}.cards li>a{grid-column:1/-1;display:grid;gap:4px;text-decoration:none}.cards b{color:#73e5cd}.cards small{color:#8fa29b;text-align:right}.guide-grid,.insights{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px}.guide-grid a,.insights li{display:block;height:100%;box-sizing:border-box;padding:16px;border:1px solid #29463e;background:#0b1a16;text-decoration:none}.guide-grid strong,.insights strong{display:block;color:#eee2cf}.guide-grid span,.insights span{display:block;margin-top:4px;color:#8fa29b;font-size:13px}.insights b{display:block;color:#73e5cd;font-size:24px}.cta{margin-top:24px;padding:24px;border:1px solid #b36c2e;background:#2b180f}.cta a{display:inline-block;padding:11px 18px;background:#e79b41;color:#1a0f08;font-weight:800;text-decoration:none}@media(max-width:600px){.cards{font-size:14px}.cards small{display:none}}</style></head><body><main class="shell"><a class="brand" href="/">MF · METAFORGE</a>${body}</main></body></html>`;
}

export async function publicDeckReportResponse(url: URL, env: PublicReportEnv): Promise<Response> {
  const slug = safeText(url.pathname.split("/").filter(Boolean)[1], 80);
  const report = await env.DB.prepare("SELECT slug,title,commander_name,format_name,strategy_name,summary,deck_rows_json,created_at,updated_at FROM public_deck_reports WHERE slug=?").bind(slug).first<StoredReport>();
  if (!report) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
  let rows: PublicRow[] = []; try { rows = sanitizeRows(JSON.parse(report.deck_rows_json)); } catch { return new Response("Report unavailable", { status: 500 }); }
  const order = ["Commander", "Creatures", "Planeswalkers", "Artifacts", "Enchantments", "Instants", "Sorceries", "Lands", "Other"];
  const groups = new Map<string, PublicRow[]>();
  for (const row of rows) { const key = row.roles.some((role) => role.toLowerCase() === "commander") ? "Commander" : rowType(row.typeLine); groups.set(key, [...(groups.get(key) || []), row]); }
  const grouped = order.filter((name) => groups.has(name)).map((name) => { const cards = groups.get(name)!.sort((a, b) => a.name.localeCompare(b.name)); const count = cards.reduce((sum, card) => sum + card.quantity, 0); return `<section class="group"><header><h2>${name}</h2><span>${count}</span></header><ul class="cards">${cards.map((card) => `<li><b>${card.quantity}</b><strong>${escapeHtml(card.name)}</strong><small>${escapeHtml(card.roles.join(" · ") || card.typeLine)}</small></li>`).join("")}</ul></section>`; }).join("");
  const canonical = `https://metaforge.gg/decks/${report.slug}`;
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const insights = deckInsights(rows);
  const roleSummary = insights.topRoles.length ? insights.topRoles.map(([role, count]) => `<li><b>${count}</b><strong>${escapeHtml(role)}</strong><span>cards tagged for this job</span></li>`).join("") : `<li><strong>${escapeHtml(report.strategy_name)}</strong><span>The published build's declared primary plan.</span></li>`;
  const body = `<article><header class="hero"><small>PUBLIC METAFORGE DECK REPORT</small><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.summary)}</p><div class="meta"><i>${escapeHtml(report.format_name)}</i><i>${escapeHtml(report.strategy_name)}</i><i>${total} cards</i></div></header><section class="group"><header><h2>Deck structure at a glance</h2><span>METAFORGE READ</span></header><ul class="insights"><li><b>${insights.landCount}</b><strong>Lands</strong><span>the deck's current mana foundation</span></li><li><b>${insights.averageManaValue.toFixed(2)}</b><strong>Average mana value</strong><span>nonland cards in this published list</span></li><li><b>${insights.earlyPlays}</b><strong>Early plays</strong><span>nonland cards costing one or two mana</span></li><li><b>${insights.ramp}</b><strong>Ramp signals</strong><span>role tags tied to mana acceleration</span></li><li><b>${insights.cardFlow}</b><strong>Card-flow signals</strong><span>role tags tied to draw and advantage</span></li><li><b>${insights.interaction}</b><strong>Interaction signals</strong><span>role tags tied to answers and removal</span></li></ul></section><section class="group"><header><h2>Most represented deck jobs</h2><span>ROLE PROFILE</span></header><ul class="insights">${roleSummary}</ul></section>${grouped}<section class="cta"><h2>Understand your own Magic deck</h2><p>Build a new list or bring an existing deck to MetaForge for an evidence-first analysis.</p><a href="/?intent=analyze">Analyze my deck →</a></section></article>`;
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: report.title, description: report.summary, datePublished: report.created_at, dateModified: report.updated_at, mainEntityOfPage: canonical, author: { "@type": "Organization", name: "MetaForge" }, about: [{ "@type": "Thing", name: "Magic: The Gathering Commander" }, { "@type": "Thing", name: report.commander_name }] };
  return new Response(pageShell(report.title, report.summary, canonical, body, schema), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

export async function publicDeckIndexResponse(env: PublicReportEnv): Promise<Response> {
  const result = await env.DB.prepare("SELECT slug,title,commander_name,format_name,strategy_name,summary,created_at,updated_at FROM public_deck_reports ORDER BY updated_at DESC LIMIT 100").all<Omit<StoredReport,"deck_rows_json">>();
  const reports = result.results || [];
  const cards = reports.map((report) => `<li><a href="/decks/${escapeHtml(report.slug)}"><strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.commander_name)} · ${escapeHtml(report.strategy_name)}</span><p>${escapeHtml(report.summary)}</p></a></li>`).join("");
  const guides = FEATURED_COMMANDER_GUIDES.map(([slug, name]) => `<li><a href="/commanders/${slug}"><strong>${escapeHtml(name)}</strong><span>Commander strategy guide</span><p>Explore the game plans, support packages, mana requirements, and common deckbuilding mistakes for ${escapeHtml(name)}.</p></a></li>`).join("");
  const canonical = "https://metaforge.gg/decks";
  const publishedSection = reports.length ? `<section class="group"><header><h2>Player-published deck reports</h2><span>${reports.length} PUBLIC</span></header><ul class="cards">${cards}</ul></section>` : `<section class="group"><header><h2>Player-published deck reports</h2><span>OPENING SOON</span></header><p>The first public reports are being forged. Private decks stay private unless their owner explicitly publishes them.</p></section>`;
  const body = `<article><header class="hero"><small>METAFORGE ARCHIVES</small><h1>Commander Deck Archive & Community Reports</h1><p>Explore Commander strategy guides and complete, player-published decklists. Every public deck is shared deliberately by its owner; private workbench decks never appear here automatically.</p></header>${publishedSection}<section class="group"><header><h2>Commander strategy archive</h2><span>${FEATURED_COMMANDER_GUIDES.length} GUIDES</span></header><p>Start with a commander-specific game plan, then use MetaForge to build, analyze, and test your own version.</p><ul class="guide-grid">${guides}</ul></section><section class="group"><header><h2>Diagnose a Commander deck</h2><span>FREE TOOLS</span></header><ul class="guide-grid"><li><a href="/tools/commander-deck-builder"><strong>Commander Deck Builder</strong><span>Build around a coherent game plan.</span></a></li><li><a href="/tools/commander-deck-checker"><strong>Commander Deck Checker</strong><span>Find structural gaps and conflicting plans.</span></a></li><li><a href="/tools/commander-mana-base-analyzer"><strong>Mana Base Analyzer</strong><span>Check lands, colored sources, curve, and ramp.</span></a></li><li><a href="/academy"><strong>MetaForge Academy</strong><span>Learn how to diagnose recurring deck problems.</span></a></li></ul></section><section class="cta"><h2>Publish your own deck</h2><p>Finish a deck in MetaForge, then choose Share and explicitly publish a public report.</p><a href="/?intent=build">Build a Commander deck →</a></section></article>`;
  return new Response(pageShell("Commander Deck Archive & Community Reports", "Explore Commander strategy guides and complete player-published MTG decklists built and analyzed with MetaForge.", canonical, body, { "@context":"https://schema.org", "@type":"CollectionPage", name:"MetaForge Commander Deck Archive and Community Reports", url:canonical, hasPart: FEATURED_COMMANDER_GUIDES.map(([slug, name]) => ({ "@type":"Article", name:`${name} Commander Deck Guide`, url:`https://metaforge.gg/commanders/${slug}` })) }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" } });
}

export async function publicReportSitemapEntries(env: PublicReportEnv) {
  if (!env.DB) return [];
  const result = await env.DB.prepare("SELECT slug,updated_at FROM public_deck_reports ORDER BY updated_at DESC LIMIT 1000").all<{slug:string;updated_at:string}>();
  return (result.results || []).map((row) => ({ loc: `https://metaforge.gg/decks/${row.slug}`, lastmod: String(row.updated_at).slice(0,10), changefreq: "monthly", priority: "0.6" }));
}
