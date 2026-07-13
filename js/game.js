/** APN Idle — domain state + combat (pure enough for headless tests) */

import {
  C,
  clamp,
  scannerCost,
  scannerDamage,
  xpToNext,
  enemyHp,
  killsNeeded,
  isBossZone,
  typeHpMult,
  liveGain,
  metaCost,
  lerp,
  isSeasonCheckpoint,
} from './formulas.js';
import { SEASON, META, SKILLS, ENEMY_FLAVOR, PREMIUM, skillSpCost } from './content.js';
import {
  ensureHub,
  hubOnKill,
  hubOnZone,
  hubOnShip,
  hubOnOrb,
  hubOnGear,
  emptyHub,
  DAILY_DEFS,
  WEEKLY_DEFS,
  hubDone,
  hubClaimed,
  applyReward,
  seasonLevel,
  SEASON_MILESTONES,
} from './hub.js';
import {
  killLine,
  pick,
  BOSS_OPEN,
  BOSS_WIN,
  BOSS_FAIL,
  LEVEL_LINES,
  SHIP_LINES,
  SCANNER_LINES,
} from './comedy.js';
import { sfx } from './sfx.js';
import {
  emptyGear,
  normalizeGear,
  rollItem,
  offerItem,
  equipFromBag,
  unequipSlot,
  sellFromBag,
  gearBonuses,
  shouldDropOnKill,
  rarityColor,
  rarityLabel,
  pickSlotForGear,
  SLOTS,
  BAG_CAP,
} from './loot.js';

export function createState() {
  return {
    v: 1,
    meta: {
      live: 1,
      season: 0,
      kills: 0,
      ships: 0,
      bosses: 0,
      postsShippedTotal: 0,
      /** Permanent loadout — survives End Season */
      gear: emptyGear(),
      /**
       * Monetization surface (survives End Season).
       * pro: permanent APN Pro mult
       * coins: premium soft currency (bosses/ships/IAP packs)
       * boostEndsAt: ms timestamp for timed 2× boost
       */
      premium: {
        pro: false,
        coins: 0,
        boostEndsAt: 0,
        autoSprint: false,
        warpCdUntil: 0,
      },
      hub: emptyHub(),
    },
    authority: {
      amount: 0,
      shippedThisSeason: 0,
      upgrades: Object.fromEntries(Object.keys(META).map((k) => [k, 0])),
    },
    run: {
      zone: 0,
      killsInZone: 0,
      bytes: 0,
      patches: 0,
      hero: {
        level: 1,
        xp: 0,
        sp: 0,
        scan: 0,
        verify: 0,
        amplify: 0,
        energy: C.ENERGY_MAX,
        mana: C.MANA_MAX,
        scanner: 0,
        skills: {},
        trackerOn: false,
        deepOn: false,
        trackerStacks: 0,
        summaryT: 0,
        attackAnim: 0,
        hitRecoil: 0,
      },
    },
    world: {
      heroX: 130,
      heroDisplayX: 130,
      scroll: 0,
      scrollSmooth: 0,
      enemies: [],
      alerts: [],
      floaters: [],
      particles: [],
      confetti: [],
      shocks: [],
      spawnCd: 0.3,
      alertCd: 1.5,
      bossTimer: 0,
      bossActive: false,
      attackCd: 0,
      sprinting: false,
      time: 0,
      groundY: 0,
      shake: 0,
    },
    ui: {
      panel: null,
      toast: null,
      toastT: 0,
      tips: {},
      pendingTip: 'start',
      offline: null,
      seasonDone: false,
      panelDirty: true,
    },
    settings: { reducedMotion: false, sfx: true, lastTs: Date.now() },
    stats: { dps: 0, dpsAcc: 0, dpsT: 0, combo: 0, comboT: 0, bestCombo: 0 },
  };
}

export function skillLv(s, id) {
  return s.run.hero.skills[id] || 0;
}

export function metaLv(s, id) {
  return s.authority.upgrades[id] || 0;
}

export function metaPer(s, id) {
  const d = META[id];
  if (!d) return 0;
  return d.per * metaLv(s, id);
}

/** Auto-sprint = Pro or paid unlock (not free mask) */
export function hasAutoSprint(s) {
  ensurePremium(s);
  return !!(s.meta.premium.pro || s.meta.premium.autoSprint);
}

/** Sprint when holding OR auto-sprint, while energy remains */
export function isSprinting(s) {
  const want = s.world.sprinting || hasAutoSprint(s);
  return !!(want && s.run.hero.energy > 0.5);
}

export function setSprint(s, on) {
  s.world.sprinting = !!on;
  s.ui.sprintWanted = !!on || hasAutoSprint(s);
}

/** Ensure premium blob exists (save migration) */
export function ensurePremium(s) {
  if (!s.meta.premium) {
    s.meta.premium = {
      pro: false,
      coins: 0,
      boostEndsAt: 0,
      autoSprint: false,
      warpCdUntil: 0,
    };
  }
  const p = s.meta.premium;
  if (typeof p.coins !== 'number') p.coins = 0;
  if (typeof p.boostEndsAt !== 'number') p.boostEndsAt = 0;
  if (typeof p.autoSprint !== 'boolean') p.autoSprint = false;
  if (typeof p.warpCdUntil !== 'number') p.warpCdUntil = 0;
  // Pro includes auto-sprint
  if (p.pro) p.autoSprint = true;
  return p;
}

/** Live × Pro × timed 2× — multiplies damage + Signal/Notes income */
export function economyMult(s) {
  ensurePremium(s);
  let m = Math.max(1, s.meta.live || 1);
  if (s.meta.premium.pro) m *= PREMIUM.pro.mult;
  if (s.meta.premium.boostEndsAt > Date.now()) m *= PREMIUM.boost_2x.mult;
  return m;
}

export function boostActive(s) {
  ensurePremium(s);
  return s.meta.premium.boostEndsAt > Date.now();
}

export function boostSecondsLeft(s) {
  ensurePremium(s);
  return Math.max(0, (s.meta.premium.boostEndsAt - Date.now()) / 1000);
}

