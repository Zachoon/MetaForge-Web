"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRecommendation, isLand, parseDeck } from "./deck-analysis.mjs";
import { validateDeckLegality } from "./deck-legality.mjs";
import { getMetaIntelligence } from "./meta-intelligence.mjs";
import FORGE_CANDIDATE, { CANDIDATES } from "./forge-candidate.mjs";
import { FORGE_THEORY } from "./forge-theory.mjs";
import { buildFormatContext, evaluateTheoryEvidence } from "./format-intelligence.mjs";
import { createMobileMatchReport } from "./mobile-match-report.mjs";
import { evaluateExperiment } from "./experiment-evidence.mjs";
import { classifyRevealedOpponent } from "./opponent-classifier.mjs";
import { evaluateLastMatchSignal, evaluateMatchupEvidence } from "./adaptive-recommendation.mjs";
import { evaluateOpeningHandComparison, simulateDeck } from "./forge-simulation.mjs";
import { evaluateSimulationGate } from "./goldfish-simulation.mjs";
import { evaluateMatchupMatrix } from "./matchup-simulation.mjs";
import { evaluateDraftPairs, evaluateDraftPick, limitedDeckHealth } from "./limited-buddy.mjs";
import { deckFingerprint } from "./deck-fingerprint.mjs";
import { attachMatches, DECK_BENCH_STORAGE_KEY, emptyDeckBench, mergeDeckBenches, rankedFamilies, readDeckBench, recordExperiment, updateFamily } from "./deck-bench.mjs";
import { extractCoachDeck } from "./coach-actions.mjs";
import { buildPostGameCoach } from "./post-game-coach.mjs";
import { coachingProgress, evaluateIntervention, inferCoachingTarget } from "./coaching-progress.mjs";
import APPROVED_PRO_COACHING from "./pro-coaching-knowledge.mjs";
import { professionalCoachLens } from "./professional-coach.mjs";
import RiftboundForge from "./riftbound-forge";
import { buildPlayerCharacterSheet } from "./player-character-sheet.mjs";

