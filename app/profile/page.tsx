"use client";

import { useEffect, useMemo, useState } from "react";
import "./profile.css";
import { buildForgeStructuralAnalysis } from "../forge-structural-pipeline.mjs";
import { computeMastery } from "../forge-mastery.mjs";
import { computePlayerIdentity } from "../player-identity.mjs";
import {
  resolveDeckStructuralCards,
  motifWeightsFromStructuralCards,
} from "../deck-motif-scan.mjs";
import { MOTIF_ICONS, type MotifId } from "../masterwork-motif-icons.tsx";

const MOTIF_IDENTITY_COPY: Record<string, { name: string; line: string }> = {
  blade: { name: "Blade-Bound", line: "You end games with pressure and clean removal, not attrition." },
  shield: { name: "Warded", line: "You build to survive first — protection and lifegain buy the time your plan needs." },
  rune: { name: "Rune-Marked", line: "You answer, you don't out-race — interaction and sweepers define how you win." },
  gear: { name: "Wrought in Iron", line: "Artifacts and ramp are your engine — you'd rather build an advantage than spend one." },
  root: { name: "Root-Bound", line: "Nothing you lose stays lost — recursion and the graveyard are part of the plan." },
};

const STYLE_COPY: Record<string, { name: string; line: string }> = {
  curator: { name: "The Curator", line: "You forge a build and trust it. Few revisions, strong conviction." },
  explorer: { name: "The Explorer", line: "You test, you adjust, you keep what earns its place." },
  tinkerer: { name: "The Tinkerer", line: "No build is ever finished — you're always one experiment from the next version." },
};

const TEMPER_COPY: Record<string, { name: string; line: string }> = {
  unproven: { name: "Unproven", line: "Not enough recorded matches yet to call a temper." },
  tempered: { name: "Tempered", line: "Your record backs up your builds — a proven hand." },
  balanced: { name: "Balanced", line: "An even fight, game to game — no runaway record either way." },
  "hard-fought": { name: "Hard-Fought", line: "Tough matches, real experience — every loss here is data." },
};

// Original MetaForge naming for color-identity pairs, not Magic's own guild
// names — flavor without borrowing Wizards' branding.
const SINGLE_COLOR_COPY: Record<string, string> = {
  W: "The Devoted", U: "The Calculating", B: "The Unbound", R: "The Relentless", G: "The Growing",
};
const PAIR_COLOR_COPY: Record<string, string> = {
  WU: "The Vigilant", WB: "The Reckoning", WR: "The Crusading", WG: "The Steadfast",
  UB: "The Scheming", UR: "The Volatile", UG: "The Adaptive",
  BR: "The Ruinous", BG: "The Devouring", RG: "The Untamed",
};
const WUBRG_ORDER = ["W", "U", "B", "R", "G"];
function colorIdentityName(colors: string[]) {
  if (!colors.length) return "The Unaligned";
  if (colors.length === 1) return SINGLE_COLOR_COPY[colors[0]] || "The Unaligned";
  const key = [...colors].sort((a, b) => WUBRG_ORDER.indexOf(a) - WUBRG_ORDER.indexOf(b)).join("");
  return PAIR_COLOR_COPY[key] || "The Unaligned";
}

type SavedRevision = {
  deckText: string;
  note: string;
  createdAt: string;
  matches?: Array<{ id: string; result: "win" | "loss"; playedAt?: string }>;
};
type SavedFamily = {
  id: string;
  name: string;
  format: string;
  strategy?: string;
  commander?: { name: string; colors: string[]; image?: string } | null;
  record?: { wins: number; losses: number };
  archived?: boolean;
  // Written by the main app's refreshMasterworkMotif when a Masterwork is
  // finished — read here so the sigil reflects every already-finished
  // deck's motif on first load, with zero Scryfall calls.
  motifWeights?: Record<string, number>;
  revisions: SavedRevision[];
};

async function fetchStructuralAnalysis(family: SavedFamily) {
  const latest = family.revisions.at(-1);
  if (!latest) throw new Error("This Masterwork has no recorded deck text");
  const structuralCards = await resolveDeckStructuralCards({
    deckText: latest.deckText,
    commanderName: family.commander?.name || "",
  });
  const analysis = buildForgeStructuralAnalysis(structuralCards, {
    commanderName: family.commander?.name || "",
  });
  const motifWeights =
    family.motifWeights || motifWeightsFromStructuralCards(structuralCards);
  return { analysis, motifWeights };
}

