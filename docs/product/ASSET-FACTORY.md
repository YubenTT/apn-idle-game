> **Imported V3 design authority** — reviewed baseline `efc5f22`, subordinate to plan v2 per the law stack (owner answers → AUDIT → plan v2 → *these V3 docs, as reconciled* → code). Terminology, rights-taxonomy, prestige-model and display-name deltas are recorded in [RECONCILIATION.md](./RECONCILIATION.md); where this document and plan v2 disagree, **plan v2 wins**. Imported verbatim in PR-0 (issue #17) — the body is *not* rewritten to match plan v2; the reconciliation layer carries the overrides.

---

# Asset Factory — One Host Canon, Infinite Original Packs

## Two separate pipelines

1. **Host:** deterministic brand asset, single-source from canonical GLB.
2. **Echo Packs:** expandable original content; controlled image generation is allowed under strict review/provenance gates.

Mixing these pipelines creates mascot drift and an AI-slop collage.

## Host production lock

The canonical GLB owns head/body proportions, visor, limbs, perspective, pivot and silhouette.

| Field | Standard |
|---|---|
| camera | orthographic; Y 18° for ¾, exact 90° side; X tilt 8–10° |
| pivot | foot-center; drift ≤1 px |
| master frame | 192×192 or 256×256; trim with pivot metadata |
| lighting | broad upper-left key, 35% fill, rim ≤15%; no head hotspot |
| material | two-tone diffuse + one controlled edge highlight |
| outline | 2 px @1× dark ink/burgundy, not pure black |
| shadow | fixed oval, 18–22% opacity |
| bloom | prohibited |
| runtime | WebP atlas + JSON |
| actual-size QA | 72, 104, 128, 192 px |
| target Run presentation | 104–120 CSS px |

Minimum clips:

```text
idle · run · scan_start · scan_fire · scan_recover · hotfix
priority_tag · tracker_loop · overclock_loop · sprint
gear_pull · drop_ship
```

Image generation may create pose thumbnails, motion arcs, FX studies and storyboards. It may not ship regenerated Host bodies, different visors/proportions, “cute/fit/realistic/toy” reinterpretations or frame-by-frame AI animation without deterministic pivot control.

Fail-fast order:

```text
neutral front/¾/side/back identity
→ actual-size identity
→ pose keyframes
→ motion loops
→ pivot/visor stability
→ atlas
```

A failed earlier gate is fixed; it is never buried under more generated output.

## Echo Pack factory

### 1. Evidence brief

Factual sources, broad mechanic observations, desired player emotion, forbidden motifs, APN art grammar and runtime sizes. Reference names may exist in the evidence document.

### 2. Abstraction

Convert protected specifics into owned design language.

```text
observation: tactical smoke control
abstract mechanic: ordered target + visibility state
original role: Smoke Node
original environment: signal rail with obscured verification windows
forbidden: agents, official smoke shapes, maps, weapons, icons, UI
```

### 3. Prompt compiler

Production visual prompts contain no third-party game/brand name.

```text
Original APN Echo Pack game asset.
Subject: [original role/behavior].
Silhouette: [shape grammar].
View: fixed ¾ editorial angle, orthographic.
Style: flat 2D, two-tone fill, one controlled highlight,
2 px dark-ink outline, transparent background, clear at 72 px.
Exclude logos, marks, recognizable characters/costumes/weapons/maps/UI,
photorealism, toy gloss, bloom and gradients-as-lighting.
```

### 4. Bounded generation

Per family:

- 12 target candidates;
- 6 boss candidates;
- 6 environment keyframes;
- 8 props/FX candidates.

A new batch requires a written rejection diagnosis: silhouette, role read, palette, originality or technical fit.

### 5. Similarity and rights review

Automated warnings:

- perceptual duplicate checks;
- optional embedding comparison to curated forbidden references;
- OCR/text and logo/mark detection;
- palette/trade-dress flags.

Human reviewers own the decision. Reject when a specific franchise/character is immediately named from the asset alone, recognition is carried by a signature prop/costume/map/UI, the asset appears official, or it needs a disclaimer to feel safe.

### 6. Cleanup

Normalize silhouette, outline, shadow, palette, pivot and trim; remove generated text/microdetail; prove role without color; archive selection/contact-sheet evidence.

### 7. Pack export

```text
assets/echo-packs/<id>/
  pack.json
  source-board.md
  originality-brief.md
  provenance.json
  environment-far.webp
  environment-mid.webp
  environment-ground.webp
  targets.webp
  targets.json
  boss.webp
  fx.webp
  fallback.webp
  contact-sheet.jpg
```

Warm Pack budgets:

| group | maximum |
|---|---:|
| far + mid + ground | 160 KB |
| target atlas | 140 KB |
| boss + FX | 100 KB |
| props/UI accents | 50 KB |
| metadata/provenance | 25 KB |
| **total** | **475 KB** |

Only current and next Pack decode; prior Packs retain lightweight metadata.

### 8. Provenance

Each approved asset records asset ID/SHA-256, tool/model, prompt hashes, timestamp, source-board IDs, edits/editor, reviewer/decision, rights mode, catalog version and optional C2PA/Content Credentials reference. Provenance makes the chain auditable; it does not automatically confer quality or legal clearance.

### 9. QA

- 72 px common and 128 px boss silhouette;
- grayscale and color-vision checks;
- text/logo scan;
- outline coherence;
- pivot/combat proof;
- reduced-motion fallback;
- low-memory decode;
- adjacent-asset contact sheet;
- originality/rights review;
- no official/endorsed confusion.

## Factory proof

Do not regenerate the entire catalog first. Prove the same system on:

1. Tactical Echo — hard-surface/tactical;
2. Floodlight XI — sports/timing;
3. Fashion Dream — bright fashion/style-chain.

If all three pass one schema, mechanic library, art grammar, memory budget and runtime without Pack-specific code, the factory is truly scalable.
