"use client";

import { useEffect, useId, useState } from "react";
import { cardImage } from "../../card-art";

export function CommanderInspector({
  name,
  src,
  typeLine = "",
  oracle = "",
  imgClassName,
}: {
  name: string;
  src: string;
  typeLine?: string;
  oracle?: string;
  imgClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(`[data-commander-zoom="${CSS.escape(dialogId)}"]`)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, dialogId]);
  return (
    <span className={`commander-inspector${open ? " is-open" : ""}`} data-commander-zoom={dialogId}>
      <button
        type="button"
        className="commander-inspector-hit"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={open ? `Close ${name} card` : `View ${name} card`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <img className={imgClassName} src={src} alt="" />
      </button>
      <span className="commander-zoom" role="dialog" id={dialogId} aria-label={`${name} card`}>
        <img src={cardImage(name)} alt={`${name} card`} />
        <span>
          <b>{name}</b>
          {typeLine ? <small>{typeLine}</small> : null}
          <em>{oracle || "The full card image contains the verified rules text."}</em>
        </span>
        <button
          type="button"
          className="commander-zoom-close"
          aria-label={`Close ${name} card`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
        >
          Close
        </button>
      </span>
    </span>
  );
}
