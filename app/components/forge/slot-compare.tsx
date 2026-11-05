"use client";

import { cardImage } from "../../card-art";
import type { ComparedCard, OwnPickComparison, SlotComparison } from "../../forge-session-context";
import { ManaText } from "../mana-symbols";
import { ColorIdentityChips, ForgeProp } from "../tripo-assets";

const FACTORS: Array<{ key: "roleFit" | "synergy" | "manaEfficiency" | "gapFilled" | "bracketImpact"; label: string }> = [
  { key: "roleFit", label: "Role fit" },
  { key: "synergy", label: "Synergy" },
  { key: "manaEfficiency", label: "Mana efficiency" },
  { key: "gapFilled", label: "Gap filled" },
  { key: "bracketImpact", label: "Bracket impact" },
];

function formatScore(value: number) {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : String(value);
}

function CardFace({ card, picked = false }: { card: ComparedCard; picked?: boolean }) {
  const price = card.priceUsd;
  return (
    <article className={`slot-card${card.place === 1 ? " leading" : ""}${picked ? " picked" : ""}`}>
      <img
        className="slot-card-art"
        src={cardImage(card.name)}
        alt={card.name}
        data-card-name={card.name}
        {...(price != null ? { "data-card-price": String(price) } : {})}
        loading="lazy"
      />
      <header>
        <small>{card.place === 1 ? "Ranks first" : `Ranks ${card.place}`}</small>
        <h3 data-card-name={card.name}>{card.name}</h3>
        <ColorIdentityChips colors={card.colorIdentity || []} />
        <em>
          {card.manaCost ? <ManaText text={card.manaCost} /> : "No mana cost"}
          {card.role ? ` · ${card.role}` : ""}
        </em>
        <b>Engine score {formatScore(card.rank)}</b>
        {price != null && <span className="slot-card-price">${price.toFixed(2)}</span>}
        {card.factors.powerSignal && <span className="slot-card-signal">{card.factors.powerSignal}</span>}
      </header>
      {card.pros.length > 0 && (
        <ul className="slot-pros" aria-label={`Strengths of ${card.name}`}>
          {card.pros.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
      {card.cons.length > 0 && (
        <ul className="slot-cons" aria-label={`Costs of ${card.name}`}>
          {card.cons.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
    </article>
  );
}

export function RunnerUpPanel({
  comparison,
  disabled,
  onTake,
}: {
  comparison: SlotComparison;
  disabled: boolean;
  onTake: (name: string) => void;
}) {
  if (!comparison?.runnerUp) return null;
  return (
    <section className="slot-compare" aria-label="Pick compared with the runner-up">
      <header className="slot-compare-head">
        <ForgeProp kind="tome" size={32} />
        <div>
          <small>THIS SLOT</small>
          <p>{comparison.sharedSlot}</p>
        </div>
      </header>
      <div className="slot-compare-cards">
        <CardFace card={comparison.winner} />
        <CardFace card={comparison.runnerUp} />
      </div>
      {comparison.winnerReasons.length > 0 && (
        <div>
          <small>WHY {comparison.winner.name.toUpperCase()} RANKS HIGHER</small>
          <ul className="slot-reasons">
            {comparison.winnerReasons.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}
      <button type="button" className="slot-take" disabled={disabled} onClick={() => onTake(comparison.runnerUp.name)}>
        Take this one instead
      </button>
    </section>
  );
}

export function OwnPickPanel({ comparison }: { comparison: OwnPickComparison }) {
  if (!comparison?.ranked?.length) return null;
  const cards = comparison.ranked;
  return (
    <section className="slot-compare own-pick" aria-label="Your pick ranked against the top two">
      <header className="slot-compare-head">
        <ForgeProp kind="hammer" size={32} />
        <div>
          <small>YOUR PICK IS IN THE DECK</small>
          <p>{comparison.addedName} was added. Here is how the engine ranks it against the top two for this slot.</p>
        </div>
      </header>
      {comparison.differentRole && <p className="slot-different-role">{comparison.differentRole}</p>}
      <div className="slot-compare-cards three">
        {cards.map((card) => <CardFace key={card.name} card={card} picked={Boolean(card.picked)} />)}
      </div>
      <table className="slot-factors">
        <caption>Ranking factors from the slot delta. The engine score above also includes card quality and the reasoning nudge.</caption>
        <thead>
          <tr>
            <th scope="col">Factor</th>
            {cards.map((card) => <th key={card.name} scope="col">{card.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {FACTORS.map((factor) => (
            <tr key={factor.key}>
              <th scope="row">{factor.label}</th>
              {cards.map((card) => (
                <td key={card.name}>
                  {formatScore(card.factors[factor.key])}
                  {factor.key === "bracketImpact" && card.factors.powerSignal ? ` · ${card.factors.powerSignal}` : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
