"use client";

import { PhilosophyCompare } from "./philosophy-compare";
import { useForgeSession } from "../../forge-session-context";

export function MasterworksChamber() {
  const {
    pendingCandidateChoice,
    masterworksCommissionContract,
    commissionNote,
    masterworksRequestRecognition,
    strategyBuildComparison,
    activeCommanderName,
    selectedCommander,
    revealOccupancyLabels,
    enterMasterwork,
    setHoveredCard,
    setPendingCandidateChoice,
    setChamber,
  } = useForgeSession();

  return (
    <section className="masterwork-reveal" id="masterwork-choice-start">
      {pendingCandidateChoice ? (
        <>
          {(masterworksCommissionContract?.hasContract || commissionNote.trim()) && (
            <aside className="request-recognition masterworks-request-recognition is-loud commission-contract" aria-label="Commission contract">
              <header>
                <small>1 · I HEARD YOU</small>
                <strong>You asked for</strong>
              </header>
              {masterworksCommissionContract?.youAskedFor?.length > 0 ? (
                <ul className="request-recognition-checklist commission-ask-chips">
                  {masterworksCommissionContract.youAskedFor
                    .filter((clause: any) => clause.role !== "commander")
                    .map((clause: any) => (
                      <li key={clause.id} className="status-detected">
                        <b>✓ {clause.label}</b>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="request-recognition-note">
                  <small>YOUR REQUEST</small>
                  {commissionNote.trim()}
                </p>
              )}
              {((pendingCandidateChoice.nativeReport.candidates?.length || 1) <= 1) && (masterworksCommissionContract?.matchHonesty
                || masterworksCommissionContract?.matchLabel
                || Number.isFinite(masterworksCommissionContract?.matchPercent)) && (
                <p className="commission-verdict">
                  <small>VERDICT · THIS EXPERIENCE</small>
                  {masterworksCommissionContract.matchHonesty
                    || (Number.isFinite(masterworksCommissionContract.matchPercent)
                      ? `${masterworksCommissionContract.matchPercent}% match · ${masterworksCommissionContract.matchLabel || "heard"}`
                      : masterworksCommissionContract.matchLabel)}
                </p>
              )}
              {((pendingCandidateChoice.nativeReport.candidates?.length || 1) > 1) && masterworksCommissionContract?.hasContract && (
                <p className="commission-verdict commission-fit-per-philosophy">
                  <small>COMMISSION FIT</small>
                  Each philosophy below is graded against your contract. The score is never shared across options.
                </p>
              )}
              {masterworksRequestRecognition?.adjustments?.length > 0 && (
                <p className="commission-why">
                  <small>WHY</small>
                  {masterworksRequestRecognition.adjustments[0].reason
                    || masterworksRequestRecognition.adjustments[0].headline}
                </p>
              )}
            </aside>
          )}
          {(strategyBuildComparison?.builds?.length > 0) && (
            <PhilosophyCompare
              builds={strategyBuildComparison.builds}
              decidedBy={strategyBuildComparison.decidedBy || null}
              commanderName={
                pendingCandidateChoice.nativeReport.selected?.strategicIntent?.commanders?.[0]?.name
                || activeCommanderName
                || selectedCommander?.name
                || ""
              }
              occupancyEngines={revealOccupancyLabels}
              onChoose={(candidateId) => enterMasterwork(candidateId)}
              onInspectCard={setHoveredCard}
              surface="pre-choice-diff"
            />
          )}
          <footer>
            <button
              onClick={() => {
                setPendingCandidateChoice(null);
                setChamber("entrance");
              }}
            >
              Start a new deck
            </button>
          </footer>
        </>
      ) : (
        <div className="masterwork-reveal-empty">
          <p>There&rsquo;s no build waiting for a choice right now.</p>
          <button type="button" onClick={() => setChamber("entrance")}>
            Return to start
          </button>
        </div>
      )}
    </section>
  );
}
