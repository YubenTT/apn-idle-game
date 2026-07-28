# GAF2D Authored Motion for APN Idle

Date: 2026-07-28

Status: Final. The owner delegated final technical review and implementation on 2026-07-28.
Exact GAF2D identity, motion, rig, and release approvals remain human gates.

## Goal

Replace first-pack sliding target cells with readable character-owned 2D motion, and replace the
current Hero art with clips that preserve the owner's exact legless, floating APN Hero identity.

The path stays deterministic, local, provider-free, 3D-free, hash-locked, Canvas-only, and
dependency-free at runtime.

## Correct diagnosis

The current first-pack renderer changes x-position, bob, and squash while repeatedly sampling one
static atlas cell. This is movement, not authored character motion.

The current Hero still loads the old eight V3 atlases. The unapproved GAF2D candidate added legs
that do not exist in the owner's supplied identity reference and cannot be integrated.

This specification supersedes the runtime-motion portions of:

- `docs/superpowers/specs/2026-07-26-gaf2d-valorant-creatures-design.md`;
- `docs/decisions/ADR-0013-gaf2d-static-creature-atlas.md`.

The fixed cast, original-IP restrictions, source hashes, wave mapping, and role names remain valid.
A new ADR records the replacement; history is not rewritten.

## Fixed scope

Exactly seven identities:

- `apn-hero`;
- `entry-runner`;
- `veil-operator`;
- `signal-hunter`;
- `site-sentinel`;
- `protocol-courier`;
- `site-warden`.

No skins, recolors, wave variants, extra creatures, 3D assets, or automatic rig authoring.
`site-warden` owns its broken phase as part of the same asset.

## Future character rule

This delivery never grows by silently copying one of the seven records. A later character needs:

1. one new portable asset ID and one explicit pack role;
2. one GAF2D asset with an explicit `static` or `authored` declaration;
3. one exact identity approval and, for authored delivery, one complete named motion-set approval;
4. one pack-owned descriptor hash plus one descriptor-owned atlas hash;
5. role-derived clip/budget requirements, including `broken` and the boss decoded class when the
   pack declares that identity as its boss;
6. current/next-route, first-playable, fallback, reduced-motion, and real-browser gates.

No array index, filename resemblance, previous character name, runtime bob, or old approval can
satisfy any of those fields.

## Authoring contract

GAF2D owns manifests, hashes, approvals, QA, and exports. APN-specific masks, pivots, draw order,
pose curves, and recipes live in the sibling APN GAF2D project.

Each character is approved as one named motion set, not as unrelated per-clip approvals and not as
one walk cycle standing in for the other clips.
The generic GAF2D `MotionSetApproval` hash-locks every required clip, frame, order, timing,
playback mode, and review hash in one human action.

The deterministic local compositor consumes:

- one exact approved, single-subject, platform-free identity image;
- manually reviewed alpha masks for movable parts;
- explicit draw order and normalized pivots;
- fixed per-frame part-pose transforms, clip timing, and deformation bounds;
- a fixed canvas, sampling mode, color mode, and encoder toolchain.

It emits transparent PNG frames, actual-size previews, and contact sheets for GAF2D ingest.
Automatic segmentation may prepare a candidate mask but can never pass the visual gate by itself.
The compositor cannot approve its own identity, rig, acting, loop, deformation, or release.

Turnarounds and contact sheets are comparison evidence only. The
image-conditioned motion source is exactly one isolated character in the
intended gameplay camera and neutral starting pose. Its bytes must match the
current identity approval before a provider can be constructed or contacted.
Display bases, stands, pedestals, floors, cast shadows, reflections, underglow,
labels, and checkerboards are prohibited in candidate and frame pixels. A
renderer-owned gameplay shadow may be drawn separately and is not part of the
character atlas, pivot, or approval hash.

Every recipe must lock:

- immutable identity-source hash;
- part names, masks, pivots, and z-order;
- maximum translation, rotation, and non-uniform scale per part;
- silhouette and ground-contact tolerances;
- clip frame count, FPS, playback, and deterministic phase;
- the exact tool versions and command arguments.

## Hero identity and clips

Identity authority is the owner-supplied nine-view APN Hero reference. The operator provides that
file through an explicit local CLI argument; only its SHA-256 enters portable project metadata.
The private path and source bytes never enter this repository.

The accepted Hero has a glossy red spherical head, one integrated matte-black wraparound visor, a
legless red capsule torso, and two short detached capsule arms. It has no hands, feet, shoes, knees,
neck, mouth, facial features, accessories, or platform.

