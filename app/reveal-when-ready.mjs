// A single requestAnimationFrame runs before a lazy chamber's first commit,
// so a rail click that scrolls immediately misses #coach-brief, #deck-gallery,
// and .tabletop-surface and leaves the visitor at the top. Keep looking until
// the target is in the document, or until the chunk has had time to arrive.
export function revealWhenReady(lookup, reveal, options = {}) {
  const schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));
  const now = options.now ?? Date.now;
  const deadline = now() + (options.deadlineMs ?? 8000);
  const maxFrames = options.maxFrames ?? 480;
  let cancelled = false;
  let frames = 0;
  const tick = () => {
    if (cancelled) return;
    const element = lookup();
    if (element) {
      reveal(element);
      return;
    }
    frames += 1;
    if (frames < maxFrames && now() < deadline) schedule(tick);
  };
  schedule(tick);
  return () => {
    cancelled = true;
  };
}

export function scrollRevealBehavior() {
  try {
    if (typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "auto";
    }
  } catch {
    // matchMedia can throw in locked-down browsers; smooth remains the default.
  }
  return "smooth";
}
