// Snapshot Scryfall card facts for the Deck Check fixtures so the tests run
// offline and deterministically. Re-run only when a fixture list changes:
//   node scripts/deck-check/snapshot-fixture-facts.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDecklist } from "../../app/deck-check-parse.mjs";
import { fetchCardFacts } from "../../app/deck-check-facts.mjs";

const dir = new URL("../../tests/fixtures/deck-coach/", import.meta.url);
const files = readdirSync(dir).filter((file) => file.endsWith(".txt"));

for (const file of files) {
  const text = readFileSync(new URL(file, dir), "utf8");
  const parsed = parseDecklist(text);
  const names = parsed.entries.map((entry) => entry.name);
  const { facts, notFound, failed } = await fetchCardFacts(names, {
    fetchImpl: (url, init) => fetch(url, { ...init, headers: { ...init.headers, "User-Agent": "MetaForge-fixture-snapshot/1.0" } }),
  });
  if (failed) throw new Error(`Scryfall lookup failed for ${file}`);
  // Store each fact once, keyed by its canonical name.
  const unique = {};
  for (const fact of Object.values(facts)) unique[fact.name] = fact;
  const out = join(dir.pathname.replace(/^\/([A-Za-z]:)/, "$1"), file.replace(/\.txt$/, ".facts.json"));
  writeFileSync(out, `${JSON.stringify({ source: "Scryfall /cards/collection", snapshotAt: new Date().toISOString().slice(0, 10), notFound, facts: unique }, null, 1)}\n`);
  console.log(`${file}: ${Object.keys(unique).length} facts, not found: ${notFound.join(", ") || "none"}`);
}
