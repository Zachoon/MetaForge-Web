"use client";

import { useEffect, useMemo, useState } from "react";
import { cardImage } from "../../card-art";
import { commanderOracleText } from "../../commander-lane-scoring.mjs";
import { configureCardTagLookup } from "../../strategic-intent.mjs";
import { commanderOptionFromCard, extractPastedCommanderName } from "../../deck-import-commander.mjs";
import { cardFactKey, parseDeckRows } from "../../deck-row-helpers";
import { deckDisplaySection } from "../../deck-display-classification.mjs";
import { targetDeckSize } from "../../format-catalog";
import {
  additionIssue,
  buildGhostQueue,
  diagnoseFreeDeck,
  typeCounts,
} from "../../free-build-coach.mjs";
import { useForgeSession } from "../../forge-session-context";
import { ManaRow, SetMark } from "../mana-symbols";
import { ColorIdentityChips, ForgeProp } from "../tripo-assets";
import "../../free-decklist.css";

configureCardTagLookup(() => [], { onlyIfMissing: true });

const GROUPS = ["Commander", "Creatures", "Planeswalkers", "Instants", "Sorceries", "Artifacts", "Enchantments", "Battles", "Lands", "Other"];

type Face = {
  name: string;
  typeLine?: string;
  oracleText?: string;
  manaCost?: string;
  cmc?: number;
  colorIdentity?: string[];
  legal?: boolean;
  image?: string;
  unresolved?: boolean;
  quantity?: number;
  section?: string;
  caption?: string;
};

type Ghost = {
  id: string;
  stepId: string;
  primary: Face;
  runnerUp: Face | null;
};

function scryfallFace(card: Record<string, any>): Face {
  const faces = card.card_faces || [];
  const oracle = card.oracle_text || faces.map((face: { oracle_text?: string }) => face.oracle_text || "").filter(Boolean).join("\n");
  const typeLine = card.type_line || faces.map((face: { type_line?: string }) => face.type_line || "").filter(Boolean).join(" // ");
  const manaCost = card.mana_cost || faces.find((face: { mana_cost?: string }) => face.mana_cost)?.mana_cost || "";
  return {
    name: card.name,
    typeLine,
    oracleText: oracle,
    manaCost,
    cmc: Number(card.cmc) || 0,
    colorIdentity: card.color_identity || [],
    legal: card.legalities ? card.legalities.commander === "legal" : undefined,
    image: card.image_uris?.normal || faces[0]?.image_uris?.normal || cardImage(card.name),
  };
}

function rowsWait(text: string, known: Record<string, Face>) {
  return parseDeckRows(text)
    .map((row) => row.name)
    .filter((name) => !known[cardFactKey(name)])
    .join("|");
}

