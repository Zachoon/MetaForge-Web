// Center the current category inside the horizontal step rail. Scrolling the
// rail itself keeps the page from jumping; scrollIntoView would move both.
export function centeredRailScrollLeft(rail, step) {
  const tolerance = 1;
  const fullyVisible = step.left >= rail.left - tolerance && step.right <= rail.right + tolerance;
  if (fullyVisible) return rail.scrollLeft;
  const railWidth = rail.right - rail.left;
  const stepWidth = step.right - step.left;
  const next = rail.scrollLeft + (step.left - rail.left) - (railWidth - stepWidth) / 2;
  return Math.max(0, next);
}
