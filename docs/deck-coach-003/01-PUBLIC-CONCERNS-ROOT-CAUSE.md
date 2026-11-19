# MF-DECK-COACH-003 · 1. Root causes of the three public-site concerns

> **Superseded in part by MF-DECK-COACH-004 (`928aa31`):** public report pages no longer repair stored rows on view (no Scryfall lookup, no D1 write). Stored reports are repaired only by the owner-run script; see `docs/deck-coach-004/DATABASE-REPAIR-RUNBOOK.md`.

All three were reproduced against production (`e7e38e6`, read-only) and real card data, then fixed with regression tests.

## 1. "The public Baru deck shows zero lands despite containing 38"

**Reproduced.** Source: `https://metaforge.gg/decks/baru-wurmspeaker-b35d119648` (saved: `C:\Projects\MF-DECK-COACH-003\repro\baru-prod.html`).

| What production shows | Truth |
|---|---|
| "**0** Lands" | 37 Forest + Castle Garenbrig = **38** |
| All 99 cards in one "**Other**" group | Creatures, Instants, Sorceries, Artifacts, Enchantments, Lands |
| Average mana value **2.54** ("nonland cards") | **4.11** over the 62 nonland cards |

**Layers affected:** visible page, the insight numbers, and the stored data. Structured data (JSON-LD) carries no counts, so it was not wrong.

**Root cause:**
* `worker/public-deck-report.ts` groups and counts by `typeLine`.
* The stored Forge rows for this report have an empty `typeLine`; the Forge-generation publish path copied rows without one, while the saved-deck path looked types up.
* Every card therefore fell through to "Other", "Lands" counted 0, and the average divided by all 100 cards (lands as zeros).

**Fix:**
* `sanitizeRows` repairs a missing type from the bundled type index, then from the row's own `land` role tag.
* `ensureRowTypes` fills the rest from Scryfall (the worker's existing `lookupCardTypes`). The render path stores the repair once, filling empty fields only.
* A name Scryfall answers "not found" for is stored as `Unknown type`, so a public page never repeats a lookup on every view.
* Publishing now stores type lines.

**Tests:** `tests/public-report-land-count.test.mjs` (real handler, real Baru rows):
* 38 lands, a "Lands" group, Sol Ring under Artifacts, and average mana value 4.11
* the repair is stored once, and a second view makes no lookup
* an unknown name is stored once
* with Scryfall down, lands still count from their tag

## 2. "Sol Ring is classified as an artifact without being recognised as ramp"

**Reproduced, and wider than reported.** `classifyNativeCard` (`app/card-role-classification.mjs`) returned `["artifacts"]` for Sol Ring.
* It also missed ramp on Mind Stone, Thran Dynamo, Llanowar Elves and the Talismans.
* It tagged Talisman of Dominance as *interaction*.

**Layers affected:** calculations in the browser-side paths that have no card-tag database (the free-build coach behind "Analyze", Learn grounding, motif art). The Forge construction engine on the server was right, because its tag database marks real rocks as ramp. The public Baru page showed "artifacts · ramp" because its tags came from the server.

**Root cause:**
* The shared ramp regex (`ROLE_PATTERNS.ramp`) needs the word "mana" ("add one mana of…"). Sol Ring's text is "{T}: Add {C}{C}." with no word "mana".
* The interaction regex matched "deals 1 damage **to you**" (a cost on Talismans and pain lands).

**Fix:**
* A nonland that taps for mana by symbol is ramp. This applies only when no tag database is configured, so server construction is unchanged.
* "Deals N damage to you" is no longer interaction.

**Tests:** `tests/deck-coach-003-public-concerns.test.mjs`. Benchmark case `urza-browser-ramp` covers six rocks.

Found while doing this: Deck Check's own classifier read **Traverse the Outlands** as a tutor, because the land arrives in the next sentence ("…you control. Put those cards onto the battlefield"). The land-ramp pattern now allows that sentence. Case `baru-land-count`.

## 3. "The mana-base guide recommends about four fewer lands than a commonly cited Frank Karsten formula"

**Reproduced for high-curve, ramp-heavy decks; not true in general.** The "guide" is the Academy page *How Many Lands Should a Commander Deck Have?* plus the land calculator and the Deck Check / workbench mana coach.

The real Baru list (38 lands, 4.11 average mana value, 10 cheap ramp, 4 cheap draw):

| Source | Lands |
|---|---|
| Mana coach, before | **34–36**, and 38 was called "over" ("every land past the range is a spell you do not draw") |
| Same coach with no ramp credit | 38–40 |
| Tool-page calculator | 37–39 |
| Commonly cited formula, 31.42 + 3.13 × average MV − 0.28 × cheap ramp/draw | 40.4 (ramp + draw), 41.5 (ramp only) |

On an average deck (3.2 average, 10 ramp, 10 draw) MetaForge and the formula agree: 36 vs 35.8.

**The assumptions that differ:**
1. **Curve slope.** MetaForge adds about 2 lands per point of average mana value; the cited formula adds 3.13. The gap grows with the curve.
2. **Ramp credit.** MetaForge credited up to 5 lands (rocks past the third × 0.45, capped at 2, plus land ramp capped at 3). The cited formula subtracts 0.28 per cheap ramp or draw piece (about 2.8 for 10).
3. **What is counted.** Sources quote the formula with different inputs (MV ≤ 2 or ≤ 3, draw included or not). I could not find Karsten's own article; the 31.42 version appears only in secondary sources, which disagree with each other.

**Decision (not adopting the outside formula):**
* The ramp credit is a judgement: rocks die, dorks get wiped. So the band now runs from full ramp credit to none (Baru: **34–40**), and a list is "over" only past the uncredited top. Baru's 38 is now "ok".
* The report shows every input and rule behind the band, with the cited formula as a labelled outside reference ("about 42 for this list").
* The curve slope was not changed. Changing it is a product decision with Forge-wide effects; it is listed as a pending decision.

**Tests:**
* `deck-coach-003-public-concerns.test.mjs`: Baru is "ok" with band 34–40; the land-light Ghalta list is still short; 52-land Tatyova is still over.
* `mana-base-coach.test.mjs`: one assertion updated to the new band, with a comment.
* Benchmark `baru-land-count`.
