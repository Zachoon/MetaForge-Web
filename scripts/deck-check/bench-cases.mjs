// MF-DECK-COACH-002 — the 20+ deck Deck Check benchmark: expected results.
//
// Every expectation here was written from the cards' printed Oracle text
// (snapshotted in tests/fixtures/deck-bench/*.facts.json, Scryfall,
// 2026-11-18) and ordinary Commander deck-building knowledge, not from what
// the engine happens to output. Where the engine is known to fall short (a
// plan it cannot read), the expectation still says what a player would
// expect, so the benchmark keeps that gap visible instead of hiding it.
//
// `core` lists the cards a player of that deck would call the plan itself.
// Suggesting one of them as a cut is counted as false-positive advice.

export const GO_WIDE = new Set(["typal", "tokens", "creatures"]);

/** Swap-catalog adds that only make sense for a deck with a creature board. */
export const BOARD_FINISHERS = new Set(["Craterhoof Behemoth", "Overrun", "Triumph of the Hordes", "Akroma's Will", "Insurrection"]);
/** Symmetric creature wipes: wrong advice for a deck that wins with its own creatures. */
export const SYMMETRIC_CREATURE_WIPES = new Set(["Blasphemous Act", "Wrath of God", "Damnation", "Toxic Deluge"]);

export const BENCH_CASES = Object.freeze([
  {
    id: "ezuri-elves", dir: "deck-coach", file: "ezuri-elves-needs-work", format: "commander", kind: "flawed",
    note: "Elves typal with real holes (draw, interaction) and one genuine color-identity error.",
    errors: ["color-identity"], plan: ["typal"],
    roles: {
      "Ezuri's Predation": { wipes: true, wipeScope: "one-sided" },
      "Elvish Archdruid": { ramp: true, wincon: false },
      "Elvish Clancaller": { tutor: false },
      "Craterhoof Behemoth": { wincon: true },
      "Llanowar Elves": { ramp: true },
      "Heroic Intervention": { protection: true },
    },
    forbidWeakness: ["role-wipes"], requireWeakness: ["role-draw", "role-interaction"],
    core: ["Ezuri's Predation", "Craterhoof Behemoth", "Elvish Archdruid", "Coat of Arms", "Overrun", "Beastmaster Ascension", "Door of Destinies", "Elvish Clancaller"],
  },
  {
    id: "talrand-spells", dir: "deck-coach", file: "talrand-spells-solid", format: "commander", kind: "sound",
    note: "Sound mono-blue spellslinger; Arena set codes.",
    errors: [], plan: ["spellslinger"],
    roles: { "Counterspell": { interaction: true }, "Arcane Signet": { ramp: true }, "Swan Song": { interaction: true } },
    requireWeakness: ["role-ramp"],
    core: [],
  },
  {
    id: "krenko-invalid", dir: "deck-coach", file: "krenko-invalid-edge", format: "commander", kind: "flawed",
    note: "43-card Goblins list with six construction errors.",
    errors: ["banned", "color-identity", "copy-limit", "deck-size", "unknown-card"], plan: ["typal"],
    roles: { "Dockside Extortionist": { ramp: false }, "Lightning Bolt": { interaction: true } },
    forbidWeakness: ["role-wipes"],
    uncertainty: { planConfidenceNot: "high", limitMatches: /well short of 100 cards/ },
    core: ["Siege-Gang Commander", "Goblin Bombardment"],
  },
  {
    id: "burn-modern", dir: "deck-coach", file: "modern-burn-60", format: "modern", kind: "legality",
    note: "60-card Modern burn with sideboard.", errors: [], status: "structure-only",
  },
  {
    id: "burn-as-standard", dir: "deck-coach", file: "modern-burn-60", format: "standard", kind: "legality",
    note: "The same list checked as Standard: every older card is not legal.", errors: ["not-legal"], status: "structure-only",
  },
  {
    id: "atraxa-counters", dir: "deck-bench", file: "atraxa-counters", format: "commander", kind: "sound",
    note: "Four-color +1/+1 counters and planeswalkers.", errors: [], plan: ["counters"],
    roles: { "Cultivate": { ramp: true }, "Toxic Deluge": { wipes: true }, "Farewell": { wipes: true }, "Rhystic Study": { draw: true }, "Teferi's Protection": { protection: true }, "Swords to Plowshares": { interaction: true } },
    uncertainty: { sentenceMatches: /reads as \+1\/\+1 counters/ },
    core: ["Doubling Season", "Hardened Scales", "Winding Constrictor", "The Ozolith", "Vorinclex, Monstrous Raider", "Deepglow Skate", "Inexorable Tide", "Flux Channeler", "Evolution Sage", "Walking Ballista", "Kalonian Hydra", "Triumph of the Hordes"],
  },
  {
    id: "meren-aristocrats", dir: "deck-bench", file: "meren-aristocrats", format: "commander", kind: "sound",
    note: "Golgari sacrifice and recursion.", errors: [], plan: ["aristocrats", "graveyard"],
    roles: { "Pernicious Deed": { wipes: true }, "Massacre Wurm": { wipes: true, wipeScope: "one-sided" }, "Phyrexian Arena": { draw: true }, "Gray Merchant of Asphodel": { wincon: true }, "Demonic Tutor": { tutor: true }, "Ashnod's Altar": { ramp: false } },
    core: ["Butcher of Malakir", "Kokusho, the Evening Star", "Grave Pact", "Dictate of Erebos", "Pitiless Plunderer", "Blood Artist", "Zulaport Cutthroat", "Ashnod's Altar", "Phyrexian Altar", "Viscera Seer", "Carrion Feeder", "Skirsdag High Priest", "Syr Konrad, the Grim", "Massacre Wurm", "Gray Merchant of Asphodel", "Demonic Tutor", "Vampiric Tutor"],
  },
  {
    id: "edgar-vampires", dir: "deck-bench", file: "edgar-vampires", format: "commander", kind: "sound",
    note: "Mardu Vampires go-wide.", errors: [], plan: ["typal"],
    roles: { "Kindred Dominance": { wipes: true, wipeScope: "spares-type" }, "Legion Lieutenant": { wincon: false }, "Stromkirk Captain": { wincon: false }, "Vampire Nocturnus": { wincon: false }, "Talisman of Hierarchy": { ramp: true }, "Swords to Plowshares": { interaction: true } },
    forbidWeakness: ["role-wipes"],
    core: ["Cathars' Crusade", "Shared Animosity", "Coat of Arms", "Door of Destinies", "Vanquisher's Banner", "Kindred Dominance"],
  },
  {
    id: "tatyova-landfall", dir: "deck-bench", file: "tatyova-landfall", format: "commander", kind: "sound",
    note: "Simic landfall.", errors: [], plan: ["landfall"],
    roles: { "Avenger of Zendikar": { wincon: true }, "Exploration": { ramp: true }, "Explore": { ramp: true }, "Cyclonic Rift": { interaction: true, wipes: true }, "Evacuation": { wipes: true } },
    core: ["Avenger of Zendikar", "Ancient Greenwarden", "Scapeshift", "Lotus Cobra", "Tireless Provisioner", "Rampaging Baloths", "Retreat to Coralhelm", "Retreat to Kazandu", "Roil Elemental", "Azusa, Lost but Seeking", "Oracle of Mul Daya", "Dryad of the Ilysian Grove", "Burgeoning", "Exploration", "Ramunap Excavator", "Crucible of Worlds", "Aesi, Tyrant of Gyre Strait"],
  },
  {
    id: "urza-artifacts", dir: "deck-bench", file: "urza-artifacts", format: "commander", kind: "sound",
    note: "Mono-blue artifacts with a Thassa's Oracle finish.", errors: [], plan: ["artifacts"],
    roles: { "Prismatic Lens": { ramp: true }, "Coldsteel Heart": { ramp: true }, "Sky Diamond": { ramp: true }, "Thassa's Oracle": { wincon: true }, "Fabricate": { tutor: true } },
    core: ["Thassa's Oracle", "Mystic Forge", "Karn, the Great Creator", "Isochron Scepter", "Dramatic Reversal", "Unwinding Clock", "Retrofitter Foundry", "Sai, Master Thopterist", "Whirler Rogue"],
  },
  {
    id: "sythis-enchantress", dir: "deck-bench", file: "sythis-enchantress", format: "commander", kind: "sound",
    note: "Selesnya enchantress with land-aura ramp.", errors: [], plan: ["enchantress"],
    roles: { "Wild Growth": { ramp: true }, "Utopia Sprawl": { ramp: true }, "Fertile Ground": { ramp: true }, "Overgrowth": { ramp: true }, "Austere Command": { wipes: true }, "Season of the Burrow": { draw: false }, "Helix Pinnacle": { wincon: true }, "Argothian Enchantress": { draw: true } },
    core: ["Sigil of the Empty Throne", "Helix Pinnacle", "Sphere of Safety", "Starfield of Nyx", "Calix, Destiny's Hand", "Elspeth Conquers Death", "Sterling Grove", "Enchantress's Presence", "Argothian Enchantress", "Eidolon of Blossoms", "Setessan Champion", "Mesa Enchantress", "Verduran Enchantress", "Satyr Enchanter", "Sanctum Weaver", "Destiny Spinner", "Archon of Sun's Grace", "Doubling Season"],
  },
  {
    id: "brago-blink", dir: "deck-bench", file: "brago-blink", format: "commander", kind: "sound",
    note: "Azorius blink: many cards exile your own creature and return it.", errors: [], plan: ["blink"],
    roles: { "Cloudshift": { interaction: false }, "Ephemerate": { interaction: false }, "Restoration Angel": { interaction: false }, "Felidar Guardian": { interaction: false }, "Conjurer's Closet": { interaction: false }, "Eldrazi Displacer": { interaction: false }, "Thassa, Deep-Dwelling": { interaction: false }, "Reflector Mage": { interaction: true }, "Banisher Priest": { interaction: true } },
    core: ["Restoration Angel", "Ephemerate", "Cloudshift", "Conjurer's Closet", "Panharmonicon", "Soulherder", "Deadeye Navigator", "Felidar Guardian", "Agent of Treachery", "Sun Titan", "Spark Double", "Thassa, Deep-Dwelling", "Peregrine Drake", "Eldrazi Displacer"],
  },
  {
    id: "ghalta-stompy", dir: "deck-bench", file: "ghalta-stompy", format: "commander", kind: "sound",
    note: "Mono-green big creatures. The engine does not read Ghalta's cost reduction as a plan (known gap).",
    errors: [], plan: ["big-creatures"],
    roles: { "Ezuri's Predation": { wipes: true }, "Craterhoof Behemoth": { wincon: true }, "Rabid Bite": { interaction: true }, "Sol Ring": { ramp: true } },
    uncertainty: { sentenceMatches: /did not match|reads as Big creatures/ },
    core: ["Craterhoof Behemoth", "Pathbreaker Ibex", "Worldspine Wurm", "Carnage Tyrant", "Elder Gargaroth", "Zopandrel, Hunger Dominus", "Gigantosaurus", "Defense of the Heart", "Garruk's Uprising", "Return of the Wildspeaker", "Greater Good", "Elemental Bond", "Selvala, Heart of the Wilds"],
  },
  {
    id: "thrasios-tymna", dir: "deck-bench", file: "thrasios-tymna-partners", format: "commander", kind: "sound",
    note: "Partner pair, tutor-and-combo shell.", errors: [], plan: ["midrange"],
    roles: { "Thassa's Oracle": { wincon: true }, "Demonic Tutor": { tutor: true }, "Force of Will": { interaction: true }, "Toxic Deluge": { wipes: true }, "Mana Vault": { ramp: true } },
    uncertainty: { sentenceMatches: /did not match/, winconNote: /Thassa's Oracle/ },
    core: ["Thassa's Oracle", "Demonic Consultation", "Tainted Pact", "Force of Will", "Fierce Guardianship", "Mana Drain", "Necropotence", "Rhystic Study", "Mystic Remora", "Demonic Tutor", "Vampiric Tutor"],
  },
  {
    id: "wilson-background", dir: "deck-bench", file: "wilson-background", format: "commander", kind: "sound",
    note: "Creature commander with a Background: pairing must be accepted, and the Background is not an enchantment plan.",
    errors: [], plan: ["midrange", "big-creatures", "equipment"],
    roles: { "Kogla, the Titan Ape": { interaction: true }, "Masked Vandal": { interaction: true }, "Swiftfoot Boots": { protection: true } },
    core: ["Swiftfoot Boots", "Lightning Greaves", "Whispersilk Cloak", "Blackblade Reforged", "Sword of Fire and Ice", "Sword of Feast and Famine", "Shadowspear", "Loxodon Warhammer", "Rancor", "Greater Good"],
  },
  {
    id: "oloro-control", dir: "deck-bench", file: "oloro-control", format: "commander", kind: "sound",
    note: "Esper control and life-gain finishers.", errors: [], plan: ["lifegain", "control"],
    roles: { "Test of Endurance": { wincon: true }, "Felidar Sovereign": { wincon: true }, "Merciless Eviction": { wipes: true }, "Swords to Plowshares": { interaction: true } },
    core: ["Sanguine Bond", "Exquisite Blood", "Aetherflux Reservoir", "Test of Endurance", "Felidar Sovereign", "Bolas's Citadel", "Archangel of Thune", "Well of Lost Dreams"],
  },
  {
    id: "sram-voltron", dir: "deck-bench", file: "sram-voltron", format: "commander", kind: "sound",
    note: "Mono-white auras and equipment. The engine does not read Sram's cast trigger as a plan (known gap).",
    errors: [], plan: ["auras", "equipment"],
    roles: { "Winds of Abandon": { interaction: true, wipes: true, wipeScope: "one-sided" }, "Knight of the White Orchid": { ramp: true }, "Land Tax": { ramp: false }, "Smothering Tithe": { ramp: false } },
    uncertainty: { sentenceMatches: /did not match|reads as (?:Auras|Equipment)/, drawNote: /Sram, Senior Edificer draws cards itself/ },
    core: ["Puresteel Paladin", "Stoneforge Mystic", "Kor Spiritdancer", "Sword of Fire and Ice", "Sword of Feast and Famine", "Colossus Hammer", "Ethereal Armor", "All That Glitters", "Sram's Expertise", "Akroma's Will", "Sigarda's Aid"],
  },
  {
    id: "ghalta-land-light", dir: "deck-bench", file: "ghalta-land-light", format: "commander", kind: "flawed",
    note: "Derived: 12 Forests replaced by spells (27 lands).", errors: [], plan: ["big-creatures"],
    mana: { landsStatus: "short" },
    core: ["Craterhoof Behemoth", "Pathbreaker Ibex", "Worldspine Wurm", "Carnage Tyrant", "Elder Gargaroth"],
  },
  {
    id: "edgar-no-interaction", dir: "deck-bench", file: "edgar-no-interaction", format: "commander", kind: "flawed",
    note: "Derived: every removal spell and the typal wipe replaced by creatures.", errors: [], plan: ["typal"],
    forbidWeakness: ["role-wipes"], requireWeakness: ["role-interaction"], firstWeakness: "role-interaction",
    core: ["Cathars' Crusade", "Shared Animosity", "Coat of Arms", "Door of Destinies", "Vanquisher's Banner"],
  },
  {
    id: "atraxa-edgar-bad-pair", dir: "deck-bench", file: "atraxa-edgar-bad-pair", format: "commander", kind: "flawed",
    note: "Derived: two commanders with no pairing ability.", errors: ["commander-pair"],
    core: [],
  },
  {
    id: "meren-broken", dir: "deck-bench", file: "meren-broken", format: "commander", kind: "flawed",
    note: "Derived: 99 cards, two Sol Rings, a misspelling, an off-identity companion.",
    errors: ["companion-identity", "copy-limit", "deck-size", "unknown-card"], plan: ["aristocrats", "graveyard"],
    info: ["companion-condition"],
    core: ["Butcher of Malakir", "Kokusho, the Evening Star", "Grave Pact", "Pitiless Plunderer", "Blood Artist", "Zulaport Cutthroat"],
  },
  {
    id: "pauper-elves", dir: "deck-bench", file: "pauper-elves-60", format: "pauper", kind: "legality",
    note: "Pauper Elves with one rare (Elvish Archdruid).", errors: ["not-legal"], status: "structure-only",
  },
  {
    id: "legacy-tempo", dir: "deck-bench", file: "legacy-tempo-60", format: "legacy", kind: "legality",
    note: "Legacy tempo with two cards on the Legacy banned list.", errors: ["banned"], status: "structure-only",
  },
  {
    id: "tempo-as-vintage", dir: "deck-bench", file: "legacy-tempo-60", format: "vintage", kind: "legality",
    note: "The same 60 as Vintage: four copies of restricted cards.", errors: ["copy-limit"], status: "structure-only",
  },
]);
