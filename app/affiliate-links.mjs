// MetaForge TCGplayer Affiliate Link Builder
//
// One centralized, pure, isomorphic function for every TCGplayer purchase
// link on the site — no ad-hoc URL construction scattered through JSX.
// Deliberately does not read any environment variable, secret, or config
// store itself: the caller (server-resolved, never hardcoded client-side)
// passes `enabled` in explicitly, so this stays a plain, fully-testable
// function safe to import from both a Worker and the browser bundle. That
// safety is possible specifically because a TCGplayer product/search URL
// is public merchant data, not proprietary engine logic — nothing this
// module produces or depends on needs to stay server-only.
//
// Never reads Scryfall's `purchase_uris` field. That field is already
// wrapped in Scryfall's own Impact/TCGplayer affiliate attribution — using
// it here would either route commission to Scryfall instead of MetaForge,
// or double-wrap a link inside two affiliate networks at once. The only
// safe raw material taken from Scryfall card data is the bare numeric
// `tcgplayer_id` field, validated below before it's ever used to build a
// URL.
//
// No Impact campaign ID, media-partner ID, or tracking-parameter template
// lives here. The Impact Universal Tracking Tag (`app/layout.tsx`) and its
// site-verification meta tag are installed and site verification has
// succeeded — but the TCGplayer application itself is still in review, not
// yet an approved/joined partnership. Per Impact's own documented
// behavior (see CAPTAINS_LOG.md for the sourced explanation), the tag only
// transforms outbound links into tracked ones for brands the account has
// joined — so until TCGplayer's approval is confirmed in the Impact
// dashboard, every link this module builds stays a plain, honest,
// unmonetized destination URL, whether or not this feature flag is on.
// Do not treat that transformation as active, or TCGplayer as approved,
// until that's verified directly in the account.

const TCGPLAYER_PRODUCT_BASE = "https://www.tcgplayer.com/product/";
const TCGPLAYER_SEARCH_BASE = "https://www.tcgplayer.com/search/magic/product";

// The rel value every external MetaForge affiliate-adjacent link must
// carry: "sponsored" discloses commercial intent to search engines,
// "nofollow" avoids passing link equity, "noopener noreferrer" prevents
// the opened tab from gaining a handle back to this window (and stops
// MetaForge's own URL from leaking to TCGplayer as a referrer beyond what
// the destination itself already implies).
const EXTERNAL_LINK_REL = "sponsored nofollow noopener noreferrer";

const AFFILIATE_DISCLOSURE_TEXT =
  "MetaForge may earn a commission from qualifying purchases at no additional cost to you.";

// A real, validated TCGplayer product ID: a positive integer, exactly the
// shape Scryfall's bare `tcgplayer_id` field takes when present. Anything
// else (a string, zero, a negative number, a float, null/undefined) is
// treated as "no reliable product identifier" rather than coerced or
// guessed — the caller falls back to an honest search link instead.
export function isValidTcgplayerProductId(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// cardName: the card's real name, used only for the honest search
// fallback — never parsed, guessed, or matched against anything.
// tcgplayerProductId: the bare numeric Scryfall `tcgplayer_id` for the
// player's selected printing, if known. Never `purchase_uris` or any
// value derived from it.
// enabled: resolved server-side (see worker/index.ts's
// /api/forge/status), never inferred or defaulted true by this function.
//
// Returns null when the feature is disabled or there's no real card name
// to link from — the caller renders no purchase CTA and no nearby
// disclosure in that case. Otherwise returns a frozen link descriptor the
// caller renders directly, never reconstructing the URL itself.
export function buildTcgplayerLink({ cardName, tcgplayerProductId, enabled }) {
  if (!enabled) return null;
  const name = String(cardName || "").trim();
  if (!name) return null;

  if (isValidTcgplayerProductId(tcgplayerProductId)) {
    return Object.freeze({
      url: `${TCGPLAYER_PRODUCT_BASE}${tcgplayerProductId}`,
      label: "View this printing on TCGplayer",
      isExactPrinting: true,
      target: "_blank",
      rel: EXTERNAL_LINK_REL,
    });
  }

  return Object.freeze({
    url: `${TCGPLAYER_SEARCH_BASE}?q=${encodeURIComponent(name)}`,
    label: "Search TCGplayer",
    isExactPrinting: false,
    target: "_blank",
    rel: EXTERNAL_LINK_REL,
  });
}

export { AFFILIATE_DISCLOSURE_TEXT };