export function combatStats(s) {
  const h = s.run.hero;
  const g = gearBonuses(s.meta.gear);
  const flat = metaPer(s, 'cold_start') + (g.flat_dmg || 0);
  let dmg = scannerDamage(h.scanner, flat);
  dmg *= 1 + 0.024 * h.scan;
  dmg *= 1 + metaPer(s, 'signal_power');
  dmg *= 1 + (g.dmg_pct || 0) / 100;
  dmg *= economyMult(s);

  const sharp = skillLv(s, 'sharp_eye');
  let crit = Math.min(
    0.72,
    0.012 * h.verify + (g.crit_pct || 0) / 100 + 0.015 * sharp
  );
  let interval = C.ATTACK_INTERVAL / (1 + (g.atk_spd || 0) / 100);
  let move = C.MOVE_SPEED * (1 + metaPer(s, 'feed_speed')) * (1 + (g.move_pct || 0) / 100);
  let eMax = C.ENERGY_MAX + 4 * h.verify + (g.energy || 0);
  let eRegen = C.ENERGY_REGEN + (g.e_regen || 0);
  let mMax = C.MANA_MAX + 8 * h.amplify;
  let mRegen = C.MANA_REGEN + 0.08 * h.amplify;
  let skillMult = 1;
  let sprintDrain = C.SPRINT_DRAIN;
  let timeScale = 1;

  const scroll = skillLv(s, 'scroll_speed');
  const amp = skillLv(s, 'amplify');
  const notify = skillLv(s, 'notify');
  const tracker = skillLv(s, 'live_tracker');
  const deep = skillLv(s, 'deep_dive');
  const marathon = skillLv(s, 'marathon');
  const sprintOn = isSprinting(s);

  if (scroll) {
    interval /= 1 + 0.032 * scroll;
    sprintDrain *= Math.max(0.45, 1 - 0.035 * scroll);
  }
  if (amp) skillMult *= 1.08 + 0.045 * amp;
  if (notify) eRegen += 0.45 * notify;
  if (marathon) {
    eRegen += 0.55 * marathon;
    sprintDrain *= Math.max(0.4, 1 - 0.05 * marathon);
  }

  if (sprintOn) {
    timeScale = C.SPRINT_TIME;
    interval /= C.SPRINT_ATK;
    move *= C.SPRINT_MULT;
    dmg *= C.SPRINT_DMG;
  }

  if (h.trackerOn && tracker > 0) {
    const cap = 0.42 + 0.11 * tracker;
    dmg *= 1 + Math.min(cap, h.trackerStacks) * skillMult;
  }
  if (h.deepOn && deep > 0) {
    dmg *= (1.48 + 0.075 * deep) * skillMult;
    eRegen -= 5.2;
  }

  return {
    dmg,
    crit,
    interval,
    move,
    eMax,
    eRegen,
    mMax,
    mRegen,
    skillMult,
    sprintDrain,
    sprintOn,
    timeScale,
    notify,
    tracker,
    deep,
    gear: g,
    economy: economyMult(s),
    summary: skillLv(s, 'summary_burst'),
    hotfix: skillLv(s, 'hotfix'),
  };
}

function toast(s, msg, dur = 2.6) {
  s.ui.toast = msg;
  s.ui.toastT = dur;
}

function tip(s, id) {
  if (s.ui.tips[id]) return;
  s.ui.tips[id] = true;
  s.ui.pendingTip = id;
}

// Domain events carry a semantic visual role; render.js owns the CSS token value.
const tone = (role) => ({ tone: role });

function floater(s, x, y, text, color, big = false) {
  s.world.floaters.push({
    x: x + (Math.random() - 0.5) * 18,
    y,
    text,
    color,
    t: big ? 1.25 : 1.0,
    life: big ? 1.25 : 1.0,
    vy: big ? -78 : -56,
    big,
  });
}

function particles(s, x, y, color, n = 10, kind = 'spark') {
  if (s.settings.reducedMotion) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp =
      kind === 'coin' ? 50 + Math.random() * 90 : 40 + Math.random() * 120;
    const life = kind === 'coin' ? 0.7 + Math.random() * 0.35 : 0.35 + Math.random() * 0.4;
    s.world.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (kind === 'coin' ? 80 : 40),
      t: life,
      life,
      c: color,
      r: kind === 'coin' ? 3.5 + Math.random() * 2.5 : 2 + Math.random() * 3.5,
      kind,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 12,
    });
  }
}

/** Confetti burst — rank up, patch kill, shop spend */
export function confetti(s, x, y, colors, n = 22) {
  if (s.settings.reducedMotion) return;
  const cols = colors || ['#FC1243', '#6cb8ff', '#3ecf8e', '#e6b84d', '#c084fc', '#fff'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const sp = 80 + Math.random() * 180;
    const life = 0.7 + Math.random() * 0.6;
    s.world.confetti.push({
      x,
      y,
      vx: Math.cos(a) * sp * (0.4 + Math.random()),
      vy: Math.sin(a) * sp,
      t: life,
      life,
      c: cols[i % cols.length],
      w: 4 + Math.random() * 5,
      h: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 14,
    });
  }
}

function pickEnemyType(zone, forceBoss) {
  if (forceBoss) return 'boss';
  const r = Math.random();
  if (r < C.CHAMPION_CHANCE) return 'patch';
  if (r < C.CHAMPION_CHANCE + C.ELITE_CHANCE) {
    return Math.random() < 0.5 ? 'lag' : Math.random() < 0.5 ? 'spoiler' : 'event';
  }
  return Math.random() < 0.5 ? 'stale' : 'rumor';
}

