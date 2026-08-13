# MetaForge Academy — 90-Day Strategic Intelligence (Phase 1 Live)

**Generated from:** live TopDeck observation `2026-08-11T00:58:35.360Z`  
**Provenance:** Synthetic Fixtures **NOT USED** · Corpus mode **live** · Brain changes **0**  
**Window:** 90 days · max 75 events · ≤24 decks/event · ≥16 players  
**Chunks:** Days 1–30 ✓ / 31–60 ✓ / 61–90 ✓  

This paper analyzes real tournament evidence only. Fixture-store residue (66 principles whose supporting events are exclusively `fixture-*`) is treated as prior belief, not live teaching.

---

## Executive summary (5 minutes)

| Metric | Value |
|---|---|
| Events observed | **44** |
| Decks observed | **359** |
| Unique commanders | **118** |
| New research observations | **289** (75 deduped prior) |
| Principles in registry | **133** (56 live-shaped · 66 fixture-only residue) |
| Newly replicated Level-A hypotheses | **2** |
| Contradicted / mixed structure principles | **6 contradicted · 5 mixed** |
| Promotable research candidates (inert) | **49** status rows (many fixture-contaminated) |
| Brain changes | **0** |

| Headline | Finding |
|---|---|
| Biggest surprise | In controlled Kinnan Level-A, **converters repeatedly show less `curveLow`** than lower placers (3 events, conf 0.9) — quantity-of-cheap-cards is not the winning signature. |
| Strongest new live principle | **Strategic sequence coverage** as a construction-relevant dependency (Brain only stores sequence stages as annotations). Caveat: templates fire very broadly. |
| Most contradicted principle | **Raw interaction density distinguishes converters** in Rog/Silas — **contradicted** across live Level-A (direction flips). |
| Highest-confidence blind spot | Brain lacks **construction preference for covered strategic sequences** (and lacks topology-metric construction surfaces). |
| Marginal information gain | **MEDIUM** discovery / **LOW** controlled replication |
| Next research question | Does **meaningful / plan-connected interaction topology** stably beat raw interaction density across more independent partner Level-A cohorts? |

**Gate verdict:** Brain v2 experiment **not yet earned for implementation**. Strongest research thread is topology-over-density (Exp002-shaped). Only cross-event replicated Level-A hyps are Kinnan-local.

---

## 1. Top 10 live strategic principles

Ranked by live replication + confidence + controlled evidence — **not** deck frequency. Fixture-only Pearl-Ear promotables excluded.

| # | Principle ID | Statement | Status | Conf | Events | Decks | Families / scope | Brain class |
|---|---|---|---|---|---|---|---|---|
| 1 | `sp:sequence::gy_fill_reanimate_protect::signal::cross_family` | Graveyard plans need fill + reanimation + protection together | replicated_candidate | 0.92 | 44 | 346 | cross_family (broad fire) | brain_missing_concept (construction preference) |
| 2 | `sp:sequence::silence_combo_sequence::signal::cross_family` | Silence / path-clear belong with the combo turn | replicated_candidate | 0.92 | 44 | 291 | cross_family (broad fire) | brain_missing_concept |
| 3 | `sp:structure::curvelow::high_lesser::kinnan, bonder prodigy` | Kinnan converters show **less** curveLow than lower placers | promotable | 0.9 | 3 | 8 | Kinnan | brain_missing_concept |
| 4 | related sequence: tutor→close→stabilize (`tutor_win_protection` evidence) | Tutor / close / protection co-coverage | sequence evidence | 0.92 | 44 | 294 | cross_family | brain_missing_concept |
| 5 | `sp:structure::protection::high_lesser::kinnan, bonder prodigy` | Kinnan converters show **less** raw spell_protection quantity | promotable | 0.835 | 2 | 5 | Kinnan | brain_underweights |
| 6 | topology: meaningfulEdgeDensity (partner Level-A pattern) | Converters often win on **edge quality**, not interaction count | candidate pattern | ~0.6–0.79 | multi single-event | partner shells | brain_missing_concept (topology metrics) |
| 7 | topology: lower interactionRedundancy among converters (several partner events) | Successful lists are less “redundant interaction pile” | candidate | ~0.79 | multi | Rog/Silas, Rog/Thrasios, Dargo/Tymna | brain_missing_concept |
| 8 | contextual: Flusterstorm job shift | Same card = path-clear vs payoff-adjacent by shell | observation | — | 239 decks | many | brain_missing_concept (contextual function) |
| 9 | setup→convert→close sequence coverage | Structural chain coverage ubiquitous in tournament lists | sequence evidence | 0.92 | 44 | 357 | cross_family | brain_missing_concept |
| 10 | substitution: Swan Song ↔ Snap / Chain of Vapor ↔ Miscast (Kinnan) | Same strategic job, different cards | substitution_candidate | 0.88 | 1 each | Kinnan | brain_missing_concept (beyond budget swaps) |

