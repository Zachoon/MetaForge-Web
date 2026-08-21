import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectBlinkCommander,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #028 gap closure — Blink (original PACKAGE_CATALOG entry)
// =============================================================================
// Generic-dispatch package: coreSemantics is ["blink_effect"] (a card-level
// exile-then-return regex or a literal "flicker"/"blink" mention),
// falseFriendSemantics is [] (empty — no tag-based false-friend protection
// exists for this package at all), supportSemantics is ["etb_value"] (any
// beneficial creature-ETB trigger, not blink-specific). Real-card evidence
// verified via Scryfall (2026-08-19). Several real findings below are
// documented, not fixed — see report.
// =============================================================================

const emptyBlueprint = {
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
};

function intentFor(commander, extraContext = {}) {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander },
    {
      blueprint: emptyBlueprint,
      commanderScopes: commanderMechanicalScopes(commander),
      ...extraContext,
    },
  );
}

// Real card, verified via Scryfall (2026-08-19): Emiel the Blessed —
// "Exile another target creature you control, then return it to the
// battlefield" matches detectBlinkCommander's exact "it"-phrasing.
const emiel = {
  name: "Emiel the Blessed",
  colors: ["G", "W"],
  oracleText: "{3}: Exile another target creature you control, then return it to the battlefield under its owner's control. Whenever another creature you control enters, you may pay {G/W}. If you do, put a +1/+1 counter on it.",
  typeLine: "Legendary Creature — Unicorn",
  manaCost: "{2}{W}{W}",
};

