// Shapes produced by app/deck-check-report.mjs, as the Deck Check UI reads
// them. tests/deck-check.test.mjs pins the values; these types pin the names.

export type CardFact = {
  name: string;
  typeLine?: string;
  oracleText?: string;
  manaCost?: string;
  cmc?: number;
  colorIdentity?: string[];
  legalities?: Record<string, string>;
  cardFaces?: Array<{ name: string; typeLine: string; oracleText: string; manaCost: string }>;
};

export type FactIndex = Record<string, CardFact>;

export type ParsedLine = { line: number; text: string; reason: string };

export type DeckCheckFormat = { id: string; label: string; legalityKey: string; commander: boolean; size: number; copies: number };

export type StructureIssue = { severity: "error" | "info"; code: string; message: string; lines: number[]; cards: string[] };

export type RoleRow = { id: string; label: string; actual: number; min: number; max: number; status: string; cards?: Array<{ name: string }> };

export type CurveBucket = { label: string; actual: number; target?: number; status?: string };

export type Citation = { name: string; quote?: string; says: string };

export type Weakness = {
  id: string;
  title: string;
  plain: string;
  citations: Citation[];
  confidence?: string;
  confidenceReason?: string;
  // MF-DECK-COACH-002: every finding answers the same six questions.
  detected?: string;
  why?: string;
  notes?: string[];
  change?: string;
  tradeOff?: string;
  strength?: "strong" | "heuristic";
  strengthReason?: string;
};

export type SuggestedAdd = { source: string; add: string; reason: string; addQuote: string; addTypeLine?: string; addManaCost?: string };

export type ComparisonRole = { id: string; label: string; min: number; max: number; before: number; after: number; beforeStatus: string; afterStatus: string };

export type Comparison = {
  source: string;
  cut: string;
  add: string;
  reason: string;
  addQuote: string;
  addTypeLine?: string;
  addManaCost?: string;
  roles: ComparisonRole[];
  curve: { before: number | null; after: number | null; ideal: number | null };
  lands: { before: number; after: number; targetLow: number; targetHigh: number } | null;
  resolved: string[];
  introduced: string[];
  remaining: string[];
  verdict: string;
  tradeOffs: string[];
  afterText: string;
  cutFlag?: string;
};

export type PlayerSwapResult = { ok: true; comparison: Comparison } | { ok: false; message: string };

export type DeckCheckReport = {
  status: "empty" | "structure-only" | "needs-commander" | "unreadable" | "ready";
  format: DeckCheckFormat;
  structure: { playedTotal: number; commanders: string[]; issues: StructureIssue[]; legal: boolean } | null;
  message?: string;
  limits?: string[];
  candidates?: string[];
  summary?: { landCount: number; spellCount: number; averageManaValue: number | null; curve: CurveBucket[]; pips: Array<{ color: string; word: string; pips: number }> };
  commanders?: Array<{ name: string }>;
  plan?: {
    sentence: string;
    readId?: string;
    quote?: string;
    confidence?: { level?: string; reason?: string };
    strategyNote?: string;
    // MF-DECK-COACH-003: where the plan read comes from, and the player's say.
    source?: "commander-text" | "commander-and-deck" | "deck-cards" | "none" | "player";
    readConfidence?: string;
    evidence?: string[];
    secondary?: { id: string; label: string; banded?: boolean; evidence: string[] } | null;
    signals?: Array<{ id: string; what: string; count: number; examples: string[] }>;
    bandId?: string;
    confirmed?: boolean;
    choices?: Array<{ id: string; label: string }>;
    detectedId?: string;
  };
  strengths?: Array<{ id: string; label: string; actual: number; min: number; max: number; cards: string[] }>;
  curve?: { summary: string; buckets: CurveBucket[] };
  weaknessHeading?: string;
  weaknessIntro?: string;
  weaknesses?: Weakness[];
  mana?: {
    summary: string;
    lands: { summary: string };
    colors: Array<{ color: string; status: string; summary: string }>;
    assumptions?: {
      inputs: Array<{ label: string; value: string; basis: string }>;
      rules: string[];
      reference: { value: number; cheapCount: number; text: string };
    } | null;
  } | null;
  pressure?: {
    signals: Array<{ id: string; label: string; basis: string; count: number; cards: string[]; note: string }>;
    gameChangerDataKnown: boolean;
    note: string;
  };
  protectedNames?: string[];
  comparisons?: Comparison[];
  suggestedAdds?: SuggestedAdd[];
  noSwapNote?: string;
  deckCards?: string[];
};
