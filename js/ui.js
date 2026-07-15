/** APN Idle UI — sheet + compact HUD */

import {
  formatNum,
  scannerCost,
  scannerDamage,
  metaCost,
  xpToNext,
  liveGain,
  clamp,
  killsNeeded,
  isSeasonCheckpoint,
} from './formulas.js';
import {
  SEASON,
  META,
  SKILLS,
  SKILL_TREES,
  TIPS,
  ATTR_LABEL,
  ATTR_META,
  nextSkillUnlock,
  PREMIUM,
  FEED_COPY,
  skillSpCost,
} from './content.js';
import { packForRoute } from './route.js';
import { GAME_PACKS } from './generated/game-packs.js';
import {
  combatStats,
  allocAttr,
  allocSkill,
  canLearn,
  skillLv,
  buyScanner,
  shipPatches,
  buyMeta,
  leaveSeason,
  castHotfix,
  castSummary,
  metaLv,
  isSprinting,
  equipGear,
  unequipGear,
  sellGear,
  buyGearBox,
  END_SEASON_CONTRACT,
  rarityColor,
  rarityLabel,
  unlockPro,
  unlockAutoSprint,
  buyBoost2x,
  buyCoinPack,
  timeWarp,
  ensurePremium,
  economyMult,
  boostActive,
  boostSecondsLeft,
  hasAutoSprint,
  claimHubObjective,
  claimSeasonMilestone,
  ensureHub,
  normalizeGear,
} from './game.js';
import {
  formatAffix,
  sellValue,
  isUpgrade,
  BAG_CAP,
  SLOTS,
  slotLabel,
  slotShort,
  equippedCount,
  gearBonuses,
  primaryStat,
  queryGearBag,
  toggleJunk,
} from './loot.js';
import {
  DAILY_DEFS,
  WEEKLY_DEFS,
  hubProgress,
  hubDone,
  hubClaimed,
  hubObjectiveState,
  seasonLevel,
  SEASON_MILESTONES,
  formatReward,
} from './hub.js';
import { skillIco, attrIco, metaIco, hubIco, gearIcon } from './icons.js';
import { save, clear } from './save.js';
import { sfx, unlockAudio, setMuted } from './sfx.js';

const PANEL_TITLES = {
  skills: 'Build',
  ship: 'Ship Notes',
  gear: 'Gear',
  hub: 'Hub',
  meta: 'Boosts',
  settings: 'Menu',
};

let lastPanel = null;

