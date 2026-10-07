// Shared draft contract. Temporary pool handles are replaceable; player choices are not.
export const GUIDED_DRAFT_VERSION = 1;
export function guidedDraftKey(draft) {
  return [draft?.format, draft?.commander?.name || "", draft?.second?.name || "", draft?.shell?.id || ""].join("|");
}
export function validGuidedDraft(draft) {
  return Boolean(draft && draft.schemaVersion === GUIDED_DRAFT_VERSION
    && typeof draft.format === "string" && typeof draft.commander?.name === "string"
    && draft.commander.name.length > 0 && draft.commander.name.length <= 400
    && draft.session?.key === guidedDraftKey(draft)
    && typeof draft.session.generationId === "string"
    && Array.isArray(draft.session.categories) && draft.session.categories.length > 0 && draft.session.categories.length <= 16
    && draft.session.categories.every((value) => typeof value === "string" && value.length <= 80)
    && Number.isInteger(draft.session.categoryIndex) && draft.session.categoryIndex >= 0 && draft.session.categoryIndex < draft.session.categories.length
    && Array.isArray(draft.session.accepted) && draft.session.accepted.length <= 100
    && draft.session.accepted.every((name) => typeof name === "string" && name.trim() && name.length <= 400)
    && draft.preferences && typeof draft.preferences === "object" && !Array.isArray(draft.preferences)
    && (!draft.completion || (typeof draft.completion.id === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(draft.completion.id)
      && typeof draft.completion.deckId === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(draft.completion.deckId)
      && Number.isSafeInteger(draft.completion.seed) && draft.completion.seed >= 0)));
}
export function guidedPickText(draft) {
  return (draft?.session?.accepted || []).map((name) => `1 ${name}`).join("\n");
}
const nameKey = (name) => String(name).normalize("NFKC").trim().toLocaleLowerCase("en");
export function guidedCompletionReview(deckText, picks, commanders = []) {
  const rows = String(deckText || "").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
    return match ? [{ quantity: Number(match[1]), name: match[2] }] : [];
  });
  const matches = (a, b) => nameKey(a) === nameKey(b) || nameKey(a).split(" // ")[0] === nameKey(b).split(" // ")[0];
  const kept = picks.filter((pick) => rows.some((row) => matches(row.name, pick)));
  const missing = picks.filter((pick) => !kept.includes(pick));
  const added = rows.filter((row) => !picks.some((pick) => matches(row.name, pick)) && !commanders.some((name) => matches(row.name, name)));
  return { kept, missing, added, total: rows.reduce((sum, row) => sum + row.quantity, 0) };
}
export function guidedGenerationPayload(draft) {
  const commander = (card) => card ? { name: card.name, colors: card.colors, oracleText: card.verifiedFacts || card.oracleText || "" } : null;
  const deck = guidedPickText(draft);
  return {
    ...draft.preferences,
    mode: deck ? "imported" : "direct",
    format: draft.format,
    commander: commander(draft.commander), secondCommander: commander(draft.second),
    focusPackageId: draft.shell?.id,
    deck: deck || undefined,
    // Preserve import semantics: a power goal cannot retroactively replace player picks.
    targetPowerTier: deck ? undefined : draft.preferences.targetPowerTier,
    seed: draft.completion?.seed,
  };
}
