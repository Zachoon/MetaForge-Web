# MetaForge Buddy Alpha Roadmap

## Definition of “ready”

Buddy alpha is ready when a newly invited player can sign in, connect Arena, import a legal deck, understand and start a named experiment, play matching games, find the results on the correct revision, recover the deck on another browser, and submit feedback without live help.

## Release gates

### Gate 1 — Arrival and recovery
- Cloudflare Access admits only invited identities.
- Founder Flight Check leads a new user through setup.
- Deck Bench sync shows a clear last-success state.
- Users can export a human-readable JSON backup at any time.
- A local browser copy remains available during a network failure.

### Gate 2 — Companion reliability
- Website distinguishes offline, outdated, logs-disabled, connected, and exact-revision-tracking states.
- Current Companion download is versioned and cannot be replaced by a cached legacy ZIP.
- A completed Arena match appears without manual entry and preserves privacy-safe fields only.

### Gate 3 — Recommendation trust
- Every recommendation names the add/cut or explicitly declines an unsupported substitution.
- Every recommendation explains expected gain, downside, and test threshold.
- Landfall/fetch, legality, deck size, and exact-fingerprint regression tests remain green.
- One match can update coaching but cannot silently rewrite a deck.

### Gate 4 — Experiment continuity
- Original and proposed lists become immutable revisions.
- Results attach only to the exact fingerprint played.
- Progress moves through Proposed, Ready, Testing, Evidence, and Decide.
- Promote, revert, archive, restore, and cross-device merge preserve history.

### Gate 5 — Feedback and privacy
- Every major screen offers contextual founder feedback.
- Feedback never includes full deck contents or raw Arena logs.
- Account records are isolated by hashed Access identity.
- The interface explains what is local, what is synchronized, and what is not used for global learning.

## Founder acceptance run

1. Use a fresh private browser session with an invited identity.
2. Complete onboarding without using developer tools or repository knowledge.
3. Import one known legal deck and one intentionally illegal deck.
4. Start a Forge recommendation and verify both fingerprints are preserved.
5. Play three Arena games with the exact revision and one with a different revision.
6. Confirm only the three exact matches affect the experiment evidence.
7. Open a second browser, confirm restoration, then export the Bench backup.
8. Submit one report in each feedback category and verify database receipt.
9. Record every hesitation as a release issue, even when the workflow technically succeeds.

## Rollout

- Founder-only acceptance: complete the run above twice.
- Three buddies: observe first sessions without coaching; fix all setup blockers.
- Ten testers: evaluate recommendation usefulness and retention, not global win rate.
- Wider alpha: only after privacy copy, recovery, monitoring, and recommendation-quality gates remain stable.

## Explicitly after buddy-alpha readiness

- Broader card-role and interaction graph.
- Current-field ingestion with source provenance and freshness controls.
- Calibrated pilot/matchup modeling for aggregate learning.
- Draft Buddy.
