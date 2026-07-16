# Art direction — 2D grammar

> The written art *standard* (not a moodboard). Every icon, enemy, item, and
> background obeys one grammar so the product reads as **one system**, not a
> collage. The collage feeling is exactly what reads as "AI-slop"; this doc kills
> it. Mascot rules are separate: [MASCOT-CANON](./MASCOT-CANON.md).

## The thesis

**APN Idle is 2D Patchline editorial-action, not a generic cyberpunk battler.**
Flat-shaded, crisp-outlined, dark editorial night. No 3D toy gloss, no fantasy
clutter, no random sci-fi kit look.

## One grammar for everything

| Element | Rule |
|---------|------|
| Outline | 2px outer line at @1×; dark ink/bordo, **not** pure black. Consistent everywhere. |
| Fill | 2-tone flat + 1 controlled spec highlight. No gradients-as-lighting. |
| Shadow | Single grounded oval drop, 18–22% opacity. Same model on every asset. |
| Perspective | Same ¾ editorial angle as the mascot render lock. |
| Palette | Tokens only ([DESIGN-TOKENS](./DESIGN-TOKENS.md)); crimson is primary, not ambient. |
| Icon stroke | 2px @1× equivalent, rounded terminals, minimal interior detail. |

If two assets sit next to each other and look like they came from different asset
packs, one of them is wrong.

## Icon system

- Master: 96×96 SVG (+PNG). Runtime: 48×48 and 72×72.
- Stroke weight constant across the whole set; rounded terminals; low interior
  detail. Build-panel icons live in `js/icons.js` (SVG) — new icons match this set.
- Feed / ticker game marks (`assets/icons/*.svg`) are simplified atmosphere marks,
  **not** official partner logos.
- Both inline and feed marks are monochrome `currentColor` outlines: 2px stroke,
  rounded caps/joins, no internal gradient, and at most four shapes. Rarity and
  state color belong to the containing component, never the icon file.

### Equipment slot icons (UI marks, distinct from item art)

| Slot | Icon | Meaning |
|------|------|---------|
| Weapon | Scanner | main scan tool |
| Offhand | Seal | verification / archive mark |
| Chest | Patch Mail | doc armor |
| Arms | Link Gloves | connection / precision |
| Legs | Route Leggings | mobility / sprint |
| Feet | Archive Boots | pickup / traversal |
| Utility | Cache Belt | loot / storage / drop chance |
| Head mod | Visor Coil | crit / scan cone / focus |

## Item art — APN editorial techwear (not fantasy loot)

Every item is drawn in **one of three material families** only:

- **Matte polymer** · **laminated paper** · **anodized metal**.
- **Banned:** leather, cloth, fantasy runes, magic crystals — any non-APN material.

Reference item set (slot · direction):

| Item | Slot | Direction |
|------|------|-----------|
| Mod Stick Mk I | Weapon | thin baton, beam node tip, matte black |
| Scanner Lash | Weapon | curved beam wand, aggressive tip (burst build) |
| Patch Mail Vest | Chest | laminated crimson document panels |
| Press Plate | Chest | hardened archive chest, elite |
| Link Gloves | Arms | neon node fingertips, precision |
| Route Leggings | Legs | segmented leg guard, gold speed-line accent |
| Archive Boots | Feet | light courier boot, pickup-focused |
| Cache Belt | Utility | capsule + note-cartridge belt |
| Source Seal | Offhand | verification stamp / buckler hybrid |
| Visor Coil | Head mod | ring module behind the visor |
| Overdrive Core | Utility | crimson-magenta chest pulse core |
| Publisher Satchel | Utility | courier bag = Notes→Rep symbol |

The shipped Gear sheet already names Mod Stick, Patch Mail, Sprint Leggings, etc. —
keep those names, raise the *art* to this standard.

## Game Pack target families

Each ten-zone Game Pack uses a recognizable game-specific cast as research input,
then redraws it as **APN-owned runtime art**. The source fantasy must read at a
glance, but official logos, source screenshots, traced poses, and untouched
third-party assets never ship. Every pack shares the same outline, two-tone fill,
ground shadow, scale ladder, direction, and pivot contract; see
[GAME-PACK-ASSET-BIBLE](../docs/GAME-PACK-ASSET-BIBLE.md).

| Role | Pack requirement | Shared APN treatment |
|------|------------------|----------------------|
| Common A/B/C | three immediately distinct small silhouettes | 72 px proof, limited interior detail |
| Champion / elite | one signature role or creature | one controlled accent and stronger stance |
| Event target | one boss-foreshadowing encounter | pack-specific prop, same combat footprint |
| Boss | one unmistakable pack finale | 128 px proof, readable break state |

Legacy Feed Noise, Broken Link, Patch Note, Fake Leak, and Version Gate remain
fallback silhouettes when an optional pack asset fails to load; they are not the
long-form content scheduler.

## Backgrounds — APN, not generic neon

Replace "neon gradient + circle + city silhouette" with three authored parallax
layers per Game Pack. Each environment carries its source fantasy through layout
and props while APN signal rails, stage framing, palette discipline, and shared
ink treatment make the Route coherent. Current procedural `render.js` biomes are
temporary fallbacks, not the target system.

## Seasonal swaps (optional layer)

Per feed theme: 4 micro-background swaps + elite accent sets, all still inside this
grammar. Themes must not break silhouette or outline consistency.

## Export & sizing

See [ART-PIPELINE](../docs/ART-PIPELINE.md) and [PERF-BUDGET](../docs/PERF-BUDGET.md).
Masters PNG/PSD/SVG; runtime WebP atlases. Trim on, **pivot preserved**.
