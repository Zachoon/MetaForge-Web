# Guided draft recovery — release candidate

Prepared October 5, 2026 from MetaForge-Web main `be8d221`. The owner confirmed that the PC has no unpublished changes.

## Behavior

One guided draft per verified account contains the commander, shell, accepted and declined cards, manual card evidence, category progress, and build preferences. Account updates compare revisions atomically. Local browser copies are scoped to the verified account. Differing copies require an explicit choice; discarding is confirmed. Temporary card pools can be refreshed without discarding picks.

Finish saves a stable request and deck grouping ID before generating. Concurrent retries retrieve the same durable result. Missing or newly unavailable picks produce an actionable failure instead of silently disappearing. Interrupted finishes retain the draft and can recover after a 15-minute lease; revision guards prevent late requests overwriting recovery.

Search distinguishes loading, no matches, and service failure and cancels obsolete requests. Completed reviews separate player picks from Forge additions, show live legality and price uncertainty, check requested filters against current card evidence, and reuse existing coaching. Reviews persist in the private deck bench.

## Validation

Production build passes. All 105 targeted automated checks pass. They cover account isolation, atomic conflicts, discard tombstones, concurrent and repeated finishes, missing picks, interrupted recovery, late request fencing, the existing guided flow and manual cards, import generation, rendered pages, and review rendering.

Migration `0018_guided_drafts.sql` has been applied to the isolated local database and the existing remote account database. The generated production configuration was checked to contain one real account database binding and no placeholder binding.

The repository-wide TypeScript check currently reports errors, including missing global Cloudflare D1 types and unrelated app type mismatches. It is not a passing release check. The production compiler and behavioral tests pass independently.

## Deployment verification

The owner explicitly authorized persistent Cloudflare CLI access. OAuth login succeeded with the requested Workers, routes, D1 and account read scopes.

Prior version: `90b6694d-32b6-4821-bfb7-9fb1598b44f2`, deployed September 22, 2026 in America/Los_Angeles. Its plain-text authentication settings match the recovered repository; no source commit annotation was available, so exact source parity was not independently established.

Released source: `c0fdcb8` on `codex/guided-draft-recovery`.
Released worker version: `62639573-aaf7-44d8-86ee-a61535c4c5a3`, tagged `guided-draft-recovery`, October 5, 2026 in America/Los_Angeles.

Wrangler deployment dry run passed, migration 0018 applied successfully, and deployment completed for the existing worker and all three custom domains. Existing secret binding names and the real account database binding were verified after release. No secret values were read.

Live checks passed: homepage HTTP 200; www redirects to the canonical homepage; the released page bundle contains both new endpoint paths; anonymous draft GET and completion POST return JSON 401 without draft data. These are not signed-in end-to-end checks.

## Remaining validation

1. Complete a signed-in desktop/mobile walkthrough: resume, search failure, pool refresh, finish, review, export, and reload. Check a second device conflict. Automated rendering is not a substitute for this human walkthrough.
2. Run the small invited trial and record actual confusion or failures. Do not claim full trial readiness before this happens.

Migration 0018 is additive. Rolling back the worker does not require deleting saved draft data. Retain the prior worker version for rollback.