export function bindUI(s) {
  const $ = (id) => document.getElementById(id);
  setMuted(s.settings.sfx === false);
  const soundToggle = $('chk-sfx');
  if (soundToggle) soundToggle.checked = s.settings.sfx !== false;

  const unlock = () => unlockAudio();
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      unlockAudio();
      const p = btn.dataset.panel;
      // Same tab stays open (no toggle-close flap). Only Close / Esc / backdrop close.
      if (s.ui.panel === p) {
        // soft refresh content, keep sheet up
        s.ui.panelDirty = true;
        openSheet(s, p);
        return;
      }
      openSheet(s, p);
      if (s.settings.sfx !== false) sfx('click');
    });
  });

  $('sheet-close')?.addEventListener('click', () => closeSheet(s));
  $('sheet-backdrop')?.addEventListener('click', () => closeSheet(s));

  $('btn-scanner')?.addEventListener('click', () => {
    unlockAudio();
    if (buyScanner(s)) save(s);
    else {
      if (s.settings.sfx !== false) sfx('error');
      const el = $('btn-scanner');
      if (el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 280);
      }
    }
  });
  $('btn-hotfix')?.addEventListener('click', () => {
    unlockAudio();
    castHotfix(s);
  });
  $('btn-summary')?.addEventListener('click', () => {
    unlockAudio();
    castSummary(s);
  });
  $('btn-ship')?.addEventListener('click', () => {
    unlockAudio();
    if (shipPatches(s)) {
      save(s);
      fillShip(s);
    } else if (s.settings.sfx !== false) sfx('error');
  });
  $('btn-leave')?.addEventListener('click', () => {
    s.ui.endSeasonConfirm = true;
    const confirmPanel = $('season-confirm');
    if (confirmPanel) {
      confirmPanel.hidden = false;
      requestAnimationFrame(() => confirmPanel.scrollIntoView({ block: 'end' }));
    }
  });
  $('btn-leave-cancel')?.addEventListener('click', () => {
    s.ui.endSeasonConfirm = false;
    const confirmPanel = $('season-confirm');
    if (confirmPanel) confirmPanel.hidden = true;
  });
  $('btn-leave-confirm')?.addEventListener('click', () => {
    if (leaveSeason(s)) {
      save(s);
      closeSheet(s);
    }
  });
  $('btn-tracker')?.addEventListener('click', () => {
    if (skillLv(s, 'live_tracker') > 0) {
      s.run.hero.trackerOn = !s.run.hero.trackerOn;
      if (s.settings.sfx !== false) sfx('click');
    }
  });
  $('btn-deep')?.addEventListener('click', () => {
    if (skillLv(s, 'deep_dive') > 0) {
      s.run.hero.deepOn = !s.run.hero.deepOn;
      if (s.settings.sfx !== false) sfx('click');
    }
  });
  $('btn-offline-ok')?.addEventListener('click', () => {
    s.ui.offline = null;
    $('offline-modal').hidden = true;
  });
  $('btn-wipe')?.addEventListener('click', () => {
    const confirmPanel = $('reset-confirm');
    if (confirmPanel) confirmPanel.hidden = false;
  });
  $('btn-wipe-cancel')?.addEventListener('click', () => {
    const confirmPanel = $('reset-confirm');
    if (confirmPanel) confirmPanel.hidden = true;
  });
  $('btn-wipe-confirm')?.addEventListener('click', () => {
    clear();
    location.reload();
  });
  $('chk-motion')?.addEventListener('change', (e) => {
    s.settings.reducedMotion = e.target.checked;
    save(s);
  });
  $('chk-sfx')?.addEventListener('change', (e) => {
    s.settings.sfx = e.target.checked;
    setMuted(!e.target.checked);
    if (e.target.checked) {
      unlockAudio();
      sfx('click');
    }
    save(s);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && s.ui.panel) closeSheet(s);
  });

  $('panel-skills')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-alloc]');
    if (!t) return;
    let ok = false;
    if (t.dataset.alloc === 'attr') ok = allocAttr(s, t.dataset.id);
    else if (t.dataset.alloc === 'skill') ok = allocSkill(s, t.dataset.id);
    if (ok) {
      save(s);
      popSpend(t);
    } else {
      t.classList.add('shake');
      setTimeout(() => t.classList.remove('shake'), 280);
    }
    renderSkills(s);
  });

  $('panel-meta')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-meta]');
    if (!t) return;
    if (buyMeta(s, t.dataset.meta)) {
      save(s);
      popSpend(t);
    } else {
      t.classList.add('shake');
      setTimeout(() => t.classList.remove('shake'), 280);
    }
    renderMeta(s);
  });

  $('panel-gear')?.addEventListener('change', (e) => {
    if (e.target.matches('[data-gear-sort]')) s.settings.gearSort = e.target.value;
    else if (e.target.matches('[data-gear-filter]')) s.settings.gearFilter = e.target.value;
    else return;
    save(s);
    renderGear(s);
  });

  $('panel-gear')?.addEventListener('click', (e) => {
    const junkBtn = e.target.closest('[data-junk]');
    if (junkBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (toggleJunk(s.meta.gear, junkBtn.dataset.junk) != null) {
        save(s);
        renderGear(s);
      }
      return;
    }
    const sellBtn = e.target.closest('[data-sell]');
    if (sellBtn) {
      e.preventDefault();
      e.stopPropagation();
      const res = sellGear(s, sellBtn.dataset.sell);
      if (res) {
        save(s);
        s.ui.gearFocus = null;
        s.ui.gearEqFocus = null;
        renderGear(s);
      }
      return;
    }
    const equipBtn = e.target.closest('[data-equip]');
    if (equipBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (equipGear(s, equipBtn.dataset.equip)) {
        save(s);
        s.ui.gearFocus = null;
        s.ui.gearEqFocus = null;
        renderGear(s);
      }
      return;
    }
    const unequipBtn = e.target.closest('[data-unequip]');
    if (unequipBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (unequipGear(s, unequipBtn.dataset.unequip)) {
        save(s);
        s.ui.gearEqFocus = null;
        renderGear(s);
      } else if (s.settings.sfx !== false) sfx('error');
      return;
    }
    const eq = e.target.closest('[data-eq-slot]');
    if (eq) {
      const slot = eq.dataset.eqSlot;
      s.ui.gearFocus = null;
      s.ui.gearEqFocus = s.ui.gearEqFocus === slot ? null : slot;
      renderGear(s);
      return;
    }
    const inv = e.target.closest('[data-inv]');
    if (inv) {
      const id = inv.dataset.inv;
      s.ui.gearEqFocus = null;
      s.ui.gearFocus = s.ui.gearFocus === id ? null : id;
      renderGear(s);
      return;
    }
    if (e.target.closest('.gear-detail')) return;
    if (s.ui.gearFocus || s.ui.gearEqFocus) {
      s.ui.gearFocus = null;
      s.ui.gearEqFocus = null;
      renderGear(s);
    }
  });

  $('panel-settings')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-premium]');
    if (!t) return;
    const act = t.dataset.premium;
    let ok = false;
    if (act === 'pro') ok = unlockPro(s);
    else if (act === 'boost') ok = buyBoost2x(s);
    else if (act === 'auto') ok = unlockAutoSprint(s);
    else if (act === 'warp') ok = timeWarp(s);
    else if (act.startsWith('box_')) ok = buyGearBox(s, act);
    else if (act.startsWith('coins_')) ok = buyCoinPack(s, act);
    if (ok) {
      save(s);
      renderPremium(s);
      if (s.settings.sfx !== false) sfx('click');
    } else if (s.settings.sfx !== false) sfx('error');
  });

  $('panel-hub')?.addEventListener('click', (e) => {
    const claim = e.target.closest('[data-claim]');
    if (claim) {
      const [period, id] = claim.dataset.claim.split(':');
      if (claimHubObjective(s, period, id)) {
        save(s);
        renderHub(s);
      } else if (s.settings.sfx !== false) sfx('error');
      return;
    }
    const mil = e.target.closest('[data-season-lv]');
    if (mil) {
      if (claimSeasonMilestone(s, Number(mil.dataset.seasonLv))) {
        save(s);
        renderHub(s);
      } else if (s.settings.sfx !== false) sfx('error');
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) {
      openSheet(s, go.dataset.go);
      if (s.settings.sfx !== false) sfx('click');
    }
  });
}

function popSpend(el) {
  if (!el) return;
  el.classList.remove('just-bought');
  // reflow so animation restarts
  void el.offsetWidth;
  el.classList.add('just-bought');
  setTimeout(() => el.classList.remove('just-bought'), 420);
}

function openSheet(s, panel) {
  s.ui.panel = panel;
  s.ui.panelDirty = true;
  const root = document.getElementById('sheet-root');
  if (root) {
    root.hidden = false;
    root.classList.add('is-open');
    root.dataset.panel = panel;
  }
  document.getElementById('app')?.classList.add('sheet-open');
  document.querySelectorAll('.hud-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panel);
  });
  document.getElementById('btn-bag')?.classList.toggle('active', panel === 'gear');
  const title = document.getElementById('sheet-title');
  if (title) title.textContent = PANEL_TITLES[panel] || panel;
  ['skills', 'meta', 'ship', 'gear', 'hub', 'settings'].forEach((p) => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.hidden = p !== panel;
  });
  if (panel === 'skills') renderSkills(s);
  if (panel === 'meta') renderMeta(s);
  if (panel === 'ship') fillShip(s);
  if (panel === 'gear') renderGear(s);
  if (panel === 'hub') renderHub(s);
  if (panel === 'settings') {
    const sx = document.getElementById('chk-sfx');
    if (sx) sx.checked = s.settings.sfx !== false;
    const mo = document.getElementById('chk-motion');
    if (mo) mo.checked = !!s.settings.reducedMotion;
    renderPremium(s);
  }
  if (panel !== 'ship') s.ui.endSeasonConfirm = false;
  lastPanel = panel;
  s.ui.panelDirty = false;
}

