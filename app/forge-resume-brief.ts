import type { CommanderOption } from "./forge-types";

export type ForgeResumeBrief = {
  version: 1;
  format: string;
  strategy: string;
  complexity: string;
  budget: string;
  maxCardPriceInput: string;
  commonsOnly: boolean;
  targetPowerTier: string;
  commissionNote: string;
  reviewFocus: string;
  deck: string;
  commander: CommanderOption | null;
  secondCommander: CommanderOption | null;
};

export function encodeForgeResumeBrief(brief: ForgeResumeBrief) {
  const bytes = new TextEncoder().encode(JSON.stringify(brief));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeForgeResumeBrief(value: string): ForgeResumeBrief | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed?.version === 1 ? parsed as ForgeResumeBrief : null;
  } catch {
    return null;
  }
}
