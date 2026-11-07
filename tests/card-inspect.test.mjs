import assert from "node:assert/strict";
import test from "node:test";
import {
  cardNameFromScryfallSrc,
  enqueueInspectorEvent,
  hoverPreviewAllowed,
  inspectTargetFromElement,
  inspectViewFromScryfall,
  placePreview,
  previewBox,
} from "../app/card-inspect.mjs";

function namedNode(attrs) {
  return {
    closest(selector) {
      return selector === "[data-card-name]" ? this : null;
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

test("a named card with no price attribute does not become a $0 price", () => {
  assert.equal(inspectTargetFromElement(namedNode({ "data-card-name": "Sol Ring" })).priceUsd, null);
  assert.equal(inspectTargetFromElement(namedNode({ "data-card-name": "Sol Ring", "data-card-price": "1.25" })).priceUsd, 1.25);
});

test("a named Scryfall image URL yields the card, and prices on the payload are ignored", () => {
  assert.equal(cardNameFromScryfallSrc("https://api.scryfall.com/cards/named?exact=Awaken%20the%20Woods&format=image&version=normal"), "Awaken the Woods");
  const view = inspectViewFromScryfall({
    name: "Commit // Memory",
    type_line: "Instant // Sorcery",
    mana_cost: "",
    oracle_text: "",
    legalities: { commander: "legal" },
    prices: { usd: "1.00" },
    card_faces: [
      { name: "Commit", mana_cost: "{3}{U}", type_line: "Instant", oracle_text: "Put target spell or nonland permanent into its owner's library second from the top.", image_uris: { normal: "https://cards.scryfall.io/front.jpg" } },
      { name: "Memory", mana_cost: "{4}{U}{U}", type_line: "Sorcery", oracle_text: "Shuffle your graveyard into your library. Draw a card.", image_uris: { normal: "https://cards.scryfall.io/back.jpg" } },
    ],
  });
  assert.equal(view.faces.length, 2);
  assert.equal(view.faces[0].name, "Commit");
  assert.equal(view.faces[1].name, "Memory");
  assert.equal(view.commander, "Legal in Commander");
  assert.equal(view.priceUsd, undefined);
  assert.match(view.oracle, /Shuffle your graveyard/);
});

test("the hover preview stays inside the viewport and off the cursor", () => {
  const viewport = { width: 1440, height: 900 };
  const size = previewBox(1, viewport);
  assert.equal(size.faceW, 320);
  const nearCorner = placePreview({ x: 1400, y: 860 }, size, viewport);
  assert.ok(nearCorner.left >= 8);
  assert.ok(nearCorner.top >= 8);
  assert.ok(nearCorner.left + nearCorner.width <= viewport.width - 8);
  assert.ok(nearCorner.top + nearCorner.height <= viewport.height - 8);
  const covers = nearCorner.left <= 1400 && 1400 <= nearCorner.left + nearCorner.width && nearCorner.top <= 860 && 860 <= nearCorner.top + nearCorner.height;
  assert.equal(covers, false);

  const narrow = previewBox(2, { width: 375, height: 812 });
  assert.equal(narrow.layout, "column");
  assert.ok(narrow.faceW <= 375);
  const wide = previewBox(2, { width: 1440, height: 900 });
  assert.equal(wide.layout, "row");
  assert.ok(wide.faceW <= 320);
});

test("touch and coarse pointers do not get a hover preview", () => {
  assert.equal(hoverPreviewAllowed(true, "mouse"), true);
  assert.equal(hoverPreviewAllowed(true, "touch"), false);
  assert.equal(hoverPreviewAllowed(false, "mouse"), false);
});

test("pointer-outs cannot crowd out the hover or tap that opens a card", () => {
  const queue = [];
  for (let i = 0; i < 20; i += 1) enqueueInspectorEvent(queue, "out", { id: i });
  enqueueInspectorEvent(queue, "blur", { id: "blur" });
  enqueueInspectorEvent(queue, "over", { id: "sol-ring" });
  assert.deepEqual(queue, [["over", { id: "sol-ring" }]]);
  enqueueInspectorEvent(queue, "move", { id: "move" });
  enqueueInspectorEvent(queue, "click", { id: "tap" });
  assert.deepEqual(queue, [["click", { id: "tap" }]]);
});
