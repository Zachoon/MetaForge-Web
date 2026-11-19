# MF-DECK-COACH-003 · 7. Owner demo checklist

Local only: nothing is deployed, and only Scryfall is contacted.

## Start the local preview

```powershell
cd D:\Projects\MetaForge-Deck-Coach-003
```

```powershell
npx vinext dev --port 5199
```

Open **http://localhost:5199/deck-check**. Stop the server with Ctrl+C.

## Checklist, about 10 minutes

Tick each box as you see it:

- [ ] **1. First insight.** Paste `tests\fixtures\deck-bench-003\baru-public-report.txt` (the real public Baru list) and press **Check my deck**. **At a glance** appears within a few seconds.
- [ ] **2. Baru lands (concern 1/3).** The Mana card says "38 lands. This curve wants about 34–40". It is not called "over". Open **How the land band is worked out**: you see the inputs, the rules, and the outside formula labelled as a reference ("about 42").
- [ ] **3. Plan with evidence.** The plan card reads "Baru, Wurmspeaker reads as Wurms", with where the read comes from. **Why MetaForge reads it this way** lists the commander's text and the Wurms in the list.
- [ ] **4. Confirm or correct.** Clear the box and paste `tests\fixtures\deck-bench\sram-voltron.txt`. It reads **Equipment**, with Auras as a second plan. Pick **Auras** and press **Confirm plan**: the sentence, the label (Player-confirmed) and the role bands change. Press **Back to the detected plan**.
- [ ] **5. Protected card.** Click the **Ezuri elves** sample. **Try one change** offers Thragtusk → Beast Whisperer. Open **Cards MetaForge must never suggest cutting**, type "Thrag", tick Thragtusk. The swaps disappear and Beast Whisperer and Beast Within are offered to test with your own cut.
- [ ] **6. Test a replacement.** Under "Worth testing, with a cut you choose", press **Test Beast Whisperer**. Focus jumps to **Cut**; pick a card and press **Compare**. You get the before/after table, and your list is unchanged ("Nothing here edits your list").
- [ ] **7. Table pressure.** Paste `tests\fixtures\deck-bench-003\thrasios-tymna-cedh.txt`. **Table pressure** lists Game Changers (Scryfall's flag), fast mana, tutors and "you win the game" cards by name, with no score and no bracket number. The plan reads "no single plan" with a **Combo finish** named.
- [ ] **8. Imports.** Paste a Moxfield link: you get export instructions and Check is disabled. Use **Open a file** with a Moxfield or Archidekt CSV export: it is read in the browser and the count updates.
- [ ] **9. Phone width.** Narrow the window to about 375 px: no sideways scrolling, and buttons stay large.
- [ ] **10. Public report fix (worker).** Not visible in `vinext dev`. Run `node --test tests/public-report-land-count.test.mjs`: it renders the real Baru rows through the real handler and shows 38 lands.

## Check the numbers yourself

```powershell
node scripts/deck-check/run-bench.mjs
```

This prints the 32-case benchmark table, offline.

```powershell
node --test tests/deck-coach-003-public-concerns.test.mjs tests/deck-coach-003-plan-and-protection.test.mjs tests/public-report-land-count.test.mjs
```

This runs the tests for this mission's fixes.
