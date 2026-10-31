"use client";

import { cardImage } from "../../card-art";
import { guidedCategoryLabel } from "../../guided-reason-copy.mjs";
import { DECLINE_REASONS } from "../../guided-preference-learning.mjs";
import { useForgeSession } from "../../forge-session-context";

const COLOR_LABEL: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colorless" };

// The guided finish (app/guided-finish.mjs, worker/forge-guided-build.ts →
// handleForgeGuidedFinish). Three steps, each a proposal the player
// adjusts and confirms: the mana base, the open slots, then a review. The
// deck is only finished from the review, once every slot is confirmed.
export function GuidedFinishPanel() {
  const {
    guidedSession: session,
    guidedLoading,
    guidedBuildLocked,
    guidedConflict,
    guidedFinishStatus: status,
    setGuidedLandTarget,
    adjustGuidedBasic,
    acceptGuidedUtilityLand,
    confirmGuidedMana,
    reopenGuidedMana,
    acceptGuidedPackageCard,
    acceptGuidedPackage,
    declineGuidedPackageCard,
    enterGuidedFinish,
    finishGuidedBuild,
  } = useForgeSession();
  const finish = session?.finish;
  if (!session || !finish) return null;
  const busy = guidedLoading || guidedBuildLocked;
  const proposal = finish.proposal;
  const basics = Object.entries(finish.basics || {});
  const basicsCount = basics.reduce((sum, [, count]) => sum + count, 0);
  const landsPicked: string[] = proposal?.landsPicked || [];

  if (finish.stage === "mana") {
    return (
      <article className="guided-finish guided-finish-mana" aria-live="polite" aria-busy={guidedLoading}>
        <small>FINISH · STEP 1 OF 3 · MANA BASE</small>
        <h2>{proposal ? `About ${proposal.landTarget} lands for this deck` : "Reading your picks…"}</h2>
        {proposal && (
          <>
            <ul className="guided-finish-reasons">
              {(proposal.landCount?.reasons || []).map((line: string) => <li key={line}>{line}</li>)}
            </ul>
            <div className="guided-finish-landcount" role="group" aria-label="Land count">
              <button type="button" disabled={busy} onClick={() => setGuidedLandTarget(proposal.landTarget - 1)} aria-label="One fewer land">−</button>
              <b>{proposal.landTarget} lands</b>
              <button type="button" disabled={busy} onClick={() => setGuidedLandTarget(proposal.landTarget + 1)} aria-label="One more land">＋</button>
              {proposal.landTarget !== proposal.landCount?.count && (
                <button type="button" disabled={busy} onClick={() => setGuidedLandTarget(proposal.landCount.count)}>Use the suggested {proposal.landCount.count}</button>
              )}
            </div>

            {proposal.colorSources?.length > 1 && (
              <section className="guided-finish-sources" aria-label="Color sources">
                <h3>Color sources</h3>
                <p>How many lands should make each color, based on the mana symbols in your picks.</p>
                <ul>
                  {proposal.colorSources.map((row) => (
                    <li key={row.color}>
                      <b>{COLOR_LABEL[row.color] || row.color}</b>
                      <span>{row.share}% of your colored symbols · aim for {row.target} sources</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="guided-finish-utility" aria-label="Nonbasic lands">
              <h3>Nonbasic lands</h3>
              <p>
                {landsPicked.length
                  ? `You've picked ${landsPicked.length} nonbasic ${landsPicked.length === 1 ? "land" : "lands"}. Each one you add takes a basic's place.`
                  : "Lands that fix your colors or do something extra. Each one you add takes a basic's place."}
              </p>
              {proposal.utilityLands?.length ? (
                <ul>
                  {proposal.utilityLands.map((land) => (
                    <li key={land.name}>
                      <img src={cardImage(land.name)} alt="" loading="lazy" />
                      <div>
                        <b>{land.name}</b>
                        <small>{land.reason}</small>
                      </div>
                      <button type="button" disabled={busy} onClick={() => acceptGuidedUtilityLand(land.name)}>Add</button>
                    </li>
                  ))}
                </ul>
              ) : <p>No more nonbasic lands to suggest. Search for one below if you have one in mind.</p>}
            </section>

            <section className="guided-finish-basics" aria-label="Basic lands">
              <h3>Basic lands · {basicsCount}</h3>
              <p>A suggested split by color. Adjust it however you like.</p>
              <ul>
                {(basics.length ? basics : Object.entries(proposal.basics || {})).map(([name, count]) => (
                  <li key={name}>
                    <b>{name}</b>
                    <button type="button" disabled={busy} onClick={() => adjustGuidedBasic(name, -1)} aria-label={`One fewer ${name}`}>−</button>
                    <span>{count}</span>
                    <button type="button" disabled={busy} onClick={() => adjustGuidedBasic(name, 1)} aria-label={`One more ${name}`}>＋</button>
                  </li>
                ))}
              </ul>
              <p className="guided-finish-count" role="status">
                {landsPicked.length + basicsCount} lands so far
                {landsPicked.length + basicsCount !== proposal.landTarget ? ` (you aimed for ${proposal.landTarget})` : ""}
              </p>
            </section>

            <div className="guided-actions">
              <button type="button" className="guided-accept" disabled={busy} onClick={confirmGuidedMana}>
                Confirm this mana base →
              </button>
            </div>
          </>
        )}
      </article>
    );
  }

  if (finish.stage === "slots") {
    const cards = finish.package || [];
    return (
      <article className="guided-finish guided-finish-slots" aria-live="polite" aria-busy={guidedLoading}>
        <small>FINISH · STEP 2 OF 3 · OPEN SLOTS</small>
        <h2>{status.open ? `${status.open} ${status.open === 1 ? "slot" : "slots"} left to fill` : status.over ? `${status.over} too many cards` : "Every slot is filled"}</h2>
        <p>
          {status.over
            ? "Remove a pick or a basic land to get back to the deck size."
            : "Here are a few cards for the roles your deck is still short on. Take the ones you like, turn down the rest, or search for your own."}
        </p>
        {cards.length > 0 && (
          <ul className="guided-finish-package">
            {cards.map((card) => (
              <li key={card.name}>
                <img src={cardImage(card.name)} alt={card.name} loading="lazy" />
                <div>
                  <small>{guidedCategoryLabel(card.category).toUpperCase()}</small>
                  <b>{card.name}</b>
                  <em>{card.typeLine}{card.manaCost ? ` · ${card.manaCost}` : ""}</em>
                  {card.explanation?.role && <p>{card.explanation.role}</p>}
                  {card.explanation?.tradeOff && <p className="guided-finish-tradeoff">{card.explanation.tradeOff}</p>}
                  <div className="guided-actions">
                    <button type="button" className="guided-accept" disabled={busy || !status.open} onClick={() => acceptGuidedPackageCard(card.name)}>Add</button>
                    <details>
                      <summary>Not this one</summary>
                      {DECLINE_REASONS.map((reason) => (
                        <button type="button" key={reason.id} disabled={busy} onClick={() => declineGuidedPackageCard(card.name, reason.id)}>{reason.label}</button>
                      ))}
                      <button type="button" disabled={busy} onClick={() => declineGuidedPackageCard(card.name, null)}>Just show me another</button>
                    </details>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!cards.length && status.open > 0 && <p>The Forge has nothing more to suggest here. Search for a card below.</p>}
        <div className="guided-actions">
          {cards.length > 1 && status.open > 0 && (
            <button type="button" disabled={busy} onClick={acceptGuidedPackage}>Add all {Math.min(cards.length, status.open)}</button>
          )}
          <button type="button" disabled={busy} onClick={reopenGuidedMana}>← Back to the mana base</button>
          {!status.open && !status.over && <button type="button" className="guided-accept" disabled={busy} onClick={() => void enterGuidedFinish()}>Review the deck →</button>}
        </div>
      </article>
    );
  }

  return (
    <article className="guided-finish guided-finish-review" aria-live="polite" aria-busy={guidedLoading}>
      <small>FINISH · STEP 3 OF 3 · REVIEW</small>
      <h2>{status.confirmed} of {status.deckTarget} cards, every one your choice</h2>
      <p>Commander{session.accepted.length ? `, ${session.accepted.length} picks` : ""}, and {basicsCount} basic {basicsCount === 1 ? "land" : "lands"}. Finishing checks the deck and opens it in the workbench, where you can keep editing.</p>
      <div className="guided-actions">
        <button type="button" className="guided-accept" disabled={guidedLoading || Boolean(guidedConflict) || (!guidedBuildLocked && (Boolean(status.open) || Boolean(status.over)))} onClick={() => void finishGuidedBuild()}>
          {guidedBuildLocked ? "Check saved finish" : "Confirm every slot and finish"}
        </button>
        <button type="button" disabled={busy} onClick={reopenGuidedMana}>← Change the mana base</button>
      </div>
    </article>
  );
}
