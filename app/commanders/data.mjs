// Curated commander guide pages — public, indexable, evidence-grounded.
// Each entry's card fields are a real Scryfall record (fetched and verified,
// never hand-typed from memory) shaped exactly like commanderOptionFromCard
// expects, so the "Build this deck" deep link produces the same
// CommanderOption a live Scryfall search would. This is deliberately a
// small, hand-curated batch (the heavily-played head, not the full legal
// pool) — same scoping choice as the archetype catalog: prove it small
// before expanding.
//
// tagline is a short, honest, mechanically-grounded description — never
// hype copy that overclaims beyond what the oracle text actually says.
import { commanderOptionFromCard } from "../deck-import-commander.mjs";

export const COMMANDER_GUIDES = Object.freeze([
  {
    slug: "korvold-fae-cursed-king",
    tagline: "Sacrifices its own permanents to grow itself and draw cards — the engine wants a steady stream of things to feed it.",
    card: Object.freeze({
      name: "Korvold, Fae-Cursed King",
      mana_cost: "{2}{B}{R}{G}",
      type_line: "Legendary Creature — Dragon Noble",
      color_identity: ["B", "G", "R"],
      oracle_text: "Flying\nWhenever Korvold enters or attacks, sacrifice another permanent.\nWhenever you sacrifice a permanent, put a +1/+1 counter on Korvold and draw a card.",
      set: "eoc",
      set_name: "Edge of Eternities Commander",
      games: ["paper", "mtgo"],
      legalities: { commander: "legal", brawl: "legal" },
      image_uris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/6/0/607c1793-8e5a-4ebf-87c6-7f9c99bbd29a.jpg",
        normal: "https://cards.scryfall.io/normal/front/6/0/607c1793-8e5a-4ebf-87c6-7f9c99bbd29a.jpg",
      },
    }),
  },
  {
    slug: "edgar-markov",
    tagline: "Every Vampire spell you cast makes a token, and attacking grows the whole team — a go-wide tribal commander that rewards a deck built almost entirely around one creature type.",
    card: Object.freeze({
      name: "Edgar Markov",
      mana_cost: "{3}{R}{W}{B}",
      type_line: "Legendary Creature — Vampire Knight",
      color_identity: ["B", "R", "W"],
      oracle_text: "Eminence — Whenever you cast another Vampire spell, if Edgar is in the command zone or on the battlefield, create a 1/1 black Vampire creature token.\nFirst strike, haste\nWhenever Edgar attacks, put a +1/+1 counter on each Vampire you control.",
      set: "inr",
      set_name: "Innistrad Remastered",
      games: ["paper", "mtgo"],
      legalities: { commander: "legal", brawl: "not_legal" },
      image_uris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/a/5/a577ba08-0aa8-45be-aa83-d5078770127c.jpg",
        normal: "https://cards.scryfall.io/normal/front/a/5/a577ba08-0aa8-45be-aa83-d5078770127c.jpg",
      },
    }),
  },
  {
    slug: "yuriko-the-tigers-shadow",
    tagline: "Sneaks into play with ninjutsu, then turns every unblocked Ninja hit into a card off the top of your library and life loss to match its cost.",
    card: Object.freeze({
      name: "Yuriko, the Tiger's Shadow",
      mana_cost: "{1}{U}{B}",
      type_line: "Legendary Creature — Human Ninja",
      color_identity: ["B", "U"],
      oracle_text: "Commander ninjutsu {U}{B} ({U}{B}, Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand or the command zone tapped and attacking.)\nWhenever a Ninja you control deals combat damage to a player, reveal the top card of your library and put that card into your hand. Each opponent loses life equal to that card's mana value.",
      set: "cmm",
      set_name: "Commander Masters",
      games: ["paper", "mtgo"],
      legalities: { commander: "legal", brawl: "legal" },
      image_uris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/f/e/fe9be3e0-076c-4703-9750-2a6b0a178bc9.jpg",
        normal: "https://cards.scryfall.io/normal/front/f/e/fe9be3e0-076c-4703-9750-2a6b0a178bc9.jpg",
      },
    }),
  },
  {
    slug: "atraxa-grand-unifier",
    tagline: "A single huge card-advantage swing on entry, with no ongoing engine of its own — the payoff is one enormous hand-refill, not a repeating loop.",
    card: Object.freeze({
      name: "Atraxa, Grand Unifier",
      mana_cost: "{3}{G}{W}{U}{B}",
      type_line: "Legendary Creature — Phyrexian Angel",
      color_identity: ["B", "G", "U", "W"],
      oracle_text: "Flying, vigilance, deathtouch, lifelink\nWhen Atraxa enters, reveal the top ten cards of your library. For each card type, you may put a card of that type from among the revealed cards into your hand. Put the rest on the bottom of your library in a random order. (Artifact, battle, creature, enchantment, instant, land, planeswalker, and sorcery are card types.)",
      set: "one",
      set_name: "Phyrexia: All Will Be One",
      games: ["paper", "mtgo", "arena"],
      legalities: { commander: "legal", brawl: "legal" },
      image_uris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/4/a/4a1f905f-1d55-4d02-9d24-e58070793d3f.jpg",
        normal: "https://cards.scryfall.io/normal/front/4/a/4a1f905f-1d55-4d02-9d24-e58070793d3f.jpg",
      },
    }),
  },
  {
    slug: "the-ur-dragon",
    tagline: "Makes every other Dragon cheaper and turns a Dragon attack into a wave of card draw and a free permanent — a tribal payoff built for a deck full of expensive creatures.",
    card: Object.freeze({
      name: "The Ur-Dragon",
      mana_cost: "{4}{W}{U}{B}{R}{G}",
      type_line: "Legendary Creature — Dragon Avatar",
      color_identity: ["B", "G", "R", "U", "W"],
      oracle_text: "Eminence — As long as The Ur-Dragon is in the command zone or on the battlefield, other Dragon spells you cast cost {1} less to cast.\nFlying\nWhenever one or more Dragons you control attack, draw that many cards, then you may put a permanent card from your hand onto the battlefield.",
      set: "cmm",
      set_name: "Commander Masters",
      games: ["paper", "mtgo"],
      legalities: { commander: "legal", brawl: "not_legal" },
      image_uris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg",
        normal: "https://cards.scryfall.io/normal/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg",
      },
    }),
  },
  {
    slug: "muldrotha-the-gravetide",
    tagline: "Turns the graveyard into a second hand by letting you play one permanent of each type from it every turn.",
    card: Object.freeze({
      "name": "Muldrotha, the Gravetide",
      "mana_cost": "{3}{B}{G}{U}",
      "type_line": "Legendary Creature — Elemental Avatar",
      "color_identity": [
        "B",
        "G",
        "U"
      ],
      "oracle_text": "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. (If a card has multiple permanent types, choose one as you play it.)",
      "set": "ecc",
      "set_name": "Lorwyn Eclipsed Commander",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/7/0/705b4d97-2f50-47f7-9053-d748f4337553.jpg?1783904538",
        "normal": "https://cards.scryfall.io/normal/front/7/0/705b4d97-2f50-47f7-9053-d748f4337553.jpg?1783904538"
      }
    }),
  },
  {
    slug: "atraxa-praetors-voice",
    tagline: "Combines four useful combat abilities with repeatable proliferation at every end step.",
    card: Object.freeze({
      "name": "Atraxa, Praetors' Voice",
      "mana_cost": "{G}{W}{U}{B}",
      "type_line": "Legendary Creature — Phyrexian Angel Horror",
      "color_identity": [
        "B",
        "G",
        "U",
        "W"
      ],
      "oracle_text": "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)",
      "set": "2xm",
      "set_name": "Double Masters",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg?1783930136",
        "normal": "https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg?1783930136"
      }
    }),
  },
  {
    slug: "krenko-mob-boss",
    tagline: "Converts every Goblin already in play into another wave of Goblin tokens.",
    card: Object.freeze({
      "name": "Krenko, Mob Boss",
      "mana_cost": "{2}{R}{R}",
      "type_line": "Legendary Creature — Goblin Warrior",
      "color_identity": [
        "R"
      ],
      "oracle_text": "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
      "set": "fdn",
      "set_name": "Foundations",
      "games": [
        "paper",
        "arena",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/8/2/824b2d73-2151-4e5e-9f05-8f63e2bdcaa9.jpg?1783909065",
        "normal": "https://cards.scryfall.io/normal/front/8/2/824b2d73-2151-4e5e-9f05-8f63e2bdcaa9.jpg?1783909065"
      }
    }),
  },
  {
    slug: "wilhelt-the-rotcleaver",
    tagline: "Rewards nontoken Zombies dying with replacement bodies and can cash a Zombie in for a card each turn.",
    card: Object.freeze({
      "name": "Wilhelt, the Rotcleaver",
      "mana_cost": "{2}{U}{B}",
      "type_line": "Legendary Creature — Zombie Warrior",
      "color_identity": [
        "B",
        "U"
      ],
      "oracle_text": "Whenever another Zombie you control dies, if it didn't have decayed, create a 2/2 black Zombie creature token with decayed. (It can't block. When it attacks, sacrifice it at end of combat.)\nAt the beginning of your end step, you may sacrifice a Zombie. If you do, draw a card.",
      "set": "mic",
      "set_name": "Midnight Hunt Commander",
      "games": [
        "paper"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "not_legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/2/5/2501a911-d072-436d-ae3b-a5164e3b30aa.jpg?1783925384",
        "normal": "https://cards.scryfall.io/normal/front/2/5/2501a911-d072-436d-ae3b-a5164e3b30aa.jpg?1783925384"
      }
    }),
  },
  {
    slug: "lathril-blade-of-the-elves",
    tagline: "Builds an Elf army through combat, then turns ten untapped Elves into a table-wide life swing.",
    card: Object.freeze({
      "name": "Lathril, Blade of the Elves",
      "mana_cost": "{2}{B}{G}",
      "type_line": "Legendary Creature — Elf Noble",
      "color_identity": [
        "B",
        "G"
      ],
      "oracle_text": "Menace (This creature can't be blocked except by two or more creatures.)\nWhenever Lathril deals combat damage to a player, create that many 1/1 green Elf Warrior creature tokens.\n{T}, Tap ten untapped Elves you control: Each opponent loses 10 life and you gain 10 life.",
      "set": "fdn",
      "set_name": "Foundations",
      "games": [
        "paper",
        "arena",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/8/d/8d4e5480-a287-4a25-b855-a26dae555b1c.jpg?1783909053",
        "normal": "https://cards.scryfall.io/normal/front/8/d/8d4e5480-a287-4a25-b855-a26dae555b1c.jpg?1783909053"
      }
    }),
  },
  {
    slug: "miirym-sentinel-wyrm",
    tagline: "Copies every other nontoken Dragon that enters under your control.",
    card: Object.freeze({
      "name": "Miirym, Sentinel Wyrm",
      "mana_cost": "{3}{G}{U}{R}",
      "type_line": "Legendary Creature — Dragon Spirit",
      "color_identity": [
        "G",
        "R",
        "U"
      ],
      "oracle_text": "Flying, ward {2}\nWhenever another nontoken Dragon you control enters, create a token that's a copy of it, except the token isn't legendary.",
      "set": "clb",
      "set_name": "Commander Legends: Battle for Baldur's Gate",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/a/9/a934590b-5c70-4f07-af67-fbe817a99531.jpg?1783922689",
        "normal": "https://cards.scryfall.io/normal/front/a/9/a934590b-5c70-4f07-af67-fbe817a99531.jpg?1783922689"
      }
    }),
  },
  {
    slug: "pantlaza-sun-favored",
    tagline: "Turns the first Dinosaur to enter each turn into a discover trigger based on its toughness.",
    card: Object.freeze({
      "name": "Pantlaza, Sun-Favored",
      "mana_cost": "{2}{R}{G}{W}",
      "type_line": "Legendary Creature — Dinosaur",
      "color_identity": [
        "G",
        "R",
        "W"
      ],
      "oracle_text": "Whenever Pantlaza or another Dinosaur you control enters, you may discover X, where X is that creature's toughness. Do this only once each turn. (Exile cards from the top of your library until you exile a nonland card with that mana value or less. Cast it without paying its mana cost or put it into your hand. Put the rest on the bottom in a random order.)",
      "set": "lcc",
      "set_name": "The Lost Caverns of Ixalan Commander",
      "games": [
        "paper",
        "mtgo",
        "arena"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/2/5/2524645e-b066-4351-885b-10faa8d819d7.jpg?1783913937",
        "normal": "https://cards.scryfall.io/normal/front/2/5/2524645e-b066-4351-885b-10faa8d819d7.jpg?1783913937"
      }
    }),
  },
  {
    slug: "sauron-the-dark-lord",
    tagline: "Punishes opposing spells with a growing Army and rewards the Army connecting with a fresh hand.",
    card: Object.freeze({
      "name": "Sauron, the Dark Lord",
      "mana_cost": "{3}{U}{B}{R}",
      "type_line": "Legendary Creature — Avatar Horror",
      "color_identity": [
        "B",
        "R",
        "U"
      ],
      "oracle_text": "Ward—Sacrifice a legendary artifact or legendary creature.\nWhenever an opponent casts a spell, amass Orcs 1.\nWhenever an Army you control deals combat damage to a player, the Ring tempts you.\nWhenever the Ring tempts you, you may discard your hand. If you do, draw four cards.",
      "set": "ltr",
      "set_name": "The Lord of the Rings: Tales of Middle-earth",
      "games": [
        "paper",
        "mtgo",
        "arena"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/0/3/034e0929-b2c7-4b5f-94f2-8eaf4fb1a2a1.jpg?1783916249",
        "normal": "https://cards.scryfall.io/normal/front/0/3/034e0929-b2c7-4b5f-94f2-8eaf4fb1a2a1.jpg?1783916249"
      }
    }),
  },
  {
    slug: "isshin-two-heavens-as-one",
    tagline: "Doubles triggered abilities caused by your creatures attacking.",
    card: Object.freeze({
      "name": "Isshin, Two Heavens as One",
      "mana_cost": "{R}{W}{B}",
      "type_line": "Legendary Creature — Human Samurai",
      "color_identity": [
        "B",
        "R",
        "W"
      ],
      "oracle_text": "If a creature attacking causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
      "set": "neo",
      "set_name": "Kamigawa: Neon Dynasty",
      "games": [
        "paper",
        "mtgo",
        "arena"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/a/0/a062a004-984e-4b62-960c-af7288f7a3e9.jpg?1783923833",
        "normal": "https://cards.scryfall.io/normal/front/a/0/a062a004-984e-4b62-960c-af7288f7a3e9.jpg?1783923833"
      }
    }),
  },
  {
    slug: "kaalia-of-the-vast",
    tagline: "Cheats Angels, Demons, and Dragons from hand directly into combat.",
    card: Object.freeze({
      "name": "Kaalia of the Vast",
      "mana_cost": "{1}{R}{W}{B}",
      "type_line": "Legendary Creature — Human Cleric",
      "color_identity": [
        "B",
        "R",
        "W"
      ],
      "oracle_text": "Flying\nWhenever Kaalia attacks an opponent, you may put an Angel, Demon, or Dragon creature card from your hand onto the battlefield tapped and attacking that opponent.",
      "set": "mh3",
      "set_name": "Modern Horizons 3",
      "games": [
        "paper",
        "mtgo",
        "arena"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/e/7/e71c8c39-3fbb-4a42-9cf6-b3224f5a56fc.jpg?1783911211",
        "normal": "https://cards.scryfall.io/normal/front/e/7/e71c8c39-3fbb-4a42-9cf6-b3224f5a56fc.jpg?1783911211"
      }
    }),
  },
  {
    slug: "meren-of-clan-nel-toth",
    tagline: "Builds experience when your creatures die and converts it into repeatable creature recursion.",
    card: Object.freeze({
      "name": "Meren of Clan Nel Toth",
      "mana_cost": "{2}{B}{G}",
      "type_line": "Legendary Creature — Human Shaman",
      "color_identity": [
        "B",
        "G"
      ],
      "oracle_text": "Whenever another creature you control dies, you get an experience counter.\nAt the beginning of your end step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand.",
      "set": "tdc",
      "set_name": "Tarkir: Dragonstorm Commander",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "not_legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/5/0/508b1442-bf2c-4ad6-9bcf-bd894e081ab6.jpg?1783907026",
        "normal": "https://cards.scryfall.io/normal/front/5/0/508b1442-bf2c-4ad6-9bcf-bd894e081ab6.jpg?1783907026"
      }
    }),
  },
  {
    slug: "jodah-the-unifier",
    tagline: "Turns legendary creatures into a scaling team and chains each legendary spell into another cheaper legend.",
    card: Object.freeze({
      "name": "Jodah, the Unifier",
      "mana_cost": "{W}{U}{B}{R}{G}",
      "type_line": "Legendary Creature — Human Wizard",
      "color_identity": [
        "B",
        "G",
        "R",
        "U",
        "W"
      ],
      "oracle_text": "Legendary creatures you control get +X/+X, where X is the number of legendary creatures you control.\nWhenever you cast a legendary spell from your hand, exile cards from the top of your library until you exile a legendary nonland card with lesser mana value. You may cast that card without paying its mana cost. Put the rest on the bottom of your library in a random order.",
      "set": "dmu",
      "set_name": "Dominaria United",
      "games": [
        "paper",
        "arena",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/e/4/e4b1aa1e-b4e3-4346-8937-76b312501c70.jpg?1783921283",
        "normal": "https://cards.scryfall.io/normal/front/e/4/e4b1aa1e-b4e3-4346-8937-76b312501c70.jpg?1783921283"
      }
    }),
  },
  {
    slug: "giada-font-of-hope",
    tagline: "Accelerates Angels and makes each new Angel enter with counters for the Angels already assembled.",
    card: Object.freeze({
      "name": "Giada, Font of Hope",
      "mana_cost": "{1}{W}",
      "type_line": "Legendary Creature — Angel",
      "color_identity": [
        "W"
      ],
      "oracle_text": "Flying, vigilance\nEach other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control.\n{T}: Add {W}. Spend this mana only to cast an Angel spell.",
      "set": "fdn",
      "set_name": "Foundations",
      "games": [
        "paper",
        "arena",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/8/a/8ae6fc26-cfad-4da8-98d9-49c27c24d293.jpg?1783909085",
        "normal": "https://cards.scryfall.io/normal/front/8/a/8ae6fc26-cfad-4da8-98d9-49c27c24d293.jpg?1783909085"
      }
    }),
  },
  {
    slug: "teysa-karlov",
    tagline: "Doubles death triggers from your creatures while giving creature tokens vigilance and lifelink.",
    card: Object.freeze({
      "name": "Teysa Karlov",
      "mana_cost": "{2}{W}{B}",
      "type_line": "Legendary Creature — Human Advisor",
      "color_identity": [
        "B",
        "W"
      ],
      "oracle_text": "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nCreature tokens you control have vigilance and lifelink.",
      "set": "cmm",
      "set_name": "Commander Masters",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/c/d/cd14f1ce-7fcd-485c-b7ca-01c5b45fdc01.jpg?1783915608",
        "normal": "https://cards.scryfall.io/normal/front/c/d/cd14f1ce-7fcd-485c-b7ca-01c5b45fdc01.jpg?1783915608"
      }
    }),
  },
  {
    slug: "nekusar-the-mindrazer",
    tagline: "Adds extra cards for everyone while turning opponents’ draws into damage.",
    card: Object.freeze({
      "name": "Nekusar, the Mindrazer",
      "mana_cost": "{2}{U}{B}{R}",
      "type_line": "Legendary Creature — Zombie Wizard",
      "color_identity": [
        "B",
        "R",
        "U"
      ],
      "oracle_text": "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar deals 1 damage to that player.",
      "set": "cmm",
      "set_name": "Commander Masters",
      "games": [
        "paper",
        "mtgo"
      ],
      "legalities": {
        "commander": "legal",
        "brawl": "not_legal"
      },
      "image_uris": {
        "art_crop": "https://cards.scryfall.io/art_crop/front/4/a/4afdc65d-3c97-47af-83fa-df340389802e.jpg?1783915612",
        "normal": "https://cards.scryfall.io/normal/front/4/a/4afdc65d-3c97-47af-83fa-df340389802e.jpg?1783915612"
      }
    }),
  },
]);

export function commanderGuideBySlug(slug) {
  return COMMANDER_GUIDES.find((entry) => entry.slug === slug) || null;
}

/** The exact CommanderOption shape page.tsx's selectedCommander state expects. */
export function commanderOptionForSlug(slug) {
  const entry = commanderGuideBySlug(slug);
  return entry ? commanderOptionFromCard(entry.card) : null;
}