function closeSheet(s) {
  s.ui.panel = null;
  s.ui.endSeasonConfirm = false;
  lastPanel = null;
  const root = document.getElementById('sheet-root');
  if (root) {
    root.hidden = true;
    root.classList.remove('is-open');
    delete root.dataset.panel;
  }
  document.getElementById('app')?.classList.remove('sheet-open');
  document.querySelectorAll('.hud-nav button').forEach((b) => b.classList.remove('active'));
  document.getElementById('btn-bag')?.classList.remove('active');
  const resetConfirm = document.getElementById('reset-confirm');
  if (resetConfirm) resetConfirm.hidden = true;
}

function fillShip(s) {
  const el = document.getElementById('ship-info');
  if (!el) return;
  const notes = Math.floor(s.run.patches);
  const gain = Math.floor(notes * economyMult(s));
  const liveNext = liveGain(s.authority.shippedThisSeason);
  const seasonReady = s.ui.seasonDone || isSeasonCheckpoint(s.route.zone);
  const nextZ = SEASON.zones * (Math.floor(s.route.zone / SEASON.zones) + 1);
  const eco = economyMult(s);
  el.className = 'ship-stats ship-preview';
  const resetItems = END_SEASON_CONTRACT.resets.map((item) => `<li>${item}</li>`).join('');
  const keepItems = END_SEASON_CONTRACT.keeps.map((item) => `<li>${item}</li>`).join('');
  el.innerHTML = `
    <div class="ship-gain-card">
      <span>You'll gain</span>
      <strong>+${formatNum(gain)} Rep</strong>
      <small>${notes > 0 ? 'Ready to ship now' : 'Collect Notes to ship'}</small>
    </div>
    <div class="ship-formula" aria-label="Rep conversion preview">
      ${row('Notes', formatNum(notes), notes > 0 ? 'hi' : '', 'notes')}
      ${row('Rate', '1 Note → 1 Rep')}
      ${row('Mult', `×${eco.toFixed(2)}`)}
      ${seasonReady ? row('End-Season bonus', `+${liveNext.toFixed(3)} Live`, 'hi') : row('End-Season bonus', `Unlocks at Zone ${nextZ}`)}
    </div>
    <div class="season-contract">
      <section><h3>Resets</h3><ul>${resetItems}</ul></section>
      <section><h3>Kept</h3><ul>${keepItems}</ul></section>
    </div>`;
  const cta = document.getElementById('btn-ship');
  if (cta) {
    cta.disabled = notes < 1;
    cta.classList.toggle('is-locked', notes < 1);
  }
  const ctaSub = document.getElementById('ship-cta-sub');
  if (ctaSub) set(ctaSub, notes > 0 ? `${formatNum(notes)} Notes → +${formatNum(gain)} Rep` : 'Collect Notes first');
  const leave = document.getElementById('btn-leave');
  if (leave) leave.hidden = !seasonReady;
  const confirmPanel = document.getElementById('season-confirm');
  if (confirmPanel) confirmPanel.hidden = !s.ui.endSeasonConfirm;
}

function row(k, v, cls = '', tone = '') {
  const classes = ['ship-row'];
  if (cls === 'hi') classes.push('ready');
  if (tone) classes.push(`t-${tone}`);
  return `<div class="${classes.join(' ')}"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`;
}

function reqBadges(req, h) {
  return Object.entries(req)
    .map(([k, v]) => {
      const met = (h[k] || 0) >= v;
      const label = ATTR_LABEL[k] || k;
      return `<span class="req-badge ${met ? 'met' : 'miss'}">${label} ${v}</span>`;
    })
    .join('');
}

function typeTag(type) {
  const map = {
    active: 'TAP',
    toggle: 'TOGGLE',
    passive: 'PASSIVE',
  };
  return map[type] || (type || '').toUpperCase();
}

function skillCard(s, sk) {
  const h = s.run.hero;
  const lv = skillLv(s, sk.id);
  const cost = skillSpCost(lv);
  const ok = canLearn(s, sk.id);
  const maxed = lv >= sk.max;
  const owned = lv > 0;
  let state = 'locked';
  if (maxed) state = 'maxed';
  else if (ok) state = 'can';
  else if (owned) state = 'owned';

  let cta = '—';
  if (maxed) cta = 'Max';
  else cta = `${cost} SP`;

  const reqs = Object.keys(sk.req || {}).length ? reqBadges(sk.req, h) : '';
  const afford = !maxed && h.sp >= cost && ok;
  const nextLevel = Math.min(sk.max, lv + 1);
  const actionLabel = maxed ? `${sk.name} is at maximum rank` : `Raise ${sk.name} from rank ${lv} to ${nextLevel} for ${cost} SP`;

  return `
  <button type="button" class="skill-card build-skill-card ${state}"
    data-alloc="skill" data-id="${sk.id}" ${maxed ? 'disabled' : ''} aria-label="${actionLabel}">
    <div class="sk-ico" aria-hidden="true">${skillIco(sk.id)}</div>
    <div class="sk-main">
      <div class="sk-top">
        <span class="sk-name">${sk.short || sk.name}</span>
        <span class="sk-type t-${sk.type}">${typeTag(sk.type)}</span>
      </div>
      <span class="sk-desc inline">${sk.desc}</span>
      ${reqs ? `<div class="sk-reqs">${reqs}</div>` : ''}
    </div>
    <div class="sk-side">
      <span class="sk-delta">${lv}<span aria-hidden="true">→</span>${nextLevel}</span>
      <span class="sp-cost ${afford ? 'afford' : ''}">${cta}</span>
    </div>
  </button>`;
}

