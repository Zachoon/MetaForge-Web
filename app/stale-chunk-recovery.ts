// A deploy replaces the hashed files under /assets/. A page loaded just
// before (or while the new files are still reaching Cloudflare's edge) can
// then request a chunk that 404s, and React renders a blank page until the
// visitor refreshes. This script, inlined in <head> before the app loads,
// reloads once when that happens.
//
// Guarded so it can never loop: at most one reload per tab every 30 seconds,
// and no reload at all if sessionStorage is unavailable. When it declines to
// reload, the error is left to surface normally.
export const STALE_CHUNK_RECOVERY_SCRIPT = `(function () {
  var KEY = "mf-stale-chunk-reload-at";
  var WINDOW_MS = 30000;
  var STALE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;
  function reloadOnce() {
    try {
      var last = Number(window.sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last < WINDOW_MS) return false;
      window.sessionStorage.setItem(KEY, String(Date.now()));
    } catch (error) {
      return false;
    }
    window.location.reload();
    return true;
  }
  // Queue only. Nothing is sent until the visitor allows measurement and
  // the app reporter drains this list. Pathname only — no query string.
  function note(kind, message, stack) {
    try {
      var q = window.__mfErrorQueue || (window.__mfErrorQueue = []);
      if (q.length >= 20) return;
      var route = "/";
      try { route = String((window.location && window.location.pathname) || "/").split("?")[0].slice(0, 180); } catch (e) {}
      var clean = function (value, max) { return String(value || "").replace(/[?#][^\s]*/g, "").slice(0, max); };
      q.push({ kind: kind, message: clean(message, 500), stack: clean(stack, 1500), route: route });
    } catch (e) {}
  }
  window.addEventListener("vite:preloadError", function (event) {
    note("chunk", "Failed to fetch dynamically imported module");
    if (reloadOnce()) event.preventDefault();
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var text = String((reason && reason.message) || reason);
    if (STALE.test(text)) reloadOnce();
    note(STALE.test(text) ? "chunk" : "unhandledrejection", text, reason && reason.stack);
  });
  window.addEventListener("error", function (event) {
    var target = event.target;
    var url = target && (target.src || target.href);
    if (url && String(url).indexOf("/assets/") !== -1 && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
      note("chunk", "Failed to load " + target.tagName);
      reloadOnce();
      return;
    }
    if (event.message || (event.error && event.error.message)) note("window.error", event.message || event.error.message, event.error && event.error.stack);
  }, true);
})();`;
