// Original Tripo stills. See public/assets/forge/tripo/PROVENANCE.md.
// Color identity in the UI uses Scryfall's mana symbols (see mana-symbols.tsx).
// The medallions remain for the larger forge props; the black moon-and-skull
// still reads as mud below 32px if a medallion is shown.
import { ManaSymbol } from "./mana-symbols";

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
  anvil: { file: "hero-512.webp", label: "Anvil" },
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
    return (
      <span className="color-identity-chips">
        <ManaSymbol symbol="C" />
      </span>
    );
  }
  return (
    <span className="color-identity-chips">
      {known.map((color) => (
        <ManaSymbol key={color} symbol={color} />
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