function renderSkills(s) {
  const root = document.getElementById('skills-body');
  if (!root) return;
  const h = s.run.hero;
  const hasSp = h.sp > 0;

  let html = `
  <div class="sp-bank compact ${hasSp ? 'has-sp' : ''}">
    <span class="sp-bank-label">SP</span>
    <strong class="sp-bank-val">${h.sp}</strong>
    <span class="sp-bank-hint">${hasSp ? 'Ready to invest' : 'Earn SP by ranking up'}</span>
  </div>

  <div class="section-lab">Attributes</div>
  <div class="attr-row">`;

  for (const id of ['scan', 'verify', 'amplify']) {
    const m = ATTR_META[id];
    const val = h[id] || 0;
    const unlock = nextSkillUnlock(id, val);
    const gate = Number(unlock?.req?.[id] || 0);
    const unlockCopy = !unlock
      ? 'All skills open'
      : gate === val + 1
        ? `Unlocks ${unlock.short || unlock.name}`
        : `Next: ${unlock.short || unlock.name} at ${gate}`;
    html += `
    <button type="button" class="attr-card build-attr-card ${hasSp ? 'can' : 'locked'}" data-alloc="attr" data-id="${id}" aria-label="Raise ${m.label} from ${val} to ${val + 1} for 1 SP. ${unlockCopy}">
      <span class="attr-ico" aria-hidden="true">${attrIco(id)}</span>
      <span class="attr-lab">${m.label}</span>
      <span class="attr-delta">${val}<span aria-hidden="true">→</span>${val + 1}</span>
      <span class="attr-effect">${m.sub}</span>
      <span class="attr-unlock">${unlockCopy}</span>
      <span class="sp-cost ${hasSp ? 'afford' : ''}">1 SP</span>
    </button>`;
  }

  html += `</div>`;

  for (const tree of SKILL_TREES) {
    html += `<div class="section-lab">${tree.label}</div><div class="skill-grid">`;
    for (const sk of Object.values(SKILLS)) {
      if (sk.tree !== tree.id) continue;
      html += skillCard(s, sk);
    }
    html += `</div>`;
  }
  root.innerHTML = html;
}

function renderPremium(s) {
  const root = document.getElementById('premium-body');
  if (!root) return;
  ensurePremium(s);
  const p = s.meta.premium;
  const eco = economyMult(s);
  const boostOn = boostActive(s);
  const left = boostSecondsLeft(s);
  const leftM = Math.ceil(left / 60);
  const auto = hasAutoSprint(s);
  const loadout = equippedCount(normalizeGear(s.meta.gear));

  let html = `
  <div class="sp-bank compact rep-bank">
    <span class="sp-bank-label">Coins</span>
    <strong class="sp-bank-val gold">${formatNum(p.coins)}</strong>
    <span class="sp-bank-hint">×${eco.toFixed(2)}${boostOn ? ` · 2× ${leftM}m` : ''}${auto ? ' · Auto' : ''} · ${loadout}/4 gear</span>
  </div>
  <div class="premium-card compact ${p.pro ? 'owned' : ''}">
    <div class="premium-card-top">
      <span class="premium-ico">${hubIco('pro')}</span>
      <strong>APN Pro</strong>
      <span class="premium-tag">${p.pro ? 'ON' : 'DEMO'}</span>
    </div>
    <p class="fine prem-one">${PREMIUM.pro.benefits.slice(0, 2).join(' · ')}</p>
    <button type="button" class="btn-primary" data-premium="pro" ${p.pro ? 'disabled' : ''}>
      <span class="btn-primary-title">${p.pro ? 'Pro Active' : 'Try APN Pro'}</span>
      <span class="btn-primary-sub">${p.pro ? `×${PREMIUM.pro.mult}` : 'Demo unlock · no payment'}</span>
    </button>
  </div>
  <div class="prem-row">
    <button type="button" class="prem-chip ${auto ? 'on' : ''}" data-premium="auto" ${auto ? 'disabled' : ''}>
      <strong>Auto-Sprint</strong>
      <small>${PREMIUM.auto_sprint.desc}</small>
      <span>${auto ? 'On' : `${PREMIUM.auto_sprint.coinCost} Coins`}</span>
    </button>
    <button type="button" class="prem-chip" data-premium="boost">
      <strong>2× Boost</strong>
      <small>${PREMIUM.boost_2x.desc}</small>
      <span>${boostOn ? `+${PREMIUM.boost_2x.minutes}m` : `${PREMIUM.boost_2x.coinCost} Coins`}</span>
    </button>
    <button type="button" class="prem-chip" data-premium="warp">
      <strong>Warp +1h</strong>
      <small>${PREMIUM.time_warp.desc}</small>
      <span>${PREMIUM.time_warp.coinCost} Coins</span>
    </button>
  </div>
  <div class="section-lab">Gear Boxes <span class="section-count">coins</span></div>
  <div class="box-grid">`;
  for (const box of PREMIUM.boxes || []) {
    const can = p.coins >= box.coinCost;
    html += `
    <button type="button" class="box-card ${can ? 'can' : ''}" data-premium="${box.id}">
      <span class="box-ico">${hubIco('gift')}</span>
      <strong class="box-name">${box.name}</strong>
      <span class="box-meta">${box.rolls}× gear${box.minRarity ? ` · ${box.minRarity}+` : ''}</span>
      <span class="box-cost">${box.coinCost} Coins</span>
    </button>`;
  }
  html += `</div>
  <div class="section-lab">Coins</div>
  <div class="premium-packs compact">`;
  for (const pack of PREMIUM.packs) {
    html += `
    <button type="button" class="pack-chip" data-premium="${pack.id}">
      <strong>+${pack.coins} Coins</strong>
      <span>Demo grant · ${pack.priceLabel}</span>
    </button>`;
  }
  html += `</div>`;
  root.innerHTML = html;
}

