import type { Metadata, Viewport } from "next";
import "./globals.css";
import PrivacyControls from "./privacy-controls";
import { STALE_CHUNK_RECOVERY_SCRIPT } from "./stale-chunk-recovery";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export function generateMetadata(): Metadata {
  const metadataBase = new URL("https://metaforge.gg");
  const title = "MetaForge — MTG Commander Deck Builder & Analyzer";
  const description = "Build and understand Magic: The Gathering Commander decks with an explainable deck coach.";

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
        {/* vinext's ViewportHead drops viewport-fit and interactive-widget,
            so the tag the browser actually reads is updated here. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var m=document.querySelector('meta[name=\"viewport\"]');if(m)m.setAttribute('content','width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content');})();" }} />
        {/* First in <head> so it is listening before any app chunk loads. */}
        <script dangerouslySetInnerHTML={{ __html: STALE_CHUNK_RECOVERY_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Newsreader, Inter, and Anton stay. The optical-size axis is unused,
            and media=print keeps the stylesheet from blocking first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400..700;1,400..700&family=Inter:wght@400..800&family=Anton&display=swap";var l=document.createElement("link");l.rel="stylesheet";l.href=h;l.media="print";l.onload=function(){this.media="all"};document.head.appendChild(l)})();`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400..700;1,400..700&family=Inter:wght@400..800&family=Anton&display=swap"
          />
        </noscript>
      </head>
      <body>{children}<PrivacyControls /></body>
    </html>
  );
}
