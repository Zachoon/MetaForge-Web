"use client";

import { useMemo } from "react";
import {
  presentDeepForgePrinciples,
  presentDeepForgeUnderstanding,
} from "../../deep-forge-presentation.mjs";

type DeepForgeDossierProps = {
  occupancyEngines?: string[];
  understanding?: any;
  principles?: any;
};

function ResearchDisclosure({
  label = "See the research evidence",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="deep-forge-research-disclosure">
      <summary>{label}</summary>
      <div className="deep-forge-research-body">{children}</div>
    </details>
  );
}

function PlayerInsightCard({ entry }: { entry: any }) {
  return (
    <article className={`deep-forge-insight is-${entry.state || "emerging"}`} data-entry-id={entry.id}>
      <header>
        <em>{entry.badge}</em>
        <h3>{entry.noticed}</h3>
      </header>
      <dl>
        <div>
          <dt>What that could mean for this deck</dt>
          <dd>{entry.meaning}</dd>
        </div>
        <div>
          <dt>How confident we are</dt>
          <dd>{entry.confidence}</dd>
        </div>
        <div>
          <dt>What would prove this wrong</dt>
          <dd>{(entry.proveWrong || []).join(" · ")}</dd>
        </div>
        {entry.evidenceSummary && (
          <div>
            <dt>Evidence available</dt>
            <dd>{entry.evidenceSummary}</dd>
          </div>
        )}
        {entry.implementations?.length > 0 && (
          <div>
            <dt>Often shows up as</dt>
            <dd>{entry.implementations.join(" · ")}</dd>
          </div>
        )}
      </dl>
      <ResearchDisclosure>
        {entry.research?.claim && <p><small>RAW CLAIM</small>{entry.research.claim}</p>}
        {entry.research?.name && <p><small>RAW NAME</small>{entry.research.name}</p>}
        {entry.research?.description && <p><small>RAW DESCRIPTION</small>{entry.research.description}</p>}
        {entry.research?.badgeTitle && <p><small>RESEARCH STATUS</small>{entry.research.badgeTitle}</p>}
        {entry.research?.confidence && (
          <p>
            <small>RAW CONFIDENCE</small>
            {entry.research.confidence.level || "unknown"}
            {Number.isFinite(entry.research.confidence.score)
              ? ` · score ${entry.research.confidence.score}`
              : ""}
          </p>
        )}
        {entry.research?.evidence && (
          <p>
            <small>SOURCES</small>
            Tournament {entry.research.evidence.tournament ?? "—"}
            {" · "}Experts {entry.research.evidence.experts ?? "—"}
            {" · "}Shadow {entry.research.evidence.shadow ?? "—"}
            {" · "}Simulation {entry.research.evidence.simulation ?? entry.research.evidence.fixtures ?? "—"}
          </p>
        )}
        {(entry.research?.notes || []).length > 0 && (
          <p><small>NOTES</small>{entry.research.notes.join(" · ")}</p>
        )}
        {entry.research?.prediction?.expectToObserve?.length > 0 && (
          <p>
            <small>PREDICTIONS ({entry.research.prediction.windowDays}d)</small>
            {entry.research.prediction.expectToObserve.join(" · ")}
          </p>
        )}
        {(entry.research?.retirementCriteria || []).length > 0 && (
          <p>
            <small>RETIREMENT CONDITIONS</small>
            {entry.research.retirementCriteria.join(" · ")}
          </p>
        )}
        {entry.research?.uniquenessAngle && (
          <p><small>UNIQUE ANGLE</small>{entry.research.uniquenessAngle}</p>
        )}
        <p>
          <small>BRAIN STATUS</small>
          {entry.research?.brainInheritance === "none" || !entry.research?.brainInheritance
            ? "Not changing how MetaForge builds decks"
            : String(entry.research.brainInheritance)}
        </p>
      </ResearchDisclosure>
    </article>
  );
}

/**
 * Deep Forge research dossier — player language default, raw evidence one click down.
 */
export function DeepForgeDossier({ occupancyEngines = [], understanding = null, principles = null }: DeepForgeDossierProps) {
  const playerUnderstanding = useMemo(
    () => presentDeepForgeUnderstanding(understanding),
    [understanding],
  );
  const playerPrinciples = useMemo(
    () => presentDeepForgePrinciples(principles),
    [principles],
  );

  if (!playerUnderstanding && !playerPrinciples && occupancyEngines.length === 0) return null;

  return (
    <div className="deep-forge-dossier" data-writes-to-brain="false">
      {occupancyEngines.length > 0 && (
        <p className="deep-forge-occupancy">
          Occupancy engines from commander oracle: {occupancyEngines.join(" · ")}. That is not Deep Forge research.
        </p>
      )}
      {playerUnderstanding && (
        <section className="deep-forge-player-panel" aria-label="What MetaForge noticed">
          <header>
            <small>DEEP FORGE · PLAYER READ</small>
            <b>{playerUnderstanding.title}</b>
            <em>{playerUnderstanding.note}</em>
          </header>
          {playerUnderstanding.entries.map((entry: any) => (
            <PlayerInsightCard key={entry.id} entry={entry} />
          ))}
          {playerUnderstanding.retiredEntries?.length > 0 && (
            <div className="deep-forge-retired-player">
              <small>RETIRED IDEAS · STILL VISIBLE</small>
              {playerUnderstanding.retiredEntries.map((entry: any) => (
                <details key={entry.id} className="deep-forge-retired-card">
                  <summary>
                    <em>{entry.badge}</em> {entry.noticed}
                  </summary>
                  <p><small>WHY WE BELIEVED IT</small>{(entry.whyBelieved || []).join(" · ") || "—"}</p>
                  <p><small>WHY WE NO LONGER DO</small>{(entry.whyRetired || []).join(" · ") || "—"}</p>
                  <ResearchDisclosure label="See the retired research record">
                    <p><small>RAW CLAIM</small>{entry.research?.claim || "—"}</p>
                    <p><small>WHY BELIEVED</small>{(entry.research?.whyBelieved || []).join(" · ") || "—"}</p>
                    <p><small>WHY RETIRED</small>{(entry.research?.whyRetired || []).join(" · ") || "—"}</p>
                  </ResearchDisclosure>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {playerPrinciples && (
        <section className="deep-forge-player-panel deep-forge-principles-panel" aria-label="Principles MetaForge is watching">
          <header>
            <small>DEEP FORGE · PRINCIPLES</small>
            <b>{playerPrinciples.title}</b>
            <em>{playerPrinciples.note}</em>
          </header>
          {playerPrinciples.entries.map((entry: any) => (
            <PlayerInsightCard key={entry.id} entry={entry} />
          ))}
        </section>
      )}
    </div>
  );
}