function renderMeta(s) {
  const root = document.getElementById('meta-body');
  if (!root) return;
  const rep = s.authority.amount;
  let html = `
  <div class="sp-bank compact rep-bank">
    <span class="sp-bank-label">Rep</span>
    <strong class="sp-bank-val gold">${formatNum(rep)}</strong>
    <span class="sp-bank-hint">Permanent</span>
  </div>
  <div class="skill-grid meta-grid">`;
  for (const u of Object.values(META)) {
    const lv = metaLv(s, u.id);
    const cost = metaCost(u.base, u.growth, lv);
    const ok = rep >= cost;
    const barPct = Math.min(100, lv * 8);
    // desc always visible — no hover tooltip
    html += `
    <button type="button" class="skill-card compact meta-row ${ok ? 'can' : 'locked'}" data-meta="${u.id}">
      <div class="sk-ico gold" aria-hidden="true">${metaIco(u.id)}</div>
      <div class="sk-main">
        <div class="sk-top">
          <span class="sk-name">${u.name}</span>
        </div>
        <div class="sk-desc inline">${u.desc}</div>
        <div class="sk-bar"><i style="width:${barPct}%"></i></div>
      </div>
      <div class="sk-side">
        <span class="sk-lv">Lv ${lv}</span>
        <span class="sk-cta">${formatNum(cost)}</span>
      </div>
    </button>`;
  }
  html += '</div>';
  root.innerHTML = html;
}

function rewardChips(reward) {
  const labels = { sig: 'Signal', sp: 'SP', rep: 'Rep', coin: 'Coins', notes: 'Notes' };
  return formatReward(reward)
    .map((r) => `<span class="rw-chip k-${r.k}">${r.v} ${labels[r.k] || r.k}</span>`)
    .join('');
}

function questRow(s, def, period) {
  ensureHub(s);
  const hub = s.meta.hub;
  const prog = hubProgress(hub, def, period);
  const state = hubObjectiveState(hub, def, period);
  const pct = Math.round((prog / def.target) * 100);
  const claimed = state === 'claimed';
  const ready = state === 'claimable';
  return `
  <div class="quest-row liveops-${state}">
    <div class="quest-ico" aria-hidden="true">${hubIco(period === 'daily' ? 'daily' : 'weekly')}</div>
    <div class="quest-main">
      <div class="quest-top">
        <span class="quest-name">${def.label}</span>
        <span class="quest-prog">${prog}/${def.target}</span>
      </div>
      <span class="quest-desc">${def.desc}</span>
      <div class="quest-progress" aria-label="${pct}% complete"><i style="width:${pct}%"></i></div>
      <div class="quest-rw">${rewardChips(def.reward)}</div>
    </div>
    ${claimed
      ? '<span class="quest-status state-claimed">Claimed</span>'
      : ready
        ? `<button type="button" class="quest-cta" data-claim="${period}:${def.id}" aria-label="Claim ${def.label} rewards">Claim</button>`
        : '<span class="quest-status state-locked">In progress</span>'}
  </div>`;
}

function renderHub(s) {
  const root = document.getElementById('hub-body');
  if (!root) return;
  ensureHub(s);
  const hub = s.meta.hub;
  const season = seasonLevel(hub.seasonXp || 0);
  const pct = Math.round((season.into / season.need) * 100);
  const dailyReady = DAILY_DEFS.filter((def) => hubObjectiveState(hub, def, 'daily') === 'claimable').length;
  const weeklyReady = WEEKLY_DEFS.filter((def) => hubObjectiveState(hub, def, 'weekly') === 'claimable').length;

  let html = `
  <div class="hub-season">
    <div class="hub-season-top">
      <span class="hub-season-lab">Season</span>
      <strong>Lv ${season.level}</strong>
      <span class="hub-season-xp">${formatNum(season.into)}/${formatNum(season.need)}</span>
    </div>
    <div class="sk-bar season-bar"><i style="width:${pct}%"></i></div>
    <div class="season-milestones">`;
  for (const m of SEASON_MILESTONES) {
    const unlocked = season.level >= m.lv;
    const claimed = !!hub.seasonClaimed?.[m.lv];
    const milestoneState = claimed ? 'claimed' : unlocked ? 'claimable' : 'locked';
    html += `
    <button type="button" class="season-mil liveops-${milestoneState}"
      data-season-lv="${m.lv}" ${!unlocked || claimed ? 'disabled' : ''}
      aria-label="Season level ${m.lv} reward, ${milestoneState}">
      <span class="sm-lv">Level ${m.label}</span>
      <span class="sm-reward">${rewardChips(m.reward)}</span>
      <span class="sm-state">${claimed ? 'Claimed' : unlocked ? 'Claim' : 'Locked'}</span>
    </button>`;
  }
  html += `</div></div>

  <div class="hub-section-head"><strong>Daily</strong><span>${dailyReady ? `${dailyReady} ready` : 'Live now'}</span></div>
  <div class="quest-list">
    ${DAILY_DEFS.map((d) => questRow(s, d, 'daily')).join('')}
  </div>

  <div class="hub-section-head"><strong>Weekly</strong><span>${weeklyReady ? `${weeklyReady} ready` : 'This week'}</span></div>
  <div class="quest-list">
    ${WEEKLY_DEFS.map((d) => questRow(s, d, 'weekly')).join('')}
  </div>`;
  root.innerHTML = html;
}

function brandEqCard(slot, item, selected, comparing) {
  const lab = slotLabel(slot).toUpperCase();
  const sel = selected ? ' sel' : '';
  const compare = comparing ? ' compare' : '';
  if (!item) {
    return `
    <button type="button" class="gcard empty${sel}${compare}" data-eq-slot="${slot}" aria-label="${lab}: empty">
      <span class="gcard-slot">${lab}</span>
      <span class="gcard-art muted">${gearIcon({ slot, name: 'empty', rarity: 'white' })}</span>
      <span class="gcard-name">Empty</span>
    </button>`;
  }
  return `
  <button type="button" class="gcard filled r-${item.rarity}${sel}${compare}" data-eq-slot="${slot}"
    aria-label="${lab}: ${item.name}, level ${item.ilvl}">
    <span class="gcard-slot">${lab}</span>
    <span class="gcard-art">${gearIcon(item)}</span>
    <span class="gcard-ilvl">${item.ilvl}</span>
  </button>`;
}

