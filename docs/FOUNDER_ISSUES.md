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
| Issues on register | **14** |
| Shipped (tests green) | **11** |
| **Live Founder Trial** | **4 scored runs** (latest: 2026-08-13 · #025 re-trial) |
| **Founder Confirmed** | **9** |
| Open / Planned | **0** |
| Watch (hypothesis only) | 1 (Eldrazi) |
| Awaiting founder confirmation | 4 (#018, #020, #022, #023) |
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
> Concepts · play captures · simulation witness · stance voice. Brain: 0.  
> Continuous observation + Friday heartbeat. **Brain changes: 0.**
>
> #021 and #024 Founder Confirmed (2026-08-12). **#025 shipped (tests)** — awaiting Live Founder Trial.

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
| Strategic | 1 (Eldrazi watch) | 3 (#020, #023, **#024** shipped) |
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
4. Eldrazi / rec priorities stay Watch until repeated signal  
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
| — | Prioritize Theme vs Performance | Strategic / UX | ⏸ **Deferred** | Needs trial evidence of choice-block, not understanding-block |
| — | Eldrazi / default rec priorities | Strategic | 🟡 Watch | One founder = hypothesis |

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

---

## How to add the next issue

1. Capture evidence.  
2. If failure mode unclear → **Unknown / Needs reproduction**.  
3. Reproduce → classify → fix.  
4. `Shipped` after tests → **Live Founder Trial** → **`Founder Confirmed`** after players.

---

*Last updated: 2026-08-12 — Live Founder Trial rubric locked (Understanding · Trust · Discovery · Conversation quality · False positives). Observation sprint closed. Production deploy + rubric-backed trial still open. Brain: 0.*
