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
]);

export function commanderGuideBySlug(slug) {
  return COMMANDER_GUIDES.find((entry) => entry.slug === slug) || null;
}

/** The exact CommanderOption shape page.tsx's selectedCommander state expects. */
export function commanderOptionForSlug(slug) {
  const entry = commanderGuideBySlug(slug);
  return entry ? commanderOptionFromCard(entry.card) : null;
}
