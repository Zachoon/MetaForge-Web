"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  hoverPreviewAllowed,
  inspectTargetFromElement,
  inspectViewFromScryfall,
  placePreview,
  previewBox,
} from "../../card-inspect.mjs";
import { cardImage } from "../../card-art";
import { ManaText } from "../mana-symbols";
import { setInspectorHandler } from "./bridge";

const FINE = "(hover: hover) and (pointer: fine)";

type Face = { name: string; image: string; oracle: string; typeLine: string; manaCost: string };
type View = {
  name: string;
  typeLine: string;
  manaCost: string;
  oracle: string;
  commander: string;
  legal: boolean;
  faces: Face[];
};

const cache = new Map<string, View | null>();

function frontFace(name: string): View {
  return {
    name,
    typeLine: "",
    manaCost: "",
    oracle: "",
    commander: "",
    legal: false,
    faces: [{ name, image: cardImage(name), oracle: "", typeLine: "", manaCost: "" }],
  };
}

async function loadCard(name: string, signal: AbortSignal): Promise<View | null> {
  const key = name.toLocaleLowerCase("en");
  if (cache.has(key)) return cache.get(key) || null;
  const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`, { signal });
  if (!response.ok) {
    cache.set(key, null);
    return null;
  }
  const view = inspectViewFromScryfall(await response.json()) as View | null;
  cache.set(key, view);
  return view;
}

type Anchor = { name: string; priceUsd: number | null; element: Element };

export default function CardInspector() {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const hideTimer = useRef<number>(0);
  const fetchTimer = useRef<number>(0);
  const fetchAbort = useRef<AbortController | null>(null);
  const [preview, setPreview] = useState<{ anchor: Anchor; view: View; left: number; top: number; box: ReturnType<typeof previewBox> } | null>(null);
  const [modal, setModal] = useState<{ anchor: Anchor; view: View } | null>(null);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const nameRef = useRef("");

  const position = (anchor: Anchor, view: View, point: { x: number; y: number } | null) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const box = previewBox(Math.max(1, view.faces.filter((face) => face.image).length), viewport);
    const cursor = point || (() => {
      const rect = anchor.element.getBoundingClientRect();
      return { x: rect.left, y: rect.bottom };
    })();
    const placed = placePreview(cursor, box, viewport);
    return { left: placed.left, top: placed.top, box };
  };

  const show = (anchor: Anchor, point: { x: number; y: number } | null) => {
    window.clearTimeout(hideTimer.current);
    const cached = cache.get(anchor.name.toLocaleLowerCase("en"));
    const view = cached || frontFace(anchor.name);
    setPreview({ anchor, view, ...position(anchor, view, point) });
    if (nameRef.current === anchor.name) return;
    nameRef.current = anchor.name;
    window.clearTimeout(fetchTimer.current);
    fetchAbort.current?.abort();
    const controller = new AbortController();
    fetchAbort.current = controller;
    fetchTimer.current = window.setTimeout(() => {
      void loadCard(anchor.name, controller.signal).then((next) => {
        if (controller.signal.aborted || !next || nameRef.current !== anchor.name) return;
        setPreview((current) => current && current.anchor.name === anchor.name
          ? { ...current, view: next, ...position(anchor, next, point) }
          : current);
        setModal((current) => current && current.anchor.name === anchor.name ? { ...current, view: next } : current);
      }).catch(() => {});
    }, 90);
  };

  const hideSoon = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      nameRef.current = "";
      setPreview(null);
    }, 120);
  };

  useEffect(() => {
    const fine = () => window.matchMedia(FINE).matches;
    setInspectorHandler((kind, event) => {
      if (kind === "click") {
        const target = inspectTargetFromElement(event.target);
        if (!target || target.defer) return;
        const named = (event.target as Element | null)?.closest?.("[data-card-name]");
        const action = named?.closest("button, a, [role='button']");
        if (action && named && action !== named) {
          event.preventDefault();
          event.stopPropagation();
        }
        const anchor = { name: target.name, priceUsd: target.priceUsd, element: target.element };
        openerRef.current = (event.target as HTMLElement | null)?.closest?.("button, a, [role='button'], [data-card-name]") as HTMLElement | null;
        const cached = cache.get(anchor.name.toLocaleLowerCase("en"));
        setModal({ anchor, view: cached || frontFace(anchor.name) });
        show(anchor, null);
        setPreview(null);
        return;
      }
      if (kind === "over" || kind === "move") {
        const pointer = event instanceof PointerEvent ? event.pointerType : "mouse";
        if (!hoverPreviewAllowed(fine(), pointer)) return;
        const target = inspectTargetFromElement(event.target);
        if (!target) {
          if (kind === "move") return;
          hideSoon();
          return;
        }
        const point = event instanceof PointerEvent ? { x: event.clientX, y: event.clientY } : null;
        const currentPreview = previewRef.current;
        if (kind === "move" && currentPreview && currentPreview.anchor.name === target.name && point) {
          const placed = position(currentPreview.anchor, currentPreview.view, point);
          setPreview((current) => current ? { ...current, ...placed } : current);
          return;
        }
        if (kind === "over" || kind === "move") show({ name: target.name, priceUsd: target.priceUsd, element: target.element }, point);
        return;
      }
      if (kind === "out") {
        const next = inspectTargetFromElement((event as PointerEvent).relatedTarget);
        if (next && next.name === nameRef.current) return;
        hideSoon();
        return;
      }
      if (kind === "focus") {
        if (!fine()) return;
        const target = inspectTargetFromElement(event.target);
        if (!target) return;
        show({ name: target.name, priceUsd: target.priceUsd, element: target.element }, null);
        return;
      }
      if (kind === "blur") hideSoon();
    });
    return () => setInspectorHandler(null);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const dialog = dialogRef.current;
    const previously = openerRef.current;
    const close = () => {
      setModal(null);
      previously?.focus?.();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    dialog?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  const faces = (view: View) => view.faces.filter((face) => face.image);

  return createPortal(
    <>
      {preview && (
        <div
          className={`card-hover-preview ${preview.box.layout}`}
          style={{ left: preview.left, top: preview.top, ["--face-w" as string]: `${preview.box.faceW}px` }}
          aria-hidden="true"
        >
          {faces(preview.view).map((face) => (
            <img key={face.image} src={face.image} alt="" width={preview.box.faceW} />
          ))}
        </div>
      )}
      {modal && (
        <div className="card-inspect-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <div
            className="card-inspect-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={dialogRef}
          >
            <button type="button" className="card-inspect-close" aria-label="Close card" onClick={() => { setModal(null); openerRef.current?.focus?.(); }}>×</button>
            <div className="card-inspect-art">
              {faces(modal.view).map((face) => (
                <img key={face.image || face.name} src={face.image} alt={`${face.name || modal.view.name} card`} />
              ))}
            </div>
            <div className="card-inspect-copy">
              <div className="card-inspect-kicker">
                <img src="/assets/forge/tripo/prop_tome-512.webp" alt="" width={28} height={28} />
                CARD
              </div>
              <h2 id={titleId}>{modal.view.name || modal.anchor.name}</h2>
              <p className="card-inspect-meta">
                {modal.view.typeLine || "Type unavailable"}
                {modal.view.manaCost ? <> · <ManaText text={modal.view.manaCost} /></> : null}
              </p>
              <p>{modal.view.oracle ? <ManaText text={modal.view.oracle} /> : "Rules text is on the card image."}</p>
              <p className={`card-inspect-legal${modal.view.legal ? " is-legal" : ""}`}>{modal.view.commander || "Commander legality unavailable"}</p>
              {modal.anchor.priceUsd != null && <p className="card-inspect-price">${modal.anchor.priceUsd.toFixed(2)}</p>}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