Local extraction must reject gray-background halos and preserve visor geometry, red material
continuity, gloss placement, and the legless silhouette at actual gameplay size.

`apn-hero` keeps the editable-rig lane and requires exact identity, motion, and rig approvals.
Its runtime interface remains:

```text
assets/mascot/v3/set.json
assets/mascot/v3/{clip}.webp
assets/mascot/v3/{clip}.json
```

`set.json` is the only set-generation authority. It labels the current shipped
bytes honestly as `historical` with null lineage/toolchain, or a replacement as
`approved` only when exact identity, complete motion-set, rig, export, every
clip-file hash, and the recorded derivative toolchain all validate. The 17-file
approved directory is published atomically; generations cannot mix.

The Hero blitter reconstructs the full untrimmed-frame pivot after the shared
union crop. With `scale = targetHeight / trim.height`, destination coordinates
are `(trim.x - frameWidth × anchor.x) × scale` and
`(trim.y - frameHeight × anchor.y) × scale`. Treating the anchor as local to
the trimmed rectangle, or subtracting the trim offset twice, shifts the Hero
and makes it float; runtime QA locks this geometry for historical and approved
descriptor shapes.

| Clip | Frames | Playback |
|---|---:|---|
| `idle` | 8 | loop |
| `run` | 10 | loop |
| `attack` | 8 | progress |
| `crit` | 8 | progress |
| `sprint` | 10 | loop |
| `hit` | 4 | progress |
| `death` | 8 | progress |
| `celebrate` | 8 | loop |

`run` and `sprint` mean forward hover/propulsion. Motion comes from arm swing, head/body
counter-rotation, restrained vertical displacement, anticipation, recovery, and
silhouette-preserving squash—never added legs.

## Creature clips and semantics

Every creature owns:

| Clip | Frames | Playback |
|---|---:|---|
| `idle` | 8 | loop |
| `advance` | 8 | loop |
| `engaged` | 6 | loop |
| `hit` | 4 | progress |
| `death` | 8 | progress |

`site-warden` additionally owns an 8-frame looping `broken` clip.

`engaged` is deliberate: enemies do not execute a domain attack in the current game. It represents
the close-range brace/reaction while the Hero attacks and must not imply enemy damage timing.

Clip precedence is exact:

```text
death > hit > broken > advance > engaged > idle
```

Loops use simulation time plus a stable per-entity phase; progress clips use the existing hit/death
progress clocks. Frame choice never depends on render count or refresh rate.

Acting follows anatomy:

- Entry Runner: fast alternating step and forward torso intent;
- Veil Operator: low hover, shutter counter-rotation, arm balance;
- Signal Hunter: measured step, sensor/orb follow-through;
- Site Sentinel: heavy planted march and shoulder counter-motion;
- Protocol Courier: guarded step with a stable core;
- Site Warden: slow weighted march; asymmetric guarded `broken` breathing.

A baked display base or stand is forbidden. Whole-sprite translation, runtime
bob, camera motion, or global squash cannot satisfy authored-motion acceptance.

## Motion bundle v1

Each creature ships:

```text
assets/game-packs/valorant/characters/<asset-id>/motion.webp
assets/game-packs/valorant/characters/<asset-id>/motion.json
```

`gaf2d-motion-bundle-v1` is one character-owned, matrix-packed atlas. It contains:

- grammar, asset ID, image-relative portable path, atlas dimensions, and atlas SHA-256;
- untrimmed frame size, trim union, and one normalized bottom-center pivot;
- named clips with playback, FPS, and ordered frame rectangles;
- current identity and motion approval hashes;
- the current GAF2D motion-set candidate and approval hashes;
- rig approval hash when applicable;
- source manifest hash and exported artifact hash;
- deterministic derivative-toolchain profile hash;
- encoder name/version and canonical arguments.

V1 playback is deliberately fixed-rate. Every clip uses an integer FPS in `1..60`.
Extraction timestamps and durations remain immutable GAF2D source-lineage facts, while the approved
runtime authority is the ordered frame IDs, playback mode, and FPS. A variable-duration source must
be explicitly resampled to that fixed rate before approval; timing is never silently discarded.
The GAF2D review preserves exact clip/frame order and uses the documented
`round(1000 / fps)` integer-millisecond WebP duration; that review-format quantization never changes
the approved runtime FPS. Loop clips advance at the declared runtime rate. Progress clips map
normalized domain progress into equal frame bins and hold the final frame; their FPS controls review
timing, not the live event clock.

