import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  clientReportDecision,
  coarseBrowser,
  groupErrorRows,
  prepareClientError,
  redactMessage,
  routeForReport,
} from "../app/error-report-sanitize.mjs";
import {
  ERROR_REPORT_CAP_SQL,
  ERROR_REPORT_DELETE_OLD_SQL,
  ERROR_REPORT_INSERT_SQL,
  cleanupErrorReports,
  handleClientErrorReport,
  handleFounderErrors,
  recordWorkerException,
} from "../worker/error-report.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const BUILD = "61c08a607bd8888ea1244215298c4ee7d3152793";
const SESSION = "11111111-2222-4333-8444-555555555555";

class ErrorD1 {
  reports = new Map();
  buckets = new Map();
  failInsert = false;
  prepare(sql) {
    return {
      bind: (...values) => ({
        first: async () => {
          if (sql.includes("INSERT INTO api_rate_limits")) {
            const [userKey, endpoint, windowBucket] = values;
            const bucketKey = `${userKey}|${endpoint}|${windowBucket}`;
            const next = (this.buckets.get(bucketKey) || 0) + 1;
            this.buckets.set(bucketKey, next);
            return { requests: next };
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO error_reports")) {
            if (this.failInsert) throw new Error("d1 down");
            const [fingerprint, sourceName, kind, message, route, build, browser, userAgent, viewport, session, stack, context, first, last] = values;
            const existing = this.reports.get(fingerprint);
            if (existing) {
              existing.count += 1;
              existing.last_seen = last;
              existing.build_id = build;
              existing.browser = browser || existing.browser;
              existing.user_agent = userAgent || existing.user_agent;
              existing.viewport = viewport || existing.viewport;
              existing.session_id = session || existing.session_id;
              existing.stack = stack || existing.stack;
              existing.context_json = context;
            } else {
              this.reports.set(fingerprint, {
                fingerprint, source: sourceName, kind, message, route, build_id: build, browser,
                user_agent: userAgent, viewport, session_id: session, stack, context_json: context,
                count: 1, first_seen: first, last_seen: last,
              });
            }
          }
          return { success: true, meta: { changes: 1 } };
        },
        all: async () => {
          if (!sql.includes("FROM error_reports")) return { results: [] };
          const since = values[0] || 0;
          return { results: [...this.reports.values()].filter((row) => row.last_seen >= since).sort((a, b) => b.last_seen - a.last_seen) };
        },
      }),
      all: async () => {
        if (sql.includes("account_deck_benches")) throw new Error("bench failed user@example.com https://metaforge.gg/forge?decklist=1+Sol+Ring");
        return { results: [] };
      },
    };
  }
}

function reportRequest(body, headers = {}) {
  return new Request("https://app.metaforge.gg/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", ...headers },
    body: JSON.stringify(body),
  });
}

const clientBody = (overrides = {}) => ({
  kind: "turnstile",
  message: "Turnstile did not load",
  stack: "Error: Turnstile did not load\n    at https://metaforge.gg/assets/page.js:1:1?decklist=1+Sol+Ring",
  route: "/?deck=1+Sol+Ring",
  detail: "zero-width",
  viewport: "390x844",
  session: SESSION,
  build: BUILD,
  decklist: "1 Sol Ring\n1 Cyclonic Rift",
  email: "player@example.com",
  ...overrides,
});

test("redaction removes emails, addresses, tokens, query strings, and decklists", () => {
  const text = redactMessage([
    "Failed for player@example.com from 203.0.113.8",
    "see https://metaforge.gg/forge?decklist=1+Sol+Ring&token=abc",
    "Bearer super-secret",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.dBjftJeZ4CVP",
    "1 Sol Ring",
    "1 Cyclonic Rift",
    "4 Lightning Bolt, 3 Counterspell, 2 Mana Crypt",
  ].join("\n"));
  assert.match(text, /Failed for \[email\] from \[ip\]/);
  assert.match(text, /https:\/\/metaforge\.gg\/forge/);
  assert.doesNotMatch(text, /player@example.com|203\.0\.113\.8|decklist|Sol Ring|Cyclonic|Lightning Bolt|Mana Crypt|Bearer|super-secret|eyJ/);
});

test("a normal exception message survives redaction", () => {
  assert.equal(redactMessage("Cannot read properties of undefined (reading 'render')"), "Cannot read properties of undefined (reading 'render')");
});

