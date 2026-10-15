// Shared redaction for client and worker error reports. Kept free of D1 and
// DOM so both the Worker and node:test can import it. Reports keep a route,
// coarse browser, viewport, build id, and anonymous session. They drop
// emails, addresses, tokens, query strings, and decklists.

const CLIENT_KINDS = new Set(["window.error", "unhandledrejection", "react", "chunk", "turnstile"]);
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const SECRET_ASSIGNMENT = /\b(?:bearer|token|api[_-]?key|authorization|password|cookie)\s*[:=]\s*\S+/gi;
const BEARER = /\bbearer\s+[A-Za-z0-9._~+/-]{8,}/gi;
const LONG_SECRET = /\b(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{32,}\b/g;
const HTTP_URL = /\bhttps?:\/\/[^\s<>"']+/gi;
const QUERY = /[?#][^\s<>"']*/g;
const CARD_QUANTITY = /\b\d{1,2}\s*[xX]?\s+[A-Z][\w'’:,.-]{1,}/g;

export function clientReportDecision(consent) {
  if (consent === "allowed") return "send";
  if (consent === "declined") return "drop";
  return "buffer";
}

function stripSecrets(value) {
  return value
    .replace(HTTP_URL, (raw) => {
      const trimmed = raw.replace(/[),.;]+$/, "");
      const suffix = raw.slice(trimmed.length);
      try {
        const url = new globalThis.URL(trimmed);
        return `${url.origin}${url.pathname}${suffix}`;
      } catch {
        return `[url]${suffix}`;
      }
    })
    .replace(QUERY, "")
    .replace(EMAIL, "[email]")
    .replace(JWT, "[token]")
    .replace(BEARER, "[secret]")
    .replace(SECRET_ASSIGNMENT, "[secret]")
    .replace(IPV4, "[ip]")
    .replace(LONG_SECRET, "[token]");
}

function isDeckLine(line) {
  if (/error|fail|undefined|exception|cannot|chunk|turnstile|loading|invalid|unexpected|typeerror|referenceerror/i.test(line)) return false;
  const match = line.match(/^\s*(\d{1,2})\s*[xX]?\s+[A-Z][\w'’:,.-]*(?:\s+[A-Z0-9][\w'’:,.-]*){0,10}\s*$/);
  if (!match) return false;
  const qty = Number(match[1]);
  return qty >= 1 && qty <= 99;
}

function redactLine(line) {
  if (isDeckLine(line)) return "";
  const quantities = line.match(CARD_QUANTITY);
  if (quantities && quantities.length >= 2) return "";
  return line;
}

export function redactMessage(value, max = 300) {
  if (typeof value !== "string") return "";
  const cleaned = stripSecrets(value.replace(/\u0000/g, "").replace(/\r\n/g, "\n"));
  const text = cleaned.split("\n").map(redactLine).filter(Boolean).join("\n").replace(/[ \t]{2,}/g, " ").trim();
  return text.slice(0, max);
}

export function redactStack(value, max = 1200) {
  if (typeof value !== "string") return null;
  const text = stripSecrets(value.replace(/\u0000/g, ""))
    .split("\n")
    .map((line) => redactLine(line))
    .filter(Boolean)
    .join("\n")
    .trim();
  return text ? text.slice(0, max) : null;
}

export function sanitizeRoute(value) {
  if (typeof value !== "string") return "/";
  const path = value.split("?")[0].split("#")[0].trim();
  if (!/^\/[A-Za-z0-9/_\-.]{0,160}$/.test(path) || path.includes("..")) return "/";
  return path || "/";
}

// A route captured when the error happened wins over the page the visitor
// is on when a buffered report is finally sent. The current path is only
// the fallback for callers that did not record one.
export function routeForReport(captured, current) {
  if (typeof captured === "string" && captured.trim()) return sanitizeRoute(captured);
  return sanitizeRoute(current);
}

export function sanitizeViewport(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2,5})x(\d{2,5})$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1 || width > 20000 || height > 20000) return null;
  return `${width}x${height}`;
}

export function sanitizeSession(value) {
  if (typeof value !== "string") return null;
  const session = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(session) ? session : null;
}

export function sanitizeBuild(value) {
  if (typeof value !== "string") return "unknown";
  const build = value.trim().toLowerCase();
  return /^[0-9a-f]{7,64}$/.test(build) ? build : "unknown";
}

