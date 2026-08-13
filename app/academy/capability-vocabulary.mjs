// =============================================================================
// Academy — Age of Vocabulary / Coverage Observation 001
// Candidate capability vocabulary (NOT admitted Atlas truth)
// =============================================================================
// writesToBrain: false. Naming is not promotion. Elegance is not evidence.
// Capability ≠ static card role.
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Smallest candidate vocabulary justified by Proxy Decomposition residuals
 * + existing contextual functions. These are labels under test — not truths.
 */
export const CANDIDATE_CAPABILITIES = freeze([
  freeze({
    id: "cap:commander_protection",
    label: "Commander Protection",
    family: "protection",
    definition: "Ability to keep the commander alive or untargetable long enough for plan execution.",
    semanticEvidence: ["protects_commander edges", "contextual commander_protection", "protection roles on commander-connected nodes"],
    inclusion: "Strong protects_commander edge OR contextual function commander_protection OR (protection role + commanderConnected).",
    exclusion: "Generic interaction without commander connection. Static 'protection' role alone is insufficient.",
    positiveExamples: ["Lightning Greaves in commander-connected topology", "Flawless Maneuver with protects_commander"],
    counterexamples: ["Generic Counterspell with no commander edge", "Fog with no commander connection"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:engine_protection",
    label: "Engine Protection",
    family: "protection",
    definition: "Ability to preserve a value/combo engine under disruption.",
    semanticEvidence: ["protects_engine", "contextual engine_protection"],
    inclusion: "Strong protects_engine edge OR contextual engine_protection.",
    exclusion: "Commander protection only; raw interaction count.",
    positiveExamples: ["Silence protecting a combo engine sequence"],
    counterexamples: ["Removal with no engine edge"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:close_protection",
    label: "Closing Sequence Protection",
    family: "protection",
    definition: "Ability to protect the path from conversion to close.",
    semanticEvidence: ["protects_combo_or_close", "contextual combo_protection", "winSequenceProtectionCoverage"],
    inclusion: "protects_combo_or_close OR combo_protection contextual function.",
    exclusion: "Early-game interaction only.",
    positiveExamples: ["Grand Abolisher on close turn"],
    counterexamples: ["Early spot removal"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:plan_recovery",
    label: "Plan Recovery",
    family: "recovery",
    definition: "Ability to re-occupy a vacated plan seat or restore a disrupted line.",
    semanticEvidence: ["recovers edges", "recovery plan-graph kind", "sequence stage recover"],
    inclusion: "recovery kind node OR recovers edge OR recover stage with plan connection.",
    exclusion: "Any recursion role without plan/recover context.",
    positiveExamples: ["Eternal Witness recovering a removed engine piece"],
    counterexamples: ["Regrowth with no recover edge / stage"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:resource_recovery",
    label: "Resource Recovery",
    family: "recovery",
    definition: "Ability to refill cards/mana after attrition.",
    semanticEvidence: ["draw+recover stages", "recursion into hand/board"],
    inclusion: "draw/selection with recover stage OR recursion into plan pathway.",
    exclusion: "Raw draw role alone.",
    positiveExamples: ["Timetwister-style refill in recover pathway"],
    counterexamples: ["Cantrip with setup-only stage"],
    ambiguity: "high",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:path_clearing",
    label: "Path Clearing",
    family: "disruption",
    definition: "Ability to clear hate/blockers so a win line can resolve.",
    semanticEvidence: ["clears_path_for", "path_clear_for_win"],
    inclusion: "clears_path_for edge OR path_clear_for_win contextual function.",
    exclusion: "Generic removal role without path/close context.",
    positiveExamples: ["Silence clearing stack path for combo"],
    counterexamples: ["Swords to Plowshares with no clears_path_for edge"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:plan_disruption",
    label: "Plan-Preserving Disruption",
    family: "disruption",
    definition: "Interaction that protects own plan timing rather than raw answer density.",
    semanticEvidence: ["disrupts_for", "plan_preserving_disruption"],
    inclusion: "disrupts_for edge OR plan_preserving_disruption function.",
    exclusion: "interaction role alone.",
    positiveExamples: ["Force of Will protecting own commit window"],
    counterexamples: ["Generic Doom Blade"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:selection_access",
    label: "Selection / Access",
    family: "information",
    definition: "Ability to find or assemble plan pieces (tutors/selection in plan context).",
    semanticEvidence: ["tutors_for", "tutor_for_plan_piece", "tutor/selection kinds"],
    inclusion: "tutors_for edge OR tutor plan kind OR tutor_for_plan_piece.",
    exclusion: "draw role alone; selection without tutor/plan context is weak.",
    positiveExamples: ["Demonic Tutor fetching win piece"],
    counterexamples: ["Brainstorm as pure cantrip with no tutor edge"],
    ambiguity: "open",
    writesToBrain: false,
  }),
  freeze({
    id: "cap:strategic_flexibility",
    label: "Strategic Flexibility",
    family: "flexibility",
    definition: "A card occupies multiple distinct strategic seats/capabilities in context — not merely many tags.",
    semanticEvidence: ["multifunction plan nodes with planConnected", "≥2 distinct contextual functions across contexts"],
    inclusion: "plan-connected multifunction node OR card with ≥2 distinct contextual functions in THIS deck's topology.",
    exclusion: "Many static roles/tags without plan connection. Multifunction flag alone without constructive+wired evidence.",
    positiveExamples: ["Multifunction interaction that also protects/recovers"],
    counterexamples: ["Card with 5 role tags but isolated / no edges"],
    ambiguity: "high — must survive quality/ix controls",
    writesToBrain: false,
  }),
]);

export const CANDIDATE_SEATS = freeze([
  freeze({ id: "seat:protect_commander", capabilityId: "cap:commander_protection", label: "Protect Commander" }),
  freeze({ id: "seat:protect_engine", capabilityId: "cap:engine_protection", label: "Protect Engine" }),
  freeze({ id: "seat:protect_close", capabilityId: "cap:close_protection", label: "Protect Closing Sequence" }),
  freeze({ id: "seat:recover_plan", capabilityId: "cap:plan_recovery", label: "Recover Plan" }),
  freeze({ id: "seat:recover_resources", capabilityId: "cap:resource_recovery", label: "Recover Resources" }),
  freeze({ id: "seat:clear_path", capabilityId: "cap:path_clearing", label: "Clear Blocking Hate" }),
  freeze({ id: "seat:access_win", capabilityId: "cap:selection_access", label: "Access Win Piece" }),
  freeze({ id: "seat:preserve_timing", capabilityId: "cap:plan_disruption", label: "Preserve Plan Timing" }),
]);

/**
 * Map contextual function / topology evidence → capability ids.
 * Role alone NEVER mints a capability.
 */
export function capabilitiesFromNode(node = {}, topology = {}) {
  const caps = new Set();
  const roles = new Set(node.roles || []);
  const stages = new Set(node.sequenceStages || []);
  const name = String(node.name || "");
  const edges = (topology.edges || []).filter((e) => e.from === name || e.to === name);
  const strongFrom = edges.filter((e) => e.from === name && e.strength === "strong");

  for (const edge of strongFrom) {
    if (edge.type === "protects_commander") caps.add("cap:commander_protection");
    if (edge.type === "protects_engine") caps.add("cap:engine_protection");
    if (edge.type === "protects_combo_or_close") caps.add("cap:close_protection");
    if (edge.type === "clears_path_for") caps.add("cap:path_clearing");
    if (edge.type === "disrupts_for") caps.add("cap:plan_disruption");
    if (edge.type === "tutors_for") caps.add("cap:selection_access");
    if (edge.type === "recovers") caps.add("cap:plan_recovery");
  }

  // Contextual-ish fallbacks that still require structure (not bare role).
  if (roles.has("protection") && node.commanderConnected) caps.add("cap:commander_protection");
  if ((roles.has("recursion") || stages.has("recover")) && (node.planConnected || strongFrom.some((e) => e.type === "recovers"))) {
    caps.add("cap:plan_recovery");
  }
  if ((roles.has("draw") || roles.has("selection")) && stages.has("recover") && node.planConnected) {
    caps.add("cap:resource_recovery");
  }
  if ((roles.has("tutor") || roles.has("selection")) && (node.planConnected || strongFrom.some((e) => e.type === "tutors_for"))) {
    caps.add("cap:selection_access");
  }

  // Flexibility: multifunction requires plan connection — tags alone insufficient.
  if (node.multifunction && node.planConnected) caps.add("cap:strategic_flexibility");

  return [...caps];
}

/**
 * Institutional invariant: static role alone cannot mint a capability.
 */
export function roleAloneCannotMintCapability(role = "") {
  const fakeNode = { name: "Test Card", roles: [role], planConnected: false, commanderConnected: false, multifunction: false, sequenceStages: [] };
  return capabilitiesFromNode(fakeNode, { edges: [] }).length === 0;
}

export function createCapabilityCandidateEvidence(partial = {}) {
  return freeze({
    candidate: partial.candidate || null,
    operationalDefinition: partial.operationalDefinition || "",
    levelASupport: partial.levelASupport || null,
    levelBSupport: partial.levelBSupport || null,
    crossEventReplication: partial.crossEventReplication || null,
    interactionCountControlled: partial.interactionCountControlled || null,
    commanderControlled: partial.commanderControlled || null,
    contradictions: freeze(partial.contradictions || []),
    confidence: partial.confidence ?? 0,
    verdict: partial.verdict || "unresolved",
    writesToBrain: false,
    promoted: false,
    activated: false,
  });
}
