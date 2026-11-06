/** Leaded window drawn over a commander's Scryfall art crop. Panes are
 *  translucent so the illustration stays readable; the cames are the glass. */

const WIDTH = 1200;
const HEIGHT = 640;
const COLS = 7;
const ROWS = 4;

const WASHES = ["#9a3412", "#1e4d86", "#7a2340", "#1d6b45", "#b5812b", "#4c3b78", "#8d5a22"];

function unit(row: number, col: number, axis: "x" | "y") {
  const seed = Math.sin(row * 12.9898 + col * 78.233 + (axis === "y" ? 19.19 : 0)) * 43758.5453;
  return seed - Math.floor(seed);
}

function point(row: number, col: number) {
  const xSpan = WIDTH / COLS;
  const ySpan = HEIGHT / ROWS;
  const edgeX = col === 0 || col === COLS;
  const edgeY = row === 0 || row === ROWS;
  const x = col * xSpan + (edgeX ? 0 : (unit(row, col, "x") - 0.5) * 46);
  const y = row * ySpan + (edgeY ? 0 : (unit(row, col, "y") - 0.5) * 34);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
}

type Pane = { points: string; fill: string; opacity: number };

function buildPanes(): Pane[] {
  const panes: Pane[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const a = point(row, col);
      const b = point(row, col + 1);
      const c = point(row + 1, col + 1);
      const d = point(row + 1, col);
      const clear = col >= 2 && col <= 4 && row >= 1 && row <= 2;
      const fill = WASHES[(row * 3 + col) % WASHES.length];
      const split = (row + col) % 3 === 0;
      if (split) {
        panes.push({
          points: `${a[0]},${a[1]} ${b[0]},${b[1]} ${d[0]},${d[1]}`,
          fill,
          opacity: clear ? 0.08 : 0.42,
        });
        panes.push({
          points: `${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`,
          fill: WASHES[(row + col + 2) % WASHES.length],
          opacity: clear ? 0.1 : 0.5,
        });
      } else {
        panes.push({
          points: `${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`,
          fill,
          opacity: clear ? 0.08 : 0.46,
        });
      }
    }
  }
  return panes;
}

const PANES = buildPanes();

function roseSpokes() {
  const cx = 980;
  const cy = 210;
  const radius = 118;
  const spokes = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    spokes.push(
      `M ${cx} ${cy} L ${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)}`,
    );
  }
  return { cx, cy, radius, spokes };
}

const ROSE = roseSpokes();

export function StainedGlassLeads() {
  return (
    <svg className="stained-glass-leads" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" focusable="false">
      <g className="glass-wash">
        {PANES.map((pane) => (
          <polygon key={pane.points} points={pane.points} fill={pane.fill} fillOpacity={pane.opacity} />
        ))}
      </g>
      <g className="glass-cames" fill="none" strokeLinejoin="round" strokeLinecap="round">
        {PANES.map((pane) => (
          <polygon key={pane.points} points={pane.points} />
        ))}
        <circle cx={ROSE.cx} cy={ROSE.cy} r={ROSE.radius} />
        <circle cx={ROSE.cx} cy={ROSE.cy} r={46} />
        {ROSE.spokes.map((d) => (
          <path key={d} d={d} />
        ))}
        <rect x="8" y="8" width={WIDTH - 16} height={HEIGHT - 16} />
      </g>
    </svg>
  );
}

export function FocusMark({ kind }: { kind: "left" | "center" | "right" }) {
  if (kind === "center") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
        <path d="M12 3.5v4.2M12 16.3v4.2M3.5 12h4.2M16.3 12h4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  const x = kind === "left" ? 5 : 15;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x={x} y="5" width="4" height="14" rx="0.6" fill="currentColor" />
    </svg>
  );
}
