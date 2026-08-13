import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildResolvedCardIdentity,
  canonicalGameplayName,
  gameplayIdentityKey,
  mergeByGameplayIdentity,
  oracleFieldsFromRawCard,
  pickAuthoritativeCardMatch,
} from "../app/card-identity.mjs";
import { buildDeckUnderstanding } from "../app/deck-understanding.mjs";
import {
  deckFingerprintFromResolutions,
  deckNameSetWithIdentities,
  evaluateNarrativeIntegrityForCoach,
} from "../app/narrative-integrity.mjs";

const blightsteelSecretLair = {
  id: "print-megatron-sld",
  name: "Blightsteel Colossus // Blightsteel Colossus",
  layout: "reversible_card",
  type_line: "Artifact Creature — Phyrexian Golem",
  oracle_text: "",
  mana_cost: "{12}",
  cmc: 12,
  card_faces: [
    {
      name: "Blightsteel Colossus",
      flavor_name: "Megatron",
      oracle_id: "oracle-blightsteel",
      type_line: "Artifact Creature — Phyrexian Golem",
      oracle_text: "Trample, infect, indestructible\nIf Blightsteel Colossus would be put into a graveyard from anywhere, reveal Blightsteel Colossus and shuffle it into its owner's library instead.",
      mana_cost: "{12}",
    },
    {
      name: "Blightsteel Colossus",
      flavor_name: "Megatron",
      oracle_id: "oracle-blightsteel",
      type_line: "Artifact Creature — Phyrexian Golem",
      oracle_text: "Trample, infect, indestructible",
      mana_cost: "{12}",
    },
  ],
};

const hammerClaws = {
  id: "print-hammer",
  name: "Hammer of Nazahn",
  oracle_id: "oracle-hammer",
  flavor_name: "Black Panther's Claws",
  type_line: "Legendary Artifact — Equipment",
  oracle_text: "Whenever Hammer of Nazahn or another Equipment enters the battlefield under your control, you may attach that Equipment to target creature you control.",
  mana_cost: "{4}",
  cmc: 4,
};

const swordSkybreaker = {
  id: "print-sword",
  name: "Sword of the Animist",
  oracle_id: "oracle-sword",
  flavor_name: "Skybreaker, Sword of Bashenga",
  type_line: "Legendary Artifact — Equipment",
  oracle_text: "Equipped creature gets +1/+1.",
  mana_cost: "{2}",
  cmc: 2,
};

const megatronTyrant = {
  id: "print-tyrant",
  name: "Megatron, Tyrant // Megatron, Destructive Force",
  oracle_id: "oracle-tyrant",
  type_line: "Legendary Artifact Creature — Robot // Legendary Artifact — Vehicle",
  card_faces: [
    { name: "Megatron, Tyrant", type_line: "Legendary Artifact Creature — Robot", oracle_text: "More Than Meets the Eye {2}{R}{W}{B}" },
    { name: "Megatron, Destructive Force", type_line: "Legendary Artifact — Vehicle", oracle_text: "Living metal" },
  ],
};