The descriptor is closed-world: unknown properties fail at every object boundary. Creature frame
counts are exact—`idle=8`, `advance=8`, `engaged=6`, `hit=4`, `death=8`, and a pack-declared boss
owns `broken=8`. Boss capability and the 8 MiB decoded class come from the trusted pack role, never
from a magic asset ID or an untrusted descriptor claim; this keeps a renamed or future boss valid
without letting an ordinary target promote its own limits. Progress selection uses equal normalized
bins (`floor(progress × frameCount)`, clamped to the final frame), so first and last frames do not
receive accidental half-width ranges.
Encoder arguments contain only the canonical option vector; absolute paths, URLs, traversal,
control characters, query strings, signed tokens, and machine-local input/output operands fail.

Part-pose transforms vary by frame according to the approved acting recipe.
After compositing those poses on one source canvas, GAF2D applies one global normalization transform
and one bottom-center pivot across the character's entire approved motion set.
All atlas rectangles are integer, positive, non-overlapping, and inside the declared atlas.
Atlas dimensions are at most `2048×2048`; packing uses rows/columns, never one unbounded horizontal
strip.

Every APN logical frame owns a distinct physical matrix cell, including visually identical holds.
The game bundle never aliases rectangles. If generic GAF2D packing reports `duplicate_of`, the APN
derivative builder expands and repacks those logical frames; partial overlap and exact rectangle
reuse both fail the v1 game descriptor.

The game stores runtime derivatives and portable hashes only—no private source, review package,
absolute path, or signed URL.

Each `pack.motion.characters[assetId]` record contains the exact image path, descriptor path, and
lowercase descriptor SHA-256. The store verifies descriptor bytes against that pack-owned hash
before parsing, then verifies the atlas against the descriptor-owned hash. Resource keys and query
tokens include those hashes; stable filenames cannot mix two release generations.

## Loader and lifecycle

Add a pure validator/frame selector and a browser resource store. The validator has no DOM or
network dependency.

The store:

- fetches and validates JSON before decode;
- verifies the fetched atlas hash before accepting it;
- decodes asynchronously with `createImageBitmap` where available;
- verifies the decoded bitmap's intrinsic dimensions against the hash-locked descriptor;
- coalesces duplicate requests;
- warms the current wave's possible identity set before play and the next wave only after the first
  playable frame has been released;
- aborts cold in-flight requests and closes any bitmap produced by a superseded request;
- releases cold bitmaps with `ImageBitmap.close()` where supported;
- parses no JSON and allocates no image inside a frame draw.

One pure wave-window selector is the authority for spawning, warming, first-playable accounting,
and size verification. It consumes the real route/catalog result, not catalog adjacency, and covers
clean progression, wave `10→1`, scheduled seasons, and non-adjacent revisits. The Valorant role
schedule is exact. A future motion-enabled pack without a narrower authored schedule is handled
conservatively by returning every identity reachable through that pack's current spawn rules.
New characters never inherit behavior from array position or an old identity name: target role,
pack boss ownership, clip coverage, budgets, and runtime paths must all be explicit.

Descriptor and atlas requests use immutable content-hash cache tokens. The descriptor request key is
the pack-owned descriptor hash while the atlas request key is the descriptor-owned atlas hash. A
load record carries a generation token and abort signal; an older completion can neither replace a
newer record nor resurrect a released bitmap.
Only a hash-valid, dimension-valid bitmap may enter `ready`. Raw descriptor bytes above `256 KiB`
fail before parse. The default local-asset deadline is 10 seconds and is injectable in tests.
Deadline expiry settles the boot barrier as `failed` and enables the explicit fallback; it can
never leave the simulation permanently pending. An intentional supersession abort is silent, while
a real timeout produces one deduplicated diagnostic.

Boot waits for the current wave's required motion set before simulation begins. The next-wave warm
starts only after the first playable frame, so it cannot silently inflate the boot contract. While
a later wave is warming, the next spawn—not the whole UI—is held at the between-wave boundary. A
normal, successful load never displays a static cell first.

One failing asset logs one structured, deduplicated diagnostic and draws the legacy `targets.webp`
cell. This is resilience only: canonical wave 1–10 QA fails if a motion fallback is observed.

The existing pack atlas remains available during rollout but never outranks a ready bundle.
The browser never reads a GAF2D project path.

Runtime ownership is exclusive:

- approved `apn-hero` art is loaded only by `hero-v3.js` from
  `assets/mascot/v3/{clip}.webp|json`; failure may use only the legless procedural safe body, never
  the historical V2 segmented rig;
- each of the six creature IDs, once mapped, is loaded only by the pack motion store from its
  character-owned bundle;
