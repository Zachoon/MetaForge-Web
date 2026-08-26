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
  {
    id: "stax-without-fast-mana",
    source: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025",
    rationale: "The official Optimized description includes disruptive game compression; this profile creates redundant resource restrictions without relying on fast mana or a famous combo.",
    expected: ["High-Power", "Maximum"], expectedConfidence: "Moderate", expectedPattern: { resourceDenialAtLeast: 4 },
    cards: [
      card("Tax Commander", "Legendary Creature", "Spells your opponents cast cost {1} more to cast.", 3, true),
      card("One Spell Rule", "Enchantment", "Each player can't cast more than one spell each turn.", 3),
      card("Untap Limit", "Artifact", "Players can't untap more than one creature during their untap steps.", 3),
      card("Opponent Tap Field", "Enchantment", "Artifacts your opponents control enter the battlefield tapped.", 2),
      ...filler("Stax role-player", 96, 3),
    ],
  },
  {
    id: "fragile-turbo-combo",
    source: "https://github.com/cEDH-Decklist-Database/cEDH-Decklist-Database",
    rationale: "A competitive-context glass cannon can be fast and consistent while carrying little broad protection; the engine must report both its ceiling and its fragility.",
    expected: ["High-Power", "Maximum"], expectedConfidence: "High", expectedPattern: { resilience: "Fragile" },
    cards: [
      card("Turbo Commander", "Legendary Creature", "Whenever you cast a spell, draw a card.", 3, true),
      card("Burst Rock A", "Artifact", "{T}: Add {C}{C}.", 1), card("Burst Rock B", "Artifact", "{T}: Add {C}{C}{C}.", 2),
      card("Burst Ritual", "Instant", "Add {B}{B}{B}.", 1),
      card("Tutor A", "Sorcery", "Search your library for a card, put it into your hand, then shuffle.", 2),
      card("Tutor B", "Instant", "Search your library for a card, then shuffle and put it on top.", 1),
      card("Compact Win", "Creature", "When this creature enters, if your library is empty, you win the game.", 2),
      ...filler("Turbo role-player", 93, 2),
    ],
  },
  {
    id: "resilient-upgraded-engine",
    source: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025",
    rationale: "Strong synergy plus several broad protection effects should distinguish a resilient high-ceiling engine from an equally fast glass cannon.",
    expected: ["High-Power", "Maximum"], expectedConfidence: "Moderate", expectedPattern: { resilience: "Resilient" },
    cards: [
      card("Value Commander", "Legendary Creature", "At the beginning of your upkeep, draw a card.", 4, true),
      card("Engine A", "Creature", "At the beginning of your upkeep, draw a card.", 3),
      card("Engine B", "Creature", "Whenever a creature you control dies, draw a card.", 3),
      card("Engine C", "Creature", "Whenever you cast a spell, create a Treasure token.", 3),
      card("Shield A", "Instant", "Permanents you control gain hexproof until end of turn.", 2),
      card("Shield B", "Instant", "Creatures you control gain indestructible until end of turn.", 2),
      card("Shield C", "Enchantment", "Spells you control can't be countered.", 3),
      ...filler("Resilient role-player", 93, 3),
    ],
  },
  {
    id: "powerful-without-famous-staples",
    source: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025",
    rationale: "The official framework is about experience and intent, so a mechanically dense optimized shell must score highly even when it contains zero named Game Changers.",
    expected: ["High-Power", "Maximum"], expectedConfidence: "High", expectedPattern: { noGameChangers: true },
    cards: [
      card("Novel Commander", "Legendary Creature", "Whenever you cast an instant or sorcery spell, draw a card.", 3, true),
      card("Novel Engine A", "Creature", "At the beginning of your upkeep, draw a card.", 2),
      card("Novel Engine B", "Creature", "Whenever a creature you control dies, draw a card.", 2),
      card("Novel Multiplier A", "Enchantment", "Double the amount of mana you produce.", 3),
      card("Novel Multiplier B", "Instant", "Copy target instant spell.", 2),
      card("Novel Free Answer", "Instant", "You may exile a card rather than pay this spell's mana cost. Counter target spell.", 4),
      card("Novel Win", "Sorcery", "If you control five artifacts, you win the game.", 3),
      ...filler("Novel optimized role-player", 93, 2),
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
    if (benchmark.expectedPattern?.resourceDenialAtLeast) assert.ok(result.resourceDenial.length >= benchmark.expectedPattern.resourceDenialAtLeast);
    if (benchmark.expectedPattern?.resilience) assert.equal(result.playPattern.resilience, benchmark.expectedPattern.resilience);
    if (benchmark.expectedPattern?.noGameChangers) assert.equal(result.gameChangers.count, 0);
  });
}
