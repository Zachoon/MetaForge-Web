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
  window.addEventListener("vite:preloadError", function (event) {
    if (reloadOnce()) event.preventDefault();
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    if (STALE.test(String((reason && reason.message) || reason))) reloadOnce();
  });
  window.addEventListener("error", function (event) {
    var target = event.target;
    var url = target && (target.src || target.href);
    if (url && String(url).indexOf("/assets/") !== -1 && (target.tagName === "SCRIPT" || target.tagName === "LINK")) reloadOnce();
  }, true);
})();`;
