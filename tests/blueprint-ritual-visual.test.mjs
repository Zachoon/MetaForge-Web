import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const polish = fs.readFileSync(new URL("../app/forge-polish.css", import.meta.url), "utf8");
const commander = fs.readFileSync(new URL("../app/blueprint-commander.css", import.meta.url), "utf8");
const motion = fs.readFileSync(new URL("../app/forge-motion.css", import.meta.url), "utf8");

test("the Blueprint chamber presents choices as a completed commissioning ritual", () => {
  // The build-step navigation pass kept this compatibility class as a
  // hook (visual tests and CSS selectors depend on it) but combined it
  // with a dynamic step modifier, so it's no longer the sole class in a
  // plain string literal — check it's present as a leading class instead
  // of demanding an exact, single-class match.
  assert.match(page, /className=\{`commission-scroll[^`]*`\}|className="commission-scroll"/);
  assert.match(page, /className="mark-grid"/);
  assert.match(page, /className="commission-note"/);
  assert.match(page, /className="awaken-button"/);
  assert.match(polish, /counter-reset:blueprint-mark/);
  assert.match(polish, /MARK SET/);
  assert.match(polish, /BLUEPRINT READY/);
  assert.match(polish, /INTENT CAPTURED/);
});

test("commander choice becomes a responsive, motion-safe Blueprint seal", () => {
  // Same compatibility-hook story as commission-scroll above: kept as a
  // real class on the element, now paired with build-choice-commander
  // rather than standing alone.
  assert.match(page, /className="commander-blueprint(?: [^"]*)?"/);
  assert.match(commander, /COMMANDER BOUND/);
  assert.match(commander, /@keyframes commander-bound-in/);
  assert.match(commander, /prefers-reduced-motion:reduce[^}]*\.commander-blueprint/s);
});

test("commander predictions dismiss instead of leaving an empty listbox", () => {
  assert.match(page, /commanderSearchOpen/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /event\.currentTarget\.contains\(related\)/);
  assert.match(page, /commanderSearchOpen && \(commanderSearching/);
  assert.match(page, /setCommanderSearchOpen\(false\)/);
});

test("the commander search dropdowns escape .commission-chamber's stacking context via a body portal", () => {
  // position:fixed does NOT escape an ancestor's stacking context, only
  // its containing block — and .commission-chamber (like every other
  // direct child of .great-forge) gets a real z-index from the global
  // layering rule, which creates exactly that kind of context. No
  // z-index on the dropdown itself can win against a fixed sibling like
  // the bench dock from inside that trap, so it has to actually leave
  // the DOM subtree via createPortal(..., document.body) instead.
  assert.match(page, /import \{ createPortal \} from "react-dom";/);
  assert.match(page, /createPortal\(\s*<div\s*\n\s*role="listbox"\s*\n\s*className="commander-search-portal"/);
  assert.match(page, /document\.body,\s*\)/);
  // Both the primary commander search and the Partner/Background search
  // need the same treatment — they're both inside the same trap.
  const portalCount = (page.match(/createPortal\(/g) || []).length;
  assert.ok(portalCount >= 2, `expected at least 2 createPortal calls (primary + second commander search), got ${portalCount}`);
  // The blur-to-close handler must also recognize the portaled listbox as
  // "still part of this widget," or every option click would close the
  // dropdown (via blur) before its own onClick had a chance to fire.
  assert.match(page, /related\.closest\(".commander-search-portal"\)/);
});

test("the search results dropdown isn't clipped by the Blueprint seal's own overflow:hidden", () => {
  // .commander-search's results listbox is position:absolute and must
  // render outside .commander-blueprint's box while searching. The seal
  // only needs overflow:hidden once a commander article is actually
  // bound (to clip its corner badge/gradient) — applying it unconditionally
  // silently clips the search dropdown to almost nothing.
  assert.doesNotMatch(commander, /\.commander-blueprint\{overflow:hidden/);
  const scoped = commander.match(/\.commander-blueprint:has\(>article\)\{([^}]*)\}/);
  assert.ok(scoped, "expected overflow:hidden to be scoped to the bound-commander state");
  assert.match(scoped[1], /overflow:hidden/);
});

test("the search dropdown also isn't clipped by .commission-chamber, the ancestor a level up", () => {
  // .commander-blueprint wasn't the only offender — .commission-chamber (the
  // whole Blueprint form, wrapping both "Forge a new deck" and "Refine a
  // current build") had its own unconditional overflow:hidden too, there
  // only to clip a decorative gradient sweep that translates side to side.
  // Moving that sweep to a real sibling div (with its own overflow:hidden)
  // instead of the chamber itself means the chamber no longer clips
  // anything its content — including the commander-search dropdown —
  // needs to render outside its box.
  assert.doesNotMatch(motion, /\.commission-chamber,\.masterwork-reveal,\.testing-anvil\{overflow:hidden\}/);
  assert.doesNotMatch(motion, /\.commission-chamber::after/);
  assert.match(motion, /\.commission-chamber-sweep\{[^}]*overflow:hidden/);
  assert.match(page, /className="commission-chamber-sweep"/);
});
