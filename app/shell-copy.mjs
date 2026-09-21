// Player-facing names and one-line descriptions for every shell (package /
// archetype) the picker can offer. The catalog labels ("Counters-matter
// package") are internal; a player choosing what to build around needs to
// know what it means. tests/shell-copy.test.mjs fails if a shell is added to
// the catalog without copy here, so the picker never falls back to jargon.

export const SHELL_COPY = Object.freeze({
  auras: { name: "Auras", blurb: "Stack Auras on a creature to make one protected, must-answer threat." },
  equipment: { name: "Equipment", blurb: "Load creatures up with Equipment and swing." },
  aristocrats: { name: "Aristocrats", blurb: "Sacrifice creatures for value and drain opponents as things die." },
  reanimator: { name: "Reanimator", blurb: "Fill your graveyard, then bring back big creatures cheaply." },
  tokens: { name: "Tokens", blurb: "Make lots of creature tokens and go wide." },
  landfall: { name: "Landfall", blurb: "Get value every time a land enters the battlefield." },
  typal: { name: "Tribal", blurb: "Build around a creature type and the cards that reward it." },
  spellslinger: { name: "Spellslinger", blurb: "Cast lots of cheap instants and sorceries and get rewarded for each." },
  blink: { name: "Blink", blurb: "Flicker creatures to reuse their enter-the-battlefield effects." },
  stax: { name: "Stax", blurb: "Tax and restrict what opponents can do while you stay ahead." },
  artifacts_matter: { name: "Artifacts", blurb: "Artifacts everywhere, with payoffs for casting and controlling them." },
  counters_matter: { name: "Counters", blurb: "+1/+1 counters and the cards that double, move or reward them." },
  group_hug: { name: "Group hug", blurb: "Give everyone resources and steer the table with them." },
  lifegain: { name: "Lifegain", blurb: "Gain life and turn it into cards and damage." },
  lands_matter: { name: "Lands matter", blurb: "Play extra lands and win with land-based payoffs." },
  land_sacrifice: { name: "Land sacrifice", blurb: "Sacrifice lands for value and keep replaying them." },
  burn: { name: "Burn", blurb: "Point damage at opponents and their creatures." },
  enchantress: { name: "Enchantress", blurb: "Cast enchantments and draw cards off each one." },
  mill: { name: "Mill", blurb: "Put opponents' libraries into their graveyards." },
  wheels: { name: "Wheels", blurb: "Make everyone discard and redraw, with payoffs for it." },
  legends: { name: "Legends", blurb: "Play legendary spells and get rewarded for controlling legends." },
  discard: { name: "Discard", blurb: "Strip opponents' hands and punish what they can't cast." },
  graveyard: { name: "Graveyard", blurb: "Use your graveyard as a second hand." },
  clones: { name: "Clones", blurb: "Copy the best creatures on the table." },
  flying: { name: "Flyers", blurb: "Win in the air with evasive creatures and support." },
  group_slug: { name: "Group slug", blurb: "Chip everyone for a little each turn until you're the last one standing." },
  infect: { name: "Infect", blurb: "Win with poison counters instead of life loss." },
  extra_combats: { name: "Extra combats", blurb: "Take extra combat phases to multiply your attacks." },
  theft: { name: "Theft", blurb: "Steal opponents' cards and use them yourself." },
  superfriends: { name: "Superfriends", blurb: "Planeswalkers, protected by a board that keeps them alive." },
  goad: { name: "Goad", blurb: "Force opponents' creatures to attack each other." },
  vehicles: { name: "Vehicles", blurb: "Crew Vehicles with your creatures for big attackers." },
  neg_counters: { name: "-1/-1 counters", blurb: "Shrink creatures with -1/-1 counters and profit from it." },
  pillow_fort: { name: "Pillow fort", blurb: "Make attacking you a bad idea, then win at your leisure." },
  toughness_matters: { name: "Toughness", blurb: "Big-toughness creatures that hit using toughness." },
  extra_turns: { name: "Extra turns", blurb: "Take extra turns and chain them together." },
  sagas: { name: "Sagas", blurb: "Chapter-by-chapter Saga value, reused again and again." },
  energy: { name: "Energy", blurb: "Generate energy and spend it on powerful effects." },
  populate: { name: "Populate", blurb: "Copy your best tokens with populate." },
  monarch: { name: "Monarch", blurb: "Take and keep the monarch for a steady stream of cards." },
  anthems: { name: "Anthems", blurb: "Pump your whole board with static bonuses." },
  devotion: { name: "Devotion", blurb: "Fill the board with one color's symbols to power devotion payoffs." },
  cascade: { name: "Cascade", blurb: "Cast spells for free with cascade and its relatives." },
  cantrips: { name: "Cantrips", blurb: "Cheap spells that replace themselves and fuel your engines." },
  toolbox: { name: "Toolbox", blurb: "A flexible set of answers you find as the game needs them." },
  x_spells: { name: "X spells", blurb: "Scalable X spells that get better as the game goes long." },
  exile_matters: { name: "Exile", blurb: "Exile cards and get value from them." },
  hatebears: { name: "Hatebears", blurb: "Small disruptive creatures that tax and slow opponents." },
  spell_copy: { name: "Spell copy", blurb: "Copy your best spells for double the effect." },
});

/** {name, blurb} for a shell option, falling back to the catalog label. */
export function shellDisplay(option) {
  const copy = SHELL_COPY[option?.id];
  return {
    name: copy?.name || String(option?.label || option?.id || "").replace(/\s+package$/i, ""),
    blurb: copy?.blurb || "",
  };
}
