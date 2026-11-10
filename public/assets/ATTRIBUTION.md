# Asset attribution

Visual chrome added for the forge, Learn, and deck pages. Only files the UI references are vendored.

## Scryfall mana symbols and set symbols

Vendored SVGs in `mtg/symbols/` and `mtg/sets/` are the public symbol files deckbuilders already request from Scryfall:

- Mana: `https://svgs.scryfall.io/card-symbols/{code}.svg`
- Sets: `https://svgs.scryfall.io/sets/{code}.svg` (`cmd`, `cmm`, `eoc`, `inr`, `one`)

Symbols that are not in that set still load from `svgs.scryfall.io` at runtime. Card faces stay on `cards.scryfall.io`, the same image host the site already used.

## Card back

`mtg/card-back.webp` is the standard Magic card back, saved from the public file deck sites already use:

https://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg

It is a 267×373 WebP. `backs.scryfall.io` returned 404 when this copy was made, so the file was taken from that public image instead of the dead CDN path.

The homepage forged-deck stills (`public/assets/forge/tripo/hero-deck-512.webp` and `hero-deck-1024.webp`) composite this card back, in a short stack with a slight fan, onto the Tripo hero anvil after the sword is removed. The anvil pixels remain the Tripo paid-user output described in `public/assets/forge/tripo/PROVENANCE.md`. The hammer swing uses the existing Tripo hammer prop (`prop_hammer-512.webp`). Sparks and the strike flash are CSS, not a separate asset.

## Poly Haven workshop textures (CC0 1.0)

Diffuse maps only, resized to 512×512 WebP. Normal and ARM maps were not shipped.

| File | Poly Haven asset | Author |
| --- | --- | --- |
| `workshop/dark-rock.webp` | [Dark Rock](https://polyhaven.com/a/dark_rock) | Amal Kumar |
| `workshop/stone-block-wall.webp` | [Stone Block Wall](https://polyhaven.com/a/stone_block_wall) | Amal Kumar |
| `workshop/castle-wall-slates.webp` | [Castle Wall Slates](https://polyhaven.com/a/castle_wall_slates) | Rob Tuytel |
| `workshop/metal-plate.webp` | [Metal Plate](https://polyhaven.com/a/metal_plate) | Rob Tuytel |
| `workshop/monastery-stone-floor.webp` | [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor) | Amal Kumar |
| `workshop/green-metal-rust.webp` | [Green Metal Rust](https://polyhaven.com/a/green_metal_rust) | Rob Tuytel |
| `workshop/rusty-metal.webp` | [Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02) | Rob Tuytel |

Poly Haven assets are CC0 1.0. https://polyhaven.com/license

## Kenney

The attached Kenney Board Game Icons pack (1.1) is CC0. It was checked for a pause or anvil mark and does not include either, so none of those icons are shipped. https://www.kenney.nl

## Ghost marks

Pause and Step use the existing Tripo anvil still (`public/assets/forge/tripo/hero-512.webp`). The smoked-glass veil and wax rim on a ghost pick are drawn in CSS. Kenney's board-game pack has no separate anvil or pause glyph, so none of those icons are shipped.