export function spawnEnemy(s) {
  const zone = s.run.zone;
  const boss = isBossZone(zone);
  if (boss && s.world.bossActive) return null;
  if (boss && s.run.killsInZone > 0) return null;

  const type = pickEnemyType(zone, boss && !s.world.bossActive);
  if (type === 'boss') {
    s.world.bossActive = true;
    s.world.bossTimer = C.BOSS_TIMER;
    toast(s, pick(BOSS_OPEN));
    tip(s, 'boss');
  }

  const hp = enemyHp(zone, typeHpMult(type));
  const alive = s.world.enemies.filter((e) => e.hp > 0);
  // Spawn ahead of melee stop so approach is clear (enemy not glued to mascot)
  const x = s.world.heroX + 150 + Math.random() * 28;
  const flavor = ENEMY_FLAVOR[type] || ENEMY_FLAVOR.stale;

  return {
    id: Math.random().toString(36).slice(2, 9),
    type,
    label: flavor.label,
    color: flavor.color,
    x,
    displayX: x,
    y: 0,
    hp,
    hpMax: hp,
    hitFlash: 0,
    hurt: 0,
    w: type === 'boss' ? 52 : type === 'patch' ? 34 : 28,
    h: type === 'boss' ? 78 : type === 'patch' ? 52 : 42,
  };
}

function grantXp(s, amount) {
  const h = s.run.hero;
  h.xp += amount;
  let g = 0;
  while (h.xp >= xpToNext(h.level) && g++ < 40) {
    h.xp -= xpToNext(h.level);
    h.level += 1;
    h.sp += C.SP_PER_LEVEL;
    floater(s, s.world.heroX, 150, `RANK ${h.level}`, '#10B981', true);
    floater(s, s.world.heroX + 20, 175, `+${C.SP_PER_LEVEL} SP`, tone('sp'), true);
    toast(s, pick(LEVEL_LINES) + ` (+${C.SP_PER_LEVEL} SP)`);
    tip(s, 'level');
    particles(s, s.world.heroX, 200, '#FC1243', 18);
    confetti(s, s.world.heroX, 180, ['#FC1243', '#10B981', '#e6b84d', '#fff'], 28);
    s.ui.fx = { kind: 'rank', t: 0.55 };
    s.ui.panelDirty = true;
    if (s.settings.sfx !== false) sfx('rank');
  }
}

function onKill(s, e) {
  s.meta.kills += 1;
  s.run.killsInZone += 1;

  // combo juice
  s.stats.combo += 1;
  s.stats.comboT = 2.4;
  if (s.stats.combo > s.stats.bestCombo) s.stats.bestCombo = s.stats.combo;
  const comboMult = 1 + Math.min(0.5, (s.stats.combo - 1) * 0.04);
  if (s.stats.combo >= 5 && s.stats.combo % 5 === 0) {
    floater(s, s.world.heroX, 120, `${s.stats.combo}x FEED STREAK`, '#FC1243', true);
    tip(s, 'combo');
  }

  const zone = s.run.zone;
  const gb = gearBonuses(s.meta.gear);
  const eco = economyMult(s);
  const byteM =
    (1 + metaPer(s, 'byte_gain')) * (1 + (gb.signal_pct || 0) / 100) * eco;
  let typeByte = 1;
  let typeXp = 1;
  if (e.type === 'lag' || e.type === 'spoiler' || e.type === 'event') {
    typeByte = 2;
    typeXp = 1.5;
  }
  if (e.type === 'patch') {
    typeByte = 1.6;
    typeXp = 1.9;
  }
  if (e.type === 'boss') {
    typeByte = 14;
    typeXp = 5.5;
  }

  const bytes =
    C.BYTE_BASE * (1 + 0.09 * zone) * typeByte * byteM * comboMult * (0.9 + Math.random() * 0.2);
  s.run.bytes += bytes;
  floater(s, e.displayX, 170, `+${bytes | 0} Signal`, '#6cb8ff');
  particles(s, e.displayX, 190, '#6cb8ff', 10 + Math.min(14, s.stats.combo), 'coin');
  s.ui.chipPulse = s.ui.chipPulse || {};
  s.ui.chipPulse.bytes = 0.35;
  if (s.settings.sfx !== false) sfx(e.type === 'patch' ? 'notes' : 'coin');

  const xpM = (1 + metaPer(s, 'xp_posts')) * (1 + metaPer(s, 'xp_global'));
  grantXp(s, C.XP_BASE * (1 + 0.11 * zone) * typeXp * xpM * comboMult);

  const patchM =
    (1 + metaPer(s, 'patch_gain')) * (1 + (gb.notes_pct || 0) / 100) * eco;
  if (e.type === 'patch') {
    const p = C.PATCH_FROM_CHAMP * patchM;
    s.run.patches += p;
    floater(s, e.displayX, 135, `+${p | 0} Notes`, tone('notes'), true);
    particles(s, e.displayX, 150, tone('notes'), 20, 'coin');
    confetti(s, e.displayX, 180, [tone('notes'), '#fff', '#e6b84d'], 24);
    tip(s, 'patch');
    s.ui.chipPulse.patches = 0.45;
  }
  if (e.type === 'boss') {
    s.run.patches += C.PATCH_FROM_BOSS * patchM;
    s.meta.bosses += 1;
    s.world.bossActive = false;
    s.world.bossTimer = 0;
    ensurePremium(s);
    s.meta.premium.coins += PREMIUM.coinsPerBoss;
    floater(s, e.displayX, 80, `+${PREMIUM.coinsPerBoss} coins`, '#e6b84d');
    toast(s, pick(BOSS_WIN));
    floater(s, e.displayX, 115, 'GATE CLEARED', '#FF2F4B', true);
    confetti(s, e.displayX, 170, ['#FC1243', '#FF2F4B', '#e6b84d', '#fff'], 40);
    s.ui.chipPulse.patches = 0.5;
  } else if (Math.random() < 0.35 || s.stats.combo <= 2) {
    floater(s, e.displayX, 125, killLine(e.type), '#F5F6F8');
  }

  // Gear drops — bosses guaranteed, elites/patch rare (all 6 slots)
  if (shouldDropOnKill(e.type)) {
    s.meta.gear = normalizeGear(s.meta.gear);
    // Prefer empty slots on non-boss so loadout fills naturally
    const forced =
      e.type === 'boss'
        ? pickSlotForGear(s.meta.gear, Math.random() < 0.55)
        : pickSlotForGear(s.meta.gear, true);
    let item = rollItem(zone, forced);
    // Bosses: re-roll pure whites once for better feel
    if (e.type === 'boss' && item.rarity === 'white' && Math.random() < 0.55) {
      item = rollItem(zone, item.slot);
    }
    const res = offerItem(s.meta.gear, item);
    hubOnGear(s);
    // Center loot card only — never float item names top/side
    s.ui.lootDrop = {
      item,
      equipped: res.equipped,
      t: 2.55,
      life: 2.55,
    };
    confetti(s, e.displayX, 160, [rarityColor(item.rarity), '#fff', '#FC1243'], e.type === 'boss' ? 28 : 14);
    // Soft tip once; no item-name toast spam
    if (!s.ui.seenGearTip) {
      s.ui.seenGearTip = true;
      tip(s, 'gear');
    }
    s.ui.panelDirty = true;
    if (s.settings.sfx !== false) sfx('upgrade');
  }

  particles(s, e.displayX, 210, e.color, e.type === 'boss' ? 26 : 14);
  if (s.settings.sfx !== false) sfx('kill');
  tip(s, 'kill');
  s.ui.panelDirty = true;

  hubOnKill(s, e);

  // zone progress — endless; checkpoints every SEASON.zones for prestige
  const need = killsNeeded(zone);
  if (s.run.killsInZone >= need) {
    s.run.zone += 1;
    s.run.killsInZone = 0;
    s.world.enemies = [];
    s.world.bossActive = false;
    s.world.spawnCd = 0.35;
    if (s.settings.sfx !== false) sfx('zone');
    hubOnZone(s);

    if (isSeasonCheckpoint(s.run.zone)) {
      s.ui.seasonDone = true;
      toast(s, `Zone ${s.run.zone} checkpoint! Ship Notes, then End Season for Live Mult.`);
      tip(s, 'season');
    } else {
      toast(s, `Zone ${s.run.zone + 1}`, 1.4);
    }
    if (isBossZone(s.run.zone)) tip(s, 'boss');
  }
}

