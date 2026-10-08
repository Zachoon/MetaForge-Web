import "./mana-symbols.css";

// Renders Magic's {X}-style symbols (mana costs, {T}, hybrid and Phyrexian
// mana) as Scryfall's official symbol art, the same source as our card images.
// Server-safe: no hooks, so guide pages stay fully static.

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

export function ManaSymbol({ symbol }: { symbol: string }) {
  const code = symbol.replace(/\//g, "");
  return (
    <img
      className="mana-symbol"
      src={`https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`}
      alt={describeSymbol(symbol)}
      title={describeSymbol(symbol)}
      loading="lazy"
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
