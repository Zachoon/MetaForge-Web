# Product Sprint Alpha — Track A1 Deliverable

**Honest Coach v0: Surface Brain v1 reasoning**  
**Date:** 2026-08-11  
**Status:** vertical slice shipped (presentation only)  
**Brain construction:** unchanged  
**Cognition 001:** not started  

---

## 1. User journey

1. Paste / import a deck (or complete a forge)  
2. Land in workbench with **Honest Coach · Brain v1** brief  
3. Read four beats: what the deck is · what looks strong · what to fix first · why  
4. Optionally expand strengths/weaknesses/packages  
5. Scroll to experiment tablets → **Why this change** grounded in slot justification + existing tablet evidence  
6. Leave alpha feedback on the analysis and/or a recommendation  

---

## 2. Walkthrough

Open the workbench after an import. The Coach’s Brief is now Honest Coach v0 (priority grid + confidence + feedback). Tablets show a **Why this change** field before the older evidence rows.

(Screenshots: capture locally in the running app — not embedded here.)

---

## 3. Reasoning fields used

| UI statement | Brain v1 / production fields |
|---|---|
| What I think your deck is | `strategicIntent.packages`, `strategicIntent.strategy`, `strategicPlan` / `activePlan`, commanders |
| What looks strong | package labels, `evaluation.cohesion`, `evaluation.roleCoverage`, structural `strongestSystem` |
| What to fix first | `slotJustificationLedger.critique` (weak / redundant / over-supported / under-anchored / raw power), structural `weakestSystem` |
| Why | first weakness line from critique / cohesion gate reason |
| Confidence | cohesion + weaklyJustified count + package count + `strategicCohesionGate.ok` → High / Moderate / Limited |
| Why this change (tablet) | cut slot flags from `slotJustificationLedger`, tablet benefit/tradeoff/pressure (no “higher score”) |
| Review focus aside | existing `reviewFocusResult` |

Forbidden in production UI: Strategic Coverage, Capability, Seat, Decision Pattern, Strategic Cognition, Mentor concepts.

---

## 4–5. Example language

**Diagnostic**

> I see competing package directions: Aura package · Tokens package.  
> Detected package support: Aura package, Tokens package.  
> 1 card looks weakly justified for the plan (including Filler Charm).  
> I would look at Filler Charm first.

**Recommendation why**

> Filler Charm is weakly connected to the commander and main packages, so it is a fair cut candidate. Adding Reliable Draw is meant to cover more of the deck's important jobs and tighten the plan.

---

## 6. Confidence behavior

- **High** — cohesion ≥ 70, ≤2 weakly justified, ≥1 package, gate ok  
- **Moderate** — cohesion ≥ 45  
- **Limited** — otherwise, or gate failed / many weak slots  

No fake “92.7%” precision.

---

## 7. Feedback capture

- Analysis-level buttons + optional note → `POST /api/account/feedback`  
- Tablet-level Helpful / Not helpful / Misreads my plan  
- Context includes: surface `honest-coach-v0`, commander, inferred packages, brainVersion `brain_v1`, recommendation cut/add, confidence  
- Requires auth (401 → “Sign in to save…”)  

---

## 8. Tests

```bash
npm run validate:honest-coach-v0
```

Maps intent/weak slots → language, blocks research leak / “higher score”, feedback option safety.

---

## 9. Known gaps

- Import path may still have thinner `selfEvaluation` / constructionTrace than native forge  
- Tablet “why” still leans on existing benefit copy when ledger lacks the cut card  
- Feedback requires signed-in account  
- No full mobile visual QA pass in this deliverable  
- Structural systems may be empty until `/api/forge/structural-analyze` finishes  

---

## 10. Next Product Sprint Alpha increment

1. Polish imported-deck onboarding so the Honest Coach brief is unavoidable  
2. Tie feedback to `recommendationRecord` ids when present  
3. Guest-safe local feedback buffer if auth is the blocker  
4. Only after alpha can *feel* Brain v1: optionally authorize Cognition 001 as a **≤20%** sidecar  

**Do not** start Cognition 001, Mentor product, or Brain changes without authorization.
