"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useForgeSession } from "../forge-session-context";

const CRYSTAL_LOOP = "/assets/forge/hologram/crystal.webm";
const CRYSTAL_STILL = "/assets/forge/hologram/crystal-still.webp";

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

/* One pre-rendered crystal. three.js is already a dependency, but the live
   app never mounts it, and the Tripo GLBs are about 3MB of textures this
   fresnel pass does not use. A 280px VP9 loop stays well under 500KB. */
export function HoloProp({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScreen = useHoloLive(ref);
  const reduced = usePrefersReducedMotion();
  const { motionMode } = useForgeSession();
  const filterId = `holo-emissive-${useId().replace(/:/g, "")}`;
  const live = onScreen && motionMode === "full" && !reduced;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (live) void video.play().catch(() => {});
    else video.pause();
  }, [live]);

  return (
    <div ref={ref} className={`holo-prop ${className}`} data-holo-live={live ? "on" : "off"} aria-hidden="true">
      <svg className="holo-svg-defs" aria-hidden="true">
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="blur" />
          <feColorMatrix in="blur" type="matrix" result="glow" values="0 0 0 0 0  0 0 0 0 0.94  0 0 0 0 1  0 0 0 0.8 0" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <div className="holo-floor" />
      {motionMode === "full" && !reduced ? (
        <video
          ref={videoRef}
          className="holo-prop-model"
          src={CRYSTAL_LOOP}
          width={280}
          height={326}
          muted
          loop
          playsInline
          preload="none"
          style={{ filter: `url(#${filterId})` }}
        />
      ) : (
        <img
          className="holo-prop-model"
          src={CRYSTAL_STILL}
          alt=""
          width={280}
          height={326}
          decoding="async"
          loading="lazy"
          style={{ filter: `url(#${filterId})` }}
        />
      )}
      <div className="holo-scan" />
      <div className="holo-noise" />
    </div>
  );
}
