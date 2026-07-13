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
  economyMult,
  skillLv,
  claimHubObjective,
} from '../js/game.js';
import { emptyGear, rollItem, offerItem } from '../js/loot.js';
import { SKILLS } from '../js/content.js';
import { hubOnKill } from '../js/hub.js';

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
};

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
const gearName = s7.meta.gear.weapon.name;
const liveBefore = s7.meta.live;
ok(leaveSeason(s7), 'end season');
ok(s7.run.hero.scanner === 0, 'signal reset');
ok(s7.authority.upgrades.signal_power === 3, 'boosts kept');
ok(s7.authority.amount === 100, 'rep kept');
ok(s7.meta.premium.pro === true, 'pro kept');
ok(s7.meta.premium.coins >= 10 + 15, 'season coins granted');
ok(s7.meta.gear.weapon?.name === gearName, 'gear kept');
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
