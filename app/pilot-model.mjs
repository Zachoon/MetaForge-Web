// =============================================================================
// Pilot Model — Founder Issue #020
// =============================================================================
// If I sat down with this deck tonight, how would I play it?
// Deterministic interpretation of Strategic Recognition. Not simulation.
// Presentation only. Brain construction untouched.
// =============================================================================

const freeze = (value) => Object.freeze(value);

const STAGE_BY_SIGNAL = freeze({
  evasion: freeze({
    establish: (c) =>
      `Get creatures into play that are likely to connect before casting ${c}. Don't rush ${c} onto an empty board.`,
    deploy: (c) => `Cast ${c} when attacks are likely to connect.`,
    compound: () =>
      `Because combat keeps connecting, the deck naturally compounds value after each attack — more bodies, more cards, more pressure.`,
    protect: () =>
      `Preserve the creatures that let the commander trigger; keep one backup value engine available.`,
    close: () => `Convert a widened evasive board into lethal pressure.`,
  }),
  combat: freeze({
    establish: (c) =>
      `Develop mana and early attackers that can survive into ${c}'s turns. Don't force ${c} before the board can attack profitably.`,
    deploy: (c) => `Land ${c} once the board can attack profitably.`,
    compound: () => `Chain combat triggers into more board presence and cards.`,
    protect: () => `Do not trade away the attackers that keep combat payoffs firing.`,
    close: () => `Push through combat damage and finishers while the table is behind.`,
  }),
  artifacts: freeze({
    establish: (c) =>
      `Develop mana with rocks and cheap artifacts or equipment before forcing ${c}.`,
    deploy: (c) => `Land ${c} once enough cheap pieces are ready to convert.`,
    compound: () => `Turn each new artifact or equipment into larger threats and value.`,
    protect: () => `Hold one value engine if artifact sweepers or commander removal are likely.`,
    close: () => `Snowball artifact advantage into board states opponents cannot answer.`,
  }),
  tokens: freeze({
    establish: (c) => `Develop mana and early token makers before overextending into ${c}.`,
    deploy: (c) => `Land ${c} once tokens can start amplifying.`,
    compound: () => `Grow the board and convert token payoffs before a wipe.`,
    protect: () => `Hold a follow-up token maker when mass removal is expected.`,
    close: () => `Overwhelm with go-wide pressure once payoffs are online.`,
  }),
  etb: freeze({
    establish: (c) => `Develop mana and ETB creatures that are worth repeating.`,
    deploy: (c) => `Land ${c} once you have a reusable flicker, bounce, or token line.`,
    compound: () => `Blink or remake key permanents so each enter generates more value.`,
    protect: () => `Do not trade away the creatures that become much stronger when they enter again.`,
    close: () => `Convert repeated enters into irreversible board advantage.`,
  }),
  sacrifice: freeze({
    establish: (c) => `Develop mana, fodder, and an outlet before emptying the board.`,
    deploy: (c) => `Land ${c} once deaths can convert into cards or pressure.`,
    compound: () => `Sacrifice and recur without going to zero resources.`,
    protect: () => `Keep a second outlet or payoff when exile-based answers show up.`,
    close: () => `Turn a sacrifice loop into lethal drain or overwhelming value.`,
  }),
  spells: freeze({
    establish: (c) => `Develop mana and keep cheap spells flowing without emptying your hand.`,
    deploy: (c) => `Land ${c} once the spell pipeline can stay online.`,
    compound: () => `Let each spell draw, copy, or create a threat as a side effect.`,
    protect: () => `Hold interaction for the piece that actually stops ${c}.`,
    close: () => `Bury the table in incremental spell advantage.`,
  }),
  graveyard: freeze({
    establish: (c) => `Fill the yard with targets while developing mana.`,
    deploy: (c) => `Land ${c} or a reanimation line once a high-impact target is ready.`,
    compound: () => `Recur the next threat while fuel remains.`,
    protect: () => `Keep a fair threat when graveyard hate is likely.`,
    close: () => `Cheat in threats ahead of curve until the table cannot recover.`,
  }),
  lands: freeze({
    establish: (c) => `Develop mana and land-search pieces early.`,
    deploy: (c) => `Land ${c} once extra land drops are available.`,
    compound: () => `Stack landfall triggers into escalating value.`,
    protect: () => `Keep a backup ramp line when land hate or commander removal is common.`,
    close: () => `Convert repeated land drops into irreversible board advantage.`,
  }),
  treasure: freeze({
    establish: (c) => `Develop early board presence; treasure is support, not the whole plan.`,
    deploy: (c) => `Use treasure to accelerate ${c} or payoffs after combat or tokens succeed.`,
    compound: () => `Spend burst mana on the primary engine, not empty ramp.`,
    protect: () => `Do not overvalue treasure if the primary combat or token engine is offline.`,
    close: () => `Convert extra mana into the finish the primary plan already wants.`,
  }),
});

