import Link from "next/link";

/* Learn points at /learn only. Another change owns that section. */
export const SITE_NAV = [
  { href: "/", id: "explore", label: "Explore" },
  { href: "/commanders", id: "commanders", label: "Commanders" },
  { href: "/?intent=build", id: "build", label: "Build" },
  { href: "/learn", id: "learn", label: "Learn" },
  { href: "/academy", id: "academy", label: "Academy" },
  { href: "/decks", id: "community", label: "Community" },
] as const;

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="mf-site-header">
      <Link className="mf-brand legal-brand" href="/">
        <img src="/assets/brand/metaforge-mf-anvil.webp" alt="" width={34} height={34} />
        <span>METAFORGE</span>
      </Link>
      <nav className="mf-site-nav" aria-label="MetaForge">
        {SITE_NAV.map((item) => (
          <Link key={item.id} href={item.href} aria-current={current === item.id ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
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
