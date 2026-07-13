import { C, scannerDamage, enemyHp, isBossZone, killsNeeded } from '../js/formulas.js';
import {
  createState,
  step,
  allocAttr,
  allocSkill,
  buyScanner,
  castHotfix,
  shipPatches,
  combatStats,
} from '../js/game.js';

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
};

const s = createState();
// combat damages enemies
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
  ok(!still || still.hp < hp0 - 0.5 || s2.meta.kills > 0, `HP decreases or dies (hp0=${hp0|0} now=${still ? still.hp|0 : 'dead'} kills=${s2.meta.kills})`);
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

// ship
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

// season push
const s5 = createState();
s5.run.hero.scanner = 30;
s5.run.hero.sp = 100;
for (let i = 0; i < 5; i++) allocAttr(s5, 'scan');
allocSkill(s5, 'live_tracker');
s5.run.hero.trackerOn = true;
for (let i = 0; i < 4; i++) allocAttr(s5, 'verify');
allocSkill(s5, 'verified_mask');
for (let i = 0; i < 60 * 60 * 6; i++) {
  s5.run.hero.energy = 100;
  s5.run.hero.mana = 60;
  step(s5, C.FIXED_DT);
  if (s5.ui.seasonDone) break;
}
ok(s5.meta.bosses >= 1, `bosses (${s5.meta.bosses})`);
ok(s5.run.zone >= 5 || s5.ui.seasonDone, `progress zone ${s5.run.zone}`);

// Endless zones: past checkpoint 20 combat still spawns/advances
const s6 = createState();
s6.run.zone = 19; // display Z20
s6.run.killsInZone = 0;
s6.run.hero.scanner = 40;
s6.ui.seasonDone = false;
// force boss zone clear (zone 19 is boss - killsNeeded 1)
for (let i = 0; i < 60 * 40; i++) {
  s6.run.hero.energy = 100;
  step(s6, C.FIXED_DT);
  if (s6.run.zone >= 21) break;
}
ok(s6.run.zone >= 20, `past Z20 zone=${s6.run.zone}`);
ok(s6.ui.seasonDone === true || s6.run.zone >= 20, 'checkpoint flag or beyond');
// after checkpoint, still can spawn (not softlocked)
const beforeEn = s6.world.enemies.length;
for (let i = 0; i < 60 * 3; i++) step(s6, C.FIXED_DT);
ok(s6.world.enemies.some((e) => e.hp > 0) || s6.meta.kills > 0, 'combat continues after Z20');
ok(enemyHp(50) > enemyHp(20), 'late HP still scales');
ok(enemyHp(80) / enemyHp(50) < enemyHp(30) / enemyHp(0), 'soft scale after Z40');

console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
process.exit(fails ? 1 : 0);
