// =============================================================================
// Knowledge — Strategic Knowledge Retriever (Epic 5)
// =============================================================================
// Query inspectable knowledge from Epics 1–4. Observation only.
// Does not mutate Brain. Does not invent answers when evidence is thin.
// writesToBrain: false
// =============================================================================

import { buildCanonicalCardIntelligence } from "./canonical-card-intelligence.mjs";
import { buildEliteTournamentIntelligenceFromFixtures } from "./elite-tournament-intelligence.mjs";
import { buildStrategicSubstitutionIntelligenceFromFixtures } from "./strategic-substitution-intelligence.mjs";
import { buildExpertStrategyCorpusFromFixtures } from "./expert-strategy-corpus.mjs";

const freeze = (value) => Object.freeze(value);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function unknown(reason, query) {
  return freeze({
    writesToBrain: false,
    ok: false,
    unknown: true,
    reason,
    query,
    note: "Unknown is not absent — incomplete evidence must not be rendered as strategic absence.",
  });
}

/**
 * Load a knowledge snapshot for retrieval. Fixtures by default (deterministic).
 * Callers may inject prebuilt intel for tests.
 */
export function loadKnowledgeSnapshot(options = {}) {
  if (options.snapshot) return options.snapshot;
  const cardExamples = (options.cardExamples || [
    {
      name: "Doubling Season",
      typeLine: "Enchantment",
      oracleText:
        "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.",
    },
    {
      name: "Atraxa, Praetors' Voice",
      typeLine: "Legendary Creature — Phyrexian Angel Horror",
      oracleText:
        "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.",
    },
    {
      name: "Sol Ring",
      typeLine: "Artifact",
      oracleText: "{T}: Add {C}{C}.",
    },
  ]).map((card) => buildCanonicalCardIntelligence({ card }));

  return freeze({
    writesToBrain: false,
    version: "strategic-knowledge-snapshot-v1",
    epic1Cards: freeze(cardExamples),
    epic2: options.epic2 || buildEliteTournamentIntelligenceFromFixtures(),
    epic3: options.epic3 || buildStrategicSubstitutionIntelligenceFromFixtures(),
    epic4: options.epic4 || buildExpertStrategyCorpusFromFixtures(),
  });
}

export function retrieveCardKnowledge(query = {}, snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot({ epic2: { commanderProfiles: [] }, epic3: { seatFamilies: [] }, epic4: { candidates: [] } });
  const name = query.name || query.card || query.q;
  if (!name) return unknown("missing_card_name", query);

  const needle = normalized(name);
  const fromSnap = (snap.epic1Cards || []).find((card) =>
    normalized(card.identity?.canonicalName || card.identity?.inputName || "") === needle
    || normalized(card.identity?.inputName || "") === needle,
  );
  if (fromSnap) {
    return freeze({
      writesToBrain: false,
      ok: true,
      kind: "card_intelligence",
      query: { name },
      card: fromSnap,
      confidence: fromSnap.completeness?.band || "observed",
    });
  }

  // On-demand build when not in snapshot examples (still observation-only).
  if (query.card || query.typeLine || query.oracleText) {
    const built = buildCanonicalCardIntelligence({
      card: {
        name: query.name || query.card,
        typeLine: query.typeLine || "",
        oracleText: query.oracleText || "",
      },
    });
    return freeze({
      writesToBrain: false,
      ok: true,
      kind: "card_intelligence",
      query: { name },
      card: built,
      confidence: built.completeness?.band || "observed",
      note: "Built on demand from provided oracle text — not a Brain recommendation.",
    });
  }

  return unknown("card_not_in_snapshot_and_no_oracle_provided", query);
}

export function retrieveCommanderProfile(query = {}, snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot();
  const name = query.commander || query.name || query.q;
  if (!name) return unknown("missing_commander", query);
  const needle = normalized(name);
  const profiles = snap.epic2?.commanderProfiles || [];
  const hit = profiles.find((profile) => normalized(profile.commanderIdentity) === needle
    || normalized(profile.commanderIdentity).includes(needle));
  if (!hit) return unknown("commander_profile_not_found", query);
  return freeze({
    writesToBrain: false,
    ok: true,
    kind: "commander_profile",
    query: { commander: name },
    profile: hit,
    confidence: hit.confidence?.level || "observed",
  });
}

