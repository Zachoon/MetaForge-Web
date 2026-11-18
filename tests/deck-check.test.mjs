// Deck Check: the guest-facing coaching report for a pasted list.
// Fixtures are real decklists with Scryfall facts snapshotted by
// scripts/deck-check/snapshot-fixture-facts.mjs, so this runs offline.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decklistText, parseDecklist, playedCount } from "../app/deck-check-parse.mjs";
import { factFor, fetchCardFacts, indexFact } from "../app/deck-check-facts.mjs";
import {
  buildDeckCheckReport,
  checkDeckStructure,
  comparePlayerSwap,
  copyLimitFor,
  deckCheckFormat,
  proposedAddIssue,
} from "../app/deck-check-report.mjs";
import { DECK_CHECK_SAMPLES } from "../app/deck-check-samples.mjs";
import { swapCatalogCard } from "../app/curve-role-coach.mjs";

const fixtureDir = new URL("./fixtures/deck-coach/", import.meta.url);

function fixture(name) {
  const text = readFileSync(new URL(`${name}.txt`, fixtureDir), "utf8");
  const snapshot = JSON.parse(readFileSync(new URL(`${name}.facts.json`, fixtureDir), "utf8"));
  const facts = {};
  for (const fact of Object.values(snapshot.facts)) indexFact(facts, fact);
  return { text, parsed: parseDecklist(text), facts, notFound: snapshot.notFound };
}

function report(name, format = "commander", extra = {}) {
  const { parsed, facts, notFound } = fixture(name);
  return buildDeckCheckReport({ parsed, facts, notFound, format, ...extra });
}

// ---------------------------------------------------------------- parsing

test("parses the common export shapes and keeps a reason for every line it sets aside", () => {
  const parsed = parseDecklist([
    "Commander",
    "1 Krenko, Mob Boss",
    "",
    "Deck",
    "1x Goblin Bombardment",
    "1 Goblin Chieftain *F*",
    "1 Skirk Prospector [Ramp]",
    "1 Sol Ring (C21) 263",
    "1 Arcane Signet (cmm) 400a",
    "Goblin Matron",
    "Creatures (31)",
    "// a comment",
    "SB: 1 Pyroblast",
    "0 Lightning Bolt",
    "3x",
    "20 Mountain",
    "",
    "Maybeboard",
    "1 Goblin Lackey",
  ].join("\n"));
  const byName = Object.fromEntries(parsed.entries.map((entry) => [entry.name, entry]));
  assert.deepEqual(parsed.commanderNames, ["Krenko, Mob Boss"]);
  for (const name of ["Goblin Bombardment", "Goblin Chieftain", "Skirk Prospector", "Sol Ring", "Arcane Signet", "Goblin Matron", "Mountain"]) {
    assert.ok(byName[name], `${name} should be read`);
    assert.equal(byName[name].section, "main");
  }
  assert.equal(byName.Mountain.quantity, 20);
  assert.equal(byName["Goblin Matron"].impliedQuantity, true);
  assert.equal(byName.Pyroblast.section, "sideboard");
  assert.equal(byName["Goblin Lackey"], undefined, "maybeboard cards are not part of the deck");
  assert.equal(playedCount(parsed), 1 + 6 + 20);
  assert.deepEqual(parsed.problems.map((problem) => problem.line), [14, 15]);
  assert.match(parsed.problems[0].reason, /zero/i);
  assert.match(parsed.problems[1].reason, /no card name/i);
  const reasons = parsed.ignored.map((line) => line.reason).join(" | ");
  assert.match(reasons, /Group heading/);
  assert.match(reasons, /Comment line/);
  assert.match(reasons, /Sideboard/);
  assert.match(reasons, /Maybeboard/);
  assert.match(parsed.notes[0].reason, /read as 1 copy/);
});

