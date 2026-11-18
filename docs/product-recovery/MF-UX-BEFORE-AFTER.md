# MF-UX-BEFORE-AFTER

Screenshots: `C:\Projects\MF-PRODUCT-RECOVERY-001\screenshots\` (kept outside the repo; ~10 MB). "Before" = production metaforge.gg (`e7e38e6`), read-only page loads. "After" = local dev server on this branch. Both captured in **headless Microsoft Edge driven over the DevTools protocol** (`C:\Projects\MF-PRODUCT-RECOVERY-001\harness\`), because Claude in Chrome was not connected and the built-in browser pane is excluded by owner rule. This is a real Chromium engine, but not a human session in a headed browser.

## The 10-second test

| Question | Before | After |
|---|---|---|
| What is MetaForge? | "Understand your Magic deck. Build with confidence." + "DECK COACH" eyebrow: clear | Unchanged |
| Who is it for? | Implied (Commander set mark, "Pick your commander") | Lede opens "For Commander players." |
| What problem does it solve? | Building a deck with reasons | Building with reasons **and** "what [your deck] is trying to do, what is holding it back, and one change to test" |
| What can I do right now? | Begin a guided build. An existing list → small "Build from a list" link or a collapsed drawer → empty editor | Begin a guided build (still the one primary action) **or** "Already play a deck?" → Deck Check, "No account needed" |

## Analyze path

| | Before (`before-02-analyze-desktop.png`) | After (`after-01…`, `after-02…`) |
|---|---|---|
| Landing | "Empty decklist", "COACHING OFF", card back, consent banner | "Check your deck" with a one-paragraph promise, format select, decklist box, four sample decks |
| Where to paste | Inside the "Deck options" drawer (measured `pasteVisible:false`) | On the page; live "100 cards read · commander: …" hint |
| What you get | Counts (in the drawer); "Coach this deck" disabled until a commander is chosen; coaching = ghost cards to fill gaps | Coaching report: plan + quoted commander text + confidence, format check, cited weaknesses, mana, curve chart, measured before/after, own-swap tester, limits, next steps |
| Errors | Per-card issues inside the drawer | Every problem with its line number; unreadable lines explained; unknown names never guessed |
| Mobile (375 px) | — | No horizontal scroll, no control under 44 px (measured, `after-03`, `after-04`) |

## Copy changes

* Homepage lede: + "For Commander players."
* Homepage new link: "**Already play a deck?** Paste it for a free coaching report: what it is trying to do, what is holding it back, and one change to test. No account needed."
* Drawer summary: "Already have a list, or want an example?" → "Finishing a partial list, or want an example?" (so the two "already" paths don't read as duplicates).
* Mana-base tool: "Opening-hand evidence — Goldfish sample hands…" → "Color timing — For each color, find the spell that needs it soonest and check whether enough untapped sources arrive by that turn…"
* Public deck report CTA: "Analyze my deck →" → "Check my deck →".

Each string was checked against the standing copy checklist: no unexplained jargon beyond MTG basics, no absolutes, no capability that does not exist, no "AI", no "coming soon".

## Copy drafted but not shipped (owner's call)

* Homepage title tag "MTG Commander Deck Builder & Analyzer" could become "MTG Commander Deck Coach: Build or Check Your Deck". Left alone: it is pinned by SEO tests and is a search-ranking decision.
* Power-level / bracket tool pages promise "power signals" that no guest-reachable page measures. Options: build the measurement (Release 2) or soften the page copy now.
