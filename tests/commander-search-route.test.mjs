import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("the Worker owns commander lookup, retries upstream failures, falls back to a second index, and caches successful searches", async () => {
  const route = await readFile(new URL("worker/commander-search.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(route, /is:commander/);
  assert.match(route, /attempt < 2/);
  assert.match(route, /AbortSignal\.timeout\(6000\)/);
  assert.match(route, /caches\.default/);
  assert.match(route, /api\.magicthegathering\.io\/v1\/cards/);
  assert.match(route, /fetchSecondaryCommanderIndex/);
  assert.match(route, /max-age=0, must-revalidate/);
  assert.match(route, /cache\.put\(cacheKey, result\.clone\(\)\)/);
  assert.match(route, /normalizeCommanderSearchName/);
  assert.match(route, /scryfallCommanderSearchName/);
  assert.match(route, /replace\(\/\[A-Za-z\]\/, \(letter\) => letter\.toUpperCase\(\)\)/);
  assert.match(route, /\\u2018\\u2019/);
  assert.match(route, /canonicalCacheUrl\.searchParams\.set\("q", query\)/);
  assert.match(route, /canonicalCacheUrl\.searchParams\.set\("search_schema", "3"\)/);
  assert.doesNotMatch(route, /name:\\"\$\{safeName\}/);
  assert.match(worker, /\/api\/cards\/commanders/);
  assert.match(worker, /handleCommanderSearch/);
  assert.match(page, /client_schema=2/);
  assert.match(page, /cache: "no-store"/);
});
