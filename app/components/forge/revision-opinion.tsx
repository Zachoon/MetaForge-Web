"use client";

import { useCallback, useEffect, useState } from "react";

export type RevisionOpinionPresentation = {
  headline: string;
  answer: string;
  why: string;
  strongestCounterargument: string;
  confidence: { level?: string; score?: number };
  applicableWhen?: string[];
  whatWouldChangeMyMind?: string[];
  proposedTest?: { instruction?: string; minimumComparableObservations?: number };
};

export type RevisionOpinionResponse = {
  version?: string;
  writesToBrain?: boolean;
  constructionReadOnly?: boolean;
  eligible: boolean;
  reason?: string | null;
  revision?: {
    familyId?: string;
    revisionId?: string;
    fingerprint?: string | null;
    commanderName?: string;
    subject?: string;
  } | null;
  question?: { opinionKey?: string; prompt?: string } | null;
  cardIdentity?: unknown;
  presentation?: RevisionOpinionPresentation | null;
  lineage?: { opinionId?: string; revision?: number; archived?: boolean } | null;
  error?: string;
};

export type RevisionOpinionPanelProps = {
  occupancyEngines?: string[];
  familyId: string | null;
  /** Server-owned revision id when present on the saved Bench row. */
  revisionId?: string | null;
  /** Preferred exact-revision handle — Bench rows often identify by fingerprint. */
  fingerprint?: string | null;
  signedIn: boolean;
  enabled?: boolean;
};

type PanelStatus =
  | "idle"
  | "needs_auth"
  | "needs_saved_revision"
  | "loading"
  | "ready"
  | "ineligible"
  | "auth_failed"
  | "error";

export function revisionOpinionReasonMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "no_registered_question":
      return "No registered Mentor question applies to this exact revision yet. MetaForge will not invent one from a card name.";
    case "stale_or_missing_revision":
      return "This revision is stale or missing from your saved Bench. Reopen or re-save the deck, then ask again.";
    case "family_not_found":
      return "That deck is not on this account’s saved Bench.";
    case "revision_required":
      return "MetaForge needs an exact saved revision before it can form a stance.";
    case "bench_not_found":
      return "No saved Deck Bench was found for this account yet.";
    case "subject_not_in_revision":
      return "The registered subject card is not in this exact revision.";
    case "commission_not_eligible":
      return "This revision’s commission does not qualify for the registered Mentor question.";
    case "unsupported_game_or_format":
      return "Exact-revision Mentor opinions are available for Commander lists only right now.";
    default:
      return "MetaForge could not attach a Mentor opinion to this exact revision.";
  }
}

export function revisionOpinionStanceTone(headline = ""): "recommend" | "against" | "lean" | "unresolved" {
  const text = String(headline || "");
  if (/leans against|leans toward/i.test(text)) return "lean";
  if (/recommends against/i.test(text)) return "against";
  if (/does not have enough separation|unresolved/i.test(text)) return "unresolved";
  if (/recommends this|leans toward/i.test(text)) return "recommend";
  return "unresolved";
}

/**
 * Player-facing Mentor surface for Opinion Engine v0.4.
 * Consumes server eligibility only — never constructs opinionKey from card or commander names.
 */