**Converters / repeated converters:** corpus has 146 repeated converters, 38 single-event converters, 175 participants. Sequence principles are not yet converter-enriched with a sharp delta (nearly all lists match templates — see caveats).

**Contradictions on #1–#2:** none recorded in registry; risk is **over-firing**, not contradiction.

---

## 2. What was actually new?

### New live knowledge
- First trustworthy live corpus (NOT_USED fixtures).
- **2 replicated Level-A hypotheses**, both Kinnan: `curveLow` high_lesser; `spell_protection` high_lesser.
- Live topology Level-A across partner shells (Rog/Silas, Rog/Thrasios, Dargo/Tymna, Thrasios/Tymna, Kediss/Malcolm).
- 83 context-dependent cards; 60 substitution candidates; 5 structural sequences with 41–44 event coverage.
- 289 new store rows (principles/deltas/cohorts).

### Fixture hypotheses confirmed by live?
- **Mostly no.** 66 registry principles remain **fixture-only** (Pearl-Ear aura fixture supporting events). They did **not** reappear as live supporting event IDs.
- Fixture “connected interaction beats raw count” **did not transfer cleanly** — live Rog/Silas interaction principle is **contradicted**; Kinnan interaction is **mixed**.

### Registry motion (this run)
| Motion | Notes |
|---|---|
| First observed live | Sequence cross-family rows with 44-event histories timestamped this run; Kinnan structure principles; partner topology candidates |
| Candidate → replicated | Level-A hyp status: **2** reached `replicated` (`curveLow`, `spell_protection` on Kinnan) |
| Confidence up | Kinnan curveLow / protection minted at 0.9 / 0.835 on live merge |
| Confidence down / mixed | Kinnan interaction, tutors, curveHigh → mixed ~0.40 |
| Contradicted by live | Rog/Silas interaction density; several Rog/Silas & Kinnan spell/curve signals |
| Fixture failed to survive | Pearl-Ear fixture promotables lack live supporting events |

---

## 3. Biggest surprise

**Kinnan converters repeatedly run lower `curveLow` than table peers** (3 independent events: Goblin Con Euros Qualifier, Huddersfield June, Asgard Monthly; confidence 0.9; classification `brain_missing_concept`).

Why surprising:
- Brain v1 and common “cEDH wants the lowest curve” folklore predict the opposite quantity signal.
- Fixture Pearl-Ear evidence previously rewarded *more* curveLow among converters.
- Parallel surprise: raw **interactionDensity** is unstable (Kinnan mixed; Rog/Silas contradicted) while **topology** metrics (meaningfulEdgeDensity, redundancy, isolation) often move with conversion even when density does not.

**Do not Brain-change.** Observe whether “less low-curve count” is actually “more expensive engines / rock solid mana” under better semantic decomposition.

---

## 4. Interaction topology & Exp001 autopsy

### Does the old Kraum/Tymna interaction finding replicate?
- Dedicated `kraumTymnaFocus` array: **empty** in this artifact.
- Closest live shells:
  - **Thrasios/Tymna**: single-event lead, interactionDensity **+214** (high_greater) — **not replicated**.
  - **Dargo/Tymna**: single-event, interactionDensity **−42** (converter lower) while topology shows **higher meaningfulEdgeDensity**, **higher meanStrategicDegree**, **higher winSequenceProtectionCoverage**, **lower isolation**, **higher multifunction**.
  - **Rog/Silas**: interactionDensity **contradicted** across events (direction flips).

### What appears to matter instead
Across partner Level-A rows, converters more often separate on:
1. **meaningfulEdgeDensity** (connectivity quality)
2. **interactionRedundancy** (often lower for converters)
3. **planConnected vs isolated** ratios (mixed but informative)
4. **protection coverage of win sequence** (Dargo/Tymna)
5. **not** stable raw interactionDensity / mana-efficiency / diversity alone

