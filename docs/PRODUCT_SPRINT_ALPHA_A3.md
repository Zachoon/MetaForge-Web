# Product Sprint Alpha — Track A3 Deliverable

**Trust Calibration & Founder Dashboard**  
**Date:** 2026-08-11  
**Status:** shipped (product intelligence only)  
**Brain construction:** unchanged  
**Cognition 001:** not started · research paused  

---

## Intent

A3 is **not** another feature sprint.

It answers:

> Where does Brain v1 consistently misunderstand players?

Feedback changes **what we investigate**, not construction weights.

Constitution addition:

> **Users define the questions. The Academy seeks the answers.**

---

## What shipped

### Founder Trust Calibration (`/founder`)

- Top misunderstood commanders  
- Top misunderstood archetypes (package labels)  
- Most common not-helpful reasons + share  
- Disputed recommendations (recommendationId clusters)  
- Confidence vs trust (helpful % / wrong-plan % by High · Moderate · Limited)  

### Brain Confusion Map

- Most misunderstood strategies  
- Most trusted strategies  
- High-confidence / low-trust reading  
- Low-confidence / high-trust reading  
- Misunderstanding clusters (e.g. wrong-plan → Pearl-Ear → Ellivere → Light-Paws → Calix)  

### Weekly review (four questions)

1. Where does Brain earn trust?  
2. Where does Brain lose trust?  
3. What misunderstanding repeated most?  
4. Does this deserve Academy investigation?  

`brainChangeRecommended` is always **false** in this track.

### Clustering fields on feedback

Coach feedback now stores sanitized:

- `commander`
- `packageLabels` / `inferredPlan`

No decklists. No emails.

---

## Modules

| Path | Role |
|---|---|
| `app/trust-calibration.mjs` | Pure aggregations + weekly review |
| `worker/founder-dashboard.ts` | Includes `trustCalibration` on overview |
| `app/founder/page.tsx` | Trust Calibration + Confusion Map UI |
| `docs/INTELLIGENCE_CONSTITUTION.md` | Users-define-questions sentence |

---

## Tests

```bash
npm run validate:trust-calibration
npm run validate:honest-coach-v0
```

---

## Known gaps

- Fastest-improving strategies needs week-over-week history (reserved empty).  
- Archetypes are package-label proxies until Atlas vocabulary is product-safe.  
- Live founder panel fills only after alpha coach feedback arrives.  
- Account API integration tests still use built `dist/` — rebuild worker before end-to-end founder JSON asserts.

---

## Recommended Track A4

**Close the highest-trust gap discovered by real users.**

Not intuition. Not a research paper for its own sake.

When Trust Calibration shows a repeated blind spot:

1. Confirm the cluster is real (n + independence).  
2. If earned: authorize a **bounded Academy question**.  
3. Lab only if Academy produces a testable hypothesis.  
4. Harness before any Brain touch.

Until then: keep listening.
