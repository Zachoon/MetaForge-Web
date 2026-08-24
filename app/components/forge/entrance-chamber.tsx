"use client";

import { ForgeCommissionCard } from "./forge-commission-card";
import { ForgeRune } from "./forge-motion-flourishes";
import { PlayerCompassCard } from "./player-compass-card";
import { useForgeSession } from "../../forge-session-context";

export function EntranceChamber() {
  const {
    motionMode,
    setDeck,
    setReviewFocus,
    setBuildStep,
    setChamber,
    playerCompass,
    guestMode,
    playerCompassSynced,
    persistPlayerCompass,
  } = useForgeSession();

  return (
    <section className="forge-entrance">
      <div className="entrance-copy">
        <span className="forge-eyebrow">
          <i /> MAGIC: THE GATHERING · DECK COACH
        </span>
        <h1>
          Understand your Magic deck.
          <br />
          <em>Build with confidence.</em>
        </h1>
        <p>
          Build a new MTG deck or analyze a decklist you already play.
          MetaForge explains how your Commander, Standard, Modern,
          Pioneer, Brawl, or other Magic deck works, shows what to
          improve, and helps you make confident changes.
        </p>
        <div className="entrance-actions">
          <ForgeCommissionCard
            eyebrow="START HERE"
            title="Build a deck"
            description="Choose a format and strategy. Shape a deck around a real game plan."
            cta="Build my deck →"
            tone="ember"
            motionMode={motionMode}
            onActivate={() => {
              // A blank commission must actually be blank — a decklist
              // pasted in an earlier refinement session should never
              // silently carry over and skip the three-reveal here.
              // reviewFocus is Review-session state in the same way, so
              // it gets cleared alongside deck for the same reason.
              setDeck("");
              setReviewFocus("");
              setBuildStep(0);
              setChamber("commission");
            }}
          />
          <ForgeCommissionCard
            eyebrow="ALREADY HAVE A DECK?"
            title="Review my decklist"
            description="Paste a list to check it and find useful improvements."
            cta="Review my deck →"
            tone="teal"
            motionMode={motionMode}
            onActivate={() => setChamber("refine")}
          />
        </div>
        <PlayerCompassCard
          value={playerCompass}
          signedIn={!guestMode}
          synced={playerCompassSynced}
          onChange={(next) => { void persistPlayerCompass(next); }}
        />
        <nav className="entrance-discovery" aria-label="Magic deckbuilding resources">
          <a href="/tools"><strong>Free MTG deckbuilding tools</strong><span>Build, check, and analyze Commander decks with clear explanations.</span></a>
          <a href="/commanders"><strong>Commander deck guides</strong><span>Explore commanders and the strategies their rules text supports.</span></a>
          <a href="/decks"><strong>Community Commander decks</strong><span>Explore complete decklists explicitly published by MetaForge players.</span></a>
          <a href="/academy"><strong>MTG deckbuilding guides</strong><span>Learn to diagnose mana, card flow, interaction, speed, and win conditions.</span></a>
          <a href="/about"><strong>How MetaForge works</strong><span>Read the evidence-first method behind our MTG deck coaching.</span></a>
        </nav>
      </div>
      <div className="entrance-visual" aria-label="The Great Forge, ever-burning">
        <div className="entrance-living-forge" aria-hidden="true">
          <video
            className="entrance-ember-film"
            src="/assets/forge/vfx/entrance-embers.mp4"
            poster="/forge-hero.webp"
            preload="metadata"
            autoPlay
            loop
            muted
            playsInline
          />
          <video
            className="entrance-aperture-film"
            src="/assets/forge/vfx/entrance-aperture.mp4"
            preload="none"
            autoPlay
            loop
            muted
            playsInline
          />
          <span className="entrance-furnace-bloom" />
          <span className="entrance-heat-lens" />
          <span className="entrance-forge-rails" />
        </div>
        <div className="forge-sigil">
          <ForgeRune motionMode={motionMode} />
          <span />
          <b />
        </div>
        <p>
          A DECK COACH FOR EVERY FORMAT
          <small>Complete deck first. Clear reasons second.</small>
        </p>
      </div>
    </section>
  );
}
