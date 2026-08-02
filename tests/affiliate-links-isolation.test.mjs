import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

// The affiliate layer must never influence card scoring, recommendations,
// power analysis, replacement ranking, or printing selection — it is
// presentation-only, resolved after the engine has already decided
// everything. Two independent proofs: a structural check that no engine
// module even imports affiliate-links.mjs (or vice versa), and a
// behavioral check that attaching commerce-shaped fields to card records
// never changes what the engine selects.

const ENGINE_MODULES = [
  "native-masterwork-engine.mjs",
  "native-masterwork-tournament.mjs",
  "native-masterwork-reasoning.mjs",
  "native-one-slot-lab.mjs",
  "commander-power-signal.mjs",
  "forge-interaction-graph.mjs",
  "forge-structural-pipeline.mjs",
  "forge-systems-intelligence.mjs",
  "forge-causality-engine.mjs",
  "goldfish-simulation.mjs",
  "matchup-simulation.mjs",
  "experiment-tablet.mjs",
];

test("no scoring/ranking/power-analysis engine module imports the affiliate-link builder", () => {
  const appDir = fileURLToPath(new URL("../app/", import.meta.url));
  for (const moduleName of ENGINE_MODULES) {
    const fullPath = path.join(appDir, moduleName);
    if (!fs.existsSync(fullPath)) continue; // guards against a future rename silently going unchecked below instead
    const source = fs.readFileSync(fullPath, "utf8");
    assert.doesNotMatch(source, /affiliate-links/, `${moduleName} must never import or reference the affiliate-link builder`);
  }
});

test("every engine module in the isolation list above actually exists — the check isn't silently skipping renamed files", () => {
  const appDir = fileURLToPath(new URL("../app/", import.meta.url));
  for (const moduleName of ENGINE_MODULES) {
    assert.ok(fs.existsSync(path.join(appDir, moduleName)), `expected ${moduleName} to exist`);
  }
});

test("the affiliate-link builder itself imports nothing from the scoring/ranking engine", () => {
  const source = fs.readFileSync(new URL("../app/affiliate-links.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import/m, "affiliate-links.mjs must stay a dependency-free leaf module");
});

// Behavioral proof, not just a structural grep: attach commerce-shaped
// fields (a plausible future mistake — someone threading tcgplayerId or a
// purchase URL onto a card record before it reaches the engine) and
// confirm construction is byte-for-byte identical either way.
const card = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const pool = [
  ...Array.from({ length: 28 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];
const pollutedPool = pool.map((entry, index) => ({
  ...entry,
  tcgplayerId: 900000 + index,
  purchaseUrl: `https://www.tcgplayer.com/product/${900000 + index}`,
  affiliateEnabled: true,
}));

test("affiliate/commerce fields attached to card records cannot alter engine construction, selection, or scoring", () => {
  const baseInput = { format: "Standard", target: 60, strategy: "Balanced midrange", seed: 11, colors: ["U"] };
  const clean = forgeNativeMasterwork({ ...baseInput, cards: pool });
  const polluted = forgeNativeMasterwork({ ...baseInput, cards: pollutedPool });
  assert.deepEqual(clean.selected.rows, polluted.selected.rows, "the exact same deck must be selected regardless of extraneous commerce fields on the input cards");
  assert.equal(clean.selected.score, polluted.selected.score);
  assert.equal(clean.tournament.selectedId, polluted.tournament.selectedId);
  assert.deepEqual(clean.reasoning, polluted.reasoning);
});

test("affiliate/commerce fields cannot alter the Commander power signal either", async () => {
  const { evaluateCommanderPowerSignal } = await import("../app/commander-power-signal.mjs");
  const commander = card("Test Commander", "", "Legendary Creature — Test", "{3}", ["U"]);
  const clean = evaluateCommanderPowerSignal([commander, ...pool]);
  const polluted = evaluateCommanderPowerSignal([{ ...commander, tcgplayerId: 1, affiliateEnabled: true }, ...pollutedPool]);
  assert.equal(clean.tier, polluted.tier);
  assert.equal(clean.signalScore, polluted.signalScore);
});

// Bundle isolation for this specific feature: the Impact tracking
// infrastructure is installed and its site verification has already
// succeeded — that public verification tag and script domain are expected
// and fine in the client bundle. The TCGplayer program itself is still in
// review, not yet an approved/joined partnership, which is exactly why
// what must never appear here is a Scryfall affiliate URL, an invented
// tracking parameter, a secret env var name, or server-only engine
// internals unrelated to this feature leaking in alongside it.
function readAllClientJs() {
  const dir = fileURLToPath(new URL("../dist/client/", import.meta.url));
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(dir);
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

test("the client bundle carries the new affiliate-link builder itself (expected — it must run in the browser to build hrefs), but never a Scryfall affiliate URL, invented tracking parameter, or secret config name", () => {
  const clientDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
  assert.ok(fs.existsSync(clientDir), "dist/client must exist — run `npm run build` first");
  const clientSource = readAllClientJs();

  // The Impact Universal Tracking Tag itself is server-rendered inline
  // HTML (app/layout.tsx), not part of the client JS bundle — its
  // presence is already covered by tests/rendered-html.test.mjs's
  // impact-site-verification assertion, not this file. What belongs here
  // is proof that *this feature's* new client-side code (the link
  // builder, which legitimately must ship to the browser to build real
  // hrefs) is present without anything unsafe alongside it.
  assert.match(clientSource, /tcgplayer\.com\/product\//, "sanity check: the affiliate-link builder's own destination-URL logic must actually be present in the client bundle");

  // Must never appear: Scryfall's own affiliate-wrapped TCGplayer URL
  // shape, or the raw env var name (as opposed to the derived boolean
  // the client actually consumes).
  assert.doesNotMatch(clientSource, /partner\.tcgplayer\.com/, "Scryfall's affiliate-wrapped TCGplayer URL must never reach the client");
  assert.doesNotMatch(clientSource, /purchase_uris/);
  assert.doesNotMatch(clientSource, /TCGPLAYER_AFFILIATE_ENABLED/, "the raw env var name must never leak — only the derived tcgplayerAffiliateEnabled boolean the client fetches");
  for (const invented of [/irclickid/i, /mediaPartnerId/i, /campaignid/i, /subId1/i, /\.sjv\.io/i]) {
    assert.doesNotMatch(clientSource, invented, `no invented Impact tracking parameter (${invented}) may appear before real approved values exist`);
  }
});
