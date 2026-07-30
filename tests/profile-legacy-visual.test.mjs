import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const profile = fs.readFileSync(new URL("../app/profile/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/profile/profile.css", import.meta.url), "utf8");

test("Forge Mastery turns real milestones into a visible personal legacy path", () => {
  assert.match(profile, /className="legacy-path"/);
  assert.match(profile, /YOUR FORGE LEGACY/);
  assert.match(profile, /identity\.allMilestones\.map/);
  assert.match(profile, /identity\.nextMilestone/);
  assert.match(profile, /Continue your Forge/);
  assert.match(css, /\.legacy-path li\.reached/);
  assert.match(css, /\.legacy-path li\.next/);
  assert.match(css, /prefers-reduced-motion:reduce[^}]*\.legacy-rail/s);
});

test("the profile batch makes the archive, chronicle, and inspection feel connected", () => {
  assert.match(profile, /className="profile-deck-art"/);
  assert.match(profile, /className="profile-deck-proof"/);
  assert.match(profile, /const chronicle = useMemo/);
  assert.match(profile, /RECENT CHRONICLE/);
  assert.match(profile, /id="profile-structure"/);
  assert.match(profile, /Close inspection/);
  assert.match(css, /\.forge-chronicle/);
  assert.match(css, /@keyframes profile-inspection-open/);
});
