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
} from '../js/loot.js';
import { SKILLS, PREMIUM } from '../js/content.js';
import { hubOnKill } from '../js/hub.js';
import { checkCssTokenContract } from './check-css-tokens.mjs';

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

// —— Basic combat ——
const s = createState();
s.run.hero.scanner = 5;
for (let i = 0; i < 60 * 8; i++) step(s, C.FIXED_DT);
ok(s.meta.kills > 0, `kills occur (${s.meta.kills})`);
ok(s.run.bytes > 0, `bytes drop (${s.run.bytes | 0})`);

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
s3.run.hero.mana = 60;
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
ok(expectedHits(0, 0) < 8, `Z1 starter (${expectedHits(0, 0).toFixed(1)}h)`);
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
  s5.run.hero.mana = 60;
  step(s5, C.FIXED_DT);
  if (s5.ui.seasonDone) break;
}
ok(s5.meta.bosses >= 1, `bosses (${s5.meta.bosses})`);
ok(s5.run.zone >= 5 || s5.ui.seasonDone, `progress zone ${s5.run.zone}`);

// —— Endless past 20 ——
const s6 = createState();
s6.run.zone = 19;
s6.run.hero.scanner = 45;
for (let i = 0; i < 60 * 60; i++) {
  s6.run.hero.energy = 100;
  step(s6, C.FIXED_DT);
  if (s6.run.zone >= 21) break;
}
ok(s6.run.zone >= 20, `past Z20 zone=${s6.run.zone}`);

// —— Brand 4-slot gear (Weapon · Chest · Legs · Visor) ——
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
weak.score = 1;
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

// —— Prestige keeps gear + boosts + pro, resets signal ——
const s7 = createState();
s7.run.zone = 20;
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
ok(leaveSeason(s7), 'end season');
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
sBox.run.zone = 12;
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
