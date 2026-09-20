// The guided Build keeps its in-progress picks as analyzeForgePool's nested
// entries ({card: {name, oracleText, ...}, roles, cmc, mechanics, ...}), but
// slot-justification-ledger.mjs / category-budget-ledger.mjs were built
// against a finished deck's flat rows ({name, quantity, oracleText, roles,
// ...}) and read row.name / row.oracleText directly. Flattening at this one
// boundary lets the existing ledger code run unchanged against live guided
// picks instead of teaching each ledger function a second shape.
export function flattenAnalyzedEntry(entry) {
  const card = entry?.card || entry || {};
  return {
    ...entry,
    name: card.name || entry?.name || "",
    quantity: 1,
    typeLine: card.typeLine || card.type_line || entry?.typeLine || "",
    oracleText: card.oracleText || card.oracle_text || entry?.oracleText || "",
    manaCost: card.manaCost || card.mana_cost || entry?.manaCost || "",
  };
}

export function flattenAnalyzedEntries(entries = []) {
  return entries.map(flattenAnalyzedEntry);
}