test("browser labels stay coarse", () => {
  assert.equal(coarseBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"), "Safari 18 · iOS");
  assert.equal(coarseBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36"), "Chrome 131 · Android");
  assert.equal(coarseBrowser(""), null);
});

test("client reports wait for the measurement choice", () => {
  assert.equal(clientReportDecision(null), "buffer");
  assert.equal(clientReportDecision("declined"), "drop");
  assert.equal(clientReportDecision("allowed"), "send");
});

test("client payload drops unknown kinds and deck-only messages", () => {
  assert.equal(prepareClientError({ kind: "deck", message: "1 Sol Ring" }), null);
  assert.equal(prepareClientError({ kind: "turnstile", message: "1 Sol Ring\n1 Island" }), null);
  const prepared = prepareClientError(clientBody());
  assert.equal(prepared.route, "/");
  assert.equal(prepared.detail, "zero-width");
  assert.equal(prepared.message, "Turnstile did not load");
  assert.doesNotMatch(prepared.stack, /decklist|Sol Ring/);
});

test("ingest stores redacted context, dedupes, and refuses a 21st report from one caller", async () => {
  const db = new ErrorD1();
  const env = { DB: db };
  const first = await handleClientErrorReport(reportRequest(clientBody()), env);
  assert.equal(first.status, 202);
  assert.deepEqual(await first.json(), { recorded: true });
  const second = await handleClientErrorReport(reportRequest(clientBody()), env);
  assert.equal(second.status, 202);
  assert.equal(db.reports.size, 1);
  const row = [...db.reports.values()][0];
  assert.equal(row.count, 2);
  assert.equal(row.kind, "turnstile");
  assert.equal(row.browser, "Safari 18 · iOS");
  assert.equal(row.viewport, "390x844");
  assert.equal(row.session_id, SESSION);
  assert.equal(row.build_id, BUILD);
  assert.equal(row.context_json, JSON.stringify({ detail: "zero-width" }));
  assert.doesNotMatch(JSON.stringify(row), /Sol Ring|player@example.com|decklist|cf-connecting-ip/i);
  for (let i = 0; i < 18; i += 1) {
    const response = await handleClientErrorReport(reportRequest(clientBody({ message: `Turnstile did not load ${i}` })), env, {});
    assert.equal(response.status, 202);
  }
  const limited = await handleClientErrorReport(reportRequest(clientBody({ message: "Turnstile did not load overflow" })), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after") > 0, true);
});

test("an email-shaped session and a non-sha build are not stored as identity", async () => {
  const db = new ErrorD1();
  const response = await handleClientErrorReport(reportRequest(clientBody({
    session: "player@example.com",
    build: "2026.07.16-workspace1",
    viewport: "desktop",
    detail: "1 Sol Ring",
  })), { DB: db });
  assert.equal(response.status, 202);
  const row = [...db.reports.values()][0];
  assert.equal(row.session_id, null);
  assert.equal(row.build_id, "unknown");
  assert.equal(row.viewport, null);
  assert.equal(row.context_json, "{}");
});

test("a captured route is kept when the report is sent from a later page", () => {
  assert.equal(routeForReport("/forge?deck=1+Sol+Ring", "/"), "/forge");
  assert.equal(routeForReport(undefined, "/research"), "/research");
  assert.equal(routeForReport("  ", "/academy"), "/academy");
});

test("an understated content-length cannot make ingest buffer a large body", async () => {
  const db = new ErrorD1();
  const payload = JSON.stringify({ kind: "turnstile", message: "x".repeat(9000) });
  assert.ok(new TextEncoder().encode(payload).byteLength > 8000);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
  const request = new Request("https://app.metaforge.gg/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "8" },
    body: stream,
    duplex: "half",
  });
  const response = await handleClientErrorReport(request, { DB: db });
  assert.equal(response.status, 413);
  assert.equal(db.reports.size, 0);
});

test("invalid reports are rejected without being stored", async () => {
  const db = new ErrorD1();
  const env = { DB: db };
  assert.equal((await handleClientErrorReport(new Request("https://app.metaforge.gg/api/errors"), env)).status, 405);
  assert.equal((await handleClientErrorReport(new Request("https://app.metaforge.gg/api/errors", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), env)).status, 400);
  assert.equal((await handleClientErrorReport(reportRequest({ kind: "nope", message: "x" }), env)).status, 400);
  assert.equal(db.reports.size, 0);
});

test("worker exceptions are stored without the request query or address", async () => {
  const db = new ErrorD1();
  await recordWorkerException({ DB: db }, {
    error: new Error("boom user@example.com https://metaforge.gg/api/forge/generate?decklist=1+Sol+Ring\n1 Sol Ring\n1 Island"),
    route: "/api/forge/generate?decklist=1+Sol+Ring",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    buildId: BUILD,
  });
  const row = [...db.reports.values()][0];
  assert.equal(row.source, "worker");
  assert.equal(row.kind, "worker");
  assert.equal(row.route, "/api/forge/generate");
  assert.equal(row.browser, "Safari 18 · iOS");
  assert.match(row.message, /boom \[email\]/);
  assert.match(row.message, /https:\/\/metaforge\.gg\/api\/forge\/generate/);
  assert.doesNotMatch(JSON.stringify(row), /Sol Ring|user@example.com|decklist/);
});

test("founder error list is owner-only and grouped by message", async () => {
  const db = new ErrorD1();
  const env = { DB: db };
  await handleClientErrorReport(reportRequest(clientBody({ message: "Turnstile did not load", route: "/" })), env);
  await handleClientErrorReport(reportRequest(clientBody({ message: "Turnstile did not load", route: "/forge" }), { "cf-connecting-ip": "203.0.113.9" }), env);
  await handleClientErrorReport(reportRequest(clientBody({ kind: "chunk", message: "Failed to load SCRIPT", detail: null })), env);
  const denied = await handleFounderErrors(new Request("https://app.metaforge.gg/api/founder/errors"), env, { founder: false });
  assert.equal(denied.status, 403);
  const accepted = await handleFounderErrors(new Request("https://app.metaforge.gg/api/founder/errors"), env, { founder: true, build: BUILD });
  assert.equal(accepted.status, 200);
  const body = await accepted.json();
  assert.equal(body.build, BUILD);
  assert.equal(body.groups.length, 2);
  const turnstile = body.groups.find((group) => group.message === "Turnstile did not load");
  assert.equal(turnstile.occurrences, 2);
  assert.equal(turnstile.variants, 2);
  assert.deepEqual(turnstile.routes.sort(), ["/", "/forge"]);
  assert.equal(turnstile.latest.browser, "Safari 18 · iOS");
  assert.equal(turnstile.latest.detail, "zero-width");
  assert.doesNotMatch(JSON.stringify(body), /Sol Ring|player@example.com/);
});

test("groups collapse rows that share a message", () => {
  const groups = groupErrorRows([
    { message: "Same", count: 2, first_seen: 10, last_seen: 20, source: "client", kind: "react", route: "/", build_id: "aaa", browser: "Safari 18 · iOS", context_json: "{}" },
    { message: "Same", count: 1, first_seen: 5, last_seen: 30, source: "worker", kind: "worker", route: "/api", build_id: "bbb", browser: null, context_json: "{}" },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].occurrences, 3);
  assert.equal(groups[0].latest.route, "/api");
  assert.deepEqual(groups[0].sources.sort(), ["client", "worker"]);
});

test("migration SQL dedupes and keeps the newest rows on SQLite", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readMigration());
  const insert = db.prepare(ERROR_REPORT_INSERT_SQL);
  insert.run("fp", "client", "turnstile", "Turnstile did not load", "/", BUILD, "Safari 18 · iOS", "ua", "390x844", SESSION, "stack", "{}", 10, 10);
  insert.run("fp", "client", "turnstile", "Turnstile did not load", "/", BUILD, "Safari 18 · iOS", "ua", "390x844", SESSION, "stack", "{}", 20, 20);
  const row = db.prepare("SELECT COUNT(*) AS n, SUM(count) AS c, MAX(last_seen) AS seen FROM error_reports").get();
  assert.equal(row.n, 1);
  assert.equal(row.c, 2);
  assert.equal(row.seen, 20);
  for (let i = 0; i < 5; i += 1) {
    insert.run(`fp-${i}`, "client", "react", `Error ${i}`, "/", BUILD, null, null, null, null, null, "{}", i, i);
  }
  db.prepare(ERROR_REPORT_DELETE_OLD_SQL).run(3);
  db.prepare(ERROR_REPORT_CAP_SQL).run(2);
  const remaining = db.prepare("SELECT message FROM error_reports ORDER BY last_seen DESC").all();
  assert.equal(remaining.length, 2);
  assert.equal(remaining[0].message, "Turnstile did not load");
});