function invCard(it, g, focusId) {
  const up = isUpgrade(g, it);
  const sel = focusId === it.id ? ' sel' : '';
  return `
  <button type="button" class="icard r-${it.rarity}${sel}${up ? ' up' : ''}${it.junk ? ' junk' : ''}"
    data-inv="${it.id}" aria-label="${it.name}, ${rarityLabel(it.rarity)}, level ${it.ilvl}${up ? ', upgrade' : ''}${it.junk ? ', marked junk' : ''}">
    <span class="icard-art">${gearIcon(it)}</span>
    <span class="icard-ilvl">${it.ilvl}</span>
    ${up ? '<span class="inv-up" aria-hidden="true">↑</span>' : ''}
    ${it.junk ? '<span class="inv-junk" aria-hidden="true">×</span>' : ''}
  </button>`;
}

function selectedCompare(item, equipped) {
  const next = primaryStat(item);
  if (!equipped) return { line: next.text, delta: 'Empty slot · immediate gain', tone: 'empty' };
  const currentAffix = (equipped.affixes || []).find((affix) => affix.key === next.key);
  const current = currentAffix ? Number(currentAffix.value) || 0 : 0;
  const unit = currentAffix?.unit === '%' || (item.affixes || []).find((affix) => affix.key === next.key)?.unit === '%' ? '%' : '';
  const delta = Math.round((next.value - current) * 10) / 10;
  const sign = delta > 0 ? '+' : '';
  return {
    line: `${next.brand} ${current}${unit} → ${next.value}${unit}`,
    delta: delta === 0 ? 'No primary-stat change' : `${sign}${delta}${unit} equipped delta`,
    tone: delta > 0 ? 'better' : delta < 0 ? 'worse' : 'same',
  };
}

