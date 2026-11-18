// Sample decklists for Deck Check. Generated from tests/fixtures/deck-coach/*.txt;
// tests/deck-check.test.mjs fails if the two drift apart.

export const DECK_CHECK_SAMPLES = Object.freeze([
  {
    id: "ezuri",
    label: "Ezuri elves",
    note: "Commander · needs work",
    fixture: "ezuri-elves-needs-work",
    format: "commander",
    text: "Commander\n1 Ezuri, Renegade Leader\n\nDeck\n1 Llanowar Elves\n1 Elvish Mystic\n1 Fyndhorn Elves\n1 Elvish Archdruid\n1 Priest of Titania\n1 Elvish Visionary\n1 Wirewood Symbiote\n1 Heedless One\n1 Imperious Perfect\n1 Elvish Champion\n1 Elvish Warmaster\n1 Dwynen's Elite\n1 Elvish Clancaller\n1 Lys Alana Huntmaster\n1 Joraga Warcaller\n1 Elvish Harbinger\n1 Timberwatch Elf\n1 Steel Leaf Champion\n1 Leatherback Baloth\n1 Craterhoof Behemoth\n1 End-Raze Forerunners\n1 Thragtusk\n1 Wood Elves\n1 Elvish Piper\n1 Elvish Pioneer\n1 Talara's Battalion\n1 Elvish Vanguard\n1 Drove of Elves\n1 Jagged-Scar Archers\n1 Marwyn, the Nurturer\n1 Allosaurus Shepherd\n1 Rhys the Exiled\n1 Llanowar Tribe\n1 Ambush Viper\n1 Elvish Eulogist\n1 Immaculate Magistrate\n1 Copperhorn Scout\n1 Elvish Rejuvenator\n1 Nettle Sentinel\n1 Quirion Ranger\n1 Scryb Ranger\n1 Elderleaf Mentor\n1 Wildheart Invoker\n1 Krosan Tusker\n1 Pathbreaker Ibex\n1 Pelakka Wurm\n1 Woodland Champion\n1 Garruk Wildspeaker\n1 Overrun\n1 Overwhelming Stampede\n1 Triumph of the Hordes\n1 Beastmaster Ascension\n1 Door of Destinies\n1 Coat of Arms\n1 Gilt-Leaf Ambush\n1 Elvish Promenade\n1 Tyvar's Stand\n1 Collected Company\n1 Chord of Calling\n1 Natural Order\n1 Green Sun's Zenith\n1 Sol Ring\n1 Skyshroud Claim\n1 Vitalize\n1 Ezuri's Predation\n1 Heroic Intervention\n1 Pendelhaven\n1 Tranquil Thicket\n31 Forest",
  },
  {
    id: "talrand",
    label: "Talrand spells",
    note: "Commander · solid list",
    fixture: "talrand-spells-solid",
    format: "commander",
    text: "Commander\n1 Talrand, Sky Summoner (M19) 79\n\nDeck\n1 Sol Ring (C21) 263\n1 Arcane Signet (C21) 236\n1 Mind Stone (C21) 248\n1 Thought Vessel (C21) 266\n1 Fellwar Stone (C21) 240\n1 Commander's Sphere (C21) 237\n1 Sapphire Medallion\n1 Rhystic Study\n1 Mystic Remora\n1 Fact or Fiction\n1 Brainstorm\n1 Ponder\n1 Preordain\n1 Opt\n1 Consider\n1 Impulse\n1 Windfall\n1 Frantic Search\n1 Deep Analysis\n1 Treasure Cruise\n1 Dig Through Time\n1 Chart a Course\n1 Pull from Tomorrow\n1 Glimmer of Genius\n1 Stroke of Genius\n1 Think Twice\n1 Accumulated Knowledge\n1 Counterspell\n1 Mana Leak\n1 Negate\n1 Swan Song\n1 Arcane Denial\n1 Pongify\n1 Rapid Hybridization\n1 Into the Roil\n1 Blink of an Eye\n1 Cyclonic Rift\n1 Evacuation\n1 Aetherize\n1 Mystic Confluence\n1 Essence Scatter\n1 Remand\n1 Memory Lapse\n1 Spell Pierce\n1 Snap\n1 Cryptic Command\n1 Archmage Emeritus\n1 Murmuring Mystic\n1 Docent of Perfection\n1 Metallurgic Summonings\n1 Talrand's Invocation\n1 Sphinx-Bone Wand\n1 Aetherflux Reservoir\n1 Haughty Djinn\n1 Psychosis Crawler\n1 Sea Gate Stormcaller\n1 Snapcaster Mage\n1 High Tide\n1 Mission Briefing\n1 Leyline of Anticipation\n1 Gush\n1 Jace, Wielder of Mysteries\n1 Reliquary Tower\n1 Mystic Sanctuary\n1 Halimar Depths\n1 Desert of the Mindful\n33 Island",
  },
  {
    id: "krenko",
    label: "Krenko goblins",
    note: "Commander · has errors",
    fixture: "krenko-invalid-edge",
    format: "commander",
    text: "// Commander\n1 Krenko, Mob Boss\n\n// Mainboard\n1x Goblin Bombardment\n1 Goblin Chieftain *F*\n1 Skirk Prospector [Ramp]\n2 Lightning Bolt\n1 Lightening Bolt\n1 Swords to Plowshares\n1 Dockside Extortionist\n1 Sol Ring (C21) 263\nGoblin Matron\nthis is not a card!!!\n1 Goblin Warchief\n1 Goblin Ringleader\n1 Siege-Gang Commander\n1 Purphoros, God of the Forge\n1 Impact Tremors\n1 Shared Animosity\n1 Goblin Recruiter\n1 Mogg War Marshal\n1 Beetleback Chief\n1 Legion Warboss\n1 Chaos Warp\n20 Mountain\n\nSideboard\n1 Pyroblast\n1 Red Elemental Blast",
  },
  {
    id: "burn",
    label: "Modern burn",
    note: "60 cards · Modern",
    fixture: "modern-burn-60",
    format: "modern",
    text: "4 Lightning Bolt\n4 Lava Spike\n4 Rift Bolt\n4 Monastery Swiftspear\n4 Goblin Guide\n4 Eidolon of the Great Revel\n4 Skewer the Critics\n4 Boros Charm\n4 Lightning Helix\n4 Searing Blaze\n2 Skullcrack\n4 Inspiring Vantage\n4 Sacred Foundry\n4 Arid Mesa\n6 Mountain\n\nSideboard\n2 Path to Exile",
  },
]);
