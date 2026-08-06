// MetaForge TCGplayer Affiliate Link Builder
//
// One centralized, pure, isomorphic function for every TCGplayer purchase
// link on the site — no ad-hoc URL construction scattered through JSX.
// Deliberately does not read any environment variable, secret, or config
// store itself: the caller (server-resolved, never hardcoded client-side)
// passes `enabled` in explicitly, so this stays a plain, fully-testable
// function safe to import from both a Worker and the browser bundle. That
// safety is possible specifically because a TCGplayer product/search URL
// — and the public Impact tracking base URL below — is public merchant
// data, not proprietary engine logic or a secret; nothing this module
// produces or depends on needs to stay server-only.
//
// Never reads Scryfall's `purchase_uris` field. That field is already
// wrapped in Scryfall's own Impact/TCGplayer affiliate attribution — using
// it here would either route commission to Scryfall instead of MetaForge,
// or double-wrap a link inside two affiliate networks at once. The only
// safe raw material taken from Scryfall card data is the bare numeric
// `tcgplayer_id` field, validated below before it's ever used to build a
// URL.
//
// TCGplayer is now an approved, joined Impact partnership (confirmed
// directly in the account — this module previously stayed unmonetized
// pending that confirmation; see git history for that earlier state).
// Every link this module builds is explicitly wrapped through Impact's
// documented deep-link mechanism — IMPACT_TRACKING_BASE_URL below, with
// the real destination appended as a percent-encoded `u=` parameter
// (https://help.impact.com, "Create a Deep Link for an Ad") — rather than
// relying on the Impact Universal Tracking Tag's automatic `transformLinks`
// DOM rewriting (still installed in app/layout.tsx, but no longer this
// module's attribution mechanism). An explicit deep link works
// independently of the Tag's client-side execution and was verified live
// against this exact account: a constructed
// `${IMPACT_TRACKING_BASE_URL}?u=<destination>` request returns a real
// redirect to the destination carrying `irpid=7552660` and
// `utm_campaign=Zach Lackey` — proof this account, not a default/generic
// response. IMPACT_TRACKING_BASE_URL is the one and only place that
// tracking base lives; nothing else in this codebase should ever
// construct or duplicate it.

const IMPACT_TRACKING_BASE_URL = "https://partner.tcgplayer.com/c/7552660/1780961/21018";

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
  "Affiliate links: Purchases made through TCGplayer links help support MetaForge at no additional cost to you.";

// Wraps any plain TCGplayer destination URL in the verified Impact deep
// link so attribution survives the click. Exported on its own (not just
// inlined into buildTcgplayerLink below) so its exact encoding behavior —
// spaces, apostrophes, commas, "//" in double-faced card names, non-ASCII
// characters — is independently testable against the real, verified
// format rather than only through the composed function.
export function buildImpactTrackingUrl(destinationUrl) {
  return `${IMPACT_TRACKING_BASE_URL}?u=${encodeURIComponent(destinationUrl)}`;
}

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
      url: buildImpactTrackingUrl(`${TCGPLAYER_PRODUCT_BASE}${tcgplayerProductId}`),
      label: "View this printing on TCGplayer",
      isExactPrinting: true,
      target: "_blank",
      rel: EXTERNAL_LINK_REL,
    });
  }

  return Object.freeze({
    url: buildImpactTrackingUrl(`${TCGPLAYER_SEARCH_BASE}?q=${encodeURIComponent(name)}`),
    label: "Search TCGplayer",
    isExactPrinting: false,
    target: "_blank",
    rel: EXTERNAL_LINK_REL,
  });
}

export { AFFILIATE_DISCLOSURE_TEXT };