function dealDamage(s, e, amount, isCrit) {
  e.hp = Math.max(0, e.hp - amount);
  e.hitFlash = C.HIT_FLASH;
  e.hurt = 0.2;
  e.x += 6; // knockback target
  s.run.hero.attackAnim = 1;
  s.run.hero.hitRecoil = 1;
  s.stats.dpsAcc += amount;
  if (!s.settings.reducedMotion) s.world.shake = isCrit ? 4 : 2;

  floater(
    s,
    e.displayX,
    155 + Math.random() * 20,
    `${isCrit ? 'CRIT ' : ''}${Math.round(amount)}`,
    isCrit ? '#FF2F4B' : '#F5F6F8',
    isCrit
  );
  particles(s, e.displayX, 200, isCrit ? '#FC1243' : '#F5F6F8', isCrit ? 8 : 4);
  if (s.settings.sfx !== false) sfx(isCrit ? 'crit' : 'hit');

  if (e.hp <= 0 && !e.killed) {
    e.killed = true;
    e.hp = 0;
    // death hold for squash / card-flip satisfaction
    e.deathT = e.type === 'patch' ? 0.7 : e.type === 'boss' ? 0.85 : 0.48;
    e.deathMax = e.deathT;
    onKill(s, e);
  }
}

export function step(s, dt) {
  s.world.time += dt;
  if (s.ui.toastT > 0) {
    s.ui.toastT -= dt;
    if (s.ui.toastT <= 0) s.ui.toast = null;
  }
  if (s.ui.lootDrop) {
    s.ui.lootDrop.t -= dt;
    if (s.ui.lootDrop.t <= 0) s.ui.lootDrop = null;
  }
  if (s.world.shake > 0) s.world.shake = Math.max(0, s.world.shake - dt * 18);

  // combo decay
  if (s.stats.comboT > 0) {
    s.stats.comboT -= dt;
    if (s.stats.comboT <= 0) s.stats.combo = 0;
  }

  const st = combatStats(s);
  const h = s.run.hero;

  // resources — regen pauses slightly while sprinting so drain feels real
  const sprintOn = isSprinting(s);
  const eRegenNow = sprintOn ? st.eRegen * 0.25 : st.eRegen;
  h.energy = clamp(h.energy + eRegenNow * dt, 0, st.eMax);
  h.mana = clamp(h.mana + st.mRegen * dt, 0, st.mMax);
  h.attackAnim = Math.max(0, h.attackAnim - dt * 4);
  h.hitRecoil = Math.max(0, h.hitRecoil - dt * 5);

  // tracker ramp
  if (h.trackerOn && st.tracker > 0) {
    const cap = 0.55 + 0.14 * st.tracker;
    h.trackerStacks = Math.min(cap, h.trackerStacks + 0.028 * st.tracker * dt);
  } else {
    h.trackerStacks = Math.max(0, h.trackerStacks - 0.12 * dt);
  }
  if (h.summaryT > 0) h.summaryT -= dt;

  // sprint drain + empty feedback
  // Drain while sprint is active (hold OR auto-sprint via isSprinting)
  if (sprintOn) {
    if (h.energy > 0) {
      h.energy = Math.max(0, h.energy - st.sprintDrain * dt);
      s.ui.sprintEmptyToast = false;
    } else if ((s.ui.sprintWanted || hasAutoSprint(s)) && !s.ui.sprintEmptyToast) {
      s.ui.sprintEmptyToast = true;
      toast(s, 'Energy empty — grab green orbs or wait', 1.8);
    }
  }

  // movement (sprint already baked into st.move when active)
  let speed = st.move;
  s.world.scroll += speed * dt * 0.4;
  // while sprinting, enemies approach a bit faster too (closes gaps)
  s.world.sprintApproach = sprintOn ? 1.25 : 1;
  s.world.scrollSmooth = lerp(s.world.scrollSmooth, s.world.scroll, 1 - Math.exp(-8 * dt));

  // spawn — max 1 active fight; never stops (zones are endless)
  s.world.spawnCd -= dt;
  const alive = s.world.enemies.filter((e) => e.hp > 0);
  const maxE = C.MAX_ENEMIES;
  if (s.world.spawnCd <= 0 && alive.length < maxE) {
    const e = spawnEnemy(s);
    if (e) s.world.enemies.push(e);
    let cd = C.SPAWN_CD_MIN + Math.random() * (C.SPAWN_CD_MAX - C.SPAWN_CD_MIN);
    if (sprintOn) cd *= C.SPRINT_SPAWN; // shorter gaps while sprinting
    s.world.spawnCd = cd;
  }

  // alerts
  s.world.alertCd -= dt;
  const period = C.ALERT_INTERVAL / (1 + 0.06 * st.notify);
  if (s.world.alertCd <= 0 && s.world.alerts.length < 4) {
    s.world.alerts.push({
      id: Math.random().toString(36).slice(2, 8),
      x: 100 + Math.random() * 480,
      y: 70 + Math.random() * 140,
      t: 7,
      kind: Math.random() < 0.55 ? 'energy' : 'bytes',
      pulse: Math.random() * Math.PI * 2,
    });
    s.world.alertCd = period * (0.65 + Math.random() * 0.5);
  }

  // boss timer
  if (s.world.bossActive) {
    s.world.bossTimer -= dt;
    if (s.world.bossTimer <= 0) {
      const boss = s.world.enemies.find((e) => e.type === 'boss' && e.hp > 0);
      if (boss) {
        boss.hp = boss.hpMax;
        toast(s, pick(BOSS_FAIL));
      }
      s.world.bossTimer = C.BOSS_TIMER;
    }
  }

  // enemies approach
  const hx = s.world.heroX;
  for (const e of s.world.enemies) {
    if (e.hp <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.hurt > 0) e.hurt -= dt;
    const stop = hx + C.MELEE_RANGE - 8;
    if (e.x > stop) {
      const approach =
        speed * (e.type === 'boss' ? 0.5 : 0.82) * (s.world.sprintApproach || 1) * dt;
      e.x -= approach;
    }
    // smooth display
    e.displayX = lerp(e.displayX, e.x, 1 - Math.exp(-14 * dt));
  }

  // summary aoe
  if (h.summaryT > 0 && st.summary > 0) {
    const tick =
      0.4 * st.dmg * (1 + 0.1 * st.summary) * st.skillMult * dt;
    for (const e of s.world.enemies) {
      if (e.hp <= 0) continue;
      if (Math.abs(e.x - hx) < 300) {
        e.hp -= tick;
        e.hitFlash = Math.max(e.hitFlash, 0.05);
        s.stats.dpsAcc += tick;
        if (e.hp <= 0 && !e.killed) {
          e.killed = true;
          e.hp = 0;
          e.deathT = e.type === 'patch' ? 0.7 : e.type === 'boss' ? 0.85 : 0.48;
          e.deathMax = e.deathT;
          onKill(s, e);
        }
      }
    }
  }

  // AUTO ATTACK — the critical path
  s.world.attackCd -= dt;
  const target = s.world.enemies.find(
    (e) => e.hp > 0 && e.x <= hx + C.MELEE_RANGE
  );
  if (target && s.world.attackCd <= 0) {
    s.world.attackCd = st.interval;
    let hit = st.dmg;
    const isCrit = Math.random() < st.crit;
    if (isCrit) hit *= C.CRIT_MULT;
    dealDamage(s, target, hit, isCrit);
  }

  // dps meter — EMA so it doesn’t flicker to 0 mid-fight
  s.stats.dpsT += dt;
  if (s.stats.dpsT >= 0.35) {
    const instant = s.stats.dpsAcc / s.stats.dpsT;
    s.stats.dps = s.stats.dps * 0.55 + instant * 0.45;
    if (instant < 0.01) s.stats.dps *= 0.85; // decay when idle
    s.stats.dpsAcc = 0;
    s.stats.dpsT = 0;
  }

  // death anim + cleanup
  s.world.enemies = s.world.enemies.filter((e) => {
    if (e.hp > 0) return true;
    if (e.deathT > 0) {
      e.deathT -= dt;
      return e.deathT > 0;
    }
    return false;
  });
  s.world.alerts = s.world.alerts.filter((a) => {
    a.t -= dt;
    a.pulse += dt * 6;
    return a.t > 0;
  });
  s.world.floaters = s.world.floaters.filter((f) => {
    f.t -= dt;
    f.y += f.vy * dt;
    f.vy *= 1 - 1.2 * dt;
    return f.t > 0;
  });
  s.world.particles = s.world.particles.filter((p) => {
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === 'coin' ? 220 : 160) * dt;
    if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
    return p.t > 0;
  });
  if (!s.world.confetti) s.world.confetti = [];
  s.world.confetti = s.world.confetti.filter((c) => {
    c.t -= dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vy += 280 * dt;
    c.vx *= 1 - 0.6 * dt;
    c.rot += c.spin * dt;
    return c.t > 0;
  });
  if (s.ui.fx) {
    s.ui.fx.t -= dt;
    if (s.ui.fx.t <= 0) s.ui.fx = null;
  }
  if (s.ui.chipPulse) {
    for (const k of Object.keys(s.ui.chipPulse)) {
      s.ui.chipPulse[k] -= dt;
      if (s.ui.chipPulse[k] <= 0) delete s.ui.chipPulse[k];
    }
  }

  s.world.heroDisplayX = lerp(s.world.heroDisplayX, s.world.heroX, 1 - Math.exp(-10 * dt));
}

