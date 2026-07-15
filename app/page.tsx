"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRecommendation, isLand, parseDeck } from "./deck-analysis.mjs";
import { validateDeckLegality } from "./deck-legality.mjs";
import { getMetaIntelligence } from "./meta-intelligence.mjs";
import FORGE_CANDIDATE, { CANDIDATES } from "./forge-candidate.mjs";
import { evaluateExperiment } from "./experiment-evidence.mjs";
import { classifyRevealedOpponent } from "./opponent-classifier.mjs";
import { evaluateLastMatchSignal, evaluateMatchupEvidence } from "./adaptive-recommendation.mjs";
import { evaluateOpeningHandComparison, simulateDeck } from "./forge-simulation.mjs";
import { evaluateSimulationGate } from "./goldfish-simulation.mjs";
import { evaluateMatchupMatrix } from "./matchup-simulation.mjs";
import { evaluateDraftPick, limitedDeckHealth } from "./limited-buddy.mjs";
import { deckFingerprint } from "./deck-fingerprint.mjs";
import { attachMatches, DECK_BENCH_STORAGE_KEY, emptyDeckBench, mergeDeckBenches, rankedFamilies, readDeckBench, recordExperiment, updateFamily } from "./deck-bench.mjs";

const SAMPLE_DECK = `4 Monastery Swiftspear
4 Slickshot Show-Off
4 Emberheart Challenger
4 Lightning Strike
4 Burst Lightning
4 Torch the Tower
4 Boltwave
2 Witchstalker Frenzy
26 Mountain`;
const REQUIRED_COMPANION_VERSION = "0.2.1";
const SAMPLE_DRAFT_PACK = `Shieldwall Recruit | 3.4 | W | 2 | Creature
Molten Rebuke | 3.7 | R | 2 | Instant
Archive Visionary | 3.5 | U | 3 | Creature
Verdant Colossus | 3.2 | G | 6 | Creature
Grave Bargain | 3.3 | B | 3 | Sorcery`;

