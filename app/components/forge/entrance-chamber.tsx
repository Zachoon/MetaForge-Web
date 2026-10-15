"use client";

import Link from "next/link";
import { ForgeCommissionCard } from "./forge-commission-card";
import { ForgeRune } from "./forge-motion-flourishes";
import { PlayerCompassCard } from "./player-compass-card";
import { SampleWalkthrough } from "./sample-walkthrough";
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
        <p>Pick your commander and we&rsquo;ll build the deck together, one card or package at a time, with a reason for every suggestion. Tell us how you like to play below and the suggestions adapt as you go.</p>
        <ol className="first-session-steps" aria-label="How a first deck starts">
          <li><b>1</b><span>Pick a commander</span></li>
          <li><b>2</b><span>Add the first card</span></li>
          <li><b>3</b><span>Read why it belongs</span></li>
        </ol>
        {/* One primary action. Every path is guided: the Forge never builds a
            whole deck in one click. */}
        <div className="entrance-actions entrance-actions-primary">
          <ForgeCommissionCard
            eyebrow="GUIDED DECK BUILDING"
            title="Start with your commander"
            description="You choose every card. The coach says why."
            cta="Begin →"
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
        <div className="entrance-secondary">
          <button
            type="button"
            onClick={() => {
              setDeck("");
              setReviewFocus("");
              setSelectedCommander(null);
              setSelectedSecondCommander(null);
              setCommanderQuery("");
              setBuildPath("complete");
              setChamber("refine");
            }}
          >
            Have a partial list? Review it step by step
          </button>
          <button
            type="button"
            onClick={() => {
              setDeck("");
              setReviewFocus("");
              setSelectedCommander(null);
              setSelectedSecondCommander(null);
              setCommanderQuery("");
              setBuildStep(0);
              setBuildPath("scratch");
              setChamber("refine");
            }}
          >
            Open an empty decklist
          </button>
        </div>
        <details className="entrance-more">
          <summary>See an example pick, set how you like to play, or browse guides</summary>
          <SampleWalkthrough />
          <PlayerCompassCard
            value={playerCompass}
            signedIn={!guestMode}
            synced={playerCompassSynced}
            onChange={(next) => { void persistPlayerCompass(next); }}
          />
          <nav className="entrance-discovery" aria-label="Magic deckbuilding resources">
            <Link href="/tools"><strong>Free MTG deckbuilding tools</strong><span>Build, check, and analyze Commander decks with clear explanations.</span></Link>
            <Link href="/commanders"><strong>Commander deck guides</strong><span>Explore commanders and the strategies their rules text supports.</span></Link>
            <a href="/decks"><strong>Commander deck archive</strong><span>Browse commander strategy guides. Player-published decklists are coming soon.</span></a>
            <Link href="/academy"><strong>MTG deckbuilding guides</strong><span>Learn to diagnose mana, card flow, interaction, speed, and win conditions.</span></Link>
            <a href="/about"><strong>How MetaForge works</strong><span>Read the evidence-first method behind our MTG deck coaching.</span></a>
          </nav>
        </details>
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
          <small>One card at a time. A reason for every pick.</small>
        </p>
      </div>
    </section>
  );
}
