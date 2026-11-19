// Build the deliberately flawed benchmark lists from their sound base lists,
// so each flaw is a documented, reproducible edit rather than a hand-made
// copy. Re-run, then snapshot the new names:
//   node scripts/deck-check/derive-bench-variants.mjs
//   node scripts/deck-check/snapshot-fixture-facts.mjs deck-bench <variant ...>
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../tests/fixtures/deck-bench/", import.meta.url);
const read = (name) => readFileSync(new URL(`${name}.txt`, dir), "utf8").replace(/\r\n/g, "\n");
const write = (name, header, text) => writeFileSync(new URL(`${name}.txt`, dir), `// ${header}\n${text.trim()}\n`);

function edit(text, { remove = [], add = [], replace = {}, append = "" } = {}) {
  let lines = text.split("\n");
  for (const name of remove) {
    const index = lines.findIndex((line) => line === `1 ${name}`);
    if (index < 0) throw new Error(`not in list: ${name}`);
    lines.splice(index, 1);
  }
  lines = lines.map((line) => replace[line] ?? line);
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  lines.push(...add.map((name) => `1 ${name}`));
  return lines.join("\n") + append;
}

// Too few lands: twelve Forests become twelve more spells (27 lands left).
write("ghalta-land-light", "Flaw: 12 Forests replaced by spells, so the deck runs 27 lands.", edit(read("ghalta-stompy"), {
  replace: { "30 Forest": "18 Forest" },
  add: ["Overrun", "Triumph of the Hordes", "Regal Force", "Woodland Bellower", "Tooth and Nail", "Ulvenwald Hydra", "Hydra Broodmaster", "Krosan Grip", "Nylea's Intervention", "Biogenic Upgrade", "Natural Order", "Finale of Devastation"],
}));

// No interaction: every removal spell and the typal wipe become more vampires.
write("edgar-no-interaction", "Flaw: all ten removal spells and the wipe replaced by creatures.", edit(read("edgar-vampires"), {
  remove: ["Swords to Plowshares", "Path to Exile", "Lightning Bolt", "Terminate", "Anguished Unmaking", "Vindicate", "Despark", "Chaos Warp", "Mortify", "Kindred Dominance"],
  add: ["Blood Artist", "Gifted Aetherborn", "Malakir Bloodwitch", "Nirkana Revenant", "Asylum Visitor", "Bloodcrazed Paladin", "Voldaren Bloodcaster", "Markov Baron", "Vampire Socialite", "Welcoming Vampire"],
}));

// Two commanders with no pairing ability.
write("atraxa-edgar-bad-pair", "Flaw: Edgar Markov added as a second commander; neither card has a pairing ability.", edit(read("atraxa-counters"), {
  replace: { "1 Atraxa, Praetors' Voice": "1 Atraxa, Praetors' Voice\n1 Edgar Markov", "5 Forest": "4 Forest" },
}));

// Construction errors: 99 cards, a second Sol Ring, a misspelling, and an
// off-identity companion.
write("meren-broken", "Flaws: 99 cards, two Sol Rings, a misspelled name, an off-identity companion.", edit(read("meren-aristocrats"), {
  remove: ["Read the Bones", "Night's Whisper", "Gravedigger"],
  add: ["Sol Ring", "Eternal Witnes"],
  append: "\n\nCompanion\n1 Lurrus of the Dream-Den",
}));
console.log("variants written");