function renderGear(s) {
  const root = document.getElementById('gear-body');
  if (!root) return;
  const g = normalizeGear(s.meta.gear);
  s.meta.gear = g;
  const filter = s.settings.gearFilter || 'all';
  const sort = s.settings.gearSort || 'power';
  const bag = queryGearBag(g, { filter, sort });
  const focusId = s.ui.gearFocus || null;
  const eqFocus = s.ui.gearEqFocus || null;
  const focus = (g.bag || []).find((x) => x.id === focusId) || null;
  const eqItem = eqFocus && g[eqFocus] ? g[eqFocus] : null;
  const nEq = equippedCount(g);
  const fullBag = g.bag || [];

  let html = `
  <div class="brand-loadout">
    <div class="brand-host">
      <span class="brand-host-label">HOST</span>
      <img class="brand-mascot" src="./assets/mascot/apn-mascot-idle.webp" alt="APN Host" width="104" height="104" />
      <span class="brand-eq-n">${nEq}/4 READY</span>
    </div>
    <div class="brand-slots">
      ${SLOTS.map((sl) => brandEqCard(sl, g[sl], eqFocus === sl, focus?.slot === sl)).join('')}
    </div>
  </div>

  <div class="inv-head">
    <div class="section-lab">Inventory <span class="section-count">${fullBag.length}/${BAG_CAP}</span></div>
    <div class="gear-tools">
      <label class="gear-tool"><span>Sort</span><select data-gear-sort aria-label="Sort inventory">
        ${[['power', 'Power'], ['level', 'Level'], ['rarity', 'Rarity']].map(([value, label]) => `<option value="${value}" ${sort === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <label class="gear-tool"><span>Filter</span><select data-gear-filter aria-label="Filter inventory">
        ${[['all', 'All'], ['upgrades', 'Upgrades'], ['junk', 'Junk'], ...SLOTS.map((slot) => [slot, slotLabel(slot)])].map(([value, label]) => `<option value="${value}" ${filter === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
    </div>
  </div>
  <div class="inv-cards">`;

  if (!fullBag.length) {
    html += `<div class="inv-empty-state">Defeat Version Gates to collect gear.</div>`;
  } else if (!bag.length) {
    html += `<div class="inv-empty-state">No items match this view.</div>`;
  } else {
    for (const it of bag) {
      html += invCard(it, g, focusId);
    }
  }
  if (filter === 'all' && fullBag.length < BAG_CAP) {
    for (let i = fullBag.length; i < BAG_CAP; i++) {
      html += `<div class="icard empty" aria-label="Empty inventory slot" role="img"></div>`;
    }
  }
  html += `</div>`;

  if (focus) {
    const up = isUpgrade(g, focus);
    const cur = g[focus.slot];
    const cmp = selectedCompare(focus, cur);
    html += `
    <div class="gear-detail r-${focus.rarity}">
      <div class="gd-ico">${gearIcon(focus)}</div>
      <div class="gd-main">
        <div class="gd-name">${focus.name}</div>
        <div class="gd-meta">${slotLabel(focus.slot).toUpperCase()} · ${rarityLabel(focus.rarity).toUpperCase()} · LV ${focus.ilvl}</div>
        <div class="gd-affs">${(focus.affixes || []).map((a) => formatAffix(a)).join(' · ')}</div>
        <div class="gd-compare">${cmp.line}</div>
        <div class="gd-cmp ${cmp.tone}">${cmp.delta}</div>
      </div>
      <div class="gd-actions">
        <button type="button" class="gd-equip" data-equip="${focus.id}">${up || !cur ? 'Equip' : 'Swap'}</button>
        <button type="button" class="gd-junk" data-junk="${focus.id}">${focus.junk ? 'Keep' : 'Mark junk'}</button>
        <button type="button" class="gd-sell" data-sell="${focus.id}">Scrap · +${sellValue(focus)} Signal</button>
      </div>
    </div>`;
  } else if (eqItem) {
    const prim = primaryStat(eqItem);
    html += `
    <div class="gear-detail equipped r-${eqItem.rarity}">
      <div class="gd-ico">${gearIcon(eqItem)}</div>
      <div class="gd-main">
        <div class="gd-name">${eqItem.name}</div>
        <div class="gd-meta">Equipped · ${slotLabel(eqFocus)} · ${rarityLabel(eqItem.rarity)} · ${prim.text}</div>
        <div class="gd-affs">${(eqItem.affixes || []).map((a) => formatAffix(a)).join(' · ')}</div>
      </div>
      <div class="gd-actions">
        <button type="button" class="gd-unequip" data-unequip="${eqFocus}">Unequip</button>
      </div>
    </div>`;
  } else {
    html += `<p class="fine bag-empty">Select an item to compare, equip, mark, or scrap.</p>`;
  }

  root.innerHTML = html;
}

/** Center-screen loot drop card — smooth fade in/out, icon + compact stats */
function updateLootDrop(s) {
  const el = document.getElementById('loot-toast');
  if (!el) return;
  const drop = s.ui.lootDrop;
  if (!drop || !drop.item) {
    if (!el.hidden && el.classList.contains('show')) {
      el.classList.add('out');
      // let fade finish then hide
      if (!el._hideTimer) {
        el._hideTimer = setTimeout(() => {
          el.classList.remove('show', 'out');
          el.hidden = true;
          el.dataset.dropId = '';
          el._hideTimer = null;
        }, 320);
      }
    }
    return;
  }
  if (el._hideTimer) {
    clearTimeout(el._hideTimer);
    el._hideTimer = null;
  }
  const item = drop.item;
  const col = rarityColor(item.rarity);
  const life = drop.life || 2.5;
  const u = drop.t / life;
  // rebuild content when new drop id
  if (el.dataset.dropId !== item.id) {
    el.dataset.dropId = item.id;
    const slotLab = slotLabel(item.slot);
    el.innerHTML = `
      <div class="loot-card r-${item.rarity}" style="--rc:${col}">
        <div class="loot-badge">${drop.equipped ? 'Equipped' : 'Bag'} · ${slotLab}</div>
        <div class="loot-ico" style="color:${col}">${gearIcon(item)}</div>
        <div class="loot-rarity" style="color:${col}">${rarityLabel(item.rarity)}</div>
        <div class="loot-name" style="color:${col}">${item.name}</div>
        <div class="loot-aff">${(item.affixes || [])
          .slice(0, 2)
          .map((a) => formatAffix(a))
          .join(' · ')}</div>
      </div>`;
    el.hidden = false;
    el.classList.remove('out', 'show');
    void el.offsetWidth;
    el.classList.add('show');
  }
  // fade out last ~0.45s
  if (u < 0.2) el.classList.add('out');
  else el.classList.remove('out');
}

export function renderHUD(s) {
  const $ = (id) => document.getElementById(id);
  const st = combatStats(s);
  const h = s.run.hero;
  const pack = packForRoute(s.route, GAME_PACKS);
  set($('feed-game'), pack?.title || 'Patchline');
  set($('feed-copy'), FEED_COPY[pack?.genre] || 'Update notes live');

  set($('v-bytes'), formatNum(s.run.bytes));
  set($('v-patches'), formatNum(s.run.patches));
  updateLootDrop(s);
  // resource chip pulse on gain
  const chips = document.querySelectorAll('.hud-res .chip');
  if (chips[0]) chips[0].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.bytes > 0));
  if (chips[1]) chips[1].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.patches > 0));
  // Build nav badge when unspent SP
  document.querySelectorAll('.nav-btn[data-panel="skills"]').forEach((b) => {
    b.classList.toggle('has-badge', s.run.hero.sp > 0);
    b.dataset.badge = s.run.hero.sp > 0 ? String(s.run.hero.sp) : '';
  });
  set($('v-zone'), String(s.route.zone + 1));
  // Show full economy mult when boost/pro active, else base Live
  const eco = economyMult(s);
  set($('v-live'), eco.toFixed(2));
  set($('v-level'), String(h.level));
  set($('v-sp'), String(h.sp));
  const livePill = document.querySelector('.stage-stat.live');
  if (livePill) {
    livePill.title = `Economy ×${eco.toFixed(2)} (Live ${s.meta.live.toFixed(2)}${
      s.meta.premium?.pro ? ' · Pro' : ''
    }${boostActive(s) ? ' · 2×' : ''})`;
    livePill.classList.toggle('pro-on', !!(s.meta.premium?.pro || boostActive(s)));
  }
  const proBadge = $('v-pro');
  if (proBadge) {
    proBadge.hidden = !s.meta.premium?.pro;
  }
  // CTA cost + afford state
  const cost = scannerCost(h.scanner);
  const costEl = $('v-cost');
  const scEl = $('v-scanner');
  const scNextEl = $('v-scanner-next');
  const deltaEl = $('v-scan-delta');
  const cta = $('btn-scanner');
  if (costEl) costEl.textContent = formatNum(cost);
  if (scEl) scEl.textContent = String(h.scanner);
  if (scNextEl) scNextEl.textContent = String(h.scanner + 1);
  if (deltaEl) {
    const current = scannerDamage(h.scanner);
    const next = scannerDamage(h.scanner + 1);
    deltaEl.textContent = `+${Math.max(1, Math.round((next / current - 1) * 100))}%`;
  }
  if (cta) cta.classList.toggle('is-locked', s.run.bytes < cost);
  const need = killsNeeded(s.route.zone);
  const needXp = xpToNext(h.level);
  set($('v-kills'), `${s.route.killsInZone}/${need}`);
  set($('v-xp-lab'), `${formatNum(h.xp | 0)}/${formatNum(needXp)}`);

  // Left bag FAB badge: upgrades (green) or bag count
  const bagBtn = $('btn-bag');
  const bagBadge = $('bag-badge');
  if (bagBtn && bagBadge) {
    const gear = normalizeGear(s.meta.gear);
    s.meta.gear = gear;
    const bag = gear.bag || [];
    const n = bag.length;
    const ups = bag.filter((it) => isUpgrade(gear, it)).length;
    const eq = equippedCount(gear);
    bagBtn.classList.toggle('has-up', ups > 0);
    bagBtn.classList.toggle('active', s.ui.panel === 'gear');
    bagBtn.title =
      ups > 0
        ? `Gear · ${ups} better piece${ups > 1 ? 's' : ''} ready · ${eq}/4`
        : `Bag · ${n} item${n === 1 ? '' : 's'} · ${eq}/4 equipped`;
    if (ups > 0) {
      bagBadge.hidden = false;
      bagBadge.textContent = ups > 9 ? '9+' : String(ups);
    } else if (n > 0) {
      bagBadge.hidden = false;
      bagBadge.textContent = n > 9 ? '9+' : String(n);
    } else {
      bagBadge.hidden = true;
      bagBadge.textContent = '';
    }
  }

  const combo = $('v-combo');
  if (combo) {
    if (s.stats.combo >= 2) {
      combo.hidden = false;
      set(combo, `${s.stats.combo}×`);
    } else combo.hidden = true;
  }

  bar($('bar-xp'), (h.xp / needXp) * 100);
  bar($('bar-zone'), (s.route.killsInZone / Math.max(1, need)) * 100);
  bar($('bar-energy'), (h.energy / st.eMax) * 100);
  bar($('bar-mana'), (h.mana / st.mMax) * 100);

  // Sprint feedback on energy bar + button
  const sprinting = isSprinting(s);
  const eWrap = $('bar-energy-wrap');
  if (eWrap) eWrap.classList.toggle('is-sprinting', sprinting);
  const eLab = $('v-energy-lab');
  if (eLab) {
    if (sprinting) set(eLab, `×${(st.timeScale || 1.85).toFixed(2)} SPEED`);
    else if (h.energy < st.eMax * 0.2) set(eLab, 'Low — grab orbs');
    else set(eLab, 'Sprint fuel');
  }
  const spBtn = $('btn-sprint');
  if (spBtn) {
    const auto = hasAutoSprint(s);
    spBtn.classList.toggle('is-active', sprinting);
    spBtn.classList.toggle('is-empty', h.energy < 1);
    spBtn.classList.toggle('is-auto', auto);
    const sub = spBtn.querySelector('.btn-sprint-sub');
    if (sub) {
      if (sprinting) set(sub, auto ? 'AUTO · ×1.85' : `×${(st.timeScale || 1.85).toFixed(2)} LIVE`);
      else if (h.energy < 1) set(sub, 'Need energy');
      else set(sub, auto ? 'Auto on · ×1.85' : 'Hold · ×1.85');
    }
  }
  // Hub badge when claimable
  ensureHub(s);
  let hubReady = 0;
  for (const d of DAILY_DEFS) {
    if (hubDone(s.meta.hub, d, 'daily') && !hubClaimed(s.meta.hub, d, 'daily')) hubReady++;
  }
  for (const d of WEEKLY_DEFS) {
    if (hubDone(s.meta.hub, d, 'weekly') && !hubClaimed(s.meta.hub, d, 'weekly')) hubReady++;
  }
  document.querySelectorAll('.nav-btn[data-panel="hub"]').forEach((b) => {
    b.classList.toggle('has-badge', hubReady > 0);
    b.dataset.badge = hubReady > 0 ? String(hubReady) : '';
  });
  document.getElementById('app')?.classList.toggle('is-sprinting', sprinting);

  if (s.ui.pendingTip && TIPS[s.ui.pendingTip]) {
    s.ui.toast = TIPS[s.ui.pendingTip];
    s.ui.toastT = 3;
    s.ui.pendingTip = null;
  }
  const toast = $('toast');
  if (toast) {
    if (s.ui.toast) {
      toast.hidden = false;
      set(toast, s.ui.toast);
    } else toast.hidden = true;
  }

  for (const [id, sk, on] of [
    ['btn-hotfix', 'hotfix', false],
    ['btn-summary', 'summary_burst', false],
    ['btn-tracker', 'live_tracker', h.trackerOn],
    ['btn-deep', 'deep_dive', h.deepOn],
  ]) {
    const el = $(id);
    if (!el) continue;
    const locked = skillLv(s, sk) < 1;
    el.hidden = false;
    el.disabled = locked;
    el.classList.toggle('locked', locked);
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
    const def = SKILLS[sk];
    // Keep short labels stable; Overdrive shows live state
    if (sk === 'deep_dive') {
      const lab = on ? 'Overdrive · ON' : def?.short || 'Overdrive';
      if (el.textContent !== lab) el.textContent = lab;
    } else if (sk === 'live_tracker') {
      const lab = on ? 'Ramp · ON' : def?.short || 'Ramp';
      if (el.textContent !== lab) el.textContent = lab;
    } else if (def?.short && el.textContent !== def.short) {
      el.textContent = def.short;
    }
  }
  document.getElementById('app')?.classList.toggle('is-overdrive', !!h.deepOn);

  if (s.ui.offline) {
    const m = $('offline-modal');
    if (m) {
      m.hidden = false;
      const o = s.ui.offline;
      set(
        $('offline-body'),
        `Away ${fmtTime(o.seconds)}\n+${formatNum(o.bytes)} Signal · +${formatNum(o.patches)} Notes\n+${o.levels} ranks · +${o.zones} zones · ${o.kills} clears`
      );
    }
  }

  // Only re-render open panel when dirty — preserve scroll, no flap
  if (s.ui.panel && s.ui.panelDirty) {
    const body = document.querySelector('.sheet-body');
    const scrollY = body ? body.scrollTop : 0;
    if (s.ui.panel === 'skills') renderSkills(s);
    if (s.ui.panel === 'meta') renderMeta(s);
    if (s.ui.panel === 'ship') fillShip(s);
    if (s.ui.panel === 'gear') renderGear(s);
    if (s.ui.panel === 'hub') renderHub(s);
    if (body) body.scrollTop = scrollY;
    lastPanel = s.ui.panel;
    s.ui.panelDirty = false;
  }
}

function set(el, t) {
  if (el && el.textContent !== String(t)) el.textContent = t;
}
function bar(el, pct) {
  if (el) el.style.width = `${clamp(pct, 0, 100)}%`;
}
function fmtTime(sec) {
  if (sec < 60) return `${sec | 0}s`;
  if (sec < 3600) return `${(sec / 60) | 0}m`;
  return `${(sec / 3600) | 0}h`;
}
