import assert from "node:assert/strict";
import test from "node:test";

// Regression coverage for the "the Forge returned HTML instead of JSON"
// class of bug: an uncaught exception anywhere in the request path (a
// transient D1 failure, an unmatched route falling through to the SSR
// handler) used to escape worker/index.ts's fetch() with nothing to catch
// it, which is exactly what turns into Cloudflare's own HTML error page —
// the page a bare `response.json()` on the client chokes on with
// "Unexpected token '<'". Every test here asserts the opposite: whatever
// goes wrong, `worker.fetch()` resolves (never rejects/throws) to a real
// JSON Response.
//
// Cloudflare Access sitting in front of an authenticated session and
// redirecting an expired one to its own HTML login page is a real
// candidate for the same symptom, but it happens at the edge, before any
// request reaches this Worker — nothing in this file can reproduce that
// layer. access-identity.test.mjs already proves the in-Worker equivalent
// (no/invalid/expired Access JWT -> clean 401 JSON, never a throw); the
// corresponding guard for the edge-redirect case lives in the client
// (app/page.tsx's callForgeGenerate: response.redirected/status inspected
// before ever calling response.json()).

class ForgeD1 {
  buckets = new Map();
  generations = new Map();
  sessions = new Map();
  forges = new Map();
  constructor({ failOn } = {}) {
    this.failOn = failOn;
  }
  prepare(sql) {
    if (this.failOn && sql.includes(this.failOn)) {
      throw new Error("D1 is unavailable");
    }
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("INSERT INTO api_rate_limits")) {
              const [userKey, endpoint, windowBucket] = values;
              const bucketKey = `${userKey}|${endpoint}|${windowBucket}`;
              const next = (db.buckets.get(bucketKey)?.requests || 0) + 1;
              db.buckets.set(bucketKey, { requests: next });
              return { requests: next };
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO guest_forge_sessions")) {
              const [sessionKey, createdAt, expiresAt] = values;
              if (db.sessions.has(sessionKey)) return { success: true, meta: { changes: 0 } };
              db.sessions.set(sessionKey, { status: "pending", createdAt, expiresAt });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE guest_forge_sessions SET status = 'used'")) {
              const [sessionKey] = values;
              const row = db.sessions.get(sessionKey);
              if (row && row.status === "pending") {
                row.status = "used";
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            if (sql.includes("DELETE FROM guest_forge_sessions")) {
              const [sessionKey] = values;
              if (db.sessions.get(sessionKey)?.status === "pending") {
                db.sessions.delete(sessionKey);
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            if (sql.includes("INSERT INTO guest_forges")) {
              const [claimToken, sessionKey, generationId, responseJson, createdAt, expiresAt] = values;
              db.forges.set(claimToken, { sessionKey, generationId, responseJson, createdAt, expiresAt, claimedBy: null });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO forge_generations")) {
              const [generationId, userKey, schemaVersion, payloadJson, expiresAt] = values;
              db.generations.set(generationId, { userKey, schemaVersion, payloadJson, expiresAt });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  }
  // Real D1's batch() runs an array of already-bound prepared statements
  // together; guest-forge.ts calls env.DB.batch([...]) directly (not
  // through a prepared statement), so this lives on the DB object itself.
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("forge-generate-response-contract-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const ctx = { waitUntil() {}, passThroughOnException() {} };
const env = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  ALLOW_DEV_AUTH_BYPASS: "true",
});
const guestEnv = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
  GUEST_SESSION_SECRET: "test-guest-session-secret",
});
const authHeaders = (email) => (email ? { "x-dev-user-email": email } : {});

const generateRequest = (email, body) =>
  new Request("https://example.test/api/forge/generate", {
    method: "POST",
    headers: { ...authHeaders(email), "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const guestGenerateRequest = (body) =>
  new Request("https://example.test/api/forge/guest-generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

// A verified-legal pool shaped like real Scryfall search results, reused
// from the same fixture family tests/native-masterwork-import.test.mjs
// already proves forgeImportedMasterwork can build a complete deck from —
// large and varied enough (draw, removal, protection, ramp, utility lands)
// that the real engine never has to fail for lack of legal filler.
const rawCard = (name, opts = {}) => ({
  name,
  mana_cost: opts.manaCost ?? "{2}{U}",
  cmc: opts.cmc ?? 2,
  type_line: opts.typeLine ?? "Creature — Test",
  oracle_text: opts.oracleText ?? "",
  color_identity: opts.colorIdentity ?? ["U"],
  keywords: [],
  prices: { usd: "0.25" },
  legalities: { standard: "legal" },
  games: ["paper", "arena"],
});
const importPool = [
  ...Array.from({ length: 28 }, (_, i) => rawCard(`Flow ${i}`, { oracleText: "When this enters, draw a card. Scry 1.", cmc: 3 })),
  ...Array.from({ length: 24 }, (_, i) => rawCard(`Answer ${i}`, { oracleText: "Exile target nonland permanent.", cmc: 2 })),
  ...Array.from({ length: 18 }, (_, i) => rawCard(`Shield ${i}`, { oracleText: "Target creature gains hexproof and indestructible until end of turn.", cmc: 1 })),
  ...Array.from({ length: 18 }, (_, i) => rawCard(`Stone ${i}`, { typeLine: "Artifact", oracleText: "Add one mana. Create a Treasure token.", manaCost: "{2}", cmc: 2, colorIdentity: [] })),
  ...Array.from({ length: 10 }, (_, i) => rawCard(`Island Utility ${i}`, { typeLine: "Land", oracleText: "{T}: Add {U}.", manaCost: "", cmc: 0, colorIdentity: ["U"] })),
];

function mockExternalFetch({ scryfallOk = true } = {}) {
  return async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/search")) {
      if (!scryfallOk) return new Response("Scryfall unavailable", { status: 503 });
      return new Response(JSON.stringify({ data: importPool, has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/collection")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  };
}

async function withMockedFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("accidental HTML response: an uncaught D1 failure in the rate-limit check still resolves to a JSON error response, never an unhandled exception", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange" }),
    env(new ForgeD1({ failOn: "INSERT INTO api_rate_limits" })),
    ctx,
  );
  assert.ok((response.headers.get("content-type") || "").includes("application/json"));
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.ok(body.error);
  assert.doesNotMatch(body.error, /at .*\(|TypeError|D1 is unavailable|node_modules/);
});

test("route not found: an unmatched /api/ path returns JSON 404 instead of falling through to the HTML app shell", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://example.test/api/forge/this-route-does-not-exist", { method: "POST" }),
    env(new ForgeD1()),
    ctx,
  );
  assert.equal(response.status, 404);
  assert.ok((response.headers.get("content-type") || "").includes("application/json"));
  const body = await response.json();
  assert.ok(body.error);
});

test("JSON validation error: malformed request bodies still return JSON, not HTML", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", "{not valid json"), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
  assert.ok((response.headers.get("content-type") || "").includes("application/json"));
});

test("upstream failure: a Scryfall catalog outage returns a sanitized 503 JSON, not a raw exception or HTML", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch({ scryfallOk: false }), async () => {
    const response = await worker.fetch(
      generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange" }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 503);
    assert.ok((response.headers.get("content-type") || "").includes("application/json"));
    const body = await response.json();
    assert.match(body.error, /verified card catalog is unavailable/i);
  });
});

// P0: a single transient Scryfall failure (a rate-limit response under
// real load, or a momentary 5xx) used to end the whole commission
// immediately, throwing CATALOG_UNAVAILABLE_MESSAGE on the very first
// non-ok page even though the very next attempt would often have
// succeeded. fetchScryfallWithRetry now retries a 429/5xx (bounded, small
// backoff) before giving up — this proves a transient failure that
// recovers on the very next attempt no longer turns into a 503 at all.
test("transient Scryfall failure resilience: a single 429 that recovers on retry does not fail the generation", async () => {
  const worker = await loadWorker();
  let searchCalls = 0;
  const flakyThenOkFetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("api.scryfall.com/cards/search")) {
      searchCalls += 1;
      if (searchCalls === 1) return new Response("Rate limited", { status: 429, headers: { "Retry-After": "0" } });
      return new Response(JSON.stringify({ data: importPool, has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/collection")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  };
  await withMockedFetch(flakyThenOkFetch, async () => {
    const response = await worker.fetch(
      generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange" }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 200, "the retry must recover instead of surfacing the transient 429 as a failure");
    const body = await response.json();
    assert.equal(body.nativeReport.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  });
  assert.ok(searchCalls >= 2, "expected the retry to actually re-request the same page, not just accept the first failure");
});

test("engine/storage exception: a failure while persisting a real generation still returns sanitized JSON 500, never the raw exception", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange" }),
      env(new ForgeD1({ failOn: "INSERT INTO forge_generations" })),
      ctx,
    );
    assert.equal(response.status, 500);
    assert.ok((response.headers.get("content-type") || "").includes("application/json"));
    const body = await response.json();
    assert.equal(body.error, "The native Forge could not complete this candidate. Try again or adjust the commission.");
  });
});

test("authenticated imported generation succeeds end-to-end and returns real JSON, not HTML", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      generateRequest("importer@example.com", {
        mode: "imported",
        format: "Standard",
        strategy: "Balanced midrange",
        deck: "4 Flow 0\n4 Answer 0\n20 Island",
      }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 200);
    assert.ok((response.headers.get("content-type") || "").includes("application/json"));
    const body = await response.json();
    assert.equal(body.nativeReport.engine, "metaforge-native-import-v1");
    assert.equal(body.nativeReport.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
    const flow0 = body.nativeReport.selected.rows.find((row) => row.name === "Flow 0");
    assert.equal(flow0.quantity, 4, "the player's own submitted quantity is preserved");
    assert.ok(typeof body.generationId === "string" && body.generationId.length > 0);
  });
});

test("reviewFocus validation: an unrecognized value is rejected with a clean 400, never passed through to the engine", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      generateRequest("importer@example.com", {
        mode: "imported",
        format: "Standard",
        strategy: "Balanced midrange",
        deck: "4 Flow 0\n4 Answer 0\n20 Island",
        reviewFocus: "Make it broken",
      }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /reviewFocus/);
  });
});

test("reviewFocus omitted: reviewFocusResult is null, never a half-built object", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      generateRequest("importer@example.com", {
        mode: "imported",
        format: "Standard",
        strategy: "Balanced midrange",
        deck: "4 Flow 0\n4 Answer 0\n20 Island",
      }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reviewFocusResult, null);
  });
});

