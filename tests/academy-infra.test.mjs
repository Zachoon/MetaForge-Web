#!/usr/bin/env node
// Academy infrastructure reliability — observatory only (no Brain mutation).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  planDayChunks,
  topdeckChunkCacheKey,
  readTopDeckCheckpoint,
  isChunkCacheComplete,
  DEFAULT_CHUNK_DAYS,
} from "../app/field-intelligence/live-ingest-cache.mjs";
import {
  fetchTopDeckTournamentsChunked,
} from "../app/field-intelligence/adapters/topdeck.mjs";
import { buildSourceHealthDashboard } from "../app/field-intelligence/source-health.mjs";
import { summarizeResearchDelta } from "../app/field-intelligence/research-store.mjs";
import { runFieldIntelligenceV1 } from "../app/field-intelligence/pipeline.mjs";

const DAY = 24 * 60 * 60 * 1000;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return body;
    },
  };
}

test("planDayChunks: 90d → three 30d windows oldest→newest", () => {
  const now = Date.parse("2026-08-10T12:00:00.000Z");
  const chunks = planDayChunks(90, 30, now);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].dayOffsetStart, 1);
  assert.equal(chunks[0].dayOffsetEnd, 30);
  assert.equal(chunks[1].label, "Days 31–60");
  assert.equal(chunks[2].dayOffsetStart, 61);
  assert.equal(chunks[2].dayOffsetEnd, 90);
  assert.equal(chunks[2].isNewest, true);
  assert.equal(chunks[0].isNewest, false);
  assert.ok(chunks[0].startUnix < chunks[1].startUnix);
  assert.ok(chunks[2].endUnix === Math.floor(now / 1000));
  assert.equal(DEFAULT_CHUNK_DAYS, 30);
});

test("chunked TopDeck: cache hit skips fetch; newest always refetched", async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "mf-live-cache-"));
  const now = Date.parse("2026-08-10T12:00:00.000Z");
  let fetchCount = 0;
  const fetchImpl = async (_url, init) => {
    fetchCount += 1;
    const body = JSON.parse(init.body);
    assert.ok(Number.isFinite(body.start));
    assert.ok(Number.isFinite(body.end));
    assert.equal(body.last, undefined);
    return jsonResponse([{
      TID: `T-${body.start}`,
      tournamentName: `Event ${body.start}`,
      players: 32,
      startDate: body.start,
      standings: [],
    }]);
  };

  const first = await fetchTopDeckTournamentsChunked({
    apiKey: "test-key",
    lastDays: 90,
    chunkDays: 30,
    participantMin: 16,
    liveCacheDir: cacheDir,
    nowMs: now,
    fetchImpl,
    maxRetries: 0,
    timeoutMs: 5000,
  });
  assert.equal(first.ok, true);
  assert.equal(fetchCount, 3);
  assert.equal(first.chunking.cacheHits, 0);
  assert.equal(first.chunking.fetchedChunks, 3);
  assert.ok(first.chunking.progressLine.includes("✓"));

  const checkpoint = readTopDeckCheckpoint(cacheDir);
  assert.ok(checkpoint.completed.length >= 2);

  fetchCount = 0;
  const second = await fetchTopDeckTournamentsChunked({
    apiKey: "test-key",
    lastDays: 90,
    chunkDays: 30,
    participantMin: 16,
    liveCacheDir: cacheDir,
    nowMs: now,
    fetchImpl,
    maxRetries: 0,
    timeoutMs: 5000,
  });
  assert.equal(second.ok, true);
  // Oldest two from cache; newest refetched.
  assert.equal(fetchCount, 1);
  assert.equal(second.chunking.cacheHits, 2);
  assert.equal(second.chunking.fetchedChunks, 1);

  rmSync(cacheDir, { recursive: true, force: true });
});

test("chunked TopDeck resume: completed older chunks survive a newest failure", async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "mf-live-cache-resume-"));
  const now = Date.parse("2026-08-10T12:00:00.000Z");
  const chunks = planDayChunks(90, 30, now);
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls += 1;
    const body = JSON.parse(init.body);
    if (body.start === chunks[2].startUnix) {
      throw new Error("This operation was aborted");
    }
    return jsonResponse([{
      TID: `T-${body.start}`,
      players: 20,
      startDate: body.start,
      standings: [],
    }]);
  };

  const result = await fetchTopDeckTournamentsChunked({
    apiKey: "test-key",
    lastDays: 90,
    chunkDays: 30,
    liveCacheDir: cacheDir,
    nowMs: now,
    fetchImpl,
    maxRetries: 0,
    timeoutMs: 2000,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "partial");
  assert.ok(result.tournaments.length >= 2);
  assert.equal(result.chunking.fetchedChunks, 2);
  assert.ok(result.chunking.failedChunk);

  const key0 = topdeckChunkCacheKey({
    startUnix: chunks[0].startUnix,
    endUnix: chunks[0].endUnix,
    participantMin: 16,
    format: "EDH",
  });
  assert.equal(isChunkCacheComplete(cacheDir, key0), true);
  assert.ok(existsSync(join(cacheDir, "topdeck", `${key0}.json`)));

  rmSync(cacheDir, { recursive: true, force: true });
});

