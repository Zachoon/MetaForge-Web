"use client";

import { useEffect, useMemo, useState } from "react";
import "./masterwork-forge.css";

const PAGE_SIZE = 3;

type CandidateCard = {
  quantity: number;
  card: string;
  role?: string;
};

export type ForgeMasterworkCandidate = {
  name: string;
  format: string;
  strategy: string;
  strategyPlan?: string;
  target?: string;
  rank?: number;
  rankScore?: number;
  novelty?: number;
  coherence?: number;
  reasoning?: string;
  warnings?: string[];
  deckText: string;
  sideboardText: string;
  deck?: CandidateCard[];
  sideboard?: CandidateCard[];
  scoreBreakdown?: {
    roleQuality?: number;
    novelty?: number;
    coherence?: number;
    matchupFit?: number;
    historicalFit?: number;
    curvePenalty?: number;
  };
};

type MasterworkForgeProps = {
  candidates: ForgeMasterworkCandidate[];
  evaluatedCandidates?: number;
  busy?: boolean;
  onInspect: (candidate: ForgeMasterworkCandidate) => void;
  onChoose: (candidate: ForgeMasterworkCandidate) => void | Promise<void>;
  onDecline?: (candidate: ForgeMasterworkCandidate) => void;
  onNewCommission: () => void;
  onReturnEntrance: () => void;
};

type MasterworkIdentity = {
  title: string;
  subtitle: string;
  playstyle: string;
  enjoyIf: string;
  verdict: string;
  rune: string;
  tone: "ember" | "steel" | "rune";
};

const STRATEGY_IDENTITIES: Record<string, MasterworkIdentity> = {
  aggro: {
    title: "The Ember Vanguard",
    subtitle: "Aggressive Pressure",
    playstyle:
      "Seize the initiative immediately, force awkward blocks, and convert every point of tempo into damage.",
    enjoyIf:
      "You like setting the pace and making the opponent prove they can survive the opening assault.",
    verdict:
      "The fastest surviving design. Its edge was preserved without sacrificing the ability to recover.",
    rune: "ᚠ",
    tone: "ember",
  },
  aggressive: {
    title: "The Ember Vanguard",
    subtitle: "Aggressive Pressure",
    playstyle:
      "Seize the initiative immediately, force awkward blocks, and convert every point of tempo into damage.",
    enjoyIf:
      "You like setting the pace and making the opponent prove they can survive the opening assault.",
    verdict:
      "The fastest surviving design. Its edge was preserved without sacrificing the ability to recover.",
    rune: "ᚠ",
    tone: "ember",
  },
  tempo: {
    title: "The Stormbrand Edge",
    subtitle: "Tempo Pressure",
    playstyle:
      "Develop a threat, protect the advantage, and keep the opponent one step behind for the entire battle.",
    enjoyIf:
      "You enjoy sequencing, flexible interaction, and turning tiny advantages into an impossible chase.",
    verdict:
      "The sharpest masterwork. It rewards timing and punishes every stumble without becoming reckless.",
    rune: "ᚱ",
    tone: "rune",
  },
  midrange: {
    title: "The Iron Covenant",
    subtitle: "Adaptive Midrange",
    playstyle:
      "Trade efficiently, pressure when the path opens, and win through resilient threats that remain useful at every stage.",
    enjoyIf:
      "You want flexibility, meaningful decisions, and a plan that can change shape as the game develops.",
    verdict:
      "The most balanced masterwork. No single edge defines it; its strength is refusing to become irrelevant.",
    rune: "ᛉ",
    tone: "steel",
  },
  control: {
    title: "The Rune Bastion",
    subtitle: "Measured Control",
    playstyle:
      "Absorb the opponent’s strongest turns, dismantle their resources, and take command once their momentum is broken.",
    enjoyIf:
      "You enjoy patience, permission, precise answers, and winning after the opponent has exhausted their best ideas.",
    verdict:
      "The most defensible design. It survived by answering the widest range of opposing plans.",
    rune: "ᛏ",
    tone: "rune",
  },
  combo: {
    title: "The Arcane Crucible",
    subtitle: "Engine Combo",
    playstyle:
      "Assemble connected pieces, protect the critical turn, and transform careful preparation into a decisive finish.",
    enjoyIf:
      "You like discovering hidden lines, planning several turns ahead, and winning through a machine you assembled yourself.",
    verdict:
      "The most intricate masterwork. Every retained piece serves the engine, and every cut protects its purpose.",
    rune: "ᛞ",
    tone: "rune",
  },
};

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function candidateIdentity(candidate: ForgeMasterworkCandidate) {
  const key = candidate.strategy.trim().toLowerCase();

  return (
    STRATEGY_IDENTITIES[key] ?? {
      title: candidate.name.replace(/^Forge Prototype\s*·\s*/i, ""),
      subtitle: candidate.strategy,
      playstyle:
        candidate.strategyPlan ??
        "Advance a coherent game plan while preserving enough flexibility to answer resistance.",
      enjoyIf:
        "You enjoy a focused deck with clear decisions, meaningful tradeoffs, and room to master its lines.",
      verdict:
        candidate.reasoning ??
        "This design survived the Forge’s strategic, structural, and experiential inspection.",
      rune: "ᛟ",
      tone: "steel" as const,
    }
  );
}

