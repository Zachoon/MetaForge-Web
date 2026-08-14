/** Scryfall image URL builders — shared by any surface that needs card art. */
export const cardImage = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=normal`;
/** Square illustration crop for commander portraits/signature-card strips — intentional, readable on mobile. */
export const cardArtCrop = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=art_crop`;
