// =============================================================================
// Knowledge — Expert Strategy Corpus / Stream 002 (Epic 4)
// =============================================================================
// Extract recurring strategic decision concepts from expert-authored reasoning.
// Observation only. Naming is not promotion. Admission may be zero.
// writesToBrain: false · activated: false · promoted: false
// =============================================================================

const freeze = (value) => Object.freeze(value);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

/**
 * Tiny fixture corpus — independent "expert" voices for deterministic observation.
 * These are Academy fixtures (teaching-pattern reconstructions), not scraped articles.
 * Real live ingestion stays a later authorization; fixtures prove the pipeline.
 */
export const FIXTURE_EXPERT_REASONING_CORPUS = freeze([
  freeze({
    id: "fixture-hof-sequencing-01",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "coaching_writeup",
    title: "Why the second land drop decides the pod",
    excerpt:
      "I keep losing to people who sequence better, not people with more expensive cards. "
      + "Early ramp is only good if it advances your primary plan. Opportunity cost matters: "
      + "the wrong rock can cost a full turn of interaction. Threat assessment starts before turn three.",
  }),
  freeze({
    id: "fixture-pro-tempo-02",
    authorKey: "expert_b_pro",
    independenceGroup: "voice_b",
    sourceType: "tournament_report",
    title: "Top 4 notes: trading tempo for inevitability",
    excerpt:
      "We won games by refusing to race when the table had better inevitability. "
      + "Tempo buys turns; redundancy buys the second try. Role assignment at the table "
      + "matters more than the modal 99 — sometimes you are the police, not the combo seat.",
  }),
  freeze({
    id: "fixture-coach-redundancy-03",
    authorKey: "expert_c_coach",
    independenceGroup: "voice_c",
    sourceType: "feature_match_commentary",
    title: "Package completeness vs shiny singletons",
    excerpt:
      "Singleton bombs without redundancy fail under interaction. Sequencing the engine "
      + "before the payoff is basic, but players still cast the finisher first. "
      + "Opportunity cost shows up again: every tutor for a pet card is a missed piece of interaction.",
  }),
  freeze({
    id: "fixture-hof-permission-04",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "interview",
    title: "How much permission is enough?",
    excerpt:
      "Threat assessment is the skill. Interaction density is the tool. "
      + "I do not count counters for comfort — I count answers that stop the actual winning line. "
      + "Risk is asymmetrical: dying to the known combo is worse than looking 'soft' for one turn.",
  }),
  freeze({
    id: "fixture-analyst-mana-05",
    authorKey: "expert_d_analyst",
    independenceGroup: "voice_d",
    sourceType: "article",
    title: "Mana as a sequencing problem",
    excerpt:
      "Ramp timing is sequencing. Cast the rock that enables the plan this turn, not the "
      + "highest ceiling rock. Inevitability decks can afford slower mana; tempo decks cannot. "
      + "Role assignment flips mid-game when someone else becomes the table threat.",
  }),
  freeze({
    id: "fixture-lonely-pet-06",
    authorKey: "expert_e_lonely",
    independenceGroup: "voice_e",
    sourceType: "blog",
    title: "Why I always run my pet enchantment",
    excerpt:
      "Flavor wins games for me. I play the card because it is cool. "
      + "No strategic frame required — vibes are the strategy.",
  }),
]);

/**
 * Player-language concept detectors. Only fire when the excerpt earns the phrase.
 * Completeness is not a goal — these are observation hooks, not an ontology.
 */
export const DECISION_CONCEPT_DETECTORS = freeze([
  freeze({ id: "tempo", label: "tempo", patterns: [/\btempo\b/i] }),
  freeze({ id: "inevitability", label: "inevitability", patterns: [/\binevitability\b/i] }),
  freeze({ id: "redundancy", label: "redundancy", patterns: [/\bredundan(?:cy|t)\b/i] }),
  freeze({ id: "threat_assessment", label: "threat assessment", patterns: [/\bthreat assessment\b/i] }),
  freeze({ id: "sequencing", label: "sequencing", patterns: [/\bsequenc(?:e|ing|es)\b/i] }),
  freeze({ id: "role_assignment", label: "role assignment", patterns: [/\brole assignment\b/i, /\bpolice\b.*\bcombo\b/i] }),
  freeze({ id: "risk", label: "risk", patterns: [/\brisk\b/i] }),
  freeze({ id: "opportunity_cost", label: "opportunity cost", patterns: [/\bopportunity cost\b/i] }),
  freeze({ id: "interaction_density", label: "interaction density", patterns: [/\binteraction density\b/i, /\bpermission\b/i] }),
  freeze({ id: "package_completeness", label: "package completeness", patterns: [/\bpackage completeness\b/i, /\bredundancy buys\b/i] }),
]);

export function extractDecisionConceptsFromExcerpt(source = {}) {
  const text = source.excerpt || "";
  const hits = [];
  for (const detector of DECISION_CONCEPT_DETECTORS) {
    const matched = detector.patterns.some((pattern) => pattern.test(text));
    if (!matched) continue;
    hits.push(freeze({
      conceptId: detector.id,
      label: detector.label,
      evidenceSpan: detector.patterns.find((pattern) => pattern.test(text))?.source || detector.label,
    }));
  }
  return freeze({
    writesToBrain: false,
    sourceId: source.id || null,
    authorKey: source.authorKey || null,
    independenceGroup: source.independenceGroup || source.authorKey || null,
    sourceType: source.sourceType || null,
    title: source.title || null,
    concepts: freeze(hits),
    emptyReason: hits.length ? null : "no_decision_concept_detected",
  });
}