### Why Exp001’s coefficient approach failed
Exp001 treated interaction as a **scalable quantity**. Live Level-A shows that quantity **flips sign** across events and commanders, while **how interaction attaches to the plan** (edges, redundancy, isolation) is the coherent story. FI v1.3 finally names that gap: **topology > coefficient**.

---

## 5. Repeated-converter signatures

| Metric | Repeated converter (n=146) | Single-event converter (n=38) | Participant (n=175) |
|---|---|---|---|
| Plan-connected ratio | 0.618 | 0.631 | 0.615 |
| Isolated interactive ratio | **0.416** | 0.474 | 0.470 |
| Multifunction ratio | **0.221** | 0.188 | 0.198 |
| Meaningful edge density | 26.2 | **30.1** | 26.7 |
| Commander protection | **0.863** | 0.816 | 0.811 |
| Engine protection | **0.788** | 0.732 | 0.748 |

**Reading:** Repeated converters are not the densest graphs — single-event converters are “louder” on edges but **more isolated**. Repeat success skews toward **lower isolation**, **slightly higher multifunction**, and **higher protection coverage**. Weak-slot / package-efficiency deltas were not strong enough in this artifact to claim without overreach.

---

## 6. Strategic sequences (live)

| Sequence | Decks | Events | Elite tag | Implies play order? | Brain today |
|---|---|---|---|---|---|
| setup → convert → close | 357 | 44 | common_tournament | false | annotations only |
| gy fill → recover → stabilize | 346 | 44 | common_tournament | false | annotations only |
| tutor → close → stabilize | 294 | 44 | common_tournament | false | annotations only |
| silence/path-clear → close | 291 | 44 | common_tournament | false | annotations only |
| mana → commander → payoff | 257 | 41 | common_tournament | false | annotations only |

**Caveat:** Coverage is near-universal — treat as “tournament lists almost always have these stage tags,” not as a sharp converter discriminator yet. Still important: Brain has **no construction preference** for covering the chain.

---

## 7. Contextual card function

Strongest live examples (same card, different jobs):

1. **Flusterstorm** (239 decks): usually `path_clear_for_win` in Ral / Esika / Ishai-Rog shells; shifts toward `payoff_for` in Thrasios/Tymna and Kraum/Tymna contexts.
2. **Roaming Throne** (25): `engine_protection` in Magda token shells vs `combo_protection` in Etali / Najeela / Winota-shaped lists.
3. **Colossal Skyturtle** (21): `combo_protection` + disruption in Kinnan; `engine_protection` in Sisay; `plan_preserving_disruption` in Rog/Thrasios.
4. **Archdruid's Charm** (18): `plan_preserving_disruption` vs `tutor_for_plan_piece` vs `engine_enabler` by shell.

**Why it matters:** Card-by-card Brain reasoning that assigns one global role will mis-score elite lists. Future experiments must be **context-conditioned**, not staple tables.

---

## 8. Substitution evidence

Highest-confidence pairs (xor≈1, conf 0.88) are mostly **single-event** — report cautiously.

More interesting strategic-footprint pairs in Kinnan:
- **Mana Vault ↔ Sylvan Caryatid** — explosive artifact mana vs resilient dork mana (same “power the commander” job).
- **Swan Song ↔ Snap** / **Chain of Vapor ↔ Miscast** — protection/tempo interaction seats filled differently.
- Ral shell: **Grapeshot / Lightning Bolt / Tibalt's Trickery ↔ Volcanic Spite** — burn/finish seats.

Brain today: budget/power substitution audits only — **missing strategic footprint clusters**.

---

## 9. Blind-spot queue (ranked)

| Rank | Kind | ID / theme | Events | Sample | Brain understands | Appears absent |
|---|---|---|---|---|---|---|
| 1 | sequence | covered strategic sequences | 44 | 257–357 | stage annotations | construction preference |
| 2 | topology | meaningfulEdgeDensity / isolation / redundancy metrics | multi Level-A | partner cohorts | interaction density floors | topology-metric policy |
| 3 | semantic / contextual | card function shifts (Flusterstorm et al.) | many | 83 cards | static roles | context-conditioned roles |
| 4 | substitution | footprint clusters (Vault↔Caryatid) | 1–few | small | budget swaps | strategic substitution graph |
| 5 | package | package candidates in discovery | — | 5 | package cores | package-efficiency construction |

---

## 10. Research saturation / marginal evidence

