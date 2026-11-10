"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import type { MotionMode } from "./forge/forge-ceremony";

// The homepage anvil is one image frame. The sword still is what paints
// before the sequence is ready. The deck still replaces it. Hammer, sparks,
// and the single flash are CSS on that same frame — not a second anvil,
// and not the retired 1MB turntable.
const SIZES = "(max-width: 900px) 96px, 720px";
const SWORD_SRC = "/assets/forge/tripo/hero-512.webp";
const SWORD_SET = "/assets/forge/tripo/hero-512.webp 512w, /assets/forge/tripo/hero-1024.webp 1024w";
const DECK_SRC = "/assets/forge/tripo/hero-deck-512.webp";
const DECK_SET = "/assets/forge/tripo/hero-deck-512.webp 512w, /assets/forge/tripo/hero-deck-1024.webp 1024w";
const HAMMER_SRC = "/assets/forge/tripo/prop_hammer-512.webp";
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
// A little longer than the CSS timeline (--forge-time: 2.6s) so a missed
// animationend still settles on the deck.
const FORGE_FALLBACK_MS = 2900;

const SWORD_LABEL = "An ornate anvil with a glowing blade";
const PLAY_LABEL = "An ornate anvil. A hammer strikes the sword and forges it into a deck of cards.";
const DECK_LABEL = "An ornate anvil with a deck of cards, fresh from the forge";

// One burst, aimed out from the strike. Not a loop.
const HERO_SPARKS: ReadonlyArray<readonly [number, number]> = [
  [88, -108],
  [-78, -96],
  [124, -18],
  [-112, -8],
  [46, 72],
  [-52, 80],
  [12, -132],
  [-16, 40],
  [136, 28],
  [-128, 36],
  [64, -48],
  [-70, -52],
];

type ForgePhase = "sword" | "playing" | "deck";

export function HeroAnvil({ motionMode }: { motionMode: MotionMode }) {
  const [phase, setPhase] = useState<ForgePhase>("sword");
  const [motion, setMotion] = useState(false);
  const [deckReady, setDeckReady] = useState(false);
  const [hammerReady, setHammerReady] = useState(false);
  const deckRef = useRef<HTMLImageElement>(null);
  const phaseRef = useRef<ForgePhase>("sword");

  useEffect(() => {
    const node = deckRef.current;
    if (node?.complete && node.naturalWidth > 0) setDeckReady(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(REDUCE_QUERY);
    const sync = () => {
      const allow = motionMode === "full" && !query.matches;
      setMotion(allow);
      if (!allow) {
        phaseRef.current = "deck";
        setPhase("deck");
        return;
      }
    if (!deckReady || !hammerReady) return;
    setPhase((current) => {
      const next = current === "deck" ? "deck" : "playing";
      phaseRef.current = next;
      return next;
    });
  };
  sync();
  query.addEventListener("change", sync);
  return () => query.removeEventListener("change", sync);
}, [motionMode, deckReady, hammerReady]);

useEffect(() => {
  if (!motion) return;
  const img = new Image();
  img.onload = () => setHammerReady(true);
  img.onerror = () => setHammerReady(true);
  img.src = HAMMER_SRC;
}, [motion]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setTimeout(() => {
      phaseRef.current = "deck";
      setPhase("deck");
    }, FORGE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function replay() {
    if (!motion || phaseRef.current !== "deck") return;
    phaseRef.current = "playing";
    setPhase("sword");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("playing"));
    });
  }

  function finish(event: AnimationEvent<HTMLImageElement>) {
    if (event.animationName !== "hero-forge-deck") return;
    phaseRef.current = "deck";
    setPhase("deck");
  }

  const settled = !motion || phase === "deck";
  const label = !motion ? (deckReady ? DECK_LABEL : SWORD_LABEL) : phase === "playing" ? PLAY_LABEL : phase === "deck" ? DECK_LABEL : SWORD_LABEL;

  return (
    <div
      className="hero-anvil"
      data-forge={phase}
      data-deck={deckReady ? "ready" : "loading"}
      data-motion={motion ? "play" : "still"}
      role={motion ? undefined : "img"}
      aria-label={motion ? undefined : label}
    >
      <div className="hero-anvil-stage">
        <img
          className="hero-anvil-sword"
          src={SWORD_SRC}
          srcSet={SWORD_SET}
          sizes={SIZES}
          width={96}
          height={96}
          alt=""
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />
        <img
          ref={deckRef}
          className="hero-anvil-deck"
          src={DECK_SRC}
          srcSet={DECK_SET}
          sizes={SIZES}
          width={96}
          height={96}
          alt=""
          decoding="async"
          loading="lazy"
          fetchPriority="low"
          onLoad={() => setDeckReady(true)}
          onAnimationEnd={finish}
        />
        {motion ? (
          <div className="hero-anvil-forge" aria-hidden="true">
            <img className="hero-anvil-hammer" src={HAMMER_SRC} alt="" width={96} height={96} decoding="async" />
            <span className="hero-anvil-flash" />
            <span className="hero-anvil-sparks">
              {HERO_SPARKS.map(([dx, dy]) => (
                <i key={`${dx},${dy}`} style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties} />
              ))}
            </span>
          </div>
        ) : null}
      </div>
      {motion ? (
        <button
          type="button"
          className="hero-anvil-replay"
          aria-label={settled ? `${DECK_LABEL} Play the forging again.` : PLAY_LABEL}
          aria-disabled={settled ? undefined : true}
          onClick={replay}
          onMouseEnter={replay}
        />
      ) : null}
    </div>
  );
}
