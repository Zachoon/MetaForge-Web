"use client";

import { useMemo } from "react";
import { commanderOracleText } from "../../commander-lane-scoring.mjs";
import { cardFactKey } from "../../deck-row-helpers";
import { isCommanderFormat } from "../../format-catalog";
import { buildManaBaseCoaching } from "../../mana-base-coach.mjs";
import type { CardFact, CommanderOption, DeckRow } from "../../forge-types";

type Face = { name?: string; oracle_text?: string; type_line?: string; mana_cost?: string };

function printedFact(fact?: CardFact | null) {
  const faces = (fact?.card_faces || []) as Face[];
  const oracle = String(fact?.oracle_text || faces.map((face) => face.oracle_text || "").filter(Boolean).join("\n"));
  const typeLine = String(fact?.type_line || faces.map((face) => face.type_line || "").filter(Boolean).join(" // "));
  const manaCost = String(fact?.mana_cost || faces.find((face) => face.mana_cost)?.mana_cost || "");
  return {
    oracle,
    typeLine,
    manaCost,
    cmc: fact?.cmc,
    colors: fact?.color_identity || [],
    cardFaces: faces.map((face) => ({
      name: face.name || "",
      oracleText: face.oracle_text || "",
      typeLine: face.type_line || "",
      manaCost: face.mana_cost || "",
    })),
    seen: Boolean(oracle || typeLine || manaCost || faces.length),
  };
}

function commanderEntry(commander: CommanderOption | null | undefined, facts: Record<string, CardFact | undefined>) {
  if (!commander?.name && !commanderOracleText(commander)) return null;
  const fact = commander?.name ? printedFact(facts[cardFactKey(commander.name)]) : printedFact(null);
  return {
    name: commander?.name || "",
    oracleText: commanderOracleText(commander) || fact.oracle,
    typeLine: commander?.typeLine || fact.typeLine,
    manaCost: fact.manaCost,
    cmc: fact.cmc,
    colorIdentity: commander?.colors?.length ? commander.colors : fact.colors,
  };
}

function statusWord(status: string) {
  if (status === "short") return "Short";
  if (status === "over") return "Heavy";
  if (status === "tight") return "Close";
  return "In range";
}

