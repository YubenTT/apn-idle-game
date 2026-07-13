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
} from '../js/game.js';
import { emptyGear, rollItem, offerItem } from '../js/loot.js';

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
};

const s = createState();
s.run.hero.scanner = 5;
for (let i = 0; i < 60 * 8; i++) step(s, C.FIXED_DT);
ok(s.meta.kills > 0, `kills occur (${s.meta.kills})`);
ok(s.run.bytes > 0, `bytes drop (${s.run.bytes | 0})`);
ok(s.stats.dps >= 0, 'dps meter');

// HP actually decreases mid-fight
const s2 = createState();
s2.run.hero.scanner = 10;
for (let i = 0; i < 60 * 5; i++) step(s2, C.FIXED_DT);
const e = s2.world.enemies.find((x) => x.hp > 0);
ok(s2.meta.kills > 0 || !!e, 'combat produced kills or live enemy');
if (e) {
  const hp0 = e.hp;
  const id = e.id;
  for (let i = 0; i < 60 * 3; i++) step(s2, C.FIXED_DT);
  const still = s2.world.enemies.find((x) => x.id === id);
  ok(
    !still || still.hp < hp0 - 0.5 || s2.meta.kills > 0,
    `HP decreases or dies (hp0=${hp0 | 0} now=${still ? still.hp | 0 : 'dead'} kills=${s2.meta.kills})`
  );
} else {
  ok(s2.meta.kills > 0, 'kills without residual enemy');
}

// skills
const s3 = createState();
s3.run.hero.sp = 40;
ok(allocAttr(s3, 'scan'), 'alloc scan');
ok(allocSkill(s3, 'hotfix') || s3.run.hero.scan >= 1, 'hotfix path');
if (s3.run.hero.scan >= 1) allocSkill(s3, 'hotfix');
s3.run.hero.mana = 60;
s3.run.hero.scanner = 8;
for (let i = 0; i < 30; i++) step(s3, C.FIXED_DT);
ok(castHotfix(s3) || s3.world.enemies.length === 0, 'hotfix cast');

// ship notes → rep
s3.run.patches = 5;
s3.meta.live = 1.1;
ok(shipPatches(s3), 'ship patches');
ok(s3.authority.amount >= 5, 'authority gained');

// scanner buy
const s4 = createState();
s4.run.bytes = 1000;
const d0 = combatStats(s4).dmg;
ok(buyScanner(s4), 'buy scanner');
ok(combatStats(s4).dmg > d0, 'scanner increases dmg');

ok(isBossZone(9), 'boss zone 10');
ok(killsNeeded(9) === 1, 'boss needs 1');
ok(enemyHp(5) > enemyHp(0), 'hp scales');
ok(scannerDamage(3) > scannerDamage(0), 'scanner scales');

// Multi-hit when lagging weapon; pace clears without brick walls
ok(expectedHits(20, 8) > 3, `Z21 lag multi-hit (${expectedHits(20, 8).toFixed(1)})`);
ok(expectedHits(50, 20) > 3, `Z51 lag multi-hit (${expectedHits(50, 20).toFixed(1)})`);
ok(expectedHits(70, 40) > 2.5, `Z71 lag multi-hit (${expectedHits(70, 40).toFixed(1)})`);
// Pace weapon (≈0.9×zone) is snappy but not free one-shot
const pace70 = Math.floor(70 * 0.9);
ok(expectedHits(70, pace70) > 2 && expectedHits(70, pace70) < 25,
  `Z71 pace sc${pace70} hits=${expectedHits(70, pace70).toFixed(1)}`);
ok(expectedHits(0, 0) < 8, `Z1 starter reachable (${expectedHits(0, 0).toFixed(1)} hits)`);
ok(expectedHits(10, 9) < 15, `Z11 pace not brick (${expectedHits(10, 9).toFixed(1)})`);
// Very ahead still multi-hits early (soft one-shot only if massively overleveled)
ok(expectedHits(20, 35) > 1.2, `Z21 ahead still multi (${expectedHits(20, 35).toFixed(1)})`);