/**
 * Replication rule: ≥2 independent experts (distinct independenceGroup) before candidate.
 */
export function replicateDecisionConcepts(extractions = [], options = {}) {
  const minIndependent = options.minIndependentExperts || 2;
  const byConcept = new Map();

  for (const extraction of extractions) {
    for (const hit of extraction.concepts || []) {
      const bucket = byConcept.get(hit.conceptId) || {
        conceptId: hit.conceptId,
        label: hit.label,
        voices: new Set(),
        authors: new Set(),
        sources: [],
      };
      bucket.voices.add(extraction.independenceGroup || extraction.authorKey);
      bucket.authors.add(extraction.authorKey);
      bucket.sources.push(freeze({
        sourceId: extraction.sourceId,
        authorKey: extraction.authorKey,
        title: extraction.title,
      }));
      byConcept.set(hit.conceptId, bucket);
    }
  }

  const candidates = [];
  const rejects = [];
  for (const bucket of byConcept.values()) {
    const independentExperts = bucket.voices.size;
    const record = freeze({
      writesToBrain: false,
      activated: false,
      promoted: false,
      conceptId: bucket.conceptId,
      label: bucket.label,
      independentExperts,
      authors: freeze([...bucket.authors].sort()),
      sources: freeze(bucket.sources),
      namingIsNotPromotion: true,
    });
    if (independentExperts >= minIndependent) {
      candidates.push(record);
    } else {
      rejects.push(freeze({
        ...record,
        rejectReason: "insufficient_independent_replication",
        note: "Single-expert (or single-voice) concept — recorded, not admitted as candidate.",
      }));
    }
  }

  return freeze({
    writesToBrain: false,
    activated: false,
    promoted: false,
    candidates: freeze(candidates.sort((a, b) =>
      b.independentExperts - a.independentExperts || a.conceptId.localeCompare(b.conceptId))),
    rejects: freeze(rejects.sort((a, b) => a.conceptId.localeCompare(b.conceptId))),
  });
}

export function findConceptContradictions(extractions = []) {
  // Soft contradictions: same author advances opposing frames in one corpus slice.
  // Fixtures keep this honest and rare — observation hook for Archive.
  const byAuthor = new Map();
  for (const extraction of extractions) {
    const key = extraction.authorKey || "unknown";
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key).push(extraction);
  }
  const contradictions = [];
  for (const [authorKey, rows] of byAuthor) {
    const concepts = new Set(rows.flatMap((row) => (row.concepts || []).map((c) => c.conceptId)));
    if (concepts.has("tempo") && concepts.has("inevitability") && rows.length >= 2) {
      // Not inherently contradictory — flag as context-sensitive tension for Archive.
      contradictions.push(freeze({
        writesToBrain: false,
        kind: "context_tension",
        authorKey,
        concepts: freeze(["tempo", "inevitability"]),
        note: "Same expert discusses tempo and inevitability across sources — context decides priority; not a Brain rule.",
      }));
    }
  }
  return freeze(contradictions);
}

/**
 * Full Epic 4 / Stream 002 observation artifact.
 */
export function buildExpertStrategyCorpusIntelligence({
  sources = FIXTURE_EXPERT_REASONING_CORPUS,
  label = "expert-strategy-corpus",
} = {}) {
  const extractions = freeze(sources.map((source) => extractDecisionConceptsFromExcerpt(source)));
  const replication = replicateDecisionConcepts(extractions);
  const contradictions = findConceptContradictions(extractions);
  const emptySources = extractions.filter((row) => row.emptyReason);

  return freeze({
    writesToBrain: false,
    activated: false,
    promoted: false,
    version: "expert-strategy-corpus-v1",
    stream: "academy-evidence-stream-002",
    label,
    brainChanges: 0,
    falsifiableQuestion:
      "Can we reliably extract recurring strategic decision concepts from expert-authored explanations that replicate across independent experts?",
    corpus: freeze({
      sources: sources.length,
      independentVoices: new Set(sources.map((s) => s.independenceGroup || s.authorKey)).size,
      sourceTypes: freeze([...new Set(sources.map((s) => s.sourceType))].sort()),
      emptyExtracted: emptySources.length,
    }),
    extractions,
    candidates: replication.candidates,
    rejects: replication.rejects,
    contradictions,
    archiveNote: freeze({
      admissionMayBeZero: true,
      namingIsNotPromotion: true,
      completenessIsNotAGoal: true,
    }),
    outcome: freeze({
      // Successful Academy result can be Yes (candidates) or honest No (zero admission).
      replicatedConcepts: replication.candidates.length,
      rejectedConcepts: replication.rejects.length,
      answer: replication.candidates.length > 0 ? "yes_candidates_only" : "no_honest_zero_admission",
    }),
  });
}

export function buildExpertStrategyCorpusFromFixtures() {
  return buildExpertStrategyCorpusIntelligence({
    sources: FIXTURE_EXPERT_REASONING_CORPUS,
    label: "stream-002-fixtures",
  });
}
