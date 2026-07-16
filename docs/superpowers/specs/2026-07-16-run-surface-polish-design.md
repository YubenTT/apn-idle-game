# Run Surface Polish — Design Lock

**Status:** Owner-approved on 2026-07-16

## Outcome

Run becomes one continuous mobile game surface. The app still fills the phone
viewport and remains capped at 480 px for desktop/embed use, but the combat
viewport no longer looks like a rounded card inside that surface.

## Visual hierarchy

1. The resource strip, current-patch feed, compact run telemetry, combat canvas,
   meters, action dock, and navigation form one uninterrupted vertical rhythm.
2. Zone, Rank, and Live remain attached to gameplay as a flat telemetry band.
3. The canvas reaches both app edges. It has no outer margin, border, radius,
   shadow, or inherited canvas clipping radius.
4. Energy and Focus share one compact meter rail. Each meter owns one label and
   one live value; filler phrases such as `Sprint fuel` and `Skills` are removed.
5. Sprint remains the lighter behavior control. Its stable helper copy is
   `Hold · ×1.85`; an empty meter and disabled state communicate insufficient
   energy without substituting `Need energy` into the button.
6. Upgrade Weapon remains the only crimson primary action. Sprint receives about
   30% of the row and Upgrade Weapon the remainder. The price reads on one line
   as `<value> Signal`, without a cramped nested capsule.
7. Four skill controls remain equal, secondary, and at least 48 pt tall. Locked
   controls stay legible without competing with the primary action.
8. Bottom navigation remains the approved five-tab layout and respects the
   bottom safe area.

## Constraints

- Vanilla ES modules + Canvas 2D; no runtime package or build step.
- No combat or economy balance changes.
- CSS colors and sizes resolve through `brand/tokens.css`.
- Every interactive control is at least 44 pt.
- Long press does not select page text or open native media callouts.
- Tests and browser checks run with audio muted.
- The circular APN logo fix remains in the shipping branch; rejected Host/GLB
  candidates remain outside it.

## Verification

- Static contract tests reject the old framed-stage declarations and transient
  low-energy copy.
- `node qa/run-tests.mjs` ends in `ALL PASS`.
- Automated viewport contracts cover 375×812, 393×852, 428×926, and 844×390;
  muted Chrome validates the live desktop/embed surface and interaction flow.
- Visual review checks overflow, truncation, safe areas, primary-action hierarchy,
  and the absence of console errors.
