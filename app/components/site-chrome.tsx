import Link from "next/link";
import { EXPLORE_LINKS, TOP_NAV, type TopNavId } from "../site-nav";
import { TOOL_PAGES } from "../tools/data";

const DATABASE_LINKS = [
  { id: "mtg-deck-analyzer", label: "Analyzer", href: "/tools/mtg-deck-analyzer", icon: "◇" },
  { id: "commander-deck-builder", label: "Builder", href: "/tools/commander-deck-builder", icon: "⚒" },
  { id: "commander-deck-checker", label: "Checker", href: "/tools/commander-deck-checker", icon: "✓" },
  { id: "commander-mana-base-analyzer", label: "Mana", href: "/tools/commander-mana-base-analyzer", icon: "◈" },
  { id: "commander-land-calculator", label: "Lands", href: "/tools/commander-land-calculator", icon: "▦" },
  { id: "commander-color-source-calculator", label: "Colors", href: "/tools/commander-color-source-calculator", icon: "◉" },
  { id: "commander-power-level-checker", label: "Power", href: "/tools/commander-power-level-checker", icon: "⚡" },
  { id: "commander-bracket-checker", label: "Bracket", href: "/tools/commander-bracket-checker", icon: "▣" },
  { id: "commander-deck-optimizer", label: "Optimize", href: "/tools/commander-deck-optimizer", icon: "⚙" },
  { id: "mtg-mana-curve-analyzer", label: "Curve", href: "/tools/mtg-mana-curve-analyzer", icon: "▤" },
] as const;

const TOOL_SLUGS = new Set<string>(TOOL_PAGES.map((tool) => tool.slug));

function sectionFor(current?: string): TopNavId {
  if (current === "tools" || (current && TOOL_SLUGS.has(current))) return "database";
  if (current === "community") return "community";
  if (current === "decks") return "decks";
  if (current === "analyze") return "analyze";
  return "explore";
}

export function SiteHeader({ current }: { current?: string }) {
  const section = sectionFor(current);
  const rail = section === "database" ? DATABASE_LINKS : section === "explore" ? EXPLORE_LINKS : [];
  return (
    <>
      <header className="mf-site-header">
        <Link className="mf-brand legal-brand" href="/">
          <img src="/assets/brand/metaforge-mf-anvil.webp" alt="" width={34} height={34} />
          <span>METAFORGE</span>
        </Link>
        <nav className="mf-site-nav" aria-label="MetaForge">
          {TOP_NAV.map((item) => (
            <Link key={item.id} href={item.href} aria-current={section === item.id ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {rail.length > 0 && (
        <nav className="mf-section-rail" aria-label={section === "database" ? "Database" : "Explore"}>
          {rail.map((item) => (
            <Link key={item.id} href={item.href} aria-current={current === item.id ? "page" : undefined}>
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export function PageTrail({ crumbs }: { crumbs: { href?: string; label: string }[] }) {
  return (
    <div className="mf-trail">
      <nav className="mf-crumbs" aria-label="Breadcrumb">
        <ol>
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`}>
                {crumb.href && !last ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <nav className="mf-journey" aria-label="Where to go next">
        <Link href="/commanders"><b>1</b><span>Start with your commander</span></Link>
        <Link href="/?intent=build"><b>2</b><span>Build</span></Link>
        <Link href="/academy"><b>3</b><span>Learn</span></Link>
      </nav>
    </div>
  );
}
