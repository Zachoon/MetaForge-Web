# MF-DECK-COACH-003 · 8. Release readiness

> **Superseded in part by MF-DECK-COACH-004 (`928aa31`):** public report pages no longer repair stored rows on view (no Scryfall lookup, no D1 write). Stored reports are repaired only by the owner-run script; see `docs/deck-coach-004/DATABASE-REPAIR-RUNBOOK.md`.

**Branch:** `rc/mf-deck-coach-003` in `D:\Projects\MetaForge-Deck-Coach-003`.
* Built on `rc/mf-deck-coach-002`, then MF-PRODUCT-RECOVERY-001, then production `e7e38e6`.
* Local commits only, no upstream; nothing is pushed, merged or deployed.
* The commit list is in the README in this folder.

## Recommendation

**Conditional GO for a controlled deployment of Deck Check and the public-report fix**, after the owner completes B1 to B3 below. **NO-GO** for anything beyond what is built: no power score or bracket number, no prices or win rates, and full coaching for Commander only.

## Evidence for GO

* The three public concerns are root-caused and fixed, with tests (doc 1).
* Full suite: 2,868 / 2,874. The six failures are the long-standing UI-markup regexes; none is new.
* Benchmark: 427 / 427 over 32 cases, with 0 false-positive advice; the 002 engine scores 92.3%.
* Plan reads carry evidence and can be confirmed; a confirmed plan reaches every coaching path (test).
* Protected cards are never cut. When no safe cut exists, Deck Check declines to name one and offers the card to test; the list itself is never edited.
* Browser: every scripted check passes, first insight in about 2 s, mobile layout clean, 0 console errors.
* Typecheck and lint are clean, the lockfile is unchanged, React is 19.2.9, and no security regression was found.

## Blockers (owner)

| # | Blocker | Why it blocks |
|---|---|---|
| B1 | **A human click-through in a real, headed browser** (the demo checklist, doc 7) | Every browser check so far was scripted and headless |
| B2 | **Approve the public-report repair-on-view** | The first view of an old report calls Scryfall once and writes the repaired rows to D1. It only fills empty fields, but it is a production data write |
| B3 | **Decide to open a PR for 001 → 002 → 003** | Push and merge are not authorized here; the three branches are stacked |

## Pending decisions (not blockers)

* **Land-count slope.** MetaForge adds about 2 lands per point of average mana value; the cited formula adds 3.13. The band now spans no-ramp-credit, and the outside reference is shown, but the slope itself was not changed. It affects the Forge too.
* **Moxfield / Archidekt link fetching:** not built, as instructed; export help is shown instead.
* **The six stale UI tests:** rewrite them as behaviour tests once the intended Forge rail and homepage behaviour is decided.
* **`next` 16.2.6 advisory:** a separate security task.
* **Usage telemetry for Deck Check:** none exists and none was added; it needs a consent decision.
* **Mixed-strategy bands:** only the primary or confirmed plan sets bands; the second plan is named, not blended.

## Known limits (stated in the product)

* Plan signals are printed-text counts. "Creatures costing 6 or more" stands in for power.
* Table pressure lists cards; it does not detect two-card combos or assign a bracket.
* First-insight timing was measured on a local dev server, not on the production host.
* Not tested: Safari, Firefox, screen readers.

## Rollback

* Production is `e7e38e6`. Deck Check is additive.
* Behaviour changes that reach existing pages:
  * the browser classifier now counts symbol rocks as ramp (free-build, Learn)
  * the mana coach's band is wider, and "over" is rarer (workbench)
  * the power-level and bracket tool links go to `/deck-check`
  * public reports repair their type lines
* Roll back by redeploying the previous worker version. Repaired report rows stay correct either way, because only empty fields were filled.
