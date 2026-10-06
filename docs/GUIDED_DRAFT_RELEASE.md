# Guided draft recovery — release candidate

Prepared October 5, 2026 from MetaForge-Web main `be8d221`. The owner confirmed that the PC has no unpublished changes.

## Behavior

One guided draft per verified account contains the commander, shell, accepted and declined cards, manual card evidence, category progress, and build preferences. Account updates compare revisions atomically. Local browser copies are scoped to the verified account. Differing copies require an explicit choice; discarding is confirmed. Temporary card pools can be refreshed without discarding picks.

Finish saves a stable request and deck grouping ID before generating. Concurrent retries retrieve the same durable result. Missing or newly unavailable picks produce an actionable failure instead of silently disappearing. Interrupted finishes retain the draft and can recover after a 15-minute lease; revision guards prevent late requests overwriting recovery.

Search distinguishes loading, no matches, and service failure and cancels obsolete requests. Completed reviews separate player picks from Forge additions, show live legality and price uncertainty, check requested filters against current card evidence, and reuse existing coaching. Reviews persist in the private deck bench.

## Validation

Production build passes. All 105 targeted automated checks pass. They cover account isolation, atomic conflicts, discard tombstones, concurrent and repeated finishes, missing picks, interrupted recovery, late request fencing, the existing guided flow and manual cards, import generation, rendered pages, and review rendering.

Migration `0018_guided_drafts.sql` has been applied to the isolated local database only. The generated production configuration was checked to contain one real account database binding and no placeholder binding.

The repository-wide TypeScript check currently reports errors, including missing global Cloudflare D1 types and unrelated app type mismatches. It is not a passing release check. The production compiler and behavioral tests pass independently.

## Remaining release steps

1. Owner authorizes Cloudflare CLI login. Automatic approval review blocked the initial attempt because persistent Workers/routes/D1 write access needs explicit authorization.
2. Verify the existing account, live worker version, bindings and applied remote migrations. Preserve existing secrets and authentication settings.
3. Complete a signed-in desktop/mobile walkthrough: resume, search failure, pool refresh, finish, review, export, and reload. Check a second device conflict. Automated rendering is not a substitute for this human walkthrough.
4. Apply migration 0018 to the real account database, deploy the reviewed build to the existing worker, and verify production routing and authenticated draft endpoints. Do not claim this happened before verification.

Migration 0018 is additive. Rolling back the worker does not require deleting saved draft data. Retain the prior worker version for rollback.