export default function Home() {
  const meta = getMetaIntelligence();
  const simulationGate = useMemo(() => evaluateSimulationGate(FORGE_CANDIDATE.deck, FORGE_CANDIDATE.strategy, 2000, 8128), []);
  const matchupMatrix = useMemo(() => evaluateMatchupMatrix(FORGE_CANDIDATE.deck, ["Aggro", "Midrange", "Control", "Tempo"], 2000, 991), []);
  const [deckName, setDeckName] = useState("My deck");
  const [format, setFormat] = useState("Standard");
  const [deckText, setDeckText] = useState("");
  const [draftPack, setDraftPack] = useState(SAMPLE_DRAFT_PACK);
  const [draftPool, setDraftPool] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [proposedDeck, setProposedDeck] = useState("");
  const [comparisonReady, setComparisonReady] = useState(false);
  const [candidateCopyStatus, setCandidateCopyStatus] = useState("Start founder trial →");
  const [arenaTracking, setArenaTracking] = useState<"idle" | "waiting" | "registered">("idle");
  const [deckLegality, setDeckLegality] = useState<{ legal: boolean; total: number; issues: Array<{ message: string }>; pending?: boolean }>({ legal: false, total: 0, issues: [], pending: true });
  const [arenaStatus, setArenaStatus] = useState<"idle" | "connecting" | "connected" | "needs-logs" | "outdated" | "offline">("idle");
  const [companionVersion, setCompanionVersion] = useState<string | null>(null);
  const [companionLastCheck, setCompanionLastCheck] = useState<string | null>(null);
  const [backupExported, setBackupExported] = useState(false);
  const [feedbackVerified, setFeedbackVerified] = useState(false);
  const [secondBrowserVerified, setSecondBrowserVerified] = useState(false);
  const [arenaMatches, setArenaMatches] = useState<Array<{ id: string; completedAt: string; gamesWon: number; gamesLost: number; result: "win" | "loss"; mulligans: number; deckFingerprint?: string; revealedOpponentCards?: string[]; experimentVariant?: "original" | "proposed" | "unmatched" }>>([]);
  const [deckBench, setDeckBench] = useState<any>(emptyDeckBench());
  const [accountStatus, setAccountStatus] = useState<"loading" | "synced" | "saving" | "local" | "error">("loading");
  const [accountReady, setAccountReady] = useState(false);
  const [lastAccountSync, setLastAccountSync] = useState<string | null>(null);
  const accountRevision = useRef(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("broken");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [experiment, setExperiment] = useState<null | {
    id?: string;
    deckName: string;
    originalDeck: string;
    proposedDeck: string;
    status: "testing" | "kept" | "reverted";
    startedAt: string;
    originalFingerprint?: string;
    proposedFingerprint?: string;
  }>(null);

  const rows = useMemo(() => parseDeck(deckText), [deckText]);
  const draftPoolRows = useMemo(() => parseLimitedRows(draftPool), [draftPool]);
  const draftRanking = useMemo(() => evaluateDraftPick(parseLimitedRows(draftPack), draftPoolRows, { pick: draftPoolRows.length + 1 }), [draftPack, draftPoolRows]);
  const draftHealth = useMemo(() => limitedDeckHealth(draftPoolRows), [draftPoolRows]);
  const cardCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const landCount = rows.filter((row) => isLand(row.name)).reduce((sum, row) => sum + row.quantity, 0);
  const uniqueCount = rows.length;
  const health = Math.max(42, Math.min(94, 78 - Math.abs(24 - landCount) * 2 - Math.abs(60 - cardCount)));
  const recommendation = useMemo(() => createRecommendation(rows, format), [rows, format]);
  const proposedRows = useMemo(() => parseDeck(proposedDeck), [proposedDeck]);
  const originalMetrics = useMemo(() => comparisonReady ? simulateDeck(rows, 2500, 9173) : null, [comparisonReady, rows]);
  const proposedMetrics = useMemo(() => comparisonReady ? simulateDeck(proposedRows, 2500, 9173) : null, [comparisonReady, proposedRows]);
  const comparisonVerdict = useMemo(() => originalMetrics && proposedMetrics ? evaluateOpeningHandComparison(originalMetrics, proposedMetrics) : null, [originalMetrics, proposedMetrics]);

  useEffect(() => {
    const stored = window.localStorage.getItem("metaforge.activeExperiment");
    if (!stored) return;
    try {
      setExperiment(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem("metaforge.activeExperiment");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateAccount = async () => {
      const local = readDeckBench(window.localStorage.getItem(DECK_BENCH_STORAGE_KEY));
      setDeckBench(local);
      try {
        const response = await fetch("/api/account/deck-bench", { cache: "no-store" });
        if (!response.ok) throw new Error("account unavailable");
        const data = await response.json();
        if (!active) return;
        accountRevision.current = Number(data.revision || 0);
        setLastAccountSync(data.updatedAt || new Date().toISOString());
        const merged = mergeDeckBenches(local, data.bench || emptyDeckBench());
        window.localStorage.setItem(DECK_BENCH_STORAGE_KEY, JSON.stringify(merged));
        setDeckBench(merged);
        setAccountStatus("synced");
      } catch {
        if (active) setAccountStatus("local");
      } finally {
        if (active) setAccountReady(true);
      }
    };
    hydrateAccount();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!accountReady || accountStatus === "local") return;
    const timer = window.setTimeout(async () => {
      setAccountStatus("saving");
      try {
        let nextBench = deckBench;
        let response = await fetch("/api/account/deck-bench", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bench: nextBench, baseRevision: accountRevision.current }) });
        if (response.status === 409) {
          const conflict = await response.json();
          accountRevision.current = Number(conflict.revision || 0);
          nextBench = mergeDeckBenches(deckBench, conflict.bench || emptyDeckBench());
          window.localStorage.setItem(DECK_BENCH_STORAGE_KEY, JSON.stringify(nextBench));
          setDeckBench(nextBench);
          response = await fetch("/api/account/deck-bench", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bench: nextBench, baseRevision: accountRevision.current }) });
        }
        if (!response.ok) throw new Error("save failed");
        const saved = await response.json();
        accountRevision.current = Number(saved.revision || accountRevision.current);
        setLastAccountSync(new Date().toISOString());
        setAccountStatus("synced");
      } catch { setAccountStatus("error"); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [deckBench, accountReady]);

  useEffect(() => {
    if (!experiment?.originalFingerprint || !experiment?.proposedFingerprint) return;
    saveBenchExperiment(experiment);
  }, [experiment?.id, experiment?.status]);

  useEffect(() => {
    if (!arenaMatches.length) return;
    setDeckBench((current: any) => {
      const next = attachMatches(current, arenaMatches);
      window.localStorage.setItem(DECK_BENCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [arenaMatches]);

  useEffect(() => {
    let active = true;
    setDeckLegality((current) => ({ ...current, legal: false, pending: true }));
    validateDeckLegality(rows, format).then((result) => { if (active) setDeckLegality({ ...result, pending: false }); });
    return () => { active = false; };
  }, [rows, format]);

  useEffect(() => {
    if (arenaStatus !== "connected") return;
    const refresh = async () => {
      try {
        const response = await fetch("http://127.0.0.1:17831/matches", { cache: "no-store" });
        const data = await response.json();
        setArenaMatches(Array.isArray(data.matches) ? data.matches.slice().reverse() : []);
      } catch {
        setArenaStatus("offline");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [arenaStatus]);

  async function connectArena() {
    setArenaStatus("connecting");
    try {
      const response = await fetch("http://127.0.0.1:17831/health", { cache: "no-store" });
      const data = await response.json();
      setCompanionVersion(data.version || "legacy");
      setCompanionLastCheck(new Date().toISOString());
      if (data.version !== REQUIRED_COMPANION_VERSION) {
        setArenaStatus("outdated");
        return;
      }
      setArenaStatus(data.logFound ? "connected" : "needs-logs");
      if (data.logFound && experiment) {
        const upgraded = experiment.originalFingerprint && experiment.proposedFingerprint ? experiment : {
          ...experiment,
          id: experiment.id || window.crypto.randomUUID(),
          originalFingerprint: await fingerprint(parseDeck(experiment.originalDeck)),
          proposedFingerprint: await fingerprint(parseDeck(experiment.proposedDeck)),
        };
        window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(upgraded));
        setExperiment(upgraded);
        const registered = await registerExperiment(upgraded);
        setArenaTracking(registered ? "registered" : "waiting");
        if (registered) setCandidateCopyStatus("Copied · Arena tracking live");
      }
    } catch {
      setArenaStatus("offline");
    }
  }

  function loadSample(moveToForge = false) {
    setDeckName("Red Prowess");
    setFormat("Standard");
    setDeckText(SAMPLE_DECK);
    setAnalyzed(moveToForge);
    if (moveToForge) {
      window.setTimeout(() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  function loadForgeCandidate(candidate = FORGE_CANDIDATE) {
    const arenaDeck = `Deck\n${candidate.deckText}\n\nSideboard\n${candidate.sideboardText}`;
    setDeckName(candidate.name);
    setFormat(candidate.format);
    setDeckText(arenaDeck);
    setAnalyzed(true);
    window.setTimeout(() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function startForgeCandidate(candidate = FORGE_CANDIDATE) {
    loadForgeCandidate(candidate);
    const arenaDeck = `Deck\n${candidate.deckText}\n\nSideboard\n${candidate.sideboardText}`;
    let copied = false;
    try { await navigator.clipboard.writeText(arenaDeck); copied = true; } catch { /* The loaded Forge text remains available to copy manually. */ }
    const candidateRows = parseDeck(candidate.deckText);
    const candidateFingerprint = await fingerprint(candidateRows);
    const trial = {
      id: window.crypto.randomUUID(),
      deckName: candidate.name,
      originalDeck: candidate.deckText,
      proposedDeck: candidate.deckText,
      status: "testing" as const,
      startedAt: new Date().toISOString(),
      originalFingerprint: candidateFingerprint,
      proposedFingerprint: candidateFingerprint,
    };
    window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(trial));
    setExperiment(trial);
    saveBenchExperiment(trial);
    const registered = await registerExperiment(trial);
    setArenaTracking(registered ? "registered" : "waiting");
    setCandidateCopyStatus(registered ? `${copied ? "Copied" : "Loaded"} · Arena tracking live` : `${copied ? "Copied" : "Loaded"} · Connect Arena to track`);
  }

  function analyze() {
    if (cardCount > 0) setAnalyzed(true);
  }

  function prepareComparison(mode: "forge" | "manual" = "forge") {
    if (!deckLegality.legal) return;
    setProposedDeck(mode === "forge" ? recommendation.proposedDeck : deckText);
    setComparisonReady(false);
    setComparisonOpen(true);
    window.setTimeout(() => document.querySelector("#test-bench")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function prepareNamedAlternative(option: { proposedDeck?: string }) {
    setProposedDeck(option.proposedDeck || deckText);
    setComparisonReady(false);
    setComparisonOpen(true);
    window.setTimeout(() => document.querySelector("#test-bench")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function fingerprint(deckRows: Array<{ name: string; quantity: number }>) {
    return deckFingerprint(deckRows);
  }

  async function registerExperiment(nextExperiment: NonNullable<typeof experiment>) {
    try {
      const response = await fetch("http://127.0.0.1:17831/experiment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextExperiment) });
      return response.ok;
    } catch {
      // The local experiment remains saved and can be paired when the companion reconnects.
      return false;
    }
  }

  async function saveExperiment() {
    if (!deckLegality.legal || !proposedRows.length || proposedDeck.trim() === deckText.trim()) return;
    const [originalFingerprint, proposedFingerprint] = await Promise.all([fingerprint(rows), fingerprint(proposedRows)]);
    const nextExperiment = {
      id: window.crypto.randomUUID(),
      deckName: deckName || "Untitled deck",
      originalDeck: deckText,
      proposedDeck,
      status: "testing" as const,
      startedAt: new Date().toISOString(),
      originalFingerprint,
      proposedFingerprint,
    };
    window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(nextExperiment));
    saveBenchExperiment(nextExperiment);
    setExperiment(nextExperiment);
    const registered = await registerExperiment(nextExperiment);
    setArenaTracking(registered ? "registered" : "waiting");
  }

  function decideExperiment(status: "testing" | "kept" | "reverted") {
    if (!experiment) return;
    const updated = { ...experiment, status };
    if (status === "kept") {
      setDeckText(experiment.proposedDeck);
      setAnalyzed(false);
    }
    window.localStorage.setItem("metaforge.activeExperiment", JSON.stringify(updated));
    saveBenchExperiment(updated);
    setExperiment(updated);
  }

  function saveBenchExperiment(nextExperiment: NonNullable<typeof experiment>) {
    setDeckBench((current: any) => {
      const next = recordExperiment(current, nextExperiment, format);
      window.localStorage.setItem(DECK_BENCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function changeBenchFamily(familyId: string, action: "archive" | "restore" | "promote", revision?: any) {
    setDeckBench((current: any) => {
      const next = updateFamily(current, familyId, action, revision?.fingerprint);
      window.localStorage.setItem(DECK_BENCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (action === "promote" && revision) {
      setDeckName(deckBench.families.find((family: any) => family.id === familyId)?.name || "My deck");
      setDeckText(revision.deckText);
      setAnalyzed(true);
    }
  }

  function exportDeckBench() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), product: "MetaForge", deckBench }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metaforge-deck-bench-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupExported(true);
  }

  async function submitFeedback() {
    if (feedbackMessage.trim().length < 3) return;
    setFeedbackStatus("saving");
    try {
      const response = await fetch("/api/account/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        category: feedbackCategory,
        message: feedbackMessage,
        context: { page: "forge", deckName, format, experimentId: experiment?.id || null, proposedFingerprint: experiment?.proposedFingerprint || null, arenaStatus, arenaTracking, companionVersion, accountStatus, recordedMatches: arenaMatches.length },
      }) });
      if (!response.ok) throw new Error("feedback failed");
      setFeedbackMessage("");
      setFeedbackStatus("saved");
      setFeedbackVerified(true);
      window.setTimeout(() => { setFeedbackOpen(false); setFeedbackStatus("idle"); }, 1200);
    } catch { setFeedbackStatus("error"); }
  }

  const proposedEvidence = arenaMatches.filter((match) => (match as typeof match & { experimentVariant?: string }).experimentVariant === "proposed");
  const experimentEvidence = evaluateExperiment(proposedEvidence);
  const matchupCounts = proposedEvidence.reduce<Record<string, number>>((counts, match) => { const label = classifyRevealedOpponent(match.revealedOpponentCards).strategy; counts[label] = (counts[label] || 0) + 1; return counts; }, {});
  const matchupSummary = Object.entries(matchupCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(" · ");
  const nextCandidate = experiment ? CANDIDATES[(CANDIDATES.findIndex((candidate) => candidate.name === experiment.deckName) + 1) % CANDIDATES.length] : null;
  const activeCandidate = experiment ? CANDIDATES.find((candidate) => candidate.name === experiment.deckName) : undefined;
  const adaptiveRecommendation = evaluateMatchupEvidence(proposedEvidence, activeCandidate);
  const lastMatchSignal = evaluateLastMatchSignal(proposedEvidence[0], activeCandidate);
  const benchRankings = rankedFamilies(deckBench);
  const experimentStage = !experiment ? "proposed" : experiment.status !== "testing" ? experiment.status : arenaTracking !== "registered" ? "ready" : experimentEvidence.sampleSize === 0 ? "testing" : ["support", "challenge", "retire"].includes(experimentEvidence.decision) ? "decision" : "evidence";
  const onboardingSteps = [
    { label: "Account protected", detail: accountStatus === "synced" ? "Deck Bench is backed up." : "Signing in and preparing your backup.", done: accountStatus === "synced", action: () => document.querySelector("#deck-bench")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Arena Companion", detail: arenaStatus === "connected" ? `v${companionVersion} connected.` : arenaStatus === "outdated" ? `Update legacy Companion to v${REQUIRED_COMPANION_VERSION}.` : arenaStatus === "needs-logs" ? "Enable Detailed Logs and restart Arena." : "Download, run, then connect the Companion.", done: arenaStatus === "connected", action: connectArena },
    { label: "Deck imported", detail: cardCount ? `${cardCount} cards ready for diagnosis.` : "Paste an Arena decklist or load the sample.", done: cardCount > 0, action: () => document.querySelector(".workspace")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "First experiment", detail: experiment ? `${experiment.deckName} is preserved in your Bench.` : "Choose a Forge or manual change to test.", done: Boolean(experiment), action: () => document.querySelector("#test-bench")?.scrollIntoView({ behavior: "smooth" }) },
  ];
  const acceptanceChecks = [
    { label: "Account backup online", detail: accountStatus === "synced" ? `Last synchronized ${lastAccountSync ? new Date(lastAccountSync).toLocaleString() : "this session"}.` : "Waiting for an authenticated Deck Bench sync.", done: accountStatus === "synced", automatic: true },
    { label: "Companion + Detailed Logs", detail: arenaStatus === "connected" ? `Companion v${companionVersion} answered${companionLastCheck ? ` at ${new Date(companionLastCheck).toLocaleTimeString()}` : ""}.` : "Run Connect Arena until the Companion and Player.log both answer.", done: arenaStatus === "connected", automatic: true },
    { label: "Exact revision registered", detail: arenaTracking === "registered" ? "The active experiment fingerprint is registered locally." : "Start an experiment and register it with the Companion.", done: arenaTracking === "registered", automatic: true },
    { label: "Real Arena evidence arrived", detail: proposedEvidence.length ? `${proposedEvidence.length} exact-revision match${proposedEvidence.length === 1 ? "" : "es"} received.` : "Play a completed Arena match with the registered revision.", done: proposedEvidence.length > 0, automatic: true },
    { label: "Recovery backup exported", detail: backupExported ? "A human-readable Deck Bench backup was downloaded." : "Export a backup from My Deck Bench.", done: backupExported, automatic: true },
    { label: "Second-browser recovery inspected", detail: secondBrowserVerified ? "Founder manually confirmed restoration." : "Open a second browser, sign in, inspect the restored Bench, then confirm here.", done: secondBrowserVerified, automatic: false },
    { label: "Founder feedback received", detail: feedbackVerified ? "The feedback endpoint accepted a real report." : "Send one contextual report from the feedback dock.", done: feedbackVerified, automatic: true },
  ];

  async function startAdaptiveRepair() {
    if (!experiment || adaptiveRecommendation.status !== "repair-ready" || !adaptiveRecommendation.proposedDeck) return;
    const repaired = adaptiveRecommendation.proposedDeck;
    setDeckText(experiment.proposedDeck);
    setProposedDeck(repaired);
    setComparisonOpen(true);
    setComparisonReady(false);
    window.setTimeout(() => document.querySelector("#test-bench")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="MetaForge home">
          <span className="brand-mark">MF</span>
          <span>METAFORGE</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#forge">The Forge</a>
          <a href="#deck-bench">My Bench</a>
        </div>
        <button className="nav-cta" onClick={() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" })}>
          Analyze a deck
        </button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> YOUR DECK, EXPLAINED</div>
          <h1>Stop guessing.<br /><em>Forge a better deck.</em></h1>
          <p className="hero-lede">
            MetaForge finds the pressure points in your Magic deck, explains why they matter,
            and gives you changes worth testing—not a pile of generic card suggestions.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" })}>
              Analyze my deck <span>→</span>
            </button>
            <button className="text-button" onClick={() => loadSample(true)}>See a sample analysis</button>
          </div>
          <div className="trust-row">
            <span><b>◇</b> Explainable findings</span>
            <span><b>◇</b> Evidence-aware</span>
            <span><b>◇</b> Free to try</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Example MetaForge diagnosis">
          <div className="forge-aperture"><span>LIVE FORGE SIGNAL</span><i /></div>
          <div className="scan-line" />
          <div className="floating-report">
            <div className="report-top">
              <div><small>FORGE DIAGNOSIS</small><strong>Temur Prowess</strong></div>
              <div className="score"><span>82</span><small>DECK<br />HEALTH</small></div>
            </div>
            <div className="signal critical"><i>01</i><div><small>PRIMARY PRESSURE POINT</small><b>Turn-two color access is inconsistent</b><p>Your opening seven finds both colors in only 61% of measured hands.</p></div></div>
            <div className="confidence"><span>CONFIDENCE</span><div><i /></div><b>HIGH</b></div>
          </div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="shell proof-inner">
          <p>Built to answer the questions that decklists cannot.</p>
          <div><strong>WHAT</strong><span>is going wrong?</span></div>
          <div><strong>WHY</strong><span>does it matter?</span></div>
          <div><strong>WHAT NEXT</strong><span>should I test?</span></div>
        </div>
      </section>

      <section className="process shell" id="how-it-works">
        <div className="section-heading"><div><span>THE METAFORGE METHOD</span><h2>From decklist to direction.</h2></div><p>Useful intelligence in minutes, with the reasoning left intact.</p></div>
        <div className="forge-architecture" aria-label="The three chambers of the MetaForge analysis process">
          <div><span>01</span> INTAKE</div><div><span>02</span> DIAGNOSIS</div><div><span>03</span> COMPARISON</div>
        </div>
        <div className="steps">
          <article><i>01</i><div className="step-icon">＋</div><h3>Add your deck</h3><p>Paste a list from Arena, MTGO, Moxfield, or your notes. No account required.</p></article>
          <article><i>02</i><div className="step-icon">⌁</div><h3>See the pressure points</h3><p>Forge measures composition, consistency, curve, mana, and strategic focus.</p></article>
          <article><i>03</i><div className="step-icon">↗</div><h3>Test a stronger version</h3><p>Compare changes against your original deck and understand every tradeoff.</p></article>
        </div>
      </section>

      <section className="meta-section">
        <div className="shell">
          <div className="section-heading"><div><span>LIVE FIELD INTELLIGENCE</span><h2>What does the field actually support?</h2></div><p>MetaForge separates fresh observation from historical precedent before it generates a counter-strategy.</p></div>
          <div className="meta-grid">
            <article className="meta-current"><small>NEWEST OBSERVED FIELD · {meta.current.end}</small><h3>{meta.majority ? `${meta.majority} is the current majority` : meta.leadingStrategy ? `${meta.leadingStrategy} leads a mixed field` : "Current majority not established"}</h3><p>{meta.warning || meta.recommendation}</p><div className="confidence-line"><span>CONFIDENCE</span><b>{meta.current.confidence}</b><i>{meta.current.sampleSize} decks · {meta.current.classificationCoverage ? `${(meta.current.classificationCoverage * 100).toFixed(0)}% classified` : "local corpus"}</i></div>{meta.current.provenance && <a className="meta-source" href={meta.current.provenance.url} target="_blank" rel="noreferrer">SOURCE · {meta.current.provenance.name} · observed {meta.current.provenance.observedAt}</a>}</article>
            <article className="meta-historical"><small>HISTORICAL PRIOR · {meta.historicalPrior.start}—{meta.historicalPrior.end}</small><h3>{meta.historicalMajority}-leaning field</h3><p>{meta.historicalPrior.sampleSize} decks provide a high-confidence comparison state—not permission to call it today’s meta.</p><div className="meta-bars">{meta.historicalPrior.strategies.slice(0, 4).map((strategy) => <div key={strategy.name}><span>{strategy.name}</span><i><b style={{ width: `${strategy.share * 100}%` }} /></i><strong>{(strategy.share * 100).toFixed(1)}%</strong></div>)}</div></article>
          </div>
          <p className="meta-method">GENERATOR GATE · {meta.generatorGate.replaceAll("-", " ")} · {meta.method}</p>
          <article className="forge-prototype"><div><small>FORGE RECOMMENDED · META BREAKER</small><h3>{FORGE_CANDIDATE.name}</h3><p>{FORGE_CANDIDATE.reasoning}</p><em>Not a popularity pick: Forge generated this list to attack the measured field, then required format legality, a complete sideboard, supported synergies, and opening-hand consistency before offering it for testing.</em></div><div className="prototype-facts"><span><b>{FORGE_CANDIDATE.strategy}</b>STRATEGY</span><span><b>{FORGE_CANDIDATE.target}</b>FIELD TARGET</span><span><b>{((1 - FORGE_CANDIDATE.novelty) * 100).toFixed(0)}%</b>EST. FIELD OVERLAP</span><span><b>{(FORGE_CANDIDATE.coherence * 100).toFixed(0)}%</b>SYNERGY SUPPORT</span><span><b>FOUNDER TEST</b>VIABILITY GATE</span><span><b>{FORGE_CANDIDATE.rankScore.toFixed(1)}</b>RANK SCORE</span></div><button onClick={() => startForgeCandidate(FORGE_CANDIDATE)}>{candidateCopyStatus}</button></article>
          <section className="simulation-ladder" aria-label="Simulation ladder results">
            <header><div><small>SIMULATION LADDER · 2,000 DETERMINISTIC RUNS</small><h3>{simulationGate.gate === "goldfish-pass" ? "Sequencing gate passed." : "More structural work required."}</h3><p>{simulationGate.warning}</p></div><b className={simulationGate.gate === "goldfish-pass" ? "pass" : "hold"}>{simulationGate.gate.replaceAll("-", " ")}</b></header>
            <div className="simulation-metrics"><span><b>{(simulationGate.expert.keepableRate * 100).toFixed(1)}%</b>KEEPABLE OPENERS</span><span><b>{(simulationGate.expert.planRealizationRate * 100).toFixed(1)}%</b>PLAN REALIZATION</span><span><b>{simulationGate.expert.averageRealizationTurn?.toFixed(1) || "—"}</b>AVG. REALIZATION TURN</span><span><b>{(simulationGate.expert.modelCoverage * 100).toFixed(0)}%</b>MODEL COVERAGE</span><span><b>{simulationGate.sensitivityLabel}</b>PILOT SENSITIVITY</span></div>
            <ol><li className="complete">Structure + legality</li><li className={simulationGate.gate === "goldfish-pass" ? "complete" : "hold"}>Goldfish sequencing</li><li className={matchupMatrix.gate === "matrix-pass" ? "complete" : "hold"}>Scenario interaction</li><li>Rules-complete matchups</li><li>Arena validation</li></ol>
            <div className="matchup-matrix"><header><small>ARCHETYPE STRESS MATRIX · 2,000 TRIALS EACH</small><em>{matchupMatrix.warning}</em></header>{matchupMatrix.rows.map((row) => <span key={row.opponent}><b>{row.opponent}</b><i><strong style={{ width: `${row.scenarioPassRate * 100}%` }} /></i><em>{(row.scenarioPassRate * 100).toFixed(0)}% scenario pass</em><small>{(row.stabilizationRate * 100).toFixed(0)}% stabilizes · {(row.pilotSensitivity * 100).toFixed(1)} pts pilot-sensitive</small></span>)}</div>
          </section>
          <section className="strategy-proof" aria-label="Generated strategy support proof">
            <div><small>STRATEGY GRAPH · VERIFIED</small><h3>Every payoff has enough support.</h3><p>Forge reads Oracle text, identifies what each payoff demands, counts its enabling cards, and rejects or repairs unsupported packages before ranking the deck.</p></div>
            <div className="strategy-proof-list">{FORGE_CANDIDATE.requirements.map((requirement) => <article key={`${requirement.card}-${requirement.requirement}`}><span>{requirement.card}</span><b>{requirement.requirement}</b><em>{requirement.supportCount}/{requirement.minimum} copies</em><small>{requirement.enablers.slice(0, 3).join(" · ")}</small></article>)}</div>
          </section>
          <div className="runner-up-heading"><small>RUNNER-UP FORGE IDEAS</small><h3>Different answers to the same field.</h3><p>The top build is not the only viable hypothesis. Compare the alternate strategies, inspect every card, and test the one that fits how you want to attack the field.</p></div>
          <div className="candidate-rankings">{CANDIDATES.slice(1).map((candidate) => <article key={candidate.name}><span>0{candidate.rank}</span><div><small>{candidate.strategy} · VS {candidate.target}</small><h4>{candidate.name}</h4><p>{candidate.strategyPlan}. {candidate.averageSpellCmc.toFixed(2)} average spell mana · {(candidate.novelty * 100).toFixed(0)}% novelty · {(candidate.coherence * 100).toFixed(0)}% coherence</p><em>FIELD FIT +{candidate.scoreBreakdown.matchupFit} · HISTORY +{candidate.scoreBreakdown.historicalFit} · CURVE −{candidate.scoreBreakdown.curvePenalty}</em><details><summary>View full 75-card idea</summary><pre>{candidate.deckText}{"\n\nSIDEBOARD\n"}{candidate.sideboardText}</pre></details></div><b>{candidate.rankScore.toFixed(1)}</b><button onClick={() => startForgeCandidate(candidate)}>Test</button></article>)}</div>
        </div>
      </section>

      <section className="draft-buddy-section" id="draft-buddy">
        <div className="shell">
          <div className="section-heading"><div><span>LIMITED LAB · FOUNDER PREVIEW</span><h2>Draft Buddy ranks the pick—and shows its work.</h2></div><p>Enter cards as Name | rating | colors | mana value | type. Ratings remain an input prior; pool fit and curve needs can move the pick.</p></div>
          <div className="draft-buddy-grid">
            <label>PACK<textarea value={draftPack} onChange={(event) => setDraftPack(event.target.value)} /></label>
            <label>CURRENT POOL<textarea value={draftPool} onChange={(event) => setDraftPool(event.target.value)} placeholder="Add previous picks here, one card per line…" /></label>
            <aside><small>LIVE PICK ORDER · PICK {draftPoolRows.length + 1}</small>{draftRanking.slice(0, 5).map((card, index) => <article key={`${card.name}-${index}`}><i>0{index + 1}</i><div><b>{card.name}</b><span>{card.colors?.join("") || "C"} · {card.cmc} mana · {card.type}</span><em>{card.reasons.join(" · ")}</em></div><strong>{card.score.toFixed(1)}</strong></article>)}<footer><b>{draftHealth.creatures} creatures · {draftHealth.early} early plays</b><span>{draftHealth.warnings.length ? draftHealth.warnings.join(" ") : "Pool fundamentals are currently on track."}</span></footer></aside>
          </div>
          <p className="draft-disclaimer">Founder preview: Draft Buddy does not read the Arena draft screen yet and does not pretend ratings are facts. Card recognition, set-specific archetypes, signals, and pick-history capture remain gated work.</p>
        </div>
      </section>

      <section className="forge-section" id="forge">
        <div className="shell forge-shell">
          <div className="forge-heading"><div><span>ENTER THE FORGE</span><h2>What are you working on?</h2></div><p>Paste a quantity-based decklist. Your first diagnosis appears instantly.</p></div>
          <section className="founder-onboarding" aria-label="Founder setup guide">
            <header><div><small>FOUNDER FLIGHT CHECK</small><h3>{onboardingSteps.every((step) => step.done) ? "The Forge is fully armed." : "Four steps to your first measured evolution."}</h3></div><b>{onboardingSteps.filter((step) => step.done).length}/4<span>READY</span></b></header>
            <div>{onboardingSteps.map((step, index) => <button key={step.label} className={step.done ? "done" : ""} onClick={step.action}><i>{step.done ? "✓" : `0${index + 1}`}</i><span><b>{step.label}</b><small>{step.detail}</small></span></button>)}</div>
          </section>
          <section className="acceptance-console" aria-label="Founder acceptance console">
            <header><div><small>RELEASE GATE · LIVE ACCEPTANCE</small><h3>{acceptanceChecks.every((check) => check.done) ? "Founder flight cleared." : "Prove the full loop before widening access."}</h3><p>This console combines signals the Forge can verify with the one recovery check that requires your eyes.</p></div><b>{acceptanceChecks.filter((check) => check.done).length}/{acceptanceChecks.length}<span>GATES</span></b></header>
            <div>{acceptanceChecks.map((check) => <article key={check.label} className={check.done ? "done" : "pending"}><i>{check.done ? "✓" : "○"}</i><span><b>{check.label}</b><small>{check.detail}</small></span>{!check.automatic && <button onClick={() => setSecondBrowserVerified((value) => !value)}>{check.done ? "Undo" : "I verified this"}</button>}</article>)}</div>
          </section>
          {experiment && (
            <aside className={`experiment-return ${experiment.status}`}>
              <div>
                <small>SAVED FORGE EXPERIMENT</small>
                <h3>{experiment.deckName}</h3>
                <p>{experiment.status === "testing" ? "Did this change earn a place in your deck?" : experiment.status === "kept" ? "Change kept. This version is now loaded into the Forge." : "Change reverted. Your original version remains intact."}</p>
                <div className="experiment-progress" aria-label={`Experiment stage: ${experimentStage}`}><span className="complete">PROPOSED</span><span className={["ready","testing","evidence","decision","kept","reverted"].includes(experimentStage) ? "complete" : ""}>READY</span><span className={["testing","evidence","decision","kept","reverted"].includes(experimentStage) ? "complete" : ""}>TESTING</span><span className={["evidence","decision","kept","reverted"].includes(experimentStage) ? "complete" : ""}>EVIDENCE {experimentEvidence.sampleSize ? `${experimentEvidence.sampleSize}/5+` : ""}</span><span className={["decision","kept","reverted"].includes(experimentStage) ? "complete" : ""}>DECIDE</span></div>
              </div>
              {experiment.status === "testing" && (
                <div className="experiment-actions">
                  <button onClick={() => decideExperiment("kept")}>Keep the change</button>
                  <button onClick={() => decideExperiment("reverted")}>Revert</button>
                  <button onClick={() => decideExperiment("testing")}>Still testing</button>
                </div>
              )}
            </aside>
          )}
          <aside className="arena-bridge">
            <div>
              <small>ARENA COMPANION · PRIVATE ALPHA</small>
              <h3>Let Arena report the test results.</h3>
              <p>{arenaStatus === "connected" ? arenaTracking === "registered" ? "Connected and tracking this exact deck revision. Completed matches will appear automatically." : "Connected. Start or reopen a Forge trial to register its exact deck revision." : arenaStatus === "outdated" ? `An older Companion answered (${companionVersion}). Close it, download v${REQUIRED_COMPANION_VERSION}, and reconnect.` : arenaStatus === "needs-logs" ? "Companion found. In Arena, open Options → Account, enable Detailed Logs, then restart Arena." : arenaStatus === "offline" ? "Nothing answered on the local bridge. Extract and run the Companion, allow Windows if prompted, then reconnect." : "Connect the read-only local companion to track completed Arena matches without manual entry."}</p>
            </div>
            <div className="arena-actions">
              <a href="/downloads/MetaForge-Arena-Companion-Windows-v0.2.1.zip" download>Download companion v0.2.1 · Windows</a>
              <button onClick={connectArena} disabled={arenaStatus === "connecting"}>{arenaStatus === "connected" ? "Arena connected" : arenaStatus === "connecting" ? "Connecting…" : "Connect Arena"}</button>
              <small>Founder build · local-only data · Windows may ask you to confirm the unsigned app.</small>
            </div>
          </aside>
          {arenaMatches.length > 0 && (
            <section className="arena-history" aria-label="Arena match history">
              <div className="arena-history-heading"><div><small>PERSONAL PLAY EVIDENCE</small><h3>Recent Arena matches</h3></div><span>{arenaMatches.filter((match) => match.result === "win").length}–{arenaMatches.filter((match) => match.result === "loss").length}</span></div>
              <div className="arena-match-list">{arenaMatches.slice(0, 8).map((match) => { const opponent = classifyRevealedOpponent(match.revealedOpponentCards); return <article key={match.id} className={match.result}><b>{match.result === "win" ? "WIN" : "LOSS"}</b><span>{match.gamesWon}–{match.gamesLost} games</span><span>{opponent.strategy} · {opponent.confidence}</span><time>{new Date(match.completedAt).toLocaleString()}</time></article>; })}</div>
              <p>This evidence belongs to your testing history. It does not alter MetaForge’s global intelligence.</p>
            </section>
          )}
          <section className="deck-bench" id="deck-bench" aria-label="My Deck Bench">
            <div className="deck-bench-heading">
              <div><small>PRIVATE PERFORMANCE LAB · {accountStatus === "synced" ? "ACCOUNT SYNCED" : accountStatus === "saving" ? "SAVING…" : accountStatus === "loading" ? "LOADING ACCOUNT…" : accountStatus === "local" ? "LOCAL BACKUP" : "SYNC RETRY NEEDED"}</small><h3>My Deck Bench</h3><p>Every exact list keeps its own evidence. One card changed means a new revision—never contaminated history.</p><em>{lastAccountSync ? `Last cloud backup ${new Date(lastAccountSync).toLocaleString()}` : "Local recovery copy active; cloud backup is being established."}</em></div>
              <div className="bench-account-tools"><b>{benchRankings.length}<span>ACTIVE DECKS</span></b><button onClick={exportDeckBench}>Export my backup</button></div>
            </div>
            {benchRankings.length === 0 ? <div className="bench-empty"><b>Your first revision is waiting.</b><span>Start a Forge experiment and this bench will preserve the baseline, the proposed list, and every Arena result attached to the exact version played.</span></div> : (
              <div className="bench-families">{benchRankings.map((family: any, familyIndex: number) => <article className="bench-family" key={family.id}>
                <header><span>#{familyIndex + 1}</span><div><small>{family.format} · {family.revisions.length} VERSION{family.revisions.length === 1 ? "" : "S"}</small><h4>{family.name}</h4></div><button onClick={() => changeBenchFamily(family.id, "archive")}>Archive</button></header>
                <div className="bench-revisions">{family.revisions.map((revision: any, revisionIndex: number) => {
                  const evidence = revision.evidence;
                  const matchups = Object.entries(evidence.matchups).map(([name, result]: any) => `${name} ${result.wins}–${result.losses}`).join(" · ");
                  const promoted = family.promotedFingerprint === revision.fingerprint;
                  return <div className={`bench-revision ${promoted ? "promoted" : ""}`} key={revision.fingerprint}>
                    <div className="revision-title"><b>V{revision.version || family.revisions.length - revisionIndex}</b><span>{revision.source === "original" ? "Baseline" : "Forge revision"}{promoted ? " · CURRENT" : ""}</span></div>
                    <div className="revision-record"><b>{evidence.wins}–{evidence.losses}</b><span>{evidence.sampleSize ? `${Math.round(evidence.posteriorMean * 100)}% adjusted strength` : "Awaiting matches"}</span></div>
                    <div className="revision-confidence"><b>{evidence.confidence}</b><span>{matchups || "No matchup evidence yet"}</span></div>
                    <button disabled={promoted} onClick={() => changeBenchFamily(family.id, "promote", revision)}>{promoted ? "Promoted" : "Promote & load"}</button>
                  </div>;
                })}</div>
              </article>)}</div>
            )}
            {deckBench.families.some((family: any) => family.archived) && <details className="archived-decks"><summary>Archived decks ({deckBench.families.filter((family: any) => family.archived).length})</summary>{deckBench.families.filter((family: any) => family.archived).map((family: any) => <button key={family.id} onClick={() => changeBenchFamily(family.id, "restore")}>Restore {family.name}</button>)}</details>}
            <details className="privacy-contract"><summary>What MetaForge saves and why</summary><p>Your account saves deck revisions and privacy-safe match evidence so your Bench survives browser changes. The Companion reads Arena’s local log; MetaForge does not store the raw log. Founder feedback attaches identifiers and connection diagnostics, not full deck contents. Personal results do not automatically train or alter the global Forge model.</p></details>
          </section>
          {experiment && (
            <section className="forge-evidence">
              <div><small>FORGE EXPERIMENT EVIDENCE</small><h3>{experimentEvidence.confidence.toUpperCase()}</h3></div>
              <div><b>{experimentEvidence.wins}–{experimentEvidence.losses}</b><span>{experimentEvidence.decision.toUpperCase()}</span></div>
              <p>{experimentEvidence.narrative}{experimentEvidence.sampleSize > 0 && ` Estimated strength ${(experimentEvidence.posteriorMean * 100).toFixed(0)}%; 95% interval ${(experimentEvidence.interval[0] * 100).toFixed(0)}–${(experimentEvidence.interval[1] * 100).toFixed(0)}%. Matchup signals: ${matchupSummary || "unknown"}.`}</p>
              {nextCandidate && ["challenge", "retire"].includes(experimentEvidence.decision) && <button onClick={() => loadForgeCandidate(nextCandidate)}>Promote next candidate →</button>}
            </section>
          )}
          {experiment && (
            <section className={`adaptive-repair ${adaptiveRecommendation.status}`}>
              <div><small>REAL-TIME MATCHUP ADAPTATION</small><h3>{adaptiveRecommendation.status === "repair-ready" ? `${adaptiveRecommendation.weakness.strategy} weakness detected` : "Watching for a repeatable weakness"}</h3></div>
              <p>{adaptiveRecommendation.narrative}{adaptiveRecommendation.purpose && ` The repair is designed to ${adaptiveRecommendation.purpose}.`}</p>
              {adaptiveRecommendation.status === "repair-ready" && <div className="adaptive-changes">{adaptiveRecommendation.changes.map((change) => <b key={change.card} className={change.quantity > 0 ? "add" : "remove"}>{change.quantity > 0 ? "+" : ""}{change.quantity} {change.card}</b>)}</div>}
              {adaptiveRecommendation.status === "repair-ready" && <button onClick={startAdaptiveRepair}>Test matchup repair →</button>}
            </section>
          )}
          {experiment && (
            <section className={`last-match-coach ${lastMatchSignal.status}`}>
              <div><small>LAST MATCH · LIVE FORGE COACH</small><h3>{lastMatchSignal.strategy ? `${lastMatchSignal.strategy} signal detected` : "Waiting for a readable matchup"}</h3></div>
              <p>{lastMatchSignal.narrative}</p>
              {lastMatchSignal.candidateOption && <div><b>WATCH OPTION · {lastMatchSignal.candidateOption.card}</b><span>{lastMatchSignal.purpose}</span></div>}
            </section>
          )}
          <div className="workspace">
            <div className="input-panel">
              <div className="field-row">
                <label>DECK NAME<input value={deckName} onChange={(e) => { setDeckName(e.target.value); setAnalyzed(false); }} /></label>
                <label>FORMAT<select value={format} onChange={(e) => { setFormat(e.target.value); setAnalyzed(false); }}><option>Standard</option><option>Pioneer</option><option>Modern</option><option>Legacy</option><option>Pauper</option><option>Vintage</option><option>Commander</option></select></label>
              </div>
              <label className="deck-label">DECKLIST <button onClick={() => loadSample(false)}>Load sample</button></label>
              <textarea value={deckText} onChange={(e) => { setDeckText(e.target.value); setAnalyzed(false); }} placeholder={"4 Lightning Bolt\n4 Monastery Swiftspear\n20 Mountain"} aria-label="Decklist" />
              <div className="input-footer"><span>{cardCount ? `${cardCount} cards · ${uniqueCount} unique entries` : "Use one card entry per line"}</span><span>TXT</span></div>
              <button className="analyze" disabled={!cardCount} onClick={analyze}>Forge my analysis <span>→</span></button>
            </div>

            <div className={`result-panel ${analyzed ? "ready" : ""}`} aria-live="polite">
              {!analyzed ? (
                <div className="empty-result"><div className="anvil">◇</div><small>AWAITING DECKLIST</small><h3>Your diagnosis will appear here.</h3><p>We’ll show your deck health, highest-priority issue, and the first change worth testing.</p></div>
              ) : (
                <div className="analysis-result">
                  <div className="result-header"><div><small>INITIAL DIAGNOSIS · {format.toUpperCase()}</small><h3>{deckName || "Untitled deck"}</h3></div><div className="health"><b>{health}</b><span>/100<br />HEALTH</span></div></div>
                  <div className="metric-row"><div><span>TOTAL CARDS</span><b>{cardCount}</b></div><div><span>LANDS DETECTED</span><b>{landCount}</b></div><div><span>UNIQUE ENTRIES</span><b>{uniqueCount}</b></div></div>
                  <div className={`legality-gate ${deckLegality.legal ? "legal" : "illegal"}`}><span>{deckLegality.pending ? "CHECKING FORMAT" : deckLegality.legal ? "FORMAT LEGAL" : "LEGALITY GATE FAILED"}</span><b>{deckLegality.pending ? "Loading the selected format’s legality catalog…" : deckLegality.legal ? `${format} · ${deckLegality.total} cards` : deckLegality.issues[0]?.message}</b></div>
                  <article className="finding"><small>01 · FORGE RECOMMENDATION</small><h4>{recommendation.title}</h4><p>{recommendation.summary}</p><p className="recommendation-reasoning">{recommendation.reasoning}</p></article>
                  {recommendation.guardrail && <aside className="engine-guardrail"><span>ENGINE CONSTRAINT · KEEP THIS WORKING</span><p>{recommendation.guardrail}</p></aside>}
                  <div className="strategy-contract"><div><span>EXPECTED GAIN</span><p>{recommendation.expectedGain}</p></div><div><span>TRADEOFF TO WATCH</span><p>{recommendation.risk}</p></div><div><span>WHAT TO DO NEXT</span><p>{recommendation.testPlan.instruction}</p></div></div>
                  {recommendation.mechanics?.landfall_payoff > 0 && <div className="mechanic-tradeoff"><span>LANDFALL ENGINE CHECK</span><div><b>{recommendation.mechanics.payoffCount}</b><small>PAYOFF CARDS</small></div><div><b>{recommendation.mechanics.fetchCount}</b><small>FETCH LANDS</small></div><div><b>{recommendation.mechanics.slowFetchCount}</b><small>ALWAYS TAPPED</small></div><div><b>{recommendation.mechanics.posture.replaceAll("-", " ")}</b><small>ENGINE STATUS</small></div></div>}
                  {recommendation.changes.length > 0 && <div className="change-set"><span>PROPOSED CHANGE</span>{recommendation.changes.map((change) => <b key={`${change.card}-${change.quantity}`} className={change.quantity > 0 ? "add" : "remove"}>{change.quantity > 0 ? "+" : ""}{change.quantity} {change.card}</b>)}</div>}
                  <div className="named-alternatives"><span>RUNNER-UP TESTS</span>{recommendation.manualChallenges.map((option) => <button key={option.card} disabled={!option.proposedDeck} onClick={() => prepareNamedAlternative(option)}><b>{option.add ? `−1 ${option.card} · +1 ${option.add}` : `Challenge ${option.card}`}</b><small>{option.reason}</small></button>)}</div>
                  <div className="next-test"><span>YOUR NEXT ACTION</span><p>{recommendation.changes.length ? "Review Forge’s exact one-card swap below. You can accept it as the test version or edit it before playing; your original remains saved." : "Forge does not have enough evidence for an automatic cut. Choose a runner-up above, or create one deliberate card-for-card experiment yourself."}</p><div className="experiment-choice"><button onClick={() => prepareComparison("forge")} disabled={!recommendation.changes.length}>{recommendation.changes.length ? "Review Forge’s exact change" : "No automatic change available"} <b>→</b></button><button onClick={() => prepareComparison("manual")}>Create my own experiment <b>→</b></button></div></div>
                  <p className="result-note">This early web preview uses composition evidence. Deeper Forge intelligence will connect as the hosted API comes online.</p>
                </div>
              )}
            </div>
          </div>
          {comparisonOpen && (
            <section className="test-bench-web" id="test-bench">
              <div className="bench-heading">
                <div><small>WORKSHOP TEST BENCH</small><h3>Original versus proposed</h3></div>
                <p>Edit the proposed version, then run the same seeded simulation against both lists.</p>
              </div>
              <div className="bench-grid">
                <div><label>ORIGINAL VERSION</label><textarea value={deckText} readOnly aria-label="Original deck version" /></div>
                <div><label>TEST VERSION · EDITABLE</label><textarea value={proposedDeck} onChange={(event) => { setProposedDeck(event.target.value); setComparisonReady(false); }} aria-label="Proposed deck version" /></div>
              </div>
              <button className="run-comparison" disabled={!proposedRows.length} onClick={() => setComparisonReady(true)}>Run 2,500 opening hands <span>→</span></button>
              {comparisonReady && originalMetrics && proposedMetrics && (
                <div className="comparison-results">
                  {comparisonVerdict && <aside className={`simulation-verdict ${comparisonVerdict.verdict}`}><small>OPENING-HAND GATE · {comparisonVerdict.verdict.toUpperCase()}</small><h4>{comparisonVerdict.headline}</h4><p>{comparisonVerdict.guidance}</p>{comparisonVerdict.regressions.map((item) => <b key={item}>↓ {item}</b>)}{comparisonVerdict.improvements.map((item) => <b key={item}>↑ {item}</b>)}</aside>}
                  <div className="comparison-labels"><span>MEASURE</span><span>ORIGINAL</span><span>PROPOSED</span></div>
                  <div><span>Keepable opening hands (2–4 lands)</span><b>{(originalMetrics.keepableRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.keepableRate * 100).toFixed(1)}%</b></div>
                  <div><span>Average lands in opening seven</span><b>{originalMetrics.averageOpeningLands.toFixed(2)}</b><b>{proposedMetrics.averageOpeningLands.toFixed(2)}</b></div>
                  <div><span>Next draw is a spell after available fetches</span><b>{(originalMetrics.nextSpellRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.nextSpellRate * 100).toFixed(1)}%</b></div>
                  <div><span>Hands able to activate a modeled fetch</span><b>{(originalMetrics.fetchActivationRate * 100).toFixed(1)}%</b><b>{(proposedMetrics.fetchActivationRate * 100).toFixed(1)}%</b></div>
                  <p>Fetch simulations remove one eligible basic from the library, shuffle, and continue drawing. Random mill or exile is not treated as an automatic consistency benefit.</p>
                  {comparisonVerdict?.verdict === "reject" && recommendation.manualChallenges.some((option) => option.proposedDeck && option.proposedDeck !== proposedDeck) && <button className="try-another" onClick={() => { const next = recommendation.manualChallenges.find((option) => option.proposedDeck && option.proposedDeck !== proposedDeck); if (next?.proposedDeck) { setProposedDeck(next.proposedDeck); setComparisonReady(false); } }}>Try another candidate and rerun <span>→</span></button>}
                  <button className="save-experiment" disabled={proposedDeck.trim() === deckText.trim() || comparisonVerdict?.verdict === "reject"} onClick={saveExperiment}>{comparisonVerdict?.verdict === "reject" ? "Rejected · choose another version" : proposedDeck.trim() === deckText.trim() ? "Edit the proposed deck to begin" : comparisonVerdict?.verdict === "inconclusive" ? "Start strategic test anyway" : "Start this experiment"}</button>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      <div className={`feedback-dock ${feedbackOpen ? "open" : ""}`}>
        {!feedbackOpen ? <button onClick={() => setFeedbackOpen(true)}>Send founder feedback</button> : <section aria-label="Send founder feedback">
          <header><div><small>HELP SHAPE THE FORGE</small><h3>Tell Aura what happened.</h3></div><button aria-label="Close feedback" onClick={() => setFeedbackOpen(false)}>×</button></header>
          <label>WHAT KIND OF SIGNAL?<select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)}><option value="broken">Something broke</option><option value="confusing">Recommendation was confusing</option><option value="missed-interaction">Forge missed an interaction</option><option value="helped">This recommendation helped</option><option value="idea">General idea</option></select></label>
          <label>WHAT SHOULD WE KNOW?<textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="Tell us what you expected and what happened…" /></label>
          <p>Deck revision, experiment, Companion version, and non-sensitive connection diagnostics are attached automatically.</p>
          <button className="submit-feedback" disabled={feedbackStatus === "saving" || feedbackMessage.trim().length < 3} onClick={submitFeedback}>{feedbackStatus === "saving" ? "Sending…" : feedbackStatus === "saved" ? "Signal received ✓" : feedbackStatus === "error" ? "Retry feedback" : "Send to the Forge"}</button>
        </section>}
      </div>

      <footer className="shell"><a className="brand" href="#top"><span className="brand-mark">MF</span><span>METAFORGE</span></a><p>Understand the deck. Respect the evidence. Test the change.</p><span>© 2026 MetaForge</span></footer>
    </main>
  );
}

function parseLimitedRows(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, rating, colors, cmc, type] = line.split("|").map((part) => part.trim());
    return { name, rating: Number(rating) || 0, colors: colors && colors !== "C" ? colors.split("").filter((color) => "WUBRG".includes(color)) : [], cmc: Number(cmc) || 0, type: type || "Unknown" };
  }).filter((card) => card.name);
}
