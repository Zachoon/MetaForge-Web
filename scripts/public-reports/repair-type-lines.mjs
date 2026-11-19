// Plan a repair of public deck reports stored without card type lines.
// It reads an export and writes files. It never connects to D1.
//
// 1. Export (read-only):
//      npx wrangler d1 execute metaforge-private-alpha-accounts --remote --json
//        --command "SELECT slug, deck_rows_json FROM public_deck_reports" > reports-export.json
// 2. Plan:
//      node scripts/public-reports/repair-type-lines.mjs reports-export.json repair-out
//    writes repair-out/backup.json, audit.json, repair.sql, rollback.sql
// 3. Review audit.json, then apply (owner only):
//      npx wrangler d1 execute metaforge-private-alpha-accounts --remote --file repair-out/repair.sql
// 4. If needed, undo with rollback.sql the same way.
//
// Card types come from Scryfall /cards/collection (the source the app already
// uses). If any lookup request fails, nothing is written: a partial answer
// must not become a partial repair.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { factFor, fetchCardFacts } from "../../app/deck-check-facts.mjs";
import { namesNeedingTypes, planRepair, reportsFromExport, repairSql, rollbackSql } from "../../app/public-report-repair.mjs";

export async function planFromExport(exportJson, { fetchImpl = fetch, generatedAt = new Date().toISOString() } = {}) {
  const reports = reportsFromExport(exportJson);
  const names = [...new Set(reports.flatMap((report) => {
    try { return namesNeedingTypes(JSON.parse(report.deck_rows_json)); } catch { return []; }
  }))];
  const lookup = names.length
    ? await fetchCardFacts(names, { fetchImpl: (url, init) => fetchImpl(url, { ...init, headers: { ...init.headers, "User-Agent": "MetaForge-report-repair/1.0" } }) })
    : { facts: {}, notFound: [], failed: false };
  if (lookup.failed) throw new Error("Scryfall did not answer every request. Nothing was written; run again later.");
  const plan = planRepair(reports, (name) => factFor(lookup.facts, name)?.typeLine || "");
  const audit = {
    generatedAt,
    source: "Scryfall /cards/collection",
    reportsExported: reports.length,
    reportsToUpdate: plan.repairs.length,
    namesLookedUp: names.length,
    notFoundOnScryfall: lookup.notFound,
    repairs: plan.repairs.map((repair) => ({ slug: repair.slug, filled: repair.filled, unresolved: repair.unresolved })),
    untouched: plan.untouched,
  };
  return {
    plan,
    audit,
    backup: { generatedAt, reports: reports.map((report) => ({ slug: report.slug, deck_rows_json: report.deck_rows_json })) },
    repairSql: repairSql(plan, { generatedAt }),
    rollbackSql: rollbackSql(plan, { generatedAt }),
  };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (invokedDirectly) {
  const [exportFile, outDir = "public-report-repair"] = process.argv.slice(2);
  if (!exportFile) {
    console.error("Usage: node scripts/public-reports/repair-type-lines.mjs <wrangler-export.json> [outDir]");
    process.exit(2);
  }
  try {
    const result = await planFromExport(JSON.parse(readFileSync(exportFile, "utf8")));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "backup.json"), `${JSON.stringify(result.backup, null, 1)}\n`);
    writeFileSync(join(outDir, "audit.json"), `${JSON.stringify(result.audit, null, 1)}\n`);
    writeFileSync(join(outDir, "repair.sql"), result.repairSql);
    writeFileSync(join(outDir, "rollback.sql"), result.rollbackSql);
    console.log(`${result.audit.reportsExported} report(s) exported, ${result.audit.reportsToUpdate} to update, ${result.audit.namesLookedUp} name(s) looked up. Review ${join(outDir, "audit.json")} before applying repair.sql.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
