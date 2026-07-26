import type { CSSProperties } from "react";
import { MOTIF_ICONS, type MotifId } from "./masterwork-motif-icons";

// The one persistent, ambient entry point to the player's Forge Mastery
// identity — replaces the plain "Your Forge Mastery" text link. Lives in
// the header (outside every chamber's own JSX), so it's visible no matter
// which step of the flow the player is in, and reacts to the same
// wakeForge("grow")/actionPulse pulse every other meaningful action in this
// app already uses (see app/forge-motion.css).
export function IdentityBadge({
  depth,
  totalMilestones,
  dominantMotif,
  accent,
  celebrating,
  celebrationLabel,
}: {
  depth: number;
  totalMilestones: number;
  dominantMotif: string | null;
  accent: string;
  celebrating: boolean;
  celebrationLabel: string | null;
}) {
  const Icon = dominantMotif ? MOTIF_ICONS[dominantMotif as MotifId] : null;

  return (
    <a
      href="/profile"
      className="identity-badge quiet-action"
      data-celebrate={celebrating ? "true" : "false"}
      style={
        {
          "--identity-accent": accent,
          "--motif-accent": accent,
        } as CSSProperties
      }
      title="Your Forge Mastery"
      aria-label={`Your Forge identity — depth ${depth} of ${totalMilestones}${
        dominantMotif ? `, ${dominantMotif} identity` : ", motif not yet revealed"
      }`}
    >
      <span className="identity-badge-sigil">
        {Icon ? <Icon size={20} /> : <i className="identity-badge-unknown">?</i>}
      </span>
      <b className="identity-badge-depth">
        {depth}/{totalMilestones}
      </b>
      {celebrating && celebrationLabel && (
        <em className="identity-badge-flash">{celebrationLabel}</em>
      )}
    </a>
  );
}