### Chunk ingest (TopDeck raw before maxEvents cap)
| Chunk | Raw tournaments returned | Status |
|---|---|---|
| Days 1–30 | 486 | ✓ |
| Days 31–60 | 493 | ✓ |
| Days 61–90 | 474 | ✓ |

Analyzed set is capped at **75 events → 44 with usable decklists** after contrast sampling — not a clean per-chunk Academy split. Treat chunk table as **ingest health**, not independent principle factories.

### Controlled learning yield
| Signal | Per 44 events | Per 100 events (extrapolated) |
|---|---|---|
| Replicated Level-A hyps | 2 | ~4.5 |
| Discovery candidates | 80 | high |
| Principles minted (registry) | many | high noise incl. fixture residue |

**Marginal information gain: MEDIUM** overall — **HIGH** for candidate generation, **LOW** for replicated controlled truths.

**Another 90 days of the same TopDeck source alone:** likely more candidates and modest replication, but **flattening on controlled lessons**. Prefer **Spicerack credentials + schema fix for EDHTop16** (diversity) over simply ingesting more TopDeck.

KPI watch: **replicated principles per 100 tournaments ≈ 4.5** on this cut — early, not saturated, but not yet “keep mining the same shaft.”

---

## 11. Principles / hypotheses that failed

Live weakened or contradicted:
- `sp:structure::interaction::high_greater::rograkh...silas` — **contradicted**
- `sp:structure::interaction::high_lesser::kinnan` — **mixed**
- Rog/Silas `curveLow` high_greater — **contradicted**
- Kinnan `spells`, `spell_other` — **contradicted**
- Multiple Rog/Silas tutor / commanderConnectedCount — **mixed**
- Fixture Pearl-Ear “more curveLow / more interaction among converters” — **no live supporting events**

These failures are the point: raw quantity heuristics do not survive elite Level-A.

---

## 12. Brain v2 research backlog (not implementation)

| Rank | Candidate | Principle / hyp IDs | Evidence | Replication | Transfer | Brain class | Confounds | Next experiment |
|---|---|---|---|---|---|---|---|---|
| 1 | Prefer plan-connected / meaningful interaction topology over raw interaction density | topology metrics + Exp002 doc recommendation; partner Level-A | multi single-event, coherent direction vs density flips | not yet multi-event stable | partner-family suggestive | brain_missing_concept | small high/low n; semantic enrichment | Design Validation Harness Exp002 measuring topology metrics — **do not implement weights yet** |
| 2 | Do not treat curveLow quantity as universal converter signal | `psh:kinnan...curveLow` / `sp:structure::curvelow::high_lesser::kinnan...` | 3 events, conf 0.9 | replicated within Kinnan | commander_specific | brain_missing_concept | Kinnan-only; may be mana-rock mix artifact | Holdout more Kinnan events; test semantic “curve” decomposition |
| 3 | Protection quantity ≠ protection that covers the win | `psh:kinnan...protection` | 2 events | replicated narrow | commander_specific | brain_underweights | small n | Contrast protection coverage metrics vs role counts |
| 4 | Construction preference for covered sequences | sequence principles 1–2,4,9 | broad 44-event coverage | “replicated” but over-fired | cross_family claim weak | brain_missing_concept | template over-match | Tighten sequence detectors; require converter enrichment delta |
| 5 | Context-conditioned card function | Flusterstorm / Throne / Skyturtle | large descriptive n | observational | cross-shell | brain_missing_concept | labeling noise | Freeze ontology; measure prediction lift offline |

### Single strongest principle for a future Brain v2 experiment?

**Not yet earned for implementation.**

Closest earned *research* target: **#1 topology-over-density (Exp002-shaped)**.  
Closest gate-eligible *replicated* hyp: **Kinnan curveLow high_lesser** — too commander-local and too easy to mis-implement as “raise curve” to promote now.

**Recommendation:** keep Brain frozen; design Exp002 harness metrics around meaningfulEdgeDensity / isolation / plan-connected ratios; gather more independent partner Level-A cohorts (and Spicerack) before any weight change.

---

## North star answer

Elite players taught MetaForge that **winning structure is not “more interaction” or “more cheap cards.”**  
It is **how pieces attach**: covered sequences, meaningful edges, less dead isolation, protection that actually covers the plan, and cards whose job changes by shell.

MetaForge could not learn that by counting staples or by reading Brain v1’s density-first rules.  
It learned it by watching 359 real tournament decks disagree with those rules — and sometimes disagree with MetaForge’s own fixture stories.

Brain changes: **0**.  
Listening continues.