// season push
const s5 = createState();
s5.run.hero.scanner = 30;
s5.run.hero.sp = 100;
for (let i = 0; i < 5; i++) allocAttr(s5, 'scan');
allocSkill(s5, 'live_tracker');
s5.run.hero.trackerOn = true;
for (let i = 0; i < 4; i++) allocAttr(s5, 'verify');
allocSkill(s5, 'verified_mask');
for (let i = 0; i < 60 * 60 * 8; i++) {
  s5.run.hero.energy = 100;
  s5.run.hero.mana = 60;
  step(s5, C.FIXED_DT);
  if (s5.ui.seasonDone) break;
}
ok(s5.meta.bosses >= 1, `bosses (${s5.meta.bosses})`);
ok(s5.run.zone >= 5 || s5.ui.seasonDone, `progress zone ${s5.run.zone}`);

// Endless zones: past checkpoint 20 combat still spawns/advances
const s6 = createState();
s6.run.zone = 19;
s6.run.killsInZone = 0;
s6.run.hero.scanner = 45;
s6.ui.seasonDone = false;
for (let i = 0; i < 60 * 60; i++) {
  s6.run.hero.energy = 100;
  step(s6, C.FIXED_DT);
  if (s6.run.zone >= 21) break;
}
ok(s6.run.zone >= 20, `past Z20 zone=${s6.run.zone}`);
ok(s6.ui.seasonDone === true || s6.run.zone >= 20, 'checkpoint flag or beyond');
for (let i = 0; i < 60 * 3; i++) step(s6, C.FIXED_DT);
ok(s6.world.enemies.some((e) => e.hp > 0) || s6.meta.kills > 0, 'combat continues after Z20');
ok(enemyHp(50) > enemyHp(20), 'late HP still scales');
ok(enemyHp(100) > enemyHp(70), 'very late HP still scales');

// Prestige: Boosts + Rep permanent, weapon resets
const s7 = createState();
s7.run.zone = 20;
s7.ui.seasonDone = true;
s7.run.hero.scanner = 40;
s7.run.patches = 0;
s7.authority.amount = 100;
s7.authority.shippedThisSeason = 50;
s7.authority.upgrades.signal_power = 3;
s7.authority.upgrades.cold_start = 2;
s7.meta.live = 1.1;
const liveBefore = s7.meta.live;
ok(leaveSeason(s7), 'end season');
ok(s7.run.hero.scanner === 0, `weapon reset (sc=${s7.run.hero.scanner})`);
ok(s7.authority.upgrades.signal_power === 3, 'boost signal_power kept');
ok(s7.authority.upgrades.cold_start === 2, 'boost cold_start kept');
ok(s7.authority.amount === 100, `rep kept (${s7.authority.amount})`);
ok(s7.meta.live > liveBefore, `live mult grew (${s7.meta.live.toFixed(3)})`);
ok(s7.run.zone === 0, 'zone reset');
ok(s7.authority.shippedThisSeason === 0, 'season ship counter reset');

// Live Mult multiplies damage
const s8 = createState();
s8.run.hero.scanner = 5;
const dBase = combatStats(s8).dmg;
s8.meta.live = 2;
ok(Math.abs(combatStats(s8).dmg - dBase * 2) < 0.01, 'live mult on damage');

// Sprint flag
const s9 = createState();
s9.run.hero.energy = 100;
setSprint(s9, true);
ok(isSprinting(s9), 'sprint on with energy');
ok(combatStats(s9).timeScale >= C.SPRINT_TIME - 0.01, `sprint timeScale ${combatStats(s9).timeScale}`);
s9.run.hero.energy = 0;
ok(!isSprinting(s9), 'sprint off when empty');

// Soft weapon DR after high levels (no infinite one-shot snowball)
const growEarly = scannerDamage(20) / scannerDamage(10);
const growLate = scannerDamage(60) / scannerDamage(50);
ok(growLate < growEarly, `weapon soft DR late (${growLate.toFixed(3)} < ${growEarly.toFixed(3)})`);

// Gear permanence across End Season
const s10 = createState();
s10.meta.gear = emptyGear();
const drop = rollItem(25, 'weapon');
offerItem(s10.meta.gear, drop);
s10.ui.seasonDone = true;
s10.run.zone = 20;
s10.run.hero.scanner = 15;
s10.authority.shippedThisSeason = 30;
const gearName = s10.meta.gear.weapon?.name;
ok(!!gearName, `gear equipped pre-season (${gearName})`);
ok(leaveSeason(s10), 'leave with gear');
ok(s10.meta.gear.weapon?.name === gearName, 'gear survives End Season');
ok(s10.run.hero.scanner === 0, 'signal weapon still resets');

console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
process.exit(fails ? 1 : 0);
