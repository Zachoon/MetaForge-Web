"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionMode } from "./forge/forge-ceremony";

// The still sits beside the headline. The headline and the living-forge
// panel are the larger paints, so this image is not the LCP and stays lazy.
// The turntable is a separate ~1MB animation: only after we know the
// viewport is not a small phone, the OS is not asking for reduced motion,
// and the in-app motion setting is full. The still is the fallback until
// that animation has decoded, and the two are never shown together.
const TURNTABLE_QUERY = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";
const ANVIL_LABEL = "An ornate anvil with a glowing blade";

export function HeroAnvil({ motionMode }: { motionMode: MotionMode }) {
  const [turntable, setTurntable] = useState(false);
  const [turntableReady, setTurntableReady] = useState(false);
  const turnRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const query = window.matchMedia(TURNTABLE_QUERY);
    const sync = () => {
      const show = motionMode === "full" && query.matches;
      setTurntable(show);
      if (!show) setTurntableReady(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [motionMode]);

  useEffect(() => {
    const node = turnRef.current;
    if (turntable && node?.complete && node.naturalWidth > 0) setTurntableReady(true);
  }, [turntable]);

  const ready = turntable && turntableReady;

  return (
    <div className="hero-anvil" data-turntable={ready ? "ready" : "still"} role="img" aria-label={ANVIL_LABEL}>
      <img
        className="hero-anvil-still"
        src="/assets/forge/tripo/hero-512.webp"
        srcSet="/assets/forge/tripo/hero-512.webp 512w, /assets/forge/tripo/hero-1024.webp 1024w"
        sizes="(max-width: 900px) 96px, 720px"
        width={96}
        height={96}
        alt=""
        decoding="async"
        loading="lazy"
        fetchPriority="low"
      />
      {turntable ? (
        <img
          ref={turnRef}
          className="hero-anvil-turn"
          src="/assets/forge/tripo/hero-turntable-512.webp"
          width={96}
          height={96}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
          fetchPriority="low"
          onLoad={() => setTurntableReady(true)}
          onError={() => setTurntableReady(false)}
        />
      ) : null}
    </div>
  );
}
