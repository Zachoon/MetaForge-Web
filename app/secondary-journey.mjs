// Secondary paths beside the one primary start (the guided commander
// picker). These are not steps: the labels name different destinations,
// and nothing here repeats "Start with your commander".
export const SECONDARY_JOURNEY = [
  { href: "/commanders", label: "Commander guides" },
  { href: "/?intent=list", label: "Build from a list" },
  { href: "/academy", label: "Academy" },
];

export function secondaryJourneyMarkup(ariaLabel = "Where to go next") {
  const parts = [];
  for (const [index, item] of SECONDARY_JOURNEY.entries()) {
    if (index > 0) parts.push(`<span class="mf-journey-sep" aria-hidden="true">·</span>`);
    parts.push(`<a href="${item.href}">${item.label}</a>`);
  }
  return `<nav class="mf-journey" aria-label="${ariaLabel}">${parts.join("")}</nav>`;
}
