// Append-only Opinion Archive contract. Storage implementations may use D1,
// JSONL, or test memory; revisions are immutable and Brain remains untouched.
// writesToBrain: false

const freeze = (value) => Object.freeze(value);

export function opinionArchiveEntry(opinion, { actorKey = null, storedAt = new Date().toISOString() } = {}) {
  if (!opinion?.opinionId || !Number.isInteger(opinion.revision)) {
    throw new Error("Opinion Archive requires a versioned StrategicOpinionRecord");
  }
  return freeze({
    kind: "OpinionArchiveEntry",
    version: "opinion-archive-entry-v0",
    writesToBrain: false,
    opinionId: opinion.opinionId,
    revision: opinion.revision,
    contextId: opinion.context.contextId,
    subject: opinion.context.subject,
    commanderName: opinion.context.commanderName,
    verdict: opinion.verdict,
    confidence: opinion.confidence,
    actorKey,
    storedAt,
    record: opinion,
  });
}

export function createMemoryOpinionArchive(seed = []) {
  const rows = [];
  const keys = new Set();
  const append = (opinion, options = {}) => {
    const entry = opinionArchiveEntry(opinion, options);
    const key = `${entry.actorKey || "public"}::${entry.opinionId}::${entry.revision}`;
    if (keys.has(key)) return freeze({ written: false, duplicate: true, entry });
    keys.add(key);
    rows.push(entry);
    return freeze({ written: true, duplicate: false, entry });
  };
  for (const opinion of seed) append(opinion);
  return freeze({
    writesToBrain: false,
    append,
    history(opinionId, { actorKey = null } = {}) {
      return freeze(rows.filter((row) => row.opinionId === opinionId && row.actorKey === actorKey).sort((a, b) => a.revision - b.revision));
    },
    latest(opinionId, { actorKey = null } = {}) {
      return rows.filter((row) => row.opinionId === opinionId && row.actorKey === actorKey).sort((a, b) => b.revision - a.revision)[0] || null;
    },
  });
}