describe("A4 printed / flavor name identity resolution", () => {
  it("1. flavor-name input resolves to canonical Oracle identity", () => {
    const picked = pickAuthoritativeCardMatch("Megatron", [blightsteelSecretLair, megatronTyrant]);
    assert.equal(picked.resolutionKind, "flavor_name_alias");
    assert.equal(picked.reason, "resolved_via_flavor_name");
    assert.equal(canonicalGameplayName(picked.card), "Blightsteel Colossus");

    const identity = buildResolvedCardIdentity({
      inputName: "Megatron",
      rawCard: picked.card,
      resolutionKind: picked.resolutionKind,
    });
    assert.equal(identity.canonicalName, "Blightsteel Colossus");
    assert.equal(identity.oracleId, "oracle-blightsteel");
  });

  it("2. player's display name is preserved", () => {
    const identity = buildResolvedCardIdentity({
      inputName: "Megatron",
      rawCard: blightsteelSecretLair,
      resolutionKind: "flavor_name_alias",
    });
    assert.equal(identity.displayName, "Megatron");
    assert.equal(identity.inputName, "Megatron");
    assert.equal(identity.canonicalName, "Blightsteel Colossus");
  });

  it("3. Brain semantic analysis receives canonical rules data", () => {
    const fields = oracleFieldsFromRawCard(blightsteelSecretLair);
    assert.match(fields.typeLine, /Artifact Creature/);
    assert.match(fields.oracleText, /infect/i);
    assert.equal(fields.manaCost, "{12}");

    const identity = buildResolvedCardIdentity({
      inputName: "Megatron",
      rawCard: blightsteelSecretLair,
      resolutionKind: "flavor_name_alias",
    });
    // Pool card name for Brain is canonical — not the printed flavor.
    assert.equal(identity.canonicalName, "Blightsteel Colossus");
    assert.notEqual(identity.displayName, identity.canonicalName);
  });

  it("4. alias resolution counts as verified, not unresolved", () => {
    const understanding = buildDeckUnderstanding({
      submittedNames: ["Tony Stark, Iron Man", "Megatron", "Sol Ring"],
      resolvedNames: ["Tony Stark, Iron Man", "Megatron", "Sol Ring"],
      unresolved: [],
      commanderName: "Tony Stark, Iron Man",
      commanderResolved: true,
      resolutions: [
        {
          inputName: "Megatron",
          displayName: "Megatron",
          canonicalName: "Blightsteel Colossus",
          oracleId: "oracle-blightsteel",
          printingId: "print-megatron-sld",
          resolutionKind: "flavor_name_alias",
          confidence: "authoritative",
        },
      ],
    });
    assert.equal(understanding.cardsUnresolved, 0);
    assert.equal(understanding.percentStructurallyUnderstood, 100);
    assert.equal(understanding.reliability.state, "complete");
    assert.ok(understanding.playerSummary.aliasResolutions.some((line) => /Megatron → Blightsteel/.test(line)));
  });

  it("5. alias + canonical name cannot bypass singleton", () => {
    const rows = mergeByGameplayIdentity([
      {
        ...buildResolvedCardIdentity({
          inputName: "Megatron",
          rawCard: blightsteelSecretLair,
          resolutionKind: "flavor_name_alias",
        }),
        quantity: 1,
      },
      {
        ...buildResolvedCardIdentity({
          inputName: "Blightsteel Colossus",
          rawCard: { ...blightsteelSecretLair, name: "Blightsteel Colossus", card_faces: undefined, oracle_id: "oracle-blightsteel", oracle_text: "infect" },
          resolutionKind: "exact_canonical",
        }),
        quantity: 1,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].quantity, 2);
    assert.equal(gameplayIdentityKey(rows[0]), "oracle:oracle-blightsteel");
  });

  it("6. unsupported arbitrary nicknames do NOT resolve", () => {
    const solRing = {
      id: "print-sol",
      name: "Sol Ring",
      oracle_id: "oracle-sol",
      type_line: "Artifact",
      oracle_text: "{T}: Add {C}{C}.",
      mana_cost: "{1}",
    };
    const picked = pickAuthoritativeCardMatch("Tony's Favorite Rock", [solRing]);
    assert.equal(picked.card, null);
    assert.equal(picked.resolutionKind, "unresolved");

    const empty = pickAuthoritativeCardMatch("Definitely Not A Card Name", []);
    assert.equal(empty.card, null);
  });

  it("7. DFC / split / alternate-name resolution does not regress", () => {
    const dfc = pickAuthoritativeCardMatch("Megatron, Tyrant", [megatronTyrant]);
    assert.equal(dfc.resolutionKind, "face_name");
    assert.ok(dfc.card);

    const hammer = pickAuthoritativeCardMatch("Black Panther's Claws", [hammerClaws]);
    assert.equal(hammer.resolutionKind, "flavor_name_alias");
    assert.equal(canonicalGameplayName(hammer.card), "Hammer of Nazahn");

    const sword = pickAuthoritativeCardMatch("Skybreaker, Sword of Bashenga", [swordSkybreaker]);
    assert.equal(sword.resolutionKind, "flavor_name_alias");
    assert.equal(canonicalGameplayName(sword.card), "Sword of the Animist");
  });

  it("8. deck fingerprint is stable across equivalent canonical identities", () => {
    const viaFlavor = [
      {
        inputName: "Megatron",
        displayName: "Megatron",
        canonicalName: "Blightsteel Colossus",
        oracleId: "oracle-blightsteel",
      },
      {
        inputName: "Sol Ring",
        displayName: "Sol Ring",
        canonicalName: "Sol Ring",
        oracleId: "oracle-sol",
      },
    ];
    const viaCanonical = [
      {
        inputName: "Blightsteel Colossus",
        displayName: "Blightsteel Colossus",
        canonicalName: "Blightsteel Colossus",
        oracleId: "oracle-blightsteel",
      },
      {
        inputName: "Sol Ring",
        displayName: "Sol Ring",
        canonicalName: "Sol Ring",
        oracleId: "oracle-sol",
      },
    ];
    assert.equal(
      deckFingerprintFromResolutions(viaFlavor),
      deckFingerprintFromResolutions(viaCanonical),
    );
  });

  it("9. Narrative Integrity accepts display alias while validating canonical identity", () => {
    const resolutions = [
      {
        inputName: "Megatron",
        displayName: "Megatron",
        canonicalName: "Blightsteel Colossus",
        oracleId: "oracle-blightsteel",
        resolutionKind: "flavor_name_alias",
      },
    ];
    const deck = deckNameSetWithIdentities(["Megatron", "Sol Ring"], resolutions);
    assert.ok(deck.has("megatron"));
    assert.ok(deck.has("blightsteel colossus"));

    const gate = evaluateNarrativeIntegrityForCoach({
      summary: {
        identity: { commanders: ["Tony Stark, Iron Man"], packageLabels: ["Artifact package"] },
        namedCards: ["Blightsteel Colossus"],
        planStory: { commander: "Tony Stark, Iron Man" },
        analysisIds: { analysisId: "a", generationId: "g" },
      },
      activeCommanderNames: ["Tony Stark, Iron Man"],
      deckCardNames: ["Megatron", "Sol Ring", "Tony Stark, Iron Man"],
      allowedPackageLabels: ["Artifact package"],
      allowedSystemNames: [],
      resolutions,
    });
    assert.equal(gate.ok, true);
  });

  it("10. Tony Stark founder deck verification increases after flavor alias fix", () => {
    const submitted = Array.from({ length: 100 }, (_, i) => `Card ${i}`);
    // Replace three founder holes with the real printed names.
    submitted[0] = "Black Panther's Claws";
    submitted[1] = "Megatron";
    submitted[2] = "Skybreaker, Sword of Bashenga";

    const before = buildDeckUnderstanding({
      submittedNames: submitted,
      resolvedNames: submitted.slice(3),
      unresolved: [
        { name: "Black Panther's Claws", reasonCode: "card_not_real" },
        { name: "Megatron", reasonCode: "card_not_real" },
        { name: "Skybreaker, Sword of Bashenga", reasonCode: "card_not_real" },
      ],
      commanderName: "Tony Stark, Iron Man",
      commanderResolved: true,
    });

    const after = buildDeckUnderstanding({
      submittedNames: submitted,
      resolvedNames: submitted,
      unresolved: [],
      commanderName: "Tony Stark, Iron Man",
      commanderResolved: true,
      resolutions: [
        {
          inputName: "Black Panther's Claws",
          displayName: "Black Panther's Claws",
          canonicalName: "Hammer of Nazahn",
          resolutionKind: "flavor_name_alias",
          confidence: "authoritative",
        },
        {
          inputName: "Megatron",
          displayName: "Megatron",
          canonicalName: "Blightsteel Colossus",
          resolutionKind: "flavor_name_alias",
          confidence: "authoritative",
        },
        {
          inputName: "Skybreaker, Sword of Bashenga",
          displayName: "Skybreaker, Sword of Bashenga",
          canonicalName: "Sword of the Animist",
          resolutionKind: "flavor_name_alias",
          confidence: "authoritative",
        },
      ],
    });

    assert.equal(before.percentStructurallyUnderstood, 97);
    assert.equal(before.cardsUnresolved, 3);
    assert.equal(after.percentStructurallyUnderstood, 100);
    assert.equal(after.cardsUnresolved, 0);
    assert.ok(after.percentStructurallyUnderstood > before.percentStructurallyUnderstood);
  });
});
