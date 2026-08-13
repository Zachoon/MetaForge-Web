# Product Sprint Alpha — Track A4 Deliverable

**Deck Understanding Reliability**  
**Date:** 2026-08-11 (updated: printed / flavor identity)  
**Status:** shipped (product reliability)  
**Named by:** first founder Tony Stark alpha run  
**Brain construction:** unchanged  
**Academy / A5:** not proposed  

---

## Principle locked

> **Unknown is not absent.**  
> **Alternate identity is not unknown.**

Added to [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md).

---

## 1. Root cause (founder unresolved cards)

| Submitted name | Class | Oracle / resolution |
|---|---|---|
| Black Panther's Claws | Universes Beyond **`flavor_name`** | **Hammer of Nazahn** (`flavor_name_alias`) |
| Skybreaker, Sword of Bashenga | Universes Beyond **`flavor_name`** | **Sword of the Animist** (`flavor_name_alias`) |
| Megatron | Secret Lair / Transformers **`flavor_name`** | **Blightsteel Colossus** (`flavor_name_alias`) — not the Transformers legendary “Megatron, Tyrant” |

**Not** special-cased Marvel/Transformers names. Fix class: separate printed/display identity from Oracle gameplay identity (`app/card-identity.mjs`).

---

## 1b. Required identity model

| Field | Meaning |
|---|---|
| `inputName` | What the player typed/imported |
| `displayName` | Printed/presented name where available |
| `canonicalName` | Oracle/gameplay card identity for rules reasoning |
| `printingId` | Exact printing id when resolved |
| `oracleId` | Stable canonical gameplay identity |
| `aliasNames` | Alternate printed/flavor/reskin keys |
| `resolutionKind` | e.g. `flavor_name_alias`, `exact_canonical`, `face_name` |

- **Brain / legality / graph / singleton** → `canonicalName` / `oracleId`  
- **Player-facing deck list** → `displayName` (e.g. still shows `Megatron`)  
- Deep Forge may show `Megatron — Blightsteel Colossus`

### Resolution cascade

1. Exact canonical name  
2. Exact printing/printed name  
3. Flavor/reskin name  
4. Known alternate-face / DFC identity  
5. Normalized punctuation / Unicode variant  
6. Authoritative upstream search (then reject fuzzy near-misses that lack an authoritative name/flavor/face match)

Alias success ⇒ **verified**, never unresolved.  
Singleton/dedupe operates on **oracle identity**, not display name.

---

## 2. Verification before / after

| Moment | Expected |
|---|---|
| Before flavor-identity fix | Founder holes (`Megatron`, claws, Skybreaker) → `unresolved` → dropped from analysis |
| After | Same inputs → `flavor_name_alias` → canonical Oracle rules data; completeness ↑ |

Unit regressions: `npm run validate:card-identity-a4`.

---

## 3. Completeness contract

`deckUnderstanding` (`app/deck-understanding.mjs` v1.1):

- cards submitted / resolved / unresolved / illegal  
- commander resolved  
- % structurally understood  
- unresolved list + reason codes  
- `resolutions[]` identity records  
- player summary near Honest Coach (includes alias → canonical lines when present)  

Returned from `/api/forge/generate` (imported mode).

---

## 4. Coach reliability gate

| State | Rule (conservative) | Behavior |
|---|---|---|
| `complete` | 100% verified | Normal Honest Coach |
| `mostly_complete` | &lt;100% but ≥95% | Coach + uncertainty callouts |
| `limited` | ≥85% and &lt;95% (or ≥3 holes) | Plan discussable; every structural claim notes incompleteness |
| `insufficient` | &lt;85% or no commander | **No definitive structural coaching** |

---

## 5. Strategy vs system UI

Separate claims:

- **What I think you're building** (strategy confidence)  
- **Repeatable systems** (`verified` vs `not_fully_verified`)  

Never “no engine exists” when evidence is incomplete.

---

## 6. Deep Forge language

Empty states now distinguish complete vs currently-resolved card set (`deepForgeEmptyCopy`). Systems chamber no longer says “machinery has not connected yet” under incomplete evidence.

---

## 7. Narrative Integrity + aliases

Integrity accepts display aliases while validating against canonical identity (`deckNameSetWithIdentities` + `resolutions` on the coach gate). Foreign commanders/systems still fail closed.

---

## 8. Screenshots

Re-import the founder Tony Stark list locally after deploy; capture Honest Coach completeness + strategy/system split and Systems chamber.

---

## 9. Tests

```bash
npm run validate:deck-understanding-a4
npm run validate:card-identity-a4
npm run validate:narrative-integrity
npm run validate:honest-coach-v0
```

---

## 10. Remaining unresolved-data classes

- True `ambiguous_name` collisions (no unique authoritative map)  
- Upstream 5xx / rate-limit (`upstream_lookup_failure`)  
- Format-illegal cards (still excluded; reported separately)  
- Color-identity mismatches (not yet a resolver concern; separate future product signal)  
- Arbitrary nicknames (must stay unresolved — no guesswork aliases)

---

## 11. Trustworthy structural coaching?

After resolver fix + completeness gate: **yes for mostly_complete/complete lists**.  
If holes remain, coach must say so — and must not falsify “no strategy / no engine.”

Brain waits. A5 not invented.