const SAMPLE_DECK = `4 Monastery Swiftspear
4 Slickshot Show-Off
4 Emberheart Challenger
4 Lightning Strike
4 Burst Lightning
4 Torch the Tower
4 Boltwave
2 Witchstalker Frenzy
26 Mountain`;
const REQUIRED_COMPANION_VERSION = "0.3.3";
const SAMPLE_DRAFT_PACK = `Shieldwall Recruit | 3.4 | W | 2 | Creature
Molten Rebuke | 3.7 | R | 2 | Instant
Archive Visionary | 3.5 | U | 3 | Creature
Verdant Colossus | 3.2 | G | 6 | Creature
Grave Bargain | 3.3 | B | 3 | Sorcery`;
export default function Home() {
  const [game, setGame] = useState<"mtg" | "riftbound">("mtg");
  const [reforging, setReforging] = useState(false);
  const meta = getMetaIntelligence();
  const simulationGate = useMemo(() => evaluateSimulationGate(FORGE_CANDIDATE.deck, FORGE_CANDIDATE.strategy, 2000, 8128), []);
  const matchupMatrix = useMemo(() => evaluateMatchupMatrix(FORGE_CANDIDATE.deck, ["Aggro", "Midrange", "Control", "Tempo"], 2000, 991), []);
  const [deckName, setDeckName] = useState("My deck");
  const [format, setFormat] = useState("Standard");
  const [commanderPower, setCommanderPower] = useState("unknown");
  const [commanderBudget, setCommanderBudget] = useState("unspecified");
  const [deckText, setDeckText] = useState("");
  const [draftPack, setDraftPack] = useState(SAMPLE_DRAFT_PACK);
  const [draftPool, setDraftPool] = useState("");
  const [liveDraft, setLiveDraft] = useState<null | { active: boolean; draftId?: string; eventId?: string; packNumber: number; pickNumber: number; picksPerTurn: number; packCards: string[]; pickedCards: string[]; updatedAt?: string; source: string }>(null);
  const [showMetaLab, setShowMetaLab] = useState(false);
  const [showDraftBuddy, setShowDraftBuddy] = useState(false);
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
  const [mobileReportOpen, setMobileReportOpen] = useState(false);
  const [mobileResult, setMobileResult] = useState<"win" | "loss">("win");
  const [mobilePlayDraw, setMobilePlayDraw] = useState("unknown");
  const [mobileMulligans, setMobileMulligans] = useState(0);
  const [mobileOpponent, setMobileOpponent] = useState("Unknown");
  const [arenaMatches, setArenaMatches] = useState<Array<{ id: string; completedAt: string; gamesWon: number; gamesLost: number; result: "win" | "loss"; mulligans: number; deckFingerprint?: string; revealedOpponentCards?: string[]; experimentVariant?: "original" | "proposed" | "unmatched"; source?: string; opponentStrategy?: string; evidenceConfidence?: string }>>([]);
  const [deckBench, setDeckBench] = useState<any>(emptyDeckBench());
  const [accountStatus, setAccountStatus] = useState<"loading" | "synced" | "saving" | "local" | "error">("loading");
  const [accountReady, setAccountReady] = useState(false);
  const [lastAccountSync, setLastAccountSync] = useState<string | null>(null);
  const accountRevision = useRef(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("broken");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [forgeChatOpen, setForgeChatOpen] = useState(false);
  const [forgeChatInput, setForgeChatInput] = useState("");
  const [forgeChatStatus, setForgeChatStatus] = useState<"idle" | "thinking" | "error">("idle");
  const [forgeMessages, setForgeMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([{ role: "assistant", content: "Bring me a deck idea, a confusing pick, or a strategy you want to understand. We’ll forge through it together." }]);
  const [coachingProfile, setCoachingProfile] = useState("");
  const [forgeQuestionsRemaining, setForgeQuestionsRemaining] = useState<number | null>(null);
  const [forgeQuestionsReset, setForgeQuestionsReset] = useState<string | null>(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [characterSheetOpen, setCharacterSheetOpen] = useState(false);
  const [passportShared, setPassportShared] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [postGame, setPostGame] = useState<null | { id: string; result: "win" | "loss"; gamesWon: number; gamesLost: number; mulligans: number; deckFingerprint?: string; revealedOpponentCards?: string[]; turnTelemetry?: { observed: boolean; landPlayTurns: number[]; spellCastTurns: number[]; eventCount: number; coverage: string } }>(null);
  const [postGameRead, setPostGameRead] = useState("");
  const [debriefHistory, setDebriefHistory] = useState<Array<{ matchId: string; read: string; recordedAt: string; deckFingerprint?: string }>>([]);
  const [professionalKnowledge, setProfessionalKnowledge] = useState<any[]>(APPROVED_PRO_COACHING);
  const seenMatch = useRef<string | null>(null);
  const [experiment, setExperiment] = useState<null | {
    id?: string;
    deckName: string;
    originalDeck: string;
    proposedDeck: string;
    status: "testing" | "kept" | "reverted";
    startedAt: string;
    originalFingerprint?: string;
    proposedFingerprint?: string;
    intervention?: { title: string; targetTag: string | null; expectedGain: string; originalFingerprint: string; proposedFingerprint: string; createdAt: string };
  }>(null);

  const rows = useMemo(() => parseDeck(deckText), [deckText]);
  const draftPoolRows = useMemo(() => parseLimitedRows(draftPool), [draftPool]);
  const draftRanking = useMemo(() => evaluateDraftPick(parseLimitedRows(draftPack), draftPoolRows, { pick: draftPoolRows.length + 1 }), [draftPack, draftPoolRows]);
  const draftPairRanking = useMemo(() => evaluateDraftPairs(parseLimitedRows(draftPack), draftPoolRows, { pick: draftPoolRows.length + 1 }), [draftPack, draftPoolRows]);
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
  const formatContext = useMemo(() => buildFormatContext(format, { power: commanderPower, budget: commanderBudget }), [format, commanderPower, commanderBudget]);
  const theoryEvidence = useMemo(() => evaluateTheoryEvidence({ legal: true, copyLimitsPass: true, roleFit: true, supportCount: 16, minimumSupport: 8, earlyInteraction: true }, buildFormatContext("Standard"), {}), []);
  const playerSheet=useMemo(()=>buildPlayerCharacterSheet({matches:arenaMatches as any[],debriefs:debriefHistory}),[arenaMatches,debriefHistory]);

  useEffect(() => {
    const savedGame=window.localStorage.getItem("metaforge.activeGame");
    if(savedGame==="riftbound")setGame("riftbound");
    fetch("/api/account/player-profile",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(data?.profile?.coachingNotes)setCoachingProfile(data.profile.coachingNotes)}).catch(()=>{});
  }, []);

  useEffect(() => {
    if(!coachingProfile)return;
    const timer=window.setTimeout(()=>fetch("/api/account/player-profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:{coachingNotes:coachingProfile,learningStyle:"adaptive"}})}).catch(()=>{}),700);
    return()=>window.clearTimeout(timer);
  },[coachingProfile]);

  function switchGame(next:"mtg"|"riftbound"){
    if(next===game)return;setReforging(true);window.setTimeout(()=>{setGame(next);window.localStorage.setItem("metaforge.activeGame",next);window.scrollTo({top:0,behavior:"smooth"});window.setTimeout(()=>setReforging(false),360)},260);
  }

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
    const synced = arenaMatches.flatMap((match: any) => match.coachDebrief ? [{ matchId: match.id, ...match.coachDebrief, deckFingerprint: match.deckFingerprint }] : []);
    if (!synced.length) return;
    setDebriefHistory((current) => [...new Map([...synced, ...current].map((item) => [item.matchId, item])).values()].slice(0, 100));
  }, [arenaMatches]);

  useEffect(() => {
    const latest = arenaMatches[0];
    if (!latest || arenaStatus !== "connected") return;
    if (seenMatch.current === null) { seenMatch.current = latest.id; return; }
    if (seenMatch.current === latest.id) return;
    seenMatch.current = latest.id;
    setPostGame(latest);
    setPostGameRead("");
  }, [arenaMatches, arenaStatus]);

  useEffect(() => {
    if (arenaMatches.length || !accountReady) return;
    const saved = (deckBench.families || []).flatMap((family: any) => (family.revisions || []).flatMap((revision: any) => revision.matches || []));
    const unique = [...new Map(saved.map((match: any) => [match.id, match])).values()] as typeof arenaMatches;
    if (unique.length) setArenaMatches(unique.sort((left, right) => right.completedAt.localeCompare(left.completedAt)));
  }, [accountReady, deckBench, arenaMatches.length]);

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
        const [matchResponse, draftResponse] = await Promise.all([
          fetch("http://127.0.0.1:17831/matches", { cache: "no-store" }),
          fetch("http://127.0.0.1:17831/draft/current", { cache: "no-store" }),
        ]);
        const [data, draftData] = await Promise.all([matchResponse.json(), draftResponse.json()]);
        setArenaMatches((current) => {
          const mobile = current.filter((match) => match.source === "self-reported-mobile");
          const desktop = Array.isArray(data.matches) ? data.matches.slice().reverse() : [];
          return [...mobile, ...desktop.filter((match: { id: string }) => !mobile.some((saved) => saved.id === match.id))];
        });
        if (draftData?.draft) setLiveDraft(draftData.draft);
      } catch {
        setArenaStatus("offline");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [arenaStatus]);

  useEffect(() => {
    if (!liveDraft?.active) return;
    const asLimitedRows = (cards: string[]) => cards.map((name) => `${name} | 0 | C | 0 | Unknown`).join("\n");
    setDraftPack(asLimitedRows(liveDraft.packCards));
    setDraftPool(asLimitedRows(liveDraft.pickedCards));
    setShowDraftBuddy(true);
  }, [liveDraft?.updatedAt]);

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

  useEffect(() => { setCoachingProfile(window.localStorage.getItem("metaforge.coachingProfile") || ""); setDebriefHistory(JSON.parse(window.localStorage.getItem("metaforge.debriefs") || "[]")); }, []);
  useEffect(() => { fetch(`/api/coach/knowledge?game=mtg&format=${encodeURIComponent(format)}`, { cache:"no-store" }).then((response)=>response.ok?response.json():null).then((data)=>{if(data?.claims)setProfessionalKnowledge(data.claims)}).catch(()=>{}); }, [format]);

  async function sendForgeMessage(contentOverride?: string) {
    const content = (contentOverride ?? forgeChatInput).trim(); if (!content || forgeChatStatus === "thinking") return;
    const next = [...forgeMessages, { role: "user" as const, content }]; setForgeMessages(next); setForgeChatInput(""); setForgeChatStatus("thinking");
    try {
      const response = await fetch("/api/forge/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:next, context:{ deckName, format, deckText, coachingProfile } }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Forge unavailable");
      setForgeMessages((current) => [...current, { role:"assistant", content:result.answer }]); setForgeQuestionsRemaining(result.remaining ?? null); setForgeQuestionsReset(result.resetAt || null); setForgeChatStatus("idle");
    } catch (error) { setForgeMessages((current) => [...current, { role:"assistant", content:error instanceof Error ? error.message : "The Forge could not answer yet." }]); setForgeChatStatus("error"); }
  }

  async function rejectExperimentNow() {
    if (!experiment || !failureReason.trim()) return;
    const failedDeck = experiment.proposedDeck;
    const prompt = `I tested the current revision and it failed immediately. What failed: ${failureReason.trim()}\n\nDo not repeat the previous recommendation. Diagnose the likely cause, explain it briefly, and give me a materially different next experiment with an exact Arena-ready decklist. Failed revision:\n${failedDeck}`;
    decideExperiment("reverted");
    setFailureOpen(false);
    setFailureReason("");
    setForgeChatOpen(true);
    await sendForgeMessage(prompt);
  }

  function saveCoachingProfile(value: string) { setCoachingProfile(value); window.localStorage.setItem("metaforge.coachingProfile", value.slice(0,1000)); }

  function goTo(selector: string) { document.querySelector(selector)?.scrollIntoView({ behavior:"smooth", block:"start" }); }

  async function shareDeckPassport() {
    const leader = benchRankings[0];
    const record = leader?.leader?.evidence;
    const text = `METAFORGE DECK PASSPORT\n${leader?.name || deckName || "Untitled deck"} · ${leader?.format || format}\n${record?.sampleSize ? `${record.wins}–${record.losses} observed record` : "Awaiting measured matches"}\n${experiment ? `Current experiment: ${experiment.deckName} · ${experimentStage}` : "Ready for its next evolution"}\nForged with MetaForge`;
    try { if (navigator.share) await navigator.share({ title:"My MetaForge Deck Passport", text, url:window.location.origin }); else await navigator.clipboard.writeText(`${text}\n${window.location.origin}`); setPassportShared(true); window.setTimeout(()=>setPassportShared(false),1800); } catch { /* Share cancellation leaves the passport open. */ }
  }

  function loadCoachDeck(content: string, compare = false) {
    const proposal = extractCoachDeck(content);
    if (!proposal) return;
    if (compare && cardCount) { setProposedDeck(proposal); setComparisonOpen(true); setComparisonReady(false); }
    else { setDeckText(proposal); setAnalyzed(true); }
    setForgeChatOpen(false);
    window.setTimeout(() => goTo(compare && cardCount ? "#test-bench" : "#forge"), 0);
  }

  function finishPostGame() {
    if (!postGame || !postGameRead) return;
    const record = { matchId: postGame.id, read: postGameRead, recordedAt: new Date().toISOString(), deckFingerprint: postGame.deckFingerprint || experiment?.proposedFingerprint };
    const next = [record, ...debriefHistory].slice(0, 100); setDebriefHistory(next);
    window.localStorage.setItem("metaforge.debriefs", JSON.stringify(next));
    setArenaMatches((current: any) => current.map((match: any) => match.id === postGame.id ? { ...match, coachDebrief: { read: postGameRead, recordedAt: record.recordedAt } } : match));
    setPostGame(null);
  }

  function takePostGameToCoach() {
    if (!postGame || !postGameRead) return;
    const opponent = classifyRevealedOpponent(postGame.revealedOpponentCards).strategy;
    setForgeChatInput(`My last match was ${postGame.gamesWon}–${postGame.gamesLost}${opponent !== "Unknown" ? ` against ${opponent}` : ""}. My immediate read was: ${postGameRead}. Ask me one sharp follow-up question before suggesting anything.`);
    finishPostGame();
    setForgeChatOpen(true);
  }

  function recordMobileMatch() {
    if (!experiment?.proposedFingerprint) return;
    const record = createMobileMatchReport({ result: mobileResult, deckFingerprint: experiment.proposedFingerprint, experimentId: experiment.id, opponentStrategy: mobileOpponent, playDraw: mobilePlayDraw, mulligans: mobileMulligans });
    setArenaMatches((current) => [record, ...current.filter((match) => match.id !== record.id)]);
    setMobileReportOpen(false);
    setMobileMulligans(0);
    setMobileOpponent("Unknown");
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
      intervention: { title: recommendation.title, targetTag: inferCoachingTarget(recommendation), expectedGain: recommendation.expectedGain, originalFingerprint, proposedFingerprint, createdAt: new Date().toISOString() },
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
  const matchupCounts = proposedEvidence.reduce<Record<string, number>>((counts, match) => { const label = match.opponentStrategy || classifyRevealedOpponent(match.revealedOpponentCards).strategy; counts[label] = (counts[label] || 0) + 1; return counts; }, {});
  const matchupSummary = Object.entries(matchupCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(" · ");
  const nextCandidate = experiment ? CANDIDATES[(CANDIDATES.findIndex((candidate) => candidate.name === experiment.deckName) + 1) % CANDIDATES.length] : null;
  const activeCandidate = experiment ? CANDIDATES.find((candidate) => candidate.name === experiment.deckName) : undefined;
  const adaptiveRecommendation = evaluateMatchupEvidence(proposedEvidence, activeCandidate);
  const lastMatchSignal = evaluateLastMatchSignal(proposedEvidence[0], activeCandidate);
  const benchRankings = rankedFamilies(deckBench);
  const experimentStage = !experiment ? "proposed" : experiment.status !== "testing" ? experiment.status : arenaTracking !== "registered" ? "ready" : experimentEvidence.sampleSize === 0 ? "testing" : ["support", "challenge", "retire"].includes(experimentEvidence.decision) ? "decision" : "evidence";
  const postGameInsight = postGameRead && postGame ? buildPostGameCoach({ ...postGame, deckFingerprint: experiment?.proposedFingerprint }, postGameRead, debriefHistory) : null;
  const mastery = coachingProgress(debriefHistory);
  const interventionStatus = evaluateIntervention((experiment as any)?.intervention, debriefHistory);
  const professionalLens = postGameRead ? professionalCoachLens({ format, read:postGameRead, cards:rows.map((row)=>row.name) }, professionalKnowledge) : null;
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

  if(game==="riftbound")return <main className={`game-shell rift-mode ${reforging?"reforging":""}`}>
    <div className="reforge-transition"><span>RECALIBRATING THE FORGE</span></div>
    <nav className="nav shell" aria-label="Main navigation"><a className="brand" href="#top"><span className="brand-mark">MF</span><span>METAFORGE</span></a><div className="game-switcher" aria-label="Choose game"><button onClick={()=>switchGame("mtg")}>MTG</button><button className="active rift" aria-pressed="true">RIFTBOUND <i>ALPHA</i></button></div><button className="nav-cta rift" onClick={()=>document.querySelector(".rift-workspace")?.scrollIntoView({behavior:"smooth"})}>Enter Riftbound Forge</button></nav>
    <RiftboundForge coachingProfile={coachingProfile} setCoachingProfile={setCoachingProfile}/>
  </main>;

  return (
    <main>
      <div className={`reforge-transition ${reforging?"active":""}`}><span>RECALIBRATING THE FORGE</span></div>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="MetaForge home">
          <span className="brand-mark">MF</span>
          <span>METAFORGE</span>
        </a>
        <div className="game-switcher" aria-label="Choose game"><button className="active" aria-pressed="true">MTG</button><button onClick={()=>switchGame("riftbound")}>RIFTBOUND <i>ALPHA</i></button></div>
        <div className="nav-links">
          <button onClick={() => goTo("#cockpit")}>Home</button>
          <button onClick={() => goTo("#forge")}>Forge</button>
          <button onClick={() => goTo("#test-bench")}>Test</button>
          <button onClick={() => setForgeChatOpen(true)}>Coach</button>
          <button onClick={() => goTo("#deck-bench")}>Bench</button>
        </div>
        <button className="nav-cta" onClick={() => document.querySelector("#forge")?.scrollIntoView({ behavior: "smooth" })}>
          Analyze a deck
        </button>
      </nav>

      <section className="return-cockpit shell" id="cockpit" aria-label="Your MetaForge home">
        <header><div><small>YOUR NEXT MOVE</small><h1>{experiment ? `Continue ${experiment.deckName}` : cardCount ? `Improve ${deckName}` : "What will you forge today?"}</h1><p>{experiment ? `${experimentEvidence.sampleSize}/5 matches complete.` : cardCount ? "Your deck is ready." : "Bring a deck or ask Coach to build one."}</p></div><b>{experiment ? experimentStage.toUpperCase() : cardCount ? "READY" : "OPEN"}<span>STATUS</span></b></header>
        <div className="cockpit-actions">
          <button className="primary-path" onClick={() => goTo(experiment ? "#forge-evidence-anchor" : "#forge")}><i>01</i><span><b>{experiment ? "Continue test" : "Forge a deck"}</b><small>{experiment ? `${Math.max(0,5-experimentEvidence.sampleSize)} matches left` : "Get one clear improvement"}</small></span><strong>→</strong></button>
          <button onClick={() => setForgeChatOpen(true)}><i>02</i><span><b>Ask Coach</b><small>Build a deck or ask why</small></span><strong>✦</strong></button>
          <button onClick={() => goTo("#deck-bench")}><i>03</i><span><b>My decks</b><small>{benchRankings.length} decks · {arenaMatches.length} matches</small></span><strong>→</strong></button>
          <button onClick={() => setCharacterSheetOpen(true)}><i>04</i><span><b>Player Character</b><small>{playerSheet.ready?"View your current build":`${Math.max(playerSheet.gamesRemaining,playerSheet.decisionsRemaining)} observations to go`}</small></span><strong>◆</strong></button>
        </div>
        <aside className="mastery-strip"><div><small>FORGE MASTERY</small><b>{mastery.level}</b><span>{mastery.reviewed} games reflected on</span></div><div className="mastery-progress"><i><b style={{width:`${mastery.progress*100}%`}} /></i><span>{mastery.nextAt ? `${mastery.remaining} reflections to ${mastery.level === "Apprentice" ? "Observer" : "the next rank"}` : "Highest mastery rank reached"}</span></div><div><b>{mastery.patternsCaught}</b><span>PATTERNS CAUGHT</span></div><div><b>{mastery.plansConfirmed}</b><span>PLANS CONFIRMED</span></div>{experiment && <div className={`intervention-pulse ${interventionStatus.status}`}><small>ACTIVE COACHING TARGET</small><b>{interventionStatus.label}</b><span>{interventionStatus.detail}</span></div>}</aside>
      </section>

      <section className={`hero shell ${accountReady ? "returning" : ""}`} id="top">
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
          <article><i>01</i><div className="step-icon">＋</div><h3>Add your deck</h3><p>Sign in through the private access page, then paste a list from Arena, MTGO, Moxfield, or your notes. Your Forge account is created automatically.</p></article>
          <article><i>02</i><div className="step-icon">⌁</div><h3>See the pressure points</h3><p>Forge measures composition, consistency, curve, mana, and strategic focus.</p></article>
          <article><i>03</i><div className="step-icon">↗</div><h3>Test a stronger version</h3><p>Compare changes against your original deck and understand every tradeoff.</p></article>
        </div>
      </section>

      <section className="meta-section">
        <div className="shell">
          <div className="section-heading lab-heading"><div><span>OPTIONAL · META LAB</span><h2>Meta breakers, simulations, and Forge Theory.</h2></div><div><p>Advanced research is tucked away so it never blocks the main deck-testing flow.</p><button className="lab-toggle" onClick={() => setShowMetaLab((value) => !value)}>{showMetaLab ? "Close Meta Lab" : "Explore Meta Lab"} <span>{showMetaLab ? "↑" : "↓"}</span></button></div></div>
          {showMetaLab && <>
          <div className="meta-grid">
            <article className="meta-current"><small>NEWEST OBSERVED FIELD · {meta.current.end}</small><h3>{meta.majority ? `${meta.majority} is the current majority` : meta.leadingStrategy ? `${meta.leadingStrategy} leads a mixed field` : "Current majority not established"}</h3><p>{meta.warning || meta.recommendation}</p><div className="confidence-line"><span>CONFIDENCE</span><b>{meta.current.confidence}</b><i>{meta.current.sampleSize} decks · {meta.current.classificationCoverage ? `${(meta.current.classificationCoverage * 100).toFixed(0)}% classified` : "local corpus"}</i></div>{meta.current.provenance && <a className="meta-source" href={meta.current.provenance.url} target="_blank" rel="noreferrer">SOURCE · {meta.current.provenance.name} · observed {meta.current.provenance.observedAt}</a>}</article>
            <article className="meta-historical"><small>HISTORICAL PRIOR · {meta.historicalPrior.start}—{meta.historicalPrior.end}</small><h3>{meta.historicalMajority}-leaning field</h3><p>{meta.historicalPrior.sampleSize} decks provide a high-confidence comparison state—not permission to call it today’s meta.</p><div className="meta-bars">{meta.historicalPrior.strategies.slice(0, 4).map((strategy) => <div key={strategy.name}><span>{strategy.name}</span><i><b style={{ width: `${strategy.share * 100}%` }} /></i><strong>{(strategy.share * 100).toFixed(1)}%</strong></div>)}</div></article>
          </div>
          <p className="meta-method">GENERATOR GATE · {meta.generatorGate.replaceAll("-", " ")} · {meta.method}</p>
          <article className="forge-prototype"><div><small>FORGE RECOMMENDED · META BREAKER</small><h3>{FORGE_CANDIDATE.name}</h3><p>{FORGE_CANDIDATE.reasoning}</p><em>Not a popularity pick: Forge generated this list to attack the measured field, then required format legality, a complete sideboard, supported synergies, and opening-hand consistency before offering it for testing.</em></div><div className="prototype-facts"><span><b>{FORGE_CANDIDATE.strategy}</b>STRATEGY</span><span><b>{FORGE_CANDIDATE.target}</b>FIELD TARGET</span><span><b>{((1 - FORGE_CANDIDATE.novelty) * 100).toFixed(0)}%</b>EST. FIELD OVERLAP</span><span><b>{(FORGE_CANDIDATE.coherence * 100).toFixed(0)}%</b>SYNERGY SUPPORT</span><span><b>FOUNDER TEST</b>VIABILITY GATE</span><span><b>{FORGE_CANDIDATE.rankScore.toFixed(1)}</b>RANK SCORE</span></div><button onClick={() => startForgeCandidate(FORGE_CANDIDATE)}>{candidateCopyStatus}</button></article>
          <article className="forge-theory"><header><div><small>FORGE THEORY · ZERO TOURNAMENT CREDIT ASSUMED</small><h3>{FORGE_THEORY.name}</h3></div><b>{theoryEvidence.stage.replaceAll("-", " ")}</b></header><p><strong>THE THEORY</strong> Mjölnir may convert the Izzet shell’s cheap interaction and flexible threats into repeatable pressure without abandoning its tempo plan. Card design and role fit justify a trial; tournament results do not yet justify confidence.</p><div><span><b>−2 Fire Magic</b>CONTROL VARIABLE</span><span><b>+2 Mjölnir</b>NEW-CARD HYPOTHESIS</span><span><b>Fail if pressure slows</b>REJECTION CONDITION</span><span><b>5 exact matches</b>FIRST REVIEW</span></div><footer><em>{theoryEvidence.warning} Legality, deck size, copy limits, and opening hands must still pass before Arena testing.</em><button onClick={() => startForgeCandidate(FORGE_THEORY)}>Load theory experiment →</button></footer></article>
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
          </>}
        </div>
      </section>

      <section className="draft-buddy-section" id="draft-buddy">
        <div className="shell">
          <div className="section-heading lab-heading"><div><span>OPTIONAL · LIMITED LAB</span><h2>Draft Buddy ranks the pick—and shows its work.</h2></div><div><p>Open this workspace only when you are drafting.</p><button className="lab-toggle" onClick={() => setShowDraftBuddy((value) => !value)}>{showDraftBuddy ? "Close Draft Buddy" : "Open Draft Buddy"} <span>{showDraftBuddy ? "↑" : "↓"}</span></button></div></div>
          {showDraftBuddy && <>
          <aside className={`draft-sensor ${liveDraft?.active ? "active" : "waiting"}`}><div><small>ARENA COMPANION · AUTOMATIC DRAFT SENSOR</small><h3>{liveDraft?.active ? `Pack ${liveDraft.packNumber || "?"} · Pick ${liveDraft.pickNumber || "?"} detected` : arenaStatus === "connected" ? "Watching Arena for a draft pack…" : "Connect Arena to enable automatic pack reading."}</h3></div><b>{liveDraft?.active ? `${liveDraft.packCards.length} CARDS READ` : arenaStatus === "connected" ? "ARMED" : "OFFLINE"}</b></aside>
          <div className="draft-buddy-grid">
            <label>PACK<textarea value={draftPack} onChange={(event) => setDraftPack(event.target.value)} /></label>
            <label>CURRENT POOL<textarea value={draftPool} onChange={(event) => setDraftPool(event.target.value)} placeholder="Add previous picks here, one card per line…" /></label>
            <aside><small>{liveDraft?.picksPerTurn === 2 ? "LIVE PAIR ORDER" : "LIVE PICK ORDER"} · PICK {liveDraft?.pickNumber || draftPoolRows.length + 1}</small>{liveDraft?.picksPerTurn === 2 ? draftPairRanking.slice(0, 5).map((pair, index) => <article key={`${pair.cards[0].name}-${pair.cards[1].name}`}><i>0{index + 1}</i><div><b>{pair.cards.map((card) => card.name).join(" + ")}</b><span>TWO-CARD PACKAGE</span><em>{pair.reasons.join(" · ")}</em></div><strong>{pair.score.toFixed(1)}</strong></article>) : draftRanking.slice(0, 5).map((card, index) => <article key={`${card.name}-${index}`}><i>0{index + 1}</i><div><b>{card.name}</b><span>{card.colors?.join("") || "C"} · {card.cmc} mana · {card.type}</span><em>{card.reasons.join(" · ")}</em></div><strong>{card.score.toFixed(1)}</strong></article>)}<footer><b>{liveDraft?.picksPerTurn === 2 ? "Pick-Two mode · combinations evaluated" : "Pick-One mode"} · {draftHealth.creatures} creatures · {draftHealth.early} early plays</b><span>{draftHealth.warnings.length ? draftHealth.warnings.join(" ") : "Pool fundamentals are currently on track."}</span></footer></aside>
          </div>
          <p className="draft-disclaimer">Private development preview: Companion v0.3 reads pack and pick events from Arena Detailed Logs automatically. Unknown card metadata is never invented; set-specific ratings, visual fallback, and live recommendations remain gated until validated and authorized.</p>
          </>}
        </div>
      </section>

      <section className="forge-section" id="forge">
        <div className="shell forge-shell">
          <div className="forge-heading"><div><span>THE FORGE</span><h2>Paste your deck.</h2></div><p>Get one change worth testing.</p></div>
          <section className={`account-center ${accountStatus}`} aria-label="Your Forge account">
            <div><small>YOUR FORGE ACCOUNT · CREATED THROUGH PRIVATE SIGN-IN</small><h3>{accountStatus === "synced" ? "Account active and synchronized." : accountStatus === "loading" || accountStatus === "saving" ? "Connecting your protected account…" : "Local safety copy active."}</h3><p>{accountStatus === "synced" ? `Your Deck Bench, versions, and match evidence are attached to this signed-in identity${lastAccountSync ? ` · last synchronized ${new Date(lastAccountSync).toLocaleString()}` : ""}.` : "MetaForge always keeps a browser copy. Account synchronization will retry without deleting local work."}</p></div><div><b>{accountStatus === "synced" ? "SYNCED" : accountStatus.toUpperCase()}</b><button onClick={() => document.querySelector("#deck-bench")?.scrollIntoView({ behavior: "smooth" })}>Open my saved decks</button></div>
          </section>
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
                  <button className="failed-now" onClick={() => setFailureOpen(true)}>This failed. Try something else.</button>
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
              <a href="/downloads/MetaForge-Arena-Companion-Windows-v0.3.2.zip" download>Download companion v0.3.2 · Windows</a>
              <button onClick={connectArena} disabled={arenaStatus === "connecting"}>{arenaStatus === "connected" ? "Arena connected" : arenaStatus === "connecting" ? "Connecting…" : "Connect Arena"}</button>
              <button className="mobile-report-trigger" onClick={() => setMobileReportOpen((value) => !value)} disabled={!experiment?.proposedFingerprint}>{mobileReportOpen ? "Close mobile check-in" : "Record a mobile match"}</button>
              <small>Founder build · local-only data · Windows may ask you to confirm the unsigned app.</small>
            </div>
          </aside>
          {mobileReportOpen && experiment?.proposedFingerprint && <section className="mobile-match-report" aria-label="Record a mobile Arena match"><header><div><small>MOBILE ARENA · SELF-REPORTED EVIDENCE</small><h3>How did this exact deck version perform?</h3><p>{experiment.deckName} · revision {experiment.proposedFingerprint.slice(0, 8)}</p></div><button onClick={() => setMobileReportOpen(false)}>×</button></header><div><label>RESULT<select value={mobileResult} onChange={(event) => setMobileResult(event.target.value as "win" | "loss")}><option value="win">Win</option><option value="loss">Loss</option></select></label><label>PLAY / DRAW<select value={mobilePlayDraw} onChange={(event) => setMobilePlayDraw(event.target.value)}><option value="unknown">Not sure</option><option value="play">On the play</option><option value="draw">On the draw</option></select></label><label>MULLIGANS<input type="number" min="0" max="9" value={mobileMulligans} onChange={(event) => setMobileMulligans(Number(event.target.value))} /></label><label>OPPONENT STYLE<select value={mobileOpponent} onChange={(event) => setMobileOpponent(event.target.value)}><option>Unknown</option><option>Aggro</option><option>Midrange</option><option>Control</option><option>Tempo</option><option>Ramp</option><option>Combo</option></select></label></div><p>This check-in is attached only to the selected revision and labeled self-reported. Missing mobile games are never counted as losses.</p><button className="submit-mobile-match" onClick={recordMobileMatch}>Save mobile match →</button></section>}
          {arenaMatches.length > 0 && (
            <section className="arena-history" aria-label="Arena match history">
              <div className="arena-history-heading"><div><small>PERSONAL PLAY EVIDENCE</small><h3>Recent Arena matches</h3></div><span>{arenaMatches.filter((match) => match.result === "win").length}–{arenaMatches.filter((match) => match.result === "loss").length}</span></div>
              <div className="arena-match-list">{arenaMatches.slice(0, 8).map((match) => { const opponent = match.opponentStrategy ? { strategy: match.opponentStrategy, confidence: "self-reported" } : classifyRevealedOpponent(match.revealedOpponentCards); return <article key={match.id} className={match.result}><b>{match.result === "win" ? "WIN" : "LOSS"}</b><span>{match.gamesWon}–{match.gamesLost} games</span><span>{opponent.strategy} · {opponent.confidence}</span><time>{new Date(match.completedAt).toLocaleString()}</time></article>; })}</div>
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
              <section className={`format-context ${format.toLowerCase()}`}><header><span>{format.toUpperCase()} INTELLIGENCE PROFILE</span><small>{formatContext.priorities.join(" · ")}</small></header>{format === "Commander" && <div><label>POD POWER<select value={commanderPower} onChange={(event) => setCommanderPower(event.target.value)}><option value="unknown">Choose a target</option><option value="casual">Casual</option><option value="upgraded">Upgraded</option><option value="high-power">High power</option><option value="cedh">cEDH</option></select></label><label>BUDGET TARGET<input value={commanderBudget} onChange={(event) => setCommanderBudget(event.target.value)} placeholder="Example: $150 or no limit" /></label></div>}{formatContext.warning && <p>{formatContext.warning}</p>}</section>
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
                  <article className="finding"><small>FORGE PICK</small><h4>{recommendation.title}</h4><p>{recommendation.summary}</p><details className="why-drawer"><summary>Why this change?</summary><p>{recommendation.reasoning}</p>{recommendation.guardrail && <p><b>Keep working:</b> {recommendation.guardrail}</p>}</details></article>
                  <div className="strategy-contract"><div><span>YOU GAIN</span><p>{recommendation.expectedGain}</p></div><div><span>WATCH FOR</span><p>{recommendation.risk}</p></div><div><span>TEST IT</span><p>{recommendation.testPlan.instruction}</p></div></div>
                  {recommendation.mechanics?.landfall_payoff > 0 && <div className="mechanic-tradeoff"><span>LANDFALL ENGINE CHECK</span><div><b>{recommendation.mechanics.payoffCount}</b><small>PAYOFF CARDS</small></div><div><b>{recommendation.mechanics.fetchCount}</b><small>FETCH LANDS</small></div><div><b>{recommendation.mechanics.slowFetchCount}</b><small>ALWAYS TAPPED</small></div><div><b>{recommendation.mechanics.posture.replaceAll("-", " ")}</b><small>ENGINE STATUS</small></div></div>}
                  {recommendation.changes.length > 0 && <div className="change-set"><span>PROPOSED CHANGE</span>{recommendation.changes.map((change) => <b key={`${change.card}-${change.quantity}`} className={change.quantity > 0 ? "add" : "remove"}>{change.quantity > 0 ? "+" : ""}{change.quantity} {change.card}</b>)}</div>}
                  <div className="named-alternatives"><span>RUNNER-UP TESTS</span>{recommendation.manualChallenges.map((option) => <button key={option.card} disabled={!option.proposedDeck} onClick={() => prepareNamedAlternative(option)}><b>{option.add ? `−1 ${option.card} · +1 ${option.add}` : `Challenge ${option.card}`}</b><small>{option.reason}</small></button>)}</div>
                  <div className="next-test"><span>CHOOSE</span><div className="experiment-choice"><button onClick={() => prepareComparison("forge")} disabled={!recommendation.changes.length}>{recommendation.changes.length ? "Use Forge's change" : "No safe swap found"} <b>→</b></button><button onClick={() => prepareComparison("manual")}>Make my own change <b>→</b></button></div></div>
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
                  <details className="why-drawer"><summary>How was this tested?</summary><p>Both decks drew the same simulated hands. Fetch lands remove the land they find; random mill and exile do not count as free consistency.</p></details>
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

      {postGame && <div className="postgame-backdrop" role="dialog" aria-modal="true" aria-label="Post-game debrief"><article className={`postgame-card ${postGame.result}`}><header><div><small>MATCH COMPLETE · {postGame.result.toUpperCase()}</small><h2>{postGame.result === "win" ? "Lock in what worked." : "Catch the lesson while it's fresh."}</h2><p>{postGame.gamesWon}–{postGame.gamesLost} · {postGame.mulligans ? `${postGame.mulligans} mulligan${postGame.mulligans === 1 ? "" : "s"}` : "kept the opener"}. One game is a clue, not a verdict.</p></div><button onClick={() => setPostGame(null)} aria-label="Skip debrief">×</button></header><span>WHAT DEFINED THAT GAME?</span><div className="postgame-reads">{["My mana", "Their speed", "I ran out of cards", "I lacked an answer", "My plan worked", "I misplayed", "I'm not sure"].map((read) => <button key={read} className={postGameRead === read ? "selected" : ""} onClick={() => setPostGameRead(read)}>{read}</button>)}</div>{postGameInsight && <aside className={postGameInsight.urgency}><b>{postGameInsight.headline}</b>{postGameInsight.observedFact && <em>{postGameInsight.observedFact}</em>}<p>{postGameInsight.pattern} {postGameInsight.action}</p><small>{postGameInsight.reviewed} games debriefed · {postGameInsight.nextReviewIn || 5} until the next coaching review</small></aside>}{professionalLens && <details className="pro-lens"><summary>Professional coaching lens · {professionalLens.confidence}</summary><b>{professionalLens.principle}</b><p>{professionalLens.summary}{professionalLens.disagreement ? " Professionals disagree on when this applies." : ""}</p>{professionalLens.sources.map((source)=><a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noreferrer">{source.author} · {source.sourceTitle}</a>)}</details>}<footer><button disabled={!postGameRead} onClick={finishPostGame}>Save and keep testing</button><button disabled={!postGameRead} onClick={takePostGameToCoach}>Talk it through with Coach</button>{experiment && <button onClick={() => { setPostGame(null); setFailureOpen(true); }}>This version failed</button>}</footer></article></div>}

      {failureOpen && experiment && <div className="failure-backdrop" role="dialog" aria-modal="true" aria-label="Report a failed experiment"><article className="failure-dialog"><header><div><small>QUICK COURSE CORRECTION</small><h2>What failed?</h2><p>One sentence is enough. Forge will retire this version and build a different test.</p></div><button onClick={() => setFailureOpen(false)} aria-label="Close">×</button></header><div className="failure-chips">{["Too slow", "Could not cast my cards", "Ran out of cards", "Could not stop their threats", "My combo never came together", "The matchup exposed a weakness"].map((reason) => <button key={reason} className={failureReason === reason ? "selected" : ""} onClick={() => setFailureReason(reason)}>{reason}</button>)}</div><label>TELL FORGE WHAT YOU SAW<textarea autoFocus value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Example: I was dead before the new card mattered, and my hand had no early interaction." /></label><footer><button onClick={rejectExperimentNow} disabled={!failureReason.trim()}>Retire it and forge another →</button><small>Uses one Coach question. Your failed version stays in its deck history.</small></footer></article></div>}

      {passportOpen && <div className="passport-backdrop" role="dialog" aria-modal="true" aria-label="Deck Passport"><article className="deck-passport">
        <header><div><small>METAFORGE · DECK PASSPORT</small><h2>{benchRankings[0]?.name || deckName || "Untitled deck"}</h2><p>{benchRankings[0]?.format || format} · forged identity</p></div><button onClick={() => setPassportOpen(false)} aria-label="Close passport">×</button></header>
        <div className="passport-seal"><span>MF</span><b>{benchRankings[0]?.leader?.evidence?.sampleSize ? `${benchRankings[0].leader.evidence.wins}–${benchRankings[0].leader.evidence.losses}` : "NEW"}</b><small>{benchRankings[0]?.leader?.evidence?.sampleSize ? "MEASURED RECORD" : "AWAITING MATCHES"}</small></div>
        <section><div><small>STRATEGY IDENTITY</small><b>{recommendation?.title || "Identity developing"}</b></div><div><small>VERSIONS FORGED</small><b>{benchRankings[0]?.revisions?.length || (experiment ? 1 : 0)}</b></div><div><small>CURRENT PHASE</small><b>{experiment ? experimentStage.replaceAll("-", " ") : "Ready to forge"}</b></div></section>
        <p>{experiment ? `Currently testing ${experiment.deckName}. Every exact match adds evidence to this deck's story.` : "Bring this deck into the Forge to discover its next measurable evolution."}</p>
        <footer><button onClick={shareDeckPassport}>{passportShared ? "Passport copied ✓" : "Share Passport"}</button><button onClick={() => setPassportOpen(false)}>Back to Forge</button></footer>
      </article></div>}

      {characterSheetOpen&&<div className="passport-backdrop" role="dialog" aria-modal="true" aria-label="Player Character Sheet"><article className="player-character-sheet"><header><div><small>METAFORGE · PLAYER DNA</small><h2>Your Character Sheet</h2><p>One player across every forge. Traits move only when observed decisions earn the evidence.</p></div><button onClick={()=>setCharacterSheetOpen(false)} aria-label="Close character sheet">×</button></header>{!playerSheet.ready&&<aside><b>CHARACTER STILL FORMING</b><p>Forge needs {playerSheet.gamesRemaining} more tracked game{playerSheet.gamesRemaining===1?"":"s"} and {playerSheet.decisionsRemaining} more observable decision{playerSheet.decisionsRemaining===1?"":"s"}. Wins and losses alone never become personality traits.</p></aside>}<section>{playerSheet.traits.map(trait=><div key={trait.key} className={trait.confidence}><header><b>{trait.label}</b><small>{trait.confidence} · {trait.evidence} signals</small></header><i><span style={{width:`${trait.value}%`}}/></i><footer><em>{trait.low}</em><strong>{trait.confidence==="unobserved"?"?":trait.value}</strong><em>{trait.high}</em></footer></div>)}</section><footer><span><b>{playerSheet.games}</b>TRACKED GAMES</span><span><b>{playerSheet.decisionEvidence}</b>DECISION SIGNALS</span><button onClick={()=>setCharacterSheetOpen(false)}>Return to Forge</button></footer></article></div>}

      <div className="workspace-mode-rail" aria-label="Workspace shortcuts"><button onClick={() => goTo("#cockpit")}><b>⌂</b>Home</button><button onClick={() => goTo("#forge")}><b>◇</b>Forge</button><button onClick={() => goTo("#test-bench")}><b>△</b>Test</button><button onClick={() => setForgeChatOpen(true)}><b>✦</b>Coach</button><button onClick={() => goTo("#deck-bench")}><b>▤</b>Bench</button></div>

      <div className={`forge-chat-dock ${forgeChatOpen ? "open" : ""}`}>
        {!forgeChatOpen ? <button onClick={() => setForgeChatOpen(true)}><span>✦</span> Talk to the Forge</button> : <section aria-label="Talk to the Forge">
          <header><div><small>METAFORGE COACH · PERSONAL WORKSHOP</small><h3>Ask deeper. Build stranger. Learn faster.</h3></div><button aria-label="Close Forge conversation" onClick={() => setForgeChatOpen(false)}>×</button></header>
          <details className="coach-profile"><summary>How should Forge coach me?</summary><textarea value={coachingProfile} onChange={(event) => saveCoachingProfile(event.target.value)} placeholder="Competitive, prefers proactive midrange, explain the math, $150 budget…" /><small>Saved in this browser and sent only with your questions.</small></details>
          <div className="forge-conversation">{forgeMessages.map((message,index) => { const proposal = message.role === "assistant" ? extractCoachDeck(message.content) : null; return <article key={index} className={message.role}><b>{message.role === "assistant" ? "FORGE" : "YOU"}</b><p>{message.content}</p>{proposal && <div className="coach-deck-actions"><button onClick={() => loadCoachDeck(message.content)}>Load into Forge</button>{cardCount > 0 && <button onClick={() => loadCoachDeck(message.content, true)}>Compare with my deck</button>}</div>}</article>})}{forgeChatStatus === "thinking" && <article className="assistant thinking"><b>FORGE</b><p>Reading the grain of the deck…</p></article>}</div>
          <div className="forge-prompts"><button onClick={() => setForgeChatInput("Build me a fun deck around this idea, then explain the weak points.")}>Build an idea</button><button onClick={() => setForgeChatInput("Explain this recommendation and its runner-up in more depth.")}>Explain the why</button><button onClick={() => setForgeChatInput("What does my current deck say about my preferred play style?")}>Read my style</button></div>
          <footer><textarea value={forgeChatInput} onChange={(event) => setForgeChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendForgeMessage(); } }} placeholder="Ask about a deck, pick, matchup, mechanic, or wild theory…" /><button disabled={!forgeChatInput.trim() || forgeChatStatus === "thinking" || forgeQuestionsRemaining === 0} onClick={() => sendForgeMessage()}>Forge answer →</button><small>{forgeQuestionsRemaining === null ? "Founder unlimited · buddies receive 10 questions weekly" : `${forgeQuestionsRemaining} of 10 questions remaining${forgeQuestionsReset ? ` · resets ${new Date(forgeQuestionsReset).toLocaleDateString()}` : ""}`} · not automatic global training</small></footer>
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
