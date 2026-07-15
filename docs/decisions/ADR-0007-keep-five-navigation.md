# ADR-0007 — Keep five primary destinations plus the Gear FAB

- Status: Accepted
- Date: 2026-07-15

## Context

The mobile Run screen needs immediate access to the five recurring progression
decisions without turning the bottom bar into a scrolling or nested menu. Gear is
also a high-frequency collection action, but making it a sixth bottom tab would
compress labels and targets below the clarity established in `SCREEN-SPECS.md`.
The Run CTA must remain the only primary-crimson action on the screen.

## Options

### Option A — five destinations plus Gear FAB

Keep Build · Ship · Hub · Boosts · Menu in the bottom navigation. Keep Gear as the
in-stage bag FAB. Use a neutral, minimal active fill with an information-color
edge/icon; never use primary crimson for navigation state.

### Option B — six equal bottom tabs

Move Gear into the navigation. This makes the model superficially uniform, but
shrinks touch/label space and disconnects Gear from the Run loot loop.

### Option C — three tabs plus a More menu

Reduce visible destinations. This creates extra taps for permanent progression
and live-ops claims and makes the location of Ship/Boosts change by hierarchy.

## Decision

Lock Option A. The five labels and their order are stable: Build, Ship, Hub,
Boosts, Menu. Gear remains the separate bag FAB. Every control stays at least
44pt, exposes its sheet expansion state, and uses the minimal active fill already
defined by the token system.

## Consequences

- The primary progression destinations remain one tap away.
- Gear stays spatially tied to drops and the stage.
- The bar is not perfectly uniform because Gear lives outside it; this is an
  intentional hierarchy, not a missing sixth tab.
- Adding another permanent destination requires replacing or grouping an existing
  destination; the bar does not grow past five.

## Revisit when

A measured navigation study shows repeated failure to find Gear or one of the
five destinations, or a new permanent destination cannot fit an existing sheet.
