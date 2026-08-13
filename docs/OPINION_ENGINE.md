# Opinion Engine v0

**Status:** first vertical slice · shadow only · `writesToBrain: false`

The Opinion Engine joins MetaForge's existing observation and judgment layers into a persistent, contextual stance. It answers:

> Given this exact question, commission, deck revision, and evidence, what does MetaForge currently believe — and what would change its mind?

It does not select cards, mutate construction weights, treat fixture data as live truth, or bypass the Intelligence Constitution's promotion ladder.

## Record flow

```text
Player question
  -> StrategicQuestionContext
  -> scoped OpinionClaims (support / oppose / uncertain)
  -> StrategicOpinionRecord
  -> MentorOpinionPresentation
  -> proposed controlled observation
  -> versioned opinion revision
```

Every opinion preserves its verdict, confidence, strongest counterargument, applicable context, falsifiers, evidence provenance, independence discount, and revision lineage. Copied claims from one source do not masquerade as independent confirmation.

When confidence is `insufficient`, Mentor headlines use lean language (“leans toward / leans against … but needs exact-revision evidence”) instead of settled “recommends / recommends against.” Weak evidence may still preserve direction without reading as a settled recommendation.

## Evidence authority

Source authority is explicit and contextual. Oracle mechanics and the player's commission are strong evidence for what a card does and what the deck must honor. Tournament, expert, play, structural, and simulation evidence answer different questions and remain distinguishable.

Tournament-shaped fixture corpus evidence is deliberately weak and confidence-capped. It proves the import and evaluation path works; it does not establish live Commander truth.

## First proof path

`buildJayDoublingSeasonOpinion()` evaluates whether Jay's Atraxa Superfriends commission should retain Doubling Season. It reaches a recommendation because the card is a named commission anchor and mechanically advances the requested planeswalker experience. It also retains the serious counterargument: a five-mana setup enchantment creates a vulnerable commitment window.

The result proposes an exact-revision observation rather than learning from an anecdote. The opinion may be revised after evidence, but it still has no Brain inheritance.

## Next slices

Completed in v0.2:

1. Strategic Hypotheses, Strategic Evaluation, play evidence, tournament evidence, and corpus observations adapt into `OpinionClaim` records without losing source class.
2. Opinion revisions have an append-only Archive contract and D1 schema.
3. Authenticated `POST /api/coach/opinion` returns `MentorOpinionPresentation`, archives lineage, and declares `constructionReadOnly: true`. Registered evidence is selected by a server-owned opinion key; matching a card name cannot borrow another player's commission.

Still next:

1. Expand the server-owned claim registry beyond the Jay / Atraxa proof path. Unknown questions deliberately return `unresolved`; callers cannot submit evidence and manufacture a MetaForge belief.
2. Add the product question surface and exact-revision selectors.
3. Evaluate consistency, context sensitivity, calibration, contradiction handling, and reversal quality.
4. Only propose a Laboratory construction experiment after an opinion has replicated. Brain promotion remains a separate reviewed act.
