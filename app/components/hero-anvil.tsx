"use client";

import { useEffect, useState } from "react";
import type { MotionMode } from "./forge/forge-ceremony";

// The still sits beside the headline. The headline and the living-forge
// panel are the larger paints, so this image is not the LCP and stays lazy.
// The turntable is a separate ~1MB animation: only after we know the
// viewport is not a small phone, the OS is not asking for reduced motion,
// and the in-app motion setting is full.
const TURNTABLE_QUERY = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";

export function HeroAnvil({ motionMode }: { motionMode: MotionMode }) {
  const [turntable, setTurntable] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(TURNTABLE_QUERY);
    const sync = () => setTurntable(motionMode === "full" && query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [motionMode]);

  return (
    <div className="hero-anvil">
      <img
        className="hero-anvil-still"
        src="/assets/forge/tripo/hero-512.webp"
        srcSet="/assets/forge/tripo/hero-512.webp 512w, /assets/forge/tripo/hero-1024.webp 1024w"
        sizes="(max-width: 900px) 96px, 720px"
        width={96}
        height={96}
        alt="An ornate anvil with a glowing blade"
        decoding="async"
        loading="lazy"
        fetchPriority="low"
      />
      {turntable ? (
        <img
          className="hero-anvil-turn"
          src="/assets/forge/tripo/hero-turntable-512.webp"
          width={96}
          height={96}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />
      ) : null}
    </div>
  );
}