const DEFAULT_STAGES = freeze({
  establish: (c) => `Develop mana and the cheap setup pieces that support ${c}.`,
  deploy: (c) => `Land ${c} at a safe moment once the early support is online.`,
  compound: () => `Convert support pieces into board advantage before the table stabilizes.`,
  protect: (c) => `Hold one key piece if removal aimed at ${c} or a sweeper is likely.`,
  close: () => `Finish before opponents recover from your snowball.`,
});

function stagesFor(signal) {
  return STAGE_BY_SIGNAL[signal] || DEFAULT_STAGES;
}

/**
 * Pilot Story: Establish → Deploy → Compound → Protect → Close.
 * Commander players think in stories, not models — same deterministic content.
 */
export function buildPilotStory(args = {}) {
  return buildPilotModel(args);
}

/**
 * @deprecated Prefer buildPilotStory — kept as alias for existing imports.
 */
export function buildPilotModel({
  recognition = null,
  commanderName = "",
} = {}) {
  const commander = commanderName || "your commander";
  const signal = recognition?.hierarchy?.primary?.signal || null;
  const stages = stagesFor(signal);
  const ambiguous = Boolean(recognition?.ambiguous || recognition?.confidence?.level === "limited" && !signal);

  if (ambiguous && !signal) {
    return freeze({
      version: "pilot-model-v1",
      sequence: freeze(["Establish", "Deploy", "Compound", "Protect / Recover", "Close"]),
      establish: `Develop mana and flexible pieces while MetaForge is still ranking competing systems around ${commander}.`,
      deploy: `Do not force a single line until one system clearly dominates in play.`,
      compound: `Treat overlapping engines as options, not as a forced primary plan.`,
      protect: `Keep answers for the interaction that would strand your most expensive commitment.`,
      close: `Only escalate once a coherent engine is actually online.`,
      whenDangerous: `The deck becomes dangerous only after one of the competing systems clearly takes over.`,
      groundedIn: freeze(["recognition.ambiguous"]),
    });
  }

  return freeze({
    version: "pilot-model-v1",
    sequence: freeze(["Establish", "Deploy", "Compound", "Protect / Recover", "Close"]),
    establish: stages.establish(commander),
    deploy: stages.deploy(commander),
    compound: stages.compound(commander),
    protect: stages.protect(commander),
    close: stages.close(commander),
    whenDangerous: signal === "evasion" || signal === "combat"
      ? `The deck becomes dangerous once ${commander} is online and successful attacks start compounding into more board presence and cards.`
      : signal === "artifacts"
        ? `The deck becomes dangerous once ${commander} survives for several turns and each new artifact creates more pressure than the table can answer.`
        : `The deck becomes dangerous once ${commander} and the primary support system are both online.`,
    groundedIn: freeze([signal || "default", recognition?.planLabel || null].filter(Boolean)),
  });
}
