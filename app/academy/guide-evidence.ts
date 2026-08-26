export type GuideCardExample = {
  name: string; manaCost: string; typeLine: string; oracleText: string;
  image: string; cardUrl: string; artist: string; setName: string; lesson: string;
};

export type GuideSource = { title: string; publisher: string; url: string; usedFor: string };
export type GuideEvidence = { evidenceNote: string; cards: GuideCardExample[]; sources: GuideSource[] };

const COMMANDER_RULES: GuideSource = {
  title: "Commander format rules and current bracket overview", publisher: "Wizards of the Coast",
  url: "https://magic.wizards.com/en/formats/commander",
  usedFor: "Deck size, singleton construction, color identity, command-zone rules, and the current five-bracket framework.",
};
const SCRYFALL_DATA: GuideSource = {
  title: "Scryfall card data and image API", publisher: "Scryfall", url: "https://scryfall.com/docs/api/cards",
  usedFor: "Canonical card names, mana costs, type lines, current Oracle text, printing information, and card images shown in the examples.",
};
const cardSource = (card: GuideCardExample): GuideSource => ({
  title: `${card.name} card record`, publisher: "Scryfall", url: card.cardUrl,
  usedFor: `Oracle text, mana cost, card type, printing, and artwork for ${card.name}.`,
});

const CARD = {
  rhysticStudy: {
    name: "Rhystic Study", manaCost: "{2}{U}", typeLine: "Enchantment",
    oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",
    image: "https://cards.scryfall.io/normal/front/9/f/9f37c5b6-a59c-45cd-9a99-e9357fe9ea1b.jpg?1783919146",
    cardUrl: "https://scryfall.com/card/j22/114/rhystic-study", artist: "Tatiana Kirgetova", setName: "Jumpstart 2022",
    lesson: "A repeatable engine can move a hand ahead many times, but its output depends on opponents casting spells and declining to pay.",
  },
  nightsWhisper: {
    name: "Night's Whisper", manaCost: "{1}{B}", typeLine: "Sorcery", oracleText: "You draw two cards and lose 2 life.",
    image: "https://cards.scryfall.io/normal/front/e/8/e8399c2e-ecc8-41c9-a690-a0eeafb27f77.jpg?1785497515",
    cardUrl: "https://scryfall.com/card/hoc/189/nights-whisper", artist: "Miranda Meeks", setName: "The Hobbit Eternal",
    lesson: "A fixed burst spell provides cards immediately without needing a board, illustrating why reliability and timing matter alongside raw quantity.",
  },
  swords: {
    name: "Swords to Plowshares", manaCost: "{W}", typeLine: "Instant", oracleText: "Exile target creature. Its controller gains life equal to its power.",
    image: "https://cards.scryfall.io/normal/front/b/4/b4e9c870-23c0-413a-ae39-265f09da16d1.jpg?1783903243",
    cardUrl: "https://scryfall.com/card/msc/143/swords-to-plowshares", artist: "Greg Smallwood", setName: "Marvel Super Heroes Commander",
    lesson: "A one-mana instant answers a creature efficiently, but it does not cover artifacts, enchantments, graveyards, or spells on the stack.",
  },
  beastWithin: {
    name: "Beast Within", manaCost: "{2}{G}", typeLine: "Instant", oracleText: "Destroy target permanent. Its controller creates a 3/3 green Beast creature token.",
    image: "https://cards.scryfall.io/normal/front/4/0/400b43aa-c1d2-4435-b863-061f43889422.jpg?1783903232",
    cardUrl: "https://scryfall.com/card/msc/169/beast-within", artist: "Thomas Chamberlain-Keen", setName: "Marvel Super Heroes Commander",
    lesson: "Broad permanent coverage costs more mana and leaves compensation behind, showing the tradeoff between flexibility and efficiency.",
  },
  commandTower: {
    name: "Command Tower", manaCost: "", typeLine: "Land", oracleText: "{T}: Add one mana of any color in your commander's color identity.",
    image: "https://cards.scryfall.io/normal/front/0/5/0548fb60-c843-4f8f-a029-6f10efc63a41.jpg?1783903206",
    cardUrl: "https://scryfall.com/card/msc/233/command-tower", artist: "Leon Tukker", setName: "Marvel Super Heroes Commander",
    lesson: "Command Tower demonstrates how the commander's color identity directly shapes the mana base in a multiplayer Commander deck.",
  },
  arcaneSignet: {
    name: "Arcane Signet", manaCost: "{2}", typeLine: "Artifact", oracleText: "{T}: Add one mana of any color in your commander's color identity.",
    image: "https://cards.scryfall.io/normal/front/1/c/1cad1bd2-7c56-4ce0-99a6-b2a49c1288dd.jpg?1783903222",
    cardUrl: "https://scryfall.com/card/msc/191/arcane-signet", artist: "Jason Smith", setName: "Marvel Super Heroes Commander",
    lesson: "Arcane Signet is early acceleration and color fixing, but it still requires a keepable hand capable of producing its first two mana.",
  },
  demonicTutor: {
    name: "Demonic Tutor", manaCost: "{1}{B}", typeLine: "Sorcery", oracleText: "Search your library for a card, put that card into your hand, then shuffle.",
    image: "https://cards.scryfall.io/normal/front/a/2/a24b4cb6-cebb-428b-8654-74347a6a8d63.jpg?1783915679",
    cardUrl: "https://scryfall.com/card/cmm/150/demonic-tutor", artist: "Zack Stella", setName: "Commander Masters",
    lesson: "An unrestricted two-mana tutor greatly increases access to a deck's strongest card or compact win line, making consistency part of power evaluation.",
  },
  farewell: {
    name: "Farewell", manaCost: "{4}{W}{W}", typeLine: "Sorcery",
    oracleText: "Choose one or more — Exile all artifacts; exile all creatures; exile all enchantments; exile all graveyards.",
    image: "https://cards.scryfall.io/normal/front/1/1/114d2180-093b-4838-97ad-badbc8ee50b0.jpg?1783913032",
    cardUrl: "https://scryfall.com/card/mkc/64/farewell", artist: "Seb McKinnon", setName: "Murders at Karlov Manor Commander",
    lesson: "Farewell shows why power discussions include play experience as well as speed: its unusually broad exile reset is currently identified as a Game Changer.",
  },
} satisfies Record<string, GuideCardExample>;

