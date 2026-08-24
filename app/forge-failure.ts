// A production walkthrough proved that three genuinely different failure
// classes — an expired Turnstile token, the network anti-abuse limiter,
// and a truly incomplete generation — used to collapse into one
// indistinguishable "Forge failed" screen, because every guest-forge
// failure was caught in one place and rendered from a single message
// string. That's why "the engine didn't build anything" felt impossible
// to kill: most of those reports were never construction failures at
// all. callForgeGenerate now throws a ForgeGenerationError carrying the
// server's machine-readable code; normalizeForgeFailure maps every known
// code to how the UI must treat it, once, here — never re-derive this by
// comparing message strings at a render site.
export type GuestForgeErrorCode =
  | "GUEST_PREVIEW_ALREADY_USED"
  | "NETWORK_RATE_LIMITED"
  | "HUMAN_VERIFICATION_REQUIRED"
  | "INCOMPLETE_GENERATION"
  | "CATALOG_UNAVAILABLE"
  | "GENERATION_FAILED";

export class ForgeGenerationError extends Error {
  code?: string;
  claimToken?: string;
  constructor(message: string, code?: string, claimToken?: string) {
    super(message);
    this.code = code;
    this.claimToken = claimToken;
  }
}

export type NormalizedForgeFailure = {
  code: GuestForgeErrorCode | "UNKNOWN";
  message: string;
  claimToken?: string;
  // Whether "Strike the Anvil Again" may ever work against this exact
  // failure. NETWORK_RATE_LIMITED is a network anti-abuse brake — retry
  // cannot help. GUEST_PREVIEW_ALREADY_USED is only an in-progress lease;
  // retry is offered after a fresh Turnstile token.
  retryable: boolean;
  // Whether this specific response means the guest's one free preview
  // was actually spent. Used guests keep forging; sign-in is only to SAVE.
  previewConsumed: boolean;
  // Whether a fresh Turnstile challenge is the correct next step. False
  // for NETWORK_RATE_LIMITED (retrying can't work regardless of
  // verification) and true for every retryable one (a Turnstile token is
  // single-use server-side the moment it's checked, spent whether or not
  // the attempt that follows succeeds).
  requiresVerification: boolean;
};

const GUEST_FORGE_ERROR_META: Record<GuestForgeErrorCode, Omit<NormalizedForgeFailure, "code" | "message" | "claimToken">> = {
  GUEST_PREVIEW_ALREADY_USED: { retryable: true, previewConsumed: false, requiresVerification: true },
  NETWORK_RATE_LIMITED: { retryable: false, previewConsumed: false, requiresVerification: false },
  HUMAN_VERIFICATION_REQUIRED: { retryable: true, previewConsumed: false, requiresVerification: true },
  INCOMPLETE_GENERATION: { retryable: true, previewConsumed: false, requiresVerification: true },
  CATALOG_UNAVAILABLE: { retryable: true, previewConsumed: false, requiresVerification: true },
  GENERATION_FAILED: { retryable: true, previewConsumed: false, requiresVerification: true },
};

export function normalizeForgeFailure(error: unknown): NormalizedForgeFailure {
  const message = error instanceof Error ? error.message : "The native Forge could not complete this candidate.";
  const rawCode = error instanceof ForgeGenerationError ? error.code : undefined;
  const code: GuestForgeErrorCode | "UNKNOWN" =
    rawCode && Object.prototype.hasOwnProperty.call(GUEST_FORGE_ERROR_META, rawCode) ? (rawCode as GuestForgeErrorCode) : "UNKNOWN";
  const claimToken = error instanceof ForgeGenerationError ? error.claimToken : undefined;
  // An unrecognized/missing code (an older deploy, a network-level error
  // never touched by this contract) defaults to the same treatment as
  // GENERATION_FAILED — retryable, preview preserved — never to "already
  // used," since that is the one claim this function must never guess at.
  const meta = code === "UNKNOWN" ? GUEST_FORGE_ERROR_META.GENERATION_FAILED : GUEST_FORGE_ERROR_META[code];
  return { code, message, claimToken, ...meta };
}