test("reviewFocus supplied: a validated canonical value returns a real, evidence-backed reviewFocusResult alongside nativeReport", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      generateRequest("importer@example.com", {
        mode: "imported",
        format: "Standard",
        strategy: "Balanced midrange",
        deck: "4 Flow 0\n4 Answer 0\n20 Island",
        reviewFocus: "More consistency",
      }),
      env(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reviewFocusResult.focus, "More consistency");
    // Grounded against this exact generation's own manaConsistency.overall
    // (a real field already present on nativeReport), not a fixed string.
    const expectedPct = Math.round(body.nativeReport.manaConsistency.overall * 100);
    assert.match(body.reviewFocusResult.evidence, new RegExp(`${expectedPct}%`));
    assert.ok(body.reviewFocusResult.asked.length > 0);
    assert.ok(body.reviewFocusResult.nextStep.length > 0);
  });
});

test("guest imported generation succeeds end-to-end via the guest boundary and returns real JSON, not HTML", async () => {
  const worker = await loadWorker();
  await withMockedFetch(mockExternalFetch(), async () => {
    const response = await worker.fetch(
      guestGenerateRequest({
        mode: "imported",
        format: "Standard",
        strategy: "Balanced midrange",
        deck: "4 Flow 0\n4 Answer 0\n20 Island",
        turnstileToken: "test-turnstile-token-0123456789",
      }),
      guestEnv(new ForgeD1()),
      ctx,
    );
    assert.equal(response.status, 200);
    assert.ok((response.headers.get("content-type") || "").includes("application/json"));
    const body = await response.json();
    assert.equal(body.nativeReport.engine, "metaforge-native-import-v1");
    assert.ok(body.claimToken, "a guest gets a claim token to redeem later");
    assert.equal(body.guestPreview, true);
    assert.equal(body.generationId, undefined, "a guest never gets the reusable generation handle directly");
  });
});

