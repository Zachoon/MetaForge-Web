"use client";

import { metaforgeBuildId } from "./build-id";
import { clientReportDecision, prepareClientError } from "./error-report-sanitize.mjs";
import { anonymousSessionId, measurementConsent } from "./launch-telemetry";

type QueuedError = { kind?: string; message?: string; stack?: string; route?: string; detail?: string };
type PreparedError = NonNullable<ReturnType<typeof prepareClientError>>;

declare global {
  interface Window {
    __mfErrorQueue?: QueuedError[];
  }
}

const buffer: PreparedError[] = [];
const recent = new Map<string, number>();
let installed = false;

function remember(prepared: PreparedError) {
  if (buffer.length >= 20) buffer.shift();
  buffer.push(prepared);
}

function sendPrepared(prepared: PreparedError) {
  const route = typeof window !== "undefined" ? window.location.pathname : prepared.route;
  const key = `${prepared.kind}\n${prepared.message}\n${route}`;
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < 60_000) return;
  recent.set(key, now);
  const viewport = typeof window === "undefined" ? null : `${window.innerWidth}x${window.innerHeight}`;
  const body = JSON.stringify({
    kind: prepared.kind,
    message: prepared.message,
    stack: prepared.stack,
    route,
    detail: prepared.detail,
    session: anonymousSessionId(),
    viewport,
    build: metaforgeBuildId(),
  });
  void fetch("/api/errors", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => { /* reporting must never interrupt the Forge */ });
}

export function reportClientError(input: QueuedError) {
  if (typeof window === "undefined") return;
  const prepared = prepareClientError(input);
  if (!prepared) return;
  const decision = clientReportDecision(measurementConsent());
  if (decision === "drop") return;
  if (decision === "buffer") { remember(prepared); return; }
  sendPrepared(prepared);
}

export function flushClientErrorReports() {
  if (typeof window === "undefined") return;
  const queued = Array.isArray(window.__mfErrorQueue) ? window.__mfErrorQueue.splice(0, window.__mfErrorQueue.length) : [];
  const decision = clientReportDecision(measurementConsent());
  if (decision === "drop") {
    buffer.length = 0;
    return;
  }
  for (const item of queued) {
    const prepared = prepareClientError(item);
    if (!prepared) continue;
    if (decision === "buffer") remember(prepared);
    else sendPrepared(prepared);
  }
  if (decision !== "send") return;
  const pending = buffer.splice(0, buffer.length);
  for (const prepared of pending) sendPrepared(prepared);
}

export function installClientErrorReporting() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("metaforge-measurement-consent", flushClientErrorReports);
  window.addEventListener("pagehide", flushClientErrorReports);
  flushClientErrorReports();
  window.setInterval(flushClientErrorReports, 5000);
}
