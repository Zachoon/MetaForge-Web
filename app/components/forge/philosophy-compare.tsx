"use client";

import { useMemo, useState } from "react";
import { presentPhilosophyComparison } from "../../philosophy-presentation.mjs";
import { ForgeCardRef } from "../../forge-card-ref";

type PhilosophyCompareProps = {
  builds: Parameters<typeof presentPhilosophyComparison>[0];
  decidedBy?: string | null;
  commanderName?: string;
  onChoose: (candidateId: string) => void;
  onInspectCard?: (name: string) => void;
};

function PhilosophyCard({
  build,
  featured = false,
  onChoose,
}: {
  build: ReturnType<typeof presentPhilosophyComparison>["all"][number];
  featured?: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <article
      className={`philosophy-card${featured || build.recommended ? " is-best-fit" : ""}${build.recommended ? " is-selected" : ""}${build.alternativeBecause ? " is-preference-alt" : ""}`}
      data-philosophy-id={build.id}
      data-decided-by={build.decidedBy || undefined}
    >
      <header>
        {(build.badge || build.recommended) && <em>{build.badge || "BEST FIT FOR YOU"}</em>}
        <strong>{build.label}</strong>
        {build.recommended && build.provenanceLabel && (
          <p className="philosophy-provenance">{build.provenanceLabel}</p>
        )}
        {build.recommended && build.recommendedBecause && (
          <p className="philosophy-recommended-because">{build.recommendedBecause}</p>
        )}
        {!build.recommended && build.alternativeBecause && (
          <p className="philosophy-alternative-because">{build.alternativeBecause}</p>
        )}
      </header>

      {build.commissionFit && (
        <p className="philosophy-commission-fit">
          <small>COMMISSION FIT</small>
          <b>{build.commissionFit.headline}</b>
          {build.commissionFit.detail ? <span>{build.commissionFit.detail}</span> : null}
        </p>
      )}

      <div className="philosophy-card-body">
        {build.whatThisFeelsLike && (
          <div>
            <small>FEELS LIKE</small>
            <p>{build.whatThisFeelsLike}</p>
          </div>
        )}
        {build.strengths.length > 0 && (
          <div>
            <small>STRONG AT</small>
            <ul>
              {build.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {build.playerFit && (
          <div>
            <small>{build.recommended ? "PLAYER FIT" : "YOUR USUAL PREFERENCES"}</small>
            <p>{build.playerFit}</p>
          </div>
        )}
        {build.expectedTradeoff && (
          <div className="philosophy-tradeoff">
            <small>TRADEOFF</small>
            <p>{build.expectedTradeoff}</p>
          </div>
        )}
        {build.whyNotTheAlternative && build.recommended && (
          <div>
            <small>WHY NOT THE ALTERNATIVE</small>
            <p>{build.whyNotTheAlternative}</p>
          </div>
        )}
        {build.alone && build.whyBuilt && (
          <div>
            <small>WHY THIS DIRECTION</small>
            <p>{build.whyBuilt}</p>
          </div>
        )}
      </div>

      <button type="button" onClick={() => onChoose(build.id)}>
        {build.alone ? "This is how I want to play →" : `Choose ${build.label}`}
      </button>
    </article>
  );
}

/**
 * Compact philosophy comparison surface. Consumes server presentation fields only.
 */
export function PhilosophyCompare({
  builds,
  decidedBy = null,
  commanderName = "",
  onChoose,
  onInspectCard,
}: PhilosophyCompareProps) {
  const comparison = useMemo(
    () => presentPhilosophyComparison(builds, { decidedBy }),
    [builds, decidedBy],
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const count = comparison.all.length;
  const compareLabel = count === 2 ? "Compare both" : "Compare all three";
  const title = count === 1
    ? "One experience made the cut. Confirm it fits you."
    : "Choose how you want this deck to play";
  const lede = count === 1
    ? "Before you open the deck — is this the experience you want with this commander?"
    : `${count} valid directions${commanderName ? ` for ${commanderName}` : ""}. Pick the experience you want.`;

  return (
    <section className="philosophy-compare" aria-label="Choose a philosophy" data-decided-by={comparison.decidedBy || undefined}>
      <header className="philosophy-compare-heading">
        <small>CHOOSE YOUR EXPERIENCE</small>
        <h2>{title}</h2>
        <p>{lede}</p>
        {comparison.provenanceLabel && count > 1 && (
          <p className="philosophy-report-provenance">{comparison.provenanceLabel}</p>
        )}
      </header>

      {comparison.recommended && (
        <div className="philosophy-recommended-first" aria-label="MetaForge recommended experience">
          <small>METAFORGE RECOMMENDS STARTING HERE</small>
          <PhilosophyCard build={comparison.recommended} featured onChoose={onChoose} />
        </div>
      )}

      {comparison.alternatives.length > 0 && (
        <div className="philosophy-alt-grid">
          {comparison.alternatives.map((build) => (
            <PhilosophyCard key={build.id} build={build} onChoose={onChoose} />
          ))}
        </div>
      )}

      {count > 1 && (
        <div className="philosophy-compare-toggle">
          <button type="button" className="is-quiet" onClick={() => setCompareOpen((open) => !open)}>
            {compareOpen ? "Hide comparison" : compareLabel}
          </button>
        </div>
      )}

      {compareOpen && count > 1 && (
        <div className="philosophy-side-by-side" role="region" aria-label="Side-by-side philosophy comparison">
          {comparison.all.map((build) => (
            <article
              key={`compare-${build.id}`}
              className={`${build.recommended ? "is-best-fit" : ""}${build.alternativeBecause ? " is-preference-alt" : ""}`.trim() || undefined}
            >
              <header>
                {build.recommended && <em>BEST FIT</em>}
                {!build.recommended && build.alternativeBecause && <em>CLOSER TO YOUR USUAL PLAY PREFERENCES</em>}
                <strong>{build.label}</strong>
              </header>
              <dl>
                <div>
                  <dt>Feels like</dt>
                  <dd>{build.whatThisFeelsLike || "—"}</dd>
                </div>
                <div>
                  <dt>Strong at</dt>
                  <dd>{build.strengths.join(" · ") || "—"}</dd>
                </div>
                <div>
                  <dt>Tradeoff</dt>
                  <dd>{build.expectedTradeoff || "—"}</dd>
                </div>
                <div>
                  <dt>Why this direction</dt>
                  <dd>
                    {build.recommended
                      ? (build.recommendedBecause || build.whyBuilt || "—")
                      : (build.alternativeBecause || build.playerFit || build.whyBuilt || "—")}
                  </dd>
                </div>
              </dl>
              {(build.keyDifferences?.adds?.length > 0 || build.keyDifferences?.cuts?.length > 0) && (
                <ul className="philosophy-key-diffs">
                  {(build.keyDifferences.adds || []).map((name: string) => (
                    <li key={`add-${build.id}-${name}`} className="add">
                      +{" "}
                      {onInspectCard ? (
                        <ForgeCardRef name={name} surface="philosophy-compare" onInspect={onInspectCard} />
                      ) : name}
                    </li>
                  ))}
                  {(build.keyDifferences.cuts || []).map((name: string) => (
                    <li key={`cut-${build.id}-${name}`} className="cut">
                      −{" "}
                      {onInspectCard ? (
                        <ForgeCardRef name={name} surface="philosophy-compare" onInspect={onInspectCard} />
                      ) : name}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => onChoose(build.id)}>
                Choose {build.label}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
