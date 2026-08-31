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
    setBuildPath,
    setSelectedCommander,
    setSelectedSecondCommander,
    setCommanderQuery,
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
        <p>Choose how you want to begin. Your Player Compass already carries your play preferences, so the Forge only asks for what this deck needs.</p>
        <div className="entrance-actions">
          <ForgeCommissionCard
            eyebrow="EMPTY WORKSPACE"
            title="Start from scratch"
            description="Open a clean decklist, search for cards, and add them as you go."
            cta="Open deck builder →"
            tone="ember"
            motionMode={motionMode}
            onActivate={() => {
              setDeck("");
              setReviewFocus("");
              setSelectedCommander(null);
              setSelectedSecondCommander(null);
              setCommanderQuery("");
              setBuildStep(0);
              setBuildPath("scratch");
              setChamber("refine");
            }}
          />
          <ForgeCommissionCard
            eyebrow="BRING WHAT YOU HAVE"
            title="Complete a decklist"
            description="Paste a full or partial list. The Forge will preserve its direction and fill the open slots."
            cta="Import decklist →"
            tone="teal"
            motionMode={motionMode}
            onActivate={() => {
              setDeck("");
              setReviewFocus("");
              setSelectedCommander(null);
              setSelectedSecondCommander(null);
              setCommanderQuery("");
              setBuildPath("complete");
              setChamber("refine");
            }}
          />
          <ForgeCommissionCard
            eyebrow="HELP ME CHOOSE"
            title="Discover a deck"
            description="Pick a format and commander—or ask the Forge to find one that fits you."
            cta="Discover my deck →"
            tone="ember"
            motionMode={motionMode}
            onActivate={() => {
              setDeck("");
              setReviewFocus("");
              setSelectedCommander(null);
              setSelectedSecondCommander(null);
              setCommanderQuery("");
              setBuildStep(0);
              setBuildPath("discover");
              setChamber("commission");
            }}
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
