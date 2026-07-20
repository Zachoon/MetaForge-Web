const key = (value = "") => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function rankExperimentCuts(rows, graph, options = {}) {
  const connected = new Map();
  for (const edge of graph?.edges || []) {
    connected.set(edge.from, (connected.get(edge.from) || 0) + 1);
    connected.set(edge.to, (connected.get(edge.to) || 0) + 1);
  }
  const isolated = new Set(graph?.isolated || []);
  return rows
    .filter((row) => key(row.name) !== key(options.commanderName) && options.roleOf?.(row.name) !== "Mana source")
    .sort((left, right) => Number(isolated.has(right.name)) - Number(isolated.has(left.name)) || (connected.get(left.name) || 0) - (connected.get(right.name) || 0) || right.quantity - left.quantity || left.name.localeCompare(right.name));
}

export function applyControlledSwap(rows, cutName, addName) {
  const next = rows.map((row) => ({ ...row }));
  const cut = next.find((row) => key(row.name) === key(cutName));
  if (!cut || key(cutName) === key(addName)) return null;
  cut.quantity -= 1;
  const addition = next.find((row) => key(row.name) === key(addName));
  if (addition) addition.quantity += 1;
  else next.push({ quantity: 1, name: addName });
  return next.filter((row) => row.quantity > 0);
}
