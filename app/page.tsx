"use client";

import { useEffect, useMemo, useState } from "react";

type Chamber =
  | "entrance"
  | "commission"
  | "refine"
  | "forging"
  | "masterworks"
  | "workbench";

const FORGING_STAGES = [
  ["The blueprint is sealed", "Reading the commission marks…", "642"],
  ["Awakening the Great Furnace", "Ancient channels fill with light.", "642"],
  [
    "Consulting the Archive",
    "Rejecting designs with repeated structural failures…",
    "318",
  ],
  [
    "Shaping the strategic core",
    "Aligning every card with the requested strategy…",
    "141",
  ],
  ["Tempering the mana lattice", "Discarding unstable foundations…", "47"],
  [
    "Testing structural integrity",
    "Pressing each design against hostile plans…",
    "9",
  ],
  ["Inspecting imperfections", "Recording every honest weakness…", "3"],
  ["Three designs survived", "Cooling the surviving masterworks…", "3"],
] as const;

const MASTERWORKS = [
  {
    rune: "ᛋ",
    name: "The Ember Vanguard",
    path: "Aggressive Pressure",
    tone: "ember",
    verdict:
      "The fastest surviving design. Its edge was preserved without sacrificing its ability to recover.",
  },
  {
    rune: "ᛉ",
    name: "The Iron Covenant",
    path: "Adaptive Midrange",
    tone: "steel",
    verdict:
      "The most balanced masterwork. Its strength is refusing to become irrelevant as the battle changes.",
  },
  {
    rune: "ᛟ",
    name: "The Rune Bastion",
    path: "Measured Control",
    tone: "rune",
    verdict:
      "The most defensible design. It survived by answering the widest range of opposing plans.",
  },
] as const;

const ADDITIONAL_MASTERWORKS = [
  {
    rune: "ᛏ",
    name: "The Stormbrand Edge",
    path: "Tempo and Disruption",
    tone: "rune",
    verdict:
      "A precise design that turns small timing advantages into a lead the opponent cannot recover from.",
  },
  {
    rune: "ᛃ",
    name: "The Verdant Engine",
    path: "Synergy and Growth",
    tone: "steel",
    verdict:
      "A connected design whose pieces become more powerful together without depending on a single fragile line.",
  },
  {
    rune: "ᛇ",
    name: "The Gravebound Accord",
    path: "Resilient Attrition",
    tone: "ember",
    verdict:
      "A patient design that treats every exchange as fuel and continues producing value after the first plan is broken.",
  },
  {
    rune: "ᛋ",
    name: "The Sunforged Legion",
    path: "Go-Wide Pressure",
    tone: "ember",
    verdict:
      "A widening battlefield converts modest resources into an attack that demands several answers at once.",
  },
  {
    rune: "ᛞ",
    name: "The Mirror Crucible",
    path: "Engine and Combo",
    tone: "rune",
    verdict:
      "An intricate design that hides a decisive finish inside individually useful cards and overlapping lines.",
  },
  {
    rune: "ᛉ",
    name: "The Warden's Oath",
    path: "Ramp and Inevitability",
    tone: "steel",
    verdict:
      "A grounded design that survives the opening, accelerates past fair exchanges, and ends with overwhelming threats.",
  },
] as const;
const MASTERWORK_POOL = [...MASTERWORKS, ...ADDITIONAL_MASTERWORKS] as const;

type DeckPreview = { card: string; role: string; theme: string; win: string };
type DeckRow = { quantity: number; name: string };
type CardFact = {
  name: string;
  mana_cost?: string;
  oracle_text?: string;
  type_line?: string;
  set_name?: string;
  games?: string[];
  legalities?: Record<string, string>;
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
    image_uris?: { normal?: string; art_crop?: string };
  }>;
};
type CardSearchResult = { name: string; typeLine: string; image: string };
type CommanderOption = {
  name: string;
  colors: string[];
  typeLine: string;
  image: string;
  verifiedFacts: string;
};
type Masterwork = {
  rune: string;
  name: string;
  path: string;
  tone: string;
  verdict: string;
};
type SavedFamily = {
  id: string;
  name: string;
  format: string;
  strategy?: string;
  commander?: CommanderOption | null;
  selectedWork?: number;
  path?: string;
  record?: { wins: number; losses: number };
  updatedAt?: string;
  revisions: Array<{
    deckText: string;
    note: string;
    createdAt: string;
    evidence?: { wins?: number; losses?: number };
  }>;
};
type EdhrecSignal = {
  name: string;
  category: string;
  decks: number;
  eligibleDecks: number;
  inclusion: number;
  synergy: number;
  confidence: string;
  newCardPotential: boolean;
};
type EdhrecEvidence = {
  available: boolean;
  source?: string;
  methodology?: string;
  reason?: string;
  cards: EdhrecSignal[];
};