function candidateMetrics(candidate: ForgeMasterworkCandidate) {
  const strategy = candidate.strategy.toLowerCase();
  const roleQuality = candidate.scoreBreakdown?.roleQuality ?? 20;
  const novelty = candidate.novelty ?? 0.5;
  const coherence = candidate.coherence ?? 0.7;
  const matchupFit = candidate.scoreBreakdown?.matchupFit ?? 5;

  const aggression =
    strategy.includes("aggro") || strategy.includes("tempo")
      ? 78 + matchupFit * 2
      : strategy.includes("midrange")
        ? 66
        : strategy.includes("control")
          ? 28
          : 58;

  const interaction =
    strategy.includes("control")
      ? 92
      : strategy.includes("tempo")
        ? 82
        : strategy.includes("midrange")
          ? 74
          : 48;

  const synergy = coherence * 100;
  const complexity =
    strategy.includes("control") || strategy.includes("combo")
      ? 84
      : strategy.includes("tempo")
        ? 74
        : strategy.includes("midrange")
          ? 65
          : 46;

  const rating =
    candidate.rankScore !== undefined
      ? clamp(74 + candidate.rankScore / 3.2, 78, 97)
      : clamp(74 + roleQuality / 2 + novelty * 8, 78, 97);

  return {
    aggression: clamp(aggression),
    interaction: clamp(interaction),
    synergy: clamp(synergy),
    complexity: clamp(complexity),
    rating,
  };
}

function displayCandidateName(candidate: ForgeMasterworkCandidate) {
  return candidate.name.replace(/^Forge Prototype\s*·\s*/i, "");
}