function withQuantity(text: string, name: string, delta: number) {
  const key = cardFactKey(name);
  const lines = text.split(/\n/);
  let found = false;
  const next = lines.flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (!match || cardFactKey(match[2]) !== key) return [line];
    found = true;
    const quantity = Number(match[1]) + delta;
    return quantity > 0 ? [`${quantity} ${match[2]}`] : [];
  });
  if (!found && delta > 0) next.push(`${delta} ${name}`);
  return next.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function FreeDecklist() {
  const {
    deck,
    setDeck,
    buildPath,
    format,
    strategy,
    targetPowerTier,
    motionMode,
    deckViewMode,
    setDeckViewMode,
    selectedCommander,
    selectedSecondCommander,
    selectCommander,
    setSelectedCommander,
    setCommanderQuery,
    deckCoaching,
    setDeckCoaching,
  } = useForgeSession();

  const [cardQuery, setCardQuery] = useState("");
  const [cardHits, setCardHits] = useState<Face[]>([]);
  const [commanderQueryLocal, setCommanderQueryLocal] = useState("");
  const [commanderHits, setCommanderHits] = useState<Array<ReturnType<typeof commanderOptionFromCard>>>([]);
  const [catalog, setCatalog] = useState<Record<string, Face>>({});
  const [notice, setNotice] = useState("");
  const [pool, setPool] = useState<Face[]>([]);
  const [poolStatus, setPoolStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [clearedKey, setClearedKey] = useState("");
  const [prefersReduced, setPrefersReduced] = useState(false);

  const staticMotion = motionMode === "quiet" || prefersReduced;
  const layout = deckViewMode === "gallery" ? "gallery" : "ledger";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPrefersReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!deckCoaching) {
      setSkipped([]);
      setSwapped({});
      setShowAll(false);
      setPaused(false);
      setClearedKey("");
      setShown(0);
    }
  }, [deckCoaching]);

  useEffect(() => {
    const query = cardQuery.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`legal:commander name:${query}`)}&order=edhrec`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setCardHits((data.data || []).slice(0, 6).map(scryfallFace));
      } catch {
        if (!controller.signal.aborted) setCardHits([]);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cardQuery]);

  useEffect(() => {
    const query = commanderQueryLocal.trim();
    if (query.length < 2 || query === selectedCommander?.name) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`legal:commander is:commander name:${query}`)}&order=edhrec`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setCommanderHits((data.data || []).slice(0, 6).map(commanderOptionFromCard));
      } catch {
        if (!controller.signal.aborted) setCommanderHits([]);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [commanderQueryLocal, selectedCommander?.name]);

  const missingKey = rowsWait(deck, catalog);
  useEffect(() => {
    if (!missingKey) return;
    const names = missingKey.split("|");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("https://api.scryfall.com/cards/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiers: names.slice(0, 75).map((name) => ({ name })) }),
          signal: controller.signal,
        });
        const data = await response.json();
        setCatalog((current) => {
          const next = { ...current };
          for (const card of data.data || []) next[cardFactKey(card.name)] = scryfallFace(card);
          return next;
        });
      } catch {
        /* The names stay in the list. Counts wait until the printed card can be read. */
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [missingKey]);

  useEffect(() => {
    if (buildPath !== "complete" || selectedCommander) return;
    const name = extractPastedCommanderName(deck);
    if (!name) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const card = await response.json();
        if (card.legalities?.commander !== "legal") return;
        const option = commanderOptionFromCard(card);
        setSelectedCommander(option);
        setCommanderQuery(option.name);
      } catch {
        /* The commander field stays empty so the player can search. */
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [buildPath, deck, selectedCommander, setSelectedCommander, setCommanderQuery]);

  const commanders = useMemo(() => {
    const list = [];
    if (selectedCommander?.name) {
      list.push({
        name: selectedCommander.name,
        typeLine: selectedCommander.typeLine,
        oracleText: commanderOracleText(selectedCommander),
        colorIdentity: selectedCommander.colors || [],
        colors: selectedCommander.colors || [],
      });
    }
    if (selectedSecondCommander?.name) {
      list.push({
        name: selectedSecondCommander.name,
        typeLine: selectedSecondCommander.typeLine,
        oracleText: commanderOracleText(selectedSecondCommander),
        colorIdentity: selectedSecondCommander.colors || [],
        colors: selectedSecondCommander.colors || [],
      });
    }
    return list;
  }, [selectedCommander, selectedSecondCommander]);

  const rows = useMemo(() => parseDeckRows(deck), [deck]);
  const entries = useMemo(() => rows
    .filter((row) => !commanders.some((commander) => cardFactKey(commander.name) === cardFactKey(row.name)))
    .map((row) => ({ ...(catalog[cardFactKey(row.name)] || { name: row.name, unresolved: true }), quantity: row.quantity })), [rows, catalog, commanders]);

  const diagnosis = useMemo(() => diagnoseFreeDeck({
    entries,
    commanders,
    strategy,
    targetPowerTier,
    deckSize: targetDeckSize(format),
  }), [entries, commanders, strategy, targetPowerTier, format]);

  const listKey = entries.map((entry) => `${entry.quantity} ${entry.name}`).join("|");
  const ghosts = useMemo(() => {
    if (!deckCoaching || poolStatus !== "ready" || clearedKey === listKey) return [] as Ghost[];
    return buildGhostQueue({
      diagnosis,
      entries,
      pool,
      commanders,
      skipped,
      targetPowerTier: diagnosis.targetPowerTier,
    }) as Ghost[];
  }, [deckCoaching, poolStatus, clearedKey, listKey, diagnosis, entries, pool, commanders, skipped]);

  const ghostKey = ghosts.map((ghost) => ghost.id).join("|");
  useEffect(() => {
    setShown(staticMotion ? Math.min(1, ghosts.length) : 0);
    setSwapped({});
  }, [ghostKey, staticMotion, ghosts.length]);

  useEffect(() => {
    if (!deckCoaching || staticMotion || showAll || paused || shown >= ghosts.length) return;
    const timer = window.setTimeout(() => setShown((current) => current + 1), shown === 0 ? 700 : 850);
    return () => window.clearTimeout(timer);
  }, [deckCoaching, staticMotion, showAll, paused, shown, ghosts.length]);

  useEffect(() => {
    if (!deckCoaching || !selectedCommander) return;
    const colors = [...new Set([...(selectedCommander.colors || []), ...(selectedSecondCommander?.colors || [])])];
    const identity = colors.length ? `id<=${colors.join("").toLowerCase()}` : "id:c";
    const controller = new AbortController();
    setPoolStatus("loading");
    (async () => {
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`legal:commander (${identity} or t:basic)`)}&order=edhrec`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (controller.signal.aborted) return;
        setPool((data.data || []).slice(0, 60).map(scryfallFace));
        setPoolStatus(response.ok ? "ready" : "error");
      } catch {
        if (!controller.signal.aborted) setPoolStatus("error");
      }
    })();
    return () => controller.abort();
  }, [deckCoaching, selectedCommander?.name, selectedCommander?.colors, selectedSecondCommander?.name, selectedSecondCommander?.colors]);

  function remember(face: Face) {
    setCatalog((current) => ({ ...current, [cardFactKey(face.name)]: face }));
  }

  function addFace(face: Face) {
    const issue = additionIssue(face, { commanders, existing: entries });
    if (issue) {
      setNotice(issue);
      return false;
    }
    remember(face);
    setDeck((current) => withQuantity(current, face.name, 1));
    setNotice("");
    return true;
  }

  function addFaces(faces: Face[]) {
    setDeck((current) => {
      let next = current;
      const existing = parseDeckRows(next).map((row) => ({ ...(catalog[cardFactKey(row.name)] || { name: row.name }), quantity: row.quantity }));
      for (const face of faces) {
        if (additionIssue(face, { commanders, existing })) continue;
        existing.push({ ...face, quantity: 1 });
        next = withQuantity(next, face.name, 1);
      }
      return next;
    });
    setCatalog((current) => {
      const next = { ...current };
      for (const face of faces) next[cardFactKey(face.name)] = face;
      return next;
    });
    setNotice("");
  }

  function visibleGhosts() {
    const count = showAll ? ghosts.length : shown;
    return ghosts.slice(0, count).map((ghost) => ({
      ...ghost,
      face: swapped[ghost.id] && ghost.runnerUp ? ghost.runnerUp : ghost.primary,
    }));
  }

  const shownGhosts = visibleGhosts();
  const passiveTypes = typeCounts(entries);

  function skipLead() {
    const ghost = shownGhosts[0];
    if (!ghost) return;
    if (!swapped[ghost.id] && ghost.runnerUp) {
      setSwapped((current) => ({ ...current, [ghost.id]: true }));
      return;
    }
    setSkipped((current) => [...current, ghost.primary.name, ghost.runnerUp?.name || ""].filter(Boolean));
  }

  const issues = entries.flatMap((entry) => {
    if (entry.unresolved) return [`${entry.name} is still unread, so it is not in the counts yet.`];
    const issue = additionIssue({ ...entry, legal: entry.legal }, { commanders, existing: [] });
    return issue && !/one copy|already the commander/.test(issue) ? [`${entry.name}: ${issue}`] : [];
  });
  const copies = entries.filter((entry) => (entry.quantity || 1) > 1 && additionIssue({ ...entry, quantity: 1 }, { commanders, existing: [{ ...entry, quantity: (entry.quantity || 1) - 1 }] }));

  return (
    <div className="free-decklist" data-motion={staticMotion ? "static" : "full"} data-free-decklist="true">
      <header className="free-decklist-head">
        <div>
          <span className="free-eyebrow"><SetMark code="cmd" label="Commander" />Commander decklist · coaching {deckCoaching ? "on" : "off"}</span>
          <h1>{selectedCommander ? <><em>{selectedCommander.name}</em> deck</> : "Empty decklist"}</h1>
          {!selectedCommander && <p className="free-mana-row"><ManaRow /></p>}
          <p>{diagnosis.cardCount} cards in the list. Proposed cards stay out of that count.</p>
        </div>
        <div className="free-decklist-actions">
          <button
            type="button"
            className="free-coach-toggle"
            aria-pressed={deckCoaching}
            disabled={!selectedCommander}
            onClick={() => setDeckCoaching((current: boolean) => !current)}
          >
            {deckCoaching ? "Turn coaching off" : "Coach this deck"}
          </button>
          <div className="free-view-toggle" role="group" aria-label="Decklist layout">
            <button type="button" className={layout === "gallery" ? "active" : ""} onClick={() => setDeckViewMode("gallery")}>Visual deck</button>
            <button type="button" className={layout === "ledger" ? "active" : ""} onClick={() => setDeckViewMode("ledger")}>Text list</button>
          </div>
        </div>
      </header>
      <div className="free-decklist-stage">
        <aside className="free-deck-tools" aria-label="Build the list">
          <h2><ForgeProp kind="tome" size={36} /><span>Commander</span></h2>
          {selectedCommander ? (
            <div className="free-commander-card">
              <b>{selectedCommander.name}</b>
              <small>{selectedCommander.typeLine}</small>
              <div className="free-identity">
                <ForgeProp kind="crystal" size={32} />
                <ColorIdentityChips colors={selectedCommander.colors || []} />
              </div>
              <button type="button" onClick={() => { setSelectedCommander(null); setCommanderQuery(""); setCommanderQueryLocal(""); }}>Change commander</button>
            </div>
          ) : (
            <label className="free-field">
              <span>Search commanders</span>
              <input value={commanderQueryLocal} onChange={(event) => setCommanderQueryLocal(event.target.value)} placeholder="Search for a legend…" aria-label="Search commanders" />
            </label>
          )}
          {commanderHits.length > 0 && !selectedCommander && (
            <div className="free-results" role="listbox" aria-label="Commander results">
              {commanderHits.map((hit) => (
                <button type="button" key={hit.name} onClick={() => { selectCommander(hit); setCommanderHits([]); setCommanderQueryLocal(""); }}>
                  <b>{hit.name}</b><small>{hit.typeLine}</small>
                </button>
              ))}
            </div>
          )}
          <label className="free-field">
            <span>Search cards</span>
            <input value={cardQuery} onChange={(event) => setCardQuery(event.target.value)} placeholder="Add a card by name…" aria-label="Search cards to add" />
          </label>
          {cardHits.length > 0 && (
            <div className="free-results" role="listbox" aria-label="Card results">
              {cardHits.map((hit) => (
                <button type="button" key={hit.name} onClick={() => { if (addFace(hit)) { setCardQuery(""); setCardHits([]); } }}>
                  <b>{hit.name}</b><small>{hit.typeLine}</small>
                </button>
              ))}
            </div>
          )}
          {notice && <p className="free-notice" role="alert">{notice}</p>}
          {(issues.length > 0 || copies.length > 0) && (
            <ul className="free-notice">
              {issues.map((issue) => <li key={issue}>{issue}</li>)}
              {copies.map((entry) => <li key={entry.name}>{entry.name} is over the Commander copy limit.</li>)}
            </ul>
          )}
          <details className="free-paste" open={buildPath === "complete" && !deck.trim()}>
            <summary>{buildPath === "complete" ? "Paste a partial list" : "Paste cards"}</summary>
            <textarea
              value={deck}
              aria-label="Decklist text"
              placeholder={"1 Sol Ring\n1 Command Tower"}
              onChange={(event) => setDeck(event.target.value)}
              onBlur={(event) => {
                const normalized = event.target.value.split(/\n/).map((line) => {
                  const trimmed = line.trim();
                  if (!trimmed || /^\d+\s+/.test(trimmed) || /^(commander|sideboard|deck)\b/i.test(trimmed)) return line;
                  return `1 ${trimmed}`;
                }).join("\n");
                if (normalized !== deck) setDeck(normalized);
              }}
            />
          </details>
          {deckCoaching ? (
            <section className="free-missing" aria-label="What's missing most">
              <h2><ForgeProp kind="hammer" size={40} /><span>What&rsquo;s missing most</span></h2>
              <p className="free-intent">
                {diagnosis.plan?.label ? `Plan read: ${diagnosis.plan.label}. ` : ""}
                Intent: {strategy || "not set"}. {diagnosis.targetPowerTier ? `Target: ${diagnosis.targetPowerTier}.` : "No stored power tier, so these floors are the 100-card Commander norms."}
              </p>
              <ol>
                {diagnosis.steps.map((step: { id: string; label: string; countText: string; done: boolean; status: string }) => (
                  <li key={step.id} className={step.id === diagnosis.currentId ? "is-current" : step.done ? "is-done" : ""}>
                    <b>{step.label} {step.countText}</b>
                    <em>{step.done ? "Done" : step.id === diagnosis.currentId ? "Now" : step.status === "waiting" ? "Waiting" : "Open"}</em>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <section aria-label="Role, type, and curve counts">
              <h2><ForgeProp kind="tome" size={36} /><span>Counts</span></h2>
              <p className="free-intent">Coaching is off. These are counts from the cards in the list.</p>
              <div className="free-counts">
                {diagnosis.steps.filter((step: { id: string }) => step.id !== "curve").map((step: { id: string; label: string; actual: number }) => (
                  <span key={step.id}>{step.label} {step.actual}</span>
                ))}
              </div>
              <div className="free-counts" aria-label="Card types">
                {Object.entries(passiveTypes).filter(([, count]) => Number(count) > 0).map(([label, count]) => (
                  <span key={label}>{label} {count as number}</span>
                ))}
              </div>
              <div className="free-curve" aria-label="Mana curve">
                {diagnosis.curve.labels.map((label: string, index: number) => (
                  <span key={label}>{label}: {diagnosis.curve.buckets[index]}</span>
                ))}
              </div>
            </section>
          )}
        </aside>
        <section className="free-list-pane" aria-label="Decklist">
          {deckCoaching && (
            <div className="ghost-controls" role="group" aria-label="Ghost picks">
              <button type="button" disabled={!shownGhosts.length} onClick={() => shownGhosts[0] && addFace(shownGhosts[0].face)}>
                <ForgeProp kind="hammer" size={28} />
                Accept
              </button>
              <button type="button" disabled={!shownGhosts.length} onClick={skipLead}>Skip</button>
              <button type="button" disabled={!ghosts.length} onClick={() => addFaces(ghosts.map((ghost) => swapped[ghost.id] && ghost.runnerUp ? ghost.runnerUp : ghost.primary))}>
                <ForgeProp kind="hammer" size={28} />
                Accept all
              </button>
              <button type="button" aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
                <ForgeProp kind="anvil" size={36} />
                {paused ? "Paused" : "Pause"}
              </button>
              <button type="button" disabled={showAll || shown >= ghosts.length} onClick={() => { setPaused(true); setShown((current) => Math.min(ghosts.length, current + 1)); }}>
                <ForgeProp kind="anvil" size={36} />
                Step
              </button>
              <button type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}>Show all</button>
              <button type="button" onClick={() => setClearedKey(listKey)}>Clear</button>
            </div>
          )}
          {deckCoaching && poolStatus === "loading" && <p role="status">Reading printed cards for the open gaps…</p>}
          {deckCoaching && poolStatus === "error" && <p role="alert">The card pool could not be read. The counts above are from your list. No cards were invented.</p>}
          <div id="deck-gallery">
            {!selectedCommander && entries.length === 0 && shownGhosts.length === 0 && (
              <figure className="free-empty-back">
                <img src="/assets/mtg/card-back.webp" alt="" />
                <figcaption>No cards named yet. The back stays until a card is in the list.</figcaption>
              </figure>
            )}
            {layout === "gallery" ? (
              <div className="visual-deck-gallery" aria-label="Card gallery">
                {GROUPS.filter((group) => group === "Commander" ? selectedCommander : entries.some((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group) || shownGhosts.some((ghost) => (ghost.face.section || deckDisplaySection({ type_line: ghost.face.typeLine || "" })) === group)).map((group) => (
                  <section className="visual-deck-group" key={group}>
                    <header><b>{group}</b><span>{group === "Commander" ? 1 : entries.filter((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group).reduce((sum, entry) => sum + (entry.quantity || 1), 0)}</span></header>
                    <div className="visual-deck-cards">
                      {group === "Commander" && selectedCommander && (
                        <article className="visual-deck-card">
                          <span className="visual-deck-card-art"><img data-card-name={selectedCommander.name} src={selectedCommander.image || cardImage(selectedCommander.name)} alt="" /></span>
                          <strong data-card-name={selectedCommander.name}>{selectedCommander.name}</strong>
                        </article>
                      )}
                      {group !== "Commander" && entries.filter((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group).map((entry) => (
                        <article className="visual-deck-card" key={entry.name}>
                          <span className="visual-deck-card-art"><img data-card-name={entry.name} src={entry.image || cardImage(entry.name)} alt="" /></span>
                          <strong data-card-name={entry.name}>{entry.name}{(entry.quantity || 1) > 1 ? ` ×${entry.quantity}` : ""}</strong>
                          <button type="button" className="free-remove" onClick={() => setDeck((current) => withQuantity(current, entry.name, -1))}>Remove</button>
                        </article>
                      ))}
                      {shownGhosts.filter((ghost) => (ghost.face.section || "Other") === group).map((ghost) => (
                        <article className="visual-deck-card ghost-pick" key={ghost.id} aria-label={`${ghost.face.name}, proposed, not counted yet. ${ghost.face.caption || ""}`}>
                          <span className="ghost-wax-frame">
                            <span className="visual-deck-card-art">
                              <img data-card-name={ghost.face.name} src={ghost.face.image || cardImage(ghost.face.name)} alt="" />
                              <span className="ghost-glass" aria-hidden="true" />
                            </span>
                            <i className="ghost-wax-seal" aria-hidden="true" />
                          </span>
                          <strong data-card-name={ghost.face.name}>
                            {ghost.face.name}
                            <em className="ghost-unfinished">Unfinished</em>
                            <small className="ghost-caption">{ghost.face.caption}</small>
                          </strong>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="deck-gallery">
                <div className="type-columns">
                  {GROUPS.filter((group) => group === "Commander" ? selectedCommander : entries.some((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group) || shownGhosts.some((ghost) => (ghost.face.section || "Other") === group)).map((group) => (
                    <section className="type-column" key={group}>
                      <header><b>{group}</b><span>{group === "Commander" ? 1 : entries.filter((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group).reduce((sum, entry) => sum + (entry.quantity || 1), 0)}</span></header>
                      {group === "Commander" && selectedCommander && (
                        <div className="type-column-row"><span>1</span><strong data-card-name={selectedCommander.name}>{selectedCommander.name}</strong></div>
                      )}
                      {group !== "Commander" && entries.filter((entry) => deckDisplaySection({ type_line: entry.typeLine || "" }) === group).map((entry) => (
                        <div className="type-column-row" key={entry.name}>
                          <span>{entry.quantity || 1}</span>
                          <strong data-card-name={entry.name}>{entry.name}{entry.unresolved ? <small className="free-row-warn"> Unread</small> : null}</strong>
                          <button type="button" className="free-remove" aria-label={`Remove ${entry.name}`} onClick={() => setDeck((current) => withQuantity(current, entry.name, -1))}>Remove</button>
                        </div>
                      ))}
                      {shownGhosts.filter((ghost) => (ghost.face.section || "Other") === group).map((ghost) => (
                        <div className="type-column-row ghost-pick" key={ghost.id} aria-label={`${ghost.face.name}, proposed, not counted yet. ${ghost.face.caption || ""}`}>
                          <span className="ghost-row-mark" aria-hidden="true"><i className="ghost-wax-seal" /></span>
                          <strong data-card-name={ghost.face.name}>
                            {ghost.face.name}
                            <em className="ghost-unfinished">Unfinished</em>
                            <small className="ghost-caption">{ghost.face.caption}</small>
                          </strong>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
