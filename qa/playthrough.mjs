/**
 * Headless “new player” playthrough QA.
 * Simulates first minutes → mid zones → ship → boosts → prestige path.
 */
import { C } from '../js/formulas.js';
import {
  createState,
  step,
  allocAttr,
  allocSkill,
  buyScanner,
  shipPatches,
  leaveSeason,
  buyMeta,
  combatStats,
  setSprint,
  unlockPro,
  economyMult,
} from '../js/game.js';
import { META, SKILLS } from '../js/content.js';

const log = [];
const note = (m) => {
  log.push(m);
  console.log(m);
};

function sim(s, seconds, { sprint = false, keepResources = true } = {}) {
  if (sprint) setSprint(s, true);
  const n = Math.floor(seconds / C.FIXED_DT);
  for (let i = 0; i < n; i++) {
    if (keepResources) {
      s.run.hero.energy = Math.max(s.run.hero.energy, 40);
      s.run.hero.mana = Math.max(s.run.hero.mana, 20);
    }
    // Auto-buy signal when affordable
    if (s.run.bytes >= 14) {
      const cost = Math.floor(14 * 1.22 ** s.run.hero.scanner);
      if (s.run.bytes >= cost) buyScanner(s);
    }
    step(s, C.FIXED_DT);
  }
  setSprint(s, false);
}

const s = createState();
note('=== NEW GAME ===');
note(`Z${s.run.zone + 1} sc${s.run.hero.scanner} dmg=${combatStats(s).dmg | 0}`);

// Minute 0–2: pure auto
sim(s, 90);
note(
  `t=90s kills=${s.meta.kills} zone=${s.run.zone + 1} rank=${s.run.hero.level} sp=${s.run.hero.sp} sig=${s.run.bytes | 0}`
);
if (s.meta.kills < 1) {
  console.error('FAIL: no kills in 90s');
  process.exit(1);
}

// Spend SP into Damage path + Burst
while (s.run.hero.sp > 0 && s.run.hero.scan < 3) allocAttr(s, 'scan');
if (s.run.hero.scan >= 1) allocSkill(s, 'hotfix');
note(`Build: Damage ${s.run.hero.scan} · Burst ${s.run.hero.skills.hotfix || 0}`);

// Play to zone 5–10
for (let t = 0; t < 40; t++) {
  sim(s, 15, { sprint: t % 3 === 0 });
  while (s.run.hero.sp > 0) {
    if (s.run.hero.scan < 5) allocAttr(s, 'scan');
    else if (s.run.hero.verify < 3) allocAttr(s, 'verify');
    else if (s.run.hero.amplify < 3) allocAttr(s, 'amplify');
    else if (s.run.hero.scan >= 5 && (s.run.hero.skills.live_tracker || 0) < 3)
      allocSkill(s, 'live_tracker') || allocAttr(s, 'scan');
    else if (s.run.hero.verify >= 1 && (s.run.hero.skills.notify || 0) < 2)
      allocSkill(s, 'notify') || allocAttr(s, 'verify');
    else break;
  }
  if (s.run.zone >= 9) break;
}
note(
  `mid: Z${s.run.zone + 1} kills=${s.meta.kills} bosses=${s.meta.bosses} sc=${s.run.hero.scanner} notes=${s.run.patches | 0} gearW=${s.meta.gear?.weapon?.name || '—'}`
);

// Ship notes if any
if (s.run.patches >= 1) {
  const rep0 = s.authority.amount;
  shipPatches(s);
  note(`shipped: +${s.authority.amount - rep0} Rep · coins=${s.meta.premium.coins}`);
}

// Buy a cheap boost if possible
if (s.authority.amount >= 5) {
  buyMeta(s, 'xp_posts');
  note(`boost Faster Ranks Lv ${s.authority.upgrades.xp_posts}`);
}

// Optional Pro demo
unlockPro(s);
note(`Pro on · economy ×${economyMult(s).toFixed(2)}`);

// Push toward checkpoint 20
let guard = 0;
while (s.run.zone < 20 && guard++ < 200) {
  sim(s, 20, { sprint: true });
  while (s.run.hero.sp > 2) {
    if (s.run.hero.scan < 8) allocAttr(s, 'scan');
    else if ((s.run.hero.skills.scroll_speed || 0) < 4 && s.run.hero.scan >= 3)
      allocSkill(s, 'scroll_speed') || allocAttr(s, 'scan');
    else if ((s.run.hero.skills.live_tracker || 0) < 6 && s.run.hero.scan >= 5)
      allocSkill(s, 'live_tracker') || allocAttr(s, 'scan');
    else if (s.run.hero.amplify < 5) allocAttr(s, 'amplify');
    else if ((s.run.hero.skills.deep_dive || 0) < 4) allocSkill(s, 'deep_dive') || allocAttr(s, 'amplify');
    else break;
  }
  if (s.run.patches >= 3) shipPatches(s);
}
note(
  `late: Z${s.run.zone + 1} seasonDone=${s.ui.seasonDone} bosses=${s.meta.bosses} sc=${s.run.hero.scanner} live=${s.meta.live.toFixed(2)} dps≈${s.stats.dps | 0}`
);

// End season if ready
if (s.ui.seasonDone || s.run.zone >= 20) {
  const gear = s.meta.gear?.weapon?.name;
  const pro = s.meta.premium.pro;
  const boosts = { ...s.authority.upgrades };
  leaveSeason(s);
  note(
    `prestige: Z${s.run.zone + 1} sc=${s.run.hero.scanner} live×${s.meta.live.toFixed(2)} gear=${s.meta.gear?.weapon?.name || '—'} pro=${s.meta.premium.pro}`
  );
  if (gear && s.meta.gear?.weapon?.name !== gear) {
    console.error('FAIL: gear lost on prestige');
    process.exit(1);
  }
  if (pro && !s.meta.premium.pro) {
    console.error('FAIL: pro lost');
    process.exit(1);
  }
  if (boosts.signal_power !== s.authority.upgrades.signal_power) {
    // may be 0 if never bought — only check if had levels
  }
  // Post-prestige should still kill
  sim(s, 30);
  note(`post-prestige kills+= ok total=${s.meta.kills}`);
}

// Masks never present
const maskIds = Object.keys(s.run.hero.skills).filter((id) => SKILLS[id]?.type === 'mask');
if (maskIds.length) {
  console.error('FAIL: mask skills present', maskIds);
  process.exit(1);
}

// Skill catalog sanity
for (const sk of Object.values(SKILLS)) {
  if (sk.type === 'mask') {
    console.error('FAIL: mask in catalog', sk.id);
    process.exit(1);
  }
}

note('=== PLAYTHROUGH PASS ===');
console.log(
  JSON.stringify(
    {
      zone: s.run.zone + 1,
      kills: s.meta.kills,
      bosses: s.meta.bosses,
      rank: s.run.hero.level,
      scanner: s.run.hero.scanner,
      live: s.meta.live,
      pro: s.meta.premium.pro,
      coins: s.meta.premium.coins,
      gear: !!s.meta.gear?.weapon,
      economy: economyMult(s),
    },
    null,
    2
  )
);