export default function MasterworkForge({
  candidates,
  evaluatedCandidates = 642,
  busy = false,
  onInspect,
  onChoose,
  onDecline,
  onNewCommission,
  onReturnEntrance,
}: MasterworkForgeProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [revealKey, setRevealKey] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [declinedNames, setDeclinedNames] = useState<string[]>([]);
  const [forging, setForging] = useState(true);

  const availableCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) => !declinedNames.includes(candidate.name),
      ),
    [candidates, declinedNames],
  );

  const pageCount = Math.max(
    1,
    Math.ceil(availableCandidates.length / PAGE_SIZE),
  );

  const visibleCandidates = useMemo(() => {
    const safePage = Math.min(pageIndex, pageCount - 1);
    const start = safePage * PAGE_SIZE;

    return availableCandidates.slice(start, start + PAGE_SIZE);
  }, [availableCandidates, pageIndex, pageCount]);

  const firstRank = pageIndex * PAGE_SIZE + 1;
  const lastRank = firstRank + visibleCandidates.length - 1;

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setForging(true);

    const timer = window.setTimeout(() => {
      setForging(false);
    }, 1180);

    return () => window.clearTimeout(timer);
  }, [revealKey]);

  function changePage(nextPage: number) {
    if (nextPage < 0 || nextPage >= pageCount || forging) {
      return;
    }

    setSelectedName(null);
    setForging(true);

    window.setTimeout(() => {
      setPageIndex(nextPage);
      setRevealKey((current) => current + 1);
    }, 260);
  }

  function declineCandidate(candidate: ForgeMasterworkCandidate) {
    setDeclinedNames((current) =>
      current.includes(candidate.name)
        ? current
        : [...current, candidate.name],
    );

    setSelectedName(null);
    onDecline?.(candidate);

    window.setTimeout(() => {
      setRevealKey((current) => current + 1);
    }, 80);
  }

  function beginAgain() {
    setPageIndex(0);
    setSelectedName(null);
    setDeclinedNames([]);
    setRevealKey((current) => current + 1);
    onNewCommission();
  }

  return (
    <section
      className={`masterwork-chamber ${forging ? "is-forging" : "is-revealed"}`}
      aria-labelledby="masterwork-title"
    >
      <div className="masterwork-furnace-sky" aria-hidden="true">
        <span className="masterwork-halo" />
        <span className="masterwork-rune-ring rune-ring-one">ᚠ ᚱ ᛉ ᛏ</span>
        <span className="masterwork-rune-ring rune-ring-two">ᛞ ᛟ ᚢ ᚦ</span>
        <span className="masterwork-anvil-spark spark-one" />
        <span className="masterwork-anvil-spark spark-two" />
        <span className="masterwork-anvil-spark spark-three" />
      </div>

      <header className="masterwork-heading">
        <span className="masterwork-overline">
          <i />
          The Great Forge Answers
          <i />
        </span>

        <h2 id="masterwork-title">
          Steel bends. Runes awaken.
          <em> Three designs endure.</em>
        </h2>

        <p>
          The Forge evaluated{" "}
          <strong>{evaluatedCandidates.toLocaleString()}</strong> candidate
          structures. These masterworks remained after strategic, structural,
          and experiential inspection.
        </p>
      </header>

      <div className="masterwork-forging-veil" aria-live="polite">
        <div className="masterwork-anvil">
          <span className="anvil-rune">ᛟ</span>
          <i className="anvil-strike" />
          <b>FORGING THE NEXT THREE</b>
          <small>
            Testing structure, identity, resilience, and player fit
          </small>
        </div>
      </div>

      {visibleCandidates.length > 0 ? (
        <div
          className="masterwork-grid"
          key={`${pageIndex}-${revealKey}`}
        >
          {visibleCandidates.map((candidate, index) => {
            const identity = candidateIdentity(candidate);
            const metrics = candidateMetrics(candidate);
            const rank = firstRank + index;
            const selected = selectedName === candidate.name;

            return (
              <article
                className={`masterwork-card masterwork-${identity.tone} ${
                  selected ? "is-selected" : ""
                }`}
                key={candidate.name}
                style={
                  {
                    "--masterwork-index": index,
                  } as React.CSSProperties
                }
              >
                <div className="masterwork-card-light" aria-hidden="true" />

                <div className="masterwork-card-rune" aria-hidden="true">
                  {identity.rune}
                </div>

                <div className="masterwork-card-top">
                  <span>Masterwork {rank}</span>
                  <b>Forge Rating {metrics.rating}</b>
                </div>

                <h3>{identity.title}</h3>

                <div className="masterwork-identity">
                  <strong>{identity.subtitle}</strong>
                  <span>{candidate.format}</span>
                </div>

                <p className="masterwork-source-name">
                  Forged as: {displayCandidateName(candidate)}
                </p>

                <div className="masterwork-story">
                  <section>
                    <small>How this masterwork fights</small>
                    <p>{identity.playstyle}</p>
                  </section>

                  <section>
                    <small>You will enjoy this if</small>
                    <p>{identity.enjoyIf}</p>
                  </section>

                  <section>
                    <small>Why the Forge believes it will endure</small>
                    <p className="masterwork-verdict">
                      {identity.verdict}
                    </p>
                  </section>
                </div>

                <div
                  className="masterwork-metrics"
                  aria-label={`${identity.title} characteristics`}
                >
                  <Metric
                    label="Aggression"
                    value={metrics.aggression}
                  />
                  <Metric
                    label="Interaction"
                    value={metrics.interaction}
                  />
                  <Metric label="Synergy" value={metrics.synergy} />
                  <Metric
                    label="Complexity"
                    value={metrics.complexity}
                  />
                </div>

                <div className="masterwork-card-actions">
                  <button
                    className="masterwork-inspect"
                    type="button"
                    onClick={() => {
                      setSelectedName(candidate.name);
                      onInspect(candidate);
                    }}
                  >
                    <span>Inspect Masterwork</span>
                    <b aria-hidden="true">⌁</b>
                  </button>

                  <button
                    className="masterwork-choose"
                    type="button"
                    disabled={busy}
                    onClick={() => onChoose(candidate)}
                  >
                    <span>
                      {busy && selected
                        ? "Preparing Masterwork…"
                        : "Choose This Masterwork"}
                    </span>
                    <b aria-hidden="true">→</b>
                  </button>

                  <button
                    className="masterwork-decline"
                    type="button"
                    onClick={() => declineCandidate(candidate)}
                  >
                    Not my starter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="masterwork-empty">
          <span>ᛟ</span>
          <h3>No surviving designs remain in this commission.</h3>
          <p>
            Begin a fresh commission to restore the candidate pool and forge
            three new paths.
          </p>
          <button type="button" onClick={beginAgain}>
            Begin a New Commission
          </button>
        </div>
      )}

      <footer className="masterwork-navigation">
        <div className="masterwork-navigation-side">
          <button
            type="button"
            disabled={pageIndex === 0 || forging}
            onClick={() => changePage(pageIndex - 1)}
          >
            <span aria-hidden="true">←</span>
            Previous Three
          </button>

          <button type="button" onClick={onReturnEntrance}>
            Return to the Forge Entrance
          </button>
        </div>

        <div className="masterwork-page-status">
          <span>Masterworks {firstRank}–{Math.max(firstRank, lastRank)}</span>
          <i />
          <span>Set {pageIndex + 1} of {pageCount}</span>
        </div>

        <div className="masterwork-navigation-side align-right">
          <button
            className="masterwork-next"
            type="button"
            disabled={pageIndex >= pageCount - 1 || forging}
            onClick={() => changePage(pageIndex + 1)}
          >
            Reveal the Next Three
            <span aria-hidden="true">→</span>
          </button>

          <button type="button" onClick={beginAgain}>
            Begin a New Commission
          </button>
        </div>
      </footer>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="masterwork-metric">
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>

      <i aria-hidden="true">
        <b style={{ width: `${value}%` }} />
      </i>
    </div>
  );
}
