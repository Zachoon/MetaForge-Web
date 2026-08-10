import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("the Worker owns commander lookup, retries upstream failures, and caches successful searches", async () => {
  const route = await readFile(new URL("worker/commander-search.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  assert.match(route, /is:commander/);
  assert.match(route, /attempt < 2/);
  assert.match(route, /AbortSignal\.timeout\(6000\)/);
  assert.match(route, /caches\.default/);
  assert.match(route, /cache\.put\(cacheKey, result\.clone\(\)\)/);
  assert.match(worker, /\/api\/cards\/commanders/);
  assert.match(worker, /handleCommanderSearch/);
});