test("finds a trailing commander in a headerless export and merges repeated lines", () => {
  const parsed = parseDecklist("1 Sol Ring\n2 Island\n1 Island\n\n1 Talrand, Sky Summoner");
  assert.deepEqual(parsed.commanderNames, ["Talrand, Sky Summoner"]);
  assert.equal(parsed.entries.find((entry) => entry.name === "Island").quantity, 3);
  assert.deepEqual(parsed.entries.find((entry) => entry.name === "Island").lines, [2, 3]);
});

test("empty, whitespace and nonsense input produce an empty or explained result, never a throw", () => {
  assert.equal(parseDecklist("").entries.length, 0);
  assert.equal(parseDecklist("   \n\n  ").entries.length, 0);
  assert.equal(parseDecklist(null).entries.length, 0);
  const junk = parseDecklist("12345\n!!!\n" + "x".repeat(400));
  assert.equal(junk.entries.length, 0);
  assert.equal(junk.problems.length, 3);
  assert.equal(buildDeckCheckReport({ parsed: parseDecklist(""), facts: {} }).status, "empty");
  assert.equal(parseDecklist("9999 Island").problems.length, 1);
});

test("the after-swap export round-trips through the parser", () => {
  const text = decklistText([
    { name: "Talrand, Sky Summoner", quantity: 1 },
    { name: "Island", quantity: 33 },
    { name: "Sol Ring", quantity: 0 },
    { name: "Arcane Signet", quantity: 1 },
  ], ["Talrand, Sky Summoner"]);
  const parsed = parseDecklist(text);
  assert.deepEqual(parsed.commanderNames, ["Talrand, Sky Summoner"]);
  assert.equal(playedCount(parsed), 35);
  assert.equal(parsed.entries.some((entry) => entry.name === "Sol Ring"), false);
});

test("sample decks shown on the page are the tested fixtures, byte for byte", () => {
  assert.equal(DECK_CHECK_SAMPLES.length, 4);
  for (const sample of DECK_CHECK_SAMPLES) {
    const text = readFileSync(new URL(`${sample.fixture}.txt`, fixtureDir), "utf8").replace(/\r\n/g, "\n").trimEnd();
    assert.equal(sample.text, text, `${sample.id} drifted from its fixture`);
  }
});

// ---------------------------------------------------------------- facts

test("card facts are fetched in Scryfall-sized batches and misses are reported, not invented", async () => {
  const calls = [];
  const names = Array.from({ length: 80 }, (_, index) => `Card ${index}`);
  const fakeFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body.identifiers.length);
    return {
      ok: true,
      json: async () => ({
        data: body.identifiers.filter((id) => id.name !== "Card 3").map((id) => ({ name: id.name, type_line: "Instant", oracle_text: "Draw a card.", mana_cost: "{U}", cmc: 1, color_identity: ["U"], legalities: { commander: "legal" } })),
        not_found: body.identifiers.filter((id) => id.name === "Card 3"),
      }),
    };
  };
  const result = await fetchCardFacts(names, { fetchImpl: fakeFetch, delayMs: 0 });
  assert.deepEqual(calls, [75, 5]);
  assert.deepEqual(result.notFound, ["Card 3"]);
  assert.equal(result.failed, false);
  assert.equal(factFor(result.facts, "card 10").oracleText, "Draw a card.");
});

test("a Scryfall outage is reported as a failure instead of an empty deck", async () => {
  const result = await fetchCardFacts(["Sol Ring"], { fetchImpl: async () => { throw new Error("offline"); }, delayMs: 0 });
  assert.equal(result.failed, true);
  assert.deepEqual(result.facts, {});
  const http = await fetchCardFacts(["Sol Ring"], { fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }), delayMs: 0 });
  assert.equal(http.failed, true);
});

// ---------------------------------------------------------------- format checks

