# MF-DECK-COACH-004 · Public report repair: safety review and runbook

MF-DECK-COACH-003 repaired stored public reports **during ordinary page views** (a Scryfall lookup, then a D1 `UPDATE`, on GET). That has been replaced (`928aa31`):

* **Page views never write and never call Scryfall.** The display is repaired in memory from the bundled type index and each row's `land` role tag. The land count and average mana value are therefore right on every view, before any data repair. Until the stored rows are repaired, cards the bundled index does not know still group as "Other".
* **New reports** are stored with type lines when published (unchanged behaviour: publish already wrote the row).
* **Existing reports** are repaired by an explicit, owner-run, audited script. Nothing in the deployed code writes them.

## Safety requirements, and the evidence for each

All in `tests/public-report-repair.test.mjs` and `tests/public-report-land-count.test.mjs`. The SQL tests run against a real SQLite table (`node:sqlite`).

| Requirement | How it is met | Test |
|---|---|---|
| Existing non-empty type lines are preserved | `needsType` skips any row with a non-empty `typeLine`; that row object is returned untouched | "only empty type lines are filled…" |
| Only intended records are updated | A statement is emitted only for reports with at least one row filled. Each `UPDATE … WHERE slug = ? AND deck_rows_json = <exact exported JSON>` touches only that report. No other column is written | "only reports that need a repair get a statement…"; SQLite test ("the complete report is untouched", `view_count` and `owner_key` unchanged) |
| Repeated page views do not write | The render path has no `UPDATE` and no lookup | "repeated views write nothing and look nothing up" (5 views: 0 writes, 0 lookups, stored JSON byte-identical) |
| Re-running the repair does not write again | After applying, a new plan finds nothing; applying the same SQL twice changes nothing | SQLite test (idempotent) |
| External lookup failures do not corrupt reports | Any failed Scryfall request aborts the whole plan with nothing written. A name Scryfall does not know stays empty (no placeholder). With Scryfall down, pages still render and count lands | "if Scryfall fails, the script stops…"; "a name the lookup cannot resolve stays empty…"; "with Scryfall down…" |
| Existing decklists remain unchanged | Only `typeLine` is added. Names, quantities, roles, mana values and field order are kept | "the decklist itself is unchanged…" (all 64 Baru rows) |
| Repairs can be audited | `audit.json` lists, per report, every name filled and its type line, every unresolved name, and every report left untouched with the reason. `repair.sql` carries one comment per report | "the script plans from a wrangler export…" |
| Backup and rollback | `backup.json` holds every exported report's original JSON. `rollback.sql` restores each repaired report only if it still holds exactly the repaired JSON. Separately: a full `wrangler d1 export` before applying, and D1 Time Travel | SQLite test ("rollback restores it byte for byte") |
| A report edited after the export is not overwritten | The guard includes the exported JSON | "a report edited after the export is not overwritten" |

## Runbook (owner only; every step is manual)

Database: `metaforge-private-alpha-accounts` (binding `DB`). Run in PowerShell from a checkout of the release commit.

**1. Export, read-only.** The script skips a byte-order mark or any status text before the JSON, so plain redirection is fine:

```powershell
npx wrangler d1 execute metaforge-private-alpha-accounts --remote --json --command "SELECT slug, deck_rows_json FROM public_deck_reports" | Out-File -Encoding utf8 reports-export.json
```

**2. Plan.** This writes files only:

```powershell
node scripts/public-reports/repair-type-lines.mjs reports-export.json public-report-repair
```

**3. Review** `public-report-repair\audit.json`. On today's production you should see one report (`baru-wurmspeaker-b35d119648`) with 64 type lines filled and nothing unresolved. Stop if anything else appears unexpectedly.

**4. Full backup** before any write:

```powershell
npx wrangler d1 export metaforge-private-alpha-accounts --remote --output public-report-repair\d1-full-backup.sql
```

Also note the current time for D1 Time Travel:

```powershell
npx wrangler d1 time-travel info metaforge-private-alpha-accounts
```

**5. Apply:**

```powershell
npx wrangler d1 execute metaforge-private-alpha-accounts --remote --file public-report-repair\repair.sql
```

**6. Verify.** `https://metaforge.gg/decks/baru-wurmspeaker-b35d119648` now shows 38 Lands, no "Other" group, and Sol Ring under Artifacts. Re-run step 2 on a fresh export: it should plan 0 updates.

**7. Undo, if needed:**

```powershell
npx wrangler d1 execute metaforge-private-alpha-accounts --remote --file public-report-repair\rollback.sql
```

The last resort is the full export from step 4, or `wrangler d1 time-travel restore` to the time noted in step 4.

Keep `public-report-repair\` (backup, audit, SQL) **outside the repository**: it contains the owners' published decklists as stored.

## Not done (needs owner approval)

* No export, plan or write was run against production. The expected outcome (one report, 64 rows) comes from the public page as rendered.
* The `wrangler` commands above were not run against production. `d1 export` and `time-travel` should be checked against the installed `wrangler` version's `--help` before use.