export function RevisionOpinionPanel({
  familyId,
  revisionId = null,
  fingerprint = null,
  signedIn,
  enabled = true,
}: RevisionOpinionPanelProps) {
  const revisionRef = String(revisionId || fingerprint || "").trim();
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [payload, setPayload] = useState<RevisionOpinionResponse | null>(null);

  const requestOpinion = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    if (!signedIn) {
      setStatus("needs_auth");
      setPayload(null);
      return;
    }
    if (!familyId || !revisionRef) {
      setStatus("needs_saved_revision");
      setPayload(null);
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/coach/revision-opinion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          familyId,
          ...(revisionId ? { revisionId } : {}),
          ...(fingerprint ? { fingerprint } : {}),
        }),
      });
      if (response.status === 401) {
        setStatus("auth_failed");
        setPayload(null);
        return;
      }
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const body = (await response.json()) as RevisionOpinionResponse;
      setPayload(body);
      if (!body.eligible || !body.presentation) {
        setStatus("ineligible");
        return;
      }
      setStatus("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    }
  }, [enabled, signedIn, familyId, revisionRef, revisionId, fingerprint]);

  useEffect(() => {
    if (!enabled || !signedIn || !familyId || !revisionRef) return;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => void requestOpinion(controller.signal));
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [enabled, signedIn, familyId, revisionRef, requestOpinion]);

  if (!enabled) return null;

  const visibleStatus: PanelStatus = !signedIn
    ? "needs_auth"
    : !familyId || !revisionRef
      ? "needs_saved_revision"
      : status;

  // Players only see the Mentor when it actually has an opinion about this
  // deck. Every other state (not signed in, unsaved, loading, failed, or no
  // registered question for this revision) used to render a panel of
  // eligibility and pipeline language with nothing to act on, and the
  // registered subject card could show even when it isn't in the deck. Those
  // states stay quiet here; the server still decides eligibility, and the
  // reasons remain available via revisionOpinionReasonMessage. The boundary
  // is unchanged:
  //   - the browser never invents a question from a card or commander name;
  //   - the Mentor WRITES TO BRAIN: FALSE (see the data attribute below);
  //   - commander occupancy engines are never presented as the Mentor stance.
  const presentation = payload?.presentation || null;
  if (visibleStatus !== "ready" || !presentation) return null;

  const question = payload?.question?.prompt || "Why is this card here—and should I keep it?";
  const tone = revisionOpinionStanceTone(presentation.headline || "");
  const confidence = String(presentation.confidence?.level || "unknown").toUpperCase();
  const subject = payload?.revision?.subject;

  return (
    <section
      className="revision-opinion"
      id="revision-opinion"
      aria-label="Mentor opinion about this deck"
      data-writes-to-brain="false"
    >
      <header className="revision-opinion-header">
        <div>
          <small>MENTOR · ABOUT THIS VERSION OF YOUR DECK</small>
          <h2>{question}</h2>
        </div>
        {subject && <b>{subject.toUpperCase()}</b>}
      </header>

        <article className={`revision-opinion-verdict is-${tone}`}>
          <small>{confidence} CONFIDENCE</small>
          <h3>{presentation.headline}</h3>
          <p className="revision-opinion-answer">{presentation.answer}</p>
          <dl className="revision-opinion-facts">
            <div>
              <dt>Why</dt>
              <dd>{presentation.why}</dd>
            </div>
            <div>
              <dt>Strongest objection</dt>
              <dd>{presentation.strongestCounterargument}</dd>
            </div>
            <div>
              <dt>Applicable context</dt>
              <dd>
                {(presentation.applicableWhen || []).length
                  ? presentation.applicableWhen!.join(" · ")
                  : "Bound to this saved revision and its commission."}
              </dd>
            </div>
            <div>
              <dt>What changes the opinion</dt>
              <dd>
                {(presentation.whatWouldChangeMyMind || []).length
                  ? presentation.whatWouldChangeMyMind!.join(" · ")
                  : "More applicable exact-revision evidence."}
              </dd>
            </div>
            {presentation.proposedTest?.instruction && (
              <div>
                <dt>Suggested test</dt>
                <dd>
                  {presentation.proposedTest.instruction}
                  {presentation.proposedTest.minimumComparableObservations
                    ? ` (at least ${presentation.proposedTest.minimumComparableObservations} comparable observations)`
                    : ""}
                </dd>
              </div>
            )}
          </dl>
          <footer>
            <button type="button" onClick={() => void requestOpinion()}>
              Ask again
            </button>
          </footer>
        </article>
    </section>
  );
}
