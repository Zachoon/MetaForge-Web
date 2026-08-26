import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCommanderPowerSignal } from "../app/commander-power-signal.mjs";

const card = (name, typeLine, oracleText, cmc, isCommander = false) => ({ name, typeLine, oracleText, cmc, isCommander });
const filler = (prefix, count, cmc = 3) => Array.from({ length: count }, (_, index) => card(`${prefix} ${index + 1}`, "Creature", "", cmc));

// These are transparent calibration profiles, not claims that a label is an
// objective property of a deck. Each profile records why its expectation was
// chosen and the public source that establishes the play context or list.
const BENCHMARKS = [
  {
    id: "published-ready-to-play",
    source: "https://magic.wizards.com/en/news/announcements/marvel-super-heroes-commander-decklists",
    rationale: "Wizards-published ready-to-play Commander shell with ordinary development and no compact instantaneous win package in the evidence represented here.",
    expected: ["Casual", "Focused"],
    expectedConfidence: "Moderate",
    cards: [
      card("Zuri, Warrior of Wakanda", "Legendary Creature", "Other creatures you control get +1/+1.", 4, true),
      card("Sol Ring", "Artifact", "{T}: Add {C}{C}.", 1),
      card("Birds of Paradise", "Creature", "{T}: Add one mana of any color.", 1),
      card("Arcane Signet", "Artifact", "{T}: Add one mana of any color in your commander's color identity.", 2),
      ...filler("Published precon role-player", 96, 4),
    ],
  },
  {
    id: "optimized-instant-win-profile",
    source: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025",
    rationale: "Wizards describes Optimized play through explosive starts, free disruption, efficient instantaneous wins, and efficient tutors; this profile contains all four.",
    expected: ["High-Power", "Maximum"],
    expectedConfidence: "High",
    cards: [
      card("Test Commander", "Legendary Creature", "Whenever you cast an instant or sorcery spell, draw a card.", 3, true),
      card("Mana Vault", "Artifact", "{T}: Add {C}{C}{C}.", 1),
      card("Grim Monolith", "Artifact", "{T}: Add {C}{C}{C}.", 2),
      card("Chrome Mox", "Artifact", "Imprint — exile a card. {T}: Add one mana of any of the exiled card's colors.", 0),
      card("Demonic Tutor", "Sorcery", "Search your library for a card, put that card into your hand, then shuffle.", 2),
      card("Vampiric Tutor", "Instant", "Search your library for a card, then shuffle and put that card on top.", 1),
      card("Worldly Tutor", "Instant", "Search your library for a creature card, reveal it, then shuffle and put it on top.", 1),
      card("Force of Will", "Instant", "You may pay 1 life and exile a blue card from your hand rather than pay this spell's mana cost. Counter target spell.", 5),
      card("Fierce Guardianship", "Instant", "If you control a commander, you may cast this spell without paying its mana cost. Counter target noncreature spell.", 3),
      card("Thassa's Oracle", "Creature", "When this creature enters, if your devotion to blue is greater than or equal to the number of cards in your library, you win the game.", 2),
      ...filler("Optimized role-player", 90, 2),
    ],
  },
];

for (const benchmark of BENCHMARKS) {
  test(`calibration benchmark: ${benchmark.id}`, () => {
    assert.match(benchmark.source, /^https:\/\//);
    assert.ok(benchmark.rationale.length > 40);
    const result = evaluateCommanderPowerSignal(benchmark.cards);
    assert.ok(benchmark.expected.includes(result.tier), `${benchmark.id} measured ${result.tier}; expected ${benchmark.expected.join(" or ")}`);
    assert.equal(result.confidence, benchmark.expectedConfidence);
  });
}
