import { CANDIDATES } from "./forge-candidate.mjs";

export const FORGE_THEORY = {
  ...CANDIDATES[1],
  name: "Forge Theory · Mjölnir Tempo Pivot",
  deckText: CANDIDATES[1].deckText.replace("4 Fire Magic", "2 Fire Magic\n2 Mjölnir, Hammer of Thor"),
  sideboardText: CANDIDATES[1].sideboardText.replace("3 Mjölnir, Hammer of Thor", "1 Mjölnir, Hammer of Thor\n2 Fire Magic"),
};
