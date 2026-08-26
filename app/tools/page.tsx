import type { Metadata } from "next";
import "../legal.css";
import "./tools.css";
import { TOOL_PAGES } from "./data";

export const metadata: Metadata = {
  title: "Free MTG & Commander Deckbuilding Tools | MetaForge",
  description: "Build, check, and analyze Magic: The Gathering decks with free Commander deckbuilding tools that explain their recommendations.",
  alternates: { canonical: "https://metaforge.gg/tools" },
};

export default function ToolsIndex() {
  return <main className="legal-page forge-atmosphere"><div className="legal-shell">
    <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
    <article className="legal-card"><small>FREE MTG DECKBUILDING TOOLS</small>
      <h1>Build and understand your Magic deck</h1>
      <p className="updated">Commander and MTG tools that explain what they find.</p>
      <section><p>Use MetaForge to build a new Commander deck or investigate a list you already play. Each tool leads into the same evidence-first deck coach, with guidance tailored to the question you are trying to answer.</p></section>
      <section><h2>Choose a tool</h2><ul className="tool-grid">{TOOL_PAGES.map((tool) => <li key={tool.slug}><a href={`/tools/${tool.slug}`}><strong>{tool.title}</strong><span>{tool.promise}</span></a></li>)}</ul></section>
    </article>
    <footer className="legal-links"><a href="/commanders">Commander deck guides</a><a href="/academy">Deckbuilding Academy</a><a href="/">Return to the Forge</a></footer>
  </div></main>;
}
