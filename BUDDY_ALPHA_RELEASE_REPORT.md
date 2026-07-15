# Buddy Alpha Release Candidate Report

Date: 2026-07-15

## Automated status

- Production build: PASS
- Regression suite: 43/43 PASS
- Access-protected account and feedback endpoints: PASS
- Account isolation and stale-device conflict protection: PASS
- Exact deck fingerprint and revision evidence isolation: PASS
- Standard legality, fetch-land, landfall, simulation, and recommendation-contract checks: PASS
- Server-rendered onboarding, recovery export, privacy, Bench, and feedback surfaces: PASS

## Release-candidate capabilities

- Guided first-session flight check and Companion failure diagnosis.
- Account-backed Deck Bench with local fallback, last-backup visibility, and JSON export.
- Immutable deck versions, exact Arena match attribution, progression, promotion, revert, archive, and restore.
- Strategic recommendation contracts and named runner-up experiments.
- Contextual private founder feedback.

## Manual founder gates still required before sending invitations

- Complete the fresh-browser acceptance run in `BUDDY_ALPHA_ROADMAP.md` twice.
- Confirm a real Arena match arrives while the current Companion v0.2.1 is running.
- Restore the same account on a second browser and inspect the exported JSON.
- Submit a real feedback item and confirm owner-side receipt.
- Record and resolve any point where the founder needs hidden technical knowledge.

## Decision

This build is a buddy-alpha release candidate. It is ready for founder acceptance testing, but buddy invitations should remain paused until the manual gates above pass.
