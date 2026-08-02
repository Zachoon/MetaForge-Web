// Debounced, race-safe request runner for the structural-analysis fetch.
// Pulled out of the React effect in page.tsx into a plain, framework-free
// function specifically so the race/staleness behavior (rapid edits
// collapsing into one request, an out-of-order late response never
// overwriting newer state) is directly unit-testable without rendering
// a component — see tests/debounced-analysis-request.test.mjs.
//
// Call runDebouncedAnalysis(...) inside a useEffect and return the
// cancel function it gives back as that effect's cleanup; React already
// calls the previous effect's cleanup before running the next one, so a
// superseded call is always canceled before a new one starts.
export function runDebouncedAnalysis({
  requestBody,
  delayMs,
  fetchImpl,
  url,
  onLoading,
  onSuccess,
  onError,
}) {
  let cancelled = false;
  const controller = new AbortController();
  onLoading();
  const timer = setTimeout(async () => {
    if (cancelled) return;
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) throw new Error(data?.error || "Request failed");
      onSuccess(data);
    } catch (error) {
      if (cancelled) return;
      if (error?.name === "AbortError") return;
      onError(error);
    }
  }, delayMs);
  return function cancel() {
    cancelled = true;
    controller.abort();
    clearTimeout(timer);
  };
}
