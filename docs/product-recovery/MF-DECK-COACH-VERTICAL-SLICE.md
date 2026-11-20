# MF-DECK-COACH-VERTICAL-SLICE — Deck Check

**Route:** `/deck-check` (public, no account, no Turnstile, no server call to MetaForge).
**Player story:** "I paste the deck I play. MetaForge tells me what it is trying to do, whether it is legal, what is holding it back with the card text behind each point, and lets me test a change and see what it really moves."

## Architecture

```
paste ──► parseDecklist (app/deck-check-parse.mjs)             pure, line-level diagnostics
            │ entries, commanderNames, problems, ignored, notes
            ▼
       fetchCardFacts (app/deck-check-facts.mjs) ──► Scryfall /cards/collection (75 per batch, 100 ms apart)
            │ printed text, type, cost, colour identity, legalities; not_found list
            ▼
       buildDeckCheckReport (app/deck-check-report.mjs)        pure
            ├─ checkDeckStructure      size, copies (printed exceptions), identity, pairs, Scryfall legality
            ├─ buildCurveRoleCoaching  existing engine: plan read, roles, curve, rankPlanWeaknesses, swaps
            ├─ buildManaBaseCoaching   existing engine: land range, colour timing
            └─ compareSwap ×3          replays cut/add through both engines → measured deltas
       comparePlayerSwap              same replay for a player-chosen cut/add, after rule checks
            ▼
       DeckCheck UI (app/deck-check/deck-check-client.tsx) + page.tsx + deck-check.css
```

Why this shape:

* **Reuse, not rewrite.** The coaching voice and logic are the existing tested engines. The only engine change is a read-only export, `swapCatalogCard(name)`, so a suggested add can be replayed without a second lookup.
* **No new backend surface.** Card data comes from Scryfall in the browser, exactly as the free decklist already does. No new endpoint, no auth or rate-limit change, nothing stored server-side. The list stays in `sessionStorage` (per-tab convenience, wrapped in try/catch).
* **Pure core.** Parser, facts normaliser, report and comparison are synchronous pure functions (the fetch takes an injectable `fetchImpl`), so every workflow is unit-tested offline against snapshotted Scryfall facts.

## Coverage against the brief

| Item | What was built | Where |
|---|---|---|
| A. Reliable input with understandable errors | Accepts Moxfield / Archidekt / Arena / MTGO / plain text: `1 X`, `1x X`, `X` (read as 1, noted), set codes `(CMM) 400a`, `[CMM]`, `*F*`, `[Tag]`, `^tag^`, `#tag`, `SB:`, section headings (Commander/Deck/Sideboard/Maybeboard/Companion/About), group headings `Creatures (31)`, comments; trailing-commander export; merges repeated lines. Every set-aside or unreadable line is listed with its line number and reason. Quantity 0 / >250 / name-less / overlong lines are explained. | `deck-check-parse.mjs` |
| B. Format-aware validation & structure | Commander: exactly 100, singleton (basic lands, "any number", "up to seven/nine" honoured), colour identity, commander eligibility, pair abilities, Scryfall bans. Standard/Pioneer/Modern/Legacy/Vintage(restricted)/Pauper: ≥60, sideboard ≤15, 4-of across main+side, Scryfall legality. Unknown names reported, never guessed. | `checkDeckStructure` |
| C. Readable coaching with reasons & confidence | Plan sentence + quoted commander text + confidence level/reason; "what it already does well" (roles in range with example cards); "What to fix first" with cited, quoted cards; mana and curve sections; fixed limits section. | `buildDeckCheckReport`, UI |
| D. Actionable swaps with rationale & constraints | Up to 3 replayable catalog swaps (cut must be in the list, add must be identity-legal and absent); when none fits, the engine's own "no color-legal swap I can vouch for" note. Player's own swap: identity, Scryfall legality, duplicates, same-card checks with plain refusals. | `replayableSwaps`, `comparePlayerSwap`, `proposedAddIssue` |
| E. Before/after comparison | Same engines on the after-list: per-role before/after/status/range, average mana value, lands; verdict that distinguishes "closes the gap", "moves it but still short by N", "no count moves"; trade-offs (roles or lands that drop); weaknesses resolved/introduced; copyable updated list (round-trips through the parser, still 100 cards). | `compareSwap` |
| F. Loading, error, empty, success | Disabled submit when empty; live status "Read N of M cards…"; Scryfall outage → retryable error with list preserved; unparseable input → non-retryable explanation; needs-commander picker; 60-card "structure-only" report; success focuses the report heading. | UI |
| G. Mobile & accessibility | Labelled controls, `aria-live` status/hint, `role="alert"` errors, focus moved to the report heading, tables with caption/`th scope`, status words not colour-only, 44px targets (measured: none smaller), no horizontal scroll at 375px (measured), reduced-motion spinner, focus-visible outlines. | `deck-check.css`, browser run |

## Proof the coaching is specific, not generic

From the three Commander fixtures (all asserted in `tests/deck-check.test.mjs`):

| Deck | Plan read | Top weakness (quoted evidence) | Top replayable change and measured result |
|---|---|---|---|
| Ezuri, Renegade Leader (elves, needs work) | "reads as Elves", high confidence, quotes "Elf creatures you control get +3/+3…" | "Too few ways to draw extra cards — 2 real draw spells, Elves wants about 11–14", citing *Elvish Clancaller* ("Search your library for a card named Elvish Clancaller…") and *Krosan Tusker* as *not* draw | Cut Elvish Clancaller → add Beast Whisperer: Card advantage 2 → 3, "8 short of the range: one swap starts the fix, it does not finish it" |
| Talrand, Sky Summoner (spells, solid) | "reads as Spellslinger" | Only one: ramp 6 (wants 9–13) | No vetted swap fits (every blue-legal catalog rock is already in the list), stated honestly; player test Accumulated Knowledge → Coldsteel Heart moves ramp 6 → 7 |
| Krenko, Mob Boss (broken list) | "reads as Goblins" | 6 construction errors (misspelling, size 43, 2× Lightning Bolt, off-colour Swords to Plowshares, banned Dockside Extortionist) + draw/ramp/wipes gaps | Cut Siege-Gang Commander → add Blasphemous Act: board wipes 0 → 1, inside 1–2; trade-off "Interaction drops from 6 to 5 (still within 3–5)" |

No cited card is shared between the Ezuri and Talrand reports; the weakness sets and curve summaries differ (test "coaching is specific to each deck").

## Known limits of the slice (stated on the page)

* Plan/weakness/swap coaching is Commander-only; 60-card formats get legality, copy limits, size, curve and colour needs.
* Swap candidates come from the coach's small vetted catalog (~40 cards). For a well-built deck this often yields "no swap I can vouch for"; the player-swap form covers the rest.
* No prices, no playgroup context, no power level/bracket estimate, no goldfish.
* Role ranges are MetaForge's starting points per plan (`curve-role-coach.mjs:roleRanges`), not rules.

## Owner demo (local preview)

See `README.md` in this folder.