export default function PlayerProfile() {
  const [families, setFamilies] = useState<SavedFamily[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [structural, setStructural] = useState<Record<string, any>>({});
  const [structuralLoading, setStructuralLoading] = useState<string | null>(null);
  const [structuralError, setStructuralError] = useState<Record<string, string>>({});
  const [motifWeightsByFamily, setMotifWeightsByFamily] = useState<Record<string, Record<string, number>>>({});

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
  // Seed from every family's cached motifWeights (written when a Masterwork
  // is finished) so the sigil reflects real identity on first load with zero
  // Scryfall calls — motifWeightsByFamily (session-local, from a manual
  // "inspect" click below) is spread second so a fresh inspect can override
  // a stale cache within the same session.
  const cachedMotifWeightsByFamily = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const family of families || []) {
      if (family.motifWeights) map[family.id] = family.motifWeights;
    }
    return map;
  }, [families]);
  const identity = useMemo(
    () =>
      computePlayerIdentity({
        families: families || [],
        motifWeightsByFamily: {
          ...cachedMotifWeightsByFamily,
          ...motifWeightsByFamily,
        },
      }),
    [families, cachedMotifWeightsByFamily, motifWeightsByFamily],
  );
  const chronicle = useMemo(() =>
    (families || []).flatMap((family) =>
      family.revisions.flatMap((revision, revisionIndex) => {
        const revisionEntry = {
          id: `${family.id}-revision-${revisionIndex}`,
          family: family.name,
          kind: revisionIndex === 0 ? "MASTERWORK FORGED" : "REVISION PRESERVED",
          detail: revision.note || (revisionIndex === 0 ? "The first complete build entered the archive." : `Revision ${revisionIndex + 1} joined this Masterwork.`),
          occurredAt: revision.createdAt,
        };
        const matches = (revision.matches || []).map((match) => ({
          id: `${family.id}-${match.id}`,
          family: family.name,
          kind: match.result === "win" ? "MATCH WON" : "MATCH RECORDED",
          detail: `Evidence attached to revision ${revisionIndex + 1}.`,
          occurredAt: match.playedAt || revision.createdAt,
        }));
        return [revisionEntry, ...matches];
      }),
    ).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 8),
  [families]);
  const selectedFamily = families?.find((family) => family.id === selectedId) || null;
  const IdentityMotifIcon = identity.dominantMotif ? MOTIF_ICONS[identity.dominantMotif as MotifId] : null;

  async function inspectStructure(family: SavedFamily) {
    if (structural[family.id]) {
      setSelectedId(family.id);
      return;
    }
    setSelectedId(family.id);
    window.requestAnimationFrame(() => document.getElementById("profile-structure")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    setStructuralLoading(family.id);
    try {
      const { analysis, motifWeights } = await fetchStructuralAnalysis(family);
      setStructural((current) => ({ ...current, [family.id]: analysis }));
      setMotifWeightsByFamily((current) => ({ ...current, [family.id]: motifWeights }));
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

      <section
        className={`player-sigil-hero style-${identity.style || "unformed"} temper-${identity.temper}`}
        style={{ "--identity-accent": identity.accent } as React.CSSProperties}
      >
        <div className="player-sigil">
          <svg className="sigil-rings" viewBox="0 0 200 200" aria-hidden="true">
            {identity.allMilestones.map((milestone: any, index: number) => {
              const radius = 22 + index * 9.5;
              const circumference = 2 * Math.PI * radius;
              return (
                <circle
                  key={milestone.id}
                  className={milestone.reached ? "ring-reached" : "ring-pending"}
                  cx="100"
                  cy="100"
                  r={radius}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: milestone.reached ? 0 : circumference * 0.06,
                    animationDelay: `${index * 90}ms`,
                  } as React.CSSProperties}
                >
                  <title>{milestone.label}{milestone.reached ? " — reached" : " — not yet"}</title>
                </circle>
              );
            })}
          </svg>
          <div className="sigil-core">
            {IdentityMotifIcon ? <IdentityMotifIcon size={72} /> : <span className="sigil-core-unknown">?</span>}
          </div>
        </div>
        <div className="player-sigil-readout">
          <small>YOUR SIGIL · DEPTH {identity.depth} OF {identity.allMilestones.length}</small>
          <h2>
            {identity.dominantMotif ? MOTIF_IDENTITY_COPY[identity.dominantMotif].name : "Not Yet Revealed"}
            {" · "}
            {colorIdentityName(identity.dominantColors)}
          </h2>
          <p>
            {identity.dominantMotif
              ? MOTIF_IDENTITY_COPY[identity.dominantMotif].line
              : "Open one of your Masterworks below — inspecting its structure reveals what your decks are actually built from."}
          </p>
          <div className="sigil-traits">
            <span>
              <b>{identity.style ? STYLE_COPY[identity.style].name : "Unformed"}</b>
              <em>{identity.style ? STYLE_COPY[identity.style].line : "Forge your first Masterwork to begin."}</em>
            </span>
            <span>
              <b>{TEMPER_COPY[identity.temper].name}</b>
              <em>{TEMPER_COPY[identity.temper].line}</em>
            </span>
          </div>
          {identity.nextMilestone && (
            <p className="sigil-next">
              <small>NEXT</small> {identity.nextMilestone.label}
            </p>
          )}
        </div>
      </section>

      <section className="legacy-path" aria-labelledby="legacy-path-title">
        <header>
          <span>
            <small>YOUR FORGE LEGACY</small>
            <h2 id="legacy-path-title">A record earned one real decision at a time.</h2>
          </span>
          <strong>{identity.depth}<i>/</i>{identity.allMilestones.length}</strong>
        </header>
        <div className="legacy-rail" aria-label={`${identity.depth} of ${identity.allMilestones.length} milestones reached`}>
          <i style={{ width: `${identity.allMilestones.length ? (identity.depth / identity.allMilestones.length) * 100 : 0}%` }} />
        </div>
        <ol>
          {identity.allMilestones.map((milestone: any, index: number) => {
            const isNext = identity.nextMilestone?.id === milestone.id;
            return (
              <li key={milestone.id} className={milestone.reached ? "reached" : isNext ? "next" : "locked"}>
                <i>{milestone.reached ? "✓" : index + 1}</i>
                <span>
                  <small>{milestone.reached ? "FORGED" : isNext ? "NEXT" : "AWAITING"}</small>
                  <b>{milestone.label}</b>
                </span>
              </li>
            );
          })}
        </ol>
        <footer>
          {identity.nextMilestone ? (
            <><span><small>THE NEXT MARK</small><b>{identity.nextMilestone.label}</b></span><a href="/">Continue your Forge →</a></>
          ) : (
            <><span><small>THE RECORD IS COMPLETE</small><b>Every current Forge milestone has been earned.</b></span><a href="/">Begin another Masterwork →</a></>
          )}
        </footer>
      </section>

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
              <article key={family.id} className={[family.archived ? "finished" : "", selectedId === family.id ? "selected" : ""].filter(Boolean).join(" ")}>
                <button className="profile-deck-open" onClick={() => inspectStructure(family)}>
                  <span className="profile-deck-art">
                    {family.commander?.image ? <img src={family.commander.image} alt="" /> : <i>ᛞ</i>}
                    <small>{family.archived ? "SEALED" : "IN PROGRESS"}</small>
                  </span>
                  <span className="profile-deck-copy">
                    <small>{family.format}</small>
                    <strong>{family.name}</strong>
                    <span>{family.commander?.name || "No commander"}</span>
                  </span>
                  <span className="profile-deck-proof">
                    <em><b>{family.revisions.length}</b> revisions</em>
                    <em><b>{evidence.wins + evidence.losses}</b> matches</em>
                    <i>Inspect structure →</i>
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="forge-chronicle" aria-labelledby="forge-chronicle-title">
        <header><span><small>RECENT CHRONICLE</small><h2 id="forge-chronicle-title">What you have actually forged.</h2></span><b>{chronicle.length} latest marks</b></header>
        {chronicle.length ? (
          <ol>
            {chronicle.map((entry) => (
              <li key={entry.id}>
                <i />
                <span><small>{entry.kind}</small><b>{entry.family}</b><p>{entry.detail}</p></span>
                <time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
              </li>
            ))}
          </ol>
        ) : <p className="empty">Your first saved Masterwork will begin this chronicle.</p>}
      </section>

      {selectedFamily && (
        <section className="profile-structure" id="profile-structure">
          <header>
            <span><small>STRUCTURAL BREAKDOWN</small><h2>{selectedFamily.name}</h2></span>
            <button type="button" onClick={() => setSelectedId(null)}>Close inspection</button>
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
