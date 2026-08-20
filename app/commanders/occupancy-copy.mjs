// Human copy for each named occupancy engine (mentor-shadow.mjs's
// OCCUPANCY_PACKAGE_IDS). The engine's own `contrast` field on a seating row
// is written for internal disambiguation ("not artifact-sac and not generic
// tokens") — real, honest, but not player-facing prose. This module is the
// one translation layer: one clear, plain-language sentence per engine,
// never the raw contrast string, for any surface that shows occupancy
// results to a real player.
export const OCCUPANCY_ENGINE_COPY = Object.freeze({
  typal: "This commander cares about a specific creature type and rewards you for filling the deck with it.",
  aristocrats: "This commander wants creatures to die — yours by choice — and turns each death into value.",
  spellslinger: "This commander rewards casting a lot of instants and sorceries.",
  reanimator: "This commander wants creatures in your graveyard so it can bring them back.",
  landfall: "This commander rewards playing extra lands.",
  stax: "This commander slows every player at the table down, itself included, to buy time.",
  auras: "This commander wants creatures wearing Auras.",
  equipment: "This commander wants creatures wearing Equipment.",
  blink: "This commander wants to flicker creatures in and out of play to reuse their abilities.",
  tokens: "This commander wants you creating a lot of creature tokens, then cashing them in.",
});

export function occupancyEngineCopyFor(packageId) {
  return OCCUPANCY_ENGINE_COPY[packageId] || "";
}