export function collectAlert(s, a) {
  const st = combatStats(s);
  const bonus = s.run.hero.summaryT > 0 ? 1.3 : 1;
  const n = 1 + 0.08 * st.notify;
  if (a.kind === 'energy') {
    s.run.hero.energy = clamp(
      s.run.hero.energy + (28 + 3 * st.notify) * bonus * n,
      0,
      st.eMax
    );
    floater(s, a.x, a.y, '+ENERGY', '#10B981');
  } else {
    const b = (4 + 0.6 * s.run.zone) * bonus * n * economyMult(s);
    s.run.bytes += b;
    floater(s, a.x, a.y, `+${b | 0} Signal`, '#6cb8ff');
  }
  particles(s, a.x, a.y, '#FC1243', 8);
  hubOnOrb(s);
  tip(s, 'alert');
  s.world.alerts = s.world.alerts.filter((x) => x.id !== a.id);
}

export function castHotfix(s) {
  const lv = skillLv(s, 'hotfix');
  if (lv < 1) return false;
  const st = combatStats(s);
  const cost = 10;
  if (s.run.hero.mana < cost) {
    toast(s, 'Not enough mana');
    return false;
  }
  s.run.hero.mana -= cost;
  const target = s.world.enemies.find((e) => e.hp > 0);
  if (!target) {
    toast(s, 'Hotfix ready — no target');
    return true;
  }
  const hit = st.dmg * (2.2 + 0.15 * lv) * st.skillMult;
  dealDamage(s, target, hit, true);
  toast(s, 'Hotfix deployed!');
  return true;
}

