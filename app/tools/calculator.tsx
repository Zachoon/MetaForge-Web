"use client";

import { useMemo, useState } from "react";

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="calculator-field"><span>{label}</span><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></label>;
}

function LandCalculator() {
  const [curve, setCurve] = useState(3.2);
  const [ramp, setRamp] = useState(10);
  const [draw, setDraw] = useState(10);
  const [commanderCost, setCommanderCost] = useState(4);
  const [pace, setPace] = useState(2);
  const result = useMemo(() => {
    const center = 36 + (curve - 3.2) * 2.1 + (commanderCost - 4) * .45 - (ramp - 10) * .12 - (draw - 10) * .07 + (pace - 2) * 1.25;
    const rounded = Math.max(30, Math.min(43, Math.round(center)));
    return { low: Math.max(30, rounded - 1), high: Math.min(44, rounded + 1) };
  }, [curve, ramp, draw, commanderCost, pace]);
  return <div className="calculator-panel" aria-labelledby="land-result"><div className="calculator-fields">
    <NumberField label="Average mana value" value={curve} min={1.5} max={6} step={.1} onChange={setCurve} />
    <NumberField label="Ramp cards costing 3 or less" value={ramp} min={0} max={25} onChange={setRamp} />
    <NumberField label="Reliable draw or selection" value={draw} min={0} max={25} onChange={setDraw} />
    <NumberField label="Commander mana value" value={commanderCost} min={1} max={12} onChange={setCommanderCost} />
    <label className="calculator-field"><span>Intended pace</span><select value={pace} onChange={(event) => setPace(Number(event.target.value))}><option value="1">Fast / low curve</option><option value="2">Typical casual</option><option value="3">Battlecruiser / expensive</option></select></label>
  </div><output className="calculator-result" id="land-result"><small>START TESTING WITH</small><strong>{result.low}–{result.high} lands</strong><p>This is an estimate, not a rule. MDFCs, land-ramp, taplands, color requirements, and mulligan habits can move the answer.</p></output></div>;
}

function ColorCalculator() {
  const [turn, setTurn] = useState(3);
  const [pips, setPips] = useState(1);
  const [deckSize, setDeckSize] = useState(99);
  const target = useMemo(() => {
    const table: Record<number, number[]> = { 2: [14, 22, 29], 3: [13, 20, 27], 4: [12, 19, 25], 5: [11, 18, 24], 6: [10, 17, 23] };
    return Math.round((table[turn]?.[pips - 1] ?? 20) * deckSize / 99);
  }, [turn, pips, deckSize]);
  return <div className="calculator-panel" aria-labelledby="source-result"><div className="calculator-fields">
    <NumberField label="Turn you want to cast it" value={turn} min={2} max={6} onChange={setTurn} />
    <NumberField label="Pips of the same color" value={pips} min={1} max={3} onChange={setPips} />
    <NumberField label="Cards in library (99 for Commander)" value={deckSize} min={40} max={100} onChange={setDeckSize} />
  </div><output className="calculator-result" id="source-result"><small>STARTING TARGET</small><strong>{target} colored sources</strong><p>Count only sources available by turn {turn}. A tapped land can be a source if your sequence still lets the spell arrive on time.</p></output></div>;
}

export function ToolCalculator({ kind }: { kind?: string }) {
  if (kind === "lands") return <LandCalculator />;
  if (kind === "colors") return <ColorCalculator />;
  return null;
}
