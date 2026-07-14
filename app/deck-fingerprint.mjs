export function canonicalDeck(rows) {
  const totals = new Map();
  for (const row of rows) {
    const name = row.name.trim().normalize("NFC").toLowerCase();
    totals.set(name, (totals.get(name) || 0) + row.quantity);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([name, quantity]) => `${quantity} ${name}`)
    .join("\n");
}

export async function deckFingerprint(rows) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalDeck(rows)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
