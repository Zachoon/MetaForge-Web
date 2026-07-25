// Layered, animated motif icons for the Living Masterwork visual system.
// Inline SVG (not <img src>) is required here: fill/stroke use
// var(--motif-accent) set by the parent card, and an <img>-loaded SVG
// document cannot inherit CSS custom properties from the host page.
// Each icon separates a static dark-material base, a color-identity accent
// layer, and one small idle-motion element animated in masterwork-motifs.css
// — never the same element carrying both a idle animation and the outer
// reveal/hover transform, so they never fight over the same property.

const DARK = "#1c211f";
const DARK_EDGE = "#2c332f";

export function BladeIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="motif-svg motif-blade" aria-hidden="true">
      <path d="M50 8 L58 60 L50 68 L42 60 Z" fill={DARK} />
      <rect x="32" y="66" width="36" height="6" fill={DARK_EDGE} />
      <rect x="46" y="74" width="8" height="18" fill={DARK} />
      <circle cx="50" cy="94" r="5" fill={DARK_EDGE} />
      <path
        className="motif-idle motif-idle-glint"
        d="M50 8 L58 60"
        stroke="var(--motif-accent,var(--teal,#6dddf0))"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="motif-svg motif-shield" aria-hidden="true">
      <path d="M50 10 L82 22 L82 55 Q82 80 50 95 Q18 80 18 55 L18 22 Z" fill={DARK} />
      <path
        className="motif-idle motif-idle-rim"
        d="M50 10 L82 22 L82 55 Q82 80 50 95 Q18 80 18 55 L18 22 Z"
        fill="none"
        stroke="var(--motif-accent,var(--teal,#6dddf0))"
        strokeWidth="2"
      />
      <circle cx="50" cy="46" r="8" fill="var(--motif-accent,var(--teal,#6dddf0))" opacity="0.85" />
    </svg>
  );
}

export function RuneIcon({ size = 64 }: { size?: number }) {
  const ticks = [0, 90, 180, 270];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="motif-svg motif-rune" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="none" stroke={DARK} strokeWidth="7" />
      <g className="motif-idle motif-idle-ring" style={{ transformOrigin: "50px 50px" }}>
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="var(--motif-accent,var(--teal,#6dddf0))"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
        {ticks.map((angle) => (
          <rect
            key={angle}
            x="47"
            y="8"
            width="6"
            height="8"
            fill="var(--motif-accent,var(--teal,#6dddf0))"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
    </svg>
  );
}

export function GearIcon({ size = 64 }: { size?: number }) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="motif-svg motif-gear" aria-hidden="true">
      <g className="motif-idle motif-idle-gear" style={{ transformOrigin: "50px 50px" }}>
        {teeth.map((angle) => (
          <rect key={angle} x="47" y="6" width="6" height="14" fill={DARK} transform={`rotate(${angle} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="26" fill={DARK} />
      </g>
      <circle cx="50" cy="50" r="9" fill="var(--motif-accent,var(--teal,#6dddf0))" />
      <circle cx="50" cy="50" r="3.5" fill={DARK} />
    </svg>
  );
}

export function RootIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="motif-svg motif-root" aria-hidden="true">
      <path d="M50 14 C40 34 25 44 18 76" stroke={DARK_EDGE} strokeWidth="3" fill="none" />
      <path d="M50 14 C50 40 50 55 50 90" stroke={DARK_EDGE} strokeWidth="3" fill="none" />
      <path d="M50 14 C60 34 75 44 82 76" stroke={DARK_EDGE} strokeWidth="3" fill="none" />
      <circle className="motif-idle motif-idle-node" cx="50" cy="14" r="4" fill="var(--motif-accent,var(--teal,#6dddf0))" />
      <circle className="motif-idle motif-idle-node motif-idle-node-2" cx="18" cy="76" r="3.5" fill="var(--motif-accent,var(--teal,#6dddf0))" />
      <circle className="motif-idle motif-idle-node motif-idle-node-3" cx="50" cy="90" r="3.5" fill="var(--motif-accent,var(--teal,#6dddf0))" />
      <circle className="motif-idle motif-idle-node motif-idle-node-4" cx="82" cy="76" r="3.5" fill="var(--motif-accent,var(--teal,#6dddf0))" />
    </svg>
  );
}

export const MOTIF_ICONS = {
  blade: BladeIcon,
  shield: ShieldIcon,
  rune: RuneIcon,
  gear: GearIcon,
  root: RootIcon,
} as const;

export type MotifId = keyof typeof MOTIF_ICONS;
