import {
  C,
  scannerDamage,
  enemyHp,
  isBossZone,
  killsNeeded,
  expectedHits,
  isGoLiveBoundary,
  nextGoLiveBoundary,
} from '../js/formulas.js';
import {
  createState,
  step,
  allocAttr,
  allocSkill,
  buyScanner,
  castHotfix,
  castPriorityTag,
  priorityTagRewardMultiplier,
  shipPatches,
  combatStats,
  leaveSeason,
  goLive,
  canGoLive,
  goLiveAvailableZone,
  simulateOffline,
  setSprint,
  isSprinting,
  equipGear,
  unequipGear,
  economyMult,
  skillLv,
  claimHubObjective,
  normalizeGear,
  END_SEASON_CONTRACT,
  metaUpgradePreview,
  recommendedMetaId,
  branchMastery,
  buildMastery,
  buildYieldMultiplier,
  relayOfflineEfficiency,
} from '../js/game.js';
import {
  emptyGear,
  rollItem,
  offerItem,
  equipFromBag,
  isUpgrade,
  gearBonuses,
  normalizeGear as ng,
  SLOTS,
  sellFromBag,
  sellValue,
  primaryStat,
  queryGearBag,
  toggleJunk,
} from '../js/loot.js';
import { SKILLS, SKILL_TREES, skillSpCost } from '../js/content.js';
import {
  hubOnKill,
  emptyHub,
  DAILY_DEFS,
  WEEKLY_DEFS,
  SEASON_MILESTONES,
  hubObjectiveState,
} from '../js/hub.js';
import { itemArtKey } from '../js/icons.js';
import { feedbackAllowed, hapticPattern } from '../js/sfx.js';
import {
  createRouteState,
  routeZoneDisplay,
  packZoneDisplay,
  nextSeasonBoundary,
} from '../js/route.js';
import { ANALYTICS_EVENTS, ANALYTICS_EVENT_NAMES } from '../js/analytics.js';
import {
  HOST_CLIP_NAMES,
  HOST_CLIPS,
  HOST_PLACEHOLDER_FRAMES,
  HOST_PRESENTATION,
  HOST_RENDER_LOCK,
  resolveHostClip,
} from '../js/host-contract.js';
import {
  apply as applySave,
  save as saveState,
  load as loadState,
  clear as clearSave,
  SAVE_KEY_V1,
  SAVE_KEY_V2,
  SAVE_VERSION,
} from '../js/save.js';
import { checkCssTokenContract } from './check-css-tokens.mjs';
import { checkEconomyColorContract } from './check-economy-colors.mjs';
import { checkMobileGestureContract } from './check-mobile-gestures.mjs';
import { checkRouteContract } from './check-route.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function installSeededRandom(seed) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Keep headless assertions reproducible; production/gameplay RNG is untouched.
installSeededRandom(0x41504e); // "APN"

process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-assets.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-icon-grammar.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-asset-loader.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-copy.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-doc-contracts.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-visual-baselines.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);
process.stdout.write(
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-go-live.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
);

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
};

// —— CSS token contract ——
for (const check of checkCssTokenContract()) {
  ok(check.pass, `${check.message} (${check.detail})`);
}
for (const check of checkEconomyColorContract()) {
  ok(check.pass, `${check.message} (${check.detail})`);
}
for (const check of checkMobileGestureContract()) {
  ok(check.pass, `${check.message} (${check.detail})`);
}
for (const message of checkRouteContract()) ok(true, `route ${message}`);

// —— PR-5 single Host contract ——
ok(Object.isFrozen(HOST_CLIPS), 'Host clip contract is immutable');
ok(HOST_CLIP_NAMES.length === 12, 'Host exposes twelve semantic clips from one code contract');
ok(
  HOST_CLIP_NAMES.join('|') === 'idle|run|scan_start|scan_fire|scan_recover|hotfix|priority_tag|tracker_loop|overclock_loop|sprint|gear_pull|drop_ship',
  'Host clip vocabulary matches the V3 production contract',
);
ok(
  HOST_CLIP_NAMES.every((name) => HOST_PLACEHOLDER_FRAMES.includes(HOST_CLIPS[name].placeholderFrame)),
  'Every semantic clip resolves to a shipped placeholder frame',
);
ok(
  HOST_PRESENTATION.min === 118 && HOST_PRESENTATION.target === 130 && HOST_PRESENTATION.max === 142,
  'Run Host presentation is locked to the 118–142 CSS px gate',
);
ok(
  HOST_RENDER_LOCK.cameraY === 18 && HOST_RENDER_LOCK.cameraX === 9 && HOST_RENDER_LOCK.pivot === 'foot-center',
  'Host render lock is defined once in code',
);
ok(resolveHostClip({ hitRecoil: 0.6 }) === 'damage', 'Host resolver prioritizes damage reaction');
ok(resolveHostClip({ attack: 0.9 }) === 'crit', 'Host resolver maps peak attack to crit placeholder');
ok(resolveHostClip({ attack: 0.4 }) === 'scan', 'Host resolver maps attack to scan placeholder');
ok(resolveHostClip({ overdrive: true }) === 'overdrive', 'Host resolver maps Overclock to overdrive placeholder');
ok(resolveHostClip({ sprinting: true }) === 'sprint', 'Host resolver maps Sprint to sprint placeholder');
ok(resolveHostClip({}) === 'run', 'Host resolver defaults to run placeholder');

