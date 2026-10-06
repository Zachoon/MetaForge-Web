"use client";
import { useForgeSession } from "../../forge-session-context";
import { cardFactKey, cardPriceUsd } from "../../deck-row-helpers";

export function GuidedCompletionReview() {
  const { guidedReview, hasValidatedDeck, deckIntegrity, deckPriceTotal, honestCoachSummary, cardFacts } = useForgeSession();
  if (!guidedReview || !hasValidatedDeck) return null;
  const { maxCardPrice, commonsOnly } = guidedReview.preferences || {};
  const violations: string[] = [];
  let unknownFilters = 0;
  for (const row of guidedReview.added) {
    const fact = cardFacts[cardFactKey(row.name)];
    const price = cardPriceUsd(fact);
    if ((commonsOnly && !fact?.rarity) || (maxCardPrice != null && price == null)) unknownFilters += row.quantity;
    if (commonsOnly && fact?.rarity && fact.rarity !== "common") violations.push(`${row.name}: not common in this printing`);
    if (maxCardPrice != null && price != null && price > maxCardPrice) violations.push(`${row.name}: current price exceeds $${maxCardPrice}`);
  }
  return <aside className="guided-draft-card" aria-label="Guided build review">
    <h2>Your choices, completed</h2>
    <p>{guidedReview.kept.length} of your picks kept. The Forge added {guidedReview.added.reduce((total: number, row: any) => total + row.quantity, 0)} cards.</p>
    <details><summary>Your picks</summary><ul>{guidedReview.kept.map((name: string) => <li key={name}>{name}</li>)}</ul></details>
    <details><summary>Added by the Forge</summary><ul>{guidedReview.added.map((row: any) => <li key={row.name}>{row.quantity} {row.name}</li>)}</ul></details>
    <p>{deckIntegrity.checking ? "Checking current card legality…" : deckIntegrity.passed ? "Current legality and deck structure checks passed." : "This deck needs attention before play."}</p>
    {!!deckIntegrity.issues.length && <ul>{deckIntegrity.issues.map((issue: string) => <li key={issue}>{issue}</li>)}</ul>}
    <p>{deckPriceTotal.unpricedCards ? `${deckPriceTotal.unpricedCards} cards have unknown prices; the displayed cost is incomplete.` : "Every card has a price estimate."}</p>
    <p>Requested filters for Forge additions: {commonsOnly ? "commons only" : "all rarities"}{maxCardPrice != null ? `; at most $${maxCardPrice} per card` : "; no per-card price cap"}. Your own picks and commanders were kept separately.</p>
    {!!violations.length && <ul aria-label="Filter checks needing attention">{violations.map(issue => <li key={issue}>{issue}</li>)}</ul>}
    {!!unknownFilters && <p>{unknownFilters} added cards still need price or printing verification. A card may have a cheaper or common printing.</p>}
    {!violations.length && !unknownFilters && (commonsOnly || maxCardPrice != null) && <p>Added cards meet the requested filters in the checked printings.</p>}
    {honestCoachSummary.coachingAllowed && <><h3>Your first games</h3><p>{honestCoachSummary.intentions.accomplish}</p><p>{honestCoachSummary.intentions.establish}</p><p>{honestCoachSummary.intentions.firstVulnerability}</p>{honestCoachSummary.uncertaintyLead && <p>{honestCoachSummary.uncertaintyLead}</p>}</>}
  </aside>;
}
