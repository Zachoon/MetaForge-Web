import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ERA3_CARD_INSPECT_SURFACES,
  reasonsCardMatters,
  shouldUseContextCardInspector,
} from "../app/context-card-inspector.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Founder Issue #021 — context-preserving card inspection", () => {
  it("uses contextual inspector when gallery preview is off-screen", () => {
    assert.equal(
      shouldUseContextCardInspector({ previewInView: false, activeForgeChapter: 1 }),
      true,
    );
    assert.equal(
      shouldUseContextCardInspector({ previewInView: true, activeForgeChapter: 1 }),
      false,
    );
  });

  it("uses contextual inspector on Deep Forge chapter 2 even if gallery is in view", () => {
    assert.equal(
      shouldUseContextCardInspector({ previewInView: true, activeForgeChapter: 2 }),
      true,
    );
  });

  it("uses contextual inspector on legacy Deep Forge chapters 3/4", () => {
    assert.equal(
      shouldUseContextCardInspector({ previewInView: true, activeForgeChapter: 3 }),
      true,
    );
    assert.equal(
      shouldUseContextCardInspector({ previewInView: true, activeForgeChapter: 4 }),
      true,
    );
  });

  it("derives why-it-matters from bridge + system membership", () => {
    const reasons = reasonsCardMatters("Ancient Gold Dragon", {
      strongestSystem: { name: "Combat Engine" },
      bridgeCards: [
        {
          name: "Ancient Gold Dragon",
          systems: ["Combat Engine", "Token Engine"],
          score: 9,
        },
      ],
      systems: [
        {
          name: "Combat Engine",
          members: ["Ancient Gold Dragon"],
          core: ["Ancient Gold Dragon"],
          support: [],
          producers: [],
          payoffs: [],
        },
        {
          name: "Token Engine",
          members: ["Ancient Gold Dragon"],
          core: [],
          support: ["Ancient Gold Dragon"],
          producers: [],
          payoffs: [],
        },
      ],
    });

    assert.ok(reasons.includes("Combat Engine"));
    assert.ok(reasons.some((line) => line.startsWith("Bridge across")));
    assert.ok(reasons.includes("Token Engine"));
    assert.equal(reasons[0], "Combat Engine");
  });

  it("returns empty reasons without a card or systems report", () => {
    assert.deepEqual(reasonsCardMatters("", { systems: [] }), []);
    assert.deepEqual(reasonsCardMatters("Sol Ring", null), []);
  });

  it("wires floating inspector CSS + page portal surface", () => {
    const css = readFileSync(join(root, "app/testing-anvil.css"), "utf8");
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    assert.match(css, /\.forge-context-card-inspector\b/);
    assert.match(css, /\.forge-card-ref\b/);
    assert.match(page, /forge-context-card-inspector/);
    assert.match(page, /shouldUseContextCardInspector/);
    assert.match(page, /IntersectionObserver/);
    assert.match(page, /CARD IN CONTEXT/);
    assert.match(page, /ForgeCardRef/);
    assert.match(page, /deckPreviewInView, activeForgeChapter/);
  });

  it("inventories every Era 3 card-inspect surface in page.tsx", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    assert.ok(ERA3_CARD_INSPECT_SURFACES.length >= 15);
    for (const surface of ERA3_CARD_INSPECT_SURFACES) {
      assert.match(
        page,
        new RegExp(`data-card-inspect-surface="${surface}"|surface="${surface}"`),
        `missing inspect surface: ${surface}`,
      );
    }
  });
});
