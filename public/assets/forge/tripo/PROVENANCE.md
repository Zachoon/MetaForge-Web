# Tripo forge assets — provenance and license

Shipped files in this folder are transparent WebP stills (512 and 1024) plus one animated turntable. GLB meshes were not added. These are original MetaForge motifs (anvil, sun, wave, moon and skull, flame, oak leaf, hammer, tome, mana crystal), not Wizards of the Coast mana symbols.

## Account

Generated with Tripo AI (`text_to_model`, model version `v3.0-20250812`, texture and PBR, face limit 20000) on a paid account. Credits were purchased. Owner confirmation: paid account, 31 Oct 2026.

Negative prompt: `text, letters, logo, watermark, card frame, playing card` (v2 regens also `grey, plain`). Renders: Blender 4.2 EEVEE, transparent, AgX, warm key / verdigris fill / copper rim to match the site palette (`#0a1210` background, `#72c7b5` verdigris, `#dc8840` copper, `#c9b89a` brass, `#eee9df` ivory).

Credit ledger from the generation run: start 500, used 230 (9×20 plus hero v2 detailed texture 30 plus crystal v2 20), remaining 270. Per task: 20 for v3.0 textured, plus 10 for detailed texture.

## License

Tripo paid-user terms (tripo3d.ai/terms, last updated 11 July 2025), section 5.2.2: paid users generally hold the rights to use, copy, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, promote, transfer, authorize and license the inputs and outputs, subject to a royalty-free, perpetual, irrevocable, worldwide, non-exclusive license granted back to Tripo for operating the service.

Section 3.2 allows lawful commercial or non-commercial use of outputs. Outputs are not exclusive and may not be entirely unique. Free-user outputs are not covered by this note; these files were produced on the paid account above.

## Assets

| Id | Files | Task id | Placement |
| --- | --- | --- | --- |
| hero | `hero-512.webp`, `hero-1024.webp`, `hero-turntable-512.webp` | `f1b79b41-29bc-4540-a25c-8d0248660b19` (rejected v1 `70e14ae5-8cce-4209-89ea-2cfe71999851`) | Homepage hero beside the headline. 512 on phones, 1024 on desktop. Turntable only when motion is allowed and the viewport is not a small phone. |
| emblem_w | `emblem_w-512.webp`, `emblem_w-1024.webp` | `8ba15c4f-f03d-48de-86e0-7843007ae71e` | White color-identity chip. |
| emblem_u | `emblem_u-512.webp`, `emblem_u-1024.webp` | `b761ea47-3e9c-4e02-bdda-eb7a6ded6258` | Blue color-identity chip. |
| emblem_b | `emblem_b-512.webp`, `emblem_b-1024.webp` | `a476264a-a168-48e7-9ef9-62ac64a46dae` | Black color-identity chip. Do not draw this emblem below 32px; the moon and skull turn muddy. |
| emblem_r | `emblem_r-512.webp`, `emblem_r-1024.webp` | `d3f6b71d-8545-455c-82f5-3571c7ca62bb` | Red color-identity chip. |
| emblem_g | `emblem_g-512.webp`, `emblem_g-1024.webp` | `61243908-5a25-4dd6-9603-ba3dd23d7bde` | Green color-identity chip. |
| prop_hammer | `prop_hammer-512.webp`, `prop_hammer-1024.webp` | `a06968ea-d73a-4748-8c37-a1dab155b5b5` | "What to fix first" plan panel. |
| prop_crystal | `prop_crystal-512.webp`, `prop_crystal-1024.webp` | `7c526c9d-04b5-46a9-b3e4-3ec2b6452981` (rejected v1 `a004f19b-17fe-4cb2-a40f-3c386d848ae1`) | Mana-base coach. |
| prop_tome | `prop_tome-512.webp`, `prop_tome-1024.webp` | `873bdb67-0979-4352-864e-725d38763d38` | Academy and Commander Guides cards, and coach explanation panels. |

### Prompts

- **hero.** A massive ornate fantasy blacksmith anvil made of dark blackened iron with copper and bronze filigree inlays and teal verdigris patina, a glowing red-hot orange sword blade lying across its top, bright glowing embers, mounted on a carved bronze-banded tree stump, heroic stylized game-art collectible centerpiece. Texture quality: detailed.
- **emblem_w.** A round aged-bronze medallion emblem with a raised radiant sunburst of ivory and pale gold rays, teal verdigris patina on the rim, stylized fantasy badge, thick coin shape, clean readable silhouette.
- **emblem_u.** A round aged-bronze medallion emblem with a raised stylized ocean wave curl in deep blue enamel, teal verdigris patina on the rim, stylized fantasy badge, thick coin shape, clean readable silhouette.
- **emblem_b.** A round aged-bronze medallion emblem with a raised crescent moon over a small skull shape in black and violet enamel, teal verdigris patina on the rim, stylized fantasy badge, thick coin shape, clean readable silhouette.
- **emblem_r.** A round aged-bronze medallion emblem with a raised stylized flame in glowing red-orange enamel, teal verdigris patina on the rim, stylized fantasy badge, thick coin shape, clean readable silhouette.
- **emblem_g.** A round aged-bronze medallion emblem with a raised stylized oak leaf in rich green enamel, teal verdigris patina on the rim, stylized fantasy badge, thick coin shape, clean readable silhouette.
- **prop_hammer.** A stylized blacksmith forging hammer with a dark iron head, copper bands and a worn leather-wrapped wooden handle, faint glowing ember on the striking face, fantasy game prop, clean silhouette.
- **prop_tome.** A thick closed leather spellbook tome with aged bronze corner guards and a glowing teal gemstone clasp on the cover, fantasy game prop, clean silhouette.
- **prop_crystal.** A cluster of bright luminous translucent cyan mana crystals glowing from within, faceted gemstone shards rising from a small ornate copper and bronze base, magical fantasy game prop, vivid glow.

## Load rules

- Chips, props, and the hero still are lazy. The hero still is not the largest paint (the headline and the living-forge panel are), so it is not eager-loaded.
- `sizes` selects `hero-512.webp` on phones and `hero-1024.webp` on desktop.
- `hero-turntable-512.webp` (~1 MB, 48 frames) loads only when the viewport is at least 761px wide, `prefers-reduced-motion` is not set, and the in-app motion setting is full. Otherwise the static hero is shown.
- Emblems are drawn from the 512 files at 32px or larger. The 1024 files are kept as the master stills.
