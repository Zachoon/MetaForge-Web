import assert from "node:assert/strict";
import test from "node:test";
import { handleCardFacts } from "../worker/card-facts.ts";

const request = (body, method = "POST") => new Request("https://app.metaforge.gg/api/cards/facts", {
  method,
  headers: { "Content-Type": "application/json" },
  ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
});

test("resolves a complete deck in bounded Scryfall collection batches", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    const identifiers = JSON.parse(init.body).identifiers;
    calls.push(identifiers);
    return Response.json({ data: identifiers.map(({ name }) => ({ name, type_line: "Creature" })), not_found: [] });
  });
  const names = Array.from({ length: 100 }, (_, index) => `Card ${index}`);
  const response = await handleCardFacts(request({ names }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.cards.length, 100);
  assert.deepEqual(calls.map((batch) => batch.length), [75, 25]);
});

test("rejects an unbounded card-facts proxy request", async () => {
  const response = await handleCardFacts(request({ names: Array.from({ length: 101 }, (_, index) => `Card ${index}`) }));
  assert.equal(response.status, 400);
});

test("uses the internal type catalog when the upstream archive is down", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("no", { status: 400 }));
  const response = await handleCardFacts(request({ names: ["Pacifism"] }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.cards[0].type_line, "Enchantment — Aura");
  assert.deepEqual(body.unresolved, []);
});

test("names absent from both catalogs remain explicitly unresolved", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("no", { status: 400 }));
  const response = await handleCardFacts(request({ names: ["Definitely Not A Real Card"] }));
  const body = await response.json();
  assert.deepEqual(body.cards, []);
  assert.deepEqual(body.unresolved, ["Definitely Not A Real Card"]);
});

test("queries double-faced cards by the front face and returns the canonical full card", async (t) => {
  let requestedName = "";
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    requestedName = JSON.parse(init.body).identifiers[0].name;
    return Response.json({
      data: [{
        name: "Etali, Primal Conqueror // Etali, Primal Sickness",
        type_line: "Legendary Creature — Elder Dinosaur // Legendary Creature — Phyrexian Elder Dinosaur",
        card_faces: [{ name: "Etali, Primal Conqueror" }, { name: "Etali, Primal Sickness" }],
      }],
      not_found: [],
    });
  });
  const response = await handleCardFacts(request({ names: ["Etali, Primal Conqueror // Etali, Primal Sickness"] }));
  const body = await response.json();
  assert.equal(requestedName, "Etali, Primal Conqueror");
  assert.equal(body.cards[0].name, "Etali, Primal Conqueror // Etali, Primal Sickness");
  assert.deepEqual(body.unresolved, []);
});

test("accepts an Arena front-face name when Scryfall returns the canonical double-faced name", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    data: [{
      name: "Etali, Primal Conqueror // Etali, Primal Sickness",
      type_line: "Legendary Creature — Elder Dinosaur // Legendary Creature — Phyrexian Elder Dinosaur",
      card_faces: [{ name: "Etali, Primal Conqueror" }, { name: "Etali, Primal Sickness" }],
    }],
    not_found: [],
  }));
  const response = await handleCardFacts(request({ names: ["Etali, Primal Conqueror"] }));
  const body = await response.json();
  assert.equal(body.cards[0].name, "Etali, Primal Conqueror // Etali, Primal Sickness");
  assert.deepEqual(body.unresolved, []);
});
