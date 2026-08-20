import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ERA3_CARD_INSPECT_SURFACES,
  reasonsCardMatters,
} from "../app/context-card-inspector.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Founder Issue #021 — context-preserving card inspection", () => {
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

  it("wires the persistent card-mold slot into the site frame", () => {
    // The floating "CARD IN CONTEXT" popup (and the scroll/chapter
    // suppression logic that decided when to show it) is retired. The
    // card-preview slot is now a fixed fixture of the left rail — always
    // mounted, driven directly by activeCard — so there is no "off-screen
    // pane" concept left to gate.
    const css = readFileSync(join(root, "app/site-frame.css"), "utf8");
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    assert.match(css, /\.forge-card-mold\b/);
    assert.match(page, /forge-global-rail/);
    assert.match(page, /forge-card-mold/);
    assert.match(page, /ForgeCardRef/);
    assert.match(page, /Open full dossier/);
  });

  it("inventories every Era 3 card-inspect surface across page.tsx and /research", () => {
    // system-core/support/producers/payoffs, bridge-card, causality-*, and
    // graph-* moved to app/research/page.tsx along with the rest of the
    // Deep Forge vault (see app/page.tsx's forge-intelligence-vault-teaser).
    // Checking the union of both files keeps this inventory honest about
    // where each surface actually lives post-move.
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const researchPage = readFileSync(join(root, "app/research/page.tsx"), "utf8");
    const combined = `${page}\n${researchPage}`;
    assert.ok(ERA3_CARD_INSPECT_SURFACES.length >= 15);
    for (const surface of ERA3_CARD_INSPECT_SURFACES) {
      assert.match(
        combined,
        new RegExp(`data-card-inspect-surface="${surface}"|surface="${surface}"`),
        `missing inspect surface: ${surface}`,
      );
    }
  });
});
