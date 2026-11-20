// MF-DECK-COACH-004 — the controlled public-report repair. One test per
// safety requirement: non-empty values preserved, only intended records
// updated, idempotent, lookup failure writes nothing, decklists unchanged,
// auditable, reversible. Offline: Scryfall is a stub backed by the snapshot.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { namesNeedingTypes, planRepair, repairReportRows, repairSql, reportsFromExport, rollbackSql } from "../app/public-report-repair.mjs";
import { planFromExport } from "../scripts/public-reports/repair-type-lines.mjs";

const fixtures = new URL("./fixtures/deck-bench-003/", import.meta.url);
const baruRows = JSON.parse(readFileSync(new URL("baru-public-report.rows.json", fixtures), "utf8")).rows;
const facts = JSON.parse(readFileSync(new URL("baru-public-report.facts.json", fixtures), "utf8")).facts;
const typeFor = (name) => facts[name]?.typeLine || "";

const complete = [
  { quantity: 1, name: "Sol Ring", typeLine: "Artifact", roles: ["ramp"], cmc: 1 },
  { quantity: 30, name: "Forest", typeLine: "Basic Land — Forest", roles: ["land"], cmc: 0 },
];
const exportOf = (reports) => [{ results: reports, success: true, meta: {} }];

// A Scryfall stand-in that answers from the snapshot, or fails on demand.
function scryfall({ down = false } = {}) {
  return async (url, init) => {
    if (down) return new Response("down", { status: 503 });
    const { identifiers } = JSON.parse(init.body);
    const data = identifiers.map(({ name }) => facts[name]).filter(Boolean).map((fact) => ({ name: fact.name, type_line: fact.typeLine, oracle_text: fact.oracleText, mana_cost: fact.manaCost, cmc: fact.cmc, color_identity: fact.colorIdentity, legalities: fact.legalities }));
    const notFound = identifiers.filter(({ name }) => !facts[name]).map(({ name }) => ({ name }));
    return Response.json({ data, not_found: notFound });
  };
}

test("only empty type lines are filled; a stored non-empty value is never changed", () => {
  const rows = [{ quantity: 1, name: "Sol Ring", typeLine: "Artifact — something the owner typed", roles: [], cmc: 1 }, { quantity: 1, name: "Forest", typeLine: "", roles: ["land"], cmc: 0 }];
  const result = repairReportRows(rows, () => "Basic Land — Forest");
  assert.equal(result.rows[0], rows[0], "the row with a type line is the same object, untouched");
  assert.equal(result.rows[1].typeLine, "Basic Land — Forest");
  assert.deepEqual(result.filled, [{ name: "Forest", typeLine: "Basic Land — Forest" }]);
});

test("the decklist itself is unchanged: names, quantities, roles, mana values and field order", () => {
  const result = repairReportRows(baruRows, typeFor);
  assert.equal(result.rows.length, baruRows.length);
  result.rows.forEach((row, index) => {
    const original = baruRows[index];
    const { typeLine: _after, ...rest } = row;
    const { typeLine: _before, ...originalRest } = original;
    assert.deepEqual(rest, originalRest, `${original.name}: only typeLine may differ`);
    assert.deepEqual(Object.keys(row), Object.keys(original), "field order kept");
  });
  assert.equal(result.filled.length, 64, "every Baru row had an empty type line");
});

test("a name the lookup cannot resolve stays empty and is reported, never filled with a placeholder", () => {
  const rows = [...complete, { quantity: 1, name: "Not A Real Card", typeLine: "", roles: [], cmc: 2 }];
  const result = repairReportRows(rows, () => "");
  assert.equal(result.changed, false);
  assert.deepEqual(result.unresolved, ["Not A Real Card"]);
  assert.equal(result.rows[2].typeLine, "");
});

test("only reports that need a repair get a statement, and each is guarded by its exact stored JSON", () => {
  const reports = [
    { slug: "baru-wurmspeaker-b35d119648", deck_rows_json: JSON.stringify(baruRows) },
    { slug: "already-complete", deck_rows_json: JSON.stringify(complete) },
    { slug: "broken-json", deck_rows_json: "{not json" },
  ];
  const plan = planRepair(reports, typeFor);
  assert.deepEqual(plan.repairs.map((repair) => repair.slug), ["baru-wurmspeaker-b35d119648"]);
  assert.deepEqual(plan.untouched.map((entry) => entry.slug), ["already-complete", "broken-json"]);
  const sql = repairSql(plan, { generatedAt: "2026-11-19T00:00:00Z" });
  const updates = sql.split("\n").filter((line) => line.startsWith("UPDATE"));
  assert.equal(updates.length, 1);
  assert.match(updates[0], /^UPDATE public_deck_reports SET deck_rows_json = '.+' WHERE slug = 'baru-wurmspeaker-b35d119648' AND deck_rows_json = '.+';$/);
  assert.doesNotMatch(sql, /view_count|share_count|title|summary|owner_key/, "no other column is written");
});

