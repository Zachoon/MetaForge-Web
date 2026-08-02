// Shared response contract for POST /api/forge/one-slot-experiment
// (worker/forge-one-slot.ts). Type-only — no engine logic lives here, so
// importing this file into the client never re-introduces the one-slot
// counterfactual lab or its ranking internals to the browser bundle.

export interface ForgeExperimentTablet {
  id: string;
  type: "experiment" | "confidence";
  confident?: boolean;
  fieldObservation?: string;
  pressurePoint?: string | null;
  change?: { cut: string; add: string };
  motif?: string | null;
  testContract?: string;
  expectedBenefit?: string;
  tradeoff?: string;
  evidenceStatus?: string;
  practicalEvidence?: any;
  matchupRelevant?: boolean;
  matchupNote?: string | null;
  summary?: string;
  headline?: string;
  detail?: string;
}

export interface ForgeExperimentReport {
  status: "advance";
  summary: string;
  boundary: string;
  tablets: ForgeExperimentTablet[];
}

// The engine's own real "no rival" output — captured from
// buildExperimentTablets returning zero candidates, not hand-invented.
// Used only as the pre-load/idle placeholder before the first response
// arrives, and while a request is in flight after an error.
export const EMPTY_FORGE_EXPERIMENT_REPORT: ForgeExperimentReport = {
  status: "advance",
  summary: "No viable rival supplied a bounded one-slot experiment.",
  boundary: "The Forge preserved the selected list instead of inventing an upgrade.",
  tablets: [
    {
      id: "confidence",
      type: "confidence",
      headline: "No structural swap clears the bar right now.",
      detail:
        "No viable rival supplied a bounded one-slot experiment. That silence is itself a signal: the Forge has no confident case left to make against this build.",
    },
  ],
};
