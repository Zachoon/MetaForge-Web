import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked" },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the MetaForge product experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>MetaForge — Forge a Better Deck<\/title>/i);
  assert.match(html, /Stop guessing/);
  assert.match(html, /Forge my analysis/);
  assert.match(html, /FOUNDER FLIGHT CHECK/);
  assert.match(html, /My Deck Bench/);
  assert.match(html, /Send founder feedback/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
