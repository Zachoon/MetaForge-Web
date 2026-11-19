# MF-DECK-COACH-002 — Owner demo (local only)

Everything runs on your machine. Nothing is deployed, and the only network call is Scryfall for card text.

## Start it

```powershell
cd D:\Projects\MetaForge-Deck-Coach-002
```

```powershell
npx vinext dev --port 5199
```

Wait for `Local: http://localhost:5199/`, then open **http://localhost:5199/deck-check**. (Dependencies are already installed in this worktree; if not, run `npm ci` first.) Stop the server with Ctrl+C.

## The six-step walkthrough

1. **Open Deck Check.** The page says what to do; four sample decks sit under the box.
2. **Paste a real Commander deck.** Open `D:\Projects\MetaForge-Deck-Coach-002\tests\fixtures\deck-bench\edgar-no-interaction.txt`, copy everything, paste it, press **Check my deck**. (This Mardu Vampires list has had all its removal swapped for creatures, so the coaching has something real to find. For a deck with fetch lands, which crashed the previous build, use `atraxa-counters.txt` in the same folder.) Watch the progress bar count the cards; **Cancel** works mid-read.
3. **Read the report.** It opens on **At a glance**: *Legal in Commander · Plan: Edgar Markov reads as Vampires · Fix: Too few answers for this plan (Strong finding) · Fix: Few cards whose printed text ends the game (Heuristic)*.
4. **Review the specific recommendation.** Click the first fix. It shows:
   * **Detected:** "Interaction: 3 counted."
   * **Cards behind it:** each with its quoted text.
   * **Why it matters.**
   * **What to change:** "Add Chaos Warp… the cut is your call", because every expensive card is a Vampire or does another job.
   * **What it costs.**
   * **How sure:** strong, because the count is under half the band.

   Notice what it does *not* say: no board wipe for a deck that wins with its own creatures.
5. **Test a replacement.** Press **Test Chaos Warp with your own cut**. The Add box fills and focus jumps to **Cut**. Pick *Bloodlord of Vaasgoth* and press **Compare**. To see a refusal, type *Beast Within* as the add: it is green, outside Edgar's white-black-red identity, and Deck Check says so instead of replaying it.
6. **Compare before and after.** The table shows every role before and after, with this plan's range. The verdict reads: "Interaction goes from 3 to 4. The plan wants 8–11, so this is 4 short of the range: one swap starts the fix, it does not finish it." **Copy the updated list** gives you the 100-card list with the swap applied.

**Quick alternative:** click the **Ezuri elves** sample. You get a measured swap (Thragtusk → Beast Whisperer) with tabs. Use ← → to move between changes, and "See the measured change" from a finding jumps straight to it.

## Representative sample deck

The on-page **Ezuri elves** sample (`tests/fixtures/deck-coach/ezuri-elves-needs-work.txt`) is a real 100-card Elves list with genuine holes (2 draw spells, 1 interaction) and one genuine construction error (Rhys the Exiled is black-green in a mono-green deck).

## Check the coaching yourself

```powershell
node scripts/deck-check/run-bench.mjs
```

This prints the 24-case benchmark table (about 3 seconds, offline).
