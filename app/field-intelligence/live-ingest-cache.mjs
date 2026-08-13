// =============================================================================
// Field Intelligence — Live ingest cache + TopDeck chunk checkpoints
// =============================================================================
// Raw API responses only. Never stores API keys. Gitignored under live-cache/.
// =============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const freeze = (value) => Object.freeze(value);
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_CHUNK_DAYS = 30;

/**
 * Plan oldest→newest day chunks covering lastDays.
 * dayOffsetStart/End are inclusive 1-based offsets from (now - lastDays).
 */
export function planDayChunks(lastDays = 90, chunkDays = DEFAULT_CHUNK_DAYS, nowMs = Date.now()) {
  const total = Math.max(1, Math.floor(Number(lastDays) || 1));
  const size = Math.max(1, Math.floor(Number(chunkDays) || DEFAULT_CHUNK_DAYS));
  const endMs = Number(nowMs);
  const windowStartMs = endMs - (total * DAY_MS);
  const chunks = [];
  let cursorMs = windowStartMs;
  let dayOffset = 1;

  while (dayOffset <= total) {
    const remaining = total - dayOffset + 1;
    const span = Math.min(size, remaining);
    const chunkStartMs = cursorMs;
    const chunkEndMs = Math.min(endMs, cursorMs + (span * DAY_MS));
    const startUnix = Math.floor(chunkStartMs / 1000);
    const endUnix = Math.floor(chunkEndMs / 1000);
    const dayOffsetEnd = dayOffset + span - 1;
    const key = `chunk-${startUnix}-${endUnix}`;
    chunks.push(freeze({
      key,
      dayOffsetStart: dayOffset,
      dayOffsetEnd,
      label: `Days ${dayOffset}–${dayOffsetEnd}`,
      startUnix,
      endUnix,
      spanDays: span,
      isNewest: dayOffsetEnd >= total,
    }));
    cursorMs = chunkEndMs;
    dayOffset += span;
  }

  return freeze(chunks);
}

export function topdeckChunkCacheKey({ startUnix, endUnix, participantMin = 16, format = "EDH" } = {}) {
  return `chunk-${startUnix}-${endUnix}-pmin${participantMin}-${String(format).toLowerCase()}`;
}

export function defaultLiveCacheDir(baseDir) {
  return join(baseDir, "live-cache");
}

export function topdeckCachePaths(cacheDir) {
  const root = join(cacheDir, "topdeck");
  return freeze({
    root,
    checkpointPath: join(root, "checkpoint.json"),
    chunkPath: (key) => join(root, `${key}.json`),
  });
}

export function readTopDeckCheckpoint(cacheDir) {
  const { checkpointPath } = topdeckCachePaths(cacheDir);
  if (!existsSync(checkpointPath)) {
    return freeze({ version: "topdeck-checkpoint-v1", completed: freeze([]), chunks: freeze({}) });
  }
  try {
    const raw = JSON.parse(readFileSync(checkpointPath, "utf8"));
    return freeze({
      version: raw.version || "topdeck-checkpoint-v1",
      window: raw.window || null,
      updatedAt: raw.updatedAt || null,
      completed: freeze(raw.completed || []),
      chunks: freeze(raw.chunks || {}),
    });
  } catch {
    return freeze({ version: "topdeck-checkpoint-v1", completed: freeze([]), chunks: freeze({}) });
  }
}

export function writeTopDeckCheckpoint(cacheDir, checkpoint) {
  const { root, checkpointPath } = topdeckCachePaths(cacheDir);
  mkdirSync(root, { recursive: true });
  const payload = {
    version: "topdeck-checkpoint-v1",
    updatedAt: new Date().toISOString(),
    ...checkpoint,
  };
  writeFileSync(checkpointPath, JSON.stringify(payload, null, 2));
  return checkpointPath;
}

export function readCachedTopDeckChunk(cacheDir, key) {
  const path = topdeckCachePaths(cacheDir).chunkPath(key);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function writeCachedTopDeckChunk(cacheDir, key, payload) {
  const { root, chunkPath } = topdeckCachePaths(cacheDir);
  mkdirSync(root, { recursive: true });
  const path = chunkPath(key);
  writeFileSync(path, JSON.stringify(payload));
  return path;
}

export function isChunkCacheComplete(cacheDir, key, checkpoint = null) {
  const cp = checkpoint || readTopDeckCheckpoint(cacheDir);
  if (!(cp.completed || []).includes(key)) return false;
  return existsSync(topdeckCachePaths(cacheDir).chunkPath(key));
}
