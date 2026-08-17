"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  PLAYER_COMPASS_QUESTIONS,
  emptyPlayerCompass,
  normalizePlayerCompass,
  writeLocalPlayerCompass,
} from "../../player-compass.mjs";

export type PlayerCompassAnswers = {
  pace: string | null;
  risk: string | null;
  interaction: string | null;
  complexity: string | null;
};

export type PlayerCompassState = {
  version: string;
  skipped: boolean;
  completed: boolean;
  answers: PlayerCompassAnswers;
  updatedAt: string | null;
};

type PlayerCompassCardProps = {
  value?: PlayerCompassState | null;
  signedIn?: boolean;
  synced?: boolean;
  onChange: (next: PlayerCompassState) => void;
};

/**
 * Optional one-question-at-a-time Player Compass. Never blocks the Forge.
 * Partial drafts are stored locally but the server ignores them until complete.
 *
 * The question flow renders as a modal (portal to document.body), not
 * inline in the page. The Explore/home chamber is a deliberate fixed-
 * height "framed hero" with no page scroll (site-frame.css), and an
 * inline-expanding card's open state (prompt + description + progress
 * dots + 3 answer buttons + back/skip actions) can be taller than
 * whatever viewport space remains once the hero graphic and heading
 * above it are accounted for - with no ancestor scroll to fall back on,
 * later options and the action buttons could end up permanently below
 * the fold. A modal sits above the page layout entirely, so it never
 * competes with the hero's no-scroll behavior, and the page itself never
 * needs to grow or scroll to accommodate it.
 */
