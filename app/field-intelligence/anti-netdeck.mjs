// =============================================================================
// Field Intelligence — Anti-netdeck safeguards
// =============================================================================
// Corpus must not copy modal 99s, boost popularity over structure, or punish novelty.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Score a candidate card for a slot using structure first, corpus frequency last.
 */
export function scoreCandidateAgainstCorpusPrior({
  structuralFit = 0,
  semanticSupport = 0,
  packageLegFill = 0,
  commanderConnection = 0,
  corpusFrequency = 0,
  popularityShare = 0,
  novelty = 0,
} = {}) {
  const structural = (
    clamp(structuralFit) * 0.34
    + clamp(semanticSupport) * 0.28
    + clamp(packageLegFill) * 0.22
    + clamp(commanderConnection) * 0.16
  );
  const popularityTerm = Math.min(0.12, clamp(corpusFrequency) * 0.08 + clamp(popularityShare) * 0.04);
  // Novelty is not punished; tiny exploration credit when structure is strong.
  const noveltyCredit = structural >= 0.6 ? clamp(novelty) * 0.05 : 0;
  return freeze({
    structuralScore: round(structural),
    popularityTerm: round(popularityTerm),
    noveltyCredit: round(noveltyCredit),
    total: round(structural + popularityTerm + noveltyCredit),
    popularityCannotDominate: popularityTerm < structural || structural >= 0.55,
  });
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

/**
 * Prove unusual coherent candidates can beat popular corpus cards.
 */
export function assertStructuralBeatsPopular(options = {}) {
  const popular = scoreCandidateAgainstCorpusPrior({
    structuralFit: options.popularStructuralFit ?? 0.25,
    semanticSupport: options.popularSemanticSupport ?? 0.2,
    packageLegFill: options.popularPackageLegFill ?? 0.15,
    commanderConnection: options.popularCommanderConnection ?? 0.1,
    corpusFrequency: options.popularFrequency ?? 0.95,
    popularityShare: options.popularShare ?? 0.8,
    novelty: 0,
  });
  const novel = scoreCandidateAgainstCorpusPrior({
    structuralFit: options.novelStructuralFit ?? 0.85,
    semanticSupport: options.novelSemanticSupport ?? 0.8,
    packageLegFill: options.novelPackageLegFill ?? 0.75,
    commanderConnection: options.novelCommanderConnection ?? 0.7,
    corpusFrequency: options.novelFrequency ?? 0.02,
    popularityShare: options.novelShare ?? 0.01,
    novelty: 0.9,
  });
  return freeze({
    popular,
    novel,
    novelWins: novel.total > popular.total,
    safeguards: freeze([
      "no_modal_99_copy",
      "no_automatic_popular_card_preference",
      "no_novelty_penalty_for_coherent_plans",
      "commander_popularity_does_not_dominate_strategy",
      "structure_outranks_frequency",
    ]),
  });
}

export function antiNetdeckPolicy() {
  return freeze({
    version: "anti-netdeck-v1",
    forbidden: freeze([
      "copy_modal_99",
      "prefer_card_solely_for_corpus_frequency",
      "collapse_unusual_coherent_plans",
      "penalize_novelty_for_low_frequency_alone",
      "let_commander_popularity_dominate_strategic_evidence",
    ]),
    required: freeze([
      "prefer_structural_principles",
      "keep_card_frequency_as_weak_secondary_feature",
      "preserve_novel_coherent_construction",
      "separate_evidence_claim_types",
    ]),
  });
}
