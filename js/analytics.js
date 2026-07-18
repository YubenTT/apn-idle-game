/**
 * APN Idle — dormant analytics event-name contract (PR-3).
 *
 * NAMES ONLY. This is a reserved vocabulary, not a telemetry runtime: nothing fires
 * these yet and there is no backend, network, or storage here. It exists so that when
 * instrumentation lands (a future PR) every call site already agrees on one canonical,
 * snake_case wire name — no drift, and no "history-loss" migration to invent.
 *
 * Scope is fixed by IDLE-DESIGN-CONTEXT §6 (Behavior / Pain / Retention / Post-MVP)
 * plus the core progression moments. Per the go-live-v2 AUDIT, the earlier "Analytics
 * ID map without history loss" and the "Satisfied Return Rate" metric are struck — do
 * not re-add them here.
 *
 * Extending: snake_case `verb_noun`, a unique value, mapping to a real player action or
 * a §6 metric. The values are wire names, so renaming one is a breaking change.
 */

export const ANALYTICS_EVENTS = Object.freeze({
  // Behavior (§6) — how a session is spent.
  sessionStart: 'session_start',
  sessionEnd: 'session_end',
  panelOpen: 'panel_open', // detail dimension: build | go_live | route | boosts | menu | gear
  sprintHold: 'sprint_hold',

  // Progression — the core run and meta moments.
  zoneCleared: 'zone_cleared',
  bossDefeated: 'boss_defeated',
  scannerUpgraded: 'scanner_upgraded',
  skillUnlocked: 'skill_unlocked',
  gearEquipped: 'gear_equipped',
  gearSold: 'gear_sold',
  goLive: 'go_live', // the single prestige checkpoint (ADR-0008)

  // Pain (§6) — where players stall or churn.
  softlockZone: 'softlock_zone',
  abandonBeforeFirstBoss: 'abandon_before_first_boss',
  bagFullNoSell: 'bag_full_no_sell',

  // Retention (§6).
  offlineReturn: 'offline_return',
  routeClaim: 'route_claim', // a daily / weekly / season Route objective claim

  // Post-MVP product (§6) — no paid-power funnel.
  cosmeticInterest: 'cosmetic_interest',
  accountLink: 'account_link',
});

/** Frozen list of the reserved wire names — for enumeration and contract validation. */
export const ANALYTICS_EVENT_NAMES = Object.freeze(Object.values(ANALYTICS_EVENTS));
