import type { createPilotingDebrief } from "./piloting-debrief.mjs";

export type Chamber =
  | "entrance"
  | "archive"
  | "commission"
  | "refine"
  | "forging"
  | "masterworks"
  | "workbench";

export type BuildPath = "scratch" | "complete" | "discover";

export type ForgeAction = "none" | "forge" | "reveal" | "select" | "refine" | "grow";
export type MilestoneMotion = {
  kind: "ignition" | "masterwork-ready" | "masterwork-selected" | "experiment-chosen" | "revision-accepted" | "evidence-recorded";
  eyebrow: string;
  label: string;
  glyph: string;
} | null;

// The real request and the ceremony run concurrently. This is not a delay
// before construction: it is the minimum amount of time the transition gets
// to tell the build story before a fast result is revealed.
export const FORGE_CEREMONY_MINIMUM_MS = 9_000;

export type DeckPreview = { card: string; role: string; theme: string; win: string };
export type DeckRow = { quantity: number; name: string };
export type DeckViewMode = "playtest" | "gallery" | "ledger";

export function preferredDecklistView(): Exclude<DeckViewMode, "playtest"> {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches
    ? "gallery"
    : "ledger";
}
export type CardFact = {
  name: string;
  cmc?: number;
  color_identity?: string[];
  produced_mana?: string[];
  mana_cost?: string;
  oracle_text?: string;
  type_line?: string;
  set_name?: string;
  games?: string[];
  legalities?: Record<string, string>;
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
    image_uris?: { normal?: string; art_crop?: string };
  }>;
  prices?: { usd?: string | null; usd_foil?: string | null };
};
export type CardSearchResult = { name: string; typeLine: string; image: string };
// name/typeLine/image are display data only (a Scryfall lookup done purely
// for the card image and type line). reason/roles come directly from
// /api/forge/multi-refill's real package.context.summary and
// package.additions[0].roles — the actual legality/role-fit evidence, not
// re-derived or inferred client-side.
export type ReplacementCandidate = CardSearchResult & { reason: string; roles: string[] };
export type PrintingOption = {
  id: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  image: string;
  usd: string | null;
  usd_foil: string | null;
  // Bare Scryfall tcgplayer_id for this exact printing — never Scryfall's
  // own purchase_uris.tcgplayer, which carries Scryfall's affiliate
  // attribution, not MetaForge's. See app/affiliate-links.mjs.
  tcgplayerId: number | null;
};
export type MetaBreakerExperiment = {
  cut: string;
  add: CardSearchResult;
  reason: string;
  confidence: string;
  expectedChange: string;
  measurement: string;
};
export type ForgeIntervention = {
  id: string;
  kind: string;
  summary: string;
  decision: "accepted" | "dismissed";
  revision: number;
  createdAt: string;
  hypothesisId?: string;
  targetCategory?: string;
  targetGoal?: string | null;
  targetMeasurement?: string;
};
export type MultiRefillPackage = {
  id: string;
  label: string;
  additions: DeckRow[];
  rows: any[];
  evaluation?: { score?: number; roleCoverage?: number; curveHealth?: number; cohesion?: number } | null;
  context?: {
    preservationScore: number;
    rolePreservation: number;
    systemPreservation: number;
    removedRoles: string[];
    restoredRoles: string[];
    exposedRoles: string[];
    affectedSystems: string[];
    preservedSystems: string[];
    repairedSystems: string[];
    exposedSystems: string[];
    summary: string;
  } | null;
  boundary?: string;
};
export type CommanderOption = {
  name: string;
  colors: string[];
  typeLine: string;
  image: string;
  verifiedFacts: string;
};
export type Masterwork = {
  rune: string;
  name: string;
  path: string;
  tone: string;
  verdict: string;
};
export type SavedFamily = {
  id: string;
  name: string;
  format: string;
  strategy?: string;
  commander?: CommanderOption | null;
  selectedWork?: number;
  path?: string;
  record?: { wins: number; losses: number };
  updatedAt?: string;
  // Written by persistStoryBench on every save; toggled by setFamilyArchived.
  // An archived family is a player-declared "finished" Masterwork — kept
  // visible, just visually distinct, and always reversible.
  archived?: boolean;
  promotedFingerprint?: string;
  // Written by refreshMasterworkMotif whenever a Masterwork is finished;
  // cached so identity reads (here and on /profile) never have to re-run
  // the Scryfall fetch + classification just to know the dominant motif.
  motifWeights?: Record<string, number>;
  playerGoal?: string | null;
  /** Optional commission note — Conversation Contract Stage 1 persistence. */
  commissionNote?: string | null;
  forgeInterventions?: ForgeIntervention[];
  // A small snapshot of Brain's own construction-time plan identity
  // (package labels, strategy, plan label, commanders) captured whenever a
  // live generation context is available. Reopening a saved Masterwork from
  // the archive has no live Brain context to read (see openSavedMasterwork)
  // — this is the only way the coach summary can still describe a real
  // plan instead of a generic placeholder for a previously-saved deck.
  planIdentity?: {
    packages: string[];
    strategy: string | null;
    planLabel: string | null;
    commanders: string[];
  } | null;
  revisions: Array<{
    deckText: string;
    note: string;
    createdAt: string;
    evidence?: { wins?: number; losses?: number };
    matches?: Array<{
      id: string;
      result: "win" | "loss" | "not-recorded";
      opponent: string;
      signal: string;
      playedAt: string;
      revision?: number;
      deckFingerprint?: string;
      fieldTest?: { hypothesisId?: string; question: string; outcome: string; source: string; checkIn?: { issue: string; handled: string; overall: string } };
      coachDebrief?: ReturnType<typeof createPilotingDebrief>;
    }>;
  }>;
};
export type EdhrecSignal = {
  name: string;
  category: string;
  decks: number;
  eligibleDecks: number;
  inclusion: number;
  synergy: number;
  confidence: string;
  newCardPotential: boolean;
  reliability?: number;
  shrunkSynergy?: number;
  adoptionFloor?: number;
  evidenceScore?: number;
  evidenceClass?: string;
};
export type EdhrecEvidence = {
  available: boolean;
  source?: string;
  methodology?: string;
  reason?: string;
  retrievedAt?: string;
  sourceWindowKnown?: boolean;
  cards: EdhrecSignal[];
};

export type ReadingSize = "compact" | "comfortable" | "large";