export function ManaBaseCoach({
  format,
  commander,
  secondCommander,
  rows,
  cardFacts,
  factsLoading,
}: {
  format: string;
  commander?: CommanderOption | null;
  secondCommander?: CommanderOption | null;
  rows: DeckRow[];
  cardFacts?: Record<string, CardFact | undefined> | null;
  factsLoading?: boolean;
}) {
  const facts = cardFacts || {};
  const cards = useMemo(() => rows.map((row) => {
    const fact = printedFact(facts[cardFactKey(row.name)]);
    return {
      name: row.name,
      quantity: row.quantity,
      oracleText: fact.oracle,
      typeLine: fact.typeLine,
      manaCost: fact.manaCost,
      cmc: fact.cmc,
      colorIdentity: fact.colors,
      cardFaces: fact.cardFaces,
    };
  }), [rows, facts]);
  const commanders = useMemo(() => [
    commanderEntry(commander, facts),
    commanderEntry(secondCommander, facts),
  ].filter(Boolean), [commander, secondCommander, facts]);
  const oracleReady = commanders.some((entry) => entry?.oracleText) || cards.some((card) => card.oracleText || card.typeLine || card.manaCost);

  const report = useMemo(() => {
    if (!isCommanderFormat(format)) return null;
    if (factsLoading && !oracleReady) return null;
    return buildManaBaseCoaching({
      commander: commanders[0] || undefined,
      commanders,
      cards,
    });
  }, [format, factsLoading, oracleReady, commanders, cards]);

  if (!isCommanderFormat(format)) return null;

  if (factsLoading && !oracleReady) {
    return (
      <section className="mana-base-coach" aria-label="Mana base coaching" aria-busy="true">
        <small>NATIVE COACH · MANA BASE</small>
        <p role="status">Reading printed mana text…</p>
      </section>
    );
  }

  if (!report?.readable) {
    return (
      <section className="mana-base-coach" aria-label="Mana base coaching">
        <small>NATIVE COACH · MANA BASE</small>
        <p>{report?.message || "Paste the decklist with printed mana costs and Oracle text."}</p>
      </section>
    );
  }

  return (
    <section className="mana-base-coach" aria-label="Mana base coaching">
      <header className="mana-base-head">
        <small>NATIVE COACH · MANA BASE</small>
        <h3>{report.commanderName ? `${report.commanderName} · lands and colors` : "Lands and colors"}</h3>
        <p>{report.summary}</p>
        <p className="mana-base-confidence">
          <span>Confidence</span>
          <strong>{report.confidence.level}</strong>
          <span>{report.confidence.reason}</span>
        </p>
        {factsLoading ? <p role="status">Still reading printed mana text for the remaining cards.</p> : null}
      </header>

      <div className="mana-base-block">
        <h4>Lands</h4>
        <p>{report.lands.summary}</p>
        <div className="mana-base-stats">
          <div data-status={report.lands.status}>
            <b>{report.lands.count}</b>
            <span>Lands</span>
            <small>{statusWord(report.lands.status)}. About {report.lands.targetLow}–{report.lands.targetHigh}.</small>
          </div>
          <div>
            <b>{report.lands.untapped}</b>
            <span>Untapped</span>
            <small>Can tap the turn they arrive.</small>
          </div>
          <div>
            <b>{report.lands.tapped}</b>
            <span>Enter tapped</span>
            <small>Not mana that turn.</small>
          </div>
          <div>
            <b>{report.lands.earlyRocks}</b>
            <span>Early ramp</span>
            <small>{report.lands.landRamp} land-ramp {report.lands.landRamp === 1 ? "spell" : "spells"}.</small>
          </div>
        </div>
      </div>

      {report.colors.length ? (
        <div className="mana-base-block">
          <h4>Colors by turn</h4>
          <ol className="mana-base-colors">
            {report.colors.map((color) => (
              <li key={color.color} data-status={color.status}>
                <span className="mana-base-swatch" data-color={color.color}>{color.word}</span>
                <p>{color.summary}</p>
                <small>
                  {color.detail || `${color.pips} pips.${color.spell ? ` ${color.untapped} untapped by turn ${color.turn}. About ${color.needed} wanted. ${statusWord(color.status)}.` : " No pips."}`}
                </small>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mana-base-lessons">
        {report.lessons.map((lesson) => (
          <article key={lesson.id}>
            <h4>{lesson.title}</h4>
            <p><span>Theory. </span>{lesson.theory}</p>
            {lesson.cards?.length ? (
              <p><span>Cards. </span>{lesson.cards.map((card) => (card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name)).join(", ")}.</p>
            ) : null}
            {lesson.quotes?.map((quote) => (
              <blockquote className="mana-base-quote" key={`${lesson.id}-${quote.name}`}>
                <b>{quote.quantity > 1 ? `${quote.quantity} ${quote.name}` : quote.name}</b>
                <span>“{quote.quote}”</span>
                {quote.says ? <p>{quote.says}</p> : null}
              </blockquote>
            ))}
            {lesson.excluded?.length ? (
              <p>
                <span>Not counted. </span>
                {lesson.excluded.map((card) => `${card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name} (${card.note})`).join("; ")}.
              </p>
            ) : null}
            {lesson.swaps?.length ? lesson.swaps.map((swap) => (
              <p key={`${lesson.id}-${swap.cut || "add"}-${swap.add || "cut"}`}>
                <span>Swap. </span>
                {swap.cut && swap.add ? `Cut ${swap.cut} for ${swap.add}. ` : swap.add ? `Add ${swap.add}. ` : `Cut ${swap.cut}. `}
                {swap.reason}
              </p>
            )) : null}
            <p className="mana-base-confidence">
              <span>Confidence</span>
              <strong>{lesson.confidence}</strong>
              <span>{lesson.confidenceReason}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
