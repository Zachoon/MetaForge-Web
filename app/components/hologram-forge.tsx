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
  const top = 18;
  const height = 176;
  const gap = bands.length > 1 ? 3 : 0;
  const bandH = bands.length ? (height - gap * (bands.length - 1)) / bands.length : height;
  const filled = bands.filter((shell) => shell.ratio >= 1).length + (frame.ratio >= 1 ? 1 : 0);
  const total = bands.length + 1;
  const summary = complete
    ? "Deck forge complete"
    : `Deck forge, ${filled} of ${total} parts filled. ${bands.map((shell) => `${shell.label} ${shell.actual} of ${shell.target}`).join(", ")}. Deck size ${frame.actual} of ${frame.target}.`;

  return (
    <div
      ref={ref}
      className={`holo-forge${complete ? " is-forged" : ""}${flourish ? " is-flourish" : ""} ${className}`.trim()}
      data-holo-live={live ? "on" : "off"}
      data-forge-complete={complete ? "true" : "false"}
      role="img"
      aria-label={summary}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur" />
            <feColorMatrix in="blur" type="matrix" result="glow" values="0 0 0 0 0  0 0 0 0 0.94  0 0 0 0 1  0 0 0 0.85 0" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          className="holo-forge-frame"
          x="62"
          y={top - 4}
          width="124"
          height={height + 8}
          rx="8"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - frame.ratio * 100}
        >
          <title>{`${frame.label} ${frame.actual} of ${frame.target}`}</title>
        </rect>
        {bands.map((shell, index) => {
          const y = top + (bands.length - 1 - index) * (bandH + gap);
          return (
            <g key={shell.id} className={shell.ratio >= 1 ? "is-full" : ""}>
              <title>{`${shell.label}: ${shell.actual} of ${shell.target}`}</title>
              <rect className="holo-forge-wire" x="68" y={y} width="112" height={bandH} rx="3" />
              <rect
                className="holo-forge-fill"
                x="68"
                y={y}
                width="112"
                height={bandH}
                rx="3"
                style={{ transform: `scaleY(${shell.ratio})` }}
              />
              <text className="holo-forge-label" x="58" y={y + bandH / 2} textAnchor="end" dominantBaseline="middle">{shell.short}</text>
            </g>
          );
        })}
        <text className="holo-forge-count" x="186" y="12" textAnchor="end">{complete ? "Forged" : `${filled}/${total}`}</text>
        <g className="holo-forge-seal" filter={`url(#${filterId})`}>
          <circle cx="124" cy="104" r="22" />
          <text x="124" y="108" textAnchor="middle">Forged</text>
        </g>
      </svg>
    </div>
  );
}
