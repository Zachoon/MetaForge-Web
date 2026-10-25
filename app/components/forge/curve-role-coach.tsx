"use client";

import { useMemo } from "react";
import { commanderOracleText } from "../../commander-lane-scoring.mjs";
import { buildCurveRoleCoaching } from "../../curve-role-coach.mjs";
import { cardFactKey } from "../../deck-row-helpers";
import { isCommanderFormat } from "../../format-catalog";
import type { CardFact, CommanderOption, DeckRow } from "../../forge-types";

type Face = { oracle_text?: string; type_line?: string; mana_cost?: string };

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
  return "In range";
}

export function CurveRoleCoach({
  format,
  strategy,
  commander,
  secondCommander,
  rows,
  cardFacts,
  factsLoading,
}: {
  format: string;
  strategy?: string;
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
    return buildCurveRoleCoaching({
      commander: commanders[0] || undefined,
      commanders,
      cards,
      strategy,
    });
  }, [format, factsLoading, oracleReady, commanders, cards, strategy]);

  if (!isCommanderFormat(format)) return null;

  if (factsLoading && !oracleReady) {
    return (
      <section className="curve-role-coach" aria-label="Curve and role coaching" aria-busy="true">
        <small>NATIVE COACH · CURVE AND ROLES</small>
        <p role="status">Reading printed Oracle text…</p>
      </section>
    );
  }

  if (!report?.readable) {
    return (
      <section className="curve-role-coach" aria-label="Curve and role coaching">
        <small>NATIVE COACH · CURVE AND ROLES</small>
        <p>{report?.message || "Paste the decklist with the commander's printed Oracle text."}</p>
      </section>
    );
  }

  return (
    <section className="curve-role-coach" aria-label="Curve and role coaching">
      <header className="curve-role-head">
        <small>NATIVE COACH · CURVE AND ROLES</small>
        <h3>{report.commanderName ? `${report.commanderName} · ${report.plan.label}` : report.plan.label}</h3>
        {report.plan.excerpt ? <p className="curve-role-excerpt">“{report.plan.excerpt}”</p> : null}
        <p className="curve-role-confidence">
          <span>Confidence</span>
          <strong>{report.confidence.level}</strong>
          <span>{report.confidence.reason}</span>
        </p>
        {report.strategyNote ? <p>{report.strategyNote}</p> : null}
        {report.plan.restrictionNote ? <p>{report.plan.restrictionNote}</p> : null}
        {report.fixingNote ? <p>{report.fixingNote}</p> : null}
        {factsLoading ? <p role="status">Still reading printed Oracle text for the remaining cards.</p> : null}
      </header>

      <div className="curve-role-block">
        <h4>Mana curve</h4>
        <p>{report.curve.summary}</p>
        <ol className="curve-role-curve">
          {report.curve.buckets.map((bucket) => {
            const scale = Math.max(bucket.target, bucket.actual, 1);
            const width = Math.max(0, Math.min(100, Math.round((bucket.actual / scale) * 100)));
            return (
              <li key={bucket.label} data-status={bucket.status}>
                <span className="curve-role-bucket">{bucket.label}</span>
                <span className="curve-role-meter" aria-hidden="true"><i style={{ width: `${width}%` }} /></span>
                <b>{bucket.actual}</b>
                <small>{bucket.actual} spells. About {bucket.target} for this plan. {statusWord(bucket.status)}.</small>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="curve-role-block">
        <h4>Roles from printed text</h4>
        <ul className="curve-role-roles">
          {report.roles.map((role) => (
            <li key={role.id} data-status={role.status}>
              <span>{role.label}</span>
              <b>{role.actual}</b>
              <small>{role.actual} of {role.min}–{role.max}. {statusWord(role.status)}.</small>
            </li>
          ))}
        </ul>
      </div>

      <div className="curve-role-lessons">
        {report.lessons.map((lesson) => (
          <article key={lesson.id}>
            <h4>{lesson.title}</h4>
            <p><span>Theory. </span>{lesson.theory}</p>
            {lesson.cards?.length ? (
              <p><span>Cards. </span>{lesson.cards.map((card) => card.name).join(", ")}.</p>
            ) : null}
            {lesson.excluded?.length ? (
              <p>
                <span>Not counted. </span>
                {lesson.excluded.map((card) => `${card.name} (${card.note})`).join("; ")}.
              </p>
            ) : null}
            {lesson.swaps?.length ? lesson.swaps.map((swap) => (
              <p key={`${lesson.id}-${swap.add}`}>
                <span>Swap. </span>
                {swap.cut ? `Cut ${swap.cut} for ${swap.add}. ` : `Add ${swap.add}. `}
                {swap.reason}
              </p>
            )) : lesson.swapNote ? <p>{lesson.swapNote}</p> : null}
            <p className="curve-role-confidence">
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
