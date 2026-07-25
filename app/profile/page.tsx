"use client";

import { useEffect, useMemo, useState } from "react";
import "./profile.css";
import { buildForgeStructuralAnalysis } from "../forge-structural-pipeline.mjs";
import { computeMastery } from "../forge-mastery.mjs";

type SavedRevision = {
  deckText: string;
  note: string;
  createdAt: string;
  matches?: Array<{ id: string; result: "win" | "loss" }>;
};
type SavedFamily = {
  id: string;
  name: string;
  format: string;
  strategy?: string;
  commander?: { name: string; colors: string[] } | null;
  record?: { wins: number; losses: number };
  archived?: boolean;
  revisions: SavedRevision[];
};

const parseDeckRows = (text: string) =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });

async function fetchStructuralAnalysis(family: SavedFamily) {
  const latest = family.revisions.at(-1);
  if (!latest) throw new Error("This Masterwork has no recorded deck text");
  const rows = parseDeckRows(latest.deckText);
  const commanderKey = family.commander?.name?.trim().toLowerCase();
  const names = [...new Set(rows.map((row) => row.name))];
  const cardsByName = new Map<string, any>();
  for (let index = 0; index < names.length; index += 75) {
    const chunk = names.slice(index, index + 75);
    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    });
    const data = await response.json();
    for (const card of data.data || []) cardsByName.set(card.name.trim().toLowerCase(), card);
  }
  const structuralCards = rows.map((row) => {
    const card = cardsByName.get(row.name.trim().toLowerCase());
    return {
      name: row.name,
      typeLine: card?.type_line || (row.name.trim().toLowerCase() === commanderKey ? "" : "Card"),
      oracleText: card?.oracle_text || (card?.card_faces || []).map((face: any) => face.oracle_text || "").join("\n"),
      quantity: row.quantity,
      isCommander: row.name.trim().toLowerCase() === commanderKey,
    };
  });
  return buildForgeStructuralAnalysis(structuralCards, { commanderName: family.commander?.name || "" });
}

export default function PlayerProfile() {
  const [families, setFamilies] = useState<SavedFamily[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [structural, setStructural] = useState<Record<string, any>>({});
  const [structuralLoading, setStructuralLoading] = useState<string | null>(null);
  const [structuralError, setStructuralError] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/account/deck-bench", { cache: "no-store" });
        if (response.status === 401) {
          setStatus("denied");
          return;
        }
        if (!response.ok) throw new Error("bench unavailable");
        const data = await response.json();
        setFamilies((data.bench?.families || []) as SavedFamily[]);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  const mastery = useMemo(() => computeMastery(families || []), [families]);
  const selectedFamily = families?.find((family) => family.id === selectedId) || null;

  async function inspectStructure(family: SavedFamily) {
    if (structural[family.id]) {
      setSelectedId(family.id);
      return;
    }
    setSelectedId(family.id);
    setStructuralLoading(family.id);
    try {
      const analysis = await fetchStructuralAnalysis(family);
      setStructural((current) => ({ ...current, [family.id]: analysis }));
    } catch (error) {
      setStructuralError((current) => ({
        ...current,
        [family.id]: error instanceof Error ? error.message : "The structural read could not complete.",
      }));
    } finally {
      setStructuralLoading(null);
    }
  }

  if (status === "denied") {
    return (
      <main className="profile-state">
        <b>ACCOUNT REQUIRED</b>
        <h1>Sign in to see your Forge Mastery record.</h1>
        <a href="/">Return to MetaForge</a>
      </main>
    );
  }
  if (!families) {
    return (
      <main className="profile-state">
        <b>METAFORGE PROFILE</b>
        <h1>{status === "error" ? "The archive did not answer." : "Reading your private archive…"}</h1>
      </main>
    );
  }

  const analysis = selectedFamily ? structural[selectedFamily.id] : null;
  const analysisError = selectedFamily ? structuralError[selectedFamily.id] : null;

  return (
    <main className="profile-page">
      <header>
        <a href="/" className="profile-brand"><i>MF</i><span>METAFORGE</span></a>
        <div>
          <small>YOUR RECORD</small>
          <h1>Forge Mastery</h1>
          <p>Every number below is counted from real recorded matches and accepted revisions — nothing here is a predicted score.</p>
        </div>
      </header>

      <section className="mastery-grid">
        <article><span>MATCHES RECORDED</span><b>{mastery.totalMatches}</b><em>{mastery.wins}W · {mastery.losses}L</em></article>
        <article><span>EXPERIMENTS ACCEPTED</span><b>{mastery.experimentsAccepted}</b><em>Revisions promoted from a controlled test</em></article>
        <article><span>FINISHED MASTERWORKS</span><b>{mastery.finished}</b><em>{mastery.active} still in progress</em></article>
        <article><span>IDENTITIES EXPLORED</span><b>{mastery.distinctFormats}</b><em>{mastery.distinctStrategies} distinct strategies</em></article>
      </section>

      <section className="profile-decks">
        <header><small>YOUR ARCHIVE</small><h2>Every Masterwork, at a glance</h2></header>
        {!families.length && <p className="empty">Nothing preserved yet — decks you forge and save will appear here.</p>}
        <div className="profile-deck-list">
          {families.map((family) => {
            const evidence = family.record || { wins: 0, losses: 0 };
            return (
              <article key={family.id} className={family.archived ? "finished" : ""}>
                <button className="profile-deck-open" onClick={() => inspectStructure(family)}>
                  <small>{family.archived ? "FINISHED · " : ""}{family.format}</small>
                  <strong>{family.name}</strong>
                  <span>{family.commander?.name || "No commander"}</span>
                  <em>{evidence.wins}W · {evidence.losses}L · {family.revisions.length} revision{family.revisions.length === 1 ? "" : "s"}</em>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {selectedFamily && (
        <section className="profile-structure">
          <header>
            <small>STRUCTURAL BREAKDOWN</small>
            <h2>{selectedFamily.name}</h2>
          </header>
          {structuralLoading === selectedFamily.id && <p className="empty">Reading verified card text for every slot…</p>}
          {analysisError && <p className="empty">{analysisError}</p>}
          {analysis && (
            <>
              <p className="structure-headline">{analysis.causality.headline}</p>
              <div className="structure-systems">
                {analysis.systems.systems.map((system: any) => (
                  <article key={system.id}>
                    <b>{system.name}</b>
                    <small>{system.members?.length || 0} connected cards</small>
                  </article>
                ))}
                {!analysis.systems.systems.length && <p className="empty">No repeated interaction pattern was detected yet.</p>}
              </div>
              <div className="structure-nodes">
                <div>
                  <small>CRITICAL NODES</small>
                  {analysis.causality.criticalNodes.slice(0, 5).map((node: any) => (
                    <p key={node.name}>{node.name} <em>{node.collapseRisk}/100 collapse risk</em></p>
                  ))}
                  {!analysis.causality.criticalNodes.length && <p className="empty">None isolated yet.</p>}
                </div>
                <div>
                  <small>BOTTLENECKS</small>
                  {analysis.causality.bottlenecks.slice(0, 5).map((node: any) => (
                    <p key={node.name}>{node.name} <em>{node.bottleneckScore}/100 pressure</em></p>
                  ))}
                  {!analysis.causality.bottlenecks.length && <p className="empty">None isolated yet.</p>}
                </div>
              </div>
              <p className="structure-boundary">{analysis.causality.evidence}</p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
