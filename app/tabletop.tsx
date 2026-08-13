"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMatchupCardAdvice as getMatchupCardAdviceBase,
  MATCHUP_GUIDANCE,
  MATCHUP_ROLES,
} from "./tabletop-matchup.mjs";

export type TabletopCard = {
  name: string;
  quantity: number;
  role: string;
  image: string;
  /** null when catalog hydration has type/role but no verified mana value yet */
  cmc: number | null;
};

export type TabletopEdge = { from: string; to: string; signals?: string[] };

export type Matchup = "Aggro" | "Control" | "Combo" | "Midrange";

export type MatchupCardAdvice = {
  matchup: Matchup;
  cardName: string;
  role: string;
  priority: boolean;
  verdict: string;
  change: string;
  why: string;
};

export function getMatchupCardAdvice(args: {
  matchup: Matchup;
  role?: string | null;
  cardName?: string;
}): MatchupCardAdvice {
  return getMatchupCardAdviceBase(args) as MatchupCardAdvice;
}

export { MATCHUP_GUIDANCE, MATCHUP_ROLES };

type Lens = "packages" | "hand" | "turns" | "matchup";

type TabletopProps = {
  cards: TabletopCard[];
  edges: TabletopEdge[];
  previousCardNames: string[];
  activeCard: string;
  onSelectCard: (name: string) => void;
  onOpenList: () => void;
  /** Reports matchup coaching for the active card, or null when not on Matchup lens. */
  onMatchupContext?: (context: MatchupCardAdvice | null) => void;
};

const ROLE_ORDER = ["Commander", "Mana source", "Acceleration", "Card advantage", "Interaction", "Protection", "Engine piece", "Board reset", "Threat", "Utility"];

