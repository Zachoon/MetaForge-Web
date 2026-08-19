# Founder Issues — Living Scoreboard

This is the story of MetaForge maturing through **real Commander players trying to break it** — not through assumptions.

**Product identity (locked):** MetaForge is a **collaborative deck coach**.  
**Conversation contract:** [`CONVERSATION_CONTRACT.md`](./CONVERSATION_CONTRACT.md) — the lens for every new feature.

Brain construction stays frozen unless a Validation Harness report earns otherwise.  
Product / presentation / structural-understanding issues may ship surgically.

---

## Founder Trust

*Update weekly. These two closings are the maturity numbers that matter.*

| Metric | Count |
|--------|------:|
| Issues on register | **15** |
| Shipped (tests green) | **12** |
| **Live Founder Trial** | **4 scored runs** (latest: 2026-08-13 · #025 re-trial) |
| **Founder Confirmed** | **9** |
| Open / Planned | **0** |
| Watch (hypothesis only) | 0 |
| Awaiting founder confirmation | 5 (#018, #020, #022, #023, **#026**) |
| Live Founder Trial (not confirmed) | 0 |
| Needs reproduction | 0 |

**Shipped** = tests green.  
**Live Founder Trial** = a real player walks the conversation without Discord narration.  
**Founder Confirmed** = a real player re-ran the pain and said it was gone (or filed a sharper issue).  

Those are different milestones. Tests ≠ a human smiled.

Phase 1 verification: **passed** (2026-08-11).

---

## Current work

> **Era 1 active:** Strategic Evaluation v0 (construction judgment without construction mutation).  
> Stance = voice · Hypothesis = research · Evaluation = “was this list decision coherent?”  
> **Era 2 COMPLETE.** Charter: `ERA2_COMPLETE.md`.  
> Concepts · play captures · simulation witness · stance voice.  
> Continuous observation + Friday heartbeat.  
>
> #026 restricted-effect overcredit **shipped** (2026-08-14) — follow-ups 2026-08-15 (playable mana, rainbow lands, named-type lands, conditional wincons, Clue/token scope). Awaiting Live Founder Trial.

### Live Founder Trial — re-run (2026-08-11, post-surgical)

Commission: *Doubling Season Superfriends* · theme-first experience · Doubling Season as a star.

**Two failure categories (do not conflate):**

| # | Category | Issue | Solve with |
|---|----------|-------|------------|
| **1** | Forge didn’t honor the commission | **#024** Commission Contract | Parse → display → grade → narrate through Player Fantasy. **Not** Brain retunes. |
| **2** | Clickable card refs still break place | **#021** (still open) | Every reference must inspect without leaving the paragraph |

**What improved:** Coach no longer feels like engineering output. Sections are clear — “What am I looking at?” did not recur.

**What still nagged:** Asked for Doubling Season Superfriends; Coach still led with Evasion / Treasure / Engines. Those may be true mechanisms. The **protagonist** should have been planeswalkers / Doubling Season.

**Missing layer (hypothesis locked into #024):**

```text
User Commission
  → Player Fantasy     ← missing narrator filter
  → Graph
  → Coach
```

Same graph. Different narrator. Support packages exist to keep the fantasy alive — not as co-equal headlines.

**Update after re-run:** flow improved; the new frontier is **commission fulfillment** (#024), not more coach polish.

### Live Founder Trial — scored run (2026-08-11)

Commission class: Doubling Season + Superfriends / Atraxa-class. Watched conversation reactions, not only the list.

| Stage | Score | Verdict |
|-------|------:|---------|
| **1** I heard you | 8.5 | Pass with caveat — recognition not unmissable enough before commit |
| **2** Philosophies | **6.5** | Weakest — still felt “choose a build,” not “choose the experience”; single-survivor skip confirmed Jay |
| **3** The deck | 9 | Strong |
| **4** Honest Coach | 8 | Needs translation — less “Evasion Engine,” more *why this matters at the table* |
| **Deep Forge** | 9.5 | Massive improvement; next: “what this means” then “how I proved it” |

**Favorite moment:** “Your next game has one clear focus” / proving-grounds coaching — pull that concept higher.

**Biggest takeaway:** The Forge **knows more than it says**. Gap is storytelling, not intelligence.

**Mission for the surgical pass:** Every Honest Coach sentence should answer a question a Commander player would naturally ask — not merely report what the graph detected.

### Re-run watch protocol (post-surgical)

Notebook header:

> **Did the player ever stop because they were confused, or only because they were curious?**

Confused = “Wait… what does this mean?” · Curious = “Oh, tell me more.”  
Goal is not zero pauses — convert confusion into curiosity.

| Stage | Watch for (not “is it visible?”) | Pass sounds like | Note |
|-------|----------------------------------|------------------|------|
| **1** | Can I **repeat back** what MetaForge thinks I asked for *before* any deck? | ✓ Superfriends · ✓ Doubling Season · ✓ Theme over optimization — without reading a paragraph | Watch whether **Theme over optimization** inference surprises (correct or wrong = useful evidence) |
| **2** | Even with one survivor: do they understand **why this direction survived**? | “Ah, okay… that’s the kind of deck we’re building.” → Choose without wondering why there’s only one | Single philosophy is still an explanation, not a skipped stage |
| **4** | After the first coach screen, do I know **opening priorities**? | Can answer: “What should I be trying to accomplish in the first few turns?” | “Your next game has one clear focus” should be memorable |
| **Deep Forge** | Leave framing alone | Natural expand vs skip across **several** founders | No wording chase from one reaction |

**Healthy next-feedback shape (prediction):** if flow holds, complaints shift deck-specific — “I’d keep this card,” “lean harder into tokens,” “more thematic version.” That means the Conversation Contract is facilitating collaboration, not fighting the interface.

### Cadence (Era 3+)

```text
Founder Observation
  → Small Surgical Fix
  → Founder Confirmation
  → Close
  → Repeat
```

Missing on purpose: weeks of speculation.

### Status ladder

```text
Open → Planned → Shipped → Live Founder Trial → Founder Confirmed
```

**Founder Confirmed** is not a smile. It is a filled **Live Founder Trial rubric** (Understanding · Trust · Discovery · Conversation quality · False positives) plus stage checkpoints — see below.

### Live Founder Trial — Conversation Cycle (script)

**Do not ask:** “Test MetaForge.”  
**Ask:** commission exactly as a future user would — then **watch the conversation**, not only the decklist.

#### Rubric (lock before you start)

Do **not** open with “Was this good?”  
Decide in advance what you are measuring. Founder Confirmed requires **concrete observations**, not a vibe — same evidence-first discipline as the Academy.

**Printable / fillable sheet:** [`FOUNDER_TRIAL_OBSERVATION_SHEET.md`](./FOUNDER_TRIAL_OBSERVATION_SHEET.md)

| Dimension | Question | Pass looks like | Fail / note |
|-----------|----------|-----------------|-------------|
| **Understanding** | Did the coach correctly infer the deck’s *actual* plan (and the commission)? | Founder can repeat the Forge’s read of the request *and* the finished plan without Discord help | Mishears theme, leads with wrong engine as the story, or never grades fulfillment |
| **Trust** | Did every recommendation / adjustment have a convincing explanation? | “I see why” on cuts, adds, and departures from the note | Silent change, score-speak, or “just trust the list” |
| **Discovery** | Did the session surface at least one insight the founder hadn’t already considered? | Genuine “oh — I hadn’t thought of that” (even if they disagree) | Only restates what the founder already knew |
| **Conversation quality** | Did it feel like a knowledgeable coach rather than a deck generator? | Collaborative negotiation: heard → options → list → how to pilot | Feels like a dump of 99 cards + metrics |
| **False positives** | Where did the coach confidently push the *wrong* direction? | **Record every instance** (engine-as-plan, overconfident grade, wrong fantasy lead) | Unlogged confidence is worse than an honest miss |

**How to use:** fill one row of observations per dimension during/after the session (or use the observation sheet).  
**Founder Confirmed** on #020–#024 only when Understanding + Trust + Conversation quality pass, Discovery has at least one hit (or an honest “none — and that’s evidence”), and False positives are logged (zero is fine; *unexamined* is not).

#### Founder commission prompt

> Build me a Commander deck around _______. Here’s the kind of experience I want: _______.

(Jay-class: Doubling Season + Superfriends, or any clear theme + feel.)

#### Checkpoints (pass/fail by human reaction)

Use these *alongside* the rubric — stage sounds are evidence for the dimensions above, not a substitute for them.

| # | Stage | Success sounds like | Failure sounds like | Rubric tie |
|---|--------|---------------------|---------------------|------------|
| **1** | I heard you (#023/#024) | “Yeah, that’s what I meant.” | Confusion / “Did it ignore me?” | Understanding · Trust |
| **2** | Philosophies (#022) | Immediate “Oh, that’s the one.” (or clear hesitation between *two* fits) | “I don’t know what I’m picking.” | Conversation quality |
| **3** | Here’s the deck | Starts reading the list | “Wait, what changed?” without Compare details helping | Trust |
| **4** | Honest Coach (#020) | “Ohhhhh…” | “What?” | Understanding · Discovery |
| **5** | Deep Forge | Stays and inspects | Immediately leaves | Trust · False positives |

**Meta-goal:** MetaForge introduces itself. Founder completes the loop without needing Discord to explain each step.

**If trial returns:** “I wanted Theme but Performance looked more interesting…” → **then** Prioritize Theme vs Performance has a purpose.  
**Until then:** do not build the fork.

### Product narrative (complete hypothesis)

| Stage | User question |
|-------|---------------|
| **1. I heard you** | Did you understand me? |
| **2. Here are the philosophies** | What are my options? |
| **3. Here’s the deck** | What did we build? |
| **4. Here’s how to win with it** | How do I play it? |
| **Deep Forge** | How do you know? |

### Jay feedback (2026-08-11) — two issues, two layers

| Feedback | What he asked | Issue | Leverage |
|----------|---------------|-------|----------|
| **A — Build comparison** | Why does Build A differ from Build B? (confidence, not spreadsheets) | **#022** Product UX | Medium |
| **B — Superfriends intent** | I asked for Doubling Season + Superfriends; got four walkers — did it reject my idea? | **#023** Strategic / Narrative | **Higher** |

Encouraging signal: he’s not saying the Forge is random. He’s asking trust questions — “help me compare” and “explain why you didn’t follow my request.” That’s Era 3 maturity.

### Phase 1 — Founder verification ✅

#### Tony Stark

- [x] Megatron resolves (display Megatron → canonical Blightsteel)
- [x] Black Panther's Claws resolves → Hammer of Nazahn
- [x] Skybreaker, Sword of Bashenga resolves → Sword of the Animist
- [x] Coach identifies artifact strategy (not vague filler)
- [x] No “no repeatable systems” **solely** because of identity holes

#### Vorinclex

- [x] Appears under **Creatures**
- [x] Analysis still treats Saga / back face correctly where relevant
- [x] No UI regressions in deck sections

#### Deck switching (Narrative Integrity)

- [x] Tony → Isshin → Roxanne → Tony again
- [x] Coach never leaks prior commander / systems / plan narrative

#### Mobile

- [x] Preview pane usable
- [x] Commander art readable
- [x] Coach cards readable
- [x] Scrolling not clipped / fighting sticky desktop chrome

### Phase 2 — Build #018 ✅ shipped (tests)

Relationship evidence: **`oracle_explicit`**. Brain untouched.  
Implementation: `forge-interaction-graph.mjs` — `named` / `Partner with` / `Meld with` → edges + packages.  
Test: `npm run validate:interaction-graph`  
Status: awaiting founder confirmation on a Blech-class / named-ref list.

### Phase 3 — #020 Coach speaks Commander ✅ shipped (tests)

**Pilot Story** (formerly Pilot Model): Establish → Deploy → Compound → Protect → Close  
Modules: `strategic-recognition.mjs`, `pilot-model.mjs` (`buildPilotStory`)  
Wired in `honest-coach-summary.mjs` (v0.6). Brain untouched.  
Coach leads with player intent; Deep Forge can still show machine labels as evidence.  
Test: `npm run validate:founder-020`

Not “make the AI smarter.” Teach the coach to speak Commander via a **deterministic interpreter**:

```text
Oracle → Interaction Graph → Systems
  → Strategic Recognition   (what is objectively true?)
  → Pilot Model             (how would I play this tonight?)
  → Coach
```

Graph facts stay. Vocabulary and advice become human. See #020. No Brain / Academy / weights.

---

### Phase 4 — #021 Context-preserving card inspection ✅ shipped (tests)

**Floating Card Inspector** when the deck-gallery preview is off-screen (Deep Forge reading).  
Brain untouched. Presentation only.  
Module: `context-card-inspector.mjs` · wired in `page.tsx` + `testing-anvil.css`  
Test: `npm run validate:founder-021`

Same family as #020: #020 teaches the Forge to **speak** like a Commander player; #021 teaches the UI to **behave** like one expects. Both reduce friction without touching the Brain.

### Phase 5 — #023 Did I hear you? ✅ shipped (tests)

**Request Recognition** at the top of Honest Coach. Explain-only. Brain untouched.  
Module: `request-recognition.mjs` · Honest Coach v0.7  
Test: `npm run validate:founder-023`  
Principle: MetaForge never silently changes the user’s vision.  
Deferred: Prioritize Theme / Prioritize Performance fork.  
Copy rule: one-sentence Adjustment (Commander-friend brevity).

### Phase 6 — #022 Pre-Choice Coaching ✅ shipped (tests)

Confidence before commitment on the masterworks choice screen.  
**Built for players who…** · Prioritizes · Feel · Expected tradeoff → Choose.  
Scores + card diffs under **Compare details**. Brain untouched.  
Module: `strategy-build-comparison.mjs` (`buildPreChoiceCoaching`)  
Test: `npm run validate:founder-022`  
Deferred: recommendation-confidence line (separate from deck quality).

---

## How decisions get made

| Step | Meaning |
|------|---------|
| **Evidence** | A real player said or showed something |
| **Founder Issue** | Named, layered (or **Unknown pending reproduction**), filed |
| **Reproduce** | Run the exact artifact; observe failure class |
| **Classify** | Assign layer only after observation |
| **Fix** | Prefer a **class** fix over a symptom patch |
| **Verify (tests)** | → `✅ Shipped` |
| **Live Founder Trial** | → real player walks the conversation without narration |
| **Verify (founder)** | → `✅ Founder Confirmed` |

One founder = **hypothesis**. Three unrelated founders = **pattern**. Ten = **priority**.  
“Borked” + decklist ≠ diagnosis. **Stop → Reproduce → Observe → Classify → Fix.**

---

## Layer of understanding

| Layer | Question it asks | Example |
|-------|------------------|---------|
| **Identity** | Does the Forge know what card this actually is? | Marvel / flavor names |
| **Classification** | Does it organize information like a player? | Vorinclex MDFC |
| **Narrative** | Does it communicate what it understands? | Coach plan / contamination |
| **Structural** | Does it recognize objective relationships? | Explicit Oracle evidence |
| **Strategic** | Does it speak like a strategist / pilot? | **#020** · **#023** hearing · **#024** commission contract |
| **UX** | Can the player use what it knows? | **#021** (trial open) · **#022** |
| **Unknown** | Failure class not yet observed | *(empty — use until reproduced)* |

### Layer leverage

| Layer | Open / Watch | Shipped / Confirmed |
|-------|--------------|---------------------|
| Identity | 0 | 1 (#014) ✅ Confirmed |
| Classification | 0 | 1 (#017) ✅ Confirmed |
| Narrative | 0 | 2 (#013, #016) ✅ Confirmed |
| Structural | 0 | 2 (#015 confirmed, #018 shipped) |
| Strategic | 0 | 4 (#020, #023, **#024** shipped, **#026** shipped) |
| UX / Product | **1 open trial (#021)** | 2 (#019 confirmed, #022 shipped) |
| Unknown | 0 | 0 |

---

## What the scoreboard is saying (inflection)

| Era | Question | Status | What shipped / exposed |
|-----|----------|--------|------------------------|
| **1 — Correctness** | Can it even parse my deck? | ✅ Earned | Identity, flavor/printings, MDFCs, mobile, state contamination |
| **2 — Understanding** | Can it understand the deck? | ✅ Earned (Tony Stark) | Packages, loops, cohesion, commander support, graph evidence — not guessing |
| **3 — Speak like a strategist** | Can it explain itself honestly? | ✅ **Engineering complete** · Live Founder Trial | Conversation cycle #020–#024 · [`ERA3_COMPLETE.md`](./ERA3_COMPLETE.md) |
| **4 — Insight** | Can it teach an expert something? | 🟡 **Founded** (not complete) | Mentor Shadow v0 · [`ERA4_INSIGHT_FOUNDING.md`](./ERA4_INSIGHT_FOUNDING.md) |

**Era 3 is a communication era — not a smarter-engine era:**

| Issue | Question |
|-------|----------|
| **#020** | Can it explain the strategy like a Commander player? |
| **#021** | Can I inspect evidence without losing my place? |
| **#022** | Why should I trust this build before I commit? *(Pre-Choice Coaching)* |
| **#023** | Did it actually understand what I asked for? |

None of these require a smarter Brain. They make existing intelligence understandable.

**The three questions the product must answer (in order):**

| Era step | Question | Issue |
|----------|----------|-------|
| Built | What did I build? | Deck / systems |
| Play | How does it play? | **#020** Pilot Story |
| Heard | Did I actually hear you? | **#023** — *before* the deck is judged |
| Choose | Why this build over that one? | **#022** |

**Coaching brevity principle (locked):**

> Honest Coach answers like a real Commander friend: **one sentence**.  
> If the player wants the dissertation, Deep Forge exists.  
> That separation is a product decision, not a missing feature.

A month ago founders said: *“It doesn’t understand my deck.”* (competence)  
Now: *“Help me understand your thinking.”* (collaboration)  
People don’t ask for explanations from tools they don’t trust.

**Era 3 path (engineering complete — human trial remains):**

1. ~~**#024** — fulfillment fidelity surface~~ shipped  
2. ~~**#021** — every named card-inspect surface wired~~ shipped (inventory gate)  
3. **Founder Confirmed** on #020–#024 only after Live Founder Trial clears them  
4. ~~**#026** restricted-effect overcredit~~ shipped (tests + 104-forge harness) — awaiting Live Founder Trial  

5. Optional later: Prioritize Theme rebuild — only if trial shows choice-block  
6. If #024 grading repeatedly fails loudly → harness-gated construction conversation (not silent stuffing)  

Charter: [`ERA3_COMPLETE.md`](./ERA3_COMPLETE.md)

Compatible with governance: deterministic interpreter / presentation only. Not Brain retunes, Academy, Decision Patterns, Strategic Cognition, or learning.

---

## Scoreboard

| # | Founder Issue | Layer | Status | Evidence |
|---|---------------|-------|--------|----------|
| 013 | Commander contamination | Narrative | ✅ **Founder Confirmed** | Narrative Integrity Gate |
| 014 | Flavor / printed name identity | Identity | ✅ **Founder Confirmed** | A4 Identity Resolution |
| 015 | “No engine” from unknown cards | Structural | ✅ **Founder Confirmed** | Completeness + unknown ≠ absent |
| 016 | Coach doesn’t explain the plan | Narrative | ✅ **Founder Confirmed** | Honest Coach plan story |
| 017 | MDFC display (Vorinclex) | Classification | ✅ **Founder Confirmed** | Front-face classification |
| 018 | Relationship evidence: Explicit Oracle | Structural | ✅ **Shipped — awaiting founder** | `oracle_explicit` in interaction graph |
| 019 | Mobile deck preview clipping | UX | ✅ **Founder Confirmed** | ≤760px gallery |
| **020** | **Kastral — speak Commander (Recognition + Pilot Model)** | **Strategic** | ✅ **Shipped → Live Founder Trial** | Interpreter; Brain frozen |
| **021** | **Context-preserving card inspection** | **UX** | ✅ **Founder Confirmed** (2026-08-12 live trial) | Every named inspect surface · `ForgeCardRef` |
| **022** | **Pre-Choice Coaching** | **Product / UX** | ✅ **Shipped → Live Founder Trial** | Confidence before commitment |
| **023** | **Intent vs Recommendation Transparency** | **Strategic / Narrative** | ✅ **Shipped → Live Founder Trial** | Request Recognition; hears — does not yet grade fulfillment |
| **024** | **Commission Contract** | **Strategic / Narrative** | ✅ **Founder Confirmed** (2026-08-12 live trial) | Optional note = design constraints; Player Fantasy narrator; soft-credit honesty; **no Brain** |
| **025** | **Commission-Aware Philosophy Comparison** | **Product / UX** | ✅ **Founder Confirmed** (2026-08-13 live re-trial) | Per-card fit and honest Recommended attribution · **no Brain** |
| **026** | **Restricted-effect overcredit** (Cavern / colorless modal toolbox) | **Strategic / Construction** | 🔁 **Follow-up shipped** (live trial failed) | 104-forge field identical to frozen quality · `validate:founder-026` · Brain changed |
| — | Prioritize Theme vs Performance | Strategic / UX | ⏸ **Deferred** | Needs trial evidence of choice-block, not understanding-block |

Tony Stark asked: can the Forge **see**?  
Kastral asks: can the Forge **explain what it sees** the way a Commander player thinks?  
Jay asks: can the Forge **explain why it disagreed with what I asked for** — and help me choose among builds with confidence?  
The re-run asks: can the Forge **faithfully fulfill a commission** — and prove it?

---

## Issue details

### #018 — Relationship Evidence: Explicit Oracle

| | |
|---|---|
| **Layer** | Structural |
| **Status** | ✅ Shipped — awaiting founder |
| **Brain impact** | None (graph / structural only) |

```text
Relationship
  evidence:
    oracle_explicit   ← shipped
    oracle_keyword | oracle_type | oracle_token | oracle_name
    statistical | tournament | mentor   (future)
```

**Behavior:** If card A’s Oracle says `named X` / `Partner with X` / `Meld with X` and X is in the deck, emit an edge with `evidenceClass: oracle_explicit` and include members in an `oracle_explicit` package. Bare name mentions and nicknames do **not** count. Self-references ignored.

**Verify:** `npm run validate:interaction-graph`

### #020 — Strategic Recognition + Pilot Model (Kastral)

| | |
|---|---|
| **Layer** | Strategic *(interpretation / coaching — not construction)* |
| **Status** | ✅ Shipped — awaiting founder |
| **Brain impact** | **None.** Deterministic interpreter only. |
| **Modules** | `strategic-recognition.mjs`, `pilot-model.mjs`, Honest Coach v0.6 |
| **Test** | `npm run validate:founder-020` |

Pipeline:

```text
Oracle → Interaction Graph → Systems
  → Strategic Recognition
  → Pilot Model
  → Coach
```

See issue body for success criteria. Graph facts unchanged; construction unchanged.

#### What reproduction showed (good)

Evasion / ETB / Treasure engines · 14 systems · mutual loops · verified pairs · commander synergy · high confidence. The graph is **seeing**. A month ago this page would have been nearly empty.

#### What founders react to (miss)

Facts aren’t wrong — they’re **too low-level** and unordered for how Kastral pilots think. “Adapted From Your List · Balanced Midrange” could describe fifty commanders. “Reliable opening hands” is true but not Kastral-specific.

**Keep / amplify:** “Dragon's Hoard would strengthen Ominous Seas…” — that teaches *why*.

#### Pipeline (explicit)

```text
Oracle
  → Interaction Graph
  → Systems
  → Strategic Recognition    ← what is objectively true?
  → Pilot Model              ← if I sat down tonight, how do I play?
  → Coach
```

These last two are **not** the same.

| Step | Asks | Examples |
|------|------|----------|
| **Strategic Recognition** | What is objectively true? | Evasion Engine · ETB · Treasure · flying density · commander dependency · token producers |
| **Pilot Model** | How would I play this tonight? | Don’t rush Kastral — develop 1–2 evasives first; combat is your ramp; don’t trade blink/copy targets early |

| Systems label | Pilot advice (derived, not invented) |
|---------------|--------------------------------------|
| Evasion Engine | Don’t rush Kastral. Develop one or two evasive creatures first — every combat after Kastral compounds. |
| Treasure Engine | Mana acceleration comes from connecting in combat, not traditional ramp. Protect early attackers. |
| ETB Engine | Several creatures get much stronger if blinked/copied. Don’t trade them away early. |

Graph already contains chains like Commander → Flying → Combat Damage → Bird Tokens → Card Draw. The translator can deterministically say:

> Kastral rewards connecting with evasive creatures. Every successful attack compounds your board through birds and cards, so protecting your early flyers matters more than maximizing raw power.

No learning. No weights. No hallucination. Better interpretation.

#### Success criteria

1. One-sentence **human** primary plan (not “Balanced Midrange”)  
2. Primary engine named as a player would (*Flying Pressure* / *Combat Snowball* — system labels remain Deep Forge evidence)  
3. Subthemes ranked as **support**, not peer soup  
4. Pilot beats: mulligan / sequencing / what not to trade  
5. Insights like Dragon's Hoard → Ominous Seas become the norm, not the exception  

#### Non-goals

- Smarter graph for its own sake  
- Brain / Academy / Decision Patterns / Strategic Cognition as institutions  
- Conflating with #018  

### #021 — Context-Preserving Card Inspection

| | |
|---|---|
| **Layer** | UX / Experience |
| **Status** | ✅ **Founder Confirmed** — live `app.metaforge.gg`, 2026-08-12 |
| **Brain impact** | **None.** Presentation only. |
| **Module** | `context-card-inspector.mjs` · `forge-card-ref.tsx` |
| **Test** | `npm run validate:founder-021` · inventory in `validate:era3-complete` |

**Evidence (original):** Clicking cards referenced in Deep Forge updates a deck-gallery preview that is now hundreds or thousands of pixels off-screen. Feels like nothing happened.

**Evidence (re-run 2026-08-11):** Still seeing interactions where a clickable reference lower on the page does **not** immediately let the player inspect the card. Partial coverage ≠ done.

**Engineering closeout (2026-08-12):** Every named Era 3 inspect surface routes through `setHoveredCard` / `ForgeCardRef` (systems, bridges, causality, graph packages/edges/nonbos/amplifiers/isolated, gallery companions, dossier connections, pre-choice diffs, mana-risky). Floating inspector also reopens when the gallery scrolls away with a live selection. Founder Confirmed still requires the live trial.

**Confirmation bar (raised):**

> Never make the user leave the paragraph they’re reading.  
> **Every** clickable card reference must behave consistently — not just some.

**Live confirmation:** Clicking Ayara inside the Deep Forge mana evidence opened the floating `CARD IN CONTEXT` inspector without taking the player away from the evidence paragraph.

**Root cause:** Card inspection bound to a single preview pane near the top; sticky gallery dies when Deep Forge scrolls it away; some reference surfaces may not yet route through the floating inspector.

**Desired outcome:** Referenced cards are inspectable without losing reading position.

**Shipped approach (partial):** Floating contextual inspector when gallery preview leaves viewport. Full dossier one tap away. No Brain / Oracle / graph changes.

**Family:** Same leverage class as #020 — translation / presentation, not construction.

### #022 — Pre-Choice Coaching *(was: Strategy-first Build Comparison)*

| | |
|---|---|
| **Layer** | Product / UX |
| **Status** | ✅ Shipped — awaiting founder |
| **Brain impact** | **None.** Presentation only. |
| **Module** | `strategy-build-comparison.mjs` (`buildPreChoiceCoaching`) |
| **Test** | `npm run validate:founder-022` |
| **Evidence** | Jay — *“I don’t like not seeing what I’m choosing before I choose.”* Not “show me the algorithm.” Not “show me spreadsheet diffs.” |

#### Product principle (locked)

> **The Forge should explain enough for a player to choose confidently before asking them to commit to a build.**  
> Not: choose first → explain later.

#### What he wants before Choose

Identity · personality · tradeoffs — so a player can already pick without a card-by-card diff.

**Shipped surface:**

```text
Resilient Temper
Built for players who…
want to survive interaction and gradually take over longer games.
Prioritizes · Consistency · Interaction · Stable mana
Feel · Forgiving. Strong even after setbacks.
Expected tradeoff · You'll usually win later than the more explosive builds.
[Choose this build →]
[Compare details]  ← key diffs, scores, full card list
```

#### Complete conversation (#020–#023)

Canonical write-up: [`CONVERSATION_CONTRACT.md`](./CONVERSATION_CONTRACT.md)

```text
1. I heard you.                         ← #023 · trust
2. Here are the possible philosophies.  ← #022 · confidence
3. Here's the deck.                     ← delivery
4. Here's how to pilot it.              ← #020 · teach
```

> I heard what you want. Here are the ways we could approach it. Pick the philosophy that fits you. Now let me teach you how to pilot it.

#### Deferred (same abstraction, later)

**Recommendation confidence** (separate from deck quality) — e.g. “Strong confidence: this philosophy outperformed more aggressive variants” vs “Moderate confidence: two approaches tested similarly.” Not for alpha.

**Non-goal:** Spreadsheet / exhaustive list diff as the default. Scores are secondary, under Compare details. Asking players to optimize numbers instead of choosing a game they want to play.

### #023 — Intent vs Recommendation Transparency

| | |
|---|---|
| **Layer** | Strategic Recognition / Narrative *(coach honesty — not construction)* |
| **Status** | ✅ Shipped — awaiting founder |
| **Brain impact** | **None.** Explain-only (`writesToBrain: false`). |
| **Module** | `request-recognition.mjs` · Honest Coach v0.7 |
| **Test** | `npm run validate:founder-023` |
| **Evidence** | Jay — asked for Doubling Season + Superfriends; Forge returned four planeswalkers. Then: *“Is it saying my deck idea is bad?”* |

#### Cultural principles (locked)

> **MetaForge never silently changes the user’s vision.**  
> If it interprets, constrains, or intentionally departs from the requested archetype, it says so explicitly and explains why.

> **Honest Coach answers like a Commander friend: one sentence.**  
> Deep Forge holds the longer evidence trail.

This is a product rule, not an implementation detail. Same weight as “Unknown is not absent.”

#### Why this can become defining

Today the Forge answers **“What did I build?”**  
After #020 it answers **“How does it play?”**  
After #023 it starts answering **“Did I actually hear you?”** — before the deck is judged.

#023 is the **hearing** surface. It is **not** sufficient alone: hearing themes without grading fulfillment still lets the note feel like flavor text.

Jay’s brain used to ask *“Did you ignore me?”* not *“Is this better?”* Fix the first question and the second becomes collaborative.

**Superseding trust milestone:** **#024 Commission Contract** — parse as design constraints, grade the finished list, narrate through Player Fantasy.

#### Pipeline (expose what was always implicit)

```text
User Intent
  → Intent Recognition          ← new surface
  → Brain
  → Recommendation
  → Deviation Explanation       ← never silent
```

Intent Recognition gives confidence the Forge *heard* them even when it recommends something different.

#### Desired surface — Request Recognition (top of report)

```text
Request Recognition
✓ Doubling Season theme detected
✓ Superfriends strategy detected

Adjustment made
The Forge reduced planeswalker density because testing predicted
insufficient board protection with a heavier planeswalker package.

Want a version that stays closer to your original request?
[Prioritize Theme]  |  [Prioritize Performance]
```

User is not corrected — they are **included in the decision**.

#### Desired surface — confidence panel (not yes/no judgment)

Do **not** answer “Is my idea bad?” in prose. Show the tradeoff:

```text
YOUR REQUEST
✓ Doubling Season
✓ Superfriends

Forge Confidence
Theme Fidelity      █████████░ 92%
Competitive Health  ██████░░░░ 64%

Why these differ
The requested theme conflicts with maintaining enough
protection for a large planeswalker package.
```

#### Failure modes to distinguish (after reproduction)

1. **Prompt understanding failed** — never recognized Superfriends → interpretation miss  
2. **Constraint conflict** — Doubling Season + commander + walkers → density should stay low → must *tell* the user  
3. **Brain genuinely prefers four** — acceptable **if explained**

#### Success criteria

1. Requested themes / archetypes that were recognized are listed explicitly ✅  
2. Every major departure from request gets an **Adjustment made** (or equivalent) with a reason ✅  
3. User never has to infer ignore vs reject vs optimize ✅  
4. Optional fork: Prioritize Theme vs Prioritize Performance — **deferred until Live Founder Trial shows choice-block**  
5. No silent vision change — principle above ✅  

**Shipped v1:** Stage 1 on masterworks *and* coach; fidelity bars + Adjustment copy. No Prioritize Theme/Performance buttons — waiting for founder evidence that people understand options but can’t pick a direction.

**Why higher leverage than #022:** Listening (even when disagreeing) is the coaching identity. Together with #022 they close the decision process — but only Live Founder Trial proves the product can introduce itself.

**Non-goals:** Blindly stuffing more walkers to match the label; Brain weight tweaks without harness; inventing intent that wasn’t in the prompt; answering “is your idea bad?” with yes/no.

### #024 — Commission Contract

| | |
|---|---|
| **Layer** | Strategic / Narrative *(contract + grading + fantasy narrator — not construction)* |
| **Status** | ✅ **Founder Confirmed** — live `app.metaforge.gg`, 2026-08-12 |
| **Brain impact** | **None.** No Brain changes. No card-evaluation / recommendation tweaks. |
| **Module** | `commission-contract.mjs` · Honest Coach v0.8 |
| **Test** | `npm run validate:founder-024` |
| **Evidence** | Re-run 2026-08-11 — commission *Doubling Season Superfriends* (theme-first, Doubling Season as a star) returned “Atraxa with some planeswalkers.” Note felt like flavor text, not design constraints. Coach still led with Evasion / Treasure / Engines instead of planeswalkers. |
| **Related** | Extends #023 (hearing). Does **not** replace Brain construction. Faithful *building* toward the contract is a later, harness-gated concern if grading repeatedly fails. |

#### Cultural principle (locked)

> **The optional description isn’t a suggestion. It is the player’s contract.**

Every stage must be able to answer:

> **Does this still look like the deck the player commissioned?**

#### What should be extracted before cards are judged

```text
Commander:          ✓ Atraxa (when chosen)
Primary fantasy:    ✓ Superfriends
Anchor card(s):     ✓ Doubling Season
Priority:           ✓ Theme
Secondary:          ✓ Power
```

Parse only what is in the note / commission — do not invent.

#### Missing pipeline step

```text
User Commission
  → Player Fantasy     ← #024 narrator filter
  → Graph              (unchanged)
  → Coach              (filtered through fantasy)
```

Mechanisms (tokens, proliferate, treasures, evasion) stay as **supporting evidence**.  
The coach continually filters through: *the fantasy is becoming the Superfriends player.*

Example rewrite (same graph):

| Graph says | Fantasy narrator says |
|------------|------------------------|
| Treasure Engine | Your support package exists to keep your planeswalkers alive long enough to take over the game. |
| Evasion Engine | (supporting actor — only headline if it *is* the fantasy) |

#### Desired surface

```text
You asked for
✓ Superfriends
✓ Doubling Season
✓ Theme over optimization

What I built
✓ Superfriends · 15 planeswalkers
✓ Doubling Season package
Match 95%
```

…or honest mismatch:

```text
What I built
· Light planeswalker density
· Doubling Season present / missing
Match 61%
```

Now everyone immediately understands whether the Forge believed it succeeded.

#### Acceptance criteria

1. Parse explicit fantasies (e.g. Superfriends)  
2. Parse anchor cards (e.g. Doubling Season)  
3. Parse requested experience / feel  
4. Parse optimization preference (theme vs power)  
5. Display the contract **before** the player commits to a deck  
6. Grade the finished list against the contract (match % + checklist)  
7. Coach continuously references the Player Fantasy — mechanisms are supporting actors  

#### Explicit non-goals

- Brain construction / weight / package stuffing to force walker counts  
- Hidden optimization or silent recommendation tweaks  
- Theme vs Performance rebuild fork (still deferred)  
- Deep Forge wording chase  
- Declaring #021 Confirmed  

#### Why this is the next trust milestone

Until now MetaForge proved it can **analyze** decks.  
This trial exposed the next skill: prove it can faithfully **fulfill a commission** — or admit, with a grade, when it didn’t.

That is a different skill than analysis. Earn it before touching recommendation logic.

**Shipped v1.1:** Parse fantasy / anchors / priority · Stage 1 + Coach **You asked for / What I built / match %** · Player Fantasy filters coach `tableWhy` · soft-heard clauses labeled and **excluded from match %** · Stax narrator · mechanisms demoted to support lines. Brain untouched.

**Live confirmation:** The Jay-class commission was repeated before choice, then the finished three-planeswalker list was honestly graded `68% · Partial match`; Doubling Season was present and Superfriends was named as the remaining shortfall. The original “did it ignore me?” failure did not recur.

### #025 — Commission-Aware Philosophy Comparison

| | |
|---|---|
| **Layer** | Product / UX |
| **Status** | ✅ **Founder Confirmed** — authenticated live re-trial, 2026-08-13 |
| **Brain impact** | **None.** Attribution and choice framing only. |
| **Evidence** | The choice screen showed two philosophies beside one global `50% · Weak match`. Neither card said whether that score belonged to it or which option better honored Superfriends / Doubling Season / theme-over-optimization. |

**Player question:** “Which philosophy is the 50% score for, and which one stays closer to what I asked for?”

**Test:** `npm run validate:founder-025`

**Surgical outcome:**

1. A match grade is attributed to a specific candidate/philosophy, never floating globally between options.
2. Each philosophy summarizes its commission fit using already-computed contract facts.
3. The recommended badge explains whether it means stronger play structure, stronger commission fit, or both.
4. No Theme vs Performance rebuild fork; this issue only makes the existing choice legible.
5. No Brain, graph, card evaluation, or construction-weight changes.

**Live trial:** Both philosophy cards correctly showed their own `50% · Weak match` line. The Recommended explanation failed the honesty bar by saying “closer commission fit” even though the two fit scores were equal. Keep the per-card surface; require a strictly higher score before using “closer,” and describe ties as ties.

**Live re-trial (2026-08-13):** Pass. The same Jay commission produced Resilient Temper and Synergy Temper; each card showed its own `50% · Weak match`. Recommended rendered: “Recommended for stronger play structure — commission fit is tied across these philosophies.” The score attribution and recommendation explanation were both accurate.

### Eldrazi / recommendation priorities — Watch

Related strategic layer, separate ticket. One signal = hypothesis.

**Update (2026-08-14):** Second independent list (Selesnya T'Challa) reproduced colorless modal / Eldrazi-shaped overcredit. Folded into **#026**.

### #026 — Restricted-effect overcredit

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | 🔁 Follow-up shipped (2026-08-15). Live Founder Trial failed 2026-08-14; first ship did not change selection. |
| **Brain impact** | Yes — representation fix in default construction. Report: [`BRAIN_V1_FOUNDER_026_HARNESS.md`](./BRAIN_V1_FOUNDER_026_HARNESS.md) |

**Player evidence**

1. Prior Eldrazi / default-rec watch (one founder = hypothesis).
2. 2026-08-14 Selesnya **T'Challa, the Black Panther** 99: **Cavern of Souls** in a non-typal list; **Ugin, the Ineffable**, **Ugin, Eye of the Storms**, **Kozilek's Command**, **Warping Wail**, **Glaring Fleshraker** as if they were auto-includes.

**Class of failure** (not a T'Challa patch, not an Eldrazi ban list):

> Conditional / mutually exclusive effects are scored as if they were unconditional full-role contributions.

Two manifestations, same class:

1. **Restricted rainbow lands.** `buildManaBase` withholds full color-fit when mana is type-restricted unless the list is typal. Path of Ancestry keeps full credit because it also taps for unrestricted commander-identity colors.
2. **Modal toolbox role-stacking / restricted colorless casting.** Classification still unions modes. Scoring counts only the modes you can fire. Role floors and prospective deficit-closure count modal cards at 0.4. `{C}` pips are visible to mana consistency **and** selection. Artifact-only `{C}` does not pay nonartifact spells. "Whenever you cast an artifact spell" is not spellslinger.
3. **Conditional rainbow lands, same class.** Devotion-scaled any-color (Nykthos class) is not a dual unless the commander is mono-color. Type-count scaled any-color (Three Tree City class) is not a dual unless the list is typal. Land-type scaled mana (Coffers class) is not a dual in a split identity. A land that produces none of the commander’s colors is a utility slot, not fixing. Unconditional rainbow (City of Brass / Mana Confluence class) is 4–5 color reach, not a two- or three-color dual. Named-type mana (Haven of the Spirit Dragon class) is not a dual unless that printed type is in the tribe lens — Bear typal does not make Dragon lands into duals. Command Tower and Exotic Orchard keep full credit.
4. **X is not a 1-drop.** Printed mana value treats X as zero; construction curve does not.
5. **Colorless rocks in a colored list.** 2+ mana `{C}` rocks do not close the colored ramp quota. 0–1 mana rocks still accelerate. Any-color rocks still fix.
6. **Conditional wincons, same class.** “You win the game if [board condition]” is not an unconditional threat. A ten-treasure close is real when the commander produces treasures; it is not a Clue engine’s win. This is not a combo solver and does not claim loops go infinite.
7. **Named token / Clue scope, same class.** Investigate produces Clues. “Whenever a Clue you control” is not generic token-maker synergy and not a flying-matters payoff. Artifact payoffs still count because Clues are artifacts. Angel token factories do not inherit the commander edge.

T'Challa’s Vibranium mana cannot be spent on nonartifact spells — so these colorless instants/planeswalkers are not even a free `{C}` outlet. That is the same restriction-blindness, not a commander-specific branch.

**Do not fix as**

- `if (commander === "T'Challa")` / `if (commander === "Teysa")`
- an Eldrazi / Ugin / Cavern / City of Brass / Revel deny-list
- a coefficient nudge to make this screenshot prettier
- a new combo-search planning layer

**Legal next step (done 2026-08-14, follow-up 2026-08-15)**

Harness-gated construction change that withholds full credit unless the condition holds in *this* list (tribe density for type-restricted or type-count mana; the printed type for named-type mana; identity width for rainbow pain lands; mono-color for devotion-scaled mana; a mode you can actually fire; `{C}` / artifact-only mana as real payment; scoped artifact-spell payoffs; commander/commission support for a conditional win). Tests: `npm run validate:founder-026`. Field: `npm run validate:harness:field`.

**Live trial (2026-08-14):** Failed. T'Challa Revision 1 still showed Kozilek's Command, Ugin, Glaring Fleshraker. First ship never gated selection. Follow-up does.

**Live evidence (2026-08-15):** Teysa, Opulent Oligarch 99. Build was coherent (clues / drain / artifact-sac). Remaining class holes after mana/wincon follow-up: generic Angel / token bodies inheriting a Clue commander’s edge. Follow-up scopes Investigate/Clue production and withholds token-with-flying as an evasion payoff.

### #027 — Payoff-magnitude overcredit

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | 🔁 Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — representation fix in default construction. |

**Player evidence**

1. 2026-08-18 Selesnya **T'Challa, the Black Panther** 99 (note: "Artifacts matter, large artifacts, Vibranium colorless mana for artifact spells"): only 6 of 19 selected artifacts cleared T'Challa's own "cast an artifact spell with mana value 4 or greater" trigger; the rest (Hangarback Walker, Twitching Doll, Grinding Station, Universal Automaton, Bloodline Pretender, ...) can never fire it. `report.blueprintIntent` collapsed the note into a single flat `desiredRoles: ["artifacts"]` boolean, and the commander-oracle-signal path graded every artifact candidate identically regardless of whether it actually cleared the stated mana-value bar.

**Class of failure** (not a T'Challa patch, not a Marvel/Vibranium deny-list):

> A commander that only rewards a spell/permanent of a stated type once it clears a numeric bar (mana value / power / toughness N or greater/less) is graded as if "type matters" were the whole promise — a same-type candidate that never clears the bar gets identical credit to one that reliably fires it.

One manifestation:

1. **Magnitude-qualified cast/play triggers.** "Whenever you cast an artifact spell with mana value 4 or greater" is not "artifacts matter" — construction credit must be withheld from same-type filler that can never trigger it. Verified to generalize across metric (mana value, power, toughness) and direction (N or greater, N or less); not special-cased to any one commander's wording.

**Do not fix as**

- `if (commander === "T'Challa")` / any name or ID branch
- a Marvel/Vibranium-specific deny/allow list
- a coefficient nudge to make this screenshot prettier
- a new hardcoded role (e.g. "artifacts_4plus") bolted onto the flat role vocabulary

**Legal next step (done 2026-08-18)**

`commanderPayoffMagnitudeGates` (`app/conditional-effect-credit.mjs`) parses a commander's own oracle text for "whenever you cast/play a [type] spell/permanent with [mana value/power/toughness] N or greater/less" into a structured `{typeWord, metric, threshold, direction}` gate — general parsing, independent of any note text and not keyed to the existing flat role vocabulary. `cardClearsPayoffMagnitudeGate` grades a candidate against that gate (`null` when the candidate isn't even the gated type, so a miss on an unrelated card is never scored as a threshold failure). `payoffMagnitudeHitsFor` sums cleared gates per candidate; wired into `native-masterwork-engine.mjs`'s score formula (`+14 * variant.synergy` per cleared gate — the same weight a verified commander produce/reward connection already carries), the commander-anchor reservation pass, and the construction shortlist gate, plus `slot-justification-ledger.mjs`'s footprint so a magnitude-cleared candidate survives `repairWeaklyJustifiedSlots` the same way a verified commander connection does. Purely additive: a type-only match that never clears the bar keeps its pre-existing credit, never worse. Tests: `npm run validate:founder-027`. Field: `npm run validate:harness:field`.

**Live trial:** Not yet run. Harness-gated only. T'Challa reproduction shows selected mana-value-4-or-greater artifact representation rising from 6/19 (32%) to 10/22 (45%), with concrete replacements (Metalwork Colossus, The Aetherspark, The One Ring, Giggling Skitterspike now selected; Liberator, Urza's Battlethopter and Grinding Station no longer). Filler artifacts below the bar (Hangarback Walker, Twitching Doll, Sword of Wealth and Power, ...) still appear — an honest, partial improvement in representation, not a claim every irrelevant artifact is gone. #026's own history shows a first ship can pass harness and still fail live trial; this needs the same real-founder check before being called `Founder Confirmed`.

Checked and deliberately left out of scope: `restrictedEffectCastingFactor` (`conditional-effect-credit.mjs`) already stops artifact-only colorless mana (Vibranium-class `{C}`) from being penalized when spent on an artifact spell, but it does not positively reward a deck for having real uses for that restricted mana beyond what the magnitude-gate fix above already does incidentally (an MV4+ artifact is exactly a good use for Vibranium's `{C}`). Rewarding resource-spending synergy directly is a different capability from magnitude-threshold grading and is left for a follow-up, not folded in here.

### #028 — Archetype catalog: generic package layer (proof of concept)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated, proof-of-concept scope), pending Live Founder Trial |
| **Brain impact** | Yes — 3 new packages can open in default construction. |

**Scope**

The 10 existing `PACKAGE_CATALOG` entries in `strategic-intent.mjs` (auras, equipment, aristocrats, reanimator, tokens, landfall, typal, spellslinger, blink, stax) are each a bespoke, hand-written detector function. A research pass identified a further ~26 archetypes worth the same false-friend-aware treatment, but hand-authoring 26 more one-off detector functions the same way does not scale. This issue validates a second, *declarative* catalog schema — oracle-text pattern lists plus a named, reusable false-friend "shape" — against exactly 3 of those ~26 archetypes before committing to the rest:

1. **Artifacts matter** (`artifacts_matter`) — false-friend shape `broad-type-superset`. A card carrying the broad "Artifact" type line is not core just because it is an artifact; core is the payoff (metalcraft / affinity / artifacts-you-control / artifact-enters watchers). Also reuses `commanderPayoffMagnitudeGates` (#027) so a T'Challa-shaped commander whose only artifact tie is a magnitude-qualified cast trigger still opens the package without re-deriving that parse.
2. **+1/+1 Counters matter** (`counters_matter`) — false-friend shape `incidental-rider`. A card whose dominant effect is something else (removal, exile, damage, draw) that mentions a +1/+1 counter only as a minor rider clause gated behind an unrelated condition is not core.
3. **Group Hug** (`group_hug`) — false-friend shape `excluded-by-tag`. A card that superficially reads "each player" / "each opponent may" but is already tagged `stax_piece` or `asymmetric_stax` by `strategicSemanticsFor` is a tax dressed as generosity, not real hug — reuses that existing tag vocabulary rather than inventing a parallel one.

**Do not fix as**

- 26 more bespoke hand-written detector functions, one per archetype
- a name/commander-specific branch anywhere in the 3 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries "for consistency"

**Legal next step (done 2026-08-18)**

New file `app/archetype-catalog.mjs`: exactly 3 declarative catalog records (`ARCHETYPE_CATALOG`), each with `corePatterns`/`supportPatterns` oracle-text regex lists, a `falseFriendShape` + `falseFriendConfig`, a `commander.oraclePatterns` block (and, for `artifacts_matter` only, a `commander.magnitudeGateTypeWord` that reuses #027's gate parser), and a `note.aliases` block — the same dual-reachability contract (`packageTriggered`) the existing 10 already honor, so a real archetype commander with an empty note and a free-text fantasy note both independently open the package. Three shared, reusable false-friend shape evaluators (`broad-type-superset`, `incidental-rider`, `excluded-by-tag`) are exported and dispatched generically by shape name — built for exactly what these 3 entries need, not a speculative fourth shape.

`strategic-intent.mjs` merges `ARCHETYPE_CATALOG` into a local `ALL_PACKAGES` alongside the unmodified `PACKAGE_CATALOG` (no id collision with the 10) and widens `packageTriggered`, `cardSatisfiesPackageCore`, `cardSatisfiesPackageSupport`, `cardIsPackageFalseFriend`, `packageReport`, and `STRATEGIC_PACKAGE_IDS` to also reach archetype-catalog records — the exact generic-dispatch path `auras`/`equipment`/`blink` already run through. Every branch for the existing 10 is untouched; the only line each function gained is an early `if (ARCHETYPE_CATALOG[packageId]) return ...` before falling through to the original logic. `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `artifacts_matter: ["artifacts"]` and `counters_matter: ["counters"]` (both real reward categories already in `forge-interaction-graph.mjs`'s PAYOFFS vocabulary) and `group_hug: []` (no "each player benefits" reward category exists in that vocabulary at all — same reasoning as `stax`/`typal`'s empty mapping, to avoid a `weak_commander_connection` false positive).

Tests: `npm run validate:artifacts-matter-occupancy`, `validate:counters-matter-occupancy`, `validate:group-hug-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (T'Challa, the Black Panther; Vorel of the Hull Clade; Kynaios and Tiro of Meletis). All 10 existing `*-package-occupancy` test files plus `validate:founder-026`/`validate:founder-027` (both touch the same shared scoring/conditional-effect-credit machinery) re-verified green with zero changes. Field: `npm run validate:harness:field`.

**Live trial:** Not yet run. Harness-gated only. This is explicitly a 3-of-~26 proof of concept — it validates the catalog schema and the 3 false-friend shapes, not full archetype-effort completeness. The remaining ~23 archetypes are out of scope for this issue.

### #029 — Archetype catalog: batch 2 (lifegain, lands matter, burn, enchantress, mill, wheels)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 6 new packages can open in default construction. |

**Scope**

Continues #028's declarative catalog schema past the 3-entry proof of concept, adding the next 6 archetypes by real EDHREC prevalence: Lifegain (~88k decks), Lands Matter (~67k), Burn (~64k), Enchantress (~58k), Mill (~51k), Wheels (~35k). ~17 archetypes from the original research list remain out of scope for a future batch.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **Lifegain** (`lifegain`) — reuses `incidental-rider` from #028's `counters_matter`. Core is a real gain-life payoff (Trelasarra, Moon Dancer; Karlov of the Ghost Council: "Whenever you gain life, ...") or a reliable doubler (Rhox Faithmender: "If you would gain life, you gain twice that much life instead."). False friend: Horrific Assault — "Target creature you control deals damage equal to its power to target creature or planeswalker you don't control. If you control an Eldrazi, you gain 3 life." — a fight-style damage spell whose life gain is a minor rider gated behind an unrelated Eldrazi condition, structurally identical to counters_matter's gated removal-spell rider.
2. **Lands Matter** (`lands_matter`) — reuses `broad-type-superset` from #028's `artifacts_matter`. Core is a landfall-shaped payoff (Aesi, Tyrant of Gyre Strait: "Landfall — Whenever a land you control enters, you may draw a card."; Titania, Protector of Argoth; The Gitrog Monster). False friend: any plain Land (Command Tower) — a dual is not core just because its type line says Land, the same way a vanilla Artifact isn't core to artifacts_matter.
3. **Burn** (`burn`) — reuses `incidental-rider`. Core is direct damage that actually reaches a player: a cast-trigger pinger (Guttersnipe, Electrostatic Field, and the real magnitude-qualified Y'shtola, Night's Blessed), a damage amplifier (Torbran, Thane of Red Fell; Fiery Emancipation), or a direct burn spell that can hit a player (Lightning Bolt's "any target") — unlike artifacts_matter's vanilla artifact, raw burn spells are the archetype's real identity and are not demoted to support. False friend: Unlicensed Disintegration — "Destroy target creature. If you control an artifact, ... deals 3 damage to that creature's controller." — a removal spell whose player-facing damage is a minor rider gated behind an unrelated artifact-count condition. A creature-only damage spell (Flame Slash) is neither core nor a flagged false friend — corePatterns already require the damage to reach a player, so it simply never matches core; no shape needed to exclude what never qualified.
4. **Enchantress** (`enchantress`) — reuses `broad-type-superset`. Core is the enchantment-triggered draw ability itself (Argothian Enchantress, the archetype's namesake: "Whenever you cast an enchantment spell, draw a card."; Setessan Champion's Constellation shape). False friend: Rhystic Study — type line says Enchantment, but its spell-tax draw payoff has nothing to do with enchantments, the same mismatch as a vanilla Artifact. Considered generalizing broad-type-superset to "has the enchantment-triggered draw ability" per the original task brief's own illustration, but that framing just restates corePatterns itself rather than describing a distinct false-friend shape — the real false friend here is the ordinary broad-type mismatch the existing shape already models. Does not touch the existing `auras` PACKAGE_CATALOG entry (Enchantress is deliberately scoped past the narrower Aura subtype).
5. **Mill** (`mill`) — new shape, `wrong-target-scope`. Core is milling an OPPONENT's library (Hedron Crab, Bruvac the Grandiloquent's doubler, Phenax's granted ability, Consuming Aberration's library-depletion clause). False friend: Stitcher's Supplier — "When this creature enters or dies, mill three cards." — mills only its own controller; a graveyard/reanimator enabler, not the Mill archetype. None of #028's 3 shapes fit: not a type-line mismatch (no type-line concept applies to a mill trigger), not an incidental-rider (the mill is the card's entire, unconditional effect — no gate, no separate dominant effect for it to ride on), not excluded-by-tag (`strategicSemanticsFor` has no self-mill-vs-opponent-mill tag, and the shape's own rule forbids inventing one).
6. **Wheels** (`wheels`) — reuses the new `wrong-target-scope` shape, confirming it is genuinely shared rather than mill-specific. Core is a symmetric hand-refill (Wheel of Fortune: "Each player discards their hand, then draws seven cards.") or an opponent-facing punisher (Nekusar, the Mindrazer). False friend: Cathartic Reunion — "discard two cards. Draw three cards." — a personal loot spell that mentions both discard and draw like a real wheel, but only ever touches the caster's own hand, the same self/opponent scope confusion as mill's self-mill trap.

**New shared shape: `wrong-target-scope`** (`app/archetype-catalog.mjs`) — the archetype's own action verb is present in a card's oracle text (broader than any single corePattern), but the effect is scoped to the wrong player for the archetype's actual promise. Config: `{ mentionPattern, requiredScopePattern }`; a card is a false friend when the mention matches but the required (opponent-facing or symmetric) scope does not. Verified genuinely reusable, not archetype-specific, by construction: it independently grounds both mill (self-mill vs. opponent-mill) and wheels (personal loot vs. symmetric/opponent-punishing wheel) with unrelated real-card fixtures (Stitcher's Supplier; Cathartic Reunion). Registered in `FALSE_FRIEND_SHAPES` the same way as #028's 3 shapes; `cardSatisfiesArchetypeCore` needed no gate-check addition for it (unlike incidental-rider/excluded-by-tag) because, like broad-type-superset, its broader mention pattern never overlaps with the precise corePatterns.

**#027 magnitude-gate reuse checked for all 6** (`commanderPayoffMagnitudeGates`): a real magnitude-qualified commander exists for both lifegain and burn — Y'shtola, Night's Blessed ("Whenever you cast a noncreature spell with mana value 3 or greater, Y'shtola deals 2 damage to each opponent and you gain 2 life.") — but its cast-trigger clause is already caught directly by the generic corePatterns (a magnitude qualifier mid-sentence doesn't stop a wildcard match), so the #027 reuse would be redundant there and was not added. No real magnitude-qualified commander was found for lands_matter, enchantress, mill, or wheels; not forced.

**Do not fix as**

- 6 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 6 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028's 3 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing where the structure actually matches (4 of 6 reuse #028's existing shapes; only the genuinely novel self/opponent-scope pattern got a new one, and it is shared across 2 archetypes, not 1)

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains 6 more declarative records plus the `wrong-target-scope` shared shape, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028's 3 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified — `ARCHETYPE_CATALOG` merge and generic fallback already cover every id-keyed record). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `lifegain: ["life"]` and `lands_matter: ["lands"]` (real reward categories already in `forge-interaction-graph.mjs`'s PAYOFFS vocabulary), and `burn`, `enchantress`, `mill`, `wheels` all map to `[]` — burn because no "damage" reward category exists in that vocabulary at all (its own comment already explains why); enchantress because the only textually-adjacent category, `auras`, requires the literal word "aura" that no real Enchantress payoff uses; mill because the closest category, `graveyard`, is about using your own graveyard as a resource, not depleting an opponent's library; wheels because the closest category, `draw`, requires literal "whenever you draw", which neither of Nekusar's own two clauses says. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as #028.

Tests: `npm run validate:lifegain-occupancy`, `validate:lands-matter-occupancy`, `validate:burn-occupancy`, `validate:enchantress-occupancy`, `validate:mill-occupancy`, `validate:wheels-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Karlov of the Ghost Council; Aesi, Tyrant of Gyre Strait; Torbran, Thane of Red Fell; Sythis, Harvest's Hand; Bruvac the Grandiloquent; Nekusar, the Mindrazer). All 9 pre-existing `*-package-occupancy` test files (#028's 3 plus the 7 original `PACKAGE_CATALOG` entries) plus `validate:founder-026`/`validate:founder-027` re-verified green with zero changes. Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard failures, no hard regressions flagged against the frozen baseline (`beneficial_emergence` 11.24 → 11.462/forge and `later_package_oversupply` 2.481 → 1.231/forge both improved, consistent with #027's own baseline note that these numbers move run-to-run without being caused by unrelated changes).

**Live trial:** Not yet run. Harness-gated only, same as #028 — this batch is unproven in front of a real player.

### #030 — Archetype catalog: batch 3 (legends, discard, graveyard, clones, flying, group slug)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 6 new packages can open in default construction. |

**Scope**

Continues #028/#029's declarative catalog schema with the next 6 archetypes by real EDHREC prevalence: Legends (~35k decks), Discard (~34k), Graveyard (~31k), Clones (~31k), Flying (~27k), Group Slug (~24k). This adds zero new false-friend shapes — all 6 reuse `broad-type-superset`, `incidental-rider`, or `wrong-target-scope`, each re-grounded in independent real-card evidence, not merely inherited by name.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **Legends** (`legends`) — reuses `broad-type-superset` from #028's `artifacts_matter`/#029's `lands_matter`/`enchantress`. Core is a real payoff for OTHER legendary permanents you control (Sisay, Weatherlight Captain: "gets +1/+1 for each color among other legendary permanents you control" plus her own legendary-tutor ability; Gimli of the Glittering Caves: "Whenever another legendary creature you control enters, put a +1/+1 counter on Gimli."). False friend: Rograkh, Son of Rohgahh — a Legendary Creature by type line with zero legendary-matters text, the same mismatch as a vanilla Artifact or plain Land.
2. **Discard** (`discard`) — reuses `incidental-rider` from #028's `counters_matter`. Core is a real single-target/self-discard payoff, deliberately distinct from #029's wheels (symmetric hand-refill or an opponent-draw punisher): targeted discard-as-removal (Mind Rot: "Target player discards two cards."), hand-disruption (Thoughtseize), an opponent-discard value payoff that is not a symmetric wheel or damage/life-loss punisher (Tergrid, God of Fright: "Whenever an opponent sacrifices a nontoken permanent or discards a permanent card, you may put that card from a graveyard onto the battlefield under your control." — reanimator-adjacent discard synergy, exactly the class the brief names), and self-discard/madness payoffs (Bone Miser). False friend: Big Score — "As an additional cost to cast this spell, discard a card. Draw two cards and create two Treasure tokens." — discard is a cost-gate for an unrelated dominant effect (draw), not a discard-matters payoff. Kept disjoint from wheels by construction: wheels' own corePatterns require the literal contiguous substring "opponent discards" or a symmetric "each player discards their hand"; Tergrid's actual text is "opponent sacrifices a nontoken permanent OR discards a permanent card" (never a contiguous "opponent discards"), and Nekusar's "whenever an opponent draws a card" never contains the word "discard" at all — verified in the test file that neither commander opens the other archetype.
3. **Graveyard** (`graveyard`) — reuses `incidental-rider`. Core is using the graveyard as a general resource — delirium/threshold, flashback/escape, "from your graveyard" cast/scale payoffs (Muldrotha, the Gravetide: "you may play a land and cast a permanent spell of each permanent type from your graveyard."; Tarmogoyf: "power is equal to the number of card types among cards in all graveyards..."). Explicitly distinct from the existing `reanimator` PACKAGE_CATALOG entry (reanimation SPELLS specifically): Reanimate's real printed text ("Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value.") has no delirium/threshold/flashback/escape keyword and no "cast ... from your graveyard" phrasing, so it never matches `graveyard`'s corePatterns at all — the same "doesn't even qualify" outcome as burn's own Flame Slash, verified directly in the test file (neither core nor a flagged false friend). False friend: Grim Lavamancer — "{R}, {T}, Exile two cards from your graveyard: ... deals 2 damage to any target." — mentions graveyard, gated behind a graveyard-spending activation cost, but its dominant effect is unrelated direct damage. Notably, Stitcher's Supplier — #029's own self-mill FALSE FRIEND for opponent-depletion mill — is genuine SUPPORT here, since fueling your own graveyard is precisely this archetype's enabler role; the same real card legitimately occupies two different roles in two different archetypes, exercising the task's own overlap allowance.
4. **Clones** (`clones`) — new use of `wrong-target-scope` (still zero new shapes; this is a reuse, generalized past mill/wheels' player-scope to an object-TYPE scope). Core is copying creatures/permanents (Sakashima of a Thousand Faces; Progenitor Mimic; Rite of Replication). False friend: Twincast — "Copy target instant or sorcery spell." — mentions "copy" broadly like a real clone effect, but copies a SPELL, not a creature/permanent.
5. **Flying** (`flying`) — reuses `wrong-target-scope` again, generalized to a keyword-vs-payoff scope mismatch. Core is evasion-matters via the Flying keyword specifically (Sephara, Sky's Blade: "Other creatures you control with flying have indestructible."; Favorable Winds: "Creatures you control with flying get +1/+1."). False friend: Serra Angel — "Flying, Vigilance." — has the keyword itself with no reward clause tying flying to a payoff.
6. **Group Slug** (`group_slug`) — reuses `wrong-target-scope` a third time, generalized to a trigger-subject scope mismatch. Core is a symmetric multiplayer punisher keyed to an OPPONENT's own action — casting, tapping for mana, attacking — not your own spellcasting (#029's burn) and not an opponent's draw/discard specifically (#029's wheels / this batch's discard): Kaervek the Merciless ("Whenever an opponent casts a spell, Kaervek deals damage equal to that spell's mana value to any target."), Manabarbs, Revenge of Ravens. False friend: Guttersnipe — burn's own established core card ("Whenever you cast an instant or sorcery spell, this creature deals 2 damage to each opponent.") — mentions the identical punisher shape, but the trigger's subject is "you" (your own casting), not an opponent's own action. Using burn's own core fixture as group_slug's false friend directly proves the two promises don't overlap, verified in the test file (Guttersnipe opens burn but not group_slug; Kaervek opens group_slug but not burn).

**`wrong-target-scope` generalization (no new shape added)** — #029 introduced this shape grounded in two unrelated archetypes' player-scope mismatches (mill's self-mill vs. opponent-mill; wheels' personal loot vs. symmetric wheel). #030 reuses it three more times, each in a structurally different sub-domain — object-type scope (clones: copy a spell vs. copy a creature), keyword-vs-payoff scope (flying: has the keyword vs. rewards the keyword), and trigger-subject scope (group_slug: your action vs. an opponent's action) — confirming the shape's real generality is "broad mention passes, precise required scope fails," not a player-scope-specific tool. The shared evaluator's comment in `app/archetype-catalog.mjs` was extended (not modified in behavior) to document this.

**Do not fix as**

- 6 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 6 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028/#029's 9 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing where the structure actually matches (all 6 reuse #028/#029's existing shapes; zero new shapes this batch)
- letting `graveyard` steal `reanimator`'s job, `discard` steal `wheels`' job, or `group_slug` steal `burn`'s job — each was checked against the other's real corePatterns/commander text, not assumed disjoint

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains 6 more declarative records, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028/#029's 9 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `graveyard: ["graveyard"]` (the real existing reward category, already shared honestly with `reanimator` — both archetypes legitimately touch graveyard-resource vocabulary without either stealing the other's promise) and `flying: ["evasion"]` (the real existing category, broader than pure-flying since it also covers menace, but a real Flying commander genuinely clears it); `legends`, `discard`, `clones`, and `group_slug` all map to `[]` since no corresponding reward category exists in `forge-interaction-graph.mjs`'s vocabulary for any of them — same reasoning as `stax`/`typal`/`burn`/`mill`/`wheels`. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as #028/#029.

Tests: `npm run validate:legends-occupancy`, `validate:discard-occupancy`, `validate:graveyard-occupancy`, `validate:clones-occupancy`, `validate:flying-occupancy`, `validate:group-slug-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Sisay, Weatherlight Captain; Tergrid, God of Fright; Muldrotha, the Gravetide; Sakashima of a Thousand Faces; Sephara, Sky's Blade; Kaervek the Merciless). All 16 pre-existing `*-package-occupancy` test files (#028's 3, #029's 6, and the original 7 — 76 sub-tests total) plus `validate:founder-026` (26 sub-tests) and `validate:founder-027` (9 sub-tests) re-verified green with zero behavior change to any existing entry. `npm run lint` and `npm run build` both pass — zero lint findings in any changed file (296 pre-existing `@typescript-eslint/no-explicit-any` errors remain in unrelated `worker/*.ts` files, untouched by this batch). Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard-failure runs, no hard regressions against the frozen baseline (`later_package_oversupply` 2.481 → 1.231/forge and `beneficial_emergence` 11.24 → 11.462/forge both improved — the identical numbers #029 itself reported, since the field harness's fixed scenario set does not exercise these 6 new archetypes directly; it exists to prove the shared scoring/conditional-effect-credit machinery this batch touches nowhere is still frozen).

**Live trial:** Not yet run. Harness-gated only, same as #028/#029 — this batch is unproven in front of a real player.

### #031 — Archetype catalog: batch 4 (infect, extra combats, theft, superfriends, goad, vehicles)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 6 new packages can open in default construction. |

**Scope**

Continues #028/#029/#030's declarative catalog schema with the next 6 archetypes by real EDHREC prevalence: Infect (~22k decks), Extra Combats (~21k), Theft (~21k), Planeswalkers/Superfriends (~17k), Forced Combat/Goad (~17k), Vehicles (~16k). This adds zero new top-level false-friend shapes: 5 of 6 reuse `wrong-target-scope`, extended into two further sub-domains (a grant-vs-negate polarity mismatch, and a mention-vs-count-reward mismatch); `vehicles` reuses `broad-type-superset` directly.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **Infect** (`infect`) — reuses `wrong-target-scope`, generalized to a grant-vs-negate POLARITY mismatch (new sub-domain). Core is the Infect/Toxic keyword itself and real poison-counter payoffs (Skithiryx, the Blight Dragon carries Infect directly; Vishgraz, the Doomhive: "Vishgraz gets +1/+1 for each poison counter your opponents have."; Ixhel, Scion of Atraxa's Corrupted threshold payoff). False friend: Melira, Sylvok Outcast — "You can't get poison counters. ... Creatures your opponents control lose infect." — mentions "infect"/"poison counters" as broadly as any real payoff card, but every clause is a negation, the polarity opposite of the archetype's promise. corePatterns exclude "lose infect" by construction (a negative lookbehind on "lose(s) " before "infect"), so she never satisfies core in the first place; the false-friend check explicitly flags her via the broader mention.
2. **Extra Combats** (`extra_combats`) — reuses the same new grant-vs-negate POLARITY sub-domain infect needs, confirming it is genuinely shared rather than a one-off. Core is a real granted additional combat phase — WotC's fixed templating is a single phrase across every printing (Aurelia, the Warleader: "After this phase, there is an additional combat phase."). False friend: Stonehorn Dignitary — "target opponent skips their next combat phase." — mentions "combat phase" as broadly as any real extra-combat card, but denies one from an opponent instead of granting one to you, a real pillow-fort/stax staple.
3. **Theft** (`theft`) — reuses `wrong-target-scope`'s object-TYPE-mismatch sub-domain #030 opened for clones (spell-vs-creature), scoped instead to a battlefield-permanent-vs-graveyard-card mismatch. Core is gaining control of an opponent's live permanent (Dragonlord Silumgar: "gain control of target creature or planeswalker for as long as you control Dragonlord Silumgar."; Insurrection's real mass-theft). False friend: Reanimate — "Put target creature card from a graveyard onto the battlefield under your control." — mentions "under your control" as broadly as any real theft card, but the object is a graveyard card, not a live permanent under another player's control. Notably the same card is #030's own graveyard entry's "doesn't even qualify, no shape needed" example — here she DOES trip the broader mention and gets an explicit false-friend flag instead, a legitimately different outcome for the identical card in two different archetypes' worked examples.
4. **Planeswalkers/Superfriends** (`superfriends`) — new use of `wrong-target-scope`'s mention-vs-count-reward sub-domain (shared with goad below). Core is a real payoff for having MANY planeswalkers together — Mila, Crafty Companion (front face of a real legendary-creature commander): "Whenever an opponent attacks one or more planeswalkers you control, put a loyalty counter on each planeswalker you control."; Chandra, Legacy of Fire: "...where X is the number of planeswalkers you control." Deliberately kept disjoint from #028's counters_matter: a loyalty counter is a structurally different counter type from a +1/+1 counter, and neither entry's corePatterns can accidentally satisfy the other by construction — superfriends never uses "+1/+1" wording, counters_matter's own corePatterns all require it. Verified against this codebase's own canonical "Superfriends" flavor reference: Atraxa, Praetors' Voice's bare "proliferate" opens counters_matter but was deliberately NOT used as this entry's commander fixture and does not open superfriends, since her text never mentions a planeswalker at all — proven with an explicit test, not just asserted. False friend: Baird, Steward of Argive — "Creatures can't attack you or planeswalkers you control unless their controller pays {1}..." — mentions "planeswalkers you control" but is a flat tax that rewards nothing about HAVING MANY.
5. **Forced Combat/Goad** (`goad`) — reuses the same mention-vs-count-reward sub-domain superfriends needs. Core is the Goad keyword/mechanic itself (Marisi, Breaker of the Coil: "goad each creature that player controls."; Alela, Cunning Conqueror: "goad target creature that player controls."). False friend: Serene Sleuth — "investigate for each goaded creature you control. Then each creature you control is no longer goaded." — mentions "goaded" broadly but never itself applies goad; it only counts and then removes existing goaded status as a rider on an unrelated card-advantage engine.
6. **Vehicles** (`vehicles`) — reuses `broad-type-superset` DIRECTLY from artifacts_matter, one level deeper (Vehicle is itself an Artifact subtype — exactly the trap the task brief named). Core is a real Vehicle-specific payoff (Depala, Pilot Exemplar: "Each Vehicle you control gets +1/+1 as long as it's a creature."; Edward Kenway's combat-damage payoff keyed to the type specifically). False friend: Cultivator's Caravan — "{T}: Add one mana of any color. Crew 3." — type line carries BOTH "Artifact" and "Vehicle", but is a vanilla mana rock with zero payoff text for either archetype, proving the broad-type-superset trap recurs one subtype layer down. Kept structurally disjoint from artifacts_matter: every corePattern here requires the literal word "Vehicle", none of artifacts_matter's do, and verified against real evidence one layer further — Depala's own payoff clause never says "artifact" and does not open artifacts_matter, and PAYOFFS.artifacts in forge-interaction-graph.mjs (which requires the literal word "artifact") never fires for her either, which is exactly why `vehicles` maps to `[]` in package-plan-optimizer.mjs rather than reusing artifacts_matter's "artifacts" reward category.

**`wrong-target-scope` generalization (no new top-level shape added)** — #029 introduced this shape (player-scope mismatches); #030 extended it to object-type, keyword-vs-payoff, and trigger-subject scope. #031 extends it two further ways: a grant-vs-negate POLARITY mismatch (infect, extra_combats — a card can mention the archetype's own keyword while doing the opposite of granting/scaling it) and a mention-vs-count-reward mismatch (superfriends, goad — a card can mention the archetype's own noun/keyword without rewarding or applying it). Both sub-domains are grounded in two independent archetypes each, not a single-entry justification. `vehicles` needed no shape extension at all — it reuses `broad-type-superset` exactly as artifacts_matter already defined it, just with a different `typePattern`.

**Do not fix as**

- 6 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 6 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028/#029/#030's 15 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing/extending where the structure actually matches (5 of 6 extend `wrong-target-scope`'s existing sub-domains or open a shared new one; 1 reuses `broad-type-superset` unmodified; zero brand-new top-level shapes this batch)
- letting `superfriends` steal `counters_matter`'s job, or `vehicles` steal `artifacts_matter`'s job — each was checked against the other's real corePatterns/commander text and reward-category vocabulary, not assumed disjoint, with an explicit disjointness test for each pair

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains 6 more declarative records, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028/#029/#030's 15 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `extra_combats: ["combat"]` and `goad: ["combat"]` (the real existing "combat" category — /whenever [^.]* attacks|combat damage|attacking creatures/i — confirmed against two independent real commanders per package: Aurelia's own "Whenever Aurelia attacks..." and Marisi's/Alela's own "...deals combat damage to a player, goad..."); `infect`, `theft`, `superfriends`, and `vehicles` all map to `[]` since no corresponding reward category exists in `forge-interaction-graph.mjs`'s vocabulary for any of them (checked and confirmed the closest near-miss candidate for each: "counters" never fires for a real Superfriends commander's own trigger structure, and "artifacts" never fires for a real Vehicles commander's own payoff clause) — same reasoning as group_hug/stax/typal/burn/mill/wheels/legends/discard/clones/group_slug. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as #028/#029/#030.

Tests: `npm run validate:infect-occupancy`, `validate:extra-combats-occupancy`, `validate:theft-occupancy`, `validate:superfriends-occupancy`, `validate:goad-occupancy`, `validate:vehicles-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Skithiryx, the Blight Dragon; Aurelia, the Warleader; Dragonlord Silumgar; Mila, Crafty Companion; Marisi, Breaker of the Coil; Depala, Pilot Exemplar), plus explicit disjointness tests for superfriends vs. counters_matter (Mila/Vorel of the Hull Clade cross-check, plus an Atraxa-specific check) and vehicles vs. artifacts_matter (Depala/T'Challa, the Black Panther cross-check). All 22 pre-existing `*-package-occupancy` test files (#028's 3, #029's 6, #030's 6, and the original 7 — 108 sub-tests total) plus `validate:founder-026` (26 sub-tests) and `validate:founder-027` (9 sub-tests) re-verified green with zero behavior change to any existing entry — 176 sub-tests total across all 28 occupancy files plus both founder suites. `npm run lint` and `npm run build` both pass — zero lint findings in any changed file (296 pre-existing `@typescript-eslint/no-explicit-any` errors remain in unrelated `worker/*.ts` files, the identical count #030 already documented, untouched by this batch). Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard-failure runs, no hard regressions against the frozen baseline (`later_package_oversupply` 2.481 → 1.231/forge and `beneficial_emergence` 11.24 → 11.462/forge both improved — the identical numbers #029/#030 themselves reported, since the field harness's fixed scenario set does not exercise these 6 new archetypes directly; it exists to prove the shared scoring/conditional-effect-credit machinery this batch touches nowhere is still frozen).

**Live trial:** Not yet run. Harness-gated only, same as #028/#029/#030 — this batch is unproven in front of a real player.

### #032 — Archetype catalog: batch 5, final (neg counters, pillow fort, toughness matters, extra turns, sagas)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 5 new packages can open in default construction. |

**Scope**

Continues #028/#029/#030/#031's declarative catalog schema with the final 5 archetypes by real EDHREC prevalence: -1/-1 Counters (~13k decks), Pillow Fort (~12k), Toughness Matters (~11k), Extra Turns (~11k), Sagas (deliberately narrow-scoped — see below). This completes the original ~26-archetype research scope identified in #028's batch-1 research pass (3 POC + 6 + 6 + 6 + 5 = 26 — see the summary table at the end of this entry). This adds zero new top-level false-friend shapes: `neg_counters` and `pillow_fort` reuse `wrong-target-scope` (two further sub-domains); `toughness_matters` reuses `incidental-rider`; `sagas` reuses `broad-type-superset` directly.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **-1/-1 Counters** (`neg_counters`) — new use of `wrong-target-scope`, a self-cost-vs-payoff scope mismatch (new sub-domain). Core is real -1/-1-counter placement and its payoffs — the archetype's own application shape (Wither itself, genuinely core the same way Infect's own keyword is core for #031's infect) plus real placement/reward engines: Hapatra, Vizier of Poisons ("Whenever you put one or more -1/-1 counters on a creature, create a 1/1 green Snake creature token with deathtouch."), The Scorpion God ("Whenever a creature with a -1/-1 counter on it dies, draw a card."), Auntie Ool, Cursewretch. Deliberately kept disjoint from #028's counters_matter (which requires the literal "+1/+1" substring) and #031's infect (which requires "infect"/"toxic"/"poison counter" text) by construction — verified with real fixtures: Skithiryx, the Blight Dragon's own Infect reminder text literally contains the substring "-1/-1 counters" ("deals damage to creatures in the form of -1/-1 counters"), but the verb is "deals damage ... in the form of," never "put ... on target/another/each," so she never satisfies `neg_counters` corePatterns and does not open the package. False friend: Devoted Druid — "Put a -1/-1 counter on this creature: Untap this creature." — mentions "-1/-1 counter" as broadly as any real payoff card, but the counter targets ITSELF as a mana-ramp activation cost, not a target/another/each creature.
2. **Pillow Fort** (`pillow_fort`) — reuses `wrong-target-scope`, a hard-prevention-vs-taxation scope mismatch (new sub-domain). Core is the defensive taxation shape itself — "creatures can't attack you (or planeswalkers you control) unless their controller pays" (Ghostly Prison, Propaganda, Baird, Steward of Argive, Norn's Annex, Sphere of Safety). This is deliberately the exact real-card shape #030's group_slug documents as its own SUPPORT (Ghostly Prison) and correctly REJECTS as group_slug core (Baird has no "deals damage"/"loses life" clause) — this entry captures that shape as ITS real core identity instead, exercising the task's own overlap allowance (the same real card legitimately occupying different roles in two different archetypes, the precedent #030's Stitcher's Supplier already established). Verified with real fixtures: Baird opens `pillow_fort`; Kaervek the Merciless (group_slug's own commander) has no "attack"/"can't attack" text at all and does not open `pillow_fort`; Baird's own static tax ability has no "whenever ... casts/taps/attacks ... deals damage/loses life" trigger shape and does not open group_slug — checked directly both directions. False friend: Sandwurm Convergence — "Creatures with flying can't attack you or planeswalkers you control." — mentions the same "can't attack you" text as broadly as any real pillow-fort card, but is an absolute ban with no "unless ... pays" taxation clause; its real payoff is a 5/5 Wurm token engine, not the propaganda-tax promise this archetype is scoped to.
3. **Toughness Matters** (`toughness_matters`) — reuses `incidental-rider` (the same shape counters_matter/lifegain/burn/discard/graveyard already use — no type-line concept applies to a stat, and this is not a player-scope mismatch). Core is a real payoff scaling off a creature's toughness specifically — Doran, the Siege Tower ("Each creature assigns combat damage equal to its toughness rather than its power."), Plagon, Lord of the Beach ("draw a card for each creature you control with toughness greater than its power."), Arcades, the Strategist's defender-ETB draw clause. False friend: Blood Lust — "If target creature has toughness 5 or greater, it gets +4/-4 until end of turn. Otherwise, it gets +4/-X until end of turn, where X is its toughness minus 1." — mentions "toughness" as a magnitude-gate condition and even contains the literal substring "where X is its toughness" (which would otherwise satisfy this entry's own corePatterns), but the dominant effect is an unrelated combat-trick/removal pump — the incidental-rider gate excludes her from core before corePatterns is even checked, proving the shape choice is load-bearing here, not decorative.
4. **Extra Turns** (`extra_turns`) — reuses the same grant-vs-negate POLARITY sub-domain #031's infect/extra_combats already established, confirming it is genuinely shared rather than tied to combat-phase text specifically. Core is a real granted extra turn — WotC's fixed templating (Time Warp, Temporal Manipulation, Beacon of Tomorrows: "takes an extra turn after this one."; Time Stretch's "two extra turns" variant) and the real commander fixture Medomai the Ageless ("Whenever Medomai deals combat damage to a player, take an extra turn after this one."). Deliberately distinct from #031's extra_combats (extra COMBAT PHASES within a turn, not extra turns) — kept disjoint by construction and verified with real fixtures: Medomai has no "additional combat phase" text and does not open extra_combats; Aurelia, the Warleader (extra_combats' own commander) has no "extra turn" text at all and does not open `extra_turns`. False friend: Stranglehold — "If an opponent would begin an extra turn, that player skips that turn instead." — mentions "extra turn" as broadly as any real grant, but denies one rather than granting it, a real stax staple (the same real-card class as extra_combats' own Stonehorn Dignitary).
5. **Sagas** (`sagas`) — reuses `broad-type-superset` DIRECTLY from enchantress/legends/vehicles, one Enchantment-subtype layer deeper (every Saga is already an Enchantment by rules text — Enchantment — Saga — the same trap vehicles already proved recurs one Artifact-subtype layer down from artifacts_matter). Core is the Saga enchantment subtype's own chapter-based mechanic specifically — Narci, Fable Singer ("Whenever the final chapter ability of a Saga you control resolves, each opponent loses X life and you gain X life..."), Tom Bombadil (the same trigger shape plus "four or more lore counters among Sagas you control"), Garnet, Princess of Alexandria's lore-counter removal payoff. A deliberately narrow substitute for what EDHREC calls "Historic" (skipped in #031's batch specifically because its literal definition — legendary + artifact + Saga — would have overlapped both #030's legends and #029's artifacts_matter): this is the one clean, non-overlapping third of that tag. NOT generic Enchantment matters (#029's enchantress already owns that) and NOT generic Legendary matters (#030's legends already owns that) — kept disjoint by construction (corePatterns require the literal chapter/lore-counter mechanic, never the bare words "Enchantment" or "Legendary") and verified with the real commander fixture: Narci's own oracle text ALSO reads "Whenever you sacrifice an enchantment, draw a card." — a real enchantment-adjacent clause — but its literal wording ("sacrifice an enchantment") never matches enchantress's own corePatterns (which require "is put into a graveyard from the battlefield," not "sacrifice"), so she does not open enchantress; she has no legendary-permanents-you-control text at all, so she does not open legends either. False friend: The Eldest Reborn — a vanilla Saga whose own reminder text literally says "lore counter" (generic to every Saga ever printed), but never reaches the required "final chapter ability ... resolves" or "lore counter(s) ... Sagas you control" construction — the same double-false-friend outcome (she also legitimately trips enchantress's own broad-type-superset check) vehicles' own Cultivator's Caravan already established for artifacts_matter/vehicles.

**`wrong-target-scope` generalization (no new top-level shape added)** — #032 extends the shape two further ways: a self-cost-vs-payoff scope mismatch (`neg_counters` — a card's own counter placement targets itself as an unrelated activation cost, not a real payoff) and a hard-prevention-vs-taxation scope mismatch (`pillow_fort` — a card denies an action outright rather than pricing it). `extra_turns` reuses #031's existing grant-vs-negate polarity sub-domain unmodified, confirming that sub-domain generalizes past combat-phase text specifically. `toughness_matters` needed no shape extension — it reuses `incidental-rider` exactly as counters_matter/lifegain/burn/discard/graveyard already defined it. `sagas` needed no shape extension either — it reuses `broad-type-superset` exactly as artifacts_matter/enchantress/legends/vehicles already defined it, just with a different `typePattern`.

**Do not fix as**

- 5 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 5 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028/#029/#030/#031's 21 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing/extending where the structure actually matches (2 of 5 extend `wrong-target-scope`'s existing family with two new sub-domains grounded in independent real-card evidence; 1 reuses that same shape's existing grant-vs-negate polarity sub-domain unmodified; 1 reuses `incidental-rider` unmodified; 1 reuses `broad-type-superset` unmodified; zero brand-new top-level shapes this batch)
- letting `pillow_fort` steal `group_slug`'s job, `neg_counters` steal `counters_matter`'s or `infect`'s job, `extra_turns` steal `extra_combats`'s job, or `sagas` steal `enchantress`'s or `legends`' job — each was checked against the others' real corePatterns/commander text, not assumed disjoint, with an explicit disjointness test for every pair the task named

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains the final 5 declarative records, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028/#029/#030/#031's 21 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `neg_counters: ["counters"]` (the real, kind-agnostic "counters" category already in `forge-interaction-graph.mjs`'s PAYOFFS vocabulary — confirmed against real text: Hapatra's own "Whenever you put one or more -1/-1 counters on a creature, create..." trips the same generic "whenever ... counter" branch counters_matter's own commanders trip, the same real category graveyard/reanimator already share honestly); `pillow_fort`, `toughness_matters`, `extra_turns`, and `sagas` all map to `[]` since no "attack tax"/"toughness"/"extra turn"/"Saga chapter" category exists in that vocabulary — checked the one plausible near-miss (extra_turns' own commander fixture Medomai happens to phrase its trigger as "deals combat damage to a player," which textually trips PAYOFFS.combat, but that's a coincidence of one commander's own unlock condition; most real extra-turn cards — Time Warp, Temporal Manipulation, Beacon of Tomorrows — are unconditional and never mention combat at all, so mapping to "combat" would misfire far more than it would connect) — same reasoning as group_hug/stax/typal/burn/mill/wheels/legends/discard/clones/group_slug/infect/theft/superfriends/vehicles. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as every prior batch.

Tests: `npm run validate:neg-counters-occupancy`, `validate:pillow-fort-occupancy`, `validate:toughness-matters-occupancy`, `validate:extra-turns-occupancy`, `validate:sagas-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Hapatra, Vizier of Poisons; Baird, Steward of Argive; Doran, the Siege Tower; Medomai the Ageless; Narci, Fable Singer), plus every disjointness pair the task named, each with real commander/card fixtures: `neg_counters` vs. `counters_matter` vs. `infect` (Hapatra/Vorel of the Hull Clade/Skithiryx, the Blight Dragon), `pillow_fort` vs. `group_slug` (Baird/Kaervek the Merciless, plus an explicit Ghostly-Prison-occupies-two-roles test), `extra_turns` vs. `extra_combats` (Medomai/Aurelia, the Warleader), and `sagas` vs. `enchantress`/`legends` (Narci's own text checked against both). All 28 pre-existing `*-package-occupancy` test files (#028's 3, #029's 6, #030's 6, #031's 6, and the original 7 — 141 sub-tests) plus `validate:founder-026` (26 sub-tests) and `validate:founder-027` (9 sub-tests) re-verified green with zero behavior change to any existing entry — 207 sub-tests total across all 33 occupancy files plus both founder suites. `npm run lint` and `npm run build` both pass — zero lint findings in any changed file (296 pre-existing `@typescript-eslint/no-explicit-any` errors remain in unrelated `worker/*.ts` files, the identical count #030/#031 already documented, untouched by this batch). Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard-failure runs, no hard regressions against the frozen baseline (`later_package_oversupply` 2.481 → 1.231/forge and `beneficial_emergence` 11.24 → 11.462/forge both improved — the identical numbers #030/#031 themselves reported, since the field harness's fixed scenario set does not exercise these 5 new archetypes directly; it exists to prove the shared scoring/conditional-effect-credit machinery this batch touches nowhere is still frozen).

**The full 26-archetype summary (batches #028–#032)**

| Batch | Founder Issue | Archetype IDs |
|---|---|---|
| 1 (POC) | #028 | `artifacts_matter`, `counters_matter`, `group_hug` |
| 2 | #029 | `lifegain`, `lands_matter`, `burn`, `enchantress`, `mill`, `wheels` |
| 3 | #030 | `legends`, `discard`, `graveyard`, `clones`, `flying`, `group_slug` |
| 4 | #031 | `infect`, `extra_combats`, `theft`, `superfriends`, `goad`, `vehicles` |
| 5 (final) | #032 | `neg_counters`, `pillow_fort`, `toughness_matters`, `extra_turns`, `sagas` |

**Live trial:** Not yet run. Harness-gated only, same as #028/#029/#030/#031 — this batch is unproven in front of a real player.

### #033 — Archetype catalog: batch 6, deferred bucket part 1 (energy, populate, monarch, anthems, devotion, cascade)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 6 new packages can open in default construction. |

**Scope**

#032 completed the original ~26-archetype research scope (3 POC + 6 + 6 + 6 + 5 = 26). #033 begins a further, deliberately lower-prevalence "deferred" bucket with the next 6 archetypes: Energy, Populate, Monarch, Anthems, Devotion, Cascade. This adds zero new top-level false-friend shapes: energy, populate, and anthems extend `wrong-target-scope` (three further sub-domains — bare-word-vs-mana-symbol, an object-type mismatch reused from clones in the opposite direction, and an object-subtype mismatch); devotion opens a fourth `wrong-target-scope` sub-domain (gating-clause-vs-scaling-reward, grounded in the entire Theros god cycle, not a one-off); monarch and cascade reuse `incidental-rider` unmodified, the same gated-rider shape counters_matter/lifegain/burn/discard/graveyard/toughness_matters already use.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **Energy** (`energy`) — new use of `wrong-target-scope`, a bare-word-vs-mana-symbol mismatch (new sub-domain). Core is the {E} resource pool itself — producing it (Nissa, Worldsoul Speaker: "Landfall — Whenever a land you control enters, you get {E}{E}.") and spending it (Dr. Madison Li: "Whenever you cast an artifact spell, you get {E}. {T}, Pay {E}{E}{E}: Draw a card."). Unlike a type line, the {E} symbol is precise and virtually never appears for anything unrelated — the same way Infect's own keyword genuinely IS #031's core, not demoted to support. False friend: Death Tyrant's own ability name "Negative Energy Cone" mentions "energy" as broadly as any real payoff card, but never uses the {E} symbol anywhere — its actual effect is an unrelated death-trigger token maker. Checked disjointness against neg_counters/counters_matter per the task's explicit ask, even though the mechanism is structurally different: counters_matter's own corePatterns all require the literal "+1/+1" substring and neg_counters' all require "-1/-1", neither of which any real {E} card's text ever contains, and neither archetype's own real commander (Vorel of the Hull Clade; Hapatra, Vizier of Poisons) ever says "{E}" — verified directly, not assumed. A single real card can still legitimately occupy both (Longtusk Cub spends energy for a permanent +1/+1 counter) without breaking commander-level disjointness, the same multi-role allowance #030's Stitcher's Supplier precedent established.
2. **Populate** (`populate`) — new use of `wrong-target-scope`, reusing #030's object-type-mismatch sub-domain (clones' own spell-vs-creature mismatch) from the opposite direction. Core is the Populate keyword itself — Ghired, Conclave Exile ("Whenever Ghired attacks, populate."), Trostani, Selesnya's Voice ("{1}{G}{W}, {T}: Populate."). CRITICAL overlap risk named by the task: #030's clones already covers creature-copying broadly. Kept disjoint by construction, not by empirical luck: clones' own corePatterns require the determiner "target"/"another"/"any" immediately before "creature", while every real Populate card's own reminder text uses the determiner "a" instead ("a copy of A creature token you control") — "a" never satisfies "target"/"another"/"any". False friend: Rite of Replication ("Create a token that's a copy of target creature.") — clones' own real core card is populate's own false friend, directly proving the two promises don't overlap, the same way #030's group_slug used burn's own Guttersnipe. Verified both directions with real fixtures: Ghired's and Trostani's own oracle text opens populate but not clones; Sakashima of a Thousand Faces (clones' own commander) has no "populate" text and does not open populate.
3. **Monarch** (`monarch`) — reuses `incidental-rider`. Core is the Monarch mechanic itself — becoming the monarch and reward clauses conditioned on holding the crown (Queen Marchesa; the Throne of Eldraine Court cycle's own "become the monarch... if you're the monarch, [bigger payoff]" shape). False friend: Fight for the Throne — a fight-style removal spell whose monarch grant is a minor rider gated behind an unrelated commander-control condition, structurally identical to counters_matter's/burn's own gated-rider precedent. No real hate/negation card for Monarch was found among 61 real printed "monarch" cards checked directly — Jared Carthalion's own "You can't become the monarch this turn." sits on a card whose OTHER ability is itself a genuine core-matching payoff, so the card as a whole is core, not a clean false friend; Fight for the Throne is the one real card whose dominant identity is unambiguously not the archetype.
4. **Anthems** (`anthems`) — new use of `wrong-target-scope`, an object-subtype mismatch (new sub-domain). Core is a real STATIC team-wide pump — Elesh Norn, Grand Cenobite ("Other creatures you control get +2/+2."). CRITICAL overlap risk named by the task, required this round: the original 10 PACKAGE_CATALOG's own `tokens` entry. Kept disjoint by construction: every corePattern requires the literal word "creatures" immediately before "you control get/have". False friend and overlap proof in one real card: Intangible Virtue ("Creature tokens you control get +1/+1 and have vigilance.") — the substring "creatures you control get" never appears (the actual adjacent words are "tokens you control get"), so corePatterns never match; the same real card is genuine SUPPORT for tokens (trips tokens' own token_payoff semantic, `/tokens? you control/i`, directly) and a FALSE FRIEND here — the same real card legitimately occupying two different roles in two different archetypes. Verified at the commander level too: Elesh Norn's pure-anthem text has zero "token" mentions and does not open tokens (confirmed against `detectTokensCommander`'s own literal requirement); Krenko, Mob Boss (a real tokens commander) has zero "+X/+X" text and does not open anthems.
5. **Devotion** (`devotion`) — new use of `wrong-target-scope`, a gating-clause-vs-scaling-reward mismatch (new sub-domain, grounded in the whole Theros god cycle, not a one-off). Core is a real devotion-COUNT payoff — Anax, Hardened in the Forge ("Anax's power is equal to your devotion to red."), Gray Merchant of Asphodel ("each opponent loses X life, where X is your devotion to black."). False friend: every Theros god shares the identical "As long as your devotion to [color] is less than five, ~ isn't a creature." templating — Purphoros, God of the Forge mentions "devotion to red" as broadly as any real payoff card, but that clause is purely a creature/noncreature status toggle, and his own actual value engine ("Whenever another creature you control enters, Purphoros deals 2 damage to each opponent.") has nothing to do with devotion count at all — confirmed against six independent real gods sharing the exact same gating text (Heliod, Xenagos, Thassa, Iroas, Mogis, Klothys), not a single-card coincidence.
6. **Cascade** (`cascade`) — reuses `incidental-rider`. Core is the Cascade keyword itself, having it or granting it (Maelstrom Wanderer: "Cascade, cascade"; Imoti, Celebrant of Bounty: "Cascade. Spells you cast with mana value 6 or greater have cascade."). A negative lookbehind excludes the reactive phrase "a spell WITH cascade" (referencing someone else's spell) from corePatterns, distinct from "Cascade" as a standalone keyword or "have/has/gain cascade" as a grant. False friend: Rain of Riches — "create two Treasure tokens... The first spell you cast each turn that mana from a Treasure was spent to cast has cascade." — a real Treasure-token enchantment whose cascade grant is gated behind an unrelated Treasure-spending condition, structurally identical to counters_matter's/burn's own gated-rider precedent. Support: The First Doctor's own "Whenever you cast a spell with cascade, put a +1/+1 counter..." rewards a cascade-dense deck without itself carrying or granting the keyword — the same byproduct-of-the-mechanic role #031's goad entry established for Kardur, Doomscourge's second ability.

**`wrong-target-scope` generalization (no new top-level shape added)** — #033 extends the shape four further ways: a bare-word-vs-mana-symbol mismatch (energy), a reuse of #030's object-type-mismatch sub-domain from the opposite direction (populate), an object-subtype mismatch (anthems), and a gating-clause-vs-scaling-reward mismatch grounded across six independent real cards (devotion). `monarch` and `cascade` needed no shape extension at all — both reuse `incidental-rider` exactly as counters_matter/lifegain/burn/discard/graveyard/toughness_matters already defined it.

**Do not fix as**

- 6 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 6 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028/#029/#030/#031/#032's 26 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing/extending where the structure actually matches (4 of 6 extend `wrong-target-scope`'s existing family with new or reused sub-domains grounded in independent real-card evidence; 2 reuse `incidental-rider` unmodified; zero brand-new top-level shapes this batch)
- letting `populate` steal `clones`' job, or `anthems` steal `tokens`' job — each was checked against the other's real corePatterns/commander text and reward-category vocabulary, not assumed disjoint, with an explicit disjointness test for both pairs, exactly as the task required this round

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains 6 more declarative records, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028/#029/#030/#031/#032's 26 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified — the `ARCHETYPE_CATALOG` merge and generic fallback already cover every id-keyed record). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `populate: ["tokens"]` (the real "tokens" reward category, confirmed against two independent real Populate commanders' own reminder text — Ghired's and Trostani's own "a copy of a creature token you control" both trip the literal `/token(?:s)? you control/i` substring directly, a genuine connection since Populate structurally requires you to already control a token, not a coincidence) and `energy`, `monarch`, `anthems`, `devotion`, `cascade` all map to `[]` since no corresponding reward category exists in that vocabulary for any of them — checked the plausible near-miss for each directly (energy's own real commanders' "you get {E}" clauses never trip `PAYOFFS.counters`; anthems' own real commander never trips `PAYOFFS.combat`; devotion's own real commander never trips `PAYOFFS.counters`; cascade's own real commander's reminder text says "When you cast this spell", not "whenever you cast", so it never trips `PAYOFFS.spells`) — same reasoning as group_hug/stax/typal/burn/mill/wheels/legends/discard/clones/group_slug/infect/theft/superfriends/vehicles/pillow_fort/toughness_matters/extra_turns/sagas. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as every prior batch.

Tests: `npm run validate:energy-occupancy`, `validate:populate-occupancy`, `validate:monarch-occupancy`, `validate:anthems-occupancy`, `validate:devotion-occupancy`, `validate:cascade-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Nissa, Worldsoul Speaker; Ghired, Conclave Exile; Queen Marchesa; Elesh Norn, Grand Cenobite; Anax, Hardened in the Forge; Maelstrom Wanderer), plus the two overlap-avoidance pairs the task required this round, each with real commander/card fixtures: `populate` vs. `clones` (Ghired/Trostani vs. Sakashima of a Thousand Faces, plus an explicit Rite-of-Replication-occupies-two-roles test) and `anthems` vs. `tokens` (Elesh Norn/Krenko, Mob Boss, plus an explicit Intangible-Virtue-occupies-two-roles test), and an additional energy vs. counters_matter/neg_counters disjointness check per the task's own explicit ask. All 33 pre-existing `*-package-occupancy` test files (#028's 3, #029's 6, #030's 6, #031's 6, #032's 5, and the original 7 — 207 sub-tests, including both founder suites) re-verified green with zero behavior change to any existing entry — 243 sub-tests total across all 39 occupancy files plus both founder suites after this batch's 36 new sub-tests. `npm run lint` and `npm run build` both pass. Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard-failure runs, no hard regressions against the frozen baseline (the field harness's fixed scenario set does not exercise these 6 new archetypes directly; it exists to prove the shared scoring/conditional-effect-credit machinery this batch touches nowhere is still frozen).

**Live trial:** Not yet run. Harness-gated only, same as #028/#029/#030/#031/#032 — this batch is unproven in front of a real player.

### #034 — Archetype catalog: batch 7, final (cantrips, toolbox, x spells, exile matters, hatebears, spell copy)

| | |
|---|---|
| **Layer** | Strategic / Construction |
| **Status** | Shipped (harness-gated), pending Live Founder Trial |
| **Brain impact** | Yes — 6 new packages can open in default construction. |

**Scope**

#033 began the deferred, lower-prevalence bucket. #034 closes it out with the final 6 archetypes: Cantrips, Toolbox, X Spells, Exile-matters, Hatebears, Spell Copy — completing the full archetype-catalog effort begun at #028 (32 + 6 = 38 archetypes across 7 batches; see the full summary table at the end of this entry). This is the hardest overlap-avoidance round yet: 3 of 6 carried CRITICAL, explicitly-named collision risk (cantrips vs. the original `PACKAGE_CATALOG`'s own `spellslinger`; exile_matters vs. #030's `graveyard`; hatebears vs. BOTH #032's `pillow_fort` and the original `stax`), and a fourth (spell_copy) is a deliberate complementary pair with #030's `clones`. This adds zero new top-level false-friend shapes — all 6 reuse `wrong-target-scope`, the same shape that has now absorbed every sub-domain across 7 batches without needing a 5th top-level shape.

For each, the false-friend shape was decided by structural fit, not by defaulting to a new shape per archetype:

1. **Cantrips** (`cantrips`) — new use of `wrong-target-scope`, an Nth-spell-mention-vs-draw-reward sub-domain. Core is cheap, replacement-value spells (Opt: "Scry 1. ... Draw a card."; Preordain; Consider) and the payoff for casting many of them (Jori En, Ruin Diver: "Whenever you cast your second spell each turn, draw a card."; Kraum, Violent Cacophony). CRITICAL overlap risk named by the task: the original `spellslinger` package's own `coreSemantics: ["cheap_spell"]` already covers ANY instant/sorcery with mana value ≤ 2, regardless of text. Card-level overlap here is real and legitimate — every real cantrip is inherently also spellslinger fuel, the same graveyard/reanimator precedent #030 already established — but commander-level detection is clean: Jori En's and Kraum's own real trigger text says "cast your second spell" (bare "spell", no type word), so it never trips `detectSpellslingerCommander`'s own requirement for the literal words "instant"/"sorcery"/"noncreature"/magecraft/"copy target instant or sorcery" — verified directly, not assumed. False friend: Kalamax, the Stormsire mentions the identical "cast your Nth spell each turn" construction but rewards a COPY (spell_copy's own real territory below), not a draw.
2. **Toolbox** (`toolbox`) — new use of `wrong-target-scope`, a generic-tutor-vs-type-conditioned-search sub-domain. Core is a versatile, TYPE-CONDITIONED search as the deck's own repeatable answer-fetching plan — Prime Speaker Vannifar (the modern Birthing Pod as a commander: "Search your library for a creature card with mana value equal to 1 plus the sacrificed creature's mana value, put that card onto the battlefield..."), Yisan, the Wanderer Bard, Trinket Mage, Fauna Shaman — deliberately distinct from generic tutoring, which the task named as already SUPPORT in several existing archetypes. False friend: Demonic Tutor — "Search your library for a card, put that card into your hand, then shuffle." — mentions "search your library for" as broadly as any real toolbox card, but has no type/characteristic qualifier at all, an unconditional any-card tutor.
3. **X Spells** (`x_spells`) — new use of `wrong-target-scope`, the same grant-vs-negate POLARITY mismatch #031's infect/extra_combats and #033's extra_turns already established. No CRITICAL overlap risk was named for this entry. Core is a real payoff scaling off casting spells with {X} in their own mana cost — Zaxara, the Exemplary ("Whenever you cast a spell with {X} in its mana cost, create a 0/0 green Hydra creature token, then put X +1/+1 counters on it."), Zimone, Infinite Analyst, Nev, the Practical Dean. False friend: Frontline Medic — "Sacrifice this creature: Counter target spell with {X} in its mana cost." — mentions "{X} in its mana cost" as broadly as any real payoff, but COUNTERS an X spell rather than rewarding one, hate rather than the archetype's own promise.
4. **Exile-matters** (`exile_matters`) — new use of `wrong-target-scope`, the same general mention-vs-precise-scope evaluator, grounded in a fresh real-card pair. Core is impulse draw and the exile zone as a real resource — Prosper, Tome-Bound ("exile the top card of your library. ... you may play that card. ... Whenever you play a card from exile, create a Treasure token."), Laelia, the Blade Reforged, Urabrask, Heretic Praetor. CRITICAL overlap risk named by the task: #030's graveyard already covers "alternate zone as a resource". Kept disjoint by construction, verified with real fixtures, not assumed: exile_matters' own corePatterns require the literal "exile the top ... you may play/cast" or "whenever you play a card from exile" construction, never satisfied by graveyard's own delirium/threshold/flashback/escape/"cast ... from your graveyard" wording. The sharpest real proof is Kroxa, Titan of Death's Hunger — graveyard's own documented Escape fixture — whose cost text literally contains the word "exile" ("Exile five other cards from your graveyard") but is graveyard's own escape mechanic, not this archetype's impulse-draw promise; verified he opens graveyard and not exile_matters, and Prosper/Laelia/Urabrask's own text never trips graveyard's corePatterns either.
5. **Hatebears** (`hatebears`) — new use of `wrong-target-scope`, mention pattern deliberately as broad as stax's own `detectStaxCommander` regex, required scope narrowed to hard denial only. Core is a real hard-denial restriction, broad-spectrum and creature-shaped — Iona, Shield of Emeria ("Your opponents can't cast spells of the chosen color."), Gaddock Teeg, Meddling Mage, Grand Abolisher, Aven Mindcensor, Containment Priest. CRITICAL overlap risk named by the task: BOTH #032's pillow_fort (attack-taxation specifically) and the original `stax` package. Kept disjoint against both, verified with real fixtures: Baird, Steward of Argive / Ghostly Prison (pillow_fort's own attack-tax territory) trips the broad mention ("can't attack") but fails the hard-denial required scope; a Vryn-Wingmare/Thalia-style symmetric mana tax and Winter Orb's own untap tax (stax's own territory) both trip the broad mention ("cost more to cast", "can't ... untap") but fail the same required scope. Verified the reverse direction too: Iona's/Gaddock Teeg's own real text never trips `detectStaxCommander` at all and never trips pillow_fort's own corePatterns (no "attack" text in either).
6. **Spell Copy** (`spell_copy`) — new use of `wrong-target-scope`, reusing #030's object-TYPE-mismatch sub-domain (clones' own spell-vs-creature mismatch) from the opposite direction, the same reuse #033's populate already established for the clones/populate pair. Core is copying instants/sorceries specifically — Twincast ("Copy target instant or sorcery spell. You may choose new targets for the copy."), Kalamax, the Stormsire, Stella Lee, Wild Card. This is the NATURAL complementary pair the task named: #030's clones already documents Twincast as ITS OWN false friend ("the object being copied is a SPELL, not a creature/permanent"). This entry grounds its own core in exactly that rejected card, proving both archetypes' boundaries from opposite directions with the same real card. False friend: Sakashima of a Thousand Faces / Progenitor Mimic (clones' own real core fixtures) mention "copy" as broadly as any real spell-copy card, but copy a CREATURE, not a spell — verified symmetrically: both fail spell_copy's corePatterns and are flagged as false friends, while Twincast fails clones' own corePatterns and is flagged as clones' false friend (already true in the shipped code, confirmed unchanged).

**`wrong-target-scope` generalization (no new top-level shape added)** — #034 extends the shape with 6 further sub-domains (Nth-spell-mention-vs-draw-reward for cantrips; generic-tutor-vs-type-conditioned-search for toolbox; a fresh grant-vs-negate polarity pairing for x_spells; a fresh mention-vs-precise-scope pairing against graveyard's escape wording for exile_matters; a broad-tax-vs-hard-denial mismatch verified against two neighbors at once for hatebears) and one direct reuse from the opposite direction of #030's own object-type-mismatch sub-domain (spell_copy). Zero new top-level shapes across all 38 archetypes and 7 batches — the shape has now absorbed roughly 18 sub-domains without ever needing a genuinely new top-level structure.

**Do not fix as**

- 6 more bespoke hand-written detector functions
- a name/commander-specific branch anywhere in the 6 entries
- editing any of the existing 10 `PACKAGE_CATALOG` entries or #028–#033's 32 `ARCHETYPE_CATALOG` entries "for consistency"
- a new false-friend shape per archetype instead of reusing/extending where the structure actually matches (all 6 reuse `wrong-target-scope`; zero brand-new top-level shapes this batch, the same discipline #033 already held)
- letting `cantrips` steal `spellslinger`'s job, `exile_matters` steal `graveyard`'s job, or `hatebears` steal `pillow_fort`'s or `stax`'s job — each was checked against the other's real corePatterns/commander text and reward-category vocabulary, not assumed disjoint, with explicit disjointness tests for every named pair
- treating `spell_copy`/`clones` as a collision to avoid rather than the complementary pair it actually is — both boundaries are proven with the same real card (Twincast) from opposite directions

**Legal next step (done 2026-08-19)**

`app/archetype-catalog.mjs` gains the final 6 declarative records, using the same `corePatterns`/`supportPatterns`/`falseFriendShape`/`falseFriendConfig`/`commander.oraclePatterns`/`note.aliases` contract as #028–#033's 32 entries and the same generic dispatch in `strategic-intent.mjs` (unmodified — the `ARCHETYPE_CATALOG` merge and generic fallback already cover every id-keyed record). `package-plan-optimizer.mjs`'s `PACKAGE_RELEVANT_REWARDS` gets `cantrips: ["spells"]`, `x_spells: ["spells"]`, and `spell_copy: ["spells"]` (the real "spells" reward category already in `forge-interaction-graph.mjs`'s PAYOFFS vocabulary — confirmed against each archetype's own real commanders' literal "whenever you cast" trigger text, not assumed) and `exile_matters: ["exile_play"]` (the real, purpose-built `exile_play` category — confirmed against Prosper's own "Whenever you play a card from exile, create a Treasure token."); `toolbox` and `hatebears` both map to `[]` since no "tutor"/"search library" or "disruption"/"taxation" category exists in that vocabulary — checked the plausible near-miss for hatebears directly (Iona's/Gaddock Teeg's own real text never trips `PAYOFFS.spells` either, since both read "opponents can't cast", a denial, never "whenever you cast") — same reasoning as every prior batch's own `[]` entries. `BLUEPRINT_MECHANICS` in `blueprint-note-and-mana.mjs` stays untouched, same as every prior batch.

Tests: `npm run validate:cantrips-occupancy`, `validate:toolbox-occupancy`, `validate:x-spells-occupancy`, `validate:exile-matters-occupancy`, `validate:hatebears-occupancy`, `validate:spell-copy-occupancy` — each with commander-path, note-path, core/false-friend/support unit coverage, and one live `forgeNativeMasterwork` construction test against a real, Scryfall-verified commander (Jori En, Ruin Diver; Prime Speaker Vannifar; Zaxara, the Exemplary; Prosper, Tome-Bound; Iona, Shield of Emeria; Kalamax, the Stormsire), plus every disjointness pair the task named, each with real commander/card fixtures: `cantrips` vs. `spellslinger` (Jori En/Kraum vs. a real spellslinger magecraft commander, plus an explicit Opt-occupies-two-roles test proving the legitimate card-level co-occupancy), `exile_matters` vs. `graveyard` (Prosper/Laelia vs. Muldrotha, the Gravetide, plus an explicit Kroxa-occupies-two-roles test), `hatebears` vs. BOTH `pillow_fort` and `stax` (Iona/Gaddock Teeg vs. Baird, Steward of Argive AND a Grand-Arbiter-style stax commander, plus explicit Baird- and Winter-Orb-occupy-two-roles tests), and `spell_copy` vs. `clones` proven symmetrically (Kalamax/Stella Lee vs. Sakashima of a Thousand Faces, plus explicit Twincast- and Progenitor-Mimic-occupy-two-roles tests in both directions). All 45 pre-existing `*-package-occupancy` test files (#028's 3, #029's 6, #030's 6, #031's 6, #032's 5, #033's 6, and the original 7 — 255 sub-tests) plus `validate:founder-026` (26 sub-tests) and `validate:founder-027` (9 sub-tests) re-verified green with zero behavior change to any existing entry — 290 sub-tests total across all 45 occupancy files plus both founder suites, confirmed via `ls tests/*-package-occupancy.test.mjs | wc -l` = 45. `npm run lint` and `npm run build` both pass — zero lint findings in any changed file (the same pre-existing `@typescript-eslint/no-explicit-any` findings in unrelated `worker/*.ts` files remain, untouched by this batch; `app/archetype-catalog.mjs`, `app/package-plan-optimizer.mjs`, and all 6 new test files are lint-clean). Field: `npm run validate:harness:field` — 104 forges, pass rate 100%, 0 hard-failure runs, no hard regressions against the frozen baseline (`later_package_oversupply` 2.481 → 1.231/forge and `beneficial_emergence` 11.24 → 11.462/forge both improved — the field harness's fixed scenario set does not exercise these 6 new archetypes directly; it exists to prove the shared scoring/conditional-effect-credit machinery this batch touches nowhere is still frozen).

**The full 38-archetype summary (batches #028–#034, complete)**

| Batch | Founder Issue | Archetype IDs |
|---|---|---|
| 1 (POC) | #028 | `artifacts_matter`, `counters_matter`, `group_hug` |
| 2 | #029 | `lifegain`, `lands_matter`, `burn`, `enchantress`, `mill`, `wheels` |
| 3 | #030 | `legends`, `discard`, `graveyard`, `clones`, `flying`, `group_slug` |
| 4 | #031 | `infect`, `extra_combats`, `theft`, `superfriends`, `goad`, `vehicles` |
| 5 | #032 | `neg_counters`, `pillow_fort`, `toughness_matters`, `extra_turns`, `sagas` |
| 6 | #033 | `energy`, `populate`, `monarch`, `anthems`, `devotion`, `cascade` |
| 7 (final) | #034 | `cantrips`, `toolbox`, `x_spells`, `exile_matters`, `hatebears`, `spell_copy` |

38 archetype-catalog entries (3 + 6 + 6 + 6 + 5 + 6 + 6 = 38) plus the original 10 hand-authored `PACKAGE_CATALOG` entries = 48 total packages the Brain can open. Zero new top-level false-friend shapes were ever needed past #028's original 3 (`broad-type-superset`, `incidental-rider`, `excluded-by-tag`) plus #030's `wrong-target-scope` — 4 shapes covering all 38 archetypes across 7 batches.

**Live trial:** Not yet run. Harness-gated only, same as #028–#033 — this batch is unproven in front of a real player.

### Engine-side trial verification (2026-08-19)

Not a real player's Live Founder Trial (no human at the table yet — that status above still stands, honestly) — a construction-density spot-check run directly against the shipped engine (`forgeNativeMasterwork`, same code as production) with 5 real commanders spanning 5 archetypes across different batches: T'Challa, the Black Panther (`artifacts_matter`, #027/#028), Muldrotha, the Gravetide (`graveyard`, #030), Baird, Steward of Argive (`pillow_fort`, #032), Iona, Shield of Emeria (`hatebears`, #034), Prosper, Tome-Bound (`exile_matters`, #034).

First-pass read (skimming the resulting 100-card lists by eye) flagged `hatebears` and `exile_matters` as possibly under-represented — real payoff cards present, but seemingly outnumbered by generic value. That read was wrong. Instrumented tracing of `chooseSpells`' package-anchor-reservation loop (`strategicIntent.packages` → `cardSatisfiesPackageCore` → `addCandidate`) against the real Scryfall-legal pool for each commander's color identity showed:

- `hatebears` (mono-white, Iona): 9 real corePattern-matching cards existed in the pool the engine actually saw; all 9 got anchor-reserved (`addCandidate` succeeded for each); all 9 shipped in the final 100.
- `exile_matters` (Rakdos, Prosper): 8 real corePattern-matching cards existed; all 8 shipped in the final 100.

Both are a 100% capture rate at the intended density target, identical to the "strong"-read archetypes. The apparent gap was an investigator error — a long decklist skimmed by eye, where a payoff card's real function (Myrel, Shield of Argive; Voice of Victory) doesn't visually announce itself as archetype-relevant the way a card like "Ghostly Prison" does. No code changed as a result of this pass — there was nothing to fix.

**Why this is worth recording anyway:** it's real evidence the package-anchor-reservation mechanism itself works correctly end to end for at least 5 of the 38 archetypes, on top of the harness/unit-test evidence #028–#034 already had. It does not substitute for an actual player's Live Founder Trial — that remains the honest open item for all 32 issues in this thread.

---

## How to add the next issue

1. Capture evidence.  
2. If failure mode unclear → **Unknown / Needs reproduction**.  
3. Reproduce → classify → fix.  
4. `Shipped` after tests → **Live Founder Trial** → **`Founder Confirmed`** after players.

---

*Last updated: 2026-08-19 — #034 shipped: archetype-catalog batch 7, the FINAL batch, closing out both the deferred lower-prevalence bucket #033 began and the entire archetype-catalog effort begun at #028 (32 + 6 = 38 archetypes across 7 batches — see the full summary table in #034). Adds 6 more declarative packages (cantrips, toolbox, x_spells, exile_matters, hatebears, spell_copy), the hardest overlap round yet: 3 of 6 carried CRITICAL named collision risk (cantrips vs. the original `spellslinger` package, exile_matters vs. #030's `graveyard`, hatebears vs. BOTH #032's `pillow_fort` and the original `stax`), plus a deliberate complementary pair (spell_copy grounded in Twincast, #030's clones' own documented false friend, proving both boundaries from opposite directions with the same real card). Zero new top-level false-friend shapes — all 6 reuse `wrong-target-scope`, verified against every named neighbor with real, Scryfall-verified fixtures (Jori En/Kraum vs. spellslinger; Prosper/Laelia vs. Muldrotha and Kroxa; Iona/Gaddock Teeg vs. Baird and a stax commander; Kalamax/Stella Lee vs. Sakashima/Progenitor Mimic). 104-forge field: pass 100%, hard failures 0, no hard regressions against the frozen baseline. All 39 pre-existing archetype/package occupancy tests (255 sub-tests) plus both founder suites (35 sub-tests) re-verified green with zero behavior change to any existing entry — 290 sub-tests total across all 45 occupancy files plus both founder suites after this batch's 47 new sub-tests. `npm run lint`/`npm run build` both pass with zero findings in any changed file. Also this date: an engine-side trial verification pass (5 real commanders across 5 archetypes, see the section under #034) found no construction bug — an initial "hatebears/exile_matters look thin" read was an investigator misread of a long decklist, corrected by instrumented tracing showing 100% real-candidate capture for both. No code changed. Still not a substitute for an actual player's Live Founder Trial, which remains open for all 32 issues in this thread.*