export function castSummary(s) {
  const lv = skillLv(s, 'summary_burst');
  if (lv < 1) return false;
  if (s.run.hero.mana < 12) {
    toast(s, 'Not enough mana');
    return false;
  }
  s.run.hero.mana -= 12;
  s.run.hero.summaryT = 3.2 + 0.25 * lv;
  toast(s, 'Summary Burst!');
  particles(s, s.world.heroX, 200, '#6cb8ff', 14);
  return true;
}

export function canLearn(s, id) {
  const d = SKILLS[id];
  if (!d) return false;
  const cur = skillLv(s, id);
  if (cur >= d.max) return false;
  const cost = skillSpCost(cur);
  if (s.run.hero.sp < cost) return false;
  const h = s.run.hero;
  if (d.req.scan && h.scan < d.req.scan) return false;
  if (d.req.verify && h.verify < d.req.verify) return false;
  if (d.req.amplify && h.amplify < d.req.amplify) return false;
  return true;
}

export function nextSkillCost(s, id) {
  return skillSpCost(skillLv(s, id));
}

export function allocAttr(s, attr) {
  if (s.run.hero.sp < 1) return false;
  if (!['scan', 'verify', 'amplify'].includes(attr)) return false;
  s.run.hero.sp -= 1;
  s.run.hero[attr] += 1;
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 200, ['#FC1243', '#e6b84d', '#5eb0ff', '#fff'], 14);
  const lab = attr === 'scan' ? 'DAMAGE' : attr === 'verify' ? 'CRIT' : 'UTILITY';
  floater(s, s.world.heroX, 140, `+${lab}`, '#e6b84d');
  if (s.settings.sfx !== false) sfx('buy');
  return true;
}

export function allocSkill(s, id) {
  if (!canLearn(s, id)) return false;
  const d = SKILLS[id];
  const cost = skillSpCost(skillLv(s, id));
  s.run.hero.sp -= cost;
  s.run.hero.skills[id] = (s.run.hero.skills[id] || 0) + 1;
  if (id === 'live_tracker') s.run.hero.trackerOn = true;
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 190, ['#FC1243', '#fff', '#3ecf8e'], 16);
  floater(s, s.world.heroX, 145, `${d.name} ·${cost}SP`, tone('sp'), true);
  if (s.settings.sfx !== false) sfx('buy');
  return true;
}

export function buyScanner(s) {
  const cost = scannerCost(s.run.hero.scanner);
  if (s.run.bytes < cost) return false;
  s.run.bytes -= cost;
  s.run.hero.scanner += 1;
  toast(s, pick(SCANNER_LINES) + ` (Lv ${s.run.hero.scanner})`);
  particles(s, s.world.heroX, 200, '#FC1243', 16);
  confetti(s, s.world.heroX, 190, ['#FC1243', '#ff6b8a', '#fff'], 16);
  floater(s, s.world.heroX, 150, `SIGNAL Lv ${s.run.hero.scanner}`, '#FC1243', true);
  s.ui.chipPulse = s.ui.chipPulse || {};
  s.ui.chipPulse.bytes = 0.3;
  if (s.settings.sfx !== false) sfx('upgrade');
  return true;
}

/** Convert banked Notes → permanent Reputation */
export function shipPatches(s) {
  const p = Math.floor(s.run.patches);
  if (p < 1) {
    toast(s, 'Need Notes — kill red Patch Notes first');
    tip(s, 'ship');
    return false;
  }
  // Live Mult already in economy; ship payout uses live × pro × boost via economyMult / live
  const gained = Math.floor(p * C.SHIP_RATE * economyMult(s));
  s.run.patches = 0;
  s.authority.amount += gained;
  s.authority.shippedThisSeason += gained;
  s.meta.ships += 1;
  s.meta.postsShippedTotal += gained;
  ensurePremium(s);
  s.meta.premium.coins += PREMIUM.coinsPerShip;
  hubOnShip(s, p);
  s.run.hero.energy = combatStats(s).eMax;
  toast(s, pick(SHIP_LINES) + ` (+${gained} Rep)`);
  tip(s, 'ship');
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 180, ['#e6b84d', '#FC1243', '#fff', '#3ecf8e'], 32);
  floater(s, s.world.heroX, 140, `+${gained} REP`, '#e6b84d', true);
  s.ui.chipPulse = s.ui.chipPulse || {};
  s.ui.chipPulse.auth = 0.5;
  s.ui.fx = { kind: 'rank', t: 0.4 };
  if (s.settings.sfx !== false) sfx('ship');
  return true;
}

export function buyMeta(s, id) {
  const d = META[id];
  if (!d) return false;
  const lv = metaLv(s, id);
  const cost = metaCost(d.base, d.growth, lv);
  if (s.authority.amount < cost) {
    toast(s, 'Not enough Reputation');
    return false;
  }
  s.authority.amount -= cost;
  s.authority.upgrades[id] = lv + 1;
  toast(s, `${d.name} → Lv ${lv + 1}`);
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 190, ['#e6b84d', '#fff', '#3ecf8e'], 16);
  floater(s, s.world.heroX, 150, d.name, '#e6b84d', true);
  if (s.settings.sfx !== false) sfx('upgrade');
  return true;
}

