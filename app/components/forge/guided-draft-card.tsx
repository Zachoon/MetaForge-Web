"use client";
import { useState } from "react";
import { useForgeSession } from "../../forge-session-context";

function buildLabel(draft: { commander?: { name?: string }; session?: { accepted?: unknown[] } } | null | undefined) {
  const name = draft?.commander?.name || "Your commander";
  const picks = draft?.session?.accepted?.length || 0;
  return `${name} · ${picks} ${picks === 1 ? "card" : "cards"} picked`;
}

export function GuidedDraftCard() {
  const { chamber, guidedAvailableDraft, guidedConflict, guidedClaimChoice, resolveGuidedClaimChoice, guidedLoading, guidedSaveStatus, resumeGuidedDraft, resolveGuidedConflict, discardGuidedDraft, exportGuidedPicks, guidedSession } = useForgeSession();
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setError("");
    try { await action(); setDiscarding(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Reconnect and try again. Your build is kept."); }
  };
  if (guidedClaimChoice) {
    const finishing = guidedClaimChoice.account?.phase === "completing";
    return <aside className="guided-draft-card" aria-label="Choose a guided build">
      <h2>Two guided builds need a decision</h2>
      <p>This account already has a build in progress ({buildLabel(guidedClaimChoice.account?.draft)}). The build you started before signing in is still here ({buildLabel(guidedClaimChoice.guestDraft)}). Choose which one to keep. Nothing is overwritten until you do.</p>
      {finishing && <p>The account build is finishing, so it can&apos;t be replaced until that result is saved.</p>}
      {error && <p role="alert">{error}</p>}
      <div>
        <button disabled={guidedLoading} onClick={() => void run(() => resolveGuidedClaimChoice(false))}>Keep the account build</button>
        <button disabled={guidedLoading || finishing} onClick={() => void run(() => resolveGuidedClaimChoice(true))}>Keep the guest build</button>
      </div>
    </aside>;
  }
  if (!guidedConflict && (!guidedAvailableDraft || guidedSession || chamber === "forging")) return null;
  return <aside className="guided-draft-card" aria-label="Saved guided build">
    <h2>{guidedConflict ? "Two copies of your build need a decision" : "Your guided build is saved"}</h2>
    <p>{guidedConflict ? "Keep this device’s picks or use the account copy. Neither copy will be overwritten until you choose." : `${guidedAvailableDraft?.draft?.commander?.name || "Your commander"} · ${guidedAvailableDraft?.draft?.session?.accepted?.length || 0} cards picked. Resume your choices, or explicitly discard them to start again.`}</p>
    <p role="status">{guidedSaveStatus}</p>
    {error && <p role="alert">{error}</p>}
    <div>
      {guidedConflict ? <>
        <button disabled={guidedLoading} onClick={() => void run(() => resolveGuidedConflict(true))}>Use account copy</button>
        <button disabled={guidedLoading || guidedConflict.phase === "completing"} onClick={() => void run(() => resolveGuidedConflict(false))}>Keep this device’s copy</button>
      </> : <>
        <button disabled={guidedLoading} onClick={() => void run(() => resumeGuidedDraft())}>Resume build</button>
        {discarding ? <>
          <button disabled={guidedLoading || guidedAvailableDraft?.phase === "completing"} onClick={() => void run(discardGuidedDraft)}>Yes, discard saved build</button>
          <button onClick={() => setDiscarding(false)}>Keep it</button>
        </> : <button onClick={() => setDiscarding(true)}>Start over…</button>}
      </>}
      <button onClick={exportGuidedPicks}>Export picks</button>
    </div>
  </aside>;
}
