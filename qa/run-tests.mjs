import {
  C,
  scannerDamage,
  enemyHp,
  isBossZone,
  killsNeeded,
  expectedHits,
} from '../js/formulas.js';
import {
  createState,
  step,
  allocAttr,
  allocSkill,
  buyScanner,
  castHotfix,
  shipPatches,
  combatStats,
  leaveSeason,
  setSprint,
  isSprinting,
  unlockPro,
  buyBoost2x,
  buyCoinPack,
  buyGearBox,
  equipGear,
  unequipGear,
  economyMult,
  skillLv,
  claimHubObjective,
  normalizeGear,
  END_SEASON_CONTRACT,
  metaUpgradePreview,
  recommendedMetaId,
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
import { SKILLS, PREMIUM, nextSkillUnlock } from '../js/content.js';
import { hubOnKill, emptyHub, DAILY_DEFS, hubObjectiveState } from '../js/hub.js';
import { itemArtKey } from '../js/icons.js';
import { feedbackAllowed, hapticPattern } from '../js/sfx.js';
import {
  createRouteState,
  routeZoneDisplay,
  packZoneDisplay,
  nextSeasonBoundary,
} from '../js/route.js';
import {
  apply as applySave,
  save as saveState,
  load as loadState,
  clear as clearSave,
  SAVE_KEY_V1,
  SAVE_KEY_V2,
} from '../js/save.js';
import { checkCssTokenContract } from './check-css-tokens.mjs';
import { checkEconomyColorContract } from './check-economy-colors.mjs';
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
  execFileSync(process.execPath, [fileURLToPath(new URL('./check-visual-baselines.mjs', import.meta.url))], {
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
for (const message of checkRouteContract()) ok(true, `route ${message}`);

// —— Build decision previews ——
ok(nextSkillUnlock('scan', 0)?.id === 'hotfix', 'Damage next unlock starts at Burst');
ok(nextSkillUnlock('scan', 1)?.id === 'scroll_speed', 'Damage next unlock advances to Speed');
ok(nextSkillUnlock('scan', 5) === null, 'Damage reports all skills open');
ok(END_SEASON_CONTRACT.resets.includes('Weapon level'), 'End Season contract names Weapon reset');
ok(END_SEASON_CONTRACT.keeps.includes('Route Zone'), 'End Season contract keeps Route Zone');
const hubStateFixture = emptyHub();
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'locked', 'Hub objective starts locked');
hubStateFixture.daily.kills = DAILY_DEFS[0].target;
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'claimable', 'Hub objective becomes claimable');
hubStateFixture.daily.claimed[DAILY_DEFS[0].id] = true;
ok(hubObjectiveState(hubStateFixture, DAILY_DEFS[0], 'daily') === 'claimed', 'Hub objective becomes claimed');
const shellMarkup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const navAdr = readFileSync(new URL('../docs/decisions/ADR-0007-keep-five-navigation.md', import.meta.url), 'utf8');
ok((shellMarkup.match(/class="nav-btn"/g) || []).length === 5, 'Navigation keeps exactly five tabs');
for (const label of ['Build', 'Ship', 'Hub', 'Boosts', 'Menu']) {
  ok(shellMarkup.includes(`<span>${label}</span>`), `Navigation keeps ${label}`);
}
ok(shellMarkup.includes('id="btn-bag"') && shellMarkup.includes('data-panel="gear"'), 'Gear remains a separate FAB');
ok((shellMarkup.match(/aria-controls="sheet-root"/g) || []).length === 6, 'All six sheet launchers expose their controlled surface');
ok(navAdr.includes('Option A') && navAdr.includes('minimal active fill'), 'Keep-five Option A is locked in ADR-0007');
for (const section of ['Accessibility', 'Audio', 'Account', 'Purchases', 'Reset']) {
  ok(shellMarkup.includes(`menu-section-title">${section}`), `Menu has ${section} section`);
}
ok(!shellMarkup.includes('id="v-attrs"'), 'Menu has no attribute debug string');
ok((shellMarkup.match(/class="switch-ui"/g) || []).length === 2, 'Menu uses one switch component twice');
const boostFixture = createState();
boostFixture.authority.amount = 20;
const damageBoostPreview = metaUpgradePreview(boostFixture, 'signal_power');
ok(damageBoostPreview.current === '+0%' && damageBoostPreview.next === '+5%', 'Boost preview exposes exact current to next effect');
ok(damageBoostPreview.affordable === true && damageBoostPreview.cost === 8, 'Boost preview exposes exact affordability and Rep cost');
ok(typeof recommendedMetaId(boostFixture) === 'string', 'Boosts expose one domain recommendation');
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
ok(freshRoute.v === 2, 'fresh state schema v2');
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
saveState(migratedRoute);
ok(saveMemory.has(SAVE_KEY_V2), 'save writes v2 key');
ok(!saveMemory.has(SAVE_KEY_V1), 'save does not write legacy key');
const roundTrip = loadState();
ok(roundTrip?.v === 2 && roundTrip.route?.zone === 1905, 'v2 save round trip');
const appliedRoundTrip = createState();
applySave(appliedRoundTrip, roundTrip);
ok(appliedRoundTrip.settings.gearSort === 'rarity' && appliedRoundTrip.settings.gearFilter === 'junk', 'gear view preferences persist');
saveMemory.clear();
saveMemory.set(SAVE_KEY_V1, JSON.stringify({ v: 1, ts: 1, run: { zone: 77 } }));
ok(loadState()?.v === 1, 'load falls back to legacy key');
ok(saveMemory.has(SAVE_KEY_V1), 'legacy key preserved during migration');
saveMemory.set(SAVE_KEY_V2, '{corrupt-json');
ok(loadState()?.v === 1, 'corrupt v2 falls back to valid legacy save');
clearSave();
ok(!saveMemory.has(SAVE_KEY_V1) && !saveMemory.has(SAVE_KEY_V2), 'New Game clears both save keys');

// —— Basic combat ——
const s = createState();
s.run.hero.scanner = 5;
let sawAnchoredDamage = false;
let sawSignalFlight = false;
for (let i = 0; i < 60 * 8; i++) {
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
for (let i = 0; i < 5; i++) allocAttr(sSharp, 'verify');
ok(allocSkill(sSharp, 'sharp_eye'), 'learn sharp eye at Crit 5');
ok(skillLv(sSharp, 'sharp_eye') === 1, 'sharp eye rank 1');
const crit0 = createState();
const crit1 = createState();
crit1.run.hero.skills.sharp_eye = 5;
ok(combatStats(crit1).crit > combatStats(crit0).crit, 'sharp eye raises crit');

// —— Ship ——
s3.run.patches = 5;
s3.meta.live = 1.1;
ok(shipPatches(s3), 'ship patches');
ok(s3.authority.amount >= 5, 'authority gained');
ok(s3.meta.premium.coins >= 1, 'ship grants coins');

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

// —— Brand 4-slot gear (Weapon · Chest · Legs · Visor) ——
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

// —— Prestige keeps gear + boosts + pro, resets signal ——
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
ok(s7.meta.premium.pro === true, 'pro kept');
ok(s7.meta.premium.coins >= 10 + 15, 'season coins granted');
ok(s7.meta.gear.weapon?.name === gearName, 'gear kept');
ok(s7.meta.gear.chest?.name === chestName, 'chest kept');
ok(s7.meta.live > liveBefore, 'live grew');

// —— Premium mult (energy empty so Auto-Sprint doesn’t add SPRINT_DMG) ——
const s8 = createState();
s8.run.hero.scanner = 5;
s8.run.hero.energy = 0;
const base = combatStats(s8).dmg;
ok(unlockPro(s8), 'unlock pro');
s8.run.hero.energy = 0;
ok(Math.abs(combatStats(s8).dmg / base - 1.25) < 0.02, 'pro ×1.25 dmg');
ok(economyMult(s8) >= 1.25, 'economy mult pro');
ok(s8.meta.premium.autoSprint === true, 'pro includes auto-sprint');
s8.meta.premium.coins = 100;
ok(buyBoost2x(s8), 'buy 2x boost');
ok(economyMult(s8) >= 2.4, `boost stacks (${economyMult(s8).toFixed(2)})`);
ok(buyCoinPack(s8, 'coins_100'), 'coin pack');
ok(s8.meta.premium.coins >= 100, 'pack coins');

// —— Premium gear boxes ——
ok(Array.isArray(PREMIUM.boxes) && PREMIUM.boxes.length >= 3, 'box catalog');
const sBox = createState();
sBox.meta.premium.coins = 500;
sBox.route.zone = 12;
ok(buyGearBox(sBox, 'box_signal'), 'open signal crate');
const after1 = Object.values(sBox.meta.gear).filter((x) => x && typeof x === 'object' && x.id).length
  + (sBox.meta.gear.bag?.length || 0);
// count properly via slots
let pieces = SLOTS.filter((sl) => sBox.meta.gear[sl]).length + (sBox.meta.gear.bag?.length || 0);
ok(pieces >= 1, `box gave gear (${pieces})`);
ok(buyGearBox(sBox, 'box_loadout'), 'open loadout box');
pieces = SLOTS.filter((sl) => sBox.meta.gear[sl]).length + (sBox.meta.gear.bag?.length || 0);
ok(pieces >= 3, `loadout box stacked (${pieces})`);
ok(sBox.meta.premium.coins < 500, 'coins spent on boxes');

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
