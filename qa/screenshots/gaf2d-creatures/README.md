# GAF2D first-pack browser evidence

Captured 2026-07-26 from the repository development server with sound muted.

`qa/browser/chrome-gaf2d-creatures.mjs` exercised the real `spawnEnemy()` path
for Waves 1–10 at 375×812, 428×926, and 844×390. After each actual spawn, the
test moved the living target into a stable review position and let the shared
spawn-pop settle before capture.

The run verified:

- 30/30 wave and viewport scenarios;
- decoded `896×128` Valorant atlas and exact approved label/frame pairs;
- three Site Warden normal/below-34% boss-break comparisons;
- boss-timer placement below the live two-row stage HUD at all three viewports;
- muted audio, zero document overflow, and zero console warnings/errors;
- zero failed network loads and zero HTTP responses at or above 400;
- absence of `render_game_to_text`, `advanceTime`, and `__APN_QA__` on the
  equivalent page without the `chrome-smoke` gate.

Machine-readable results are in `report.json`.
The final visual review sampled every identity from the atlas plus Waves 1, 5,
9, and 10, both Site Warden states, portrait sizes, and the landscape layout.
