import assert from "node:assert/strict";
import test from "node:test";
import { buildTcgplayerLink, isValidTcgplayerProductId, AFFILIATE_DISCLOSURE_TEXT } from "../app/affiliate-links.mjs";

const EXPECTED_REL = "sponsored nofollow noopener noreferrer";

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

test("a valid numeric product ID produces the exact product URL and exact-printing label", () => {
  const link = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  assert.equal(link.url, "https://www.tcgplayer.com/product/631015");
  assert.equal(link.label, "View this printing on TCGplayer");
  assert.equal(link.isExactPrinting, true);
});

test("an invalid or missing product ID produces the safely encoded search URL and the honest search label, never 'Find this printing'", () => {
  for (const invalid of [null, undefined, 0, -5, 1.5, "631015", NaN, Infinity]) {
    const link = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: invalid, enabled: true });
    assert.equal(link.url, "https://www.tcgplayer.com/search/magic/product?q=Sol%20Ring");
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

test("card names are safely URL-encoded, including apostrophes, commas, split-card slashes, and unicode", () => {
  const names = ["Urza's Saga", "Fire // Ice", "Jötun Grunt", "Sun & Moon", "Question?"];
  for (const name of names) {
    const link = buildTcgplayerLink({ cardName: name, tcgplayerProductId: null, enabled: true });
    assert.equal(link.url, `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name)}`);
    // Round-trips back to the exact original name via the URL/URLSearchParams
    // APIs themselves — the real proof the query string is well-formed and
    // safely encoded, independent of this test's own escaping logic.
    const roundTripped = new URL(link.url).searchParams.get("q");
    assert.equal(roundTripped, name);
  }
});

test("the selected printing's product ID reaches the builder unchanged — no re-derivation, no lookup, no mutation", () => {
  const realPrintingId = 631015;
  const link = buildTcgplayerLink({ cardName: "Vivi Ornitier", tcgplayerProductId: realPrintingId, enabled: true });
  assert.equal(link.url, `https://www.tcgplayer.com/product/${realPrintingId}`);
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
  // honest search, never silently pull a URL out of it.
  const rawScryfallCard = {
    tcgplayer_id: 631015,
    purchase_uris: {
      tcgplayer: "https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F631015",
    },
  };
  const link = buildTcgplayerLink({ cardName: "Vivi Ornitier", tcgplayerProductId: rawScryfallCard, enabled: true });
  assert.equal(link.isExactPrinting, false, "a raw card object is not a valid product ID and must fall back to search");
  assert.doesNotMatch(link.url, /partner\.tcgplayer\.com/);
  assert.doesNotMatch(link.url, /subId1/);
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

test("the module source never hardcodes an Impact tracking domain, campaign ID, or media-partner parameter", async () => {
  const fs = await import("node:fs");
  const source = fs.readFileSync(new URL("../app/affiliate-links.mjs", import.meta.url), "utf8");
  for (const pattern of [/impactcdn/i, /\.sjv\.io/i, /irclickid/i, /mediaPartnerId/i, /campaignid/i, /subId1/i]) {
    assert.doesNotMatch(source, pattern);
  }
});

test("AFFILIATE_DISCLOSURE_TEXT is the exact required wording", () => {
  assert.equal(AFFILIATE_DISCLOSURE_TEXT, "MetaForge may earn a commission from qualifying purchases at no additional cost to you.");
});

test("buildTcgplayerLink is a pure function: identical input always produces an identical, non-mutated result", () => {
  const first = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  const second = buildTcgplayerLink({ cardName: "Sol Ring", tcgplayerProductId: 631015, enabled: true });
  assert.deepEqual(first, second);
  assert.throws(() => { first.url = "https://evil.example"; }, /Cannot assign to read only property|not extensible/);
});
