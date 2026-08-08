// Pure, dependency-free deck-completeness logic, split out of
// forge-generate.ts specifically so it can be imported directly by both
// that file and by tests — forge-generate.ts's own other imports
// (./account-bench, ./api-hardening, ...) use extensionless specifiers
// that only resolve through a bundler, not Node's native ESM loader, so a
// test can't import forge-generate.ts itself. This file has zero imports,
// so it resolves fine either way.
//
// targetDeckSize/isCommanderFormat/parseDeckRows are the same completeness
// math app/page.tsx's applyForgeResult independently applies client-side —
// duplicated deliberately (not imported from that "use client" file) so
// this module never pulls the client bundle into the Worker.

export const targetDeckSize = (format) =>
  format === "Commander" || format === "Brawl" ? 100 : 60;

export const isCommanderFormat = (format) =>
  ["Commander", "Brawl", "Standard Brawl"].includes(format);

export const parseDeckRows = (text) =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });

// Bug 2's core fix: forgeNativeMasterwork/forgeImportedMasterwork throw on
// most hard-gate failures (illegal cards, an unmatchable imported list), but
// a scarce card pool (a narrow color identity in a thin format) can still
// let selection under-fill without throwing, and forge-generate.ts used to
// return that partial result as a plain 200 — the exact shape guest-forge.ts
// reads as "generation succeeded, burn the free preview." One shared check,
// run before either success branch returns, so a guest's preview and an
// account holder's Testing Anvil cache both react to the same definition of
// "done."
export function validateGeneratedResult(nativeReport, format) {
  const incomplete = (message) => ({ ok: false, code: "INCOMPLETE_GENERATION", message });

  if (!nativeReport || typeof nativeReport !== "object") {
    return incomplete("The Forge did not return a usable result. Your preview has not been used.");
  }
  const selected = nativeReport.selected;
  if (!selected || typeof selected !== "object" || typeof selected.deckText !== "string" || !selected.deckText.trim()) {
    return incomplete("The Forge did not finish building a deck. Your preview has not been used.");
  }
  if (!Array.isArray(selected.rows) || !selected.rows.length) {
    return incomplete("The Forge produced an empty deck. Your preview has not been used.");
  }
  const parsedRows = parseDeckRows(selected.deckText);
  if (!parsedRows.length) {
    return incomplete("The Forge produced an empty deck. Your preview has not been used.");
  }
  const total = parsedRows.reduce((sum, row) => sum + row.quantity, 0);
  const target = targetDeckSize(format);
  if (total !== target) {
    return incomplete(`The Forge produced ${total} cards; ${format} requires exactly ${target}. Your preview has not been used.`);
  }
  if (isCommanderFormat(format)) {
    const hasCommander = selected.rows.some((row) => Array.isArray(row?.roles) && row.roles.includes("commander"));
    if (!hasCommander) {
      return incomplete("The Forge did not include a legal commander in this build. Your preview has not been used.");
    }
  }
  // Fields the client dereferences without optional chaining (commitDirect
  // Forge/enterMasterwork's reply text, the workbench header, the Masterwork
  // picker cards) — missing any of these would surface as a client-side
  // crash rather than a clean failure state, so they're gated here instead.
  if (typeof nativeReport.methodology !== "string" || !nativeReport.methodology) {
    return incomplete("The Forge result was missing required data. Your preview has not been used.");
  }
  if (!nativeReport.reasoning || typeof nativeReport.reasoning.summary !== "string") {
    return incomplete("The Forge result was missing required data. Your preview has not been used.");
  }
  if (!nativeReport.laboratory || typeof nativeReport.laboratory.summary !== "string") {
    return incomplete("The Forge result was missing required data. Your preview has not been used.");
  }
  if (!selected.evaluation || typeof selected.evaluation.cohesion !== "number" || typeof selected.evaluation.resilience !== "number") {
    return incomplete("The Forge result was missing required data. Your preview has not been used.");
  }
  if (!selected.tournament || typeof selected.tournament.reason !== "string") {
    return incomplete("The Forge result was missing required data. Your preview has not been used.");
  }
  if (!Array.isArray(nativeReport.candidates) || !nativeReport.candidates.length) {
    return incomplete("The Forge did not return any evaluated candidates. Your preview has not been used.");
  }
  // A JSON.stringify(nativeReport) serializability probe used to run here,
  // purely to discover in advance whether the object could be serialized —
  // then discarded the result and let storeGeneration/the HTTP response
  // stringify the same multi-megabyte object again moments later. Every
  // field on nativeReport is built by this codebase's own engine from
  // plain strings/numbers/arrays (see native-masterwork-engine.mjs); there
  // is no real invariant this was protecting. Non-serializable output
  // would now surface at the one real serialization boundary (the actual
  // HTTP response) as a catchable exception, returned as GENERATION_FAILED
  // like any other unexpected construction error.
  return { ok: true };
}

// The "native"/"direct" masterworks screen lets the player enter ANY of the
// three candidates, not just nativeReport.selected — so completeness must
// hold for every one of them, not only the tournament winner. (The imported
// path never exposes its internal comparison candidate for direct entry, so
// validateGeneratedResult's selected-only check is sufficient there.)
export function validateAllCandidatesComplete(nativeReport, format) {
  const target = targetDeckSize(format);
  for (const candidate of nativeReport.candidates || []) {
    if (!candidate || typeof candidate.deckText !== "string" || !candidate.deckText.trim()) {
      return { ok: false, code: "INCOMPLETE_GENERATION", message: "One of the Forge's candidates did not finish building. Your preview has not been used." };
    }
    const total = parseDeckRows(candidate.deckText).reduce((sum, row) => sum + row.quantity, 0);
    if (total !== target) {
      return { ok: false, code: "INCOMPLETE_GENERATION", message: `One of the Forge's candidates produced ${total} cards instead of ${target}. Your preview has not been used.` };
    }
  }
  return { ok: true };
}