export const GUIDE_EVIDENCE: Record<string, GuideEvidence> = {
  "how-much-card-draw-should-a-commander-deck-have": {
    evidenceNote: "Card facts are sourced directly. The balance between burst draw, repeatable engines, and setup requirements is MetaForge's strategic synthesis—not an official universal card-count rule.",
    cards: [CARD.rhysticStudy, CARD.nightsWhisper],
    sources: [COMMANDER_RULES, SCRYFALL_DATA, cardSource(CARD.rhysticStudy), cardSource(CARD.nightsWhisper)],
  },
  "how-many-removal-spells-should-i-play-in-commander": {
    evidenceNote: "No official Commander rule prescribes a removal count. MetaForge derives the balance between efficiency and coverage from representative answers, then asks players to test against their own games.",
    cards: [CARD.swords, CARD.beastWithin],
    sources: [COMMANDER_RULES, SCRYFALL_DATA, cardSource(CARD.swords), cardSource(CARD.beastWithin)],
  },
  "how-to-build-a-commander-deck": {
    evidenceNote: "The 100-card, singleton, color-identity, and command-zone constraints are official rules. Package construction and testing advice are MetaForge's explainable deckbuilding method.",
    cards: [CARD.commandTower, CARD.arcaneSignet],
    sources: [COMMANDER_RULES, SCRYFALL_DATA, cardSource(CARD.commandTower), cardSource(CARD.arcaneSignet)],
  },
  "how-to-evaluate-commander-power-level": {
    evidenceNote: "Commander Brackets remain a beta matchmaking tool, not a complete mathematical score. MetaForge uses official bracket and Game Changer signals as evidence while labeling consistency and resilience analysis as strategic judgment.",
    cards: [CARD.demonicTutor, CARD.farewell],
    sources: [COMMANDER_RULES, {
      title: "Commander Brackets Beta update — February 9, 2026", publisher: "Wizards of the Coast",
      url: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026",
      usedFor: "Current bracket status and the addition of Farewell to the Game Changers list.",
    }, SCRYFALL_DATA, cardSource(CARD.demonicTutor), cardSource(CARD.farewell)],
  },
};

export function guideEvidenceBySlug(slug: string) { return GUIDE_EVIDENCE[slug]; }