const MASTERWORK_STATS = [
  [94, 46, 70, 48],
  [72, 78, 76, 68],
  [28, 96, 64, 86],
  [76, 88, 72, 78],
  [62, 54, 94, 72],
  [44, 82, 88, 76],
  [86, 48, 90, 58],
  [38, 68, 98, 96],
  [42, 58, 82, 66],
] as const;
const FORMAT_PREVIEWS: Record<string, DeckPreview[]> = {
  Standard: [
    {
      card: "Emberheart Challenger",
      role: "Lynchpin · pressure engine",
      theme: "Efficient threats turn every combat step into leverage.",
      win: "Build an early lead, then convert prowess and reach into the final points.",
    },
    {
      card: "Overlord of the Hauntwoods",
      role: "Lynchpin · value engine",
      theme: "Durable threats keep mana and pressure moving together.",
      win: "Outscale fair decks with resilient bodies and compounding card quality.",
    },
    {
      card: "Stock Up",
      role: "Lynchpin · selection engine",
      theme:
        "Card selection finds the right answer for each stage of the game.",
      win: "Stabilize, exhaust opposing resources, and close behind protected threats.",
    },
  ],
  Modern: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Lynchpin · tempo engine",
      theme: "Cheap threats create mana, information, and immediate pressure.",
      win: "Force awkward answers early, then finish through efficient disruption.",
    },
    {
      card: "Orcish Bowmasters",
      role: "Lynchpin · value engine",
      theme:
        "Flexible threats punish excess cards while controlling small creatures.",
      win: "Trade efficiently until incremental advantages become overwhelming.",
    },
    {
      card: "Counterspell",
      role: "Lynchpin · permission",
      theme: "Broad answers protect a compact, inevitable endgame.",
      win: "Deny the opponent's pivotal turn and win once their resources are thin.",
    },
  ],
  Premodern: [
    {
      card: "Goblin Lackey",
      role: "Lynchpin · deployment engine",
      theme:
        "One opening connects and turns the battlefield into an avalanche.",
      win: "Overwhelm defenses before slower engines can establish control.",
    },
    {
      card: "Survival of the Fittest",
      role: "Lynchpin · toolbox engine",
      theme: "Every creature can become the exact answer the position demands.",
      win: "Assemble an adaptable creature chain that opponents cannot trade through.",
    },
    {
      card: "Counterspell",
      role: "Lynchpin · permission",
      theme: "Efficient interaction protects a patient, resource-rich endgame.",
      win: "Neutralize the few spells that matter and take over with superior cards.",
    },
  ],
  Pioneer: [
    {
      card: "Monastery Swiftspear",
      role: "Lynchpin · pressure engine",
      theme: "Low-cost spells become both interaction and additional damage.",
      win: "Compress the game until every draw threatens lethal.",
    },
    {
      card: "Fable of the Mirror-Breaker",
      role: "Lynchpin · value engine",
      theme: "Filtering, mana, and copied threats make every stage productive.",
      win: "Accumulate flexible advantages, then copy the deck's best threat.",
    },
    {
      card: "Supreme Verdict",
      role: "Lynchpin · reset",
      theme: "Unconditional resets buy time for a powerful late game.",
      win: "Clear committed boards and close once the opponent is out of rebuilds.",
    },
  ],
  Historic: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Lynchpin · tempo engine",
      theme: "Early pressure snowballs into mana and stolen resources.",
      win: "Stay ahead on tempo while disruption protects the attack.",
    },
    {
      card: "Jarsyl, Dark Age Scion",
      role: "Lynchpin · recursion engine",
      theme: "The graveyard turns past exchanges into future value.",
      win: "Replay efficient spells until one-for-one trades stop being fair.",
    },
    {
      card: "Mana Drain",
      role: "Lynchpin · permission",
      theme: "Premium interaction turns defense into a burst of development.",
      win: "Counter the pivotal spell and use the mana swing to seize control.",
    },
  ],
  Brawl: [
    {
      card: "Ragavan, Nimble Pilferer",
      role: "Commander · treasure tempo",
      theme:
        "A compact red raid built around cheap interaction and stolen cards.",
      win: "Connect early, compound Treasure advantages, and burn through the last defenses.",
    },
    {
      card: "Kutzil, Malamet Exemplar",
      role: "Commander · modified creatures",
      theme:
        "Counters and combat tricks turn a creature team into a draw engine.",
      win: "Grow multiple threats, deny combat tricks, and snowball every clean hit.",
    },
    {
      card: "Braids, Arisen Nightmare",
      role: "Commander · sacrifice control",
      theme:
        "Disposable permanents become cards while opponents face painful choices.",
      win: "Drain resources turn by turn until sacrifice pressure becomes inevitable.",
    },
  ],
  Commander: [
    {
      card: "Isshin, Two Heavens as One",
      role: "Commander · attack triggers",
      theme:
        "Every attack trigger fires twice, rewarding a relentless combat plan.",
      win: "Build one explosive combat step that multiplies tokens, damage, and value.",
    },
    {
      card: "Muldrotha, the Gravetide",
      role: "Commander · graveyard value",
      theme: "The graveyard acts as a second hand full of reusable permanents.",
      win: "Outlast removal, rebuild repeatedly, and lock in an overwhelming resource edge.",
    },
    {
      card: "Shorikai, Genesis Engine",
      role: "Commander · artifact control",
      theme:
        "Vehicles, tokens, and card selection support a patient control shell.",
      win: "Filter into answers, stabilize behind Pilots, then win through inevitability.",
    },
  ],
};
const cardImage = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=normal`;
const isCommanderFormat = (format: string) =>
  ["Commander", "Brawl", "Standard Brawl"].includes(format);
const targetDeckSize = (format: string) =>
  format === "Commander" || format === "Brawl"
    ? 100
    : format === "Standard Brawl"
      ? 60
      : 60;
const scryfallLegality = (format: string) =>
  format === "Commander"
    ? "commander"
    : format === "Brawl" || format === "Standard Brawl"
      ? "brawl"
      : format.toLowerCase();
const scryfallFormatTerms = (format: string) =>
  format === "Standard Brawl"
    ? "legal:brawl legal:standard game:arena"
    : format === "Brawl"
      ? "legal:brawl game:arena"
      : `legal:${format.toLowerCase()}`;
const NAME_CORES = [
  "Ashen Crown",
  "Verdant Pulse",
  "Glass Horizon",
  "Thunder Loom",
  "Moonlit Engine",
  "Gilded Tempest",
  "Hollow Star",
  "Wildwood Oath",
  "Crimson Archive",
  "Aetherwake",
  "Iron Bloom",
  "Silent Constellation",
];
const PATHS = [
  "Relentless Momentum",
  "Layered Synergy",
  "Reactive Precision",
  "Resource Alchemy",
  "Creature-Engine Growth",
  "Graveyard Recursion",
  "Tempo Conversion",
  "Board-State Dominion",
  "Patient Inevitability",
  "Explosive Convergence",
  "Adaptive Value",
  "Protected Combo",
];
const VERDICTS = [
  "Its lines overlap naturally, letting ordinary draws become meaningful decisions instead of scripted sequences.",
  "This design turns the commander's most unusual clause into a repeatable source of leverage.",
  "The shell bends between pressure and recovery without abandoning the commission's central promise.",
  "Redundant enablers support several distinct finishes, so interaction does not erase the deck's identity.",
  "Its resource plan rewards careful sequencing and creates an endgame that feels earned rather than automatic.",
  "The design attacks from an unexpected angle while preserving enough interaction to survive a changing table.",
  "Every major package serves two roles, reducing dead draws while keeping the deck expressive.",
  "The strongest version was the one that made the commander matter without making the entire deck collapse around it.",
];
const hashText = (value: string) =>
  Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    2166136261,
  );
const createMasterworks = (seed: number, commander = ""): Masterwork[] => {
  const base = hashText(`${seed}-${commander}`);
  return Array.from({ length: 9 }, (_, index) => {
    const n = (base + index * 7919) >>> 0,
      core = NAME_CORES[(base + index * 5) % NAME_CORES.length];
    const identity = commander.split(/[ ,]+/)[0] || "Forge";
    return {
      rune: ["ᛋ", "ᛉ", "ᛟ", "ᚷ", "ᚱ", "ᛇ", "ᚾ", "ᛞ", "ᛜ"][index],
      name: index % 3 === 0 ? `The ${identity} ${core}` : `The ${core}`,
      path: PATHS[(base + index * 7) % PATHS.length],
      tone: ["ember", "steel", "rune"][index % 3],
      verdict: VERDICTS[(n >>> 7) % VERDICTS.length],
    };
  });
};
const commanderOption = (card: any): CommanderOption => {
  const faceFacts = (card.card_faces || [])
    .map(
      (face: any) =>
        `${face.name} ${face.mana_cost || ""}\n${face.type_line || ""}\n${face.oracle_text || ""}`,
    )
    .join("\nTRANSFORMS TO\n");
  return {
    name: card.name,
    colors: card.color_identity || [],
    typeLine: card.type_line || "Legendary card",
    image:
      card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || "",
    verifiedFacts: `LIVE SCRYFALL RECORD\nName: ${card.name}\nMana cost: ${card.mana_cost || card.card_faces?.[0]?.mana_cost || "None"}\nType: ${card.type_line || ""}\nColor identity: ${(card.color_identity || []).join("") || "Colorless"}\nSet: ${card.set_name || ""} (${card.set || ""})\nAvailable games: ${(card.games || []).join(", ")}\nBrawl legality: ${card.legalities?.brawl || "unknown"}\nCommander legality: ${card.legalities?.commander || "unknown"}\nOracle text:\n${faceFacts || card.oracle_text || ""}`,
  };
};
const formatEdhrecEvidence = (
  evidence: EdhrecEvidence | null,
  format: string,
) => {
  if (!evidence?.available || !evidence.cards.length)
    return "EDHREC has no usable commander evidence for this commission yet. Do not penalize new or sparsely indexed cards; evaluate them from verified rules text and the Blueprint.";
  const signals = evidence.cards
    .slice(0, 45)
    .map(
      (card) =>
        `${card.name} | ${card.category} | adoption ${(card.inclusion * 100).toFixed(1)}% (${card.decks}/${card.eligibleDecks || "?"} eligible decks) | commander-relative synergy ${(card.synergy * 100).toFixed(1)}% | confidence ${card.confidence}${card.newCardPotential ? " | PROMISING NEW CARD" : ""}`,
    )
    .join("\n");
  return `EDHREC COMMANDER EVIDENCE (descriptive, not a legality source)\n${evidence.methodology || "Adoption and commander-relative synergy evidence."}\n${format.includes("Brawl") ? `This is cross-format Commander evidence only. Every candidate must still pass current Arena ${format} legality and color-identity checks in Scryfall.` : "Every candidate must still pass current Commander legality and color-identity checks in Scryfall."}\nDo not treat popularity as proof of quality. Weight low-sample signals cautiously, but do not suppress a new card merely because adoption is young when its mechanics and synergy fit are strong.\n${signals}`;
};
const parseDeckRows = (text: string): DeckRow[] =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line
      .trim()
      .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });
const cardGroup = (fact?: CardFact, isCommander = false) => {
  const type = [
    fact?.type_line,
    ...(fact?.card_faces || []).map((face) => face.type_line),
  ]
    .filter(Boolean)
    .join(" // ");
  if (isCommander) return "Commander";
  if (/Land/i.test(type)) return "Lands";
  if (/Enchantment/i.test(type)) return "Enchantments";
  if (/Creature/i.test(type)) return "Creatures";
  if (/Planeswalker/i.test(type)) return "Planeswalkers";
  if (/Instant/i.test(type)) return "Instants";
  if (/Sorcery/i.test(type)) return "Sorceries";
  if (/Artifact/i.test(type)) return "Artifacts";
  if (/Battle/i.test(type)) return "Battles";
  return "Other";
};

export default function Home() {
  const [chamber, setChamber] = useState<Chamber>("entrance");
  const [stage, setStage] = useState(0);
  const [format, setFormat] = useState("Standard");
  const [strategy, setStrategy] = useState("Balanced midrange");
  const [deck, setDeck] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [commanderQuery, setCommanderQuery] = useState("");
  const [commanderResults, setCommanderResults] = useState<CommanderOption[]>(
    [],
  );
  const [selectedCommander, setSelectedCommander] =
    useState<CommanderOption | null>(null);
  const [commanderSearching, setCommanderSearching] = useState(false);
  const [randomizingCommander, setRandomizingCommander] = useState(false);
  const [randomCommanderMode, setRandomCommanderMode] = useState(false);
  const [randomCommanderOptions, setRandomCommanderOptions] = useState<
    CommanderOption[]
  >([]);
  const [seenRandomCommanders, setSeenRandomCommanders] = useState<string[]>(
    [],
  );
  const [selectedWork, setSelectedWork] = useState(0);
  const [masterworkPage, setMasterworkPage] = useState(0);
  const [forgedDeck, setForgedDeck] = useState("");
  const [forgeReply, setForgeReply] = useState("");
  const [playerSignal, setPlayerSignal] = useState("");
  const [benchStatus, setBenchStatus] = useState<
    "idle" | "forging" | "testing" | "thinking"
  >("idle");
  const [record, setRecord] = useState({ wins: 0, losses: 0 });
  const [revisions, setRevisions] = useState<
    Array<{ deck: string; note: string; createdAt: string }>
  >([]);
  const [cardFacts, setCardFacts] = useState<Record<string, CardFact>>({});
  const [hoveredCard, setHoveredCard] = useState("");
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [edhrecEvidence, setEdhrecEvidence] = useState<EdhrecEvidence | null>(
    null,
  );
  const [commissionSeed, setCommissionSeed] = useState(() => Date.now());
  const [deckId, setDeckId] = useState("");
  const [savedMasterworks, setSavedMasterworks] = useState<SavedFamily[]>([]);
  const [restoredWork, setRestoredWork] = useState<Masterwork | null>(null);
  const [benchOpen, setBenchOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [cardSearchResults, setCardSearchResults] = useState<
    CardSearchResult[]
  >([]);
  const [consideringCards, setConsideringCards] = useState<DeckRow[]>([]);
  const [removedCards, setRemovedCards] = useState<DeckRow[]>([]);
  const [editAnvilOpen, setEditAnvilOpen] = useState(true);
  const [forgeGenerationError, setForgeGenerationError] = useState("");
  const [replacementRecommendations, setReplacementRecommendations] = useState<
    CardSearchResult[]
  >([]);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [lastCutCard, setLastCutCard] = useState("");

  useEffect(() => {
    if (chamber !== "forging") return;
    if (stage >= FORGING_STAGES.length - 1) {
      const reveal = window.setTimeout(() => setChamber("masterworks"), 1500);
      return () => window.clearTimeout(reveal);
    }
    const timer = window.setTimeout(() => setStage((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [chamber, stage]);

  const progress = useMemo(
    () => ((stage + 1) / FORGING_STAGES.length) * 100,
    [stage],
  );
  const awaken = () => {
    setCommissionSeed(Date.now());
    setStage(0);
    setMasterworkPage(0);
    setSelectedWork(0);
    setChamber("forging");
  };
  const chapter =
    chamber === "entrance"
      ? 0
      : chamber === "commission" || chamber === "refine"
        ? 1
        : chamber === "forging"
          ? 2
          : 3;
  const masterworks = useMemo(
    () => createMasterworks(commissionSeed, selectedCommander?.name),
    [commissionSeed, selectedCommander?.name],
  );
  const visibleMasterworks = useMemo(
    () => masterworks.slice(masterworkPage * 3, masterworkPage * 3 + 3),
    [masterworkPage, masterworks],
  );
  const randomCommission =
    randomCommanderMode &&
    Boolean(
      selectedCommander &&
      seenRandomCommanders.includes(selectedCommander.name),
    );
  const commanderFor = (index: number) =>
    randomCommission && randomCommanderOptions.length === 3
      ? randomCommanderOptions[index % 3]
      : selectedCommander;
  const previewFor = (index: number) => {
    const base = (FORMAT_PREVIEWS[
      format === "Standard Brawl" ? "Brawl" : format
    ] ?? FORMAT_PREVIEWS.Standard)[index % 3];
    const commander = commanderFor(index);
    return commander && isCommanderFormat(format)
      ? {
          ...base,
          card: commander.name,
          role: randomCommission
            ? "Commander · discovered by the Forge"
            : "Commander · chosen in your Blueprint",
          theme:
            commissionNote.trim() ||
            `A ${commander.colors.join("")} identity commission built around this commander.`,
        }
      : base;
  };
  const chosenPreview = previewFor(selectedWork);
  const chosenWork = restoredWork || masterworks[selectedWork];
  const deckRows = useMemo(() => parseDeckRows(forgedDeck), [forgedDeck]);
  const orderedDeckRows = useMemo(
    () =>
      [...deckRows].sort((a, b) => {
        const ai = cardOrder.indexOf(a.name),
          bi = cardOrder.indexOf(b.name);
        return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
      }),
    [deckRows, cardOrder],
  );
  const groupedDeck = useMemo(() => {
    const groups: Record<string, DeckRow[]> = {};
    for (const row of orderedDeckRows) {
      const group = cardGroup(
        cardFacts[row.name.toLowerCase()],
        isCommanderFormat(format) &&
          row.name.toLowerCase() === chosenPreview.card.toLowerCase(),
      );
      (groups[group] ||= []).push(row);
    }
    return groups;
  }, [orderedDeckRows, cardFacts, format, chosenPreview.card]);
  const activeCard =
    hoveredCard || chosenPreview.card || deckRows[0]?.name || "";
  const activeFact = cardFacts[activeCard.toLowerCase()];
  const activeImage =
    activeFact?.image_uris?.normal ||
    activeFact?.card_faces?.[0]?.image_uris?.normal ||
    (activeCard ? cardImage(activeCard) : "");
  const verifiedDeckFacts = useMemo(
    () =>
      [
        ...new Map(
          Object.values(cardFacts).map((fact) => [fact.name, fact]),
        ).values(),
      ]
        .map((fact) => {
          const faces = fact.card_faces
            ?.map(
              (face) =>
                `${face.name || fact.name} ${face.mana_cost || ""} · ${face.type_line || ""}\n${face.oracle_text || ""}`,
            )
            .join("\nTRANSFORMS TO\n");
          return `${fact.name} · ${fact.mana_cost || ""} · ${fact.type_line || ""} · Set: ${fact.set_name || "Unknown"} · Games: ${(fact.games || []).join(", ")} · ${format} legality: ${fact.legalities?.[scryfallLegality(format)] || "ruleset review required"}\n${faces || fact.oracle_text || ""}`;
        })
        .join("\n\n")
        .slice(0, 10000),
    [cardFacts, format],
  );

  useEffect(() => {
    const names = [
      ...new Set(parseDeckRows(forgedDeck).map((row) => row.name)),
    ];
    if (!names.length) {
      setCardFacts({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, CardFact> = {};
      for (let index = 0; index < names.length; index += 75) {
        try {
          const response = await fetch(
            "https://api.scryfall.com/cards/collection",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                identifiers: names
                  .slice(index, index + 75)
                  .map((name) => ({ name })),
              }),
            },
          );
          const data = await response.json();
          for (const fact of data.data || []) {
            const aliases = [
              String(fact.name),
              String(fact.name).split(" // ")[0],
              ...(fact.card_faces || []).map((face: CardFact) =>
                String(face.name || ""),
              ),
            ];
            for (const alias of aliases)
              if (alias) next[alias.toLowerCase()] = fact;
          }
        } catch {
          /* Named image fallback remains available. */
        }
        if (index + 75 < names.length)
          await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      if (!cancelled) setCardFacts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [forgedDeck]);

  useEffect(() => {
    setCardOrder(deckRows.map((row) => row.name));
  }, [forgedDeck]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/account/deck-bench", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setSavedMasterworks(
          (data.bench?.families || [])
            .filter(
              (family: SavedFamily) => family.id && family.revisions?.length,
            )
            .sort((a: SavedFamily, b: SavedFamily) =>
              String(b.updatedAt || "").localeCompare(
                String(a.updatedAt || ""),
              ),
            ),
        );
      } catch {
        /* History remains available after the account reconnects. */
      }
    })();
  }, []);

  useEffect(() => {
    if (chamber !== "workbench" || cardSearch.trim().length < 2) {
      setCardSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const identity = selectedCommander?.colors?.length
          ? ` id<=${selectedCommander.colors.join("").toLowerCase()}`
          : "";
        const query = encodeURIComponent(
          `${scryfallFormatTerms(format)}${identity} name:${cardSearch.trim()}`,
        );
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&order=edhrec`,
        );
        const data = await response.json();
        setCardSearchResults(
          (data.data || [])
            .slice(0, 8)
            .map((card: any) => ({
              name: card.name,
              typeLine: card.type_line || "Card",
              image:
                card.image_uris?.small ||
                card.card_faces?.[0]?.image_uris?.small ||
                "",
            })),
        );
      } catch {
        setCardSearchResults([]);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [cardSearch, chamber, format, selectedCommander?.name]);

  useEffect(() => {
    if (
      !isCommanderFormat(format) ||
      commanderQuery.trim().length < 2 ||
      selectedCommander?.name === commanderQuery.trim()
    ) {
      setCommanderResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setCommanderSearching(true);
      try {
        const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} is:commander name:${commanderQuery.trim()}`,
        );
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${query}&order=name`,
        );
        const data = await response.json();
        setCommanderResults((data.data || []).slice(0, 8).map(commanderOption));
      } catch {
        setCommanderResults([]);
      } finally {
        setCommanderSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [commanderQuery, format, selectedCommander?.name]);

  useEffect(() => {
    if (chamber !== "workbench") return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLButtonElement>(".type-column>button")
        .forEach((button) => {
          button.draggable = true;
          button.title = "Drag to reorder this card within the deck gallery";
          button.ondragstart = (event) => {
            const name = button.querySelector("strong")?.textContent || "";
            event.dataTransfer?.setData("text/plain", name);
            button.classList.add("dragging");
          };
          button.ondragend = () => button.classList.remove("dragging");
          button.ondragover = (event) => event.preventDefault();
          button.ondrop = (event) => {
            event.preventDefault();
            const source = event.dataTransfer?.getData("text/plain") || "";
            const target = button.querySelector("strong")?.textContent || "";
            moveCard(source, target);
          };
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chamber, groupedDeck]);

  function moveCard(source: string, target: string) {
    if (!source || source === target) return;
    setCardOrder((current) => {
      const next = current.filter((name) => name !== source);
      const targetIndex = next.indexOf(target);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, source);
      return next;
    });
  }
  function deckWithout(name: string) {
    return forgedDeck
      .split(/\r?\n/)
      .filter((line) => {
        const match = line
          .trim()
          .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
        return !match || match[2].trim().toLowerCase() !== name.toLowerCase();
      })
      .join("\n");
  }
  function preserveDeckEdit(nextDeck: string, note: string) {
    const nextRevisions = [
      ...revisions,
      { deck: nextDeck, note, createdAt: new Date().toISOString() },
    ];
    setForgedDeck(nextDeck);
    setRevisions(nextRevisions);
    void persistStoryBench(nextRevisions, record);
  }
  function stageDeckCard(name: string, destination: "consider" | "remove") {
    const row = deckRows.find(
      (card) => card.name.toLowerCase() === name.toLowerCase(),
    );
    if (!row || name.toLowerCase() === chosenPreview.card.toLowerCase()) return;
    const nextDeck = deckWithout(name);
    if (destination === "consider")
      setConsideringCards((current) => [
        ...current.filter((card) => card.name !== name),
        row,
      ]);
    else
      setRemovedCards((current) => [
        ...current.filter((card) => card.name !== name),
        row,
      ]);
    preserveDeckEdit(
      nextDeck,
      `${destination === "consider" ? "Staged for consideration" : "Removed"}: ${row.quantity} ${row.name}`,
    );
    void recommendReplacements(row, nextDeck);
  }
  function addCardToDeck(row: DeckRow, note = "Added from the workbench") {
    const existing = deckRows.find(
      (card) => card.name.toLowerCase() === row.name.toLowerCase(),
    );
    const quantity = existing ? existing.quantity + row.quantity : row.quantity;
    let replaced = false;
    const lines = forgedDeck.split(/\r?\n/).map((line) => {
      const match = line
        .trim()
        .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
      if (match && match[2].trim().toLowerCase() === row.name.toLowerCase()) {
        replaced = true;
        return `${quantity} ${row.name}`;
      }
      return line;
    });
    if (!replaced) lines.push(`${row.quantity} ${row.name}`);
    setConsideringCards((current) =>
      current.filter((card) => card.name !== row.name),
    );
    preserveDeckEdit(lines.join("\n"), `${note}: ${row.quantity} ${row.name}`);
  }
  async function recommendReplacements(cut: DeckRow, nextDeck: string) {
    setLastCutCard(cut.name);
    setReplacementRecommendations([]);
    setReplacementLoading(true);
    try {
      const prompt = `A player cut ${cut.name} from this ${format} deck. Recommend exactly three legal one-card replacements that best preserve or deliberately improve its role in this specific deck. Respect the commander, color identity, strategy, and current list. Return ONLY three lines formatted exactly as: 1 Card Name.`;
      const response = await fetch("/api/forge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depth: "balanced",
          messages: [{ role: "user", content: prompt }],
          context: {
            game: "mtg",
            deckName: chosenWork.name,
            format,
            deckText: nextDeck,
            verifiedFacts:
              verifiedDeckFacts ||
              selectedCommander?.verifiedFacts ||
              "Use conservative legal candidates.",
            coachingProfile: `Strategy: ${strategy}`,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      const names = parseDeckRows(String(data.answer || ""))
        .map((row) => row.name)
        .slice(0, 3);
      const resolved: CardSearchResult[] = [];
      for (const name of names) {
        const cardResponse = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
        );
        if (!cardResponse.ok) continue;
        const card = await cardResponse.json();
        if (
          card.legalities?.[scryfallLegality(format)] !== "legal" ||
          ((format === "Brawl" || format === "Standard Brawl") &&
            !(card.games || []).includes("arena")) ||
          (format === "Standard Brawl" && card.legalities?.standard !== "legal")
        )
          continue;
        resolved.push({
          name: card.name,
          typeLine: card.type_line || "Card",
          image:
            card.image_uris?.small ||
            card.card_faces?.[0]?.image_uris?.small ||
            "",
        });
      }
      setReplacementRecommendations(resolved.slice(0, 3));
    } catch {
      setReplacementRecommendations([]);
    } finally {
      setReplacementLoading(false);
    }
  }

  async function chooseRandomCommander() {
    setRandomizingCommander(true);
    setCommanderResults([]);
    try {
      const query = encodeURIComponent(
        `${scryfallFormatTerms(format)} is:commander`,
      );
      const response = await fetch(
        `https://api.scryfall.com/cards/random?q=${query}`,
      );
      if (!response.ok) throw new Error();
      const option = commanderOption(await response.json());
      setSelectedCommander(option);
      setCommanderQuery(option.name);
      setRandomCommanderMode(true);
      setRandomCommanderOptions([]);
      setSeenRandomCommanders([option.name]);
    } catch {
      setCommanderQuery("");
    } finally {
      setRandomizingCommander(false);
    }
  }

  async function recycleMasterworks() {
    if (randomizingCommander) return;
    if (!randomCommission) {
      setMasterworkPage((page) => page + 1);
      return;
    }
    setRandomizingCommander(true);
    try {
      const query = encodeURIComponent(
          `${scryfallFormatTerms(format)} is:commander`,
        ),
        exclusions = new Set(seenRandomCommanders),
        next: CommanderOption[] = [];
      for (let attempts = 0; next.length < 3 && attempts < 18; attempts += 1) {
        const response = await fetch(
          `https://api.scryfall.com/cards/random?q=${query}`,
        );
        if (!response.ok) continue;
        const option = commanderOption(await response.json());
        if (!exclusions.has(option.name)) {
          exclusions.add(option.name);
          next.push(option);
        }
      }
      if (next.length !== 3)
        throw new Error("Could not draw three unique commanders");
      setRandomCommanderOptions(next);
      setSeenRandomCommanders([...exclusions]);
      setMasterworkPage((page) => page + 1);
    } finally {
      setRandomizingCommander(false);
    }
  }

  async function inspectMasterwork(index: number) {
    const work = masterworks[index];
    const preview = previewFor(index);
    const commander = commanderFor(index);
    const generationId = crypto.randomUUID();
    setRestoredWork(null);
    setDeckId(generationId);
    setSelectedWork(index);
    if (commander) setSelectedCommander(commander);
    setChamber("workbench");
    setBenchStatus("forging");
    setForgeReply("");
    setForgeGenerationError("");
    setConsideringCards([]);
    setRemovedCards([]);
    setReplacementRecommendations([]);
    setLastCutCard("");
    let evidence: EdhrecEvidence | null = null;
    if (commander && isCommanderFormat(format)) {
      try {
        const evidenceResponse = await fetch(
          `/api/forge/edhrec?commander=${encodeURIComponent(commander.name)}`,
        );
        if (evidenceResponse.ok) evidence = await evidenceResponse.json();
      } catch {
        /* The Forge can proceed from verified card facts alone. */
      }
    }
    setEdhrecEvidence(evidence);
    const evidenceFacts = formatEdhrecEvidence(evidence, format);
    const prompt = `Forge the complete ${format} deck represented by ${work.name}. Its identity is ${work.path}; required ${isCommanderFormat(format) ? "commander" : "lynchpin"}: ${preview.card}; requested play style: ${strategy}. The player's Blueprint note is: ${commissionNote.trim() || "No additional note"}. ${format === "Brawl" ? "MetaForge Brawl means current Arena Brawl: exactly 100 cards total, one commander plus 99 main-deck cards, using live Brawl legality and Arena availability." : format === "Standard Brawl" ? "MetaForge Standard Brawl means exactly 60 cards total, one commander plus 59 Standard-legal Arena cards." : ""} Return a concise pilot brief followed by one complete import-ready decklist. The chosen commander, oracle text, legality, Arena availability, and color identity in verified facts are binding constraints. Use the EDHREC evidence as a prior for card adoption and co-occurrence, not as proof or a legality source. Do not claim this commander is unverified when its live record is supplied. This is a founder-test candidate: never claim performance that has not been verified, and explicitly identify any remaining uncertainty.`;
    const target = targetDeckSize(format);
    try {
      let answer = "";
      let total = 0;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const repairInstruction = attempt
          ? `Your previous response parsed as ${total} cards, but this format requires exactly ${target}. Rewrite the entire import-ready list now. Do not explain the error. Every decklist line must begin with a numeric quantity.`
          : prompt;
        const response = await fetch("/api/forge/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "deck_generation",
            depth: "deep",
            messages: [{ role: "user", content: repairInstruction }],
            context: {
              game: "mtg",
              deckName: work.name,
              format,
              deckText: attempt ? answer : "",
              verifiedFacts: `${commander?.verifiedFacts || "No commander record required for this format."}\n\n${evidenceFacts}`,
              coachingProfile: "Prefers concise, testable deck guidance.",
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Forge unavailable");
        answer = String(data.answer || "");
        total = parseDeckRows(answer).reduce(
          (sum, row) => sum + row.quantity,
          0,
        );
        if (total === target) break;
      }
      if (total !== target) throw new Error("Incomplete Forge list");
      const firstRevision = [
        {
          deck: answer,
          note: "Original Forge candidate",
          createdAt: new Date().toISOString(),
        },
      ];
      setForgedDeck(answer);
      setRevisions(firstRevision);
      void persistStoryBench(
        firstRevision,
        { wins: 0, losses: 0 },
        generationId,
        { work, commander, index },
      );
    } catch {
      setForgedDeck("");
      setForgeGenerationError(
        "The Forge did not finish a valid list. Your commission is safe—strike the anvil again to retry.",
      );
    } finally {
      setBenchStatus("idle");
    }
  }

  function openSavedMasterwork(family: SavedFamily) {
    const restoredRevisions = family.revisions.map((revision) => ({
      deck: revision.deckText,
      note: revision.note,
      createdAt: revision.createdAt,
    }));
    const latest = restoredRevisions.at(-1);
    setDeckId(family.id);
    setFormat(family.format);
    setStrategy(family.strategy || "Balanced midrange");
    setSelectedWork(family.selectedWork || 0);
    setSelectedCommander(family.commander || null);
    setRestoredWork({
      rune: "ᛞ",
      name: family.name,
      path: family.path || "Preserved Masterwork",
      tone: "steel",
      verdict:
        "A preserved commission, reopened with its complete testing history.",
    });
    setForgedDeck(latest?.deck || "");
    setRevisions(restoredRevisions);
    setRecord(
      family.record || {
        wins: Number(family.revisions.at(-1)?.evidence?.wins || 0),
        losses: Number(family.revisions.at(-1)?.evidence?.losses || 0),
      },
    );
    setPlayerSignal("");
    setForgeReply("");
    setBenchStatus("testing");
    setChamber("workbench");
  }

  async function deleteSavedMasterwork(id: string) {
    try {
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const families = (data.bench?.families || []).filter(
        (family: SavedFamily) => family.id !== id,
      );
      const saved = await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench: { schemaVersion: 1, families },
          baseRevision: data.revision || 0,
        }),
      });
      if (saved.ok) setSavedMasterworks(families);
    } catch {
      /* A failed delete leaves the preserved deck untouched. */
    }
  }

  function startNewForge() {
    setBenchOpen(false);
    setRestoredWork(null);
    setSelectedCommander(null);
    setCommanderQuery("");
    setCommissionNote("");
    setDeck("");
    setRecord({ wins: 0, losses: 0 });
    setRevisions([]);
    setForgedDeck("");
    setDeckId("");
    setChamber("commission");
  }
  function showFullArchive() {
    setBenchOpen(false);
    setChamber("entrance");
    window.setTimeout(
      () =>
        document
          .querySelector(".masterwork-history")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  }

  async function persistStoryBench(
    nextRevisions = revisions,
    nextRecord = record,
    idOverride = "",
    meta?: {
      work: Masterwork;
      commander: CommanderOption | null;
      index: number;
    },
  ) {
    const activeId = idOverride || deckId || crypto.randomUUID();
    if (!deckId) setDeckId(activeId);
    const activeWork = meta?.work || chosenWork,
      activeCommander = meta?.commander ?? selectedCommander,
      activeIndex = meta?.index ?? selectedWork;
    const snapshot = {
      id: activeId,
      format,
      strategy,
      selectedWork,
      forgedDeck,
      revisions: nextRevisions,
      record: nextRecord,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      "metaforge.storyBench",
      JSON.stringify(snapshot),
    );
    try {
      const response = await fetch("/api/account/deck-bench", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const current = await response.json();
      const bench = current.bench || { schemaVersion: 1, families: [] };
      const family = {
        id: activeId,
        name: activeWork.name,
        format,
        strategy,
        commander: activeCommander,
        selectedWork: activeIndex,
        path: activeWork.path,
        record: nextRecord,
        updatedAt: new Date().toISOString(),
        archived: false,
        promotedFingerprint: `story-${nextRevisions.length}`,
        revisions: nextRevisions.map((revision, index) => ({
          fingerprint: `story-${index + 1}-${revision.createdAt}`,
          version: index + 1,
          source: index ? "forge" : "original",
          deckText: revision.deck,
          note: revision.note,
          createdAt: revision.createdAt,
          evidence: {
            wins: nextRecord.wins,
            losses: nextRecord.losses,
            sampleSize: nextRecord.wins + nextRecord.losses,
            confidence:
              nextRecord.wins + nextRecord.losses < 3
                ? "early signal"
                : "developing",
          },
        })),
      };
      const families = [
        ...(bench.families || []).filter(
          (item: { id?: string }) => item.id !== activeId,
        ),
        family,
      ];
      await fetch("/api/account/deck-bench", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench: { schemaVersion: 1, families },
          baseRevision: current.revision || 0,
        }),
      });
      setSavedMasterworks(families as SavedFamily[]);
    } catch {
      /* Browser recovery remains available if account sync is interrupted. */
    }
  }

  function beginTesting() {
    setBenchStatus("testing");
    void persistStoryBench();
  }

  function recordMatch(result: "win" | "loss") {
    const next =
      result === "win"
        ? { ...record, wins: record.wins + 1 }
        : { ...record, losses: record.losses + 1 };
    setRecord(next);
    void persistStoryBench(revisions, next);
  }

  async function consultForge() {
    if (!playerSignal.trim() || benchStatus === "thinking") return;
    setBenchStatus("thinking");
    setForgeReply("");
    const prompt = `I tested revision ${revisions.length || 1} of ${chosenWork.name}. My signal: ${playerSignal.trim()}\n\nDiagnose the most likely issue without overreacting to one result. Give 2-3 precise replacement packages or alternatives with what comes out, what comes in, the tradeoff, and the smallest next test. Preserve the deck's ${chosenWork.path} identity and my ${strategy} preference.`;
    try {
      const response = await fetch("/api/forge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depth: "balanced",
          messages: [{ role: "user", content: prompt }],
          context: {
            game: "mtg",
            deckName: chosenWork.name,
            format,
            deckText: forgedDeck,
            verifiedFacts: `${verifiedDeckFacts || selectedCommander?.verifiedFacts || "Live card facts are still loading."}\n\n${formatEdhrecEvidence(edhrecEvidence, format)}`,
            coachingProfile:
              "Prefers concise alternatives and testable changes.",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Forge unavailable");
      setForgeReply(String(data.answer || ""));
    } catch {
      setForgeReply(
        "The Forge could not complete this refinement. Your feedback is still preserved locally; retry when the furnace reconnects.",
      );
    } finally {
      setBenchStatus("testing");
    }
  }

  function preserveRevision() {
    if (!forgeReply.trim()) return;
    const next = [
      ...revisions,
      {
        deck: forgedDeck,
        note: forgeReply,
        createdAt: new Date().toISOString(),
      },
    ];
    setRevisions(next);
    void persistStoryBench(next, record);
    setPlayerSignal("");
    setForgeReply("");
  }

  return (
    <main className={`great-forge chamber-${chamber}`}>
      <div className="forge-textures" aria-hidden="true">
        <i />
        <b />
      </div>
      <header className="forge-bar">
        <button
          className="forge-brand"
          onClick={() => setChamber("entrance")}
          aria-label="Return to Forge entrance"
        >
          <i>MF</i>
          <span>
            METAFORGE<small>THE GREAT FORGE</small>
          </span>
        </button>
        <nav className="forge-steps" aria-label="Commission progress">
          {[
            ["01", "Entrance"],
            ["02", "Blueprint"],
            ["03", "The Forge"],
            ["04", "Masterworks"],
          ].map(([number, label], index) => (
            <span className={chapter >= index ? "lit" : ""} key={label}>
              <b>{number}</b>
              {label}
            </span>
          ))}
        </nav>
        <button className="quiet-action" onClick={() => setChamber("entrance")}>
          New commission
        </button>
      </header>

      {chamber === "entrance" && (
        <section className="forge-entrance">
          <div className="entrance-copy">
            <span className="forge-eyebrow">
              <i /> THE GREAT FORGE AWAITS
            </span>
            <h1>
              What do you want
              <br />
              to <em>create today?</em>
            </h1>
            <p>
              Every legendary deck begins as a blueprint. Commission a new
              design or bring an existing build to the anvil for refinement.
            </p>
            <div className="entrance-actions">
              <button onClick={() => setChamber("commission")}>
                <small>COMMISSION I</small>
                <strong>Forge a new deck</strong>
                <span>Shape a masterwork from a fresh blueprint.</span>
                <b>Enter the drafting chamber →</b>
              </button>
              <button onClick={() => setChamber("refine")}>
                <small>COMMISSION II</small>
                <strong>Refine a current build</strong>
                <span>Bring an existing deck to the anvil.</span>
                <b>Enter the refinement chamber →</b>
              </button>
            </div>
          </div>
          <div className="entrance-visual" aria-label="The blue rune archive">
            <div className="forge-sigil">
              <i>ᛟ</i>
              <span />
              <b />
            </div>
            <p>
              THE ARCHIVE IS LISTENING
              <small>Every lesson. Every failure. Every masterwork.</small>
            </p>
          </div>
          {savedMasterworks.length > 0 && (
            <section className="masterwork-history">
              <header>
                <div>
                  <small>YOUR PRIVATE ARCHIVE</small>
                  <h2>Return to a Masterwork</h2>
                </div>
                <span>{savedMasterworks.length} PRESERVED</span>
              </header>
              <div>
                {savedMasterworks.map((family) => {
                  const evidence =
                    family.record || family.revisions.at(-1)?.evidence || {};
                  return (
                    <article key={family.id}>
                      <button
                        className="history-open"
                        onClick={() => openSavedMasterwork(family)}
                      >
                        <small>
                          {family.format} · {family.path || "FORGED DECK"}
                        </small>
                        <strong>{family.name}</strong>
                        <span>{family.commander?.name || "No commander"}</span>
                        <em>
                          {Number(evidence.wins || 0)}W ·{" "}
                          {Number(evidence.losses || 0)}L ·{" "}
                          {family.revisions.length} revision
                          {family.revisions.length === 1 ? "" : "s"}
                        </em>
                      </button>
                      <button
                        className="history-delete"
                        onClick={() => deleteSavedMasterwork(family.id)}
                        aria-label={`Delete ${family.name}`}
                      >
                        Delete
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      )}

      {(chamber === "commission" || chamber === "refine") && (
        <section className="commission-chamber">
          <button className="back-link" onClick={() => setChamber("entrance")}>
            ← Return to the Forge Entrance
          </button>
          <div className="commission-heading">
            <span className="forge-eyebrow">
              <i />{" "}
              {chamber === "commission"
                ? "COMMISSION I · THE BLUEPRINT"
                : "COMMISSION II · THE ANVIL"}
            </span>
            <h1>
              {chamber === "commission"
                ? "Describe the weapon you want to wield."
                : "Bring your deck to the anvil."}
            </h1>
            <p>
              {chamber === "commission"
                ? "These marks become constraints—not decoration. The Forge will honor how you want to play."
                : "The Forge will preserve what works, expose the fracture, and temper one deliberate change."}
            </p>
          </div>
          <div className="commission-scroll">
            {chamber === "refine" && (
              <label className="deck-offering">
                <span>YOUR CURRENT DECKLIST</span>
                <textarea
                  value={deck}
                  onChange={(event) => setDeck(event.target.value)}
                  placeholder="Paste your Arena, MTGO, or Moxfield list here…"
                />
              </label>
            )}
            <div className="mark-grid">
              <label>
                <span>FORMAT</span>
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value);
                    setSelectedCommander(null);
                    setCommanderQuery("");
                  }}
                >
                  <option>Standard</option>
                  <option>Brawl</option>
                  <option>Standard Brawl</option>
                  <option>Commander</option>
                  <option>Modern</option>
                  <option>Premodern</option>
                  <option>Pioneer</option>
                  <option>Historic</option>
                </select>
              </label>
              <label>
                <span>HOW SHOULD IT FIGHT?</span>
                <select
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                >
                  <option>Aggressive pressure</option>
                  <option>Balanced midrange</option>
                  <option>Reactive control</option>
                  <option>Synergy and combo</option>
                  <option>Tempo and disruption</option>
                </select>
              </label>
              <label>
                <span>COMPLEXITY</span>
                <select>
                  <option>Accessible</option>
                  <option>Balanced</option>
                  <option>Technical</option>
                  <option>Maximum depth</option>
                </select>
              </label>
              <label>
                <span>BUDGET</span>
                <select>
                  <option>No strict limit</option>
                  <option>Budget conscious</option>
                  <option>Moderate investment</option>
                  <option>Competitive optimization</option>
                </select>
              </label>
            </div>
            {isCommanderFormat(format) && (
              <section className="commander-blueprint">
                <header>
                  <div>
                    <span>COMMANDER · LEGAL {format.toUpperCase()} INDEX</span>
                    <strong>
                      {selectedCommander
                        ? "Commander bound to this Blueprint"
                        : "Choose a legend—or let the Forge discover one"}
                    </strong>
                  </div>
                  {selectedCommander && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCommander(null);
                        setCommanderQuery("");
                      }}
                    >
                      Change
                    </button>
                  )}
                </header>
                {selectedCommander ? (
                  <article>
                    <img src={selectedCommander.image} alt="" />
                    <div>
                      <b>{selectedCommander.name}</b>
                      <span>{selectedCommander.typeLine}</span>
                      <em>
                        {selectedCommander.colors.length
                          ? selectedCommander.colors.join(" · ")
                          : "COLORLESS"}{" "}
                        IDENTITY
                      </em>
                    </div>
                  </article>
                ) : (
                  <div className="commander-search">
                    <div className="commander-choice">
                      <input
                        value={commanderQuery}
                        onChange={(event) =>
                          setCommanderQuery(event.target.value)
                        }
                        placeholder={`Search legal ${format} commanders…`}
                        aria-label={`Search legal ${format} commanders`}
                      />
                      <button
                        type="button"
                        disabled={randomizingCommander}
                        onClick={chooseRandomCommander}
                      >
                        {randomizingCommander
                          ? "Consulting the Archive…"
                          : "Surprise me · random commander"}
                      </button>
                    </div>
                    {(commanderSearching ||
                      commanderResults.length > 0 ||
                      commanderQuery.trim().length > 1) && (
                      <div role="listbox">
                        {commanderSearching ? (
                          <p>The Archive is searching…</p>
                        ) : commanderResults.length ? (
                          commanderResults.map((option) => (
                            <button
                              type="button"
                              role="option"
                              key={option.name}
                              onClick={() => {
                                setSelectedCommander(option);
                                setCommanderQuery(option.name);
                                setCommanderResults([]);
                              }}
                            >
                              <span>
                                {option.image ? (
                                  <img src={option.image} alt="" />
                                ) : (
                                  "◆"
                                )}
                              </span>
                              <b>
                                {option.name}
                                <small>{option.typeLine}</small>
                              </b>
                              <em>{option.colors.join("") || "C"}</em>
                            </button>
                          ))
                        ) : (
                          <p>
                            No legal {format} commander matches that search.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
            <label className="commission-note">
              <span>THE ONE THING THE FORGE MUST UNDERSTAND</span>
              <textarea
                value={commissionNote}
                onChange={(event) => setCommissionNote(event.target.value)}
                placeholder="Favorite cards, play patterns you love, or anything this deck must never become…"
              />
            </label>
            <button
              className="awaken-button"
              disabled={
                (chamber === "refine" && !deck.trim()) ||
                (isCommanderFormat(format) && !selectedCommander)
              }
              onClick={awaken}
            >
              <span>
                {isCommanderFormat(format) && !selectedCommander
                  ? "Choose a legal commander to seal the Blueprint"
                  : "Seal the commission"}
              </span>
              <strong>AWAKEN THE GREAT FORGE</strong>
              <b>→</b>
            </button>
          </div>
        </section>
      )}

      {chamber === "forging" && (
        <section className="forging-ceremony" aria-live="polite">
          <div className="furnace-core" aria-hidden="true">
            <div>
              <span>ᛟ</span>
            </div>
          </div>
          <div className="ceremony-copy">
            <span className="forge-eyebrow">
              <i /> COMMISSION ACCEPTED
            </span>
            <h1>{FORGING_STAGES[stage][0]}</h1>
            <p>{FORGING_STAGES[stage][1]}</p>
            <div className="candidate-count">
              <strong>{FORGING_STAGES[stage][2]}</strong>
              <span>
                CANDIDATE DESIGNS
                <br />
                REMAINING
              </span>
            </div>
            <div className="ceremony-progress">
              <span>
                <b style={{ width: `${progress}%` }} />
              </span>
              <small>
                FORGING STAGE {stage + 1} OF {FORGING_STAGES.length}
              </small>
            </div>
          </div>
        </section>
      )}

      {chamber === "masterworks" && (
        <section className="masterwork-reveal">
          <header>
            <span className="forge-eyebrow">
              <i /> THE GREAT FORGE ANSWERS <i />
            </span>
            <h1>
              Steel bends. Runes awaken.
              <br />
              <em>Three designs endure.</em>
            </h1>
            <p>
              The Forge honored your {format} commission and shaped three paths
              around <strong>{strategy.toLowerCase()}</strong>. Choose the one
              that feels like yours.
            </p>
          </header>
          <div className="masterwork-actions">
            <span>
              REVEAL {masterworkPage + 1} · {masterworkPage * 3 + 1}–
              {masterworkPage * 3 + visibleMasterworks.length} SEEN THIS
              COMMISSION
            </span>
            <button
              className="masterwork-recycle"
              disabled={
                randomizingCommander ||
                (masterworkPage + 1) * 3 >= masterworks.length
              }
              onClick={recycleMasterworks}
            >
              {randomizingCommander
                ? "Drawing three unseen commanders…"
                : (masterworkPage + 1) * 3 >= masterworks.length
                  ? "All unseen Masterworks revealed"
                  : randomCommission
                    ? "None feel right? Draw three new commanders →"
                    : "None feel right? Forge three different Masterworks →"}
            </button>
          </div>
          <div className="masterwork-grid">
            {visibleMasterworks.map((work, index) => {
              const poolIndex = masterworkPage * 3 + index;
              const preview = previewFor(poolIndex);
              return (
                <article
                  className={`masterwork-card ${work.tone}`}
                  key={work.name}
                  style={
                    { "--delay": `${index * 140}ms` } as React.CSSProperties
                  }
                >
                  <span>
                    MASTERWORK {String(poolIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="masterwork-title">
                    <i>{work.rune}</i>
                    <div>
                      <small>
                        {work.path} · {format}
                      </small>
                      <h2>{work.name}</h2>
                    </div>
                  </div>
                  <div className="masterwork-glimpse">
                    <img
                      src={cardImage(preview.card)}
                      alt={`${preview.card} card`}
                      loading="lazy"
                    />
                    <div>
                      <small>{preview.role}</small>
                      <strong>{preview.card}</strong>
                      <p>{preview.theme}</p>
                      <em>
                        <b>WIN CONDITION</b>
                        {preview.win}
                      </em>
                    </div>
                  </div>
                  <div className="masterwork-stats">
                    {["Aggression", "Interaction", "Synergy", "Complexity"].map(
                      (label, statIndex) => (
                        <span key={label}>
                          <small>{label}</small>
                          <b>{MASTERWORK_STATS[poolIndex][statIndex]}</b>
                        </span>
                      ),
                    )}
                  </div>
                  <p className="masterwork-verdict">{work.verdict}</p>
                  <button onClick={() => inspectMasterwork(poolIndex)}>
                    Inspect this Masterwork <b>→</b>
                  </button>
                </article>
              );
            })}
          </div>
          <footer>
            <button
              onClick={() => {
                setMasterworkPage(0);
                setChamber("entrance");
              }}
            >
              Begin a new commission
            </button>
            <span>THREE OF 642 DESIGNS SURVIVED</span>
            <button
              className="masterwork-recycle"
              disabled={
                randomizingCommander ||
                (masterworkPage + 1) * 3 >= masterworks.length
              }
              onClick={recycleMasterworks}
            >
              {randomizingCommander
                ? "Drawing three unseen commanders…"
                : (masterworkPage + 1) * 3 >= masterworks.length
                  ? "All unseen Masterworks revealed"
                  : randomCommission
                    ? "Recycle these · Draw three new commanders →"
                    : "Recycle these · Forge three new Masterworks →"}
            </button>
          </footer>
        </section>
      )}

      {chamber === "workbench" && (
        <section className="testing-anvil">
          <button
            className="back-link"
            onClick={() => setChamber("masterworks")}
          >
            ← Return to the three Masterworks
          </button>
          <header>
            <span className="forge-eyebrow">
              <i /> MASTERWORK CHOSEN · THE TESTING ANVIL
            </span>
            <h1>{chosenWork.name}</h1>
            <p>
              {chosenWork.path} · {format} · Revision{" "}
              {Math.max(1, revisions.length)}
            </p>
          </header>
          <div className="testing-layout">
            <article className="deck-manuscript">
              <header>
                <div>
                  <small>THE FORGED LIST · TYPE GALLERY</small>
                  <h2>
                    {benchStatus === "forging"
                      ? "The Forge is producing your deck…"
                      : `${deckRows.reduce((sum, row) => sum + row.quantity, 0)} cards · ${Object.keys(groupedDeck).length} sections`}
                  </h2>
                </div>
                <button
                  disabled={!deckRows.length || benchStatus === "forging"}
                  onClick={() => navigator.clipboard.writeText(forgedDeck)}
                >
                  Copy deck
                </button>
              </header>
              {benchStatus === "forging" ? (
                <pre>
                  Tempering curve, roles, interaction, and the mana lattice…
                </pre>
              ) : deckRows.length ? (
                <div className="deck-gallery">
                  <aside className="card-preview-stage">
                    <div>
                      {activeImage && (
                        <img
                          src={activeImage}
                          alt={`${activeCard} card preview`}
                        />
                      )}
                    </div>
                    <small>HOVER OR FOCUS A CARD</small>
                    <strong>{activeCard}</strong>
                    <span>
                      {activeFact?.type_line ||
                        "Card details awaken on inspection"}
                    </span>
                  </aside>
                  <div className="type-columns">
                    {[
                      "Commander",
                      "Creatures",
                      "Planeswalkers",
                      "Instants",
                      "Sorceries",
                      "Artifacts",
                      "Enchantments",
                      "Battles",
                      "Lands",
                      "Other",
                    ]
                      .filter((group) => groupedDeck[group]?.length)
                      .map((group) => (
                        <section className="type-column" key={group}>
                          <header>
                            <b>{group}</b>
                            <span>
                              {groupedDeck[group].reduce(
                                (sum, row) => sum + row.quantity,
                                0,
                              )}
                            </span>
                          </header>
                          {groupedDeck[group].map((row) => (
                            <button
                              type="button"
                              key={row.name}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  "text/plain",
                                  row.name,
                                );
                              }}
                              onMouseEnter={() => setHoveredCard(row.name)}
                              onFocus={() => setHoveredCard(row.name)}
                              className={
                                activeCard === row.name ? "active" : ""
                              }
                            >
                              <span>{row.quantity}</span>
                              <strong>{row.name}</strong>
                            </button>
                          ))}
                        </section>
                      ))}
                  </div>
                </div>
              ) : forgeGenerationError ? (
                <div className="forge-generation-failure" role="alert">
                  <small>THE METAL DID NOT SET</small>
                  <h3>No incomplete deck was saved.</h3>
                  <p>{forgeGenerationError}</p>
                  <button onClick={() => inspectMasterwork(selectedWork)}>
                    Strike the Anvil Again
                  </button>
                </div>
              ) : (
                <pre>The Forge is waiting for a valid commission.</pre>
              )}
              <details className="raw-decklist">
                <summary>View complete Forge response / import text</summary>
                <pre>{forgedDeck}</pre>
              </details>
              <footer>
                <span>
                  Featured{" "}
                  {format === "Commander" || format === "Brawl"
                    ? "commander"
                    : "lynchpin"}
                  : <b>{chosenPreview.card}</b>
                </span>
                <button
                  disabled={benchStatus === "forging" || !deckRows.length}
                  onClick={beginTesting}
                >
                  {benchStatus === "testing"
                    ? "Testing is active ✓"
                    : "Choose this deck & begin testing"}
                </button>
              </footer>
            </article>
            <aside className="testing-loop">
              <header>
                <small>THE FORGE LEARNS WITH YOU</small>
                <h2>Test. Signal. Reforge.</h2>
                <p>
                  One match is a signal—not proof. Tell the Forge what felt
                  strong, awkward, missing, or simply unlike you.
                </p>
              </header>
              <div className="test-record">
                <button onClick={() => recordMatch("win")}>
                  Record a win <b>{record.wins}</b>
                </button>
                <button onClick={() => recordMatch("loss")}>
                  Record a loss <b>{record.losses}</b>
                </button>
              </div>
              <label>
                <span>WHAT WORKED OR FELT WRONG?</span>
                <textarea
                  value={playerSignal}
                  onChange={(event) => setPlayerSignal(event.target.value)}
                  placeholder="Example: I keep running out of threats after the first board wipe, but the early pressure feels exactly right…"
                />
              </label>
              <button
                className="consult-forge"
                disabled={!playerSignal.trim() || benchStatus === "thinking"}
                onClick={consultForge}
              >
                {benchStatus === "thinking"
                  ? "The Forge is studying your signal…"
                  : "Ask the Forge for alternatives →"}
              </button>
              {forgeReply && (
                <section className="forge-refinement">
                  <small>REFINEMENT OPTIONS · FORGE THEORY</small>
                  <pre>{forgeReply}</pre>
                  <button onClick={preserveRevision}>
                    Preserve as revision {revisions.length + 1}
                  </button>
                </section>
              )}
              <footer>
                <b>{revisions.length || 1}</b>
                <span>
                  REVISION{revisions.length === 1 ? "" : "S"} PRESERVED ·
                  PRIVATE BENCH SYNC
                </span>
              </footer>
            </aside>
          </div>
        </section>
      )}
      {chamber !== "forging" && (
        <aside
          className={`bench-dock ${benchOpen ? "open" : ""}`}
          aria-label="Your Masterwork Bench"
        >
          <div className="bench-tray" aria-hidden={!benchOpen}>
            <header>
              <div>
                <small>THE PRIVATE BENCH</small>
                <strong>Your preserved Masterworks</strong>
              </div>
              <button
                onClick={() => setBenchOpen(false)}
                aria-label="Collapse deck bench"
              >
                Close
              </button>
            </header>
            {savedMasterworks.length ? (
              <div className="bench-decks">
                {savedMasterworks.slice(0, 10).map((family) => {
                  const evidence =
                    family.record || family.revisions.at(-1)?.evidence || {};
                  return (
                    <button
                      key={family.id}
                      className={family.id === deckId ? "active" : ""}
                      onClick={() => {
                        openSavedMasterwork(family);
                        setBenchOpen(false);
                      }}
                    >
                      <span>
                        {family.commander?.image ? (
                          <img src={family.commander.image} alt="" />
                        ) : (
                          <i>ᛞ</i>
                        )}
                      </span>
                      <b>{family.name}</b>
                      <small>{family.commander?.name || family.format}</small>
                      <em>
                        {Number(evidence.wins || 0)}W ·{" "}
                        {Number(evidence.losses || 0)}L
                      </em>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="empty-bench">
                Your first completed Masterwork will appear here.
              </p>
            )}
            <footer>
              <button onClick={showFullArchive}>View full Archive</button>
              <button className="new-forge" onClick={startNewForge}>
                ＋ Start a New Forge
              </button>
            </footer>
          </div>
          <div className="bench-handle">
            <button
              className="bench-toggle"
              onClick={() => setBenchOpen((value) => !value)}
              aria-expanded={benchOpen}
            >
              <i>ᛞ</i>
              <span>
                <small>YOUR BENCH</small>
                <b>
                  {savedMasterworks.length
                    ? `${savedMasterworks.length} Masterwork${savedMasterworks.length === 1 ? "" : "s"} preserved`
                    : "Ready for your first Masterwork"}
                </b>
              </span>
              <em>{benchOpen ? "Lower the Bench" : "Raise the Bench"}</em>
            </button>
          {savedMasterworks[0]?.commander?.image && (
            <img src={savedMasterworks[0].commander?.image} alt="" />
          )}
        </div>
      </aside>
      )}
      {chamber === "workbench" && deckRows.length > 0 && (
        <section
          className={`forge-edit-workbench ${editAnvilOpen ? "open" : ""}`}
          style={
            editAnvilOpen
              ? undefined
              : { transform: "translateX(calc(100% - 42px))" }
          }
        >
          <button
            className="edit-anvil-toggle"
            onClick={() => setEditAnvilOpen((open) => !open)}
            aria-expanded={editAnvilOpen}
          >
            <i>⚒</i>
            {editAnvilOpen ? "Lower Editing Anvil" : "Raise Editing Anvil"}
          </button>
          <header>
            <div>
              <small>THE EDITING ANVIL</small>
              <h2>Shape the list with your own hands.</h2>
              <p>
                Drag a deck card into Considering or Quench it completely.
                Search the legal card archive to stage replacements.
              </p>
            </div>
            <span>
              {deckRows.reduce((sum, row) => sum + row.quantity, 0)} CARDS NOW
            </span>
          </header>
          <div className="edit-anvil-grid">
            <section className="card-finder">
              <label>
                <span>SEARCH LEGAL {format.toUpperCase()} CARDS</span>
                <input
                  value={cardSearch}
                  onChange={(event) => setCardSearch(event.target.value)}
                  placeholder="Try Opt, Lightning Bolt, Sol Ring…"
                />
              </label>
              {cardSearchResults.length > 0 && (
                <div>
                  {cardSearchResults.map((card) => (
                    <article key={card.name}>
                      {card.image ? <img src={card.image} alt="" /> : <i>◆</i>}
                      <span>
                        <b>{card.name}</b>
                        <small>{card.typeLine}</small>
                      </span>
                      <button
                        onClick={() =>
                          setConsideringCards((current) => [
                            ...current.filter(
                              (item) => item.name !== card.name,
                            ),
                            { quantity: 1, name: card.name },
                          ])
                        }
                      >
                        Consider
                      </button>
                      <button
                        onClick={() =>
                          addCardToDeck({ quantity: 1, name: card.name })
                        }
                      >
                        Add
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section
              className="drop-pool considering-pool"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                stageDeckCard(
                  event.dataTransfer.getData("text/plain"),
                  "consider",
                );
              }}
            >
              <header>
                <span>◇</span>
                <div>
                  <small>CONSIDERING</small>
                  <b>Possible cuts and replacements</b>
                </div>
              </header>
              {consideringCards.length ? (
                consideringCards.map((card) => (
                  <article key={card.name}>
                    <span>{card.quantity}</span>
                    <b>{card.name}</b>
                    <button
                      onClick={() =>
                        addCardToDeck(card, "Restored from consideration")
                      }
                    >
                      Add to deck
                    </button>
                    <button
                      onClick={() =>
                        setConsideringCards((current) =>
                          current.filter((item) => item.name !== card.name),
                        )
                      }
                    >
                      Dismiss
                    </button>
                  </article>
                ))
              ) : (
                <p>Drag a deck card here, or stage one from search.</p>
              )}
            </section>
            <section
              className="drop-pool remove-pool"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                stageDeckCard(
                  event.dataTransfer.getData("text/plain"),
                  "remove",
                );
              }}
            >
              <header>
                <span>×</span>
                <div>
                  <small>THE QUENCH</small>
                  <b>Removed from this revision</b>
                </div>
              </header>
              {removedCards.length ? (
                removedCards.map((card) => (
                  <article key={card.name}>
                    <span>{card.quantity}</span>
                    <b>{card.name}</b>
                    <button
                      onClick={() => {
                        addCardToDeck(card, "Restored from the Quench");
                        setRemovedCards((current) =>
                          current.filter((item) => item.name !== card.name),
                        );
                      }}
                    >
                      Undo
                    </button>
                  </article>
                ))
              ) : (
                <p>
                  Drop a card here to remove it. The change remains reversible.
                </p>
              )}
            </section>
          </div>
        </section>
      )}
      {chamber === "workbench" &&
        (replacementLoading ||
          replacementRecommendations.length > 0 ||
          lastCutCard) && (
          <section className="forge-replacements">
            <header>
              <div>
                <small>THE FORGE ANSWERS THE CUT</small>
                <h2>
                  {replacementLoading
                    ? `Studying what ${lastCutCard} was doing…`
                    : replacementRecommendations.length
                      ? `Three paths can fill ${lastCutCard}'s place.`
                      : `Search the Archive for ${lastCutCard}'s successor.`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setLastCutCard("");
                  setReplacementRecommendations([]);
                }}
              >
                Dismiss
              </button>
            </header>
            {replacementLoading ? (
              <div className="replacement-thinking">
                <i />
                <span>
                  The Forge is comparing role, curve, synergy, and legality.
                </span>
              </div>
            ) : replacementRecommendations.length > 0 ? (
              <div className="replacement-grid">
                {replacementRecommendations.map((card, index) => (
                  <article
                    key={card.name}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/x-metaforge-card",
                        card.name,
                      );
                      event.dataTransfer.setData("text/plain", card.name);
                    }}
                  >
                    <span>
                      {card.image ? <img src={card.image} alt="" /> : <i>◆</i>}
                      <em>FORGE OPTION {index + 1}</em>
                    </span>
                    <div>
                      <b>{card.name}</b>
                      <small>{card.typeLine}</small>
                      <p>
                        Drag this option into the deck, or add it immediately.
                      </p>
                      <button
                        onClick={() =>
                          addCardToDeck(
                            { quantity: 1, name: card.name },
                            `Forge replacement for ${lastCutCard}`,
                          )
                        }
                      >
                        Add to deck
                      </button>
                    </div>
                  </article>
                ))}
                <aside
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const name = event.dataTransfer.getData(
                      "application/x-metaforge-card",
                    );
                    if (name)
                      addCardToDeck(
                        { quantity: 1, name },
                        `Forge replacement for ${lastCutCard}`,
                      );
                  }}
                >
                  <i>＋</i>
                  <b>DROP INTO THE DECK</b>
                  <span>The candidate becomes part of this revision.</span>
                </aside>
              </div>
            ) : (
              <p className="replacement-empty">
                The Forge did not force a weak suggestion. Use the legal card
                search above to choose the replacement yourself.
              </p>
            )}
          </section>
        )}
    </main>
  );
}
