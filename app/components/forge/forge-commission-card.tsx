"use client";

import { useEffect, useRef } from "react";
import type { MotionMode } from "./forge-ceremony";

export const ForgeCommissionCard = ({
  eyebrow,
  title,
  description,
  cta,
  tone,
  motionMode,
  onActivate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  tone: "teal" | "ember";
  motionMode: MotionMode;
  onActivate: () => void;
}) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const emberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const sheen = sheenRef.current;
    const ember = emberRef.current;
    if (!card || !sheen || !ember || motionMode !== "full") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let removeListeners: (() => void) | undefined;

    void import("gsap").then(({ gsap }) => {
      if (disposed) return;

      gsap.set(card, { transformPerspective: 850, transformOrigin: "50% 50%" });
      gsap.set(sheen, { xPercent: -85, opacity: 0 });
      gsap.set(ember, { xPercent: -50, yPercent: -50, opacity: 0 });

      const move = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const horizontal = x / bounds.width - 0.5;
        const vertical = y / bounds.height - 0.5;

        gsap.to(card, {
          rotationY: horizontal * 8,
          rotationX: vertical * -6,
          x: horizontal * 3,
          y: -5 + vertical * 2,
          duration: 0.28,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to(sheen, {
          xPercent: horizontal * 65,
          opacity: 0.72,
          duration: 0.25,
          overwrite: "auto",
        });
        gsap.to(ember, {
          x,
          y,
          opacity: 0.9,
          scale: 1,
          duration: 0.18,
          overwrite: "auto",
        });
      };

      const enter = () => {
        gsap.to(card, {
          y: -5,
          borderColor: tone === "ember" ? "#f49a45" : "#6dddf0",
          boxShadow:
            tone === "ember"
              ? "0 24px 65px #000c, inset 0 0 58px #d66f2038"
              : "0 24px 65px #000c, inset 0 0 58px #2acde02b",
          duration: 0.28,
          ease: "power2.out",
        });
      };

      const leave = () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          x: 0,
          y: 0,
          scale: 1,
          borderColor: "#3c4743",
          boxShadow: "0 0 0 transparent, inset 0 0 0 transparent",
          duration: 0.48,
          ease: "power3.out",
          overwrite: "auto",
        });
        gsap.to(sheen, { opacity: 0, xPercent: -85, duration: 0.35, overwrite: "auto" });
        gsap.to(ember, { opacity: 0, scale: 0.35, duration: 0.3, overwrite: "auto" });
      };

      const press = () => gsap.to(card, { scale: 0.975, duration: 0.08, overwrite: "auto" });
      const release = () => gsap.to(card, { scale: 1, duration: 0.2, ease: "back.out(2)" });
      let active = false;

      const track = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        const inside =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;

        if (!inside) {
          if (active) {
            active = false;
            leave();
          }
          return;
        }

        if (!active) {
          active = true;
          enter();
        }
        move(event);
      };

      const clear = () => {
        if (!active) return;
        active = false;
        leave();
      };

      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("blur", clear);
      document.addEventListener("mouseleave", clear);
      card.addEventListener("pointerdown", press);
      card.addEventListener("pointerup", release);
      card.addEventListener("pointercancel", clear);

      removeListeners = () => {
        window.removeEventListener("pointermove", track);
        window.removeEventListener("blur", clear);
        document.removeEventListener("mouseleave", clear);
        card.removeEventListener("pointerdown", press);
        card.removeEventListener("pointerup", release);
        card.removeEventListener("pointercancel", clear);
        gsap.killTweensOf([card, sheen, ember]);
      };
    });

    return () => {
      disposed = true;
      removeListeners?.();
    };
  }, [motionMode, tone]);

  return (
    <button ref={cardRef} className={`forge-commission-card ${tone}`} onClick={onActivate}>
      <span ref={sheenRef} className="forge-card-sheen" aria-hidden="true" />
      <span ref={emberRef} className="forge-card-ember" aria-hidden="true" />
      <small>{eyebrow}</small>
      <strong>{title}</strong>
      <span className="forge-card-description">{description}</span>
      <b>{cta}</b>
    </button>
  );
};