export function PlayerCompassCard({
  value = null,
  signedIn = false,
  synced = false,
  onChange,
}: PlayerCompassCardProps) {
  const current = useMemo(() => normalizePlayerCompass(value || emptyPlayerCompass()), [value]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlayerCompassAnswers>(current.answers);

  const visibleDraft = open ? draft : current.answers;
  const answeredCount = PLAYER_COMPASS_QUESTIONS.filter(
    (question) => visibleDraft[question.id as keyof PlayerCompassAnswers],
  ).length;
  const question = PLAYER_COMPASS_QUESTIONS[Math.min(step, PLAYER_COMPASS_QUESTIONS.length - 1)];
  const currentAnswer = draft[question.id as keyof PlayerCompassAnswers];
  const isLast = step >= PLAYER_COMPASS_QUESTIONS.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function skipRest() {
    const next = writeLocalPlayerCompass(emptyPlayerCompass({ skipped: true }));
    setOpen(false);
    setStep(0);
    onChange(next as PlayerCompassState);
  }

  function saveComplete(answers: PlayerCompassAnswers) {
    const next = writeLocalPlayerCompass({
      skipped: false,
      completed: true,
      answers,
    });
    setOpen(false);
    setStep(0);
    onChange(next as PlayerCompassState);
  }

  function clearAnswers() {
    const next = writeLocalPlayerCompass(emptyPlayerCompass({ skipped: false }));
    setDraft(next.answers as PlayerCompassAnswers);
    setStep(0);
    onChange(next as PlayerCompassState);
  }

  function chooseOption(optionId: string) {
    const nextDraft = { ...draft, [question.id]: optionId };
    setDraft(nextDraft);
    if (isLast) {
      const complete = PLAYER_COMPASS_QUESTIONS.every(
        (entry) => nextDraft[entry.id as keyof PlayerCompassAnswers],
      );
      if (complete) saveComplete(nextDraft);
      return;
    }
    // Persist the incomplete shape as a draft. normalizePlayerCompass keeps
    // it ineligible until all four answers exist.
    const savedDraft = writeLocalPlayerCompass({
      skipped: false,
      completed: false,
      answers: nextDraft,
    });
    onChange(savedDraft as PlayerCompassState);
    setStep((value) => value + 1);
  }

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="player-compass-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div
        className="player-compass-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Player Compass questions"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="player-compass-modal-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <header>
          <small>PLAYER COMPASS · QUESTION {step + 1} OF 4 · DRAFT UNTIL COMPLETE</small>
          <h2>{question.prompt}</h2>
          <p>
            These answers never block the Forge. Preferences stay inactive until all four are answered.
            Your commission remains the strongest instruction.
          </p>
          <div className="player-compass-progress" aria-hidden="true">
            {PLAYER_COMPASS_QUESTIONS.map((entry, index) => (
              <i
                key={entry.id}
                className={index < step || draft[entry.id as keyof PlayerCompassAnswers] ? "is-filled" : index === step ? "is-current" : undefined}
              />
            ))}
          </div>
        </header>

        <div className="player-compass-options" role="radiogroup" aria-label={question.prompt}>
          {question.options.map((option) => {
            const selected = currentAnswer === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? "is-selected" : undefined}
                onClick={() => chooseOption(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="player-compass-actions">
          <button
            type="button"
            className="is-quiet"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            Back
          </button>
          <button type="button" className="is-quiet" onClick={skipRest}>
            Skip the rest
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  if (current.completed && !open) {
    return (
      <>
        <aside className={`player-compass-card is-complete${synced ? " is-synced" : ""}`} aria-label="Player Compass">
          <header>
            <small>{synced ? "PLAYER COMPASS · SAVED · SYNCED" : "PLAYER COMPASS · SAVED"}</small>
            <h2>Your play preferences are set</h2>
            <p>
              MetaForge will use these only after all four answers are complete, and only to distinguish
              otherwise-valid philosophies. Your commission still comes first.
              {!signedIn ? " Sign in to keep them across devices." : null}
            </p>
          </header>
          <div className="player-compass-actions">
            <button
              type="button"
              onClick={() => {
                setDraft(current.answers);
                setStep(0);
                setOpen(true);
              }}
            >
              Change answers
            </button>
            <button type="button" className="is-quiet" onClick={clearAnswers}>
              Clear Compass
            </button>
          </div>
        </aside>
        {modal}
      </>
    );
  }

  if (current.skipped && !open) {
    return (
      <>
        <aside className="player-compass-card is-skipped" aria-label="Player Compass">
          <header>
            <small>PLAYER COMPASS · SKIPPED</small>
            <h2>Help MetaForge learn how you like to play</h2>
            <p>
              You skipped for now, so preferences will not affect recommendations.
              You can answer four quick questions anytime.
            </p>
          </header>
          <div className="player-compass-actions">
            <button type="button" onClick={() => { setDraft(current.answers); setStep(0); setOpen(true); }}>
              Answer the questions
            </button>
          </div>
        </aside>
        {modal}
      </>
    );
  }

  const draftInProgress = answeredCount > 0 && answeredCount < 4 && !current.completed;
  return (
    <>
      <aside className={`player-compass-card${draftInProgress ? " is-draft" : ""}`} aria-label="Player Compass">
        <header>
          <small>{draftInProgress ? "PLAYER COMPASS · DRAFT · NOT ACTIVE YET" : "PLAYER COMPASS · OPTIONAL"}</small>
          <h2>Help MetaForge learn how you like to play</h2>
          <p>
            Answer four quick questions for more personal recommendations.
            Partial answers are saved as a draft only — they do not change recommendations until complete.
            You can skip this or change it later.
          </p>
        </header>
        <div className="player-compass-actions">
          <button
            type="button"
            onClick={() => {
              const firstUnanswered = PLAYER_COMPASS_QUESTIONS.findIndex(
                (entry) => !current.answers[entry.id as keyof PlayerCompassAnswers],
              );
              setDraft(current.answers);
              setStep(firstUnanswered >= 0 ? firstUnanswered : 0);
              setOpen(true);
            }}
          >
            {draftInProgress ? "Continue draft" : "Answer four questions"}
          </button>
          <button type="button" className="is-quiet" onClick={skipRest}>
            Skip for now
          </button>
        </div>
      </aside>
      {modal}
    </>
  );
}
