// Original Tripo stills. See public/assets/forge/tripo/PROVENANCE.md.
// Emblems stay at least 32px: the black moon-and-skull reads as mud below that.
// Chips keep a visible letter so the color is still legible beside the medallion.

const EMBLEM_ORDER = ["W", "U", "B", "R", "G"] as const;

const EMBLEMS: Record<(typeof EMBLEM_ORDER)[number], { file: string; name: string }> = {
  W: { file: "emblem_w-512.webp", name: "White" },
  U: { file: "emblem_u-512.webp", name: "Blue" },
  B: { file: "emblem_b-512.webp", name: "Black" },
  R: { file: "emblem_r-512.webp", name: "Red" },
  G: { file: "emblem_g-512.webp", name: "Green" },
};

const PROPS = {
  hammer: { file: "prop_hammer-512.webp", label: "Forging hammer" },
  crystal: { file: "prop_crystal-512.webp", label: "Mana crystals" },
  tome: { file: "prop_tome-512.webp", label: "Spellbook" },
} as const;

export function ColorEmblem({
  color,
  labelled = false,
}: {
  color: string;
  /** When a color word already sits beside the image, the medallion stays decorative. */
  labelled?: boolean;
}) {
  const emblem = EMBLEMS[color as keyof typeof EMBLEMS];
  if (!emblem) return null;
  return (
    <img
      className="color-emblem"
      src={`/assets/forge/tripo/${emblem.file}`}
      alt={labelled ? "" : emblem.name}
      aria-hidden={labelled ? true : undefined}
      width={32}
      height={32}
      decoding="async"
      loading="lazy"
    />
  );
}

export function ColorIdentityChips({ colors }: { colors: readonly string[] }) {
  const known = EMBLEM_ORDER.filter((color) => colors.includes(color));
  if (!known.length) {
    return <span className="color-identity-colorless">Colorless</span>;
  }
  return (
    <span className="color-identity-chips">
      {known.map((color) => (
        <span key={color} className="color-emblem-chip" role="img" aria-label={EMBLEMS[color].name}>
          <ColorEmblem color={color} labelled />
          <span className="color-emblem-letter" aria-hidden="true">{color}</span>
        </span>
      ))}
    </span>
  );
}

export function ForgeProp({
  kind,
  size = 40,
}: {
  kind: keyof typeof PROPS;
  size?: number;
}) {
  const prop = PROPS[kind];
  return (
    <img
      className={`forge-prop forge-prop-${kind}`}
      src={`/assets/forge/tripo/${prop.file}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      loading="lazy"
    />
  );
}
