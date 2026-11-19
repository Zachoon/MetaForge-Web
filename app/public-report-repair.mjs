// Public deck report repair: fill missing card type lines
// --------------------------------------------------------
// MF-DECK-COACH-004. Reports published from a Forge generation were stored
// with an empty `typeLine` on every row, so the public page counted 0 lands
// and grouped every card as "Other" (the Baru report). This module computes a
// repair and nothing else. It never talks to a database: the owner runs
// scripts/public-reports/repair-type-lines.mjs against an export, reviews the
// audit, and applies the generated SQL by hand.
//
// Rules, each pinned by tests/public-report-repair.test.mjs:
//  * A row that already has a non-empty type line is left exactly as stored.
//  * Only `typeLine` is ever added. Names, quantities, roles, mana values and
//    every other stored field keep their stored values and order.
//  * A name the lookup cannot resolve stays empty and is reported, never
//    filled with a placeholder.
//  * A report with nothing to fill is not touched (no statement is emitted).
//  * Every UPDATE is guarded by the exact stored JSON, so a report that
//    changed after the export is skipped instead of overwritten.

/** True when a stored row has no usable type line. */
export function needsType(row) {
  return Boolean(row && typeof row === "object" && row.name && !(typeof row.typeLine === "string" && row.typeLine.trim()));
}

/** Names across stored rows that have no type line, de-duplicated. */
export function namesNeedingTypes(rows) {
  return [...new Set((Array.isArray(rows) ? rows : []).filter(needsType).map((row) => String(row.name).trim()))];
}

/**
 * @param {unknown[]} rows stored row objects, exactly as parsed from deck_rows_json
 * @param {(name: string) => string | null | undefined} typeFor printed type line for a card name
 */
export function repairReportRows(rows, typeFor) {
  const filled = [];
  const unresolved = [];
  const next = (Array.isArray(rows) ? rows : []).map((row) => {
    if (!needsType(row)) return row;
    const typeLine = String(typeFor(String(row.name).trim()) || "").trim();
    if (!typeLine) {
      unresolved.push(String(row.name));
      return row;
    }
    filled.push({ name: String(row.name), typeLine });
    return { ...row, typeLine };
  });
  return { rows: next, filled, unresolved, changed: filled.length > 0 };
}

/**
 * Plan a repair for exported reports.
 * @param {Array<{ slug: string, deck_rows_json: string }>} reports
 * @param {(name: string) => string | null | undefined} typeFor
 */
export function planRepair(reports, typeFor) {
  const repairs = [];
  const untouched = [];
  for (const report of reports) {
    let rows;
    try {
      rows = JSON.parse(report.deck_rows_json);
    } catch {
      untouched.push({ slug: report.slug, reason: "stored rows are not valid JSON; left as they are" });
      continue;
    }
    const result = repairReportRows(rows, typeFor);
    if (!result.changed) {
      untouched.push({ slug: report.slug, reason: result.unresolved.length ? `${result.unresolved.length} name(s) could not be resolved; nothing else to fill` : "every row already has a type line" });
      continue;
    }
    repairs.push({
      slug: report.slug,
      before: report.deck_rows_json,
      after: JSON.stringify(result.rows),
      filled: result.filled,
      unresolved: result.unresolved,
    });
  }
  return { repairs, untouched };
}

/** SQLite string literal. */
export function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** UPDATE statements, each guarded by the exact stored JSON. */
export function repairSql(plan, { generatedAt = new Date().toISOString() } = {}) {
  const lines = [
    `-- MetaForge public report type-line repair, generated ${generatedAt}`,
    `-- ${plan.repairs.length} report(s) to update. Each statement only matches the row as exported.`,
    "-- Only deck_rows_json changes; no other column is written.",
  ];
  for (const repair of plan.repairs) {
    lines.push(`-- ${repair.slug}: ${repair.filled.length} type line(s) filled${repair.unresolved.length ? `, ${repair.unresolved.length} unresolved` : ""}`);
    lines.push(`UPDATE public_deck_reports SET deck_rows_json = ${sqlString(repair.after)} WHERE slug = ${sqlString(repair.slug)} AND deck_rows_json = ${sqlString(repair.before)};`);
  }
  return `${lines.join("\n")}\n`;
}

/** The inverse: restore each report's exported JSON, only if it still holds the repaired JSON. */
export function rollbackSql(plan, { generatedAt = new Date().toISOString() } = {}) {
  const lines = [
    `-- Rollback for the public report type-line repair generated ${generatedAt}`,
    "-- Each statement only matches a row that still holds exactly the repaired JSON.",
  ];
  for (const repair of plan.repairs) {
    lines.push(`UPDATE public_deck_reports SET deck_rows_json = ${sqlString(repair.before)} WHERE slug = ${sqlString(repair.slug)} AND deck_rows_json = ${sqlString(repair.after)};`);
  }
  return `${lines.join("\n")}\n`;
}

/** Read `wrangler d1 execute --json` output, or a plain array of rows. */
export function reportsFromExport(parsed) {
  const rows = Array.isArray(parsed) && parsed.length && Array.isArray(parsed[0]?.results)
    ? parsed.flatMap((entry) => entry.results)
    : Array.isArray(parsed) ? parsed : [];
  return rows.filter((row) => row && typeof row.slug === "string" && typeof row.deck_rows_json === "string");
}
