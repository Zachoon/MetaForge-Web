"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ForgeCardRef, ForgeCardRefList } from "../forge-card-ref";
import { DeepForgeDossier } from "../components/forge/deep-forge-dossier";
import { tableMeaningFor } from "../strategic-recognition.mjs";
import { explainPairAsMentor } from "../knowledge/mentor-shadow.mjs";
import { cardImage } from "../card-art";
import { trackLaunchEvent } from "../launch-telemetry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResearchBundle = any;

function readBundle(deckId: string): ResearchBundle | null {
  try {
    const raw = window.localStorage.getItem(`metaforge.research.${deckId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ResearchEmptyState() {
  return (
    <main className="deck-manuscript research-empty-state forge-atmosphere">
      <header>
        <small>RESEARCH &amp; EVIDENCE</small>
        <h1>No evidence saved yet.</h1>
      </header>
      <p>
        Build and validate a deck first — the Forge saves its evidence here as
        soon as a Masterwork is ready.
      </p>
      <Link href="/">← Back to the Forge</Link>
    </main>
  );
}

function ResearchPageInner() {
  const searchParams = useSearchParams();
  const [bundle, setBundle] = useState<ResearchBundle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [hoveredCard, setHoveredCard] = useState("");

  useEffect(() => {
    try {
      const requestedId = searchParams.get("deckId") || "";
      const deckId = requestedId || window.localStorage.getItem("metaforge.research.latest") || "";
      const loaded = deckId ? readBundle(deckId) : null;
      setBundle(loaded);
      setStatus(loaded ? "ready" : "empty");
    } catch {
      setStatus("empty");
    }
  }, [searchParams]);

  const forgeSystemsReport = bundle?.forgeSystemsReport || { systems: [], bridgeCards: [], systemCoverage: 0, confidence: "", methodology: "" };
  const interactionGraph = useMemo(
    () => bundle?.interactionGraph || { packages: [], edges: [], nonbos: [], amplifiers: [], isolated: [], enginePairs: [], resetPairs: [], coverage: 0, confidence: "", methodology: "" },
    [bundle],
  );
  const forgeCausalityReport = bundle?.forgeCausalityReport || null;
  const forgeFailureAnalysis = bundle?.forgeFailureAnalysis || null;
  const honestCoachSummary = bundle?.honestCoachSummary || null;
  const coachingDiagnosis = bundle?.coachingDiagnosis || null;
  const revisionLearning = bundle?.revisionLearning || { actionable: [], matchups: [], sampleSize: 0 };
  const interventionLearning = bundle?.interventionLearning || { experiments: [], reusable: [], reusableGuidance: "", evidenceBoundary: "" };
  const coachOccupancyLabels: string[] = bundle?.coachOccupancyLabels || [];
  const deckIntegrity = bundle?.deckIntegrity || null;

  const activeSystem = useMemo(
    () => forgeSystemsReport.systems.find((system: any) => system.id === selectedSystemId) || null,
    [forgeSystemsReport.systems, selectedSystemId],
  );
  const visibleForgeSystems = useMemo(() => {
    if (showAllSystems) return forgeSystemsReport.systems;
    const strongest = forgeSystemsReport.systems.slice(0, 3);
    if (activeSystem && !strongest.some((system: any) => system.id === activeSystem.id)) {
      return [activeSystem, ...strongest.slice(0, 2)];
    }
    return strongest;
  }, [activeSystem, forgeSystemsReport.systems, showAllSystems]);
  const focusedInteractionGraph = useMemo(() => {
    if (!activeSystem) {
      return {
        packages: interactionGraph.packages,
        edges: interactionGraph.edges,
        nonbos: interactionGraph.nonbos,
        amplifiers: interactionGraph.amplifiers,
        isolated: interactionGraph.isolated,
      };
    }
    const members = new Set(activeSystem.members);
    return {
      packages: interactionGraph.packages.filter((group: any) => group.members.some((name: string) => members.has(name))),
      edges: interactionGraph.edges.filter((edge: any) => members.has(edge.from) || members.has(edge.to)),
      nonbos: interactionGraph.nonbos.filter((conflict: any) => members.has(conflict.source) || ("target" in conflict && typeof conflict.target === "string" && members.has(conflict.target))),
      amplifiers: interactionGraph.amplifiers.filter((amplifier: any) => members.has(amplifier.source) || amplifier.amplifies.some((name: string) => members.has(name))),
      isolated: interactionGraph.isolated.filter((name: string) => members.has(name)),
    };
  }, [activeSystem, interactionGraph]);
  const activeCausalitySystem = useMemo(() => {
    if (!forgeCausalityReport) return null;
    return forgeCausalityReport.systems.find((system: any) => system.id === activeSystem?.id) || forgeCausalityReport.mostFragileSystem || null;
  }, [forgeCausalityReport, activeSystem]);

  // No card-fact/interaction-graph fetch lives on this page — inspecting a
  // card here shows only its art, not the live dossier the deck page's
  // card inspector renders. See the parent task's notes on this tradeoff.
  const hoveredImage = hoveredCard ? cardImage(hoveredCard) : "";

  if (status === "loading") return null;
  if (status === "empty" || !bundle) return <ResearchEmptyState />;

  return (
    <main className="deck-manuscript research-page forge-atmosphere">
      <header className="masterwork-deck-hero">
        <div className="masterwork-deck-title">
          <div>
            <small>RESEARCH &amp; EVIDENCE</small>
            <h1>{bundle.commander || "This Masterwork"}</h1>
            <p>{bundle.format} · {bundle.strategy}</p>
          </div>
        </div>
        <a href={`/?deckId=${encodeURIComponent(bundle.deckId)}`} className="research-back-link">← Back to the deck</a>
      </header>

      {honestCoachSummary && (
        <section className="forge-understanding-bridge coach-brief honest-coach-v0" id="coach-brief" aria-label="Coach's brief">
          <header>
            <small>YOUR COACH</small>
            <h2>{honestCoachSummary.headline}</h2>
            {honestCoachSummary.commissionContract?.hasContract && (
              <aside
                className={`request-recognition commission-contract is-loud${honestCoachSummary.commissionMismatch ? " is-mismatch" : ""}`}
                aria-label="Commission contract"
              >
                <header>
                  <small>1 · I HEARD YOU</small>
                  <strong>You asked for</strong>
                </header>
                <ul className="request-recognition-checklist commission-ask-chips">
                  {honestCoachSummary.commissionContract.youAskedFor
                    .filter((clause: any) => clause.role !== "commander")
                    .map((clause: any) => (
                      <li key={clause.id} className="status-detected">
                        <b>✓ {clause.label}</b>
                      </li>
                    ))}
                </ul>
                {(honestCoachSummary.commissionContract.matchHonesty
                  || honestCoachSummary.commissionContract.matchLabel
                  || Number.isFinite(honestCoachSummary.commissionContract.matchPercent)) && (
                  <p className="commission-verdict">
                    <small>VERDICT</small>
                    {honestCoachSummary.commissionContract.matchHonesty
                      || (Number.isFinite(honestCoachSummary.commissionContract.matchPercent)
                        ? `${honestCoachSummary.commissionContract.matchPercent}% match · ${honestCoachSummary.commissionContract.matchLabel || "heard"}`
                        : honestCoachSummary.commissionContract.matchLabel)}
                  </p>
                )}
                {honestCoachSummary.commissionContract.whatIBuilt?.some((entry: any) => entry.status !== "met") && (
                  <div className="commission-change">
                    <small>WHAT STILL NEEDS WORK</small>
                    <ul className="request-recognition-checklist commission-built-list">
                      {honestCoachSummary.commissionContract.whatIBuilt
                        .filter((entry: any) => entry.status !== "met")
                        .map((entry: any) => (
                          <li key={entry.id} className={`status-${entry.status}`}>
                            <b>{entry.status === "partial" ? "~" : "·"} {entry.label}</b>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {(honestCoachSummary.commissionContract.playerFantasy?.supportLine
                  || honestCoachSummary.requestRecognition?.adjustments?.[0]?.reason) && (
                  <p className="commission-why">
                    <small>WHY</small>
                    {honestCoachSummary.commissionContract.playerFantasy?.supportLine
                      || honestCoachSummary.requestRecognition.adjustments[0].reason}
                  </p>
                )}
                {honestCoachSummary.commissionContract.whatIBuilt?.length > 0 && (
                  <details className="request-recognition-receipts">
                    <summary>Full commission breakdown →</summary>
                    <ul className="request-recognition-checklist commission-built-list">
                      {honestCoachSummary.commissionContract.whatIBuilt.map((entry: any) => (
                        <li key={entry.id} className={`status-${entry.status}`}>
                          <b>{entry.status === "met" ? "✓" : entry.status === "partial" ? "~" : "·"} {entry.label}</b>
                          <span>{entry.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </aside>
            )}
            {!honestCoachSummary.commissionContract?.hasContract
              && honestCoachSummary.requestRecognition?.heard?.length > 0 && (
              <aside className="request-recognition" aria-label="Request recognition">
                <header>
                  <small>1 · I HEARD YOU</small>
                  <strong>Did I hear you?</strong>
                </header>
                <ul className="request-recognition-heard">
                  {honestCoachSummary.requestRecognition.heard.map((theme: any) => (
                    <li key={theme.id} className={`status-${theme.status}`}>
                      <b>{theme.status === "present" || theme.status === "partial" || theme.status === "detected" ? "✓" : "·"} {theme.label}</b>
                    </li>
                  ))}
                </ul>
                {honestCoachSummary.requestRecognition.adjustments?.length > 0 && (
                  <p className="commission-why">
                    <small>WHY</small>
                    {honestCoachSummary.requestRecognition.adjustments[0].reason
                      || honestCoachSummary.requestRecognition.adjustments[0].headline}
                  </p>
                )}
              </aside>
            )}
            {honestCoachSummary.deckUnderstanding && (
              <aside className={`honest-coach-understanding ${honestCoachSummary.deckUnderstanding.reliability.state}`} aria-label="Deck understanding">
                <strong>{honestCoachSummary.deckUnderstanding.playerSummary.headline}</strong>
                <p>{honestCoachSummary.deckUnderstanding.playerSummary.detail}</p>
                {honestCoachSummary.deckUnderstanding.playerSummary.unresolvedNames?.length > 0 && (
                  <ul>
                    {honestCoachSummary.deckUnderstanding.playerSummary.unresolvedNames.map((name: string) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
              </aside>
            )}
            {honestCoachSummary.coachingAllowed && (
              <details
                className={`honest-coach-confidence ${honestCoachSummary.confidence.level}`}
                onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open) {
                    trackLaunchEvent("coach_confidence_opened", {
                      format: bundle.format,
                      confidence: honestCoachSummary.confidence.level,
                    });
                  }
                }}
              >
                <summary>
                  <strong>{honestCoachSummary.confidence.label}</strong>
                  <span>{honestCoachSummary.confidence.detail}</span>
                </summary>
                <p>{honestCoachSummary.confidence.reason}</p>
              </details>
            )}
          </header>
          {honestCoachSummary.coachingAllowed && (
            <details
              className="honest-coach-drilldown"
              onToggle={(event) => {
                if ((event.currentTarget as HTMLDetailsElement).open) {
                  trackLaunchEvent("coach_why_opened", {
                    format: bundle.format,
                    analysis: honestCoachSummary.analysisIds?.analysisId,
                  });
                }
              }}
            >
              <summary>{honestCoachSummary.whyPrompt}</summary>
              <div className="honest-coach-drilldown-grid">
                <div>
                  <small>OBSERVED</small>
                  <ul>
                    {honestCoachSummary.observedFindings.map((line: string) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <small>INTERPRETIVE</small>
                  <ul>
                    {honestCoachSummary.interpretiveGuidance.map((line: string) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {honestCoachSummary.intentions?.dependsOn && (
                <p className="honest-coach-packages">
                  When it becomes dangerous: {honestCoachSummary.intentions.dependsOn}
                </p>
              )}
              {honestCoachSummary.planStory?.planLabel && (
                <p className="honest-coach-packages">
                  Plan label: {honestCoachSummary.planStory.planLabel}
                </p>
              )}
              {honestCoachSummary.identity?.packageLabels?.length > 0 && (
                <p className="honest-coach-packages">
                  Packages detected: {honestCoachSummary.identity.packageLabels.join(" · ")}
                </p>
              )}
              {coachOccupancyLabels.length > 0 && (
                <p className="honest-coach-packages">
                  Occupancy engines: {coachOccupancyLabels.join(" · ")}
                </p>
              )}
              <p className="honest-coach-id-chip" aria-label="Analysis id">
                Analysis {honestCoachSummary.analysisIds?.analysisId}
              </p>
            </details>
          )}
        </section>
      )}

      <section className="forge-intelligence-vault" aria-label="Deep Forge evidence">
        <header>
          <span>
            <small>DEEP FORGE · HOW DO YOU KNOW?</small>
            <b>What MetaForge noticed — and how sure it is</b>
          </span>
        </header>
        <div className="deep-forge-quick-stats">
          <span><small>MARKET TOTAL</small><b>${(bundle.deckPriceTotal?.total || 0).toFixed(2)}</b></span>
          {bundle.powerSignal && <span><small>POWER</small><b>{bundle.powerSignal.tier}</b></span>}
          <span><small>COHESION</small><b>{bundle.evaluation?.cohesion ?? "—"}</b></span>
          <span><small>RESILIENCE</small><b>{bundle.evaluation?.resilience ?? "—"}</b></span>
        </div>
        <DeepForgeDossier
          occupancyEngines={coachOccupancyLabels}
          understanding={honestCoachSummary?.deepForgeUnderstanding}
          principles={honestCoachSummary?.deepForgePrinciples}
        />
        {deckIntegrity && (
          <section className={`integrity-dossier ${deckIntegrity.passed ? "passed" : deckIntegrity.checking ? "checking" : "held"}`}>
            <header>
              <span>
                <small>STRUCTURAL INTEGRITY GATE</small>
                <b>{deckIntegrity.passed ? "This Masterwork is cleared for testing." : "Testing is held until every hard constraint passes."}</b>
              </span>
              <strong>{deckIntegrity.passed ? "VERIFIED" : "REPAIR REQUIRED"}</strong>
            </header>
            <div>
              <span><small>DECK SIZE</small><b>{deckIntegrity.total} / {deckIntegrity.target}</b></span>
              <span><small>AVG. SPELL VALUE</small><b>{deckIntegrity.averageCmc.toFixed(2)}</b></span>
              <span><small>MANA SOURCES</small><b>{deckIntegrity.roles["Mana source"] || 0}</b></span>
              <span><small>INTERACTION</small><b>{(deckIntegrity.roles.Interaction || 0) + (deckIntegrity.roles["Board reset"] || 0)}</b></span>
              <span><small>ADVANTAGE + ENGINES</small><b>{(deckIntegrity.roles["Card advantage"] || 0) + (deckIntegrity.roles["Engine piece"] || 0)}</b></span>
            </div>
            {bundle.manaConsistency && (
              <section className="stress-dossier">
                <span>
                  <small>MANA CONSISTENCY</small>
                  <b>{(bundle.manaConsistency.overall * 100).toFixed(0)}% on-curve</b>
                  <em>Real hypergeometric odds, not a heuristic guess</em>
                </span>
                {bundle.manaConsistency.risky.slice(0, 3).map((entry: { name: string; turn: number; colors: string[]; probability: number }) => (
                  <span key={entry.name}>
                    <small>{entry.colors.join("")} by turn {entry.turn}</small>
                    <b><ForgeCardRef name={entry.name} surface="mana-risky" onInspect={setHoveredCard} /></b>
                    <em>{(entry.probability * 100).toFixed(0)}% chance on time</em>
                  </span>
                ))}
                <p>Counts lands, mana rocks, and dorks as real color sources, but treats multi-color needs as independent draws, so real odds run slightly higher than shown.</p>
              </section>
            )}
            {bundle.powerSignal && (
              <section className="stress-dossier">
                <span>
                  <small>COMMANDER POWER SIGNAL</small>
                  <b>{bundle.powerSignal.assessedRange?.length > 1 ? bundle.powerSignal.assessedRange.join("–") : bundle.powerSignal.tier}</b>
                  <em>{bundle.powerSignal.note}</em>
                  {bundle.powerSignal.confidence && <em>{bundle.powerSignal.confidence} confidence · {bundle.powerSignal.calibration?.representedCards || 0} cards assessed</em>}
                </span>
                {bundle.requestedPowerTier && (
                  <span>
                    <small>TARGETED</small>
                    <b>{bundle.requestedPowerTier}</b>
                    <em>
                      {bundle.powerAudit?.rebuildReachedTarget
                        ? `Rebuilt to reach it: the first pass measured ${bundle.powerAudit.originalMeasuredTier}, so the Forge excluded the flagged cards and rebuilt to the requested tier.`
                        : !bundle.powerAudit || !bundle.powerAudit.mismatch
                          ? "The finished deck reached the requested tier."
                          : bundle.powerAudit.rebuildImproved
                            ? `Improved but not fully resolved: rebuilding brought it from ${bundle.powerAudit.originalMeasuredTier} to ${bundle.powerAudit.measured}, still above the requested tier — disclosed honestly, not relabeled.`
                            : "A nudge, not a guarantee — the finished deck landed here instead, honestly disclosed rather than relabeled."}
                    </em>
                  </span>
                )}
                <span>
                  <small>FAST MANA</small>
                  <b>{bundle.powerSignal.fastMana.length}</b>
                  <em>{bundle.powerSignal.fastMana.slice(0, 3).join(", ") || "None detected"}</em>
                </span>
                <span>
                  <small>UNRESTRICTED TUTORS</small>
                  <b>{bundle.powerSignal.tutors.unrestricted.length}</b>
                  <em>{bundle.powerSignal.tutors.unrestricted.slice(0, 3).join(", ") || "None detected"}</em>
                </span>
                <span>
                  <small>EXTRA TURNS + LAND DENIAL</small>
                  <b>{bundle.powerSignal.extraTurns.length + bundle.powerSignal.massLandDenial.length}</b>
                  <em>{[...bundle.powerSignal.extraTurns, ...bundle.powerSignal.massLandDenial].slice(0, 3).join(", ") || "None detected"}</em>
                </span>
                <span>
                  <small>REPEATABLE ENGINES + MULTIPLIERS</small>
                  <b>{bundle.powerSignal.repeatableValueEngine.length + bundle.powerSignal.resourceMultiplier.length}</b>
                  <em>{[...bundle.powerSignal.repeatableValueEngine, ...bundle.powerSignal.resourceMultiplier].slice(0, 3).join(", ") || "None detected"}</em>
                </span>
                <span>
                  <small>EFFICIENT INTERACTION</small>
                  <b>{bundle.powerSignal.efficientInteraction.length}</b>
                  <em>{bundle.powerSignal.efficientInteraction.slice(0, 3).join(", ") || "None detected"}</em>
                </span>
                {bundle.powerSignal.comboProximity?.count > 0 && (
                  <span>
                    <small>COMPACT COMBO PROXIMITY</small>
                    <b>{bundle.powerSignal.comboProximity.count} verified pair{bundle.powerSignal.comboProximity.count === 1 ? "" : "s"}</b>
                    <em>{bundle.powerSignal.comboProximity.pairs.slice(0, 2).join(" · ")} · counted toward the tier above</em>
                  </span>
                )}
                <p>{bundle.powerSignal.evidence}</p>
                {bundle.powerSignal.calibration?.explanation && <p>{bundle.powerSignal.calibration.explanation}</p>}
              </section>
            )}
            {bundle.simulationDossier && (
              <section className="stress-dossier">
                <span>
                  <small>OPENING-HAND GATE</small>
                  <b>{(bundle.simulationDossier.goldfish.expert.keepableRate * 100).toFixed(1)}% keepable</b>
                  <em>{bundle.simulationDossier.goldfish.gate.replaceAll("-", " ")} · avg {bundle.simulationDossier.goldfish.expert.averageMulligans.toFixed(1)} mulligans</em>
                </span>
                <span>
                  <small>PLAN REALIZATION</small>
                  <b>{(bundle.simulationDossier.goldfish.expert.planRealizationRate * 100).toFixed(1)}%</b>
                  <em>Average turn {bundle.simulationDossier.goldfish.expert.averageRealizationTurn?.toFixed(1) || "—"}</em>
                </span>
                <span>
                  <small>PILOT SENSITIVITY</small>
                  <b>{bundle.simulationDossier.goldfish.sensitivityLabel}</b>
                  <em>Sequencing impact, not player rating</em>
                </span>
                <span>
                  <small>HARDEST STRESS PROFILE</small>
                  <b>{bundle.simulationDossier.matrix.weakest?.opponent || "Unresolved"}</b>
                  <em>{((bundle.simulationDossier.matrix.weakest?.scenarioPassRate || 0) * 100).toFixed(1)}% scenario pass · avg {(bundle.simulationDossier.matrix.weakest?.averageMulligans || 0).toFixed(1)} mulligans</em>
                </span>
                <p>Modeled Forge trials test mana, role density, and sequencing under pressure. They are viability gates—not predicted match win rates.</p>
              </section>
            )}
            {!deckIntegrity.checking && (
              <section className={`forge-systems-chamber ${forgeSystemsReport.systems.length ? "systems-awakened" : "systems-dormant"} ${activeSystem ? "has-active-system" : ""}`}>
                <header className="systems-chamber-heading">
                  <div>
                    <small>SYSTEMS OF THE FORGE</small>
                    <h2>
                      {forgeSystemsReport.systems.length
                        ? "The deck's internal machinery is awake."
                        : honestCoachSummary?.strategyVsSystem?.incompleteEvidence
                          ? "Repeatable systems are not fully verified yet."
                          : "No repeatable system can be verified on this complete card set."}
                    </h2>
                    <p>
                      {forgeSystemsReport.systems.length
                        ? `${forgeSystemsReport.systems.length} repeatable system${forgeSystemsReport.systems.length === 1 ? "" : "s"} detected across ${Math.round(forgeSystemsReport.systemCoverage * 100)}% of nonland cards.`
                        : honestCoachSummary?.deepForgeEmpty?.system}
                    </p>
                  </div>
                  <div className="systems-chamber-seal">
                    <i>ᛞ</i>
                    <span>
                      <small>STRUCTURAL CONFIDENCE</small>
                      <strong>{forgeSystemsReport.confidence}</strong>
                    </span>
                  </div>
                </header>
                {forgeSystemsReport.systems.length > 0 ? (
                  <>
                    <section className="systems-overview">
                      {honestCoachSummary?.strategicRecognition?.primaryPlan
                        && !honestCoachSummary.strategicRecognition?.ambiguous && (
                        <article className="systems-primary-plan">
                          <small>WHAT THIS MEANS AT THE TABLE</small>
                          <strong>
                            {honestCoachSummary.strategicRecognition.tableWhy
                              || honestCoachSummary.strategicRecognition.planLabel}
                          </strong>
                          <span>
                            Supporting evidence · powered by{" "}
                            {[
                              honestCoachSummary.strategicRecognition.hierarchy?.primary?.name,
                              ...(honestCoachSummary.strategicRecognition.hierarchy?.supporting || [])
                                .slice(0, 2)
                                .map((entry: any) => entry.name),
                            ].filter(Boolean).join(" · ") || "verified systems"}
                          </span>
                        </article>
                      )}
                      <article>
                        <small>STRONGEST AT THE TABLE</small>
                        <strong>
                          {honestCoachSummary?.strategicRecognition?.tableMeaning
                            || honestCoachSummary?.strategicRecognition?.playerSystemLines?.[0]
                            || forgeSystemsReport.strongestSystem?.name
                            || "Unresolved"}
                        </strong>
                        <span>
                          Supporting evidence · {forgeSystemsReport.strongestSystem?.name || "system"} ·{" "}
                          {forgeSystemsReport.strongestSystem?.health?.overall || 0}/100 health
                        </span>
                      </article>
                      <article>
                        <small>CLEAREST PRESSURE POINT</small>
                        <strong>{forgeSystemsReport.weakestSystem?.name || "Unresolved"}</strong>
                        <span>{forgeSystemsReport.weakestSystem?.health?.dependencyRisk || 0}/100 dependency risk</span>
                      </article>
                      <article>
                        <small>BRIDGE NETWORK</small>
                        <strong>{forgeSystemsReport.bridgeCards.length} bridge card{forgeSystemsReport.bridgeCards.length === 1 ? "" : "s"}</strong>
                        <span>Cards serving more than one detected system</span>
                      </article>
                    </section>
                    {coachOccupancyLabels.length > 0 && (
                      <span className="slot-justification">
                        <small>OCCUPANCY ENGINES · COMMANDER ORACLE, NOT COMPOSITION OF THE 99</small>
                        <em>{coachOccupancyLabels.join(" · ")}</em>
                      </span>
                    )}
                    {interactionGraph.enginePairs.length > 0 && (
                      <span className="slot-justification">
                        <small>POTENTIAL TWO-CARD ENGINES · PATTERN-INFERRED, NOT A VERIFIED COMBO</small>
                        {interactionGraph.enginePairs.slice(0, 3).map((pair: { cards: string[]; reason: string; loopKind?: string }) => {
                          const mentor = explainPairAsMentor({ cards: pair.cards, loopKind: pair.loopKind });
                          return (
                            <em key={pair.cards.join("+")}>
                              {pair.cards.join(" + ")}
                              {pair.loopKind && pair.loopKind !== "engine" ? ` · ${pair.loopKind.replaceAll("_", " ")}` : ""}
                              {mentor.ok ? ` · ${mentor.loopSeating[0].seat.label}` : ""}
                              {" — "}
                              {pair.reason}
                            </em>
                          );
                        })}
                      </span>
                    )}
                    {(interactionGraph.resetPairs || []).length > 0 && (
                      <span className="slot-justification">
                        <small>RESET SHAPES · INVESTIGATE, NOT A VERIFIED INFINITE</small>
                        {interactionGraph.resetPairs.slice(0, 3).map((pair: { cards: string[]; reason: string; loopKind?: string; shape?: string }) => {
                          const mentor = explainPairAsMentor({ cards: pair.cards, loopKind: pair.loopKind, shape: pair.shape });
                          return (
                            <em key={pair.cards.join("+")}>
                              {pair.cards.join(" + ")}
                              {mentor.ok ? ` · ${mentor.loopSeating[0].seat.label}` : ""}
                              {" — "}
                              {pair.reason}
                            </em>
                          );
                        })}
                      </span>
                    )}
                    <div className="systems-blueprint-grid">
                      {visibleForgeSystems.map((system: any, systemIndex: number) => {
                        const gauges = [
                          ["Overall Health", system.health.overall, false],
                          ["Consistency", system.health.consistency, false],
                          ["Resilience", system.health.resilience, false],
                          ["Leverage", system.health.leverage, false],
                          ["Cohesion", system.health.cohesion, false],
                          ["Dependency Risk", system.health.dependencyRisk, true],
                        ] as const;
                        return (
                          <details
                            className={`system-blueprint ${activeSystem?.id === system.id ? "active-system-blueprint" : ""}`}
                            key={system.id}
                            open={activeSystem?.id === system.id}
                            onToggle={(event) => {
                              if (event.currentTarget.open) setSelectedSystemId(system.id);
                              else if (activeSystem?.id === system.id) setSelectedSystemId("");
                            }}
                            style={{ "--system-order": systemIndex } as React.CSSProperties}
                          >
                            <summary>
                              <span className="system-rune">{["ᛟ", "ᛉ", "ᛞ", "ᚱ", "ᛇ"][systemIndex % 5]}</span>
                              <span className="system-identity">
                                <small>WHAT THIS MEANS · SYSTEM {String(systemIndex + 1).padStart(2, "0")}</small>
                                <strong>{tableMeaningFor(system.signal) || system.name}</strong>
                                <em>
                                  Supporting evidence · {system.name} · {system.members.length} cards ·{" "}
                                  {system.edges.length} links · Health {system.health?.overall ?? 0}
                                </em>
                              </span>
                              <span className="system-health-medallion">
                                <b>{system.health.overall}</b>
                                <small>HEALTH</small>
                              </span>
                              <span className="blueprint-toggle" aria-current={activeSystem?.id === system.id ? "true" : undefined}>
                                {activeSystem?.id === system.id ? "Machine selected" : "Open blueprint"}
                              </span>
                            </summary>
                            <div className="system-blueprint-body">
                              <section className="system-health-board">
                                <header>
                                  <small>STRUCTURAL HEALTH</small>
                                  <span>{system.confidence}</span>
                                </header>
                                {gauges.map(([label, value, danger]) => (
                                  <div className={`system-gauge ${danger ? "risk-gauge" : ""}`} key={label}>
                                    <span><small>{label}</small><b>{value}</b></span>
                                    <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></i>
                                  </div>
                                ))}
                              </section>
                              <section className="system-component-board">
                                <article>
                                  <small>CORE COMPONENTS</small>
                                  <div>
                                    {system.core.map((name: string) => (
                                      <button
                                        type="button"
                                        key={name}
                                        data-card-inspect-surface="system-core"
                                        className={forgeSystemsReport.bridgeCards.some((bridge: any) => bridge.name === name) ? "bridge-component" : ""}
                                        aria-label={`Inspect ${name}`}
                                        onClick={() => setHoveredCard(name)}
                                      >
                                        {name}
                                      </button>
                                    ))}
                                  </div>
                                </article>
                                <article>
                                  <small>SUPPORT COMPONENTS</small>
                                  <div>
                                    {system.support.length ? (
                                      system.support.map((name: string) => (
                                        <button type="button" key={name} data-card-inspect-surface="system-support" onClick={() => setHoveredCard(name)}>{name}</button>
                                      ))
                                    ) : <em>No separate support layer detected.</em>}
                                  </div>
                                </article>
                                <article>
                                  <small>PRODUCERS</small>
                                  <div>
                                    {system.producers.length ? (
                                      system.producers.map((name: string) => (
                                        <button type="button" key={name} data-card-inspect-surface="system-producers" onClick={() => setHoveredCard(name)}>{name}</button>
                                      ))
                                    ) : <em>Producer role remains distributed.</em>}
                                  </div>
                                </article>
                                <article>
                                  <small>PAYOFFS</small>
                                  <div>
                                    {system.payoffs.length ? (
                                      system.payoffs.map((name: string) => (
                                        <button type="button" key={name} data-card-inspect-surface="system-payoffs" onClick={() => setHoveredCard(name)}>{name}</button>
                                      ))
                                    ) : <em>Payoff role remains distributed.</em>}
                                  </div>
                                </article>
                              </section>
                              <section className="system-engineering-notes">
                                <article>
                                  <small>REDUNDANCY</small>
                                  <strong>
                                    {system.redundancy.repeatedCards.length
                                      ? `${system.redundancy.repeatedCards.length} repeated component${system.redundancy.repeatedCards.length === 1 ? "" : "s"}`
                                      : "Singleton structure"}
                                  </strong>
                                  <p>{system.redundancy.producerCount} producers · {system.redundancy.payoffCount} payoffs</p>
                                </article>
                                <article className={system.criticalFailures.length ? "engineering-warning" : ""}>
                                  <small>CRITICAL FAILURE AUDIT</small>
                                  {system.criticalFailures.length ? (
                                    system.criticalFailures.map((failure: any) => (
                                      <p key={failure.name}>
                                        <b>{failure.name}</b>
                                        <span>Removing this component breaks {Math.round(failure.impact * 100)}% of measured internal links.</span>
                                      </p>
                                    ))
                                  ) : (
                                    <p>
                                      <b>NO SINGLE COLLAPSE POINT</b>
                                      <span>The current graph does not isolate one component carrying a critical share of internal connections.</span>
                                    </p>
                                  )}
                                </article>
                              </section>
                              <footer>
                                <span>{system.evidence}</span>
                                <div className="system-blueprint-actions">
                                  <b>{system.health.dependencyRisk >= 55 ? "DEPENDENCY WATCH" : "STRUCTURE TEMPERED"}</b>
                                </div>
                              </footer>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                    {forgeSystemsReport.systems.length > 3 && (
                      <button type="button" className="system-disclosure-toggle" onClick={() => setShowAllSystems((visible) => !visible)}>
                        {showAllSystems ? "Return to the three strongest systems" : `Reveal all ${forgeSystemsReport.systems.length} detected systems`}
                      </button>
                    )}
                    <section className="systems-bridge-foundry">
                      <header>
                        <div>
                          <small>BRIDGE CARDS</small>
                          <h3>Components carrying more than one machine</h3>
                        </div>
                        <span>{forgeSystemsReport.bridgeCards.length} FOUND</span>
                      </header>
                      {forgeSystemsReport.bridgeCards.length ? (
                        <div>
                          {forgeSystemsReport.bridgeCards.map((bridge: any) => (
                            <button
                              type="button"
                              key={bridge.name}
                              data-card-inspect-surface="bridge-card"
                              className={activeSystem && bridge.systems.includes(activeSystem.name) ? "active-bridge-card" : ""}
                              aria-label={`Inspect bridge card ${bridge.name}`}
                              onClick={() => setHoveredCard(bridge.name)}
                            >
                              <i>◇</i>
                              <span><strong>{bridge.name}</strong><small>{bridge.systems.join(" · ")}</small></span>
                              <b>{bridge.score}</b>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p>No card currently bridges two named systems. That is not inherently a flaw, but it reduces cross-engine leverage.</p>
                      )}
                    </section>
                    {forgeCausalityReport && (
                      <section className="structural-intelligence-chamber">
                        <header className="structural-intelligence-heading">
                          <div>
                            <small>STRUCTURAL INTELLIGENCE · BOUNDED MODEL</small>
                            <h3>{activeCausalitySystem ? `${activeCausalitySystem.name} under load` : "The Forge is mapping structural consequences."}</h3>
                            <p>{forgeCausalityReport.headline}</p>
                            {forgeCausalityReport.nextTest && <p className="causality-next-test">{forgeCausalityReport.nextTest}</p>}
                          </div>
                          <span className="causality-confidence-seal">
                            <b>{forgeCausalityReport.structuralResilience}</b>
                            <small>DECK RESILIENCE</small>
                          </span>
                        </header>
                        <div className="causality-vitals">
                          {[
                            ["Survives disruption", forgeCausalityReport.structuralResilience, false],
                            ["Depends on key cards", forgeCausalityReport.collapseRisk, true],
                            ["Can rebuild", forgeCausalityReport.recoveryPotential, false],
                            ["Has backup pieces", activeCausalitySystem?.redundancy || 0, false],
                          ].map(([label, value, risk]) => (
                            <article className={risk ? "causality-risk" : ""} key={String(label)}>
                              <span><small>{label}</small><b>{Number(value)}</b></span>
                              <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></i>
                            </article>
                          ))}
                        </div>
                        {activeCausalitySystem && (
                          <div className="causality-machine-summary">
                            <span>
                              <small>ACTIVE CARD GROUP</small>
                              <strong>{activeCausalitySystem.name}</strong>
                              <em>{activeCausalitySystem.status.toUpperCase()} · {activeCausalitySystem.confidence}</em>
                            </span>
                            <span><small>SURVIVES DISRUPTION</small><b>{activeCausalitySystem.structuralResilience}</b></span>
                            <span><small>KEY-CARD DEPENDENCE</small><b>{activeCausalitySystem.collapseRisk}</b></span>
                            <span><small>CAN REBUILD</small><b>{activeCausalitySystem.recoveryPotential}</b></span>
                          </div>
                        )}
                        <div className="causality-panels">
                          <article className="causality-panel critical-nodes-panel">
                            <header><span>⚒</span><div><small>CARDS THIS PLAN LEANS ON</small><strong>The hardest pieces to lose or replace</strong></div></header>
                            <div>
                              {(activeCausalitySystem?.criticalNodes || []).length ? (
                                activeCausalitySystem.criticalNodes.map((card: any) => (
                                  <button type="button" key={card.name} data-card-inspect-surface="causality-critical" onClick={() => setHoveredCard(card.name)}>
                                    <span><b>{card.name}</b><small>{card.primaryRole}</small></span>
                                    <em>{card.collapseRisk}<small> RISK</small></em>
                                  </button>
                                ))
                              ) : <p>No single card appears essential to keeping this plan working.</p>}
                            </div>
                          </article>
                          <article className="causality-panel amplifier-panel">
                            <header><span>✦</span><div><small>CARDS THAT HELP SEVERAL PIECES</small><strong>One card improving more than one part of the plan</strong></div></header>
                            <div>
                              {(activeCausalitySystem?.amplifiers || []).length ? (
                                activeCausalitySystem.amplifiers.map((card: any) => (
                                  <button type="button" key={card.name} data-card-inspect-surface="causality-amplifier" onClick={() => setHoveredCard(card.name)}>
                                    <span><b>{card.name}</b><small>{card.systems.join(" · ")}</small></span>
                                    <em>{card.amplifierScore}<small> AMP</small></em>
                                  </button>
                                ))
                              ) : <p>No single card is clearly boosting several parts of this plan at once.</p>}
                            </div>
                          </article>
                          <article className="causality-panel bottleneck-panel">
                            <header><span>⛓</span><div><small>JOBS WITH TOO FEW BACKUPS</small><strong>Important work handled by only one or two cards</strong></div></header>
                            <div>
                              {(activeCausalitySystem?.bottlenecks || []).length ? (
                                activeCausalitySystem.bottlenecks.map((card: any) => (
                                  <button type="button" key={card.name} data-card-inspect-surface="causality-bottleneck" onClick={() => setHoveredCard(card.name)}>
                                    <span><b>{card.name}</b><small>{card.alternatives.length} modeled alternative{card.alternatives.length === 1 ? "" : "s"}</small></span>
                                    <em>{card.bottleneckScore}<small> LOAD</small></em>
                                  </button>
                                ))
                              ) : <p>No important job appears to depend on too few cards.</p>}
                            </div>
                          </article>
                        </div>
                        {forgeCausalityReport.highestValueUpgrade && (
                          <p className="deep-forge-redirect">
                            The Forge&rsquo;s single highest-value read on this system: <b>{forgeCausalityReport.highestValueUpgrade.recommendation}</b> This is
                            structural-only context — for an exact, gated one-card experiment, see the tournament-rival experiments on the deck page.
                          </p>
                        )}
                        <footer className="causality-methodology">
                          <span>{forgeCausalityReport.confidence}</span>
                          <p>{forgeCausalityReport.methodology}</p>
                        </footer>
                      </section>
                    )}
                    {forgeFailureAnalysis && (
                      <section className={`systems-failure-reading ${forgeFailureAnalysis.status === "bounded-hypothesis" ? "has-hypothesis" : ""}`}>
                        <header>
                          <span>⚒</span>
                          <div>
                            <small>BOUNDED FAILURE ANALYSIS</small>
                            <h3>{forgeFailureAnalysis.headline}</h3>
                          </div>
                        </header>
                        {forgeFailureAnalysis.chain.length > 0 && (
                          <ol>
                            {forgeFailureAnalysis.chain.map((step: string, index: number) => (
                              <li key={`${index}-${step}`}>
                                <span>{index + 1}</span>
                                <p>{step}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                        <footer>
                          <span>
                            <small>NEXT HONEST TEST</small>
                            <b>{forgeFailureAnalysis.nextTest}</b>
                          </span>
                          <em>{forgeFailureAnalysis.evidence}</em>
                        </footer>
                      </section>
                    )}
                    <footer className="systems-masterwork-reveal">
                      <i />
                      <span>
                        <small>THE SYSTEM MAP IS COMPLETE</small>
                        <strong>Masterwork Intelligence Awakened</strong>
                      </span>
                      <i />
                    </footer>
                  </>
                ) : (
                  <div className="systems-empty-state">
                    <i>ᛞ</i>
                    <strong>{honestCoachSummary?.deepForgeEmpty?.system}</strong>
                    <p>
                      {honestCoachSummary?.strategyVsSystem?.incompleteEvidence
                        ? "Unknown is not absent: missing or unresolved card records prevent naming a repeatable engine. Strategy recognition can still be stronger than system verification."
                        : "The Forge will not manufacture an engine claim from isolated cards on a complete verified set."}
                    </p>
                    {coachOccupancyLabels.length > 0 && (
                      <p>Occupancy engines from commander oracle: {coachOccupancyLabels.join(" · ")}. That is not a verified system map.</p>
                    )}
                  </div>
                )}
                <footer className="systems-methodology">{forgeSystemsReport.methodology}</footer>
              </section>
            )}
            {!deckIntegrity.checking && (
              <section
                id="interaction-graph-dossier"
                className={`interaction-graph-dossier ${activeSystem ? "system-graph-focus" : ""}`}
                aria-label={activeSystem ? `Interaction graph focused on ${activeSystem.name}` : "Complete interaction graph"}
              >
                <header>
                  <span>
                    <small>{activeSystem ? "FOCUSED MACHINE GRAPH · ORACLE REASONING" : "INTERACTION GRAPH · ORACLE REASONING"}</small>
                    <b>{interactionGraph.confidence}</b>
                  </span>
                  <div className="interaction-graph-focus-heading">
                    <strong>{activeSystem ? activeSystem.name : `${Math.round(interactionGraph.coverage * 100)}% connected`}</strong>
                    {activeSystem && (
                      <button type="button" onClick={() => setSelectedSystemId("")}>Show complete graph</button>
                    )}
                  </div>
                </header>
                {coachOccupancyLabels.length > 0 && (
                  <p className="interaction-graph-occupancy">
                    Occupancy engines: {coachOccupancyLabels.join(" · ")}. Named from commander oracle, not from this graph.
                  </p>
                )}
                {activeSystem && (
                  <div className="active-system-graph-banner">
                    <span className="system-rune" aria-hidden="true">ᛞ</span>
                    <span>
                      <small>INSPECTING MACHINE</small>
                      <strong>{activeSystem.name}</strong>
                      <em>{activeSystem.members.length} components · {focusedInteractionGraph.edges.length} visible relationships</em>
                    </span>
                  </div>
                )}
                <div>
                  <article>
                    <small>STRONGEST PACKAGES</small>
                    {focusedInteractionGraph.packages.slice(0, 4).map((group: any) => (
                      <p key={group.signal}>
                        <b>{group.signal.toUpperCase()}</b>
                        <span>
                          <ForgeCardRefList names={group.members} surface="graph-package" onInspect={setHoveredCard} limit={4} />
                          {group.members.length > 4 ? ` +${group.members.length - 4}` : ""}
                        </span>
                      </p>
                    ))}
                    {!focusedInteractionGraph.packages.length && <em>{honestCoachSummary?.deepForgeEmpty?.package}</em>}
                  </article>
                  <article>
                    <small>STRONGEST RELATIONSHIPS</small>
                    {focusedInteractionGraph.edges.slice(0, 3).map((edge: any) => (
                      <p key={`${edge.from}-${edge.to}`}>
                        <b>{edge.strength}% · {edge.signals.join(" + ")}</b>
                        <span>
                          <ForgeCardRef name={edge.from} surface="graph-edge" onInspect={setHoveredCard} />
                          {" ↔ "}
                          <ForgeCardRef name={edge.to} surface="graph-edge" onInspect={setHoveredCard} />
                        </span>
                      </p>
                    ))}
                    {!focusedInteractionGraph.edges.length && <em>{honestCoachSummary?.deepForgeEmpty?.relationship}</em>}
                  </article>
                  <article className={focusedInteractionGraph.nonbos.length ? "graph-warning" : ""}>
                    <small>RULES AUDIT + ISOLATION</small>
                    {focusedInteractionGraph.nonbos.slice(0, 2).map((conflict: any) => (
                      <p key={`${conflict.source}-${conflict.signal}`}>
                        <b>NONBO · <ForgeCardRef name={conflict.source} surface="graph-nonbo" onInspect={setHoveredCard} /></b>
                        <span>{conflict.reason}</span>
                      </p>
                    ))}
                    {!focusedInteractionGraph.nonbos.length && <p><b>NO VERIFIED NONBO</b><span>No symmetrical oracle-text conflict was detected.</span></p>}
                    {focusedInteractionGraph.amplifiers.slice(0, 2).map((amplifier: { source: string; reason: string }) => (
                      <p key={amplifier.source}>
                        <b>AMPLIFIER · <ForgeCardRef name={amplifier.source} surface="graph-amplifier" onInspect={setHoveredCard} /></b>
                        <span>{amplifier.reason}</span>
                      </p>
                    ))}
                    <em>
                      {focusedInteractionGraph.isolated.length ? (
                        <>
                          {`${focusedInteractionGraph.isolated.length} isolated slot${focusedInteractionGraph.isolated.length === 1 ? "" : "s"}: `}
                          <ForgeCardRefList names={focusedInteractionGraph.isolated} surface="graph-isolated" onInspect={setHoveredCard} limit={4} />
                        </>
                      ) : activeSystem ? "Every card in this machine has at least one modeled relationship." : "Every nonland slot has at least one modeled relationship."}
                    </em>
                  </article>
                </div>
                <footer>{interactionGraph.methodology}</footer>
              </section>
            )}
            {deckIntegrity.issues?.length > 0 && (
              <footer>
                <ul>{deckIntegrity.issues.map((issue: string) => <li key={issue}>{issue}</li>)}</ul>
                <p className="deck-integrity-manual-note">
                  Automatic repair isn&rsquo;t available for these — open the Editing Anvil on the deck page to fix the flagged slots by hand.
                </p>
              </footer>
            )}
          </section>
        )}
      </section>

      {coachingDiagnosis && (
        <section className="revision-learning-dossier">
          <header>
            <small>REVISION LEARNING</small>
            <b>{revisionLearning.sampleSize} recorded match{revisionLearning.sampleSize === 1 ? "" : "es"}</b>
          </header>
          <article className={`coaching-diagnosis diagnosis-${coachingDiagnosis.primary.category}`}>
            <header>
              <span><small>COACHING READ</small><b>{coachingDiagnosis.primary.label}</b></span>
              <em>{coachingDiagnosis.primary.confidence}</em>
            </header>
            <p><b>What supports it</b><span>{coachingDiagnosis.primary.evidence.join(" · ")}</span></p>
            <p><b>What to do</b><span>{coachingDiagnosis.primary.recommendation}</span></p>
            <p><b>How to test it</b><span>{coachingDiagnosis.primary.measurement}</span></p>
            {coachingDiagnosis.alternatives.length > 0 && (
              <details>
                <summary>{coachingDiagnosis.alternatives.length} other evidence-backed read{coachingDiagnosis.alternatives.length === 1 ? "" : "s"}</summary>
                {coachingDiagnosis.alternatives.map((alternative: any) => (
                  <span key={alternative.category}><b>{alternative.label}</b>{alternative.recommendation}</span>
                ))}
              </details>
            )}
            <small>{coachingDiagnosis.evidenceBoundary}</small>
          </article>
          {revisionLearning.actionable.length ? revisionLearning.actionable.slice(0, 3).map((pattern: any) => (
            <p key={pattern.preference}><b>{pattern.preference}</b><span>{pattern.confidence} · {pattern.count} matching signals</span></p>
          )) : <p><b>NO PERSISTENT PREFERENCE YET</b><span>Two matching signals are required before the Forge treats a feeling as a revision pattern.</span></p>}
          {revisionLearning.matchups.filter((matchup: any) => matchup.actionable).slice(0, 2).map((matchup: any) => (
            <p key={matchup.opponent}><b>{matchup.opponent} matchup</b><span>{matchup.wins}–{matchup.losses} observed · {matchup.confidence}, not a predicted win rate</span></p>
          ))}
          <details className="intervention-learning-readout">
            <summary>
              CONTINUAL FORGE LEARNING · {interventionLearning.experiments.length} EXPERIMENT{interventionLearning.experiments.length === 1 ? "" : "S"}
            </summary>
            <p>
              <b>{interventionLearning.reusable.length ? `${interventionLearning.reusable.length} reusable player pattern${interventionLearning.reusable.length === 1 ? "" : "s"}` : "NO INTERVENTION PROMOTED YET"}</b>
              <span>{interventionLearning.reusableGuidance}</span>
            </p>
            <small>{interventionLearning.evidenceBoundary}</small>
          </details>
        </section>
      )}

      {hoveredCard && (
        <aside className="research-card-preview" role="complementary" aria-label={`Preview of ${hoveredCard}`}>
          <header>
            <strong>{hoveredCard}</strong>
            <button type="button" onClick={() => setHoveredCard("")} aria-label="Close preview">×</button>
          </header>
          {hoveredImage && <img src={hoveredImage} alt={`${hoveredCard} card art`} />}
        </aside>
      )}
    </main>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={null}>
      <ResearchPageInner />
    </Suspense>
  );
}