test("the broken Krenko list gets every construction error, each tied to a card or line", () => {
  const { parsed, facts, notFound } = fixture("krenko-invalid-edge");
  const structure = checkDeckStructure({ parsed, facts, notFound, format: "commander" });
  const codes = structure.issues.map((issue) => issue.code).sort();
  assert.deepEqual(codes, ["banned", "color-identity", "copy-limit", "deck-size", "implied-quantity", "unknown-card", "unknown-card"].sort());
  const text = structure.issues.map((issue) => issue.message).join("\n");
  assert.match(text, /“Lightening Bolt” is not a card name Scryfall recognises/);
  assert.match(text, /The deck has 43 cards including the commander\. A Commander deck is exactly 100\./);
  assert.match(text, /2 copies of Lightning Bolt/);
  assert.match(text, /Swords to Plowshares is white, outside the commander's red color identity/);
  assert.match(text, /Dockside Extortionist is banned in Commander \(Scryfall legality data\)/);
  assert.equal(structure.legal, false);
  const sideboard = parsed.entries.filter((entry) => entry.section === "sideboard").map((entry) => entry.name);
  assert.deepEqual(sideboard, ["Pyroblast", "Red Elemental Blast"]);
});

test("the Ezuri list is caught carrying an off-color card that was authored by mistake", () => {
  const structure = report("ezuri-elves-needs-work").structure;
  assert.deepEqual(structure.issues.map((issue) => issue.message), [
    "Rhys the Exiled is black-green, outside the commander's green color identity.",
  ]);
  assert.equal(structure.playedTotal, 100);
});

test("the Talrand list is a legal 100-card Commander deck", () => {
  const structure = report("talrand-spells-solid").structure;
  assert.equal(structure.playedTotal, 100);
  assert.deepEqual(structure.issues, []);
  assert.equal(structure.legal, true);
});

test("60-card formats use their own size, copy and Scryfall legality rules", () => {
  const modern = report("modern-burn-60", "modern");
  assert.equal(modern.status, "structure-only");
  assert.deepEqual(modern.structure.issues, []);
  assert.equal(modern.summary.landCount, 18);
  assert.equal(modern.summary.spellCount, 42);
  assert.match(modern.limits.join(" "), /calibrated for 100-card Commander decks and is not shown/);
  const standard = report("modern-burn-60", "standard");
  assert.ok(standard.structure.issues.some((issue) => issue.message === "Lightning Bolt is not legal in Standard (Scryfall legality data)."));
  const asCommander = report("modern-burn-60", "commander");
  assert.equal(asCommander.status, "needs-commander");
  assert.deepEqual(asCommander.candidates, []);
});

test("copy limits honour printed exceptions", () => {
  const commander = deckCheckFormat("commander");
  const modern = deckCheckFormat("modern");
  assert.equal(copyLimitFor({ name: "Island", typeLine: "Basic Land — Island", oracleText: "" }, commander), Infinity);
  assert.equal(copyLimitFor({ name: "Relentless Rats", typeLine: "Creature — Rat", oracleText: "A deck can have any number of cards named Relentless Rats." }, commander), Infinity);
  assert.equal(copyLimitFor({ name: "Seven Dwarves", typeLine: "Creature — Dwarf", oracleText: "A deck can have up to seven cards named Seven Dwarves." }, commander), 7);
  assert.equal(copyLimitFor({ name: "Lightning Bolt", typeLine: "Instant", oracleText: "" }, modern), 4);
});

test("a list with no commander header offers its legendary creatures as the commander", () => {
  const { text, facts, notFound } = fixture("talrand-spells-solid");
  const headerless = text.replace("Commander\n", "").replace("\nDeck\n", "\n");
  const parsed = parseDecklist(headerless);
  const first = buildDeckCheckReport({ parsed, facts, notFound, format: "commander" });
  // The commander is the first line here, not a trailing block, so it must be picked.
  assert.equal(first.status, "needs-commander");
  assert.deepEqual(first.candidates, ["Talrand, Sky Summoner"]);
  const chosen = buildDeckCheckReport({ parsed, facts, notFound, format: "commander", commanderNames: ["Talrand, Sky Summoner"] });
  assert.equal(chosen.status, "ready");
  assert.equal(chosen.structure.legal, true);
});

// ---------------------------------------------------------------- coaching

test("the Ezuri report reads the commander's text and names evidence-backed weaknesses", () => {
  const r = report("ezuri-elves-needs-work");
  assert.equal(r.status, "ready");
  assert.equal(r.plan.sentence, "Ezuri, Renegade Leader reads as Elves.");
  assert.match(r.plan.quote, /Elf creatures you control get \+3\/\+3/);
  assert.equal(r.plan.confidence.level, "high");
  assert.deepEqual(r.weaknesses.map((weakness) => weakness.id), ["role-draw", "role-interaction", "role-wipes"]);
  const draw = r.weaknesses[0];
  assert.match(draw.plain, /This list has 2 real draw spells, and Elves wants about 11–14/);
  // Every weakness quotes a card that is actually in the list.
  const names = new Set(fixture("ezuri-elves-needs-work").parsed.entries.map((entry) => entry.name));
  for (const weakness of r.weaknesses) {
    assert.ok(weakness.citations.length > 0, `${weakness.id} cites a card`);
    for (const citation of weakness.citations) assert.ok(names.has(citation.name), `${citation.name} is in the deck`);
  }
  assert.match(draw.citations[0].quote, /Search your library for a card named Elvish Clancaller/);
  assert.equal(r.mana.lands.count, 33);
  assert.equal(r.strengths.find((job) => job.id === "ramp").actual, 11);
});

test("coaching is specific to each deck, not a shared template", () => {
  const ezuri = report("ezuri-elves-needs-work");
  const talrand = report("talrand-spells-solid");
  const krenko = report("krenko-invalid-edge");
  assert.equal(talrand.plan.label, "Spellslinger");
  assert.equal(krenko.plan.label, "Goblins");
  assert.notDeepEqual(ezuri.weaknesses.map((weakness) => weakness.id), talrand.weaknesses.map((weakness) => weakness.id));
  assert.deepEqual(talrand.weaknesses.map((weakness) => weakness.id), ["role-ramp"]);
  const ezuriCited = new Set(ezuri.weaknesses.flatMap((weakness) => weakness.citations.map((citation) => citation.name)));
  const talrandCited = new Set(talrand.weaknesses.flatMap((weakness) => weakness.citations.map((citation) => citation.name)));
  assert.equal([...ezuriCited].filter((name) => talrandCited.has(name)).length, 0);
  assert.notEqual(ezuri.curve.summary, talrand.curve.summary);
});

test("limits are stated, including that no model is called and prices are not checked", () => {
  const r = report("krenko-invalid-edge");
  const limits = r.limits.join(" ");
  assert.match(limits, /No AI model is called/);
  assert.match(limits, /does not check prices/);
  assert.match(limits, /2 cards were not found and are not counted: Lightening Bolt, this is not a card!!!/);
  // A vanilla creature has no rules text but was read; it must not be reported as unread.
  assert.doesNotMatch(report("ezuri-elves-needs-work").limits.join(" "), /Leatherback Baloth|not found/);
  assert.match(limits, /well short of 100 cards/);
  assert.match(limits, /construction problems/);
  const forbidden = /\bAI-powered\b|\bwin rate\b|\bguarantee/i;
  for (const name of ["ezuri-elves-needs-work", "talrand-spells-solid", "krenko-invalid-edge"]) {
    assert.doesNotMatch(JSON.stringify(report(name)), forbidden);
  }
});

// ---------------------------------------------------------------- before / after

test("the top Ezuri change is replayed and the measured movement is reported honestly", () => {
  const r = report("ezuri-elves-needs-work");
  const top = r.comparisons[0];
  assert.equal(top.cut, "Elvish Clancaller");
  assert.equal(top.add, "Beast Whisperer");
  assert.equal(top.addQuote, "Whenever you cast a creature spell, draw a card.");
  const draw = top.roles.find((role) => role.id === "draw");
  assert.deepEqual([draw.before, draw.after, draw.beforeStatus, draw.afterStatus], [2, 3, "short", "short"]);
  assert.equal(top.verdict, "Card advantage goes from 2 to 3. The plan wants 11–14, so this is 8 short of the range: one swap starts the fix, it does not finish it.");
  const afterParsed = parseDecklist(top.afterText);
  assert.equal(playedCount(afterParsed), 100);
  assert.ok(afterParsed.entries.some((entry) => entry.name === "Beast Whisperer"));
  assert.equal(afterParsed.entries.some((entry) => entry.name === "Elvish Clancaller"), false);
  assert.deepEqual(afterParsed.commanderNames, ["Ezuri, Renegade Leader"]);
});

test("a change that closes a gap says so, and its cost is listed", () => {
  const r = report("krenko-invalid-edge");
  const wipe = r.comparisons.find((comparison) => comparison.add === "Blasphemous Act");
  assert.ok(wipe, "Krenko is offered a board wipe");
  assert.match(wipe.verdict, /Board wipes goes from 0 to 1, inside the 1–2 range/);
  assert.deepEqual(wipe.tradeOffs, ["Interaction drops from 6 to 5 (still within 3–5)."]);
  assert.ok(r.comparisons.some((comparison) => comparison.cut === "Dockside Extortionist"), "the banned card is the first cut for the ramp gap");
});

test("every suggested add is in the vetted catalog with real printed text", () => {
  for (const name of ["ezuri-elves-needs-work", "talrand-spells-solid", "krenko-invalid-edge"]) {
    for (const comparison of report(name).comparisons) {
      const card = swapCatalogCard(comparison.add);
      assert.ok(card, `${comparison.add} is a catalog card`);
      assert.ok(card.oracleText.length > 0);
    }
  }
});

test("when no vetted swap fits, the report says so and the player can test their own change", () => {
  const r = report("talrand-spells-solid");
  assert.equal(r.comparisons.length, 0);
  assert.match(r.noSwapNote, /No color-legal swap from the cards I can vouch for/);
  assert.ok(r.deckCards.includes("Snap"));
  const { parsed, facts } = fixture("talrand-spells-solid");
  const signet = { name: "Coldsteel Heart", typeLine: "Artifact", manaCost: "{2}", cmc: 2, colorIdentity: [], legalities: { commander: "legal" }, oracleText: "This artifact enters tapped.\nAs this artifact enters, choose a color.\n{T}: Add one mana of the chosen color.", cardFaces: [] };
  const result = comparePlayerSwap({ parsed, facts, cut: "Accumulated Knowledge", addFact: signet });
  assert.equal(result.ok, true);
  const ramp = result.comparison.roles.find((role) => role.id === "ramp");
  assert.deepEqual([ramp.before, ramp.after], [6, 7]);
  assert.equal(result.comparison.source, "player");
  assert.equal(playedCount(parseDecklist(result.comparison.afterText)), 100);
});

test("player swaps are refused for rule reasons with a plain explanation", () => {
  const { parsed, facts } = fixture("talrand-spells-solid");
  const swords = { name: "Swords to Plowshares", typeLine: "Instant", colorIdentity: ["W"], legalities: { commander: "legal" }, oracleText: "Exile target creature." };
  assert.match(comparePlayerSwap({ parsed, facts, cut: "Snap", addFact: swords }).message, /outside the commander's blue color identity/);
  const banned = { name: "Mana Crypt", typeLine: "Artifact", colorIdentity: [], legalities: { commander: "banned" }, oracleText: "" };
  assert.match(comparePlayerSwap({ parsed, facts, cut: "Snap", addFact: banned }).message, /banned in Commander/);
  const dupe = factFor(facts, "Counterspell");
  assert.match(comparePlayerSwap({ parsed, facts, cut: "Snap", addFact: dupe }).message, /already in the list/);
  assert.match(comparePlayerSwap({ parsed, facts, cut: "Not In Deck", addFact: dupe }).message, /Choose a card from your list/);
  assert.match(comparePlayerSwap({ parsed, facts, cut: "Snap", addFact: null }).message, /could not be found/);
  assert.equal(proposedAddIssue({ name: "Island", typeLine: "Basic Land — Island", colorIdentity: ["U"], legalities: { commander: "legal" } }, { identity: ["U"], cards: [{ name: "Island", quantity: 33 }] }), null);
});
