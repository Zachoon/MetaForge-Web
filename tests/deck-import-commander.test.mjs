import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPastedCommanderName,
  commanderOptionFromCard,
  resolvePastedCommanderCandidate,
} from "../app/deck-import-commander.mjs";

const IRON_MAN_LIST = `1 Adaptive Omnitool
1 Arc Reactor
1 Arcane Signet
11 Island
7 Mountain
1 Sol Ring
1 Wurmcoil Engine

1 Tony Stark`;

test("extractPastedCommanderName detects a trailing singleton commander block after a blank line", () => {
  assert.equal(extractPastedCommanderName(IRON_MAN_LIST), "Tony Stark");
});

test("extractPastedCommanderName strips a trailing set/collector-number annotation on the commander line", () => {
  const withAnnotation = `1 Sol Ring\n1 Wurmcoil Engine\n\n1 Tony Stark (MOM) 123`;
  assert.equal(extractPastedCommanderName(withAnnotation), "Tony Stark");
});

test("extractPastedCommanderName recognizes common Commander section headers", () => {
  assert.equal(extractPastedCommanderName(`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring`), "Atraxa, Praetors' Voice");
  assert.equal(extractPastedCommanderName(`[Commander]\n1 Thanos, the Mad Titan\n\n1 Arcane Signet`), "Thanos, the Mad Titan");
});

test("extractPastedCommanderName does not falsely detect a normal final maindeck card when no separated commander block exists", () => {
  const noSeparation = `1 Sol Ring\n1 Arcane Signet\n1 Wurmcoil Engine`;
  assert.equal(extractPastedCommanderName(noSeparation), null);
});

test("extractPastedCommanderName does not detect a multi-card trailing block as a commander (ambiguous, not a singleton)", () => {
  const twoCardTrailer = `1 Sol Ring\n1 Wurmcoil Engine\n\n1 Tony Stark\n1 War Machine, Avenging Arsenal`;
  assert.equal(extractPastedCommanderName(twoCardTrailer), null);
});

test("extractPastedCommanderName returns null for an empty or whitespace-only paste", () => {
  assert.equal(extractPastedCommanderName(""), null);
  assert.equal(extractPastedCommanderName("   \n\n  "), null);
});

test("resolvePastedCommanderCandidate never calls the network when no candidate can be extracted", async () => {
  let fetchCalled = false;
  const resolved = await resolvePastedCommanderCandidate({
    deckText: "1 Sol Ring\n1 Wurmcoil Engine",
    format: "Commander",
    mapCard: commanderOptionFromCard,
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("should not be called");
    },
  });
  assert.equal(resolved, null);
  assert.equal(fetchCalled, false);
});

test("resolvePastedCommanderCandidate resolves a double-faced commander and stores its full canonical name", async () => {
  const tonyStarkCard = {
    name: "Tony Stark // The Invincible Iron Man",
    mana_cost: "{2}{R}{U}",
    type_line: "Legendary Creature — Human Artificer Hero // Legendary Artifact Creature — Human Hero",
    color_identity: ["R", "U"],
    card_faces: [
      { name: "Tony Stark", mana_cost: "{2}{R}{U}", type_line: "Legendary Creature — Human Artificer Hero", oracle_text: "" },
      { name: "The Invincible Iron Man", mana_cost: "", type_line: "Legendary Artifact Creature — Human Hero", oracle_text: "" },
    ],
    set_name: "Marvel's Avengers",
    set: "mar",
    games: ["paper"],
    legalities: { commander: "legal", brawl: "not_legal" },
  };
  let requestedUrl = "";
  const resolved = await resolvePastedCommanderCandidate({
    deckText: IRON_MAN_LIST,
    format: "Commander",
    mapCard: commanderOptionFromCard,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ({ cards: [tonyStarkCard] }) };
    },
  });
  assert.ok(requestedUrl.includes("/api/cards/commanders"), "uses MetaForge's resilient commander index endpoint");
  assert.ok(requestedUrl.includes("exact=true"), "requests an exact-name match on the detected candidate");
  assert.equal(resolved.name, "Tony Stark // The Invincible Iron Man", "the canonical two-faced name is stored, not just the front face");
  assert.deepEqual(resolved.colors, ["R", "U"]);
});

test("an Arena-style full double-faced commander name is queried by its front face", async () => {
  let requestedUrl = "";
  const resolved = await resolvePastedCommanderCandidate({
    deckText: `1 Sol Ring\n\n1 Etali, Primal Conqueror // Etali, Primal Sickness`,
    format: "Commander",
    mapCard: commanderOptionFromCard,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ({ cards: [{ name: "Etali, Primal Conqueror // Etali, Primal Sickness", color_identity: ["G", "R"] }] }) };
    },
  });
  assert.ok(requestedUrl.includes(encodeURIComponent("Etali, Primal Conqueror")));
  assert.ok(!decodeURIComponent(requestedUrl).includes("Primal Sickness"));
  assert.equal(resolved.name, "Etali, Primal Conqueror // Etali, Primal Sickness");
});

test("resolvePastedCommanderCandidate resolves to null when the isolated trailing card isn't actually commander-eligible", async () => {
  const resolved = await resolvePastedCommanderCandidate({
    deckText: IRON_MAN_LIST,
    format: "Commander",
    mapCard: commanderOptionFromCard,
    fetchImpl: async () => ({ ok: true, json: async () => ({ cards: [] }) }),
  });
  assert.equal(resolved, null);
});

test("resolvePastedCommanderCandidate resolves to null when the Scryfall request itself fails", async () => {
  const resolved = await resolvePastedCommanderCandidate({
    deckText: IRON_MAN_LIST,
    format: "Commander",
    mapCard: commanderOptionFromCard,
    fetchImpl: async () => ({ ok: false }),
  });
  assert.equal(resolved, null);
});

test("commanderOptionFromCard preserves the canonical double-faced name and color identity", () => {
  const option = commanderOptionFromCard({
    name: "Tony Stark // The Invincible Iron Man",
    color_identity: ["R", "U"],
    type_line: "Legendary Creature — Human Artificer Hero // Legendary Artifact Creature — Human Hero",
  });
  assert.equal(option.name, "Tony Stark // The Invincible Iron Man");
  assert.deepEqual(option.colors, ["R", "U"]);
  assert.match(option.verifiedFacts, /Tony Stark \/\/ The Invincible Iron Man/);
});
