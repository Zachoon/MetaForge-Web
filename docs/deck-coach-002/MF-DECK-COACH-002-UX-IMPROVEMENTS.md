# MF-DECK-COACH-002 — Deck Check UX improvements

Files: `app/deck-check/deck-check-client.tsx`, `deck-check-types.ts`, `deck-check.css`, and the report fields in `app/deck-check-report.mjs`. Screenshots: `C:\Projects\MF-DECK-COACH-002\screenshots\` (scripted headless Edge, see Test Evidence).

| Area | Before (b97369e) | After (RC) |
|---|---|---|
| **First screen of the report** | Plan card, then format check, then a long weakness list; the player had to read everything to find the verdict | An **"At a glance"** card: legal or not (with link to the problems), the plan in one sentence, up to three fixes as jump links (each labelled *Strong finding* or *Heuristic*), and the first measured change |
| **Findings** | Paragraph + citations + a confidence line | Every finding answers the same six questions in a labelled list: **Detected · Why it matters · Keep in mind · Cards behind it · What to change · What it costs · How sure**. Strong findings are listed before heuristics. |
| **From finding to fix** | Manually scroll to "Try one change" and find the right tab | "See the measured change" opens the matching tab and moves focus to it. A finding with no safe cut gets "Test *card* with your own cut", which fills the Add field and focuses the Cut picker. |
| **Suggested changes** | Only cut→add pairs; when no cut was safe, nothing | Measured swaps where a safe cut exists; otherwise **"Worth testing, with a cut you choose"** with the card's printed text and a Test button. A suggested cut the format check already flagged says so ("banned … It has to leave the deck regardless"). |
| **Trust labels** | Implicit | Each section carries its basis: **Verified** (rules + Scryfall legality), **Rules-based count** (printed text), **Strong finding / Heuristic** (MetaForge's judgement), **Measured** (replayed on your list). A legend in "What this check can and can't tell you" ends with "Not checked: prices, win rates, matchups, your playgroup." |
| **Plan honesty** | "X's printed text does not name a sharp plan" even for Atraxa (counters) | "Atraxa reads as +1/+1 counters. MetaForge has no separate role bands for that plan yet…", or "MetaForge did not match Sram's printed text to one of its plans… Treat the plan-specific advice below as rough." |
| **Loading** | Spinner + text | Spinner + text + a determinate **progress bar** (cards read / total) + **Cancel** (keeps the previous report if there was one) |
| **Partial results** | "Some cards could not be read… run the check again" | Same message as an alert, with a **Read the cards again** button |
| **Keyboard: change tabs** | `aria-pressed` toggle buttons | A real `tablist`: roving tabindex, ← → ↑ ↓ Home End, `aria-selected`, `tabpanel` labelled by its tab |
| **Focus** | Report heading on load | Report heading on load (kept); change heading on "See the measured change"; Cut picker on "Test with your own cut"; findings are focus targets for the glance links |
| **Mobile (375 px)** | No overflow | No horizontal overflow (scrollWidth 375), no control under 44 px, findings collapse to one column, basis chips wrap |
| **Input formats** | Moxfield/Archidekt/Arena/plain | + **CSV exports** (`Count,Name,…` with optional Board column for commander/sideboard/maybeboard) and **trailing quantities** ("Command Tower x1", "Sol Ring 1x") |
| **Companion** | Ignored silently | Checked: must be a Companion card, inside the commander's color identity, and legal; its deck-building condition is quoted with "Deck Check does not check" |

## What a first-time user sees (the 10-second test)

1. The page header and lede say exactly what to do ("Paste a decklist…"), with four sample decks for anyone without a list.
2. After **Check my deck**, a progress bar counts the cards being read, with Cancel.
3. The report opens on **At a glance**: legal / not legal, the plan, the top fixes and the first measured change. No documentation is needed to act on it.

## Not done (owner calls)

* No usage telemetry (unchanged from the last mission: needs a consent decision).
* The power-level and bracket tool pages still point to the old analyzer entry (no power measurement exists).
* Screen-reader announcement order, Safari and Firefox were not tested (see Test Evidence).
