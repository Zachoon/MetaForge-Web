#!/usr/bin/env node
// Alpha Coach metrics — report shape smoke (no live DB required).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAlphaCoachMetricsShape } from "../../app/honest-coach-feedback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "out");
mkdirSync(outDir, { recursive: true });

const report = buildAlphaCoachMetricsShape({
  analysesCompleted: 0,
  coachBriefViews: 0,
  whyExplanationOpens: 0,
  confidenceDrilldowns: 0,
  recommendationViews: 0,
  feedbackHelpful: 0,
  feedbackNotHelpful: 0,
  feedbackWrongPlan: 0,
  feedbackGuest: 0,
  feedbackSignedIn: 0,
  confidenceHigh: 0,
  confidenceModerate: 0,
  confidenceLimited: 0,
});

const md = `# Alpha Coach Report (shape)

Product evidence only — not Academy research.

| Metric | Value |
|---|---|
| Analyses completed | ${report.analysesCompleted} |
| Coach brief view rate | ${report.coachBriefViewRate} |
| Why-explanation open rate | ${report.whyExplanationOpenRate} |
| Helpful / not-helpful ratio | ${report.helpfulNotHelpfulRatio} |
| Wrong-plan feedback | ${report.wrongPlanFeedbackCount} |
| Confidence high / moderate / limited | ${report.confidenceDistribution.high} / ${report.confidenceDistribution.moderate} / ${report.confidenceDistribution.limited} |
| Guest vs signed-in feedback | ${report.guestVsSignedInFeedback.guest} / ${report.guestVsSignedInFeedback.signedIn} |

Fill from \`launch_events\` + \`founder_feedback\` once alpha traffic lands.
`;

writeFileSync(join(outDir, "alpha-coach-report.json"), JSON.stringify(report, null, 2));
writeFileSync(join(outDir, "alpha-coach-report.md"), md);
console.log(`Wrote ${join(outDir, "alpha-coach-report.md")}`);