test("cleanup failure does not throw into the hourly cron", async () => {
  const db = { prepare() { throw new Error("missing table"); } };
  await cleanupErrorReports({ DB: db });
});

test("the worker wires ingest, founder reads, exception capture, and the git build id", async () => {
  const index = await source("worker/index.ts");
  const vite = await source("vite.config.ts");
  const buildId = await source("app/build-id.ts");
  const migration = await source("migrations/0019_error_reports.sql");
  assert.match(index, /\/api\/errors/);
  assert.match(index, /\/api\/founder\/errors/);
  assert.match(index, /recordWorkerException/);
  assert.match(index, /cleanupErrorReports/);
  assert.match(index, /metaforgeBuildId\(\)/);
  assert.doesNotMatch(index, /2026\.07\.16-workspace1/);
  assert.match(vite, /git rev-parse HEAD/);
  assert.match(vite, /%%METAFORGE_BUILD_ID%%/);
  assert.match(buildId, /%%METAFORGE_BUILD_ID%%/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS error_reports/);
  assert.match(migration, /idx_error_reports_fingerprint/);
  assert.match(migration, /wrangler d1 migrations apply metaforge-private-alpha-accounts --remote/);
});

test("client capture respects consent and does not attach deck fields", async () => {
  const reporter = await source("app/client-error-reporter.ts");
  const telemetry = await source("app/launch-telemetry.ts");
  const controls = await source("app/privacy-controls.tsx");
  const layout = await source("app/layout.tsx");
  const boundary = await source("app/components/forge/chamber-load-boundary.tsx");
  const session = await source("app/forge-session-context.tsx");
  const webgl = await source("app/forge-ceremony-3d.tsx");
  const founder = await source("app/founder/page.tsx");
  const privacy = await source("app/privacy/page.tsx");
  const recovery = await source("app/stale-chunk-recovery.ts");
  assert.match(reporter, /clientReportDecision\(measurementConsent\(\)\)/);
  assert.match(reporter, /routeForReport\(input\.route, window\.location\.pathname\)/);
  assert.match(reporter, /const route = prepared\.route/);
  assert.match(reporter, /keepalive: true/);
  assert.match(reporter, /\/api\/errors/);
  assert.doesNotMatch(reporter, /decklist|deckText|commander|email/);
  assert.match(telemetry, /metaforge-measurement-consent/);
  assert.match(telemetry, /anonymousSessionId/);
  assert.match(controls, /error reports/);
  assert.match(layout, /<ClientDiagnostics>/);
  assert.match(boundary, /kind: isChunkLoadError\(error\) \? "chunk" : "react"/);
  assert.match(session, /reportClientError\(\{ kind: "turnstile", message: "Turnstile did not load"/);
  assert.match(session, /Turnstile verification failed/);
  assert.match(session, /Turnstile verification timed out/);
  assert.match(webgl, /WebGL forge scene failed/);
  assert.match(founder, /\/api\/founder\/errors/);
  assert.match(founder, /Recent errors/);
  assert.match(privacy, /anonymous error reports/);
  assert.match(privacy, /do not include deck contents/);
  assert.match(recovery, /__mfErrorQueue/);
  assert.match(recovery, /location\.pathname/);
});

function readMigration() {
  return readFileSync(new URL("../migrations/0019_error_reports.sql", import.meta.url), "utf8");
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("error-report-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const FOUNDER_KEY = "f45237c471be9524242fb124700a61b6916cbbff9967c8ba74e43af0617bea90";

test("deployed worker status uses the git commit and the founder route stays behind Access", async () => {
  const worker = await loadWorker();
  const db = new ErrorD1();
  const env = {
    DB: db,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    METAFORGE_BOOTSTRAP_LOCK: "unlocked",
    ALLOW_DEV_AUTH_BYPASS: "true",
    METAFORGE_FOUNDER_USER_KEY: FOUNDER_KEY,
  };
  const pending = [];
  const ctx = { waitUntil(promise) { pending.push(Promise.resolve(promise).catch(() => {})); }, passThroughOnException() {} };
  const { execFileSync } = await import("node:child_process");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const status = await (await worker.fetch(new Request("https://example.test/api/forge/status"), env, ctx)).json();
  assert.equal(status.build, commit);
  assert.notEqual(status.build, "2026.07.16-workspace1");
  const recorded = await worker.fetch(reportRequest(clientBody({ build: commit })), env, ctx);
  assert.equal(recorded.status, 202);
  const buddy = await worker.fetch(new Request("https://app.metaforge.gg/api/founder/errors", { headers: { "x-dev-user-email": "buddy@example.com" } }), env, ctx);
  assert.equal(buddy.status, 403);
  const owner = await worker.fetch(new Request("https://app.metaforge.gg/api/founder/errors", { headers: { "x-dev-user-email": "zach@dukecity.games" } }), env, ctx);
  assert.equal(owner.status, 200);
  const groups = (await owner.json()).groups;
  assert.equal(groups[0].message, "Turnstile did not load");
  assert.equal(groups[0].builds[0], commit);
  const blown = await worker.fetch(new Request("https://app.metaforge.gg/api/founder/overview", { headers: { "x-dev-user-email": "zach@dukecity.games" } }), env, ctx);
  assert.equal(blown.status, 500);
  await Promise.all(pending);
  const workerRow = [...db.reports.values()].find((row) => row.source === "worker");
  assert.ok(workerRow, "uncaught worker exception should be stored");
  assert.doesNotMatch(JSON.stringify(workerRow), /user@example.com|Sol Ring|decklist/);
});