// —— Dormant analytics event-name contract (PR-3, IDLE-DESIGN-CONTEXT §6) ——
// Names only: reserved, frozen, snake_case, unique. There is no telemetry runtime to
// assert because none exists yet — this guards the vocabulary, not any firing.
ok(Object.isFrozen(ANALYTICS_EVENTS), 'analytics event map is frozen');
ok(ANALYTICS_EVENT_NAMES.length >= 12, 'analytics reserves the §6 + progression events');
ok(
  ANALYTICS_EVENT_NAMES.every((n) => /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(n)),
  'every analytics name is snake_case',
);
ok(new Set(ANALYTICS_EVENT_NAMES).size === ANALYTICS_EVENT_NAMES.length, 'analytics names are unique');
ok(
  ['go_live', 'panel_open', 'offline_return', 'route_claim'].every((n) => ANALYTICS_EVENT_NAMES.includes(n)),
  'analytics anchors Go Live + the §6 metrics',
);
ok(
  !ANALYTICS_EVENT_NAMES.some((n) => /ship|weapon|satisfied_return/.test(n)),
  'analytics uses current vocabulary (no retired ship/weapon, no struck metric)',
);

// —— Build decision previews ——
ok(
  SKILL_TREES.map((tree) => tree.label).join('|') === 'Scan|Verify|Relay',
  'Build presents the three named branches',
);
ok(
  SKILL_TREES.every((tree) => Object.values(SKILLS).filter((skill) => skill.tree === tree.id).length === 3),
  'Build gives each named branch exactly three focused decisions',
);
ok(END_SEASON_CONTRACT.resets.includes('Scanner level'), 'End Season contract names Scanner reset');
ok(END_SEASON_CONTRACT.keeps.includes('Route Zone'), 'End Season contract keeps Route Zone');
const hubStateFixture = emptyHub();
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'locked', 'Hub objective starts locked');
hubStateFixture.daily.kills = DAILY_DEFS[0].target;
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'claimable', 'Hub objective becomes claimable');
hubStateFixture.daily.claimed[DAILY_DEFS[0].id] = true;
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'claimed', 'Hub objective becomes claimed');
const shellMarkup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const contentSource = readFileSync(new URL('../js/content.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../css/game.css', import.meta.url), 'utf8');
const logoSource = readFileSync(new URL('../assets/apn-logo.svg', import.meta.url), 'utf8');
const navAdr = readFileSync(new URL('../docs/decisions/ADR-0007-keep-five-navigation.md', import.meta.url), 'utf8');
ok(logoSource.includes('<circle') && logoSource.includes('clipPath'), 'APN brand asset uses one circular clipped mark');
ok(/\.title-mark\s*\{[^}]*border-radius:\s*50%/s.test(cssSource), 'Title screen preserves the circular logo silhouette');
ok(!uiSource.includes("'Need energy'") && !uiSource.includes("'Low — grab orbs'"), 'Run avoids transient low-energy helper copy');
ok(/\.hud-stage\s*\{[^}]*margin:\s*0;[^}]*border:\s*0;[^}]*border-radius:\s*0;/s.test(cssSource), 'Run stage is edge-to-edge');
ok(/#app\.is-sprinting \.hud-stage\s*\{[^}]*box-shadow:\s*none/s.test(cssSource), 'Sprint never restores a stage frame');
ok(/#app\.is-overdrive \.hud-stage::after\s*\{[^}]*display:\s*none/s.test(cssSource), 'Overdrive never restores a stage frame');
ok(shellMarkup.includes('id="v-energy-lab"') && shellMarkup.includes('id="v-focus-lab"'), 'Run meters expose live values');
ok(
  ['v-zone', 'v-pack-progress', 'v-level', 'v-live'].every((id) => shellMarkup.includes(`id="${id}"`)),
  'Run stage exposes Route, Pack, Rank, and Live hierarchy',
);
ok(shellMarkup.includes('id="patch-echo-chip"') && shellMarkup.includes('id="v-echo-progress"'), 'Run reserves one data-bound Patch Echo chip');
ok(uiSource.includes("skillLv(s, 'hotfix') > 0 || skillLv(s, 'summary_burst') > 0"), 'Focus appears only after a Focus-spending skill is learned');
ok(uiSource.includes("echoProgressByPack?.[pack?.id]"), 'Patch Echo chip reads optional Route domain state without inventing progress');
ok(/const mh = HOST_PRESENTATION\.target;/.test(readFileSync(new URL('../js/render.js', import.meta.url), 'utf8')), 'Canvas uses the canonical 130px Host target');
ok(uiSource.includes("spBtn.disabled = h.energy < 1"), 'Sprint empty state uses native disabled semantics');
ok(/\.btn-chip\s*\{[^}]*min-height:\s*calc\(var\(--touch-min\) \+ var\(--sp-1\)\)/s.test(cssSource), 'Run skills preserve touch targets');
ok((shellMarkup.match(/class="nav-btn"/g) || []).length === 5, 'Navigation keeps exactly five tabs');
for (const label of ['Build', 'Go Live', 'Route', 'Boosts', 'Menu']) {
  ok(shellMarkup.includes(`<span>${label}</span>`), `Navigation keeps ${label}`);
}
ok(shellMarkup.includes('id="btn-bag"') && shellMarkup.includes('data-panel="gear"'), 'Gear remains a separate FAB');
ok((shellMarkup.match(/aria-controls="sheet-root"/g) || []).length === 6, 'All six sheet launchers expose their controlled surface');
ok(navAdr.includes('Option A') && navAdr.includes('minimal active fill'), 'Keep-five Option A is locked in ADR-0007');
for (const section of ['Accessibility', 'Audio', 'Account', 'Reset']) {
  ok(shellMarkup.includes(`menu-section-title">${section}`), `Menu has ${section} section`);
}
ok(!shellMarkup.includes('menu-section-title">Purchases'), 'Free MVP Menu has no Purchases section');
ok(!shellMarkup.includes('premium-body') && !shellMarkup.includes('Demo store'), 'Free MVP shell has no demo store');
ok(!shellMarkup.includes('id="v-pro"'), 'Free MVP HUD has no Pro badge');
ok(!shellMarkup.includes('id="v-sp"'), 'SP is shown only inside Build');
ok(!shellMarkup.includes('>Area<'), 'Run has no retired Area action');
ok(!uiSource.includes('data-premium'), 'Free MVP UI has no purchase actions');
ok(!contentSource.includes('export const PREMIUM'), 'Free MVP has no premium product catalog');
ok(!contentSource.includes('Live & Pro'), 'Free MVP Boost copy has no retired Pro claim');
const buildId = shellMarkup.match(/js\/main\.js\?v=([^"']+)/)?.[1];
ok(Boolean(buildId), 'runtime shell declares a JS build id');
for (const moduleName of ['main', 'game', 'ui', 'render', 'assets', 'save']) {
  const source = readFileSync(new URL(`../js/${moduleName}.js`, import.meta.url), 'utf8');
  const imports = [...source.matchAll(/from ['"](\.\/[^'"]+\.js(?:\?v=[^'"]+)?)['"]/g)].map((match) => match[1]);
  ok(imports.every((specifier) => specifier.endsWith(`?v=${buildId}`)), `${moduleName}.js pins every runtime import to ${buildId}`);
}
for (const selector of ['.premium-', '.prem-', '.box-grid', '.box-card', '.menu-purchases', '.menu-demo-note', '.purchase-support', '.stage-pro', '.btn-sprint.is-auto', '.meta-pill.pro']) {
  ok(!cssSource.includes(selector), `Free MVP CSS removes ${selector}`);
}
for (const action of ['unlockPro', 'unlockAutoSprint', 'buyBoost2x', 'timeWarp', 'buyCoinPack', 'buyGearBox']) {
  ok(!gameSource.includes(`export function ${action}`), `Free MVP removes ${action}`);
}
for (const def of [...DAILY_DEFS, ...WEEKLY_DEFS, ...SEASON_MILESTONES]) {
  ok(!Object.hasOwn(def.reward || {}, 'coins'), `${def.id || `Season ${def.lv}`} has no dead coin reward`);
}
ok(!shellMarkup.includes('id="v-attrs"'), 'Menu has no attribute debug string');
ok((shellMarkup.match(/class="switch-ui"/g) || []).length === 2, 'Menu uses one switch component twice');
const boostFixture = createState();
boostFixture.authority.amount = 20;
const damageBoostPreview = metaUpgradePreview(boostFixture, 'signal_power');
ok(damageBoostPreview.current === '+0%' && damageBoostPreview.next === '+5%', 'Boost preview exposes exact current to next effect');
ok(damageBoostPreview.affordable === true && damageBoostPreview.cost === 8, 'Boost preview exposes exact affordability and Rep cost');
ok(typeof recommendedMetaId(boostFixture) === 'string', 'Boosts expose one domain recommendation');

const priorityFixture = createState();
priorityFixture.run.hero.skills.summary_burst = 2;
priorityFixture.run.hero.focus = 60;
step(priorityFixture, 1);
const priorityTarget = priorityFixture.world.enemies.find((enemy) => enemy.hp > 0);
ok(Boolean(priorityTarget), 'Priority Tag fixture has one live target');
const focusBeforePriority = priorityFixture.run.hero.focus;
ok(castPriorityTag(priorityFixture), 'Priority Tag can mark the current target');
ok(priorityTarget?.priorityTagRank === 2, 'Priority Tag persists its purchased rank on the target');
ok(priorityFixture.run.hero.focus === focusBeforePriority - 12, 'Priority Tag spends exactly 12 Focus');
ok(priorityTagRewardMultiplier(priorityTarget) > 1, 'Priority Tag grants a real single-target reward multiplier');

function priorityKillReward(tagged) {
  installSeededRandom(0x5052494f);
  const state = createState();
  state.run.hero.skills.hotfix = 1;
  state.run.hero.skills.summary_burst = 1;
  state.run.hero.focus = 60;
  step(state, 1);
  const target = state.world.enemies.find((enemy) => enemy.hp > 0);
  target.type = 'stale';
  target.hp = 1;
  if (tagged) castPriorityTag(state);
  installSeededRandom(0x544147);
  castHotfix(state);
  return state.run.bytes;
}
const untaggedReward = priorityKillReward(false);
const taggedReward = priorityKillReward(true);
ok(taggedReward > untaggedReward * 1.24, 'Priority Tag increases the marked target actual kill reward');
ok(itemArtKey({ slot: 'weapon', name: 'Mod Stick', rarity: 'green' }) === 'mod-stick', 'Gear maps Mod Stick to authored art');
ok(itemArtKey({ slot: 'chest', name: 'Patch Mail', rarity: 'green' }) === 'patch-mail', 'Gear maps Patch Mail to authored art');
ok(itemArtKey({ slot: 'legs', name: 'Sprint Leggings', rarity: 'green' }) === 'route-leggings', 'Gear maps Sprint Leggings to authored art');
ok(itemArtKey({ slot: 'visor', name: 'Signal Visor', rarity: 'green' }) === 'visor-coil', 'Gear maps Signal Visor to authored art');
ok(feedbackAllowed({ muted: false, inAppReduced: false, osReduced: false }), 'feedback enabled when all gates allow it');
ok(!feedbackAllowed({ muted: true, inAppReduced: false, osReduced: false }), 'mute gates feedback');
ok(!feedbackAllowed({ muted: false, inAppReduced: true, osReduced: false }), 'in-app reduced motion gates feedback');
ok(!feedbackAllowed({ muted: false, inAppReduced: false, osReduced: true }), 'OS reduced motion gates feedback');
for (const cue of ['hit', 'crit', 'loot', 'rank', 'sheet', 'afford']) {
  ok(Array.isArray(hapticPattern(cue)), `${cue} owns a deterministic haptic cue`);
}

// —— Persistent global Route + save v2 migration ——
const freshRoute = createState();
ok(freshRoute.v === 3, 'fresh state schema v3');
ok(freshRoute.meta.goLiveCount === 0 && freshRoute.meta.pendingGoLiveZone === 0, 'fresh Go Live counters zeroed');
ok(!('season' in freshRoute.meta), 'retired season counter absent from fresh state');
ok(freshRoute.route.zone === 0, 'fresh global route');
ok(freshRoute.route.currentPackId === 'valorant', 'fresh first pack');
ok(!('zone' in freshRoute.run), 'fresh run zone retired');
ok(routeZoneDisplay(freshRoute.route) === 1, 'route display starts at 1');
ok(packZoneDisplay({ ...freshRoute.route, zone: 19 }) === 10, 'pack display ends at 10');
ok(nextSeasonBoundary(93) === 100, 'next season boundary');

const migratedRoute = createState();
applySave(migratedRoute, {
  v: 1,
  ts: Date.now(),
  run: { zone: 1905, killsInZone: 2, bytes: 12, patches: 3 },
});
ok(migratedRoute.route.zone === 1905, 'v1 zone migrates');
ok(migratedRoute.route.killsInZone === 2, 'v1 kills migrate');
ok(!('zone' in migratedRoute.run), 'migrated run zone retired');

const malformedRoute = createState();
applySave(malformedRoute, {
  v: 2,
  ts: Date.now(),
  route: {
    zone: -8,
    killsInZone: -2,
    seed: -1,
    currentPackId: 42,
    seenPackIds: ['valorant', 42, 'valorant', ''],
    deck: ['league', 'league', null],
    corruptionByPack: { valorant: -2, league: 2, broken: 'high' },
    lastSeenByPack: { valorant: 20, league: -1, broken: 'now' },
  },
});
ok(malformedRoute.route.zone === 0, 'malformed route zone sanitizes');
ok(malformedRoute.route.killsInZone === 0, 'malformed route kills sanitize');
ok(malformedRoute.route.currentPackId === 'valorant', 'malformed pack id sanitizes');
ok(malformedRoute.route.seenPackIds.join(',') === 'valorant', 'route history sanitizes and deduplicates');
ok(malformedRoute.route.deck.join(',') === 'league', 'route deck sanitizes and deduplicates');
ok(JSON.stringify(malformedRoute.route.corruptionByPack) === '{"league":2}', 'corruption map sanitizes');
ok(JSON.stringify(malformedRoute.route.lastSeenByPack) === '{"valorant":20}', 'last-seen map sanitizes');

const legacyFocusState = createState();
applySave(legacyFocusState, { v: 2, ts: Date.now(), run: { hero: { mana: 33 } } });
ok(legacyFocusState.run.hero.focus === 33, 'legacy Mana meter migrates to Focus');
ok(!('mana' in legacyFocusState.run.hero), 'legacy Mana field is retired after migration');

const saveMemory = new Map();
globalThis.localStorage = {
  getItem: (key) => saveMemory.get(key) ?? null,
  setItem: (key, value) => saveMemory.set(key, String(value)),
  removeItem: (key) => saveMemory.delete(key),
};
migratedRoute.settings.gearSort = 'rarity';
migratedRoute.settings.gearFilter = 'junk';
migratedRoute.meta.premium.providerReceipt = 'opaque-legacy-value';
saveState(migratedRoute);
ok(saveMemory.has(SAVE_KEY_V2), 'save writes v2 key');
ok(!saveMemory.has(SAVE_KEY_V1), 'save does not write legacy key');
const roundTrip = loadState();
ok(roundTrip?.v === 3 && roundTrip.route?.zone === 1905, 'v3 save round trip');
const appliedRoundTrip = createState();
applySave(appliedRoundTrip, roundTrip);
ok(appliedRoundTrip.settings.gearSort === 'rarity' && appliedRoundTrip.settings.gearFilter === 'junk', 'gear view preferences persist');
ok(appliedRoundTrip.meta.premium.providerReceipt === 'opaque-legacy-value', 'legacy premium save data survives inert round trip');
saveMemory.clear();
saveMemory.set(SAVE_KEY_V1, JSON.stringify({ v: 1, ts: 1, run: { zone: 77 } }));
ok(loadState()?.v === 1, 'load falls back to legacy key');
ok(saveMemory.has(SAVE_KEY_V1), 'legacy key preserved during migration');
saveMemory.set(SAVE_KEY_V2, '{corrupt-json');
ok(loadState()?.v === 1, 'corrupt v2 falls back to valid legacy save');
clearSave();
ok(!saveMemory.has(SAVE_KEY_V1) && !saveMemory.has(SAVE_KEY_V2), 'New Game clears both save keys');

// —— Go Live: additivity, boundaries, idempotency (PR-1 / ADR-0008) ——
ok(SAVE_VERSION === 3, 'save schema version is 3');
// Boundary formula: first at 10, then every 20 (10, 30, 50, …).
ok(isGoLiveBoundary(10) && !isGoLiveBoundary(20) && isGoLiveBoundary(30) && !isGoLiveBoundary(40), 'Go Live boundaries land at 10, 30, 50');
ok(nextGoLiveBoundary(0) === 10 && nextGoLiveBoundary(10) === 30 && nextGoLiveBoundary(15) === 30, 'next Go Live boundary is correct');

// Back-compat: the legacy ship + prestige domain paths stay callable (save migration + tests);
// PR-2 removed only their UI, routing the player through goLive() alone.
const additive = createState();
additive.route.zone = 20;
additive.run.patches = 30;
ok(shipPatches(additive), 'legacy ship path still callable');
additive.ui.seasonDone = true;
const seasonBefore = additive.meta.goLiveCount;
ok(leaveSeason(additive), 'legacy prestige path still callable');
ok(additive.meta.goLiveCount === seasonBefore + 1, 'legacy prestige increments goLiveCount');

// goLive at the first boundary (zone 10): Route kept, temp power reset, idempotent.
const glState = createState();
glState.route.zone = 10;
glState.meta.pendingGoLiveZone = 10;
glState.run.hero.level = 30;
glState.authority.shippedThisSeason = 300;
ok(canGoLive(glState) && goLiveAvailableZone(glState) === 10, 'Go Live available at zone 10');
const rec1 = goLive(glState);
ok(rec1 && rec1.goLiveCount === 1 && rec1.boundaryZone === 10, 'goLive #1 mints a receipt at zone 10');
ok(glState.route.zone === 10, 'goLive keeps the global Route zone');
ok(glState.run.hero.level === 1 && glState.meta.live > 1, 'goLive resets temp power and grows Live Mult');
const rec2 = goLive(glState);
ok(rec2 && rec2.checkpointId === rec1.checkpointId && glState.meta.goLiveCount === 1, 'goLive double-click is idempotent (no second prestige)');

// Zero-notes contract: a Go Live with nothing banked is a clean no-bank.
const zeroNotes = createState();
zeroNotes.route.zone = 10;
zeroNotes.meta.pendingGoLiveZone = 10;
const recZero = goLive(zeroNotes);
ok(recZero && recZero.notesBanked === 0 && recZero.repGained === 0, 'goLive with zero Notes banks nothing (no crash)');

// Zone-1000 contract: a Go Live at a deep boundary stays finite.
const deep = createState();
deep.route.zone = 1010; // (1010-10) % 20 === 0 → a boundary
deep.meta.pendingGoLiveZone = 1010;
const recDeep = goLive(deep);
ok(recDeep && recDeep.boundaryZone === 1010 && Number.isFinite(recDeep.liveMult), 'goLive at Zone 1010 boundary is finite');

// —— PR-1 save-v3 migration matrix ——
// Row 1: v1 save → v3 direct (no crash; goLiveCount 0; season retired).
const mV1 = createState();
applySave(mV1, { v: 1, ts: 1, run: { zone: 40, killsInZone: 0, bytes: 5, patches: 2, hero: { scan: 3, verify: 2, amplify: 1 } } });
ok(mV1.v === 3, 'matrix v1→v3: schema upgraded to 3');
ok(mV1.meta.goLiveCount === 0 && mV1.meta.pendingGoLiveZone === 0, 'matrix v1→v3: goLiveCount=0, none pending');
ok(!('season' in mV1.meta) && mV1.route.zone === 40, 'matrix v1→v3: season retired, no crash');

// Row 2: v2 clean boundary (zone 20) → v3 (goLiveCount === old season; available).
const mV2clean = createState();
applySave(mV2clean, {
  v: 2, ts: 1,
  meta: { season: 4, live: 1.5 },
  route: { zone: 20, killsInZone: 0 },
  authority: { amount: 500, shippedThisSeason: 120 },
  ui: { seasonDone: true },
});
ok(mV2clean.meta.goLiveCount === 4, 'matrix v2 clean: goLiveCount === old meta.season');
ok(mV2clean.meta.pendingGoLiveZone === 20 && canGoLive(mV2clean), 'matrix v2 clean: Go Live available at 20');
ok(!('season' in mV2clean.meta), 'matrix v2 clean: season deleted (Object.assign cannot resurrect)');

// Row 3: v2 overshoot (zone 27, seasonDone) → v3 (pending=20, available now, not 40).
const mV2over = createState();
applySave(mV2over, {
  v: 2, ts: 1,
  meta: { season: 2 },
  route: { zone: 27, killsInZone: 0 },
  authority: { shippedThisSeason: 80 },
  ui: { seasonDone: true },
});
ok(mV2over.meta.pendingGoLiveZone === 20, 'matrix v2 overshoot z27: pending=20 (not 40)');
ok(canGoLive(mV2over) && mV2over.meta.goLiveCount === 2, 'matrix v2 overshoot: available now, count preserved');

// Row 3b: second v3 shape migration refunds the legacy attribute tax and every
// reconstructible named-skill rank exactly once. Retired mask skills remain the
// explicitly accepted historical loss and are not refunded.
const legacyBuild = createState();
applySave(legacyBuild, {
  v: 3,
  ts: 1,
  route: { zone: 12, killsInZone: 3 },
  run: {
    bytes: 7,
    patches: 2,
    hero: {
      level: 8,
      xp: 4,
      sp: 2,
      scan: 3,
      verify: 2,
      amplify: 1,
      skills: { hotfix: 6, notify: 2, marathon: 1, verified_mask: 9 },
    },
  },
});
const hotfixRefund = Array.from({ length: 6 }, (_, rank) => skillSpCost(rank)).reduce((a, b) => a + b, 0);
const notifyRefund = Array.from({ length: 2 }, (_, rank) => skillSpCost(rank)).reduce((a, b) => a + b, 0);
const expectedBuildRefund = 2 + 3 + 2 + 1 + hotfixRefund + notifyRefund + 1;
ok(legacyBuild.run.hero.sp === expectedBuildRefund, `v3 build refund exact (${expectedBuildRefund} SP)`);
ok(legacyBuild.run.hero.buildVersion === 2, 'v3 build migration marker written');
ok(Object.keys(legacyBuild.run.hero.skills).length === 0, 'v3 legacy build ranks reset for a clean respec');
ok(legacyBuild.run.hero.scan === 0 && legacyBuild.run.hero.verify === 0 && legacyBuild.run.hero.amplify === 0, 'v3 generic attribute tax retired');

const refundRoundTrip = JSON.parse(JSON.stringify({
  v: 3,
  ts: 2,
  meta: legacyBuild.meta,
  authority: legacyBuild.authority,
  route: legacyBuild.route,
  run: legacyBuild.run,
  ui: legacyBuild.ui,
  settings: legacyBuild.settings,
}));
const migratedAgain = createState();
applySave(migratedAgain, refundRoundTrip);
ok(migratedAgain.run.hero.sp === expectedBuildRefund, 'v3 build refund is idempotent on reload');

const masteryState = createState();
masteryState.run.hero.sp = 20;
for (let i = 0; i < 6; i++) allocSkill(masteryState, 'scroll_speed');
for (let i = 0; i < 2; i++) allocSkill(masteryState, 'notify');
for (let i = 0; i < 3; i++) allocSkill(masteryState, 'marathon');
ok(branchMastery(masteryState, 'scan') === 7, 'Scan Mastery derives from spent SP');
ok(branchMastery(masteryState, 'verify') === 2, 'Verify Mastery derives from spent SP');
ok(branchMastery(masteryState, 'relay') === 3, 'Relay Mastery derives from spent SP');
ok(buildMastery(masteryState) === 12, 'Build Mastery sums branch spend');
ok(buildYieldMultiplier(masteryState) > 1, 'Verify creates cycle-value yield');
ok(relayOfflineEfficiency(masteryState) > C.IDLE_EFF, 'Relay improves offline continuity');

// Row 4: 8h offline crossing the boundary banks only pre-boundary Notes (no 7.5h farm).
const savedRandom = Math.random;
installSeededRandom(0x41504e);
const offCross = createState();
offCross.route.zone = 18; // boundary 20, reached early in the window
offCross.run.hero.scanner = 40;
const crossSummary = simulateOffline(offCross, 8 * 3600);
installSeededRandom(0x41504e);
const offRef = createState();
offRef.route.zone = 18;
offRef.run.hero.scanner = 40;
const refSummary = simulateOffline(offRef, crossSummary.simulatedSeconds);
Math.random = savedRandom; // restore the main deterministic stream for later tests
ok(crossSummary && crossSummary.stoppedAtSeasonBoundary === true, 'matrix offline: halts at the checkpoint boundary');
ok(crossSummary.overflowSeconds > 6 * 3600, 'matrix offline: leaves >6h unspent past the boundary');
ok(crossSummary.notes === refSummary.notes, 'matrix offline: banks only pre-boundary Notes, never 7.5h post-boundary');

// Row 5: write-guard refuses to overwrite a higher-version save on disk.
saveMemory.clear();
const futureSave = { v: SAVE_VERSION + 1, ts: 999, meta: { goLiveCount: 9 }, route: { zone: 5 } };
saveMemory.set(SAVE_KEY_V2, JSON.stringify(futureSave));
const guardState = createState();
guardState.route.zone = 3;
ok(saveState(guardState) === false, 'matrix write-guard: refuses to overwrite a higher-version save');
ok(JSON.parse(saveMemory.get(SAVE_KEY_V2)).v === SAVE_VERSION + 1, 'matrix write-guard: higher-version save left intact');
saveMemory.set(SAVE_KEY_V2, JSON.stringify({ ...futureSave, v: SAVE_VERSION }));
ok(saveState(guardState) === true, 'matrix write-guard: same-version overwrite still allowed');
clearSave();

// meta.hub is on the persist manifest (its dailies/weeklies were orphaned pre-PR-1).
const hubState = createState();
hubState.meta.hub.seasonXp = 42;
hubState.meta.hub.daily.ships = 3;
hubState.meta.hub.weekly.notes = 88;
saveMemory.clear();
saveState(hubState);
const hubReloaded = createState();
applySave(hubReloaded, loadState());
ok(
  hubReloaded.meta.hub?.seasonXp === 42 &&
    hubReloaded.meta.hub?.daily?.ships === 3 &&
    hubReloaded.meta.hub?.weekly?.notes === 88,
  'meta.hub persists across a v3 save round trip',
);
clearSave();

// —— Basic combat ——
const s = createState();
s.run.hero.scanner = 5;
let sawAnchoredDamage = false;
let sawSignalFlight = false;
for (let i = 0; i < 60 * 12; i++) {
  step(s, C.FIXED_DT);
  if (s.world.floaters.some((floater) => floater.anchorId)) sawAnchoredDamage = true;
  if (s.world.lootFlights?.some((flight) => flight.target === 'signal')) sawSignalFlight = true;
}
ok(s.meta.kills > 0, `kills occur (${s.meta.kills})`);
ok(s.run.bytes > 0, `bytes drop (${s.run.bytes | 0})`);
ok(sawAnchoredDamage, 'damage numbers anchor to target');
ok(sawSignalFlight, 'Signal reward flies to resource strip');

// —— No masks in catalog ——
ok(!SKILLS.verified_mask, 'no crit mask skill');
ok(!SKILLS.editor_pick, 'no endless sprint mask');
ok(!!SKILLS.sharp_eye, 'sharp_eye skill exists');
ok(!!SKILLS.marathon, 'marathon skill exists');

// —— Skills path (no mask) ——
const s3 = createState();
s3.run.hero.sp = 40;
ok(allocAttr(s3, 'scan'), 'alloc damage');
ok(allocSkill(s3, 'hotfix'), 'learn burst');
s3.run.hero.focus = 60;
s3.run.hero.scanner = 8;
for (let i = 0; i < 30; i++) step(s3, C.FIXED_DT);
ok(castHotfix(s3) || s3.world.enemies.length === 0, 'hotfix cast');

// —— Sharp eye unlock path ——
const sSharp = createState();
sSharp.run.hero.sp = 20;
ok(allocSkill(sSharp, 'sharp_eye'), 'learn Source Lock directly without attribute tax');
ok(skillLv(sSharp, 'sharp_eye') === 1, 'sharp eye rank 1');
const crit0 = createState();
const crit1 = createState();
crit1.run.hero.skills.sharp_eye = 5;
ok(combatStats(crit1).crit > combatStats(crit0).crit, 'sharp eye raises crit');

// —— Ship ——
s3.run.patches = 5;
s3.meta.live = 1.1;
s3.meta.premium.coins = 11;
ok(shipPatches(s3), 'ship patches');
ok(s3.authority.amount >= 5, 'authority gained');
ok(s3.meta.premium.coins === 11, 'ship leaves legacy coins inert');

// —— Scanner ——
const s4 = createState();
s4.run.bytes = 1000;
const d0 = combatStats(s4).dmg;
ok(buyScanner(s4), 'buy scanner');
ok(combatStats(s4).dmg > d0, 'scanner increases dmg');

ok(isBossZone(9), 'boss zone 10');
ok(killsNeeded(9) === 1, 'boss needs 1');
ok(enemyHp(5) > enemyHp(0), 'hp scales');
ok(
  expectedHits(0, 0) >= 8 && expectedHits(0, 0) <= 18,
  `Z1 readable multi-hit (${expectedHits(0, 0).toFixed(1)}h)`
);
ok(expectedHits(20, 8) > 2.5, `Z21 lag multi (${expectedHits(20, 8).toFixed(1)})`);

// —— Season push ——
const s5 = createState();
s5.run.hero.scanner = 35;
s5.run.hero.sp = 80;
for (let i = 0; i < 6; i++) allocAttr(s5, 'scan');
allocSkill(s5, 'hotfix');
allocSkill(s5, 'live_tracker');
s5.run.hero.trackerOn = true;
for (let i = 0; i < 60 * 60 * 10; i++) {
  s5.run.hero.energy = 100;
  s5.run.hero.focus = 60;
  step(s5, C.FIXED_DT);
  if (s5.ui.seasonDone) break;
}
ok(s5.meta.bosses >= 1, `bosses (${s5.meta.bosses})`);
ok(s5.route.zone >= 5 || s5.ui.seasonDone, `progress zone ${s5.route.zone}`);

// —— Endless past 20 ——
const s6 = createState();
s6.route.zone = 19;
s6.run.hero.scanner = 45;
for (let i = 0; i < 60 * 60; i++) {
  s6.run.hero.energy = 100;
  step(s6, C.FIXED_DT);
  if (s6.route.zone >= 21) break;
}
ok(s6.route.zone >= 20, `past Z20 zone=${s6.route.zone}`);

// —— Brand 4-slot gear (Scanner · Chest · Legs · Visor) ——
installSeededRandom(0x47454152); // "GEAR" — isolates loot assertions from prior RNG use.
ok(SLOTS.length === 4, '4 brand gear slots');
ok(SLOTS.includes('chest') && SLOTS.includes('legs') && SLOTS.includes('visor'), 'brand armor slots');
const gSlots = emptyGear();
const expectPrimary = {
  weapon: 'Damage',
  chest: 'Energy',
  legs: 'Sprint',
  visor: 'Crit',
};
for (const slot of SLOTS) {
  const it = rollItem(10, slot);
  ok(it.slot === slot, `roll ${slot}`);
  const prim = primaryStat(it);
  ok(prim.brand === expectPrimary[slot], `${slot} primary=${prim.brand} (want ${expectPrimary[slot]})`);
  ok(!/defense/i.test(prim.text), `${slot} no Defense label`);
  // no wrong-slot junk affixes
  for (const a of it.affixes) {
    if (slot === 'weapon') ok(['dmg_pct', 'flat_dmg', 'crit_pct', 'atk_spd'].includes(a.key), `weapon affix ${a.key}`);
    if (slot === 'chest') ok(['energy', 'notes_pct', 'signal_pct'].includes(a.key), `chest affix ${a.key}`);
    if (slot === 'legs') ok(['move_pct', 'atk_spd', 'e_regen'].includes(a.key), `legs affix ${a.key}`);
    if (slot === 'visor') ok(['crit_pct', 'signal_pct', 'dmg_pct'].includes(a.key), `visor affix ${a.key}`);
  }
  offerItem(gSlots, it);
  ok(gSlots[slot]?.id === it.id, `equip ${slot}`);
}
const bon = gearBonuses(gSlots);
ok(Object.values(bon).some((v) => v > 0), 'multi-slot bonuses stack');

// worse item never auto-equips
const weak = rollItem(1, 'weapon');
const strong = gSlots.weapon;
const resW = offerItem(gSlots, weak);
ok(!resW.equipped, 'worse weapon stays bag');
ok(gSlots.weapon?.id === strong.id, 'best weapon kept');
ok(gSlots.bag.some((x) => x.id === weak.id), 'weak in bag');

// legacy armor/head → chest/visor migration
const legacy = ng({
  weapon: rollItem(5, 'weapon'),
  armor: { ...rollItem(5, 'chest'), slot: 'armor' },
  head: { ...rollItem(5, 'visor'), slot: 'head' },
  bag: [],
});
ok(legacy.chest && legacy.chest.slot === 'chest', 'armor migrates to chest');
ok(legacy.visor && legacy.visor.slot === 'visor', 'head migrates to visor');

// sell bag for signal
const sellG = emptyGear();
const junk = rollItem(3, 'trinket');
offerItem(sellG, junk);
// force into bag
const junk2 = rollItem(1, 'trinket');
junk2.score = 0.1;
offerItem(sellG, junk2);
const bagId = sellG.bag[0]?.id;
const sv = sellFromBag(sellG, bagId);
ok(sv && sv.signal === sellValue(sv.item), 'sell returns signal');

// collection flows: explicit junk state + deterministic sort/filter
const viewGear = emptyGear();
const lowView = rollItem(1, 'weapon');
const highView = rollItem(30, 'chest');
viewGear.bag = [lowView, highView];
ok(toggleJunk(viewGear, lowView.id) === true && lowView.junk === true, 'junk state toggles on');
ok(queryGearBag(viewGear, { filter: 'junk' }).map((it) => it.id).join(',') === lowView.id, 'junk filter isolates marked items');
ok(queryGearBag(viewGear, { sort: 'level' })[0]?.id === highView.id, 'level sort is deterministic');
const normalizedView = ng(viewGear);
ok(normalizedView.bag.find((it) => it.id === lowView.id)?.junk === true, 'junk state survives normalization');

// —— Prestige keeps progression and leaves legacy premium data inert ——
const s7 = createState();
s7.route.zone = 20;
s7.ui.seasonDone = true;
s7.run.hero.scanner = 40;
s7.authority.amount = 100;
s7.authority.shippedThisSeason = 50;
s7.authority.upgrades.signal_power = 3;
s7.meta.live = 1.1;
s7.meta.premium.pro = true;
s7.meta.premium.coins = 10;
s7.meta.premium.boostEndsAt = Date.now() + 60_000;
s7.meta.premium.autoSprint = true;
s7.meta.premium.warpCdUntil = Date.now() + 30_000;
s7.meta.premium.extraLegacyReceipt = 'preserve-me';
const legacyPremiumBefore = structuredClone(s7.meta.premium);
s7.meta.gear = emptyGear();
const drop = rollItem(25, 'weapon');
offerItem(s7.meta.gear, drop);
const chestDrop = rollItem(25, 'chest');
offerItem(s7.meta.gear, chestDrop);
const gearName = s7.meta.gear.weapon.name;
const chestName = s7.meta.gear.chest.name;
const liveBefore = s7.meta.live;
const routeBefore = s7.route.zone;
ok(leaveSeason(s7), 'end season');
ok(s7.route.zone === routeBefore, 'global route kept');
ok(s7.run.hero.scanner === 0, 'signal reset');
ok(s7.authority.upgrades.signal_power === 3, 'boosts kept');
ok(s7.authority.amount === 100, 'rep kept');
ok(JSON.stringify(s7.meta.premium) === JSON.stringify(legacyPremiumBefore), 'prestige leaves legacy premium data inert');
ok(s7.meta.gear.weapon?.name === gearName, 'gear kept');
ok(s7.meta.gear.chest?.name === chestName, 'chest kept');
ok(s7.meta.live > liveBefore, 'live grew');

// —— Free MVP economy ignores every legacy paid-power flag ——
const s8 = createState();
s8.run.hero.scanner = 5;
s8.meta.live = 1.25;
s8.meta.premium.pro = true;
s8.meta.premium.boostEndsAt = Date.now() + 60_000;
s8.meta.premium.autoSprint = true;
const paidFlagsDmg = combatStats(s8).dmg;
const s8Control = createState();
s8Control.run.hero.scanner = 5;
s8Control.meta.live = 1.25;
ok(Math.abs(paidFlagsDmg - combatStats(s8Control).dmg) < 0.001, 'legacy paid flags cannot change damage');
ok(Math.abs(economyMult(s8) - s8.meta.live) < 0.001, 'Live Mult is the only economy multiplier');
setSprint(s8, false);
ok(!isSprinting(s8), 'legacy Auto-Sprint cannot activate Sprint');

// equip / unequip
const sEq = createState();
sEq.meta.gear = emptyGear();
const bagItem = rollItem(8, 'legs');
sEq.meta.gear.bag = [bagItem];
ok(equipGear(sEq, bagItem.id), 'equip from bag');
ok(sEq.meta.gear.legs?.id === bagItem.id, 'legs equipped');
ok(unequipGear(sEq, 'legs'), 'unequip legs');
ok(!sEq.meta.gear.legs, 'legs empty');
ok(sEq.meta.gear.bag.some((x) => x.id === bagItem.id), 'back in bag');

// —— Sprint ——
const s9 = createState();
s9.run.hero.energy = 100;
setSprint(s9, true);
ok(isSprinting(s9), 'sprint on');
ok(combatStats(s9).timeScale >= C.SPRINT_TIME - 0.01, 'sprint timescale');
s9.run.hero.energy = 0;
ok(!isSprinting(s9), 'sprint off empty');

// —— Hub claims ——
const sHub = createState();
for (let i = 0; i < 50; i++) hubOnKill(sHub, { type: 'stale' });
ok(claimHubObjective(sHub, 'daily', 'd_kills'), 'claim daily kills');
ok(sHub.run.hero.sp >= 2, 'daily reward SP');

// —— Zero-mask save migration path: skills without mask fields ——
const sM = createState();
sM.run.hero.sp = 30;
for (let i = 0; i < 5; i++) allocAttr(sM, 'amplify');
ok(allocSkill(sM, 'marathon'), 'marathon learn');
ok(!('mask' in sM.run.hero) || sM.run.hero.mask == null, 'no mask on hero');

console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
process.exit(fails ? 1 : 0);
