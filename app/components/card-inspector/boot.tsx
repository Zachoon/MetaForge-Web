"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { inspectTargetFromElement } from "../../card-inspect.mjs";
import { emitInspector } from "./bridge";

const Inspector = lazy(() => import("./inspector"));

const FINE = "(hover: hover) and (pointer: fine)";

export function CardInspectorBoot() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    const arm = () => { if (!dead) setReady(true); };
    const interesting = (event: Event) => Boolean(inspectTargetFromElement(event.target));
    const onOver = (event: Event) => {
      if (!interesting(event)) return;
      const pointer = event instanceof PointerEvent ? event.pointerType : "mouse";
      const fine = window.matchMedia(FINE).matches;
      if (pointer === "touch" || !fine) return;
      arm();
      emitInspector("over", event);
    };
    const onMove = (event: Event) => {
      if (!ready) return;
      emitInspector("move", event);
    };
    const onOut = (event: Event) => emitInspector("out", event);
    const onFocus = (event: Event) => {
      if (!interesting(event)) return;
      arm();
      emitInspector("focus", event);
    };
    const onBlur = (event: Event) => emitInspector("blur", event);
    const onClick = (event: Event) => {
      const target = inspectTargetFromElement(event.target);
      if (!target) return;
      arm();
      if (!target.defer) {
        const named = (event.target as Element | null)?.closest?.("[data-card-name]");
        const action = named?.closest("button, a, [role='button']");
        if (action && named && action !== named) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
      emitInspector("click", event);
    };
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("click", onClick, true);
    return () => {
      dead = true;
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [ready]);

  if (!ready) return null;
  return <Suspense fallback={null}><Inspector /></Suspense>;
}