// P0 Part 9: structured, log-only observability for construction
// recovery. A strict budget cap on a real but scarce mono-green pool
// forces buildCandidate's recovery ladder to engage (same real mechanism
// tests/native-masterwork-engine.test.mjs proves directly) — this proves
// the worker actually logs it, with the fields Part 9 asked for, end to
// end through the real request path.
test("construction recovery logs a structured, non-user-identifying diagnostic when the budget-preference recovery ladder engages", async () => {
  const worker = await loadWorker();
  const rawCardGreen = (name, opts = {}) => ({
    name,
    mana_cost: opts.manaCost ?? "{1}{G}",
    cmc: opts.cmc ?? 2,
    type_line: opts.typeLine ?? "Creature — Test",
    oracle_text: opts.oracleText ?? "",
    color_identity: opts.colorIdentity ?? ["G"],
    keywords: [],
    prices: { usd: opts.usd ?? null },
    legalities: { commander: "legal" },
    games: ["paper", "arena"],
  });
  const cheapDraw = (n) => rawCardGreen(`Cheap Draw ${n}`, { oracleText: "When this enters, draw a card. Scry 1.", cmc: 2, usd: "0.5" });
  const cheapAnswer = (n) => rawCardGreen(`Cheap Answer ${n}`, { oracleText: "Destroy target creature.", cmc: 2, usd: "0.5" });
  const cheapShield = (n) => rawCardGreen(`Cheap Shield ${n}`, { oracleText: "Target creature gains hexproof and indestructible until end of turn.", cmc: 1, usd: "0.5" });
  const premiumDraw = (n) => rawCardGreen(`Premium Draw ${n}`, { oracleText: "When this enters, draw a card. Scry 1.", cmc: 3, usd: "45" });
  const premiumAnswer = (n) => rawCardGreen(`Premium Answer ${n}`, { oracleText: "Destroy target creature. Draw a card.", cmc: 3, usd: "45" });
  const premiumRamp = (n) => rawCardGreen(`Premium Rock ${n}`, { typeLine: "Artifact", oracleText: "Add one mana of any color.", manaCost: "{1}", cmc: 1, colorIdentity: [], usd: "45" });
  const scarcePool = [
    ...Array.from({ length: 14 }, (_, i) => cheapDraw(i)),
    ...Array.from({ length: 13 }, (_, i) => cheapAnswer(i)),
    ...Array.from({ length: 13 }, (_, i) => cheapShield(i)),
    ...Array.from({ length: 14 }, (_, i) => premiumDraw(i)),
    ...Array.from({ length: 13 }, (_, i) => premiumAnswer(i)),
    ...Array.from({ length: 13 }, (_, i) => premiumRamp(i)),
    ...Array.from({ length: 40 }, (_, i) => rawCardGreen(`Forest Utility ${i}`, { typeLine: "Land", manaCost: "", cmc: 0, oracleText: "{T}: Add {G}." })),
  ];
  const scarcePoolFetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/search")) {
      return new Response(JSON.stringify({ data: scarcePool, has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  };
  const originalConsoleLog = console.log;
  const logged = [];
  console.log = (...args) => logged.push(args.join(" "));
  try {
    await withMockedFetch(scarcePoolFetch, async () => {
      const response = await worker.fetch(
        generateRequest("one@example.com", {
          mode: "direct",
          format: "Commander",
          strategy: "Balanced midrange",
          commander: { name: "Test Commander", colors: ["G"], oracleText: "" },
          maxCardPrice: 2,
        }),
        env(new ForgeD1()),
        ctx,
      );
      assert.equal(response.status, 200, "the recovery ladder must still produce a real, complete deck");
      const body = await response.json();
      assert.equal(body.nativeReport.selected.recoveryStage, "relaxed-preferences");
    });
  } finally {
    console.log = originalConsoleLog;
  }
  const entry = logged.map((line) => { try { return JSON.parse(line); } catch { return null; } }).find((parsed) => parsed?.event === "forge-construction-outcome");
  assert.ok(entry, "expected a structured forge-construction-outcome log entry");
  assert.equal(entry.outcome, "success");
  assert.equal(entry.format, "Commander");
  assert.equal(entry.commander, "Test Commander");
  assert.equal(entry.target, 100);
  assert.equal(entry.recoveryStage, "relaxed-preferences");
  assert.equal(entry.finalSize, 100);
  assert.ok(entry.recoveryDiagnostics, "expected missingSlots/eligible-count diagnostics");
  assert.equal(typeof entry.recoveryDiagnostics.missingSlots, "number");
  // No user identity, email, IP, or session token anywhere in the log line.
  assert.doesNotMatch(logged.join("\n"), /one@example\.com/);
});
