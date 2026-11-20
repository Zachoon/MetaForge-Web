import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";
import "./deck-check.css";
import { PageTrail, SiteHeader } from "../components/site-chrome";
import { DeckCheck } from "./deck-check-client";

const TITLE = "Free MTG Deck Checker & Coach | MetaForge";
const DESCRIPTION = "Paste a Magic: The Gathering decklist. MetaForge checks format legality, reads what the deck is trying to do, names its weaknesses with the card text behind them, and replays one change so you can see what it fixes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://metaforge.gg/deck-check" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://metaforge.gg/deck-check" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function DeckCheckPage() {
  return (
    <main className="legal-page forge-atmosphere deck-check-page">
      <SiteHeader current="analyze" />
      <div className="legal-shell deck-check-shell">
        <PageTrail crumbs={[{ href: "/", label: "Explore" }, { label: "Deck Check" }]} />
        <DeckCheck />
        <footer className="legal-links">
          <Link href="/tools">All MTG tools</Link>
          <Link href="/academy">Deckbuilding Academy</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/">Return to the Forge</Link>
        </footer>
      </div>
    </main>
  );
}