const inertNoble = {
  name: "Test Inert Noble",
  colors: ["G", "W"],
  oracleText: "Vigilance.",
  typeLine: "Legendary Creature — Human Noble",
  manaCost: "{2}{G}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Roon of the Hidden
// Realm — the format's other iconic Blink commander. Its real templating
// is "Exile another target creature. Return that card to the battlefield"
// — "that card", not the bare "it/that/them" detectBlinkCommander's regex
// requires immediately before "to the battlefield". It never trips
// detectBlinkCommander. Documented, not fixed — see report.
const roon = {
  name: "Roon of the Hidden Realm",
  colors: ["G", "U", "W"],
  oracleText: "Vigilance, trample. {2}, {T}: Exile another target creature. Return that card to the battlefield under its owner's control at the beginning of the next end step.",
  typeLine: "Legendary Creature — Rhino Soldier",
  manaCost: "{2}{G}{W}{U}",
};

// Real card, verified via Scryfall (2026-08-19): Ephemerate.
const ephemerate = {
  name: "Ephemerate",
  oracleText: "Exile target creature you control, then return it to the battlefield under its owner's control.",
  typeLine: "Instant",
  manaCost: "{W}",
};

// Real card, verified via Scryfall (2026-08-19): Restoration Angel — a
// canonical, widely-played EDH "blink" card. Its real templating is
// "then return that card to the battlefield" — the same "that card" gap
// as Roon above. It never trips blink_effect's core regex, and its
// oracle text never says the literal word "flicker" or "blink" either
// (that is only a community label for the card). It does trip etb_value
// (it is a creature with an ETB "exile target" trigger), so it lands as
// support, not core. A player building around Restoration Angel would
// see it credited as generic ETB value, not blink density. Documented,
// not fixed — see report.
const restorationAngel = {
  name: "Restoration Angel",
  oracleText: "Flash. Flying. When this creature enters, you may exile target non-Angel creature you control, then return that card to the battlefield under your control.",
  typeLine: "Creature — Angel",
  manaCost: "{3}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Karmic Guide — pure
// graveyard reanimation, textually similar to blink's own "return ... to
// the battlefield" core clause but with no "exile" verb at all. Because
// falseFriendSemantics is empty for blink, cardIsPackageFalseFriend can
// never flag it (core is false, so it falls through to an empty tag
// list and returns false). Worse: it also trips etb_value (a creature
// ETB trigger with "return" in its effect), so cardSatisfiesPackageSupport
// credits a pure reanimation card as blink support. Documented, not
// fixed — see report.
const karmicGuide = {
  name: "Karmic Guide",
  oracleText: "Flying, protection from black. When this creature enters, return target creature card from your graveyard to the battlefield.",
  typeLine: "Creature — Angel Spirit",
  manaCost: "{3}{W}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Mulldrifter — a clean,
// blink-unrelated ETB value creature (draw two cards on enter). Confirms
// etb_value support is not itself the bug; the bug is that it is too
// broad to also exclude reanimation-flavored ETB text like Karmic Guide.
const mulldrifter = {
  name: "Mulldrifter",
  oracleText: "Flying. When this creature enters, draw two cards.",
  typeLine: "Creature — Elemental",
  manaCost: "{4}{U}",
};

test("blink opens on a real exile-then-return commander (Emiel the Blessed) and stays closed on an unrelated one", () => {
  assert.equal(detectBlinkCommander(emiel.oracleText), true);
  assert.equal(detectBlinkCommander(inertNoble.oracleText), false);
  assert.ok(intentFor(emiel).packageIds.includes("blink"));
  assert.ok(!intentFor(inertNoble).packageIds.includes("blink"));
});

test("a real Blink commander (Roon of the Hidden Realm) does not trip detectBlinkCommander under the current 'it/that/them' regex", () => {
  assert.equal(detectBlinkCommander(roon.oracleText), false);
  assert.ok(!intentFor(roon).packageIds.includes("blink"));
});

test("blink core requires the literal exile-then-return-it/that/them phrasing; Ephemerate matches, Restoration Angel's 'return that card' phrasing does not", () => {
  const intent = intentFor(emiel);
  assert.equal(cardSatisfiesPackageCore(ephemerate, "blink", intent), true);
  assert.equal(cardSatisfiesPackageCore(restorationAngel, "blink", intent), false);
  assert.equal(cardSatisfiesPackageSupport(restorationAngel, "blink", intent), true);
  assert.equal(cardIsPackageFalseFriend(ephemerate, "blink", intent), false);
});

test("blink has no false-friend tag list; a reanimation spell that textually echoes 'return ... to the battlefield' is never flagged and slips through as support", () => {
  const intent = intentFor(emiel);
  assert.equal(cardSatisfiesPackageCore(karmicGuide, "blink", intent), false);
  assert.equal(cardIsPackageFalseFriend(karmicGuide, "blink", intent), false);
  assert.equal(cardSatisfiesPackageSupport(karmicGuide, "blink", intent), true);
});

test("blink support is genuine ETB value density (Mulldrifter), distinct from blink_effect core", () => {
  const intent = intentFor(emiel);
  assert.equal(cardSatisfiesPackageCore(mulldrifter, "blink", intent), false);
  assert.equal(cardSatisfiesPackageSupport(mulldrifter, "blink", intent), true);
});

test("a real Blink commander forges the literal exile-then-return-it spell as package core", () => {
  const gwFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}{W}", colorIdentity: ["G", "W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const gwDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Canopy Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "W"],
    producedMana: ["G", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: emiel,
    cards: [...gwFiller, ephemerate, restorationAngel, ...gwDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("blink"), "Emiel's deck should carry the blink package");
  assert.ok(names.includes("Ephemerate"), "the real exile-then-return-it spell should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(ephemerate, "blink", intent), true);
  const restorationAngelRow = report.selected.rows.find((row) => row.name === "Restoration Angel");
  if (restorationAngelRow) {
    assert.equal(cardSatisfiesPackageCore(restorationAngelRow, "blink", intent), false, "Restoration Angel's 'return that card' phrasing must not occupy blink core under the current regex");
  }
});

// =============================================================================
// Founder #040 — the mirror case: a commander with a valuable one-shot ETB
// =============================================================================
// Real card, verified via Scryfall (2026-08-21): Hei Bai, Forest Guardian.
// Its own ETB is worth being blinked by the deck's own spells — it does not
// blink anything itself, so the pre-#040 detectBlinkCommander never opened
// the package for it even though "stock up on Ephemerate-style spells" is
// exactly the right construction response.
const heiBai = {
  name: "Hei Bai, Forest Guardian",
  colors: ["W", "U", "B", "R", "G"],
  oracleText: "When Hei Bai enters, reveal cards from the top of your library until you reveal a Shrine card. You may put that card onto the battlefield. Then shuffle.\n{W}{U}{B}{R}{G}, {T}: For each legendary enchantment you control, create a 1/1 colorless Spirit creature token with \"This token can't block or be blocked by non-Spirit creatures.\"",
  typeLine: "Legendary Creature — Bear Spirit",
  manaCost: "{W}{U}{B}{R}{G}",
};

// A bare enters-the-battlefield rider must NOT open the package — the
// existing etb_value bar (draw/create/exile target/gain/put/return/
// search) is the line, same as it already is for ordinary candidate cards.
const trivialEtbCommander = {
  name: "Test Trivial ETB Commander",
  colors: ["G"],
  oracleText: "When this creature enters, scry 1.",
  typeLine: "Legendary Creature — Human Scout",
  manaCost: "{2}{G}",
};

test("Founder #040: a commander with a valuable one-shot ETB (Hei Bai) opens the blink package; a trivial ETB rider does not", () => {
  assert.equal(detectBlinkCommander(heiBai.oracleText), true);
  assert.equal(detectBlinkCommander(trivialEtbCommander.oracleText), false);
  assert.ok(intentFor(heiBai).packageIds.includes("blink"));
  assert.ok(!intentFor(trivialEtbCommander).packageIds.includes("blink"));
  // Vigilance-only inertNoble (already covered above) and a commander with
  // no ETB text at all must both still stay closed too.
  assert.equal(detectBlinkCommander(inertNoble.oracleText), false);
});

test("Founder #040: Hei Bai's real construction reserves real blink/flicker spells as package core, not just Shrines", () => {
  const gwFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "Vigilance.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const gates = Array.from({ length: 20 }, (_, i) => ({
    name: `WUBRG Gate ${i}`, oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.", typeLine: "Land",
    manaCost: "", colorIdentity: ["W", "U", "B", "R", "G"], producedMana: ["W", "U", "B", "R", "G"], popularityRank: 5, priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: heiBai, cards: [...gwFiller, ephemerate, restorationAngel, ...gates],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("blink"), "Hei Bai's deck should carry the blink package");
  assert.ok(names.includes("Ephemerate"), "the real exile-then-return-it spell should be reserved as package core");
});
