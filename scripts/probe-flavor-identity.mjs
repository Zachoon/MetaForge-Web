#!/usr/bin/env node
// One-shot live probe for A4 flavor identity (not a CI gate).
import {
  buildResolvedCardIdentity,
  oracleFieldsFromRawCard,
  pickAuthoritativeCardMatch,
} from "../app/card-identity.mjs";

const UA = {
  Accept: "application/json",
  "User-Agent": "MetaForge/0.1 (+https://metaforge-private-alpha.metaforge-labs.workers.dev)",
};

async function resolve(name) {
  const q = `!"${name}" OR flavor_name:"${name}" OR name:"${name}"`;
  const search = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards`,
    { headers: UA },
  );
  if (search.ok) {
    const payload = await search.json();
    const picked = pickAuthoritativeCardMatch(name, payload.data || []);
    if (picked.card) {
      const id = buildResolvedCardIdentity({
        inputName: name,
        rawCard: picked.card,
        resolutionKind: picked.resolutionKind,
      });
      const fields = oracleFieldsFromRawCard(picked.card);
      return {
        inputName: name,
        ok: true,
        resolutionKind: id.resolutionKind,
        displayName: id.displayName,
        canonicalName: id.canonicalName,
        oracleId: id.oracleId,
        typeLine: fields.typeLine,
        rulesPreview: fields.oracleText.slice(0, 120),
      };
    }
    return { inputName: name, ok: false, reason: picked.reason };
  }
  const fuzzy = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
    { headers: UA },
  );
  if (fuzzy.ok) {
    const raw = await fuzzy.json();
    const accepted = pickAuthoritativeCardMatch(name, [raw]);
    if (accepted.card) {
      const id = buildResolvedCardIdentity({
        inputName: name,
        rawCard: accepted.card,
        resolutionKind: accepted.resolutionKind,
      });
      return { inputName: name, ok: true, via: "fuzzy", ...id };
    }
    return { inputName: name, ok: false, reason: "fuzzy_rejected", fuzzyName: raw.name };
  }
  return { inputName: name, ok: false, reason: "not_found", status: fuzzy.status };
}

const names = [
  "Black Panther's Claws",
  "Megatron",
  "Skybreaker, Sword of Bashenga",
  "Tony's Favorite Rock",
];

for (const name of names) {
  // eslint-disable-next-line no-await-in-loop
  console.log(JSON.stringify(await resolve(name), null, 2));
  // eslint-disable-next-line no-await-in-loop
  await new Promise((r) => setTimeout(r, 150));
}