test("against a real SQLite table: repair changes only the target row, a re-run does nothing, rollback restores it byte for byte", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE public_deck_reports (slug TEXT PRIMARY KEY, owner_key TEXT, deck_rows_json TEXT NOT NULL, view_count INTEGER NOT NULL DEFAULT 0)");
  const insert = db.prepare("INSERT INTO public_deck_reports (slug, owner_key, deck_rows_json, view_count) VALUES (?, ?, ?, ?)");
  insert.run("baru-wurmspeaker-b35d119648", "owner-a", JSON.stringify(baruRows), 41);
  insert.run("already-complete", "owner-b", JSON.stringify(complete), 7);
  const snapshot = () => db.prepare("SELECT slug, owner_key, deck_rows_json, view_count FROM public_deck_reports ORDER BY slug").all().map((row) => ({ ...row }));
  const before = snapshot();
  const plan = planRepair(snapshot(), typeFor);
  db.exec(repairSql(plan));
  const after = snapshot();
  assert.deepEqual(after.find((row) => row.slug === "already-complete"), before.find((row) => row.slug === "already-complete"), "the complete report is untouched");
  const baruAfter = after.find((row) => row.slug.startsWith("baru"));
  assert.equal(baruAfter.view_count, 41, "only deck_rows_json changed");
  assert.equal(baruAfter.owner_key, "owner-a");
  assert.ok(JSON.parse(baruAfter.deck_rows_json).every((row) => row.typeLine), "every Baru row now has a type line");
  // Idempotent: planning again finds nothing to do.
  assert.equal(planRepair(snapshot(), typeFor).repairs.length, 0);
  // Applying the same SQL twice changes nothing more.
  db.exec(repairSql(plan));
  assert.deepEqual(snapshot(), after);
  // Rollback restores the exported JSON exactly.
  db.exec(rollbackSql(plan));
  assert.deepEqual(snapshot(), before);
});

test("a report edited after the export is not overwritten (the guard does not match)", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE public_deck_reports (slug TEXT PRIMARY KEY, deck_rows_json TEXT NOT NULL)");
  db.prepare("INSERT INTO public_deck_reports VALUES (?, ?)").run("baru-wurmspeaker-b35d119648", JSON.stringify(baruRows));
  const plan = planRepair(db.prepare("SELECT slug, deck_rows_json FROM public_deck_reports").all().map((row) => ({ ...row })), typeFor);
  const edited = JSON.stringify(baruRows.slice(1));
  db.prepare("UPDATE public_deck_reports SET deck_rows_json = ? WHERE slug = ?").run(edited, "baru-wurmspeaker-b35d119648");
  db.exec(repairSql(plan));
  assert.equal(db.prepare("SELECT deck_rows_json FROM public_deck_reports").get().deck_rows_json, edited);
});

test("the script plans from a wrangler export and produces a backup, an audit, repair and rollback SQL", async () => {
  const exported = exportOf([
    { slug: "baru-wurmspeaker-b35d119648", deck_rows_json: JSON.stringify(baruRows) },
    { slug: "already-complete", deck_rows_json: JSON.stringify(complete) },
  ]);
  assert.equal(reportsFromExport(exported).length, 2);
  const result = await planFromExport(exported, { fetchImpl: scryfall(), generatedAt: "2026-11-19T00:00:00Z" });
  assert.equal(result.audit.reportsExported, 2);
  assert.equal(result.audit.reportsToUpdate, 1);
  assert.equal(result.audit.namesLookedUp, namesNeedingTypes(baruRows).length);
  assert.equal(result.audit.repairs[0].filled.length, 64);
  assert.equal(result.backup.reports.length, 2, "the backup holds every exported report, changed or not");
  assert.equal(result.backup.reports[0].deck_rows_json, JSON.stringify(baruRows));
  assert.match(result.repairSql, /UPDATE public_deck_reports/);
  assert.match(result.rollbackSql, /UPDATE public_deck_reports/);
});

test("if Scryfall fails, the script stops and produces nothing to apply", async () => {
  const exported = exportOf([{ slug: "baru-wurmspeaker-b35d119648", deck_rows_json: JSON.stringify(baruRows) }]);
  await assert.rejects(() => planFromExport(exported, { fetchImpl: scryfall({ down: true }) }), /Nothing was written/);
});