export function sanitizeDetail(value) {
  if (typeof value !== "string") return null;
  const detail = value.trim();
  return /^[A-Za-z0-9_.:-]{1,40}$/.test(detail) ? detail : null;
}

export function coarseBrowser(userAgent) {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua.trim()) return null;
  let name = "Browser";
  let version = "";
  const edge = ua.match(/Edg\/(\d+)/);
  const opera = ua.match(/(?:OPR|Opera)\/(\d+)/);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const safari = ua.match(/Version\/(\d+).*Safari/);
  if (edge) { name = "Edge"; version = edge[1]; }
  else if (opera) { name = "Opera"; version = opera[1]; }
  else if (firefox) { name = "Firefox"; version = firefox[1]; }
  else if (chrome) { name = "Chrome"; version = chrome[1]; }
  else if (safari) { name = "Safari"; version = safari[1]; }
  else if (/Safari/.test(ua)) name = "Safari";
  let os = "Unknown OS";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return version ? `${name} ${version} · ${os}` : `${name} · ${os}`;
}

export function prepareClientError(input) {
  if (!input || typeof input !== "object") return null;
  const kind = CLIENT_KINDS.has(input.kind) ? input.kind : null;
  if (!kind) return null;
  const message = redactMessage(input.message);
  if (!message) return null;
  return {
    source: "client",
    kind,
    message,
    stack: redactStack(input.stack),
    route: sanitizeRoute(input.route),
    detail: sanitizeDetail(input.detail),
  };
}

export function prepareWorkerError(input) {
  const message = redactMessage(input?.message || "Worker exception");
  if (!message) return null;
  const userAgent = typeof input?.userAgent === "string" ? input.userAgent : "";
  return {
    source: "worker",
    kind: "worker",
    message,
    stack: redactStack(input?.stack),
    route: sanitizeRoute(input?.route),
    browser: coarseBrowser(userAgent),
    userAgent: redactStack(userAgent, 180),
    viewport: null,
    session: null,
    build: sanitizeBuild(input?.build),
    detail: null,
  };
}

export function finalizeClientError(prepared, meta) {
  const userAgent = typeof meta?.userAgent === "string" ? meta.userAgent : "";
  return {
    ...prepared,
    browser: coarseBrowser(userAgent),
    userAgent: redactStack(userAgent, 180),
    viewport: sanitizeViewport(meta?.viewport),
    session: sanitizeSession(meta?.session),
    build: sanitizeBuild(meta?.build),
  };
}

export function groupErrorRows(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    const message = typeof row?.message === "string" ? row.message : "";
    if (!message) continue;
    let group = groups.get(message);
    if (!group) {
      group = {
        message,
        occurrences: 0,
        variants: 0,
        firstSeen: Number(row.first_seen) || 0,
        lastSeen: -1,
        sources: new Set(),
        kinds: new Set(),
        routes: new Set(),
        builds: new Set(),
        browsers: new Set(),
        latest: null,
      };
      groups.set(message, group);
    }
    group.occurrences += Number(row.count) || 0;
    group.variants += 1;
    group.firstSeen = Math.min(group.firstSeen, Number(row.first_seen) || group.firstSeen);
    if (row.source) group.sources.add(row.source);
    if (row.kind) group.kinds.add(row.kind);
    if (row.route) group.routes.add(row.route);
    if (row.build_id) group.builds.add(row.build_id);
    if (row.browser) group.browsers.add(row.browser);
    const seen = Number(row.last_seen) || 0;
    if (!group.latest || seen >= group.lastSeen) {
      group.lastSeen = seen;
      let detail = null;
      try { detail = JSON.parse(row.context_json || "{}").detail || null; } catch { detail = null; }
      group.latest = {
        stack: row.stack || null,
        viewport: row.viewport || null,
        session: row.session_id || null,
        userAgent: row.user_agent || null,
        route: row.route || null,
        kind: row.kind,
        source: row.source,
        build: row.build_id || null,
        browser: row.browser || null,
        detail: typeof detail === "string" ? detail : null,
      };
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.lastSeen - a.lastSeen || b.occurrences - a.occurrences)
    .map((group) => ({
      message: group.message,
      occurrences: group.occurrences,
      variants: group.variants,
      firstSeen: group.firstSeen,
      lastSeen: group.lastSeen,
      sources: [...group.sources],
      kinds: [...group.kinds],
      routes: [...group.routes],
      builds: [...group.builds],
      browsers: [...group.browsers],
      latest: group.latest,
    }));
}
