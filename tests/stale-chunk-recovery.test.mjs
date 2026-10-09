import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Runs the real inline script against a fake window: a deploy-time chunk 404
// must reload the page once, never loop, and never reload when it can't
// record that it already tried.
const source = await readFile(new URL("../app/stale-chunk-recovery.ts", import.meta.url), "utf8");
const script = source.match(/STALE_CHUNK_RECOVERY_SCRIPT = `([\s\S]*?)`;/)?.[1];
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

function fakeWindow({ storageThrows = false, now = 1_000_000 } = {}) {
  const listeners = {};
  const store = new Map();
  const win = {
    reloads: 0,
    sessionStorage: {
      getItem: (key) => { if (storageThrows) throw new Error("blocked"); return store.get(key) ?? null; },
      setItem: (key, value) => { if (storageThrows) throw new Error("blocked"); store.set(key, value); },
    },
    location: { reload: () => { win.reloads += 1; } },
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    fire: (type, event) => { for (const fn of listeners[type] || []) fn(event); return event; },
  };
  const clock = { now };
  const run = new Function("window", "Date", script);
  run(win, { now: () => clock.now });
  return { win, clock };
}

const preloadError = () => ({ defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

test("the recovery script is inlined first in <head>", () => {
  assert.ok(script, "expected the script template");
  const head = layout.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
  assert.ok(head.trim().startsWith("{/*") || head.trim().startsWith("<script dangerouslySetInnerHTML={{ __html: STALE_CHUNK_RECOVERY_SCRIPT }}"));
  assert.ok(head.indexOf("STALE_CHUNK_RECOVERY_SCRIPT") < head.indexOf("<link"), "it must run before anything else loads");
});

test("a failed chunk load reloads once, and not again within 30 seconds", () => {
  const { win, clock } = fakeWindow();
  const first = win.fire("vite:preloadError", preloadError());
  assert.equal(win.reloads, 1);
  assert.equal(first.defaultPrevented, true, "the handled error is suppressed while the page reloads");

  clock.now += 5_000;
  const second = win.fire("vite:preloadError", preloadError());
  assert.equal(win.reloads, 1, "a second failure right after a reload must not loop");
  assert.equal(second.defaultPrevented, false, "a declined reload lets the error surface");

  clock.now += 30_000;
  win.fire("unhandledrejection", { reason: new TypeError("Failed to fetch dynamically imported module: /assets/x.js") });
  assert.equal(win.reloads, 2, "a later deploy can recover again");
});

test("asset 404s on script and link elements also recover; unrelated errors don't", () => {
  const { win } = fakeWindow();
  win.fire("error", { target: { tagName: "IMG", src: "https://metaforge.gg/assets/card.png" } });
  win.fire("unhandledrejection", { reason: new Error("Network request failed") });
  assert.equal(win.reloads, 0);
  win.fire("error", { target: { tagName: "SCRIPT", src: "https://metaforge.gg/assets/page-abc.js" } });
  assert.equal(win.reloads, 1);
});

test("without sessionStorage it never reloads, so it can't loop", () => {
  const { win } = fakeWindow({ storageThrows: true });
  const event = win.fire("vite:preloadError", preloadError());
  assert.equal(win.reloads, 0);
  assert.equal(event.defaultPrevented, false);
});
