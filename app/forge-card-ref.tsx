"use client";

/**
 * Founder #021 — inspectable card name that never requires leaving reading position.
 * Routes through the same hover/inspect path as Deep Forge system buttons.
 */
export function ForgeCardRef({
  name,
  onInspect,
  className = "",
  surface = "generic",
  separator = null,
}: {
  name: string;
  onInspect: (cardName: string) => void;
  className?: string;
  /** Stable id for era3 inventory validation */
  surface?: string;
  separator?: string | null;
}) {
  const label = String(name || "").trim();
  if (!label) return null;
  return (
    <>
      {separator}
      <button
        type="button"
        className={`forge-card-ref ${className}`.trim()}
        data-card-inspect-surface={surface}
        aria-label={`Inspect ${label}`}
        onClick={() => onInspect(label)}
      >
        {label}
      </button>
    </>
  );
}

/** Join card names as inspectable refs with · separators. */
export function ForgeCardRefList({
  names,
  onInspect,
  surface,
  limit = 99,
}: {
  names: string[];
  onInspect: (cardName: string) => void;
  surface: string;
  limit?: number;
}) {
  const list = (names || []).filter(Boolean).slice(0, limit);
  if (!list.length) return null;
  return (
    <>
      {list.map((name, index) => (
        <ForgeCardRef
          key={`${surface}-${name}-${index}`}
          name={name}
          onInspect={onInspect}
          surface={surface}
          separator={index > 0 ? " · " : null}
        />
      ))}
    </>
  );
}
