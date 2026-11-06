/* Broad sections live in the top bar. Subsections live on the side rail
   for the section you are in. A destination is listed in only one of those. */
export const TOP_NAV = [
  { id: "explore", label: "Explore", href: "/" },
  { id: "decks", label: "Decks", href: "/?intent=decks" },
  { id: "analyze", label: "Analyze", href: "/?intent=analyze" },
  { id: "database", label: "Database", href: "/tools" },
  { id: "community", label: "Community", href: "/decks" },
] as const;

export const EXPLORE_LINKS = [
  { id: "learn", label: "Learn", href: "/learn", icon: "☰" },
  { id: "academy", label: "Academy", href: "/academy", icon: "✎" },
  { id: "commanders", label: "Commanders", href: "/commanders", icon: "♛" },
] as const;

export type TopNavId = (typeof TOP_NAV)[number]["id"];
