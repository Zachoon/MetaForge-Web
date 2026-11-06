"use client";

import { useEffect, useState } from "react";
import {
  BRACKET_SETTINGS,
  INTENT_CHIPS,
  coachForIntent,
  normalizeDeckIntent,
  shouldShowIntentPrompt,
  tierForIntent,
} from "../../deck-intent.mjs";
import type { ComparedCard, OwnPickComparison, SlotComparison } from "../../forge-session-context";
import { ForgeProp } from "../tripo-assets";

type IntentState = {
  chip: string | null;
  bracket: "2" | "3" | "4" | "5" | null;
  tier: string | null;
  dismissed: boolean;
  prompts: "on" | "off";
};

const STORAGE_PREFIX = "metaforge-deck-intent:";
const PROMPT_KEY = "metaforge-intent-prompts";

function readIntent(deckKey: string): IntentState {
  if (typeof window === "undefined" || !deckKey) return normalizeDeckIntent(null) as IntentState;
  try {
    const stored = normalizeDeckIntent(JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}${deckKey}`) || "null"));
    const prompts = window.localStorage.getItem(PROMPT_KEY) === "off" ? "off" : stored.prompts;
    return normalizeDeckIntent({ ...stored, prompts }) as IntentState;
  } catch {
    return normalizeDeckIntent(null) as IntentState;
  }
}

function writeIntent(deckKey: string, intent: IntentState) {
  if (typeof window === "undefined" || !deckKey) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${deckKey}`, JSON.stringify(intent));
    window.localStorage.setItem(PROMPT_KEY, intent.prompts === "off" ? "off" : "on");
  } catch { /* storage unavailable: the choice still applies this visit */ }
}

type Moment = {
  categoryLabel: string;
  added: ComparedCard | null;
  passed: ComparedCard[];
  differentRole: string | null;
};

function momentFromOwn(categoryLabel: string, comparison: OwnPickComparison): Moment | null {
  if (!comparison?.ranked?.length) return null;
  const added = comparison.ranked.find((card) => card.picked) || comparison.ranked.find((card) => card.name === comparison.addedName) || null;
  return {
    categoryLabel,
    added,
    passed: comparison.ranked.filter((card) => card !== added),
    differentRole: comparison.differentRole,
  };
}

function momentFromPair(categoryLabel: string, comparison: SlotComparison): Moment | null {
  if (!comparison?.runnerUp) return null;
  return {
    categoryLabel,
    added: comparison.runnerUp,
    passed: [comparison.winner],
    differentRole: comparison.runnerUp.sameSlot ? null : `${comparison.runnerUp.name} does not fill the ${categoryLabel.toLowerCase()} role.`,
  };
}

export function DeckIntentControls({
  deckKey,
  categoryLabel,
  insteadRequest,
  ownPick,
  onTier,
}: {
  deckKey: string;
  categoryLabel: string;
  insteadRequest: SlotComparison;
  ownPick: OwnPickComparison;
  onTier: (tier: string) => void;
}) {
  const [intent, setIntent] = useState<IntentState>(() => normalizeDeckIntent(null) as IntentState);
  const [coaching, setCoaching] = useState("");
  const [openSetting, setOpenSetting] = useState(false);
  const moment = momentFromOwn(categoryLabel, ownPick) || momentFromPair(categoryLabel, insteadRequest);

  useEffect(() => {
    const stored = readIntent(deckKey);
    setIntent(stored);
    if (stored.tier) onTier(stored.tier);
  }, [deckKey]); // onTier is stable enough for a deck change; calling it every render would loop

  const showPrompt = shouldShowIntentPrompt(intent, { overriding: Boolean(moment) });

  const apply = (next: IntentState, source: Moment | null) => {
    const normalized = normalizeDeckIntent(next) as IntentState;
    setIntent(normalized);
    writeIntent(deckKey, normalized);
    if (normalized.tier) onTier(normalized.tier);
    if (source?.added && normalized.chip) {
      setCoaching(coachForIntent({
        chip: normalized.chip,
        bracket: normalized.bracket || undefined,
        categoryLabel: source.categoryLabel,
        added: source.added,
        passed: source.passed,
        differentRole: source.differentRole,
      }));
    }
  };

  const chooseChip = (chip: string) => {
    const mapped = tierForIntent(chip, null);
    apply({ ...intent, chip, bracket: mapped.bracket, tier: mapped.tier, dismissed: true }, moment);
  };

  return (
    <>
      {showPrompt && moment && (
        <section className="intent-prompt" aria-label="Tell the Forge why? (optional)">
          <header>
            <ForgeProp kind="crystal" size={32} />
            <div>
              <small>OPTIONAL</small>
              <h3>Tell the Forge why?</h3>
            </div>
            <button type="button" className="intent-dismiss" aria-label="Dismiss" onClick={() => apply({ ...intent, dismissed: true }, null)}>×</button>
          </header>
          <p>This does not change the card. It only tells later suggestions what you are aiming at.</p>
          <div className="intent-chips" role="group" aria-label="Tell the Forge why? (optional)">
            {INTENT_CHIPS.map((chip) => (
              <button type="button" key={chip.id} onClick={() => chooseChip(chip.id)}>
                {chip.id === "push" ? "Pushing power (bracket 4–5 / cEDH)" : chip.label}
              </button>
            ))}
          </div>
          <button type="button" className="intent-never" onClick={() => apply({ ...intent, prompts: "off", dismissed: true }, null)}>
            Don&apos;t ask again
          </button>
        </section>
      )}
      {coaching && <p className="intent-coaching" role="status">{coaching}</p>}
      <section className="intent-setting" aria-label="Deck intent">
        <header>
          <img src="/assets/forge/tripo/hero-512.webp" alt="" width={36} height={36} />
          <div>
            <small>DECK INTENT</small>
            <p>{intent.chip ? INTENT_CHIPS.find((chip) => chip.id === intent.chip)?.label : "No preference yet"}{intent.bracket ? ` · bracket ${intent.bracket}` : ""}</p>
          </div>
          <button type="button" aria-expanded={openSetting} onClick={() => setOpenSetting((open) => !open)}>
            {openSetting ? "Close" : "Set"}
          </button>
        </header>
        {openSetting && (
          <div className="intent-setting-body">
            <p>This replaces the optional prompt for this deck.</p>
            <div role="group" aria-label="Target bracket">
              {BRACKET_SETTINGS.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  aria-pressed={intent.bracket === row.id}
                  onClick={() => apply({
                    ...intent,
                    bracket: row.id,
                    tier: row.tier,
                    chip: intent.chip || (row.id === "2" ? "lower" : row.id === "4" || row.id === "5" ? "push" : intent.chip),
                    dismissed: true,
                  }, moment)}
                >
                  {row.label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Why you pick your own cards">
              {INTENT_CHIPS.map((chip) => (
                <button type="button" key={chip.id} aria-pressed={intent.chip === chip.id} onClick={() => chooseChip(chip.id)}>
                  {chip.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setCoaching(""); apply({ ...normalizeDeckIntent(null), prompts: intent.prompts }, null); }}>
              Clear deck intent
            </button>
          </div>
        )}
      </section>
    </>
  );
}
