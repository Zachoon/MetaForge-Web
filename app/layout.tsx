import type { Metadata } from "next";
import "./globals.css";
import PrivacyControls from "./privacy-controls";

export function generateMetadata(): Metadata {
  const metadataBase = new URL("https://metaforge.gg");
  const title = "MetaForge — MTG Commander Deck Builder & Analyzer";
  const description = "Build, analyze, and improve Magic: The Gathering decks with an explainable MTG deck coach for Commander, Standard, Modern, Pioneer, Brawl, and more.";

  return {
    metadataBase,
    title,
    description,
    keywords: ["MTG deck builder", "Commander deck builder", "Magic deck builder", "MTG deck analyzer", "Commander deck analyzer", "Magic: The Gathering deckbuilding"],
    applicationName: "MetaForge",
    authors: [{ name: "MetaForge", url: "https://metaforge.gg" }],
    creator: "MetaForge",
    publisher: "MetaForge",
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    category: "games",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", url: "/", siteName: "MetaForge", locale: "en_US", images: [{ url: "/og.png", width: 1200, height: 630, alt: "MetaForge — collaborative MTG deck coaching" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Inter:wght@400;500;600;700;800&family=Anton&display=swap"
        />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
      </head>
      <body>{children}<PrivacyControls /></body>
    </html>
  );
}
