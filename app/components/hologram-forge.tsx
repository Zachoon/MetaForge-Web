"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useForgeSession } from "../forge-session-context";

export type ForgeShell = {
  id: string;
  label: string;
  short: string;
  actual: number;
  target: number;
  ratio: number;
};

export function useHoloLive(ref: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      const visible = Boolean(entry?.isIntersecting);
      setOnScreen(visible);
      el.setAttribute("data-holo-live", visible ? "on" : "off");
    }, { rootMargin: "120px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export function HoloField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoloLive(ref);
  return (
    <div ref={ref} className={`holo-field ${className}`} data-holo-live="off" aria-hidden="true">
      <div className="holo-floor" />
      <div className="holo-scan" />
      <div className="holo-noise" />
      <div className="holo-edge" />
    </div>
  );
}

export function HoloRule({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoloLive(ref);
  return (
    <div ref={ref} className={`holo-rule ${className}`} data-holo-live="off" aria-hidden="true">
      <span className="holo-edge" />
      <span className="holo-scan" />
      <span className="holo-noise" />
    </div>
  );
}

/* Shells of a deck, drawn as a wireframe that fills from the profile the
   forge already keeps. No three.js: the shape is one SVG. */
export function HoloForge({
  shells,
  frame,
  complete,
  className = "",
}: {
  shells: ForgeShell[];
  frame: ForgeShell;
  complete: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useHoloLive(ref);
  const reduced = usePrefersReducedMotion();
  const { motionMode } = useForgeSession();
  const live = onScreen && motionMode === "full" && !reduced;
  const filterId = `holo-emissive-${useId().replace(/:/g, "")}`;
  const wasComplete = useRef(false);
  const [flourish, setFlourish] = useState(false);
  if (!complete && flourish) setFlourish(false);

  useEffect(() => {
    if (!complete) {
      wasComplete.current = false;
      return;
    }
    if (wasComplete.current || !live) {
      wasComplete.current = true;
      return;
    }
    wasComplete.current = true;
    setFlourish(true);
    const timer = window.setTimeout(() => setFlourish(false), 1400);
    return () => window.clearTimeout(timer);
  }, [complete, live]);

  const bands = shells.length ? shells : [];
  const face = bands[bands.length - 1];
  const edges = bands.slice(0, -1);
  const faceH = 62;
  const edgeH = edges.length ? Math.min(8, 78 / edges.length) : 0;
  const faceY = 22;
  const filled = bands.filter((shell) => shell.ratio >= 1).length + (frame.ratio >= 1 ? 1 : 0);
  const total = bands.length + 1;
  const readout = [...bands, frame];
  const summary = complete
    ? "Forged metal deck. Every section is full."
    : `Hologram deck, ${filled} of ${total} parts filled. ${bands.map((shell) => `${shell.label} ${shell.actual} of ${shell.target}`).join(", ")}. Deck size ${frame.actual} of ${frame.target}.`;

  return (
    <div
      ref={ref}
      className={`holo-forge${complete ? " is-forged" : ""}${flourish ? " is-flourish" : ""} ${className}`.trim()}
      data-holo-live={live ? "on" : "off"}
      data-forge-complete={complete ? "true" : "false"}
      role="img"
      aria-label={summary}
    >
      <svg viewBox="0 0 236 168" aria-hidden="true">
        <defs>
          <linearGradient id={`${filterId}-steel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f1e8" />
            <stop offset="0.16" stopColor="#d9c4a4" />
            <stop offset="0.42" stopColor="#8f877c" />
            <stop offset="0.7" stopColor="#5a5148" />
            <stop offset="1" stopColor="#2e2924" />
          </linearGradient>
          <linearGradient id={`${filterId}-bronze`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3ddb0" />
            <stop offset="0.45" stopColor="#b8833e" />
            <stop offset="1" stopColor="#5c3d22" />
          </linearGradient>
          <pattern id={`${filterId}-brush`} width="3" height="2" patternUnits="userSpaceOnUse">
            <rect width="3" height="1" fill="#1a1612" opacity="0.16" />
          </pattern>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
            <feColorMatrix in="blur" type="matrix" result="glow" values="0 0 0 0 1  0 0 0 0 0.78  0 0 0 0 0.35  0 0 0 0.9 0" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="holo-deck-holo">
          {edges.map((shell, index) => {
            const y = faceY + faceH + (edges.length - 1 - index) * edgeH;
            return (
              <g key={shell.id} className={shell.ratio >= 1 ? "is-full" : ""}>
                <title>{`${shell.label}: ${shell.actual} of ${shell.target}`}</title>
                <rect className="holo-card-wire" x={20 + index * 0.4} y={y} width={100 - index * 0.3} height={edgeH - 1.2} rx="1.5" />
                <rect className="holo-card-fill" x={20 + index * 0.4} y={y} width={100 - index * 0.3} height={edgeH - 1.2} rx="1.5" opacity={shell.ratio} />
              </g>
            );
          })}
          {face ? (
            <g className={face.ratio >= 1 ? "is-full" : ""}>
              <title>{`${face.label}: ${face.actual} of ${face.target}`}</title>
              <rect className="holo-card-wire holo-card-face" x="16" y={faceY} width="108" height={faceH} rx="5" />
              <rect className="holo-card-fill holo-card-face" x="16" y={faceY} width="108" height={faceH} rx="5" style={{ transform: `scaleY(${face.ratio})` }} />
              <rect className="holo-card-rim" x="20" y={faceY + 3} width="100" height={faceH - 8} rx="4" opacity={0.25 + face.ratio * 0.75} />
            </g>
          ) : null}
        </g>

        <g className="holo-deck-metal" filter={`url(#${filterId})`}>
          {Array.from({ length: 7 }, (_, index) => (
            <rect key={index} x={22 + index * 0.35} y={faceY + faceH + (6 - index) * 5.2} width={96 - index * 0.2} height="4.2" rx="1.2" fill={`url(#${filterId}-bronze)`} />
          ))}
          <rect x="14" y={faceY} width="112" height={faceH} rx="5" fill={`url(#${filterId}-steel)`} />
          <rect x="14" y={faceY} width="112" height={faceH} rx="5" fill={`url(#${filterId}-brush)`} />
          <rect x="14" y={faceY} width="112" height="7" rx="5" fill="#f8f1e4" opacity="0.55" />
          <rect x="14" y={faceY + faceH - 6} width="112" height="6" rx="3" fill="#2a241c" opacity="0.45" />
          <ellipse cx="70" cy={faceY + 32} rx="22" ry="26" fill="none" stroke="#4a3b2a" strokeWidth="1.6" />
          <ellipse cx="70" cy={faceY + 31.4} rx="22" ry="26" fill="none" stroke="#f4e7cf" strokeWidth="0.6" opacity="0.7" />
          <circle cx="70" cy={faceY + 32} r="10" fill="none" stroke="#6d5334" strokeWidth="1.1" />
          <path d="M70 26.5 L74.5 34 H65.5 Z" fill="#6a4e30" transform={`translate(0 ${faceY})`} />
        </g>

        <g className="holo-readout">
          {readout.map((shell, index) => {
            const y = 14 + index * (146 / Math.max(readout.length, 1));
            return (
              <g key={shell.id}>
                <title>{`${shell.label}: ${shell.actual} of ${shell.target}`}</title>
                <text className="holo-readout-label" x="132" y={y + 7}>{shell.short}</text>
                <rect className="holo-readout-track" x="162" y={y + 2} width="66" height="5" rx="1" />
                <rect className="holo-readout-fill" x="162" y={y + 2} width={66 * shell.ratio} height="5" rx="1" />
              </g>
            );
          })}
        </g>
      </svg>
      <span className="holo-deck-sweep" />
      <span className="holo-deck-glint" />
      <span className="holo-forge-flash" />
    </div>
  );
}