/**
 * End Season (prestige).
 * KEEP: Live Mult, Boosts, Rep, gear (weapon+armor+bag).
 * RESET: zone, Signal weapon Lv, rank, attrs, skills, Notes.
 */
export function leaveSeason(s) {
  if (!s.ui.seasonDone && s.run.zone < SEASON.zones) {
    toast(s, `Reach Zone ${SEASON.zones} checkpoint to End Season`);
    return false;
  }
  if (!s.ui.seasonDone && s.run.zone >= SEASON.zones) {
    s.ui.seasonDone = true;
  }
  const gain = liveGain(s.authority.shippedThisSeason);
  s.meta.live += gain;
  s.meta.season += 1;
  s.authority.shippedThisSeason = 0;
  // gear is on meta — intentionally untouched (normalize for multi-slot)
  s.meta.gear = normalizeGear(s.meta.gear);
  s.run.zone = 0;
  s.run.killsInZone = 0;
  s.run.bytes = Math.floor(s.run.bytes * 0.15);
  s.run.patches = 0;
  const h = s.run.hero;
  h.level = 1;
  h.xp = 0;
  h.sp = 0;
  h.scan = h.verify = h.amplify = 0;
  h.skills = {};
  h.scanner = 0; // Signal level is season-only
  h.energy = C.ENERGY_MAX;
  h.mana = C.MANA_MAX;
  h.trackerOn = false;
  h.deepOn = false;
  h.trackerStacks = 0;
  s.world.enemies = [];
  s.world.bossActive = false;
  s.world.attackCd = 0;
  s.ui.seasonDone = false;
  ensurePremium(s);
  s.meta.premium.coins += PREMIUM.coinsPerSeason;
  toast(
    s,
    `New season! Live ×${s.meta.live.toFixed(2)} (+${gain.toFixed(3)}). Gear · Boosts · Pro kept · Signal Lv reset · +${PREMIUM.coinsPerSeason} coins`
  );
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 180, ['#e6b84d', '#FC1243', '#fff', '#3ecf8e'], 36);
  if (s.settings.sfx !== false) sfx('rank');
  return true;
}

export function equipGear(s, itemId) {
  s.meta.gear = normalizeGear(s.meta.gear);
  if (!equipFromBag(s.meta.gear, itemId)) return false;
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('click');
  return true;
}

/** Unequip a slot into bag (if inventory room) */
export function unequipGear(s, slot) {
  s.meta.gear = normalizeGear(s.meta.gear);
  if (!unequipSlot(s.meta.gear, slot, BAG_CAP)) {
    toast(s, 'Inventory full — sell junk first');
    return false;
  }
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('click');
  return true;
}

/** Sell bag item for Signal */
export function sellGear(s, itemId) {
  s.meta.gear = normalizeGear(s.meta.gear);
  const res = sellFromBag(s.meta.gear, itemId);
  if (!res) return false;
  s.run.bytes += res.signal;
  s.ui.chipPulse = s.ui.chipPulse || {};
  s.ui.chipPulse.bytes = 0.45;
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('coin');
  return res;
}

/**
 * Open a premium gear box (coin sink).
 * Rolls N pieces, offers each (equip if empty/better), shows last as loot card.
 */
export function buyGearBox(s, boxId) {
  ensurePremium(s);
  const def = PREMIUM.boxes?.find((b) => b.id === boxId);
  if (!def) return false;
  if (s.meta.premium.coins < def.coinCost) {
    toast(s, `Need ${def.coinCost} coins`);
    return false;
  }
  s.meta.gear = normalizeGear(s.meta.gear);
  s.meta.premium.coins -= def.coinCost;

  const rolls = Math.max(1, def.rolls | 0);
  let last = null;
  let equippedAny = false;
  for (let i = 0; i < rolls; i++) {
    const slot = pickSlotForGear(s.meta.gear, def.preferEmpty !== false);
    const item = rollItem(s.run.zone, slot, {
      luck: def.luck || 1.5,
      minRarity: def.minRarity || null,
    });
    const res = offerItem(s.meta.gear, item);
    if (res.equipped) equippedAny = true;
    last = { item, equipped: res.equipped };
  }

  if (last) {
    s.ui.lootDrop = {
      item: last.item,
      equipped: last.equipped,
      t: 2.8,
      life: 2.8,
    };
  }
  hubOnGear(s);
  const nLab = rolls > 1 ? `${rolls} pieces` : '1 piece';
  toast(
    s,
    `${def.name} · ${nLab}${equippedAny ? ' · equipped upgrades' : ' · bag'}`
  );
  confetti(s, s.world.heroX, 180, ['#e6b84d', '#5eb0ff', '#FC1243', '#fff'], 26);
  tip(s, 'gear');
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('upgrade');
  return true;
}

/** Unlock APN Pro (IAP hook — demo unlock in Menu) */
export function unlockPro(s) {
  ensurePremium(s);
  if (s.meta.premium.pro) {
    toast(s, 'APN Pro already active');
    return false;
  }
  s.meta.premium.pro = true;
  s.meta.premium.autoSprint = true;
  toast(s, `APN Pro · ×${PREMIUM.pro.mult} + Auto-Sprint`);
  tip(s, 'premium');
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 180, ['#e6b84d', '#FC1243', '#fff'], 28);
  if (s.settings.sfx !== false) sfx('rank');
  return true;
}

/** Buy Auto-Sprint without full Pro (coin sink) */
export function unlockAutoSprint(s) {
  ensurePremium(s);
  if (s.meta.premium.autoSprint || s.meta.premium.pro) {
    toast(s, 'Auto-Sprint already on');
    return false;
  }
  const cost = PREMIUM.auto_sprint.coinCost;
  if (s.meta.premium.coins < cost) {
    toast(s, `Need ${cost} coins`);
    return false;
  }
  s.meta.premium.coins -= cost;
  s.meta.premium.autoSprint = true;
  toast(s, 'Auto-Sprint on · still drains energy');
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('upgrade');
  return true;
}

