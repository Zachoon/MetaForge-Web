"use client";

import { cardArtCrop } from "../../card-art";
import { occupancyLabelsForOption } from "../../commander-lane-scoring.mjs";
import { useForgeSession } from "../../forge-session-context";

export function ArchiveChamber() {
  const {
    savedMasterworks,
    archiveFeaturedArt,
    openSavedMasterwork,
    setFamilyArchived,
    deleteSavedMasterwork,
    startNewForge,
  } = useForgeSession();

  return (
    <section className="masterwork-archive" aria-label="Your private archive">
      <section className="masterwork-history">
        <header>
          <div>
            <small>YOUR PRIVATE ARCHIVE</small>
            <h2>Return to a deck</h2>
          </div>
          <span>{savedMasterworks.length} SAVED</span>
        </header>
        {savedMasterworks.length > 0 ? (
          <div>
            {savedMasterworks.map((family) => {
              const evidence =
                family.record || family.revisions.at(-1)?.evidence || {};
              const occupancy = occupancyLabelsForOption(family.commander);
              return (
                <article key={family.id} className={family.archived ? "finished" : ""}>
                  <button
                    className="history-open"
                    onClick={() => openSavedMasterwork(family)}
                  >
                    {archiveFeaturedArt[family.id] && (
                      <img src={cardArtCrop(archiveFeaturedArt[family.id])} alt="" />
                    )}
                    <small>
                      {family.archived ? "FINISHED MASTERWORK · " : ""}
                      {family.format} · {family.path || "FORGED DECK"}
                    </small>
                    <strong>{family.name}</strong>
                    <span>{family.commander?.name || "No commander"}</span>
                    {occupancy.length > 0 && (
                      <p className="archive-occupancy">Occupancy: {occupancy.join(" · ")}</p>
                    )}
                    <em>
                      {Number(evidence.wins || 0)}W ·{" "}
                      {Number(evidence.losses || 0)}L ·{" "}
                      {family.revisions.length} revision
                      {family.revisions.length === 1 ? "" : "s"}
                    </em>
                  </button>
                  {family.archived ? (
                    <button
                      className="history-restore"
                      onClick={() => setFamilyArchived(family.id, false)}
                      aria-label={`Return ${family.name} to the Forge`}
                    >
                      Return to the Forge
                    </button>
                  ) : (
                    <button
                      className="history-finish"
                      onClick={() => setFamilyArchived(family.id, true)}
                      aria-label={`Preserve ${family.name} as finished`}
                    >
                      Preserve as Finished
                    </button>
                  )}
                  <button
                    className="history-delete"
                    onClick={() => deleteSavedMasterwork(family.id)}
                    aria-label={`Delete ${family.name}`}
                  >
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-archive">
            No decks saved yet. Build or review a deck and it will live here.
          </p>
        )}
        <footer>
          <button type="button" className="new-forge" onClick={startNewForge}>
            ＋ Start a New Forge
          </button>
        </footer>
      </section>
    </section>
  );
}
