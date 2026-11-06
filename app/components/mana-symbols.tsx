import "./mana-symbols.css";

// Renders Magic's {X}-style symbols (mana costs, {T}, hybrid and Phyrexian
// mana) from the vendored Scryfall SVGs in /assets/mtg. Uncommon symbols
// that are not in that set still load from svgs.scryfall.io.
// Server-safe: no hooks, so guide pages stay fully static.

const VENDORED_SYMBOLS = new Set([
  "W", "U", "B", "R", "G", "C", "X", "T", "Q", "S",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "13", "14", "15", "16",
  "WU", "UB", "BR", "RG", "GW", "WB", "UR", "BG", "RW", "GU",
  "2W", "2U", "2B", "2R", "2G",
  "WP", "UP", "BP", "RP", "GP",
]);

const VENDORED_SETS = new Set(["cmd", "cmm", "eoc", "inr", "one"]);

const SYMBOL_NAMES: Record<string, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colorless",
  S: "snow",
  X: "X",
  Y: "Y",
  Z: "Z",
};

const STANDALONE_NAMES: Record<string, string> = {
  T: "tap",
  Q: "untap",
  E: "energy",
};

function describeSymbol(symbol: string): string {
  if (STANDALONE_NAMES[symbol]) return STANDALONE_NAMES[symbol];
  const parts = symbol.split("/");
  const phyrexian = parts.includes("P");
  const names = parts
    .filter((part) => part !== "P")
    .map((part) => (/^\d+$/.test(part) ? `${part} generic` : SYMBOL_NAMES[part] || part));
  return `${phyrexian ? "Phyrexian " : ""}${names.join(" or ")} mana`;
}

export function ManaSymbol({ symbol, decorative = false }: { symbol: string; decorative?: boolean }) {
  const code = symbol.replace(/\//g, "");
  const src = VENDORED_SYMBOLS.has(code)
    ? `/assets/mtg/symbols/${code}.svg`
    : `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`;
  const name = describeSymbol(symbol);
  return (
    <img
      className="mana-symbol"
      src={src}
      alt={decorative ? "" : name}
      title={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}

/** The five colors, as the real pips. Decorative: the words beside it carry the name. */
export function ManaRow({ symbols = ["W", "U", "B", "R", "G"] }: { symbols?: readonly string[] }) {
  return (
    <span className="mf-mana-row" aria-hidden="true">
      {symbols.map((symbol) => (
        <ManaSymbol key={symbol} symbol={symbol} decorative />
      ))}
    </span>
  );
}

/** Scryfall set symbol. Unknown codes fall back to the Commander mark. */
export function SetMark({ code, label }: { code?: string; label?: string }) {
  const set = code && VENDORED_SETS.has(code) ? code : "cmd";
  return (
    <img
      className="mtg-set-mark"
      src={`/assets/mtg/sets/${set}.svg`}
      alt={label ? `${label} symbol` : ""}
      aria-hidden={label ? undefined : true}
      width={16}
      height={16}
      decoding="async"
    />
  );
}

/** Rules or cost text with every {symbol} drawn as its icon. */
export function ManaText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^{}]+\})/).map((part, index) => {
        const symbol = part.match(/^\{([^{}]+)\}$/)?.[1];
        return symbol ? <ManaSymbol key={index} symbol={symbol} /> : part;
      })}
    </>
  );
}
