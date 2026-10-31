import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { forgeImportedMasterwork } from '../app/native-masterwork-engine.mjs';
import { guidedCompletionReview } from '../app/guided-draft.mjs';

// Printed Scryfall facts captured for the actual walkthrough. No live API,
// price, or popularity dependency. The three extra token cards reproduced
// a package rebalance cutting Nexus, Convergence, and Wurmcalling.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/baru-confirmed-deck.json', import.meta.url), 'utf8'));
test('Baru guided finish preserves every confirmed card and basic-land quantity through package optimization', () => {
  const report = forgeImportedMasterwork({
    ...fixture, format: 'Commander', target: 100, strategy: 'Balanced midrange',
    path: '', note: '', seed: 123, colors: ['G'],
  });
  const expected = Object.fromEntries(fixture.importedRows.map(row => [row.name, row.quantity]));
  expected[fixture.commander.name] = 1;
  const actual = Object.fromEntries(report.selected.rows.map(row => [row.name, row.quantity]));
  assert.deepEqual(actual, expected, 'a complete imported deck is evidence, not permission to optimize away choices');
  assert.deepEqual(report.changes.added, []);
  assert.deepEqual(report.changes.trimmed, []);
  const review = guidedCompletionReview(report.selected.deckText,
    fixture.importedRows.map(row => row.name), [fixture.commander.name], expected);
  assert.deepEqual(review.added, []);
  assert.deepEqual(review.missing, []);
  assert.deepEqual(review.quantityDrift, []);
  assert.equal(review.total, 100, 'the actual engine output passes the guided completion safeguard');
});
