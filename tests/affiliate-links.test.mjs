import assert from "node:assert/strict";
import test from "node:test";
import { buildTcgplayerLink, buildImpactTrackingUrl, isValidTcgplayerProductId, AFFILIATE_DISCLOSURE_TEXT } from "../app/affiliate-links.mjs";

const EXPECTED_REL = "sponsored nofollow noopener noreferrer";
const IMPACT_BASE = "https://partner.tcgplayer.com/c/7552660/1780961/21018";

// Decodes a wrapped link's real destination the same way a browser
// following the redirect would — via the URL/URLSearchParams APIs
// themselves, independent of this test file's own escaping logic. Used
// throughout below instead of string-matching the raw href.
function destinationOf(wrappedUrl) {
  return new URL(wrappedUrl).searchParams.get("u");
}

test("disabled configuration renders no CTA regardless of how complete the rest of the data is", () => {
  assert.equal(buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 12345, enabled: false }), null);
  assert.equal(buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: null, enabled: false }), null);
  assert.equal(buildTcgplayerLink({ cardName: "", tcgplayerProductId: 12345, enabled: false }), null);
});

test("incomplete configuration (no card name) cannot claim tracking even when enabled", () => {
  assert.equal(buildTcgplayerLink({ cardName: "", tcgplayerProductId: 12345, enabled: true }), null);
  assert.equal(buildTcgplayerLink({ cardName: "   ", tcgplayerProductId: 12345, enabled: true }), null);
  assert.equal(buildTcgplayerLink({ cardName: undefined, tcgplayerProductId: 12345, enabled: true }), null);
});

test("a valid numeric product ID produces the exact product URL, wrapped in the verified Impact deep link, with the exact-printing label", () => {
  const link = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  assert.ok(link.url.startsWith(`${IMPACT_BASE}?u=`), "must be wrapped through the one approved tracking base");
  assert.equal(destinationOf(link.url), "https://www.tcgplayer.com/product/631015");
  assert.equal(link.label, "View this printing on TCGplayer");
  assert.equal(link.isExactPrinting, true);
});

test("an invalid or missing product ID produces the safely encoded search URL, wrapped the same way, with the honest search label, never 'Find this printing'", () => {
  for (const invalid of [null, undefined, 0, -5, 1.5, "631015", NaN, Infinity]) {
    const link = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: invalid, enabled: true });
    assert.ok(link.url.startsWith(`${IMPACT_BASE}?u=`));
    assert.equal(destinationOf(link.url), "https://www.tcgplayer.com/search/magic/product?q=Sol%20Ring");
    assert.equal(link.label, "Search TCGplayer");
    assert.notEqual(link.label, "Find this printing");
    assert.equal(link.isExactPrinting, false);
  }
});

test("isValidTcgplayerProductId is the single source of truth the builder itself uses", () => {
  assert.equal(isValidTcgplayerProductId(631015), true);
  assert.equal(isValidTcgplayerProductId(1), true);
  assert.equal(isValidTcgplayerProductId(0), false);
  assert.equal(isValidTcgplayerProductId(-1), false);
  assert.equal(isValidTcgplayerProductId(1.5), false);
  assert.equal(isValidTcgplayerProductId("631015"), false, "a numeric string is not a validated number");
  assert.equal(isValidTcgplayerProductId(null), false);
  assert.equal(isValidTcgplayerProductId(undefined), false);
  assert.equal(isValidTcgplayerProductId(NaN), false);
  assert.equal(isValidTcgplayerProductId(Infinity), false);
});

test("card names are safely URL-encoded, including spaces, apostrophes, commas, split-card slashes, and non-ASCII characters — through both the inner search URL and the outer Impact wrapper", () => {
  const names = [
    "Urza's Saga",
    "Fire // Ice",
    "Lim-Dûl's Vault",
    "Urza, Lord High Artificer",
    "Sun & Moon",
    "Question?",
  ];
  for (const name of names) {
    const link = buildTcgplayerLink({ cardName: name, tcgplayerProductId: null, enabled: true });
    assert.ok(link.url.startsWith(`${IMPACT_BASE}?u=`));
    // Outer round-trip: the wrapper's own u= param decodes back to the exact
    // inner destination URL, independent of this test's own escaping logic.
    const destination = destinationOf(link.url);
    assert.equal(destination, `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name)}`);
    // Inner round-trip: that destination's own q= param decodes back to the
    // exact original card name — proof the double-encoding (name into the
    // search URL, that whole URL into the u= param) doesn't corrupt it.
    const roundTripped = new URL(destination).searchParams.get("q");
    assert.equal(roundTripped, name);
  }
});

test("the selected printing's product ID reaches the builder unchanged — no re-derivation, no lookup, no mutation", () => {
  const realPrintingId = 631015;
  const link = buildTcgplayerLink({ cardName: "Vivi Ornitier", tcgplayerProductId: realPrintingId, enabled: true });
  assert.equal(destinationOf(link.url), `https://www.tcgplayer.com/product/${realPrintingId}`);
});

