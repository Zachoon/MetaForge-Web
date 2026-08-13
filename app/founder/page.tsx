"use client";

import { useEffect, useState } from "react";
import "./founder.css";
import "./knowledge.css";

type Overview = {
  generatedAt: string;
  totals: { testers: number; decks: number; revisions: number; matches: number; wins: number; losses: number; feedback: number };
  testers: Array<{ id: string; firstSeen: string; lastSeen: string; syncRevision: number; decks: number; revisions: number; matches: number; wins: number; losses: number; validData: boolean }>;
  feedback: Array<{ id: number; testerId: string; category: string; message: string; status: string; createdAt: string; context: Record<string, unknown> }>;
  launch: {
    funnel: Record<string, { events: number; sessions: number }>;
    reliability: { succeeded: number; failed: number; successRate: number | null; averageMs: number };
    campaigns: Array<{ source: string; medium: string; campaign: string; sessions: number; completed: number }>;
  };
  trustCalibration?: {
    version: string;
    sample: { coachFeedback: number; helpful: number; notHelpful: number; misunderstandsPlan: number; helpfulRate: number; guest: number; signedIn: number };
    topMisunderstoodCommanders: Array<{ label: string; count: number }>;
    topMisunderstoodArchetypes: Array<{ label: string; count: number }>;
    mostCommonFeedback: Array<{ label: string; count: number; share: number }>;
    disputedRecommendations: Array<{ label: string; count: number }>;
    confidenceVsTrust: Record<string, { total: number; helpfulRate: number; wrongPlanRate: number; helpful: number; notHelpful: number; wrongPlan: number }>;
    misunderstandingClusters: Array<{ reason: string; count: number; reading: string; commanders: Array<{ label: string; count: number }> }>;
    confusionMap: {
      mostMisunderstoodStrategies: Array<{ label: string; count: number }>;
      mostTrustedStrategies: Array<{ label: string; count: number }>;
      highestConfidenceLowestTrust: string;
      lowestConfidenceHighestTrust: string;
    };
    weeklyReview: {
      whereBrainEarnsTrust: string;
      whereBrainLosesTrust: string;
      mostRepeatedMisunderstanding: string;
      deservesAcademyInvestigation: boolean;
      academyQuestion: string;
    };
    priorities: { nextProductInvestigation: string | null; nextAcademyQuestion: string | null; brainChangeRecommended: boolean };
  };
};
type KnowledgeClaim = { id:string; game:string; sourceUrl:string; sourceTitle:string; author:string; publishedAt:string; sourceType:string; summary:string; principle:string; format:string; stance:string; tags:string[]; cards:string[]; status:string; createdAt:string };

