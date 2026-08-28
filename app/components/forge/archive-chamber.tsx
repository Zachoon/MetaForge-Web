"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { cardArtCrop } from "../../card-art";
import { occupancyLabelsForOption } from "../../commander-lane-scoring.mjs";
import { useForgeSession } from "../../forge-session-context";
import { COLOR_ACCENT, resolveMasterworkVisualProfile } from "../../masterwork-visual-profile.mjs";
import { MOTIF_ICONS, type MotifId } from "../../masterwork-motif-icons";
import type { SavedFamily } from "../../forge-types";

type ViewMode = "grid" | "list";
type SortKey = "updated" | "name" | "record" | "revisions";

const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;
const COLOR_NAMES: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };

function familyRecord(family: SavedFamily) {
  const evidence = family.record || family.revisions.at(-1)?.evidence || {};
  return { wins: Number(evidence.wins || 0), losses: Number(evidence.losses || 0) };
}

function familyUpdatedAt(family: SavedFamily) {
  const stamp = family.updatedAt || family.revisions.at(-1)?.createdAt;
  return stamp ? new Date(stamp).getTime() : 0;
}

function relativeUpdated(ms: number) {
  if (!ms) return "—";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function dominantMotifFor(family: SavedFamily): MotifId | null {
  const entries = Object.entries(family.motifWeights || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0] as MotifId;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  );
}
function ArrowIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={style}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  );
}
function OpenArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
  );
}
function AnvilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 17h13v3H3zM6 17v-3h7l4-2v5M9 12V8a3 3 0 013-3 3 3 0 013 3" /></svg>
  );
}

