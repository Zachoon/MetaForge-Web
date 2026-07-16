"use client";

import { useEffect, useState } from "react";
import "./founder.css";
import "./knowledge.css";

type Overview = {
  generatedAt: string;
  totals: { testers: number; decks: number; revisions: number; matches: number; wins: number; losses: number; feedback: number };
  testers: Array<{ id: string; firstSeen: string; lastSeen: string; syncRevision: number; decks: number; revisions: number; matches: number; wins: number; losses: number; validData: boolean }>;
  feedback: Array<{ id: number; testerId: string; category: string; message: string; status: string; createdAt: string; context: Record<string, unknown> }>;
};
type KnowledgeClaim = { id:string; game:string; sourceUrl:string; sourceTitle:string; author:string; publishedAt:string; sourceType:string; summary:string; principle:string; format:string; stance:string; tags:string[]; cards:string[]; status:string; createdAt:string };

export default function FounderCommandCenter() {
  const [data, setData] = useState<Overview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [knowledge, setKnowledge] = useState<KnowledgeClaim[]>([]);
  const [knowledgeStatus, setKnowledgeStatus] = useState("loading");
  const [goblins,setGoblins]=useState<any>({runs:[],totals:[]});
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
  return <main className="founder-command">
    <header><a href="/" className="founder-brand"><i>MF</i><span>METAFORGE</span></a><div><small>PRIVATE · FOUNDER ONLY</small><h1>Command Center</h1><p>Your alpha’s pulse—without raw Arena logs or readable tester identities.</p></div><button onClick={load}>Refresh signals</button></header>
    <section className="founder-metrics">
      <article><span>TESTERS WITH DATA</span><b>{data.totals.testers}</b><em>Cloud-backed accounts</em></article>
      <article><span>TRACKED MATCHES</span><b>{data.totals.matches}</b><em>{data.totals.wins} wins · {data.totals.losses} losses</em></article>
      <article><span>OBSERVED WIN RATE</span><b>{rate}%</b><em>Descriptive, not causal</em></article>
      <article><span>DECK EVOLUTIONS</span><b>{data.totals.revisions}</b><em>{data.totals.decks} deck families</em></article>
      <article><span>FOUNDER SIGNALS</span><b>{data.totals.feedback}</b><em>Feedback reports</em></article>
    </section>
    <section className="founder-panel"><header><div><small>ALPHA ACTIVITY</small><h2>Tester pulse</h2></div><time>Updated {new Date(data.generatedAt).toLocaleString()}</time></header>
      <div className="founder-table"><div className="table-head"><span>TESTER</span><span>LAST SYNC</span><span>DECKS</span><span>VERSIONS</span><span>RECORD</span><span>DATA</span></div>{data.testers.map((tester) => <article key={tester.id}><b>Tester {tester.id}</b><time>{new Date(tester.lastSeen).toLocaleString()}</time><span>{tester.decks}</span><span>{tester.revisions}</span><span>{tester.wins}–{tester.losses}</span><em className={tester.validData ? "good" : "bad"}>{tester.validData ? "HEALTHY" : "REVIEW"}</em></article>)}{!data.testers.length && <p className="empty">No synchronized tester data yet. This panel will populate automatically.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>DIRECT SIGNALS</small><h2>Feedback inbox</h2></div><b>{data.feedback.length} REPORTS</b></header>
      <div className="feedback-inbox">{data.feedback.map((item) => <article key={item.id}><div><span>{item.category.replaceAll("-", " ")}</span><time>{new Date(item.createdAt).toLocaleString()} · Tester {item.testerId}</time></div><p>{item.message}</p><details><summary>Attached diagnostics</summary><pre>{JSON.stringify(item.context, null, 2)}</pre></details></article>)}{!data.feedback.length && <p className="empty">No founder feedback has arrived yet.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>PROFESSIONAL KNOWLEDGE · AUTOMATED TRIAGE</small><h2>Exception queue</h2></div><b>{knowledge.filter((claim)=>claim.status==="quarantined").length} TO REVIEW</b></header>
      <div className="knowledge-queue">{knowledge.map((claim)=><article key={claim.id} className={claim.status}><div><span>{claim.game?.toUpperCase() || "MTG"} · {claim.status} · {claim.format} · {claim.sourceType}</span><time>{claim.publishedAt}</time></div><h3>{claim.principle}</h3><p>{claim.summary}</p><small>{claim.author} · <a href={claim.sourceUrl} target="_blank" rel="noreferrer">{claim.sourceTitle}</a></small><em>{claim.tags.join(" · ")}</em>{claim.status==="quarantined"&&<footer><button onClick={async()=>{await fetch("/api/founder/knowledge",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:claim.id,status:"approved"})});load()}}>Approve</button><button onClick={async()=>{await fetch("/api/founder/knowledge",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:claim.id,status:"rejected"})});load()}}>Reject</button></footer>}</article>)}{knowledgeStatus==="loading"&&<p className="empty">Running automated provenance checks…</p>}{knowledgeStatus==="ready"&&!knowledge.length&&<p className="empty">No exceptions. Automated collectors have not submitted professional claims yet.</p>}</div>
    </section>
    <section className="founder-panel"><header><div><small>DATA GOBLIN OPERATIONS · DAILY</small><h2>Collector health</h2></div><button onClick={async()=>{await fetch("/api/founder/goblins",{method:"POST"});load()}}>Run goblins now</button></header><div className="founder-metrics">{["mtg","riftbound"].map(game=>{const total=goblins.totals.find((item:any)=>item.game===game),run=goblins.runs.find((item:any)=>item.game===game);return <article key={game}><span>{game.toUpperCase()} SOURCES</span><b>{total?.sources||0}</b><em>{run?`${run.status} · ${run.sources_discovered||0} newly discovered`:"Awaiting first daily run"}</em></article>})}</div>
    </section>
    <footer><span>Privacy-safe alpha operations</span><a href="/">Return to the Forge</a></footer>
  </main>;
}