export default function FounderCommandCenter() {
  const [data, setData] = useState<Overview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [knowledge, setKnowledge] = useState<KnowledgeClaim[]>([]);
  const [knowledgeStatus, setKnowledgeStatus] = useState("loading");
  const [goblins,setGoblins]=useState<any>({runs:[],totals:[],readiness:{}});
  const load = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/founder/overview", { cache: "no-store" });
      if (response.status === 403) { setStatus("denied"); return; }
      if (!response.ok) throw new Error("overview unavailable");
      setData(await response.json()); setStatus("ready");
      const knowledgeResponse=await fetch("/api/founder/knowledge",{cache:"no-store"});if(knowledgeResponse.ok){setKnowledge((await knowledgeResponse.json()).claims);setKnowledgeStatus("ready")}else setKnowledgeStatus("error");
      const goblinResponse=await fetch("/api/founder/goblins",{cache:"no-store"});if(goblinResponse.ok)setGoblins(await goblinResponse.json());
    } catch { setStatus("error"); }
  };
  useEffect(() => { load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer); }, []);
  if (status === "denied") return <main className="founder-state"><b>FOUNDER ACCESS REQUIRED</b><h1>This command center belongs to the MetaForge founder.</h1><a href="/">Return to MetaForge</a></main>;
  if (!data) return <main className="founder-state"><b>METAFORGE COMMAND CENTER</b><h1>{status === "error" ? "The telemetry forge did not answer." : "Heating the telemetry forge…"}</h1>{status === "error" && <button onClick={load}>Try again</button>}</main>;
  const rate = data.totals.matches ? Math.round(data.totals.wins / data.totals.matches * 100) : 0;
  const funnel = data.launch?.funnel || {};
  const visitors = funnel.landing_view?.sessions || 0;
  const completed = funnel.forge_succeeded?.sessions || 0;
  return <main className="founder-command">
    <header><a href="/" className="founder-brand"><i>MF</i><span>METAFORGE</span></a><div><small>PRIVATE · FOUNDER ONLY</small><h1>Command Center</h1><p>Your alpha’s pulse—without raw Arena logs or readable tester identities.</p></div><button onClick={load}>Refresh signals</button></header>
    <section className="founder-metrics">
      <article><span>TESTERS WITH DATA</span><b>{data.totals.testers}</b><em>Cloud-backed accounts</em></article>
      <article><span>TRACKED MATCHES</span><b>{data.totals.matches}</b><em>{data.totals.wins} wins · {data.totals.losses} losses</em></article>
      <article><span>OBSERVED WIN RATE</span><b>{rate}%</b><em>Descriptive, not causal</em></article>
      <article><span>DECK EVOLUTIONS</span><b>{data.totals.revisions}</b><em>{data.totals.decks} deck families</em></article>
      <article><span>FOUNDER SIGNALS</span><b>{data.totals.feedback}</b><em>Feedback reports</em></article>
    </section>
    <section className="founder-panel"><header><div><small>LAUNCH READINESS · LAST 30 DAYS</small><h2>Visitor journey</h2></div><b>{visitors ? Math.round(completed / visitors * 100) : 0}% VISIT → DECK</b></header>
      <div className="founder-metrics">
        {[['landing_view','CONSENTED VISITORS'],['forge_started','FORGES STARTED'],['forge_succeeded','DECKS RETURNED'],['coaching_opened','COACHING OPENED'],['experiment_started','TESTS STARTED'],['save_continue_clicked','SAVE INTENT']].map(([event,label])=><article key={event}><span>{label}</span><b>{funnel[event]?.sessions || 0}</b><em>{funnel[event]?.events || 0} total events</em></article>)}
      </div>
    </section>
    <section className="founder-panel"><header><div><small>GENERATION HEALTH · LAST 7 DAYS</small><h2>Production reliability</h2></div><b>{data.launch?.reliability.successRate ?? '—'}% SUCCESS</b></header>
      <div className="founder-metrics"><article><span>COMPLETED</span><b>{data.launch?.reliability.succeeded || 0}</b><em>Server-confirmed generations</em></article><article><span>FAILED</span><b>{data.launch?.reliability.failed || 0}</b><em>All HTTP failure responses</em></article><article><span>AVERAGE TIME</span><b>{data.launch?.reliability.averageMs ? `${Math.round(data.launch.reliability.averageMs / 1000)}s` : '—'}</b><em>Successful generations</em></article></div>
    </section>
    <section className="founder-panel"><header><div><small>CAMPAIGN ATTRIBUTION · LAST 30 DAYS</small><h2>What brings builders</h2></div><b>CONSENTED · ANONYMOUS</b></header>
      <div className="founder-table"><div className="table-head"><span>SOURCE</span><span>MEDIUM</span><span>CAMPAIGN</span><span>VISITORS</span><span>DECKS</span><span>RATE</span></div>{(data.launch?.campaigns || []).map((item,index)=><article key={`${item.source}-${item.campaign}-${index}`}><b>{item.source}</b><span>{item.medium}</span><span>{item.campaign}</span><span>{item.sessions}</span><span>{item.completed}</span><em>{item.sessions ? Math.round(item.completed/item.sessions*100) : 0}%</em></article>)}{!data.launch?.campaigns.length&&<p className="empty">Campaign results will appear after visitors allow anonymous measurement.</p>}</div>
    </section>
    {(() => {
      const trust = data.trustCalibration;
      if (!trust) return null;
      const conf = trust.confidenceVsTrust || {};
      return <>
        <section className="founder-panel trust-calibration" id="trust-calibration">
          <header>
            <div>
              <small>PRODUCT SPRINT ALPHA · A3</small>
              <h2>Trust Calibration</h2>
              <p className="trust-lede">Where Brain v1 earns trust — and where real users say it misunderstands them. Not a Brain change queue.</p>
            </div>
            <b>{trust.sample.coachFeedback} COACH SIGNALS · {trust.sample.helpfulRate}% HELPFUL</b>
          </header>
          <div className="founder-metrics trust-metrics">
            <article><span>HELPFUL</span><b>{trust.sample.helpful}</b><em>Players agreed with the read</em></article>
            <article><span>NOT HELPFUL</span><b>{trust.sample.notHelpful}</b><em>Trust broke</em></article>
            <article><span>WRONG PLAN</span><b>{trust.sample.misunderstandsPlan}</b><em>Plan misunderstanding reports</em></article>
            <article><span>GUEST / SIGNED-IN</span><b>{trust.sample.guest}/{trust.sample.signedIn}</b><em>Feedback completion mix</em></article>
            <article><span>BRAIN CHANGE?</span><b>NO</b><em>Academy may investigate — Brain waits</em></article>
          </div>
          <div className="trust-grid">
            <div>
              <small>TOP MISUNDERSTOOD COMMANDERS</small>
              <ul>{trust.topMisunderstoodCommanders.map((row) => <li key={row.label}><b>{row.label}</b><span>{row.count} wrong-plan</span></li>)}{!trust.topMisunderstoodCommanders.length && <li className="empty-row">Waiting for wrong-plan reports.</li>}</ul>
            </div>
            <div>
              <small>TOP MISUNDERSTOOD ARCHETYPES</small>
              <ul>{trust.topMisunderstoodArchetypes.map((row) => <li key={row.label}><b>{row.label}</b><span>{row.count}</span></li>)}{!trust.topMisunderstoodArchetypes.length && <li className="empty-row">Waiting for package-labeled mistrust.</li>}</ul>
            </div>
            <div>
              <small>MOST COMMON FEEDBACK</small>
              <ul>{trust.mostCommonFeedback.map((row) => <li key={row.label}><b>{row.label}</b><span>{row.share}%</span></li>)}{!trust.mostCommonFeedback.length && <li className="empty-row">No not-helpful reasons yet.</li>}</ul>
            </div>
            <div>
              <small>DISPUTED RECOMMENDATIONS</small>
              <ul>{trust.disputedRecommendations.map((row) => <li key={row.label}><b>{row.label}</b><span>{row.count}</span></li>)}{!trust.disputedRecommendations.length && <li className="empty-row">No recommendation-linked disputes yet.</li>}</ul>
            </div>
          </div>
        </section>
        <section className="founder-panel" id="brain-confusion-map">
          <header><div><small>BRAIN CONFUSION MAP</small><h2>One page north star</h2></div><b>USERS DEFINE QUESTIONS</b></header>
          <div className="confusion-map">
            <article><small>MOST MISUNDERSTOOD</small><b>{trust.confusionMap.mostMisunderstoodStrategies[0]?.label || "—"}</b><em>{trust.confusionMap.mostMisunderstoodStrategies.map((s) => `${s.label} (${s.count})`).join(" · ") || "No data yet"}</em></article>
            <article><small>MOST TRUSTED</small><b>{trust.confusionMap.mostTrustedStrategies[0]?.label || "—"}</b><em>{trust.confusionMap.mostTrustedStrategies.map((s) => `${s.label} (${s.count})`).join(" · ") || "No data yet"}</em></article>
            <article><small>HIGH CONFIDENCE / LOW TRUST</small><p>{trust.confusionMap.highestConfidenceLowestTrust}</p></article>
            <article><small>LOW CONFIDENCE / HIGH TRUST</small><p>{trust.confusionMap.lowestConfidenceHighestTrust}</p></article>
          </div>
          <div className="confidence-trust">
            <small>CONFIDENCE VS TRUST</small>
            <div className="founder-metrics">
              {["high","moderate","limited"].map((level) => {
                const row = conf[level] || { total: 0, helpfulRate: 0, wrongPlanRate: 0 };
                return <article key={level}><span>{level.toUpperCase()}</span><b>{row.helpfulRate}%</b><em>helpful · {row.wrongPlanRate}% wrong-plan · n={row.total}</em></article>;
              })}
            </div>
          </div>
          <div className="misunderstanding-clusters">
            <small>MISUNDERSTANDING CLUSTERS</small>
            {trust.misunderstandingClusters.map((cluster) => (
              <article key={cluster.reason}>
                <header><b>{cluster.reason}</b><span>{cluster.count} reports</span></header>
                <p>{cluster.reading}</p>
                <em>{cluster.commanders.map((c) => `${c.label} (${c.count})`).join(" → ") || "No commanders attached"}</em>
              </article>
            ))}
            {!trust.misunderstandingClusters.length && <p className="empty">Clusters appear once not-helpful reasons repeat across commanders.</p>}
          </div>
        </section>
        <section className="founder-panel" id="weekly-trust-review">
          <header><div><small>WEEKLY REVIEW · FOUR QUESTIONS</small><h2>What should we investigate?</h2></div><b>{trust.weeklyReview.deservesAcademyInvestigation ? "ACADEMY CANDIDATE" : "KEEP WATCHING"}</b></header>
          <ol className="weekly-review">
            <li><small>1 · WHERE DOES BRAIN EARN TRUST?</small><p>{trust.weeklyReview.whereBrainEarnsTrust}</p></li>
            <li><small>2 · WHERE DOES BRAIN LOSE TRUST?</small><p>{trust.weeklyReview.whereBrainLosesTrust}</p></li>
            <li><small>3 · WHAT MISUNDERSTANDING REPEATED MOST?</small><p>{trust.weeklyReview.mostRepeatedMisunderstanding}</p></li>
            <li><small>4 · DOES THIS DESERVE ACADEMY INVESTIGATION?</small><p>{trust.weeklyReview.academyQuestion}</p></li>
          </ol>
          <p className="trust-constitution">Users define the questions. The Academy seeks the answers. Brain change recommended: <strong>no</strong>.</p>
        </section>
      </>;
    })()}
    <section className="founder-panel"><header><div><small>ALPHA ACTIVITY</small><h2>Tester pulse</h2></div><time>Updated {new Date(data.generatedAt).toLocaleString()}</time></header>
      <div className="founder-table"><div className="table-head"><span>TESTER</span><span>LAST SYNC</span><span>DECKS</span><span>VERSIONS</span><span>RECORD</span><span>DATA</span></div>{data.testers.map((tester) => <article key={tester.id}><b>Tester {tester.id}</b><time>{new Date(tester.lastSeen).toLocaleString()}</time><span>{tester.decks}</span><span>{tester.revisions}</span><span>{tester.wins}–{tester.losses}</span><em className={tester.validData ? "good" : "bad"}>{tester.validData ? "HEALTHY" : "REVIEW"}</em></article>)}{!data.testers.length && <p className="empty">No synchronized tester data yet. This panel will populate automatically.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>DIRECT SIGNALS</small><h2>Feedback inbox</h2></div><b>{data.feedback.length} REPORTS</b></header>
      <div className="feedback-inbox">{data.feedback.map((item) => <article key={item.id}><div><span>{item.category.replaceAll("-", " ")}</span><time>{new Date(item.createdAt).toLocaleString()} · Tester {item.testerId}</time></div><p>{item.message}</p><details><summary>Attached diagnostics</summary><pre>{JSON.stringify(item.context, null, 2)}</pre></details></article>)}{!data.feedback.length && <p className="empty">No founder feedback has arrived yet.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>PROFESSIONAL KNOWLEDGE · AUTOMATED TRIAGE</small><h2>Exception queue</h2></div><b>{knowledge.filter((claim)=>claim.status==="quarantined").length} TO REVIEW</b></header>
      <div className="knowledge-queue">{knowledge.map((claim)=><article key={claim.id} className={claim.status}><div><span>{claim.game?.toUpperCase() || "MTG"} · {claim.status} · {claim.format} · {claim.sourceType}</span><time>{claim.publishedAt}</time></div><h3>{claim.principle}</h3><p>{claim.summary}</p><small>{claim.author} · <a href={claim.sourceUrl} target="_blank" rel="noreferrer">{claim.sourceTitle}</a></small><em>{claim.tags.join(" · ")}</em>{claim.status==="quarantined"&&<footer><button onClick={async()=>{await fetch("/api/founder/knowledge",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:claim.id,status:"approved"})});load()}}>Approve</button><button onClick={async()=>{await fetch("/api/founder/knowledge",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:claim.id,status:"rejected"})});load()}}>Reject</button></footer>}</article>)}{knowledgeStatus==="loading"&&<p className="empty">Running automated provenance checks…</p>}{knowledgeStatus==="ready"&&!knowledge.length&&<p className="empty">No exceptions. Automated collectors have not submitted professional claims yet.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>DATA GOBLIN OPERATIONS · DAILY</small><h2>Collector health</h2></div><button onClick={async()=>{await fetch("/api/founder/goblins",{method:"POST"});load()}}>Run goblins now</button></header><div className="founder-metrics">{["mtg","riftbound"].map(game=>{const total=goblins.totals.find((item:any)=>item.game===game),run=goblins.runs.find((item:any)=>item.game===game);return <article key={game}><span>{game.toUpperCase()} SOURCES</span><b>{total?.sources||0}</b><em>{total?.extracted||0} extracted · {run?`${run.status} · ${run.sources_discovered||0} new`:"awaiting first run"}</em></article>})}<article><span>FORGE BRAIN</span><b>NATIVE</b><em>{goblins.readiness?.strategicExtraction?"Coach and strategy triage connected":"Deterministic coach only · no model call; strategy triage is off"}</em></article></div>
    </section>
    <footer><span>Privacy-safe alpha operations</span><a href="/">Return to the Forge</a></footer>
  </main>;
}
