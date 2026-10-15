// =============================================================================
// Mechanic Interaction Graph
// =============================================================================
// Links cards by what they actually do to each other, read from rules text:
// an edge A -> B exists when A produces a resource or event that B consumes
// as a cost or listens for in a trigger. "Works with" and synergy scores come
// from these real mechanical links (with the mechanism named), not from two
// cards merely sharing a tag.
// =============================================================================

import { describeResource, parseOracleMechanics } from "./oracle-mechanics.mjs";

// How strongly each kind of link matters. A trigger that fires off another
// card's output (payoff) is the core of most synergy; feeding a cost is
// slightly weaker; resources that nearly every deck makes count for little.
const LINK_WEIGHTS = Object.freeze({ listens: 1, consumes: 0.8 });
const COMMON_RESOURCE_DISCOUNT = Object.freeze({
  "creature-enters": 0.35, // every creature produces this
  "mana": 0.4,
  "noncreature-cast": 0.35,
  "spell-cast": 0.6,
  "land-enters": 0.6,
  "combat-damage": 0.5,
  "card-draw": 0.6,
});

const cardOf = (entry) => entry?.card || entry || {};
export const entryNameOf = (entry) => cardOf(entry).name || entry?.name || "";

const mechanicsCache = new WeakMap();
/** Parsed mechanics for an analyzed row, flat row, or raw card (memoized per object). */
export function mechanicsOf(entry) {
  if (entry && typeof entry === "object" && mechanicsCache.has(entry)) return mechanicsCache.get(entry);
  const card = cardOf(entry);
  const parsed = parseOracleMechanics({
    name: card.name || entry?.name,
    oracleText: card.oracleText ?? card.oracle_text ?? entry?.oracleText ?? "",
    typeLine: card.typeLine ?? card.type_line ?? entry?.typeLine ?? "",
    keywords: card.keywords || [],
  });
  if (entry && typeof entry === "object") mechanicsCache.set(entry, parsed);
  return parsed;
}

/**
 * Every mechanical link from `from` to `to`. Returns [{ resource, kind,
 * weight, mechanism }] where kind is "listens" (to's trigger fires off
 * from's output) or "consumes" (from feeds to's cost).
 */
export function linksBetween(from, to) {
  const source = mechanicsOf(from);
  const target = mechanicsOf(to);
  const links = [];
  for (const resource of source.produces) {
    for (const kind of /** @type {const} */ (["listens", "consumes"])) {
      if (!target[kind].includes(resource)) continue;
      const weight = LINK_WEIGHTS[kind] * (COMMON_RESOURCE_DISCOUNT[resource] ?? 1);
      links.push(Object.freeze({
        resource,
        kind,
        weight: Number(weight.toFixed(2)),
        mechanism: kind === "listens"
          ? `${entryNameOf(from)} triggers ${entryNameOf(to)} through ${describeResource(resource)}`
          : `${entryNameOf(from)} supplies ${describeResource(resource)} that ${entryNameOf(to)} spends`,
      }));
    }
  }
  return links;
}

/**
 * Builds the interaction graph across a set of cards (picks, commander and
 * optionally a candidate). Edges are directed; synergy between two cards is
 * the sum of both directions.
 */
export function buildInteractionGraph(entries = []) {
  const nodes = entries.filter((entry) => entryNameOf(entry));
  const edges = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      for (const link of linksBetween(nodes[i], nodes[j])) edges.push(Object.freeze({ from: entryNameOf(nodes[i]), to: entryNameOf(nodes[j]), ...link }));
    }
  }
  const degree = new Map(nodes.map((entry) => [entryNameOf(entry), 0]));
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + edge.weight);
    degree.set(edge.to, (degree.get(edge.to) || 0) + edge.weight);
  }
  return Object.freeze({ nodes: nodes.map(entryNameOf), edges: Object.freeze(edges), degree: Object.freeze(Object.fromEntries(degree)) });
}

/**
 * How a candidate connects to the cards already in the deck. Returns the
 * total synergy, the partners ranked by link strength (each with its
 * strongest named mechanism), and which resources carry the links.
 * Diminishing returns per partner, so one card with five overlapping links
 * does not outweigh three cards with one real link each.
 */
export function candidateSynergy(candidate, deckEntries = [], { commanderNames = [] } = {}) {
  const candidateName = entryNameOf(candidate).toLowerCase();
  const commanderSet = new Set(commanderNames.map((name) => String(name).toLowerCase()));
  const partners = [];
  const resources = new Map();
  for (const entry of deckEntries) {
    const name = entryNameOf(entry);
    if (!name || name.toLowerCase() === candidateName) continue;
    const links = [...linksBetween(candidate, entry), ...linksBetween(entry, candidate)];
    if (!links.length) continue;
    links.sort((left, right) => right.weight - left.weight);
    const raw = links.reduce((sum, link) => sum + link.weight, 0);
    const isCommander = commanderSet.has(name.toLowerCase());
    // A link to the commander is always available (it is in the command
    // zone every game), so it counts double.
    const strength = Math.min(1.5, raw) * (isCommander ? 2 : 1);
    for (const link of links) resources.set(link.resource, (resources.get(link.resource) || 0) + link.weight);
    partners.push(Object.freeze({ name, isCommander, strength: Number(strength.toFixed(2)), mechanism: links[0].mechanism, resource: links[0].resource }));
  }
  partners.sort((left, right) => right.strength - left.strength || left.name.localeCompare(right.name));
  const total = partners.reduce((sum, partner, index) => sum + partner.strength / (1 + index * 0.15), 0);
  return Object.freeze({
    score: Number(total.toFixed(2)),
    partners: Object.freeze(partners),
    resources: Object.freeze([...resources.entries()].sort((left, right) => right[1] - left[1]).map(([resource]) => resource)),
  });
}
