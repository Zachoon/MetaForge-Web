// =============================================================================
// Field Intelligence — Live HTTP helpers (throttle / retry / backoff)
// =============================================================================
// Never logs or persists API keys. Source failures stay isolated.
// =============================================================================

const freeze = (value) => Object.freeze(value);

const DEFAULTS = Object.freeze({
  maxRetries: 3,
  baseDelayMs: 400,
  maxDelayMs: 8000,
  minIntervalMs: 650, // stay under TopDeck's 100 req/min for bulk work
  timeoutMs: 20000,
});

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(minIntervalMs) {
  const now = Date.now();
  const wait = Math.max(0, (lastRequestAt + minIntervalMs) - now);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function retryDelay(attempt, baseDelayMs, maxDelayMs) {
  const expo = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
  const jitter = Math.floor(Math.random() * Math.min(250, expo * 0.2));
  return expo + jitter;
}

/**
 * Fetch with timeout, throttle, and retry/backoff for transient failures.
 * Does not inspect or store Authorization / X-API-Key values.
 */
export async function liveFetch(url, init = {}, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const minIntervalMs = options.minIntervalMs ?? DEFAULTS.minIntervalMs;
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    await throttle(minIntervalMs);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller?.signal || init.signal,
      });
      if (timer) clearTimeout(timer);
      // Retry rate-limits and gateway blips.
      if ([429, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
        const retryAfter = Number(response.headers?.get?.("retry-after"));
        const delay = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : retryDelay(attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
        continue;
      }
      return response;
    } catch (error) {
      if (timer) clearTimeout(timer);
      lastError = error;
      if (attempt >= maxRetries) break;
      await sleep(retryDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }
  throw lastError || new Error("live_fetch_failed");
}

/**
 * Isolate one source so failures never abort the full corpus run.
 */
export async function isolateSource(name, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    return freeze({
      source: name,
      ok: result?.ok !== false,
      status: result?.status || (result?.ok === false ? "error" : "ok"),
      reason: result?.reason || null,
      actionable: result?.actionable || null,
      elapsedMs: Date.now() - started,
      result,
    });
  } catch (error) {
    return freeze({
      source: name,
      ok: false,
      status: "error",
      reason: error?.message || "source_threw",
      actionable: null,
      elapsedMs: Date.now() - started,
      result: freeze({ ok: false, reason: error?.message || "source_threw" }),
    });
  }
}

export const LIVE_HTTP_DEFAULTS = DEFAULTS;
