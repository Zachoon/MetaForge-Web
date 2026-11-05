// Pure helpers for the shared card inspector: where the hover preview sits,
// and what a Scryfall card payload is allowed to show.

const CARD_RATIO = 88 / 63;

export function cardNameFromScryfallSrc(src) {
  try {
    const url = new URL(src, "https://api.scryfall.com");
    if (!url.pathname.includes("/cards/named")) return "";
    return url.searchParams.get("exact") || "";
  } catch {
    return "";
  }
}

export function inspectTargetFromElement(node) {
  if (!node || typeof node.closest !== "function") return null;
  const named = node.closest("[data-card-name]");
  if (named) {
    const name = named.getAttribute("data-card-name") || "";
    if (!name) return null;
    const price = Number(named.getAttribute("data-card-price"));
    return {
      name,
      priceUsd: Number.isFinite(price) ? price : null,
      defer: named.getAttribute("data-card-inspect") === "defer" || Boolean(named.closest("[data-card-inspect='defer']")),
      element: named,
    };
  }
  const image = node.closest("img");
  const fromSrc = image ? cardNameFromScryfallSrc(image.getAttribute("src") || image.src || "") : "";
  if (!fromSrc) return null;
  return {
    name: fromSrc,
    priceUsd: null,
    defer: Boolean(image.closest("[data-card-inspect='defer']")),
    element: image,
  };
}

/** Fine-pointer hover shows the preview. Touch and coarse pointers only tap. */
export function hoverPreviewAllowed(mediaMatches, pointerType) {
  if (pointerType === "touch") return false;
  return Boolean(mediaMatches);
}

export function placePreview(cursor, size, viewport, gap = 16) {
  const margin = 8;
  const width = Math.min(size.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(size.height, Math.max(0, viewport.height - margin * 2));
  const covers = (left, top) => cursor.x >= left && cursor.x <= left + width && cursor.y >= top && cursor.y <= top + height;
  let left = cursor.x + gap;
  let top = cursor.y + gap;
  if (left + width > viewport.width - margin || covers(left, top)) left = cursor.x - gap - width;
  if (top + height > viewport.height - margin || covers(left, top)) top = cursor.y - gap - height;
  left = Math.min(Math.max(margin, left), Math.max(margin, viewport.width - width - margin));
  top = Math.min(Math.max(margin, top), Math.max(margin, viewport.height - height - margin));
  return { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) };
}

export function previewBox(faceCount, viewport) {
  const margin = 12;
  const availW = Math.max(120, viewport.width - margin * 2);
  const availH = Math.max(120, viewport.height - margin * 2);
  const faces = faceCount >= 2 ? 2 : 1;
  const sideBySide = faces === 2 && availW >= 680;
  let faceW = Math.min(320, sideBySide ? Math.floor((availW - 12) / 2) : availW);
  let faceH = faceW * CARD_RATIO;
  const rows = sideBySide ? 1 : faces;
  const cols = sideBySide ? 2 : 1;
  const gap = 8;
  if (faceH * rows + gap * (rows - 1) > availH) {
    faceH = (availH - gap * (rows - 1)) / rows;
    faceW = Math.min(faceW, faceH / CARD_RATIO);
  }
  return {
    layout: sideBySide ? "row" : "column",
    faceW: Math.round(faceW),
    faceH: Math.round(faceH),
    width: Math.round(faceW * cols + gap * (cols - 1)),
    height: Math.round(faceH * rows + gap * (rows - 1)),
  };
}

function faceImage(face) {
  return face?.image_uris?.normal || face?.image_uris?.large || face?.image_uris?.small || "";
}

/** Oracle, type, mana, both faces. Prices are ignored; the caller already has them or it doesn't. */
export function inspectViewFromScryfall(card) {
  if (!card || typeof card !== "object") return null;
  const rawFaces = Array.isArray(card.card_faces) ? card.card_faces : [];
  const faced = rawFaces
    .map((face) => ({
      name: face?.name || card.name || "",
      image: faceImage(face),
      oracle: face?.oracle_text || "",
      typeLine: face?.type_line || "",
      manaCost: face?.mana_cost || "",
    }))
    .filter((face) => face.image || face.oracle || face.name);
  const frontImage = card.image_uris?.normal || card.image_uris?.large || faced[0]?.image || "";
  const faces = faced.filter((face) => face.image).length >= 2
    ? faced.filter((face) => face.image)
    : [{
        name: card.name || "",
        image: frontImage,
        oracle: card.oracle_text || faced.map((face) => face.oracle).filter(Boolean).join("\n//\n"),
        typeLine: card.type_line || faced[0]?.typeLine || "",
        manaCost: card.mana_cost || faced[0]?.manaCost || "",
      }];
  const legality = card.legalities?.commander;
  return {
    name: card.name || faces[0]?.name || "",
    typeLine: card.type_line || faces.map((face) => face.typeLine).filter(Boolean).join(" // "),
    manaCost: card.mana_cost || faces.map((face) => face.manaCost).filter(Boolean).join(" // "),
    oracle: card.oracle_text || faces.map((face) => face.oracle).filter(Boolean).join("\n//\n"),
    commander: legality === "legal" ? "Legal in Commander" : legality ? "Not legal in Commander" : "Commander legality unavailable",
    legal: legality === "legal",
    faces,
  };
}
