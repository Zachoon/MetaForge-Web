# Product Sprint Alpha — Track A2 Deliverable

**Honest Coach v0.2: Unmissable + Measurable**  
**Date:** 2026-08-11  
**Status:** shipped (presentation + feedback + telemetry only)  
**Brain construction:** unchanged  
**Cognition 001:** not started · research paused  

---

## 1. Onboarding flow

After a successful imported-deck analysis:

1. Workbench marks layout `imported-deck-review`.
2. Honest Coach brief is **visible on Deck (chapter 1)** and Tune (chapter 2) — fixed a progressive-results bug where coach was gated to unused `chapter-3`.
3. Coach is ordered **above** the deck manuscript so it is the visual focal point.
4. Auto-scroll lands on `#coach-brief`.
5. CTA **Show me what you found →** keeps chapter 1 and scrolls to the brief.
6. Lightweight copy: *Here's what I think you're building.* / *Here's the first thing I'd address.* / *Want to see why?*

No tutorial overlay.

---

## 2. Walkthrough (desktop + mobile/tablet)

**Desktop**

1. Import a list → land on Honest Coach header + four-beat grid.  
2. Tap confidence label → reason expands (Brain-v1 grounded).  
3. Open **Want to see why?** → Observed vs Interpretive lists.  
4. Leave Helpful / Not helpful (guest OK). Not helpful asks one follow-up reason.  

**Tablet / mobile**

- Priority grid collapses 4 → 2 → 1 columns.  
- Feedback chips wrap; tap targets stay usable.  
- Confidence summary stacks vertically under 620px.

*(Capture screenshots from the running app locally — not embedded here.)*

---

## 3. Recommendation / analysis ID contract

| ID | Format | Material |
|---|---|---|
| `analysisId` | `hca-` + 8 hex | generationId · commander · sorted packages · brain_v1 |
| `recommendationId` | `hcr-` + 8 hex | analysisId · diagnosticClass · reasonClass · cut · add |

Also carried in feedback context:

- `brainVersion` (`brain_v1`)
- `diagnosticClass` / `reasonClass`
- `confidence`
- optional `recommendationId`

No email / decklist / raw IP stored in IDs. Guest key is a day-scoped hash prefix only.

Modules: `app/honest-coach-ids.mjs`, attached via `buildHonestCoachSummary` + `enrichTabletWithHonestWhy`.

---

## 4. Guest feedback

`POST /api/coach/feedback`

- Auth optional (signed-in preferred; guests allowed).
- Taxonomy: Helpful · Not helpful · Misunderstands my plan · Wrong for my budget/power level · Other.
- Rate limit: **12 / hour / guest bucket**.
- Requires valid `analysisId`; optional `recommendationId`.
- Clear 201 / 400 / 429 responses.
- Does not expose founder or privileged account APIs.

Existing `POST /api/account/feedback` remains auth-required for founder/general feedback.

---

## 5. Confidence explanations

| Band | Example reason |
|---|---|
| High | Commander, package structure, and card roles point to the same primary plan. |
| Moderate | More than one package direction, or plan readable but slots need playtesting. |
| Limited | Competing plans / thin evidence / cohesion contested / many weak slots. |

Hover/tap: confidence is a `<details>` drill-down (`coach_confidence_opened`).

---

## 6. Feedback reason taxonomy (Not helpful)

Wrong plan · Wrong card · Missed synergy · Budget issue · Power-level mismatch · Explanation unclear · Other  

One click + optional comment. Stored as `context.notHelpfulReason`.

---

## 7. Telemetry (consent-gated)

Whitelisted events:

- `coach_brief_viewed`
- `coach_why_opened`
- `coach_recommendation_viewed`
- `coach_feedback_submitted`
- `coach_confidence_opened`

Minimal properties (format / option / confidence band). No decklists.

---

## 8. Alpha Coach metrics report shape

`npm run report:alpha-coach` → `tests/alpha-coach/out/alpha-coach-report.{json,md}`

Fields: analyses completed, brief view rate, why open rate, helpful/not-helpful ratio, wrong-plan count, confidence distribution, guest vs signed-in feedback.

Fill from `launch_events` + `founder_feedback` once alpha traffic exists.

---

## 9. Tests

```bash
npm run validate:honest-coach-v0
npm run validate:honest-coach-v0.2
npm run report:alpha-coach
```

Coverage includes IDs, guest validation, confidence reasons, observed/inferred, CSS/route wiring, metrics shape. Telemetry whitelist asserted in launch-readiness (requires consent path; does not touch Brain).

---

## 10. Known UX gaps

- Auto-scroll may compete with other post-forge scroll targets on slow devices.
- Guest rate-limit depends on D1 `created_at` availability; fails open to count 0 if query errors (still validates payload).
- Founder dashboard does not yet render Alpha Coach metrics live (shape only).
- Tablet “accept” telemetry named `coach_recommendation_viewed` (acceptance proxy).
- Structural systems still empty until `/api/forge/structural-analyze` returns.

---

## 11. Recommended Track A3 (product only)

**Shipped as Trust Calibration** — see [PRODUCT_SPRINT_ALPHA_A3.md](PRODUCT_SPRINT_ALPHA_A3.md).

Drive priorities from real alpha feedback clusters. Academy investigates only when evidence earns a question. Brain waits.

**Do not** start Cognition 001, Mentor product, or Brain construction changes without explicit authorization.