function seededHand(cards: TabletopCard[], salt = 0) {
  const pool = cards.flatMap((card) => Array.from({ length: Math.min(card.quantity, 20) }, () => card));
  return pool
    .map((card, index) => ({ card, score: Math.sin((index + 1) * 999 + salt * 17) * 10000 % 1 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 7)
    .map((entry) => entry.card);
}

function CardTile({ card, active, related, ghost, emphasized, showQuantity = true, onSelect }: { card: TabletopCard; active: boolean; related: boolean; ghost: boolean; emphasized: boolean; showQuantity?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={["tabletop-card", active && "active", related && "related", ghost && "revision-new", emphasized && "emphasized"].filter(Boolean).join(" ")}
      onClick={onSelect}
      aria-pressed={active}
      title={`${card.name} · ${card.role}`}
    >
      {card.image ? <img src={card.image} alt="" loading="lazy" /> : <span className="tabletop-card-fallback">{card.name.slice(0, 1)}</span>}
      {showQuantity && card.quantity > 1 ? <i>×{card.quantity}</i> : null}
      <strong>{card.name}</strong>
    </button>
  );
}

export function Tabletop({
  cards,
  edges,
  previousCardNames,
  activeCard,
  onSelectCard,
  onOpenList,
  onMatchupContext,
}: TabletopProps) {
  const [lens, setLens] = useState<Lens>("hand");
  const [matchup, setMatchup] = useState<Matchup>("Aggro");
  const [handSalt, setHandSalt] = useState(1);
  const [showRevision, setShowRevision] = useState(false);
  const previous = useMemo(() => new Set(previousCardNames.map((name) => name.toLowerCase())), [previousCardNames]);
  const relatedNames = useMemo(() => new Set(edges.flatMap((edge) => (edge.from === activeCard ? [edge.to] : edge.to === activeCard ? [edge.from] : []))), [activeCard, edges]);
  const activeEdges = edges.filter((edge) => edge.from === activeCard || edge.to === activeCard).slice(0, 5);
  const removedCards = [...previous].filter((name) => !cards.some((card) => card.name.toLowerCase() === name));
  const zones = useMemo(() => {
    const grouped = new Map<string, TabletopCard[]>();
    cards.forEach((card) => grouped.set(card.role, [...(grouped.get(card.role) || []), card]));
    return [...grouped.entries()].sort(([a], [b]) => {
      const ai = ROLE_ORDER.indexOf(a);
      const bi = ROLE_ORDER.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [cards]);
  const hand = useMemo(() => seededHand(cards, handSalt), [cards, handSalt]);
  const matchupGuidance = MATCHUP_GUIDANCE[matchup];
  const activeTabletopCard = useMemo(
    () => cards.find((card) => card.name === activeCard) || null,
    [activeCard, cards],
  );
  const selectedMatchupAdvice = useMemo(() => {
    if (lens !== "matchup" || !activeTabletopCard) return null;
    return getMatchupCardAdvice({
      matchup,
      role: activeTabletopCard.role,
      cardName: activeTabletopCard.name,
    });
  }, [activeTabletopCard, lens, matchup]);

  useEffect(() => {
    onMatchupContext?.(selectedMatchupAdvice);
    return () => {
      onMatchupContext?.(null);
    };
  }, [selectedMatchupAdvice, onMatchupContext]);

  const knownCmc = (card: TabletopCard) => typeof card.cmc === "number" && Number.isFinite(card.cmc);
  const turns = [
    { label: "TURN 1", cards: cards.filter((card) => knownCmc(card) && (card.cmc as number) <= 1 && card.role !== "Mana source") },
    { label: "TURN 2", cards: cards.filter((card) => knownCmc(card) && (card.cmc as number) > 1 && (card.cmc as number) <= 2) },
    { label: "TURN 3", cards: cards.filter((card) => knownCmc(card) && (card.cmc as number) > 2 && (card.cmc as number) <= 3) },
    { label: "TURN 4", cards: cards.filter((card) => knownCmc(card) && (card.cmc as number) > 3 && (card.cmc as number) <= 4) },
    { label: "TURN 5+", cards: cards.filter((card) => knownCmc(card) && (card.cmc as number) > 4) },
    { label: "CMC UNKNOWN", cards: cards.filter((card) => !knownCmc(card) && card.role !== "Mana source") },
  ].filter((turn) => turn.label !== "CMC UNKNOWN" || turn.cards.length > 0);

  const tile = (card: TabletopCard, showQuantity = true) => (
    <CardTile
      key={card.name}
      card={card}
      active={card.name === activeCard}
      related={relatedNames.has(card.name)}
      ghost={showRevision && previous.size > 0 && !previous.has(card.name.toLowerCase())}
      emphasized={lens !== "matchup" || MATCHUP_ROLES[matchup].includes(card.role)}
      showQuantity={showQuantity}
      onSelect={() => onSelectCard(card.name)}
    />
  );

  return (
    <section className={`tabletop-surface lens-${lens}`} aria-label="Interactive deck tabletop">
      <header className="tabletop-toolbar">
        <div>
          <small>THE TABLETOP</small>
          <strong>See how the deck holds together.</strong>
        </div>
        <nav aria-label="Tabletop lens">
          {(["packages", "hand", "turns", "matchup"] as Lens[]).map((item) => (
            <button type="button" key={item} className={lens === item ? "active" : ""} onClick={() => setLens(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="tabletop-toolbar-actions">
          {previous.size > 0 && (
            <button type="button" className={showRevision ? "active" : ""} aria-pressed={showRevision} onClick={() => setShowRevision((value) => !value)}>
              Revision ghost
            </button>
          )}
          <button type="button" className="tabletop-list-action" onClick={onOpenList}>
            Text list →
          </button>
        </div>
      </header>

      {activeCard && (
        <aside className="tabletop-threads">
          <small>
            {activeEdges.length
              ? `${activeEdges.length} LIVE CONNECTION${activeEdges.length === 1 ? "" : "S"}`
              : "NO VERIFIED CONNECTIONS"}
          </small>
          {activeEdges.map((edge) => (
            <button type="button" key={`${edge.from}-${edge.to}`} onClick={() => onSelectCard(edge.from === activeCard ? edge.to : edge.from)}>
              <i />
              {edge.from === activeCard ? edge.to : edge.from}
              <span>{edge.signals?.slice(0, 2).join(" + ")}</span>
            </button>
          ))}
        </aside>
      )}

      {lens === "packages" && (
        <div className="tabletop-zones">
          {zones.map(([role, roleCards]) => (
            <section key={role} className="tabletop-zone">
              <header>
                <strong>{role}</strong>
                <span>{roleCards.reduce((sum, card) => sum + card.quantity, 0)}</span>
              </header>
              <div>{roleCards.map(tile)}</div>
            </section>
          ))}
        </div>
      )}

      {lens === "hand" && (
        <div className="tabletop-hand">
          <header>
            <span>
              <small>OPENING SEVEN</small>
              <strong>Would you keep this hand?</strong>
            </span>
            <button type="button" onClick={() => setHandSalt((value) => value + 1)}>
              Draw another seven ↻
            </button>
          </header>
          <div>
            {hand.map((card, index) => (
              <div key={`${card.name}-${index}`}>{tile(card, false)}</div>
            ))}
          </div>
          <footer>
            <span>{hand.filter((card) => card.role === "Mana source").length} mana sources</span>
            <span>{hand.filter((card) => knownCmc(card) && (card.cmc as number) <= 2 && card.role !== "Mana source").length} early plays</span>
            <span>{hand.filter((card) => ["Interaction", "Protection"].includes(card.role)).length} responses</span>
          </footer>
        </div>
      )}

      {lens === "turns" && (
        <div className="tabletop-turns">
          {turns.map((turn) => (
            <section key={turn.label}>
              <header>
                <small>{turn.label}</small>
                <strong>{turn.cards.length} options</strong>
              </header>
              <div>{turn.cards.slice(0, 12).map(tile)}</div>
            </section>
          ))}
        </div>
      )}

      {lens === "matchup" && (
        <div className="tabletop-matchup">
          <nav>
            {(Object.keys(MATCHUP_ROLES) as Matchup[]).map((item) => (
              <button type="button" key={item} className={matchup === item ? "active" : ""} onClick={() => setMatchup(item)}>
                {item}
              </button>
            ))}
          </nav>
          <section className="tabletop-matchup-guide">
            <header>
              <small>YOUR JOB VS. {matchup.toUpperCase()}</small>
              <strong>{matchupGuidance.goal}</strong>
              <p>{matchupGuidance.watchFor}</p>
            </header>
            <div className="tabletop-matchup-roles" aria-label={`How to use priority cards against ${matchup}`}>
              {MATCHUP_ROLES[matchup].map((role) => (
                <article key={role}>
                  <strong>{role}</strong>
                  <span>{matchupGuidance.roles[role]}</span>
                </article>
              ))}
            </div>
            <p className="tabletop-matchup-key">
              <i /> Bright cards are priority tools for this job. Dim cards are secondary this matchup — still useful, not the focus for this seat. Teal outlines are connections to your selection, not “play now.”
            </p>
          </section>

          {selectedMatchupAdvice && (
            <aside
              className={`tabletop-matchup-card-coach${selectedMatchupAdvice.priority ? " is-priority" : " is-secondary"}`}
              aria-label={`How to use ${selectedMatchupAdvice.cardName} against ${matchup}`}
            >
              <header>
                <small>VS {matchup.toUpperCase()} · {selectedMatchupAdvice.cardName}</small>
                <strong>{selectedMatchupAdvice.role}</strong>
              </header>
              <div className="tabletop-matchup-beats">
                <p>
                  <small>VERDICT</small>
                  {selectedMatchupAdvice.verdict}
                </p>
                <p>
                  <small>CHANGE</small>
                  {selectedMatchupAdvice.change}
                </p>
                <p>
                  <small>WHY</small>
                  {selectedMatchupAdvice.why}
                </p>
              </div>
            </aside>
          )}

          {!selectedMatchupAdvice && (
            <p className="tabletop-matchup-select-prompt" role="status">
              Select a bright card to learn whether to play it early, hold it, or protect something with it.
            </p>
          )}

          <div className="tabletop-matchup-cards">{cards.slice(0, 48).map(tile)}</div>
        </div>
      )}

      {showRevision && removedCards.length > 0 && (
        <aside className="tabletop-removed">
          <small>REMOVED SINCE THE PREVIOUS REVISION</small>
          {removedCards.slice(0, 10).map((name) => (
            <span key={name}>− {name}</span>
          ))}
        </aside>
      )}
      <footer className={`tabletop-legend${lens === "matchup" ? " is-matchup" : ""}`}>
        {lens === "matchup" ? (
          <>
            <span>
              <i className="priority" /> Priority tools for this job
            </span>
            <span>
              <i className="secondary" /> Secondary this matchup
            </span>
            <span>
              <i className="link" /> Connections to selection
            </span>
          </>
        ) : (
          <>
            <span>
              <i className="new" /> New this revision
            </span>
            <span>
              <i className="link" /> Connected to selection
            </span>
          </>
        )}
      </footer>
    </section>
  );
}
