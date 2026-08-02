import assert from "node:assert/strict";
import test from "node:test";
import { runDebouncedAnalysis } from "../app/debounced-analysis-request.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function fakeResponse(body, ok = true) {
  return { ok, json: async () => body };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("calls onLoading synchronously and onSuccess after the delay elapses", async () => {
  const events = [];
  let fetchCalls = 0;
  const cancel = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 5,
    requestBody: { cards: [] },
    fetchImpl: async () => {
      fetchCalls += 1;
      return fakeResponse({ report: { ok: true } });
    },
    onLoading: () => events.push("loading"),
    onSuccess: (data) => events.push(["success", data]),
    onError: (error) => events.push(["error", error]),
  });
  assert.deepEqual(events, ["loading"]);
  await wait(20);
  assert.equal(fetchCalls, 1);
  assert.deepEqual(events, ["loading", ["success", { report: { ok: true } }]]);
  cancel();
});

test("rapid successive calls collapse into exactly one actual fetch", async () => {
  // Mirrors the real usage pattern: a React effect's cleanup (the
  // returned cancel function) always runs before the next effect fires,
  // so a rapid sequence of edits should cancel every prior in-flight
  // debounce timer before it ever calls fetchImpl — never firing more
  // than one real request for a burst of changes.
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return fakeResponse({ report: "final" });
  };
  let lastResult = null;
  let cancel = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 15,
    requestBody: { edit: 1 },
    fetchImpl,
    onLoading: () => {},
    onSuccess: (data) => (lastResult = data),
    onError: () => {},
  });
  for (let edit = 2; edit <= 5; edit += 1) {
    cancel();
    cancel = runDebouncedAnalysis({
      url: "https://example.test/analyze",
      delayMs: 15,
      requestBody: { edit },
      fetchImpl,
      onLoading: () => {},
      onSuccess: (data) => (lastResult = data),
      onError: () => {},
    });
  }
  await wait(40);
  assert.equal(fetchCalls, 1);
  assert.deepEqual(lastResult, { report: "final" });
  cancel();
});

test("an out-of-order late response never overwrites a newer result", async () => {
  const deferredA = deferred();
  const deferredB = deferred();
  const results = [];

  const cancelA = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 0,
    requestBody: { revision: "A" },
    fetchImpl: async () => deferredA.promise,
    onLoading: () => {},
    onSuccess: (data) => results.push(data),
    onError: () => {},
  });
  // Let A's debounce timer fire so it's genuinely in flight (its
  // fetchImpl has been called and is awaiting deferredA) before it gets
  // superseded — the realistic case a naive implementation gets wrong.
  await wait(5);

  cancelA();
  const cancelB = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 0,
    requestBody: { revision: "B" },
    fetchImpl: async () => deferredB.promise,
    onLoading: () => {},
    onSuccess: (data) => results.push(data),
    onError: () => {},
  });
  await wait(5);

  // B (the newer request) resolves first, then A's stale response
  // arrives late — A must never be allowed to overwrite B's result.
  deferredB.resolve(fakeResponse({ report: "B" }));
  await wait(5);
  deferredA.resolve(fakeResponse({ report: "A" }));
  await wait(5);

  assert.deepEqual(results, [{ report: "B" }]);
  cancelB();
});

test("aborts the in-flight fetch's AbortSignal when superseded", async () => {
  let observedSignal = null;
  const cancel = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 0,
    requestBody: {},
    fetchImpl: async (_url, init) => {
      observedSignal = init.signal;
      return new Promise(() => {}); // never resolves on its own
    },
    onLoading: () => {},
    onSuccess: () => {},
    onError: () => {},
  });
  await wait(5);
  assert.equal(observedSignal.aborted, false);
  cancel();
  assert.equal(observedSignal.aborted, true);
});

test("an AbortError from a canceled fetch is swallowed, not surfaced as onError", async () => {
  let errorCalls = 0;
  const cancel = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 0,
    requestBody: {},
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
    onLoading: () => {},
    onSuccess: () => {},
    onError: () => {
      errorCalls += 1;
    },
  });
  await wait(5);
  cancel();
  await wait(5);
  assert.equal(errorCalls, 0);
});

test("a real (non-abort) fetch failure calls onError exactly once", async () => {
  const events = [];
  const cancel = runDebouncedAnalysis({
    url: "https://example.test/analyze",
    delayMs: 0,
    requestBody: {},
    fetchImpl: async () => fakeResponse({ error: "boom" }, false),
    onLoading: () => events.push("loading"),
    onSuccess: () => events.push("success"),
    onError: (error) => events.push(["error", error.message]),
  });
  await wait(10);
  assert.deepEqual(events, ["loading", ["error", "boom"]]);
  cancel();
});