test("buildImpactTrackingUrl itself: exact base URL, correct u= parameter, and a real double round-trip through a double-faced card's own destination URL", () => {
  const destination = "https://www.tcgplayer.com/product/446/magic-limited-edition-alpha-black-lotus";
  const wrapped = buildImpactTrackingUrl(destination);
  assert.ok(wrapped.startsWith(IMPACT_BASE), "must use the one approved tracking base, unmodified");
  assert.equal(destinationOf(wrapped), destination);

  // A destination that is itself a search URL for a double-faced card name
  // — two layers of encoding (the "//" inside the card name, then the
  // whole search URL inside u=) must both survive.
  const doubleFacedSearch = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent("Fire // Ice")}`;
  const wrappedSearch = buildImpactTrackingUrl(doubleFacedSearch);
  const decodedSearch = destinationOf(wrappedSearch);
  assert.equal(decodedSearch, doubleFacedSearch);
  assert.equal(new URL(decodedSearch).searchParams.get("q"), "Fire // Ice");
});

test("every link carries the required external-link security attributes", () => {
  const exact = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  const search = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: null, enabled: true });
  for (const link of [exact, search]) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, EXPECTED_REL);
    assert.match(link.rel, /\bnofollow\b/);
    assert.match(link.rel, /\bnoopener\b/);
    assert.match(link.rel, /\bnoreferrer\b/);
    assert.match(link.rel, /\bsponsored\b/);
  }
});

test("never consumes Scryfall's purchase_uris, even if a caller mistakenly passes a full raw card object through it", () => {
  // The builder's parameter contract only accepts a bare
  // tcgplayerProductId, never a raw card object — so passing one through
  // where a number is expected must fail validation and fall back to an
  // honest search, never silently pull a URL out of it. Scryfall's own
  // purchase_uris.tcgplayer is itself a partner.tcgplayer.com link — but
  // under a DIFFERENT account (4931599/1830156, Scryfall's own), not
  // MetaForge's (7552660/1780961/21018). The real proof this is never
  // consumed is that Scryfall's specific account numbers and its "subId1"
  // parameter never appear in the result — not that the shared
  // partner.tcgplayer.com domain is absent, since MetaForge's own real
  // links legitimately use that same domain now.
  const rawScryfallCard = {
    tcgplayer_id: 631015,
    purchase_uris: {
      tcgplayer: "https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F631015",
    },
  };
  const link = buildTcgplayerLink({ cardName: "Vivi Ornitier", tcgplayerProductId: rawScryfallCard, enabled: true });
  assert.equal(link.isExactPrinting, false, "a raw card object is not a valid product ID and must fall back to search");
  assert.ok(link.url.startsWith(IMPACT_BASE), "must use MetaForge's own approved account, not fall through to Scryfall's");
  assert.doesNotMatch(link.url, /4931599\/1830156/, "Scryfall's own account numbers must never appear");
  assert.doesNotMatch(link.url, /subId1/, "Scryfall's own tracking parameter must never appear");
});

test("the module source never actually reads Scryfall's purchase_uris field as code — only discusses it in documentation comments", async () => {
  const fs = await import("node:fs");
  const source = fs.readFileSync(new URL("../app/affiliate-links.mjs", import.meta.url), "utf8");
  // The module's own header comments explain, in prose, exactly why
  // purchase_uris is never used — that mention is intentional and
  // valuable documentation, not a violation. What must never appear is
  // actual property-access syntax that would read the field from an
  // object (`.purchase_uris` or `["purchase_uris"]`).
  assert.doesNotMatch(source, /\.purchase_uris\b/);
  assert.doesNotMatch(source, /\[\s*["']purchase_uris["']\s*\]/);
  assert.match(source, /purchase_uris/, "sanity check: the explanatory comment must still be present");
});

test("the module source hardcodes exactly the one approved Impact tracking base, and no other tracking domain, script, or invented parameter name", async () => {
  const fs = await import("node:fs");
  const source = fs.readFileSync(new URL("../app/affiliate-links.mjs", import.meta.url), "utf8");
  // The one deliberate exception: the verified base URL, appearing exactly
  // once as the module-level constant.
  const baseOccurrences = (source.match(/partner\.tcgplayer\.com\/c\/7552660\/1780961\/21018/g) || []).length;
  assert.equal(baseOccurrences, 1, "the approved tracking base must be defined exactly once, not duplicated");
  // impactcdn.com is the Universal Tracking Tag's script domain (installed
  // separately in app/layout.tsx, not this module's concern); the rest are
  // tracking parameter names Impact's own redirect server appends — this
  // module must never construct or reference any of them itself.
  for (const pattern of [/impactcdn/i, /\.sjv\.io/i, /irclickid/i, /mediaPartnerId/i, /campaignid/i, /subId1/i]) {
    assert.doesNotMatch(source, pattern);
  }
});

test("AFFILIATE_DISCLOSURE_TEXT is the exact required wording", () => {
  assert.equal(AFFILIATE_DISCLOSURE_TEXT, "Affiliate links: Purchases made through TCGplayer links help support MetaForge at no additional cost to you.");
});

test("buildTcgplayerLink is a pure function: identical input always produces an identical, non-mutated result", () => {
  const first = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  const second = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  assert.deepEqual(first, second);
  assert.throws(() => { first.url = "https://evil.example"; }, /Cannot assign to read only property|not extensible/);
});