test("source health maps credentials / network / success", () => {
  const health = buildSourceHealthDashboard({
    topdeck: { attempted: true, ok: true, status: "ok", elapsedMs: 18200, decks: 194, tournaments: 40 },
    spicerack: { attempted: true, ok: false, status: "needs_credentials", reason: "missing_SPICERACK_API_KEY", decks: 0, tournaments: 0 },
    edhtop16: { attempted: true, ok: false, status: "schema_or_query_mismatch", reason: "graphql_errors", decks: 0, tournaments: 0 },
  });
  assert.equal(health.byId.topdeck.status, "healthy");
  assert.equal(health.byId.topdeck.label, "SUCCESS");
  assert.equal(health.byId.spicerack.status, "missing_credentials");
  assert.equal(health.byId.spicerack.label, "MISSING KEY");
  assert.equal(health.byId.edhtop16.status, "schema_mismatch");
  assert.equal(health.byId.edhtop16.label, "SCHEMA MISMATCH");
});

test("research delta answers what changed since last run", () => {
  const delta = summarizeResearchDelta({
    priorIndex: {
      lastRun: "2026-08-09T00:00:00.000Z",
      totalRows: 100,
      snapshot: { events: 10, decks: 50, commanders: 5, principles: 20 },
    },
    appendResult: { written: 3, skipped: 40, path: "/tmp/observations.jsonl" },
    currentArtifact: {
      generatedAt: "2026-08-10T00:00:00.000Z",
      corpus: { eventsRepresented: 16, decksAnalyzed: 80, uniqueCommanders: 7 },
      strategicPrincipleRegistry: { principleCount: 25 },
      provenance: { corpusMode: "live" },
    },
  });
  assert.equal(delta.questionAnswered, "What changed since last run?");
  assert.equal(delta.deltas.events, 6);
  assert.equal(delta.deltas.decks, 30);
  assert.equal(delta.deltas.principles, 5);
  assert.equal(delta.append.written, 3);
});

test("provenance: live empty → USED_AS_FALLBACK; fixture-only → FIXTURE_RUN", async () => {
  const fixtureOnly = await runFieldIntelligenceV1({
    tryLive: false,
    fixtureOnly: true,
    enrich: false,
    allowNetwork: false,
  });
  assert.equal(fixtureOnly.provenance.syntheticFixtures, "FIXTURE_RUN");
  assert.equal(fixtureOnly.provenance.corpusMode, "fixture");
  assert.equal(fixtureOnly.artifact.provenance.syntheticFixtures, "FIXTURE_RUN");

  const previous = process.env.TOPDECK_API_KEY;
  delete process.env.TOPDECK_API_KEY;
  const liveEmpty = await runFieldIntelligenceV1({
    tryLive: true,
    fixtureOnly: false,
    enrich: false,
    allowNetwork: false,
    topdeckApiKey: null,
    spicerackApiKey: null,
    fetchImpl: async () => jsonResponse({ errors: [{ message: "boom" }] }, 500),
  });
  assert.equal(liveEmpty.provenance.syntheticFixtures, "USED_AS_FALLBACK");
  assert.equal(liveEmpty.provenance.corpusMode, "synthetic_fallback");
  assert.equal(liveEmpty.provenance.topdeck, "MISSING KEY");
  assert.match(liveEmpty.artifact.comparedToFixture.note, /FALLBACK|LIVE REQUESTED/i);
  if (previous != null) process.env.TOPDECK_API_KEY = previous;
});

test("provenance: live non-empty → NOT_USED", async () => {
  const now = Date.parse("2026-08-10T12:00:00.000Z");
  const cacheDir = mkdtempSync(join(tmpdir(), "mf-live-prov-"));
  const fetchImpl = async (url, init) => {
    if (String(url).includes("topdeck")) {
      const body = JSON.parse(init.body);
      return jsonResponse([{
        TID: `live-${body.start}`,
        tournamentName: "Live Event",
        players: 32,
        topCut: 4,
        startDate: body.start,
        format: "EDH",
        standings: [
          {
            standing: 1,
            name: "P1",
            id: "p1",
            wins: 3,
            losses: 0,
            draws: 0,
            deckObj: {
              Commanders: { "Test Commander": { id: 1 } },
              Mainboard: { "Sol Ring": { count: 1 }, "Counterspell": { count: 1 } },
            },
          },
          {
            standing: 16,
            name: "P16",
            id: "p16",
            wins: 0,
            losses: 3,
            draws: 0,
            deckObj: {
              Commanders: { "Test Commander": { id: 1 } },
              Mainboard: { "Sol Ring": { count: 1 }, "Doom Blade": { count: 1 } },
            },
          },
        ],
      }]);
    }
    return jsonResponse({ errors: [{ message: "skip" }] }, 400);
  };

  const result = await runFieldIntelligenceV1({
    tryLive: true,
    fixtureOnly: false,
    enrich: false,
    allowNetwork: false,
    topdeckApiKey: "test-key",
    lastDays: 30,
    chunkDays: 30,
    maxEvents: 5,
    liveCacheDir: cacheDir,
    nowMs: now,
    fetchImpl,
    maxRetries: 0,
  });

  assert.equal(result.provenance.syntheticFixtures, "NOT_USED");
  assert.equal(result.provenance.corpusMode, "live");
  assert.ok(result.artifact.corpus.decksAnalyzed >= 1);
  assert.equal(result.provenance.topdeck, "SUCCESS");
  assert.ok(result.artifact.sourceHealth);

  rmSync(cacheDir, { recursive: true, force: true });
});