/** Buy timed 2× boost with coins */
export function buyBoost2x(s) {
  ensurePremium(s);
  const cost = PREMIUM.boost_2x.coinCost;
  if (s.meta.premium.coins < cost) {
    toast(s, `Need ${cost} coins (bosses, ships, hub rewards)`);
    return false;
  }
  s.meta.premium.coins -= cost;
  const add = PREMIUM.boost_2x.minutes * 60 * 1000;
  const base = Math.max(Date.now(), s.meta.premium.boostEndsAt || 0);
  s.meta.premium.boostEndsAt = base + add;
  toast(s, `2× Boost · ${PREMIUM.boost_2x.minutes}m`);
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 180, ['#e6b84d', '#fff'], 20);
  if (s.settings.sfx !== false) sfx('upgrade');
  return true;
}

/** Time Warp +1h idle (cooldown) */
export function timeWarp(s) {
  ensurePremium(s);
  const def = PREMIUM.time_warp;
  if (Date.now() < (s.meta.premium.warpCdUntil || 0)) {
    const m = Math.ceil((s.meta.premium.warpCdUntil - Date.now()) / 60000);
    toast(s, `Time Warp cooling down · ${m}m`);
    return false;
  }
  if (s.meta.premium.coins < def.coinCost) {
    toast(s, `Need ${def.coinCost} coins`);
    return false;
  }
  s.meta.premium.coins -= def.coinCost;
  s.meta.premium.warpCdUntil = Date.now() + 8 * 60 * 1000; // 8 min CD
  const summary = simulateOffline(s, def.seconds);
  toast(
    s,
    summary
      ? `Time Warp +1h · +${Math.floor(summary.bytes)} Signal · Z+${summary.zones}`
      : 'Time Warp complete'
  );
  s.ui.panelDirty = true;
  confetti(s, s.world.heroX, 180, ['#5eb0ff', '#fff', '#FC1243'], 24);
  if (s.settings.sfx !== false) sfx('zone');
  return true;
}

/** Mock coin pack purchase (IAP stub) */
export function buyCoinPack(s, packId) {
  ensurePremium(s);
  const pack = PREMIUM.packs.find((p) => p.id === packId);
  if (!pack) return false;
  s.meta.premium.coins += pack.coins;
  toast(s, `+${pack.coins} coins (${pack.priceLabel})`);
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('coin');
  return true;
}

/** Claim a daily/weekly hub objective */
export function claimHubObjective(s, period, id) {
  ensureHub(s);
  const defs = period === 'daily' ? DAILY_DEFS : WEEKLY_DEFS;
  const def = defs.find((d) => d.id === id);
  if (!def) return false;
  const hub = s.meta.hub;
  if (!hubDone(hub, def, period) || hubClaimed(hub, def, period)) {
    toast(s, 'Not ready');
    return false;
  }
  const bag = period === 'daily' ? hub.daily : hub.weekly;
  bag.claimed[id] = true;
  applyReward(s, def.reward);
  toast(s, `Claimed · ${def.label}`);
  confetti(s, s.world.heroX, 180, ['#FC1243', '#e6b84d', '#fff'], 22);
  floater(s, s.world.heroX, 140, 'QUEST!', '#e6b84d', true);
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('rank');
  return true;
}

export function claimSeasonMilestone(s, lv) {
  ensureHub(s);
  const mil = SEASON_MILESTONES.find((m) => m.lv === lv);
  if (!mil) return false;
  const cur = seasonLevel(s.meta.hub.seasonXp || 0).level;
  if (cur < lv) {
    toast(s, 'Season level too low');
    return false;
  }
  if (s.meta.hub.seasonClaimed?.[lv]) {
    toast(s, 'Already claimed');
    return false;
  }
  if (!s.meta.hub.seasonClaimed) s.meta.hub.seasonClaimed = {};
  s.meta.hub.seasonClaimed[lv] = true;
  applyReward(s, mil.reward);
  toast(s, `Season ${mil.label} reward!`);
  confetti(s, s.world.heroX, 180, ['#c084fc', '#fff', '#FC1243'], 28);
  s.ui.panelDirty = true;
  if (s.settings.sfx !== false) sfx('rank');
  return true;
}

export {
  gearBonuses,
  rarityColor,
  rarityLabel,
  PREMIUM,
  ensureHub,
  normalizeGear,
  SLOTS,
};

export function simulateOffline(s, seconds) {
  const T = Math.min(seconds, C.OFFLINE_CAP);
  if (T < 3) return null;
  const before = {
    bytes: s.run.bytes,
    patches: s.run.patches,
    level: s.run.hero.level,
    zone: s.run.zone,
    kills: s.meta.kills,
  };
  s.world.sprinting = false;
  const steps = Math.min(Math.floor(T / C.FIXED_DT), 60 * 60 * 3);
  for (let i = 0; i < steps; i++) step(s, C.FIXED_DT);
  const sim = steps * C.FIXED_DT;
  if (T > sim) {
    let idle = C.IDLE_EFF;
    if (s.meta.premium?.pro) idle = Math.min(0.96, idle + 0.06);
    const ratio = ((T - sim) / Math.max(sim, 1)) * idle;
    const db = Math.max(0, s.run.bytes - before.bytes);
    const dp = Math.max(0, s.run.patches - before.patches);
    s.run.bytes += db * ratio;
    s.run.patches += dp * ratio;
    // zone/xp approx
    const dk = Math.max(0, s.meta.kills - before.kills) * ratio;
    let rem = Math.floor(dk);
    while (rem-- > 0) {
      s.run.killsInZone += 1;
      s.meta.kills += 1;
      if (s.run.killsInZone >= killsNeeded(s.run.zone)) {
        s.run.zone += 1;
        s.run.killsInZone = 0;
        if (isSeasonCheckpoint(s.run.zone)) s.ui.seasonDone = true;
      }
    }
  }
  return {
    seconds: T,
    bytes: s.run.bytes - before.bytes,
    patches: s.run.patches - before.patches,
    levels: s.run.hero.level - before.level,
    zones: s.run.zone - before.zone,
    kills: s.meta.kills - before.kills,
  };
}

export { scannerCost, combatStats as getCombatStats, toast };