export function retrieveSubstitutionSeat(query = {}, snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot();
  const commander = query.commander || null;
  const card = query.card || query.name || null;
  const families = snap.epic3?.seatFamilies || [];
  let hits = families;
  if (commander) {
    const needle = normalized(commander);
    hits = hits.filter((family) => normalized(family.commanderIdentity).includes(needle));
  }
  if (card) {
    const needle = normalized(card);
    hits = hits.filter((family) =>
      (family.members || []).some((member) => normalized(member.name).includes(needle)));
  }
  if (!hits.length) return unknown("substitution_seat_not_found", query);
  return freeze({
    writesToBrain: false,
    ok: true,
    kind: "substitution_seats",
    query: { commander, card },
    families: freeze(hits.slice(0, 8)),
    whenNot: freeze(
      (snap.epic3?.whenNotToSubstitute || [])
        .filter((row) => {
          if (commander && !normalized(row.commanderIdentity).includes(normalized(commander))) return false;
          if (card) {
            const needle = normalized(card);
            if (![normalized(row.cardA), normalized(row.cardB)].some((name) => name.includes(needle))) return false;
          }
          return true;
        })
        .slice(0, 8),
    ),
  });
}

export function retrieveDecisionConcepts(query = {}, snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot();
  const concept = query.concept || query.id || query.q || null;
  const candidates = snap.epic4?.candidates || [];
  const rejects = snap.epic4?.rejects || [];
  if (!concept) {
    return freeze({
      writesToBrain: false,
      ok: true,
      kind: "decision_concepts",
      query: {},
      candidates,
      rejects: freeze(rejects.slice(0, 12)),
      activated: false,
      promoted: false,
    });
  }
  const needle = normalized(concept);
  const hit = candidates.find((row) =>
    normalized(row.conceptId) === needle || normalized(row.label).includes(needle));
  if (hit) {
    return freeze({
      writesToBrain: false,
      ok: true,
      kind: "decision_concept",
      query: { concept },
      candidate: hit,
      activated: false,
      promoted: false,
    });
  }
  const rejected = rejects.find((row) =>
    normalized(row.conceptId) === needle || normalized(row.label).includes(needle));
  if (rejected) {
    return freeze({
      writesToBrain: false,
      ok: true,
      kind: "decision_concept_reject",
      query: { concept },
      reject: rejected,
      note: "Present in Archive as reject — not a promoted concept.",
    });
  }
  return unknown("decision_concept_not_found", query);
}

/**
 * Lightweight router for natural-ish query objects.
 */
export function retrieveStrategicKnowledge(query = {}, snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot();
  const kind = normalized(query.kind || query.type || "");

  if (kind === "card" || query.card || (query.name && query.oracleText)) {
    return retrieveCardKnowledge(query, snap);
  }
  if (kind === "commander" || query.commander) {
    return retrieveCommanderProfile(query, snap);
  }
  if (kind === "substitution" || kind === "seat" || query.seat || (query.card && query.commander)) {
    return retrieveSubstitutionSeat(query, snap);
  }
  if (kind === "concept" || kind === "decision" || query.concept) {
    return retrieveDecisionConcepts(query, snap);
  }

  // Fallback: try commander name against profiles, else card name against epic1.
  if (query.q || query.name) {
    const commanderHit = retrieveCommanderProfile({ commander: query.q || query.name }, snap);
    if (commanderHit.ok) return commanderHit;
    const cardHit = retrieveCardKnowledge({ name: query.q || query.name }, snap);
    if (cardHit.ok) return cardHit;
    const conceptHit = retrieveDecisionConcepts({ concept: query.q || query.name }, snap);
    if (conceptHit.ok) return conceptHit;
  }

  return unknown("unrecognized_query", query);
}

export function summarizeRetrieverCoverage(snapshot = null) {
  const snap = snapshot || loadKnowledgeSnapshot();
  return freeze({
    writesToBrain: false,
    epic1Cards: (snap.epic1Cards || []).length,
    commanderProfiles: (snap.epic2?.commanderProfiles || []).length,
    seatFamilies: (snap.epic3?.seatFamilies || []).length,
    whenNotToSubstitute: (snap.epic3?.whenNotToSubstitute || []).length,
    decisionCandidates: (snap.epic4?.candidates || []).length,
    decisionRejects: (snap.epic4?.rejects || []).length,
    brainChanges: 0,
  });
}
