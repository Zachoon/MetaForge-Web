"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionMode } from "./forge-ceremony";

export const ForgeRune = ({ motionMode }: { motionMode: MotionMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverPropertyRef = useRef<{ value: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let rive: {
      cleanup: () => void;
      resizeDrawingSurfaceToCanvas: () => void;
      viewModelInstance: { boolean: (name: string) => { value: boolean } | null } | null;
    } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let hovering = false;

    const setHovering = (value: boolean) => {
      const nextValue = motionMode === "full" && value;
      if (hovering === nextValue) return;
      hovering = nextValue;
      if (hoverPropertyRef.current) hoverPropertyRef.current.value = nextValue;
    };

    const trackPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const radius = Math.min(bounds.width, bounds.height) / 2;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      setHovering(Math.hypot(event.clientX - centerX, event.clientY - centerY) <= radius);
    };

    const clearHover = () => setHovering(false);

    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("blur", clearHover);
    document.addEventListener("mouseleave", clearHover);

    void import("@rive-app/canvas").then(({ Alignment, Fit, Layout, Rive }) => {
      if (disposed) return;

      rive = new Rive({
        src: "/assets/forge/animations/metaforge-rune.riv",
        canvas,
        stateMachines: "State Machine 1",
        autoBind: true,
        autoplay: motionMode === "full",
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          rive?.resizeDrawingSurfaceToCanvas();
          hoverPropertyRef.current = rive?.viewModelInstance?.boolean("isHovering") ?? null;
          setLoaded(true);
        },
      });

      resizeObserver = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
      resizeObserver.observe(canvas);
    });

    return () => {
      disposed = true;
      clearHover();
      hoverPropertyRef.current = null;
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", clearHover);
      document.removeEventListener("mouseleave", clearHover);
      resizeObserver?.disconnect();
      rive?.cleanup();
    };
  }, [motionMode]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="forge-rive-rune"
        aria-hidden="true"
      />
      <i className={loaded ? "rive-loaded" : undefined}>ᛟ</i>
    </>
  );
};

export const ForgeConfirmationSeal = ({ motionMode }: { motionMode: MotionMode }) => {
  return (
    <div className={`forge-confirmation-seal${motionMode === "quiet" ? " is-quiet" : ""}`} aria-hidden="true">
      <span className="forge-seal-halo" />
      <span className="forge-seal-orbit" />
      <img src="/assets/forge/animations/forge-confirmation-seal.svg" alt="" />
      <span className="forge-seal-flare" />
      <span className="forge-seal-sparks"><i /><i /><i /><i /><i /><i /></span>
    </div>
  );
};