export function ArchiveChamber() {
  const {
    savedMasterworks,
    archiveFeaturedArt,
    openSavedMasterwork,
    setFamilyArchived,
    deleteSavedMasterwork,
    startNewForge,
  } = useForgeSession();

  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [colorFilter, setColorFilter] = useState<Record<string, boolean>>({});
  const [formatFilter, setFormatFilter] = useState("all");

  const formatOptions = useMemo(
    () => Array.from(new Set(savedMasterworks.map((family) => family.format))).sort(),
    [savedMasterworks],
  );

  const activeColors = COLOR_ORDER.filter((color) => colorFilter[color]);

  const filtered = savedMasterworks.filter((family) => {
    if (formatFilter !== "all" && family.format !== formatFilter) return false;
    const colors = family.commander?.colors || [];
    if (activeColors.length && !activeColors.every((color) => colors.includes(color))) return false;
    const query = search.trim().toLowerCase();
    if (query) {
      const haystack = `${family.name} ${family.commander?.name || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
    if (sortBy === "record") {
      const ra = familyRecord(a);
      const rb = familyRecord(b);
      return (ra.wins - ra.losses - (rb.wins - rb.losses)) * dir;
    }
    if (sortBy === "revisions") return (a.revisions.length - b.revisions.length) * dir;
    return (familyUpdatedAt(a) - familyUpdatedAt(b)) * dir;
  });

  function setSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function toggleColor(color: string) {
    setColorFilter((value) => ({ ...value, [color]: !value[color] }));
  }

  function clearFilters() {
    setSearch("");
    setFormatFilter("all");
    setColorFilter({});
  }

  function arrowStyle(key: SortKey): CSSProperties {
    const active = sortBy === key;
    return { opacity: active ? 1 : 0, transform: active && sortDir === "asc" ? "rotate(0deg)" : "rotate(180deg)" };
  }

  const totalCount = savedMasterworks.length;
  const noResults = totalCount > 0 && sorted.length === 0;

  return (
    <section className="masterwork-archive" aria-label="Your private archive">
      <section className="masterwork-history">
        <header className="decks-header">
          <div>
            <div className="eyebrow"><span /> YOUR FORGE ARCHIVE</div>
            <h1>My Decks</h1>
            <p>{totalCount} deck{totalCount === 1 ? "" : "s"} forged</p>
          </div>
          <button type="button" className="decks-cta" onClick={startNewForge}>
            <PlusIcon /> Start a New Forge
          </button>
        </header>

        {totalCount > 0 && (
          <div className="decks-toolbar">
            <div className="decks-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search decks or commanders..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="decks-pip-filter">
              {COLOR_ORDER.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`decks-pip-btn ${colorFilter[color] ? "is-active" : ""}`}
                  style={{ "--pc": COLOR_ACCENT[color] } as CSSProperties}
                  onClick={() => toggleColor(color)}
                  aria-label={`Filter by ${COLOR_NAMES[color]}`}
                >
                  <i />
                </button>
              ))}
            </div>
            {formatOptions.length > 1 && (
              <select
                className="decks-select"
                value={formatFilter}
                onChange={(event) => setFormatFilter(event.target.value)}
                aria-label="Filter by format"
              >
                <option value="all">All Formats</option>
                {formatOptions.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            )}
            <select
              className="decks-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              aria-label="Sort decks"
            >
              <option value="updated">Sort: Updated</option>
              <option value="name">Sort: Name</option>
              <option value="record">Sort: Record</option>
              <option value="revisions">Sort: Revisions</option>
            </select>
            <button
              type="button"
              className="decks-dir"
              onClick={() => setSortDir((value) => (value === "asc" ? "desc" : "asc"))}
              aria-label="Toggle sort direction"
            >
              <ArrowIcon style={{ transform: sortDir === "asc" ? "rotate(0deg)" : "rotate(180deg)" }} />
            </button>
            <div className="decks-view-toggle">
              <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid view">
                <GridIcon />
              </button>
              <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List view">
                <ListIcon />
              </button>
            </div>
            <span className="decks-count">{sorted.length} of {totalCount} shown</span>
          </div>
        )}

        {totalCount === 0 ? (
          <div className="decks-empty">
            <div className="decks-empty-anvil"><AnvilIcon /></div>
            <h3>Your Forge Archive is empty</h3>
            <p>Build or review a deck and it will live here — sortable, filterable, and ready for its next revision.</p>
            <button type="button" className="decks-cta" onClick={startNewForge}>
              <PlusIcon /> Start a New Forge
            </button>
          </div>
        ) : noResults ? (
          <div className="decks-no-results">
            <p>No decks match your filters.</p>
            <button type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : view === "grid" ? (
          <div className="decks-grid">
            {sorted.map((family) => {
              const art = archiveFeaturedArt[family.id] ? cardArtCrop(archiveFeaturedArt[family.id]) : null;
              const colors = family.commander?.colors || [];
              const { wins, losses } = familyRecord(family);
              const occupancy = occupancyLabelsForOption(family.commander);
              const motif = dominantMotifFor(family);
              const MotifIcon = motif ? MOTIF_ICONS[motif] : null;
              const accent = resolveMasterworkVisualProfile({
                selectedRows: [],
                colors,
                revisionCount: family.revisions.length || 1,
              }).accent;
              return (
                <div
                  key={family.id}
                  role="button"
                  tabIndex={0}
                  className={`decks-card ${family.archived ? "is-sealed" : ""}`}
                  aria-label={`Open ${family.name}`}
                  onClick={() => openSavedMasterwork(family)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSavedMasterwork(family);
                    }
                  }}
                >
                  <div className="decks-card-art">
                    {art && <img src={art} alt="" />}
                    <div className="decks-card-pips">
                      {colors.map((color) => (
                        <i key={color} className="decks-mini-pip" style={{ "--pc": COLOR_ACCENT[color as keyof typeof COLOR_ACCENT] || COLOR_ACCENT.C } as CSSProperties} />
                      ))}
                    </div>
                    <span className={`decks-status ${family.archived ? "is-sealed" : ""}`}>
                      {family.archived ? "SEALED" : "IN PROGRESS"}
                    </span>
                    <button
                      type="button"
                      className="decks-delete"
                      aria-label={`Delete ${family.name}`}
                      title="Delete this deck permanently"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteSavedMasterwork(family.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="decks-card-body">
                    <small className="decks-card-meta">{family.format} · {family.path || "Forged Deck"}</small>
                    <strong className="decks-card-name">{family.name}</strong>
                    <span className="decks-card-commander">{family.commander?.name || "No commander"}</span>
                    {occupancy.length > 0 && (
                      <p className="decks-card-occupancy">Occupancy: {occupancy.join(" · ")}</p>
                    )}
                    {motif && MotifIcon && (
                      <span className="decks-motif-tag" style={{ "--motif-accent": accent } as CSSProperties}>
                        <MotifIcon size={11} /> {motif}
                      </span>
                    )}
                  </div>
                  <div className="decks-card-stats">
                    <div><span>Record</span><b>{wins}W · {losses}L</b></div>
                    <div><span>Revisions</span><b>{family.revisions.length || 1}</b></div>
                    <div><span>Updated</span><b>{relativeUpdated(familyUpdatedAt(family))}</b></div>
                  </div>
                  <div className="decks-card-footer">
                    <span className="decks-card-open">Open the Forge <OpenArrowIcon /></span>
                    <button
                      type="button"
                      className="decks-card-seal"
                      aria-label={family.archived ? `Return ${family.name} to the Forge` : `Preserve ${family.name} as finished`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFamilyArchived(family.id, !family.archived);
                      }}
                    >
                      {family.archived ? "Return to the Forge" : "Preserve as Finished"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="decks-table">
            <div className="decks-thead">
              <button type="button" className="decks-th is-sortable" onClick={() => setSort("name")}>
                Deck <ArrowIcon style={arrowStyle("name")} />
              </button>
              <span className="decks-th">Format</span>
              <span className="decks-th">Colors</span>
              <span className="decks-th">Status</span>
              <button type="button" className="decks-th is-sortable" onClick={() => setSort("record")}>
                Record <ArrowIcon style={arrowStyle("record")} />
              </button>
              <button type="button" className="decks-th is-sortable" onClick={() => setSort("updated")}>
                Updated <ArrowIcon style={arrowStyle("updated")} />
              </button>
              <span className="decks-th" />
            </div>
            {sorted.map((family) => {
              const art = archiveFeaturedArt[family.id] ? cardArtCrop(archiveFeaturedArt[family.id]) : null;
              const colors = family.commander?.colors || [];
              const { wins, losses } = familyRecord(family);
              return (
                <div
                  key={family.id}
                  role="button"
                  tabIndex={0}
                  className="decks-row"
                  aria-label={`Open ${family.name}`}
                  onClick={() => openSavedMasterwork(family)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSavedMasterwork(family);
                    }
                  }}
                >
                  <div className="decks-row-deck">
                    {art ? <img className="decks-row-art" src={art} alt="" /> : <span className="decks-row-art" />}
                    <div className="decks-row-name-wrap">
                      <span className="decks-row-name">{family.name}</span>
                      <span className="decks-row-commander">{family.commander?.name || "No commander"}</span>
                    </div>
                  </div>
                  <span className="decks-row-format">{family.format}</span>
                  <div className="decks-row-pips">
                    {colors.map((color) => (
                      <i key={color} style={{ "--pc": COLOR_ACCENT[color as keyof typeof COLOR_ACCENT] || COLOR_ACCENT.C } as CSSProperties} />
                    ))}
                  </div>
                  <span className={`decks-row-status ${family.archived ? "is-sealed" : ""}`}>
                    {family.archived ? "SEALED" : "IN PROGRESS"}
                  </span>
                  <span className="decks-row-record">{wins}W · {losses}L</span>
                  <span className="decks-row-updated">{relativeUpdated(familyUpdatedAt(family))}</span>
                  <button
                    type="button"
                    className="decks-delete"
                    aria-label={`Delete ${family.name}`}
                    title="Delete this deck permanently"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteSavedMasterwork(family.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
