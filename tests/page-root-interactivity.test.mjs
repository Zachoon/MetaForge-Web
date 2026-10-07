import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

// From Aug 26 to Oct 7, 2026, every non-homepage route put `forge-atmosphere`
// on its <main>, where the retired decorative-layer rule in globals.css (a
// fixed, viewport-sized, overflow-hidden, pointer-events:none, opacity .48
// overlay) froze each page to its first screen, made every link unclickable,
// and dimmed all content. The page-root rule must keep overriding all of it.
const livingAtmosphere = await readFile(new URL("../app/living-atmosphere.css", import.meta.url), "utf8");

test("a forge-atmosphere page root stays in normal flow, scrollable, clickable, and fully opaque", () => {
  const rootRule = livingAtmosphere.match(/\n\.forge-atmosphere \{[\s\S]*?\n\}/)?.[0];
  assert.ok(rootRule, "expected the .forge-atmosphere page-root rule");
  for (const declaration of [
    "position: relative !important",
    "inset: auto !important",
    "overflow: visible !important",
    "opacity: 1 !important",
    "pointer-events: auto !important",
  ]) {
    assert.ok(rootRule.includes(declaration), `missing "${declaration}"`);
  }
  const beforeRule = livingAtmosphere.match(/\n\.forge-atmosphere::before \{[\s\S]*?\n\}/)?.[0];
  assert.ok(beforeRule?.includes("position: fixed !important"), "the glow layer must stay viewport-fixed so it can't widen the page");
  assert.ok(beforeRule?.includes("inset: 0 !important"));
});

test("the content routes that rely on that override still use forge-atmosphere as their page root", async () => {
  const pages = ["about", "privacy", "terms", "tools", "academy", "commanders"];
  for (const page of pages) {
    const source = await readFile(new URL(`../app/${page}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /<main className="[^"]*\bforge-atmosphere\b/, `${page} should render <main className="... forge-atmosphere">`);
  }
  const slugPages = (await readdir(new URL("../app/commanders/", import.meta.url))).includes("[slug]");
  assert.ok(slugPages, "commander guide pages still exist");
});