- the Hero never resolves through pack metadata;
- a mapped creature never resolves through the legacy global creature loader;
- `targets.webp` is the mapped creature's failure-only fallback, never a competing primary source.

For packs or owners that do not declare motion, legacy art is warmed lazily for the one owner
actually requested, outside the draw call. There is no global legacy warm at boot. QA rejects
duplicate ownership, a missing expected owner, a ready identity drawn from the wrong loader path,
or any fallback that introduces legs to the Hero silhouette.

## Performance contract

Compressed limits:

- common/event creature bundle: `≤ 160 KB` each;
- pack-declared boss bundle: `≤ 240 KB`;
- all Hero WebP clips: `≤ 640 KB`;
- all new/replaced first-pack motion WebP + JSON: `≤ 1.8 MB`;
- measured first-playable asset payload: `< 5,242,879 bytes`.

Decoded limits:

- each common/event creature atlas: `≤ 6 MiB RGBA`;
- pack-declared boss atlas: `≤ 8 MiB RGBA`;
- every atlas dimension: `≤ 2048 px`;
- current + next wave creature motion: `≤ 32 MiB RGBA`;
- entire hot Canvas texture set: `< 64 MiB`;
- no more than the current/next wave identity union remains decoded.

The asset manifest must represent files actually fetched before play, not every file under
`assets/`. Reference images, GLBs, inactive legacy creature sets, and cold pack assets cannot be
marked first-playable merely because they ship in the repository. Conversely, an eager legacy
loader remains first-playable and hot until both runtime code and a loader/network-contract test
prove that it is deferred or removed. Motion must fit the cap by replacing obsolete hot art or by
loading later; the budget is never raised silently.

“Asset payload” is the deterministic sum of first-party asset-file bytes in that boot request set;
it does not pretend to include HTML/JS/CSS or transport headers. Browser QA records the cold-cache
resource trace at the first-playable boundary and requires those asset URLs to equal the generated
manifest set; deferred next-wave and lazy fallback requests are measured separately and cannot be
relabelled as boot bytes.

Decoded budgets use a deterministic conservative RGBA estimate (`width × height × 4`) for every
currently retained Canvas image source. They are not presented as a browser-specific GPU-memory
measurement. The measured request set and the decoded-retention set are separate reports.
Build/QA reads the real WebP header, requires its intrinsic dimensions to equal the descriptor, and
uses those real dimensions for the budget. Descriptor dimensions alone are never trusted.

## Reduced motion

Reduced-motion mode preserves essential state-readable frame changes at lower intensity:

- authored clips remain active;
- nonessential camera shake, spawn overshoot, idle bob, and whole-sprite amplitude are removed or
  reduced;
- hit/death state remains legible;
- no path freezes to one static cell.

Standard and reduced modes use the same asset lineage and pivot.
The effective Canvas value is
`savedInAppPreference || matchMedia('(prefers-reduced-motion: reduce)').matches`. The OS media
query is observed for live changes without rewriting the saved in-app preference. Rendering,
simulation effects, and QA all consume that one effective value; no subsystem reads a different
interpretation.

## Deterministic build

The separate creature and Hero builders accept the GAF2D project root explicitly and:

- runs the argument-array `gaf2d export --dry-run --json` preflight and requires
  its current manifest/file hashes to equal the on-disk release;
- validates current source, manifest, approval, QA/export, and runtime-lineage hashes;
- rejects a single-cycle approval where the APN delivery requires the complete named clip set;
- rejects missing clips, duplicate frames, a mixed pivot, or even a uniformly shifted pivot that
  does not equal GAF2D's selected pivot from the shared normalization transform; also rejects stale
  approval, non-portable paths, and unknown tool versions;
- writes to a temporary directory and atomically replaces a complete creature
  bundle or complete 17-file Hero set;
- emits canonical JSON;
- matrix-packs inside the atlas bounds;
- requires ImageMagick `7.1.2-13`, records/hash-locks the canonical shared-trim
  crop/matrix operation profile, and invokes `cwebp` `1.6.0` with
  `["-exact","-q","90"]`, without stochastic `-pre` or `-mt`;
- proves same-toolchain reproducibility with two clean builds and equal hashes.

The contract does not claim cross-version or cross-platform encoder byte identity. Reproducibility
is scoped to the recorded toolchain.

## Automated and visual QA

Headless gates:

- descriptor schema, hash, path, bounds, overlap, pivot, and clip validation;
- closed-world objects, exact clip frame counts, safe encoder options, and equal progress bins;
- descriptor/bitmap dimension equality and immutable cache-token consistency;
- loop/progress frame selection from timestamp/progress;
- pack role → asset mapping and all wave 1–10 pools;
- wave `10→1`, scheduled-season, revisit, and non-adjacent current/next selection;
- exact clip precedence, including `broken`;
- deduplicated fallback, in-flight cancellation, stale-completion rejection, and bitmap release;
- Hero's exact eight-clip contract;
- current GAF2D lineage;
- exact required-clip coverage by one current motion-set approval;
- deterministic double build;
- compressed, decoded, hot-texture, and first-playable budgets;
- loader/network trace equality with the generated first-playable manifest;
- generated manifest and documentation consistency.

Browser gates use `?chrome-smoke=1` and deterministic `window.advanceTime(ms)`. Because production
motion cannot exist before the creative approvals, the offline runtime gate injects a tiny,
hash-valid synthetic approved bundle through the same public store contract. It does not alter the
reserved production pack map. Production QA separately proves that no motion gate is claimed when
the pack has no approved mapping. The authored-motion gate captures the same entity at three fixed
simulation timestamps and asserts:

- at least two frame indexes and pixel hashes differ;
- an authored body-part pose changes;
- bottom-center pivot drift is at most one pixel;
- the body stays within canvas and atlas bounds;
- no matte halo, clipping, jitter, foot sliding, decode placeholder, or fallback appears.

Run waves 1–10 at `375×812`, `428×926`, and `844×390`, in standard and reduced motion. Console,
overflow, long-run, pacing, hidden-tab/resume timing, and existing visual gates remain mandatory.

The synthetic gate also proves descriptor and atlas hash checks, a ready draw with zero fallback,
fixed-timestamp frame/pixel changes, live reduced-motion preference, hidden-tab resume, resource
timing, and that production pages expose QA hooks only behind the query gate.

## Human gates

Implementation may proceed mechanically, but exact artifacts stop at:

1. legless Hero identity approval;
2. refreshed identity approval if a manifest change stales an existing approval;
3. batch motion approval after contact-sheet and temporal proof review;
4. Hero rig approval after mask, pivot, z-order, and deformation review;
5. release authorization before push, publish, deploy, or shipping.

QA can reject bytes; it cannot record these approvals. Until those gates are completed, the
repository may be technically ready for approved bundles but production gameplay remains on its
honest static/failure-safe art. It must never be reported as if the final Hero or creature acting
were already delivered.

## Documentation and acceptance

Add ADR-0014 and update architecture, art pipeline, asset engine, asset catalog, pack asset bible,
performance budget, QA checklist/report, definition of done, changelog, and both progress logs.
Regenerate catalogs/manifests only through their documented scripts.

Offline technical acceptance is complete when the runtime, validator, budgets, deterministic
fixtures, browser gate, and documentation all pass without production approvals. Production art
acceptance is complete only when:

- Hero matches the exact legless reference at gameplay size;
- all six first-pack creatures show part-level authored motion;
- no accepted character merely slides a static cell;
- all required GAF2D approval, QA, lineage, and export hashes are current;
- normal play shows no fallback or decode placeholder;
- deterministic headless, temporal, responsive, reduced-motion, long-run, and documentation gates
  pass;
- compressed and decoded budgets pass;
- no provider call, external media upload, paid call, 3D pipeline, publish, push, or deploy occurs.

## Research basis

- Canvas sprite rectangles and source/destination drawing:
  <https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage>
- Async bitmap decode and explicit graphics-resource release:
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap>,
  <https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close>
- Canvas size limits, including the `4096×4096` iOS ceiling:
  <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas>
- Timestamp-based animation and background-tab behavior:
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>
- Named clips and per-frame animation durations:
  <https://docs.godotengine.org/en/latest/classes/class_spriteframes.html>
- Matrix sprite sheets and animation tags:
  <https://www.aseprite.org/docs/sprite-sheet/>, <https://www.aseprite.org/docs/tags/>,
  <https://www.aseprite.org/docs/sprite/>
- Reduced-motion preference:
  <https://www.w3.org/TR/mediaqueries-5/>
- Live reduced-motion preference changes:
  <https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event>
- Abortable fetch and cryptographic digest:
  <https://developer.mozilla.org/en-US/docs/Web/API/AbortController>,
  <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>
- Asset-payload versus network-transfer measurement:
  <https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming>
- Recorded WebP encoder options:
  <https://developers.google.com/speed/webp/docs/cwebp>
- Immutable static assets require a new version/hash URL when bytes change:
  <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control>
- WebP animation duration is stored in one-millisecond units:
  <https://developers.google.com/speed/webp/docs/riff_container>
