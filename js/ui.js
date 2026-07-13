/** APN Idle UI — sheet + compact HUD */

import {
  formatNum,
  scannerCost,
  metaCost,
  xpToNext,
  liveGain,
  clamp,
  killsNeeded,
} from './formulas.js';
import {
  SEASON,
  META,
  SKILLS,
  SKILL_TREES,
  TIPS,
  ATTR_LABEL,
  ATTR_META,
  PREMIUM,
  skillSpCost,
} from './content.js';
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
  itemScore,
  SLOTS,
  slotLabel,
  slotShort,
  equippedCount,
  gearBonuses,
  primaryStat,
} from './loot.js';
import {
  DAILY_DEFS,
  WEEKLY_DEFS,
  hubProgress,
  hubDone,
  hubClaimed,
  seasonLevel,
  SEASON_MILESTONES,
  formatReward,
  formatRewardText,
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

  // Header gear pill → Gear panel (icons only, no name spam)
  $('v-gear-pill')?.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    openSheet(s, 'gear');
    if (s.settings.sfx !== false) sfx('click');
  });

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
    if (confirm('Wipe save and start over?')) {
      clear();
      location.reload();
    }
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

  // Hold-to-sell on inventory cards (mock: "Hold to sell junk")
  let holdTimer = null;
  let holdId = null;
  let justSold = false;
  const clearHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    holdId = null;
    document.querySelectorAll('.icard.holding').forEach((el) => el.classList.remove('holding'));
  };
  const startHold = (id, el) => {
    clearHold();
    holdId = id;
    el?.classList.add('holding');
    holdTimer = setTimeout(() => {
      if (holdId !== id) return;
      const res = sellGear(s, id);
      clearHold();
      justSold = true;
      if (res) {
        save(s);
        s.ui.gearFocus = null;
        s.ui.gearEqFocus = null;
        renderGear(s);
      } else if (s.settings.sfx !== false) sfx('error');
    }, 550);
  };

  $('panel-gear')?.addEventListener('pointerdown', (e) => {
    const inv = e.target.closest('[data-inv]');
    if (!inv || e.button === 2) return;
    startHold(inv.dataset.inv, inv);
  });
  $('panel-gear')?.addEventListener('pointerup', clearHold);
  $('panel-gear')?.addEventListener('pointercancel', clearHold);
  $('panel-gear')?.addEventListener('pointerleave', (e) => {
    if (e.target === $('panel-gear')) clearHold();
  });

  $('panel-gear')?.addEventListener('click', (e) => {
    if (justSold) {
      justSold = false;
      e.preventDefault();
      e.stopPropagation();
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
    const filter = e.target.closest('[data-rarity-filter]');
    if (filter) {
      s.ui.gearRarityFilter = filter.dataset.rarityFilter || 'all';
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
  }
  document.getElementById('app')?.classList.add('sheet-open');
  document.querySelectorAll('.hud-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panel);
  });
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
    const a = document.getElementById('v-attrs');
    if (a) {
      const h = s.run.hero;
      a.textContent = `Damage ${h.scan} · Crit ${h.verify} · Utility ${h.amplify}`;
    }
    const sx = document.getElementById('chk-sfx');
    if (sx) sx.checked = s.settings.sfx !== false;
    const mo = document.getElementById('chk-motion');
    if (mo) mo.checked = !!s.settings.reducedMotion;
    renderPremium(s);
  }
  lastPanel = panel;
  s.ui.panelDirty = false;
}

function closeSheet(s) {
  s.ui.panel = null;
  lastPanel = null;
  const root = document.getElementById('sheet-root');
  if (root) {
    root.hidden = true;
    root.classList.remove('is-open');
  }
  document.getElementById('app')?.classList.remove('sheet-open');
  document.querySelectorAll('.hud-nav button').forEach((b) => b.classList.remove('active'));
}

function fillShip(s) {
  const el = document.getElementById('ship-info');
  if (!el) return;
  const notes = Math.floor(s.run.patches);
  const gain = Math.floor(notes * economyMult(s));
  const liveNext = liveGain(s.authority.shippedThisSeason);
  const seasonReady = s.ui.seasonDone || s.run.zone >= SEASON.zones;
  const nextZ = SEASON.zones * (Math.floor(s.run.zone / SEASON.zones) + 1);
  const eco = economyMult(s);
  el.className = 'ship-stats compact';
  el.innerHTML = [
    row('Notes', formatNum(notes), notes > 0 ? 'hi' : ''),
    row('→ Rep', `+${formatNum(gain)}`, gain > 0 ? 'hi' : ''),
    row('Mult', `×${eco.toFixed(2)}`, ''),
    seasonReady
      ? row('End Season', `+${liveNext.toFixed(3)} Live`, 'hi')
      : row('Checkpoint', `Z${nextZ}`, ''),
  ].join('');
  const leave = document.getElementById('btn-leave');
  if (leave) leave.hidden = !seasonReady;
}

function row(k, v, cls = '') {
  return `<div class="ship-row ${cls === 'hi' ? 'ready' : ''}"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`;
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
  const pct = Math.round((lv / sk.max) * 100);
  let state = 'locked';
  if (maxed) state = 'maxed';
  else if (ok) state = 'can';
  else if (owned) state = 'owned';

  let cta = '—';
  if (maxed) cta = 'Max';
  else cta = `${cost} SP`;

  const reqs = Object.keys(sk.req || {}).length ? reqBadges(sk.req, h) : '';
  const tip = [sk.desc, reqs ? `Needs: ${Object.entries(sk.req).map(([k, v]) => `${ATTR_LABEL[k] || k} ${v}`).join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');

  return `
  <button type="button" class="skill-card compact ${state}"
    data-alloc="skill" data-id="${sk.id}" ${maxed ? 'disabled' : ''} title="${tip.replace(/"/g, '&quot;')}">
    <div class="sk-ico" aria-hidden="true">${skillIco(sk.id)}</div>
    <div class="sk-main">
      <div class="sk-top">
        <span class="sk-name">${sk.short || sk.name}</span>
        <span class="sk-type t-${sk.type}">${typeTag(sk.type)}</span>
      </div>
      ${reqs ? `<div class="sk-reqs">${reqs}</div>` : ''}
      <div class="sk-bar"><i style="width:${pct}%"></i></div>
    </div>
    <div class="sk-side">
      <span class="sk-lv">${lv}<small>/${sk.max}</small></span>
      <span class="sk-cta">${cta}</span>
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
    <span class="sp-bank-hint">${hasSp ? 'Tap attrs / skills' : 'Rank up for SP'}</span>
  </div>

  <div class="section-lab">Attributes</div>
  <div class="attr-row">`;

  for (const id of ['scan', 'verify', 'amplify']) {
    const m = ATTR_META[id];
    const val = h[id] || 0;
    html += `
    <button type="button" class="attr-card ${hasSp ? 'can' : 'locked'}" data-alloc="attr" data-id="${id}" title="${m.sub} · 1 SP">
      <span class="attr-ico" aria-hidden="true">${attrIco(id)}</span>
      <span class="attr-lab">${m.label}</span>
      <span class="attr-lv">${val}</span>
      <span class="attr-plus" aria-hidden="true">+</span>
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
      <span class="premium-tag">${p.pro ? 'ON' : 'IAP'}</span>
    </div>
    <p class="fine prem-one">${PREMIUM.pro.benefits.slice(0, 2).join(' · ')}</p>
    <button type="button" class="btn-primary" data-premium="pro" ${p.pro ? 'disabled' : ''}>
      <span class="btn-primary-title">${p.pro ? 'Pro Active' : 'Unlock Pro'}</span>
      <span class="btn-primary-sub">${p.pro ? `×${PREMIUM.pro.mult}` : 'Demo'}</span>
    </button>
  </div>
  <div class="prem-row">
    <button type="button" class="prem-chip ${auto ? 'on' : ''}" data-premium="auto" ${auto ? 'disabled' : ''} title="${PREMIUM.auto_sprint.desc}">
      <strong>Auto-Sprint</strong>
      <span>${auto ? 'ON' : `${PREMIUM.auto_sprint.coinCost}¢`}</span>
    </button>
    <button type="button" class="prem-chip" data-premium="boost" title="${PREMIUM.boost_2x.desc}">
      <strong>2× Boost</strong>
      <span>${boostOn ? `+${PREMIUM.boost_2x.minutes}m` : `${PREMIUM.boost_2x.coinCost}¢`}</span>
    </button>
    <button type="button" class="prem-chip" data-premium="warp" title="${PREMIUM.time_warp.desc}">
      <strong>Warp +1h</strong>
      <span>${PREMIUM.time_warp.coinCost}¢</span>
    </button>
  </div>
  <div class="section-lab">Gear Boxes <span class="section-count">coins</span></div>
  <div class="box-grid">`;
  for (const box of PREMIUM.boxes || []) {
    const can = p.coins >= box.coinCost;
    html += `
    <button type="button" class="box-card ${can ? 'can' : ''}" data-premium="${box.id}" title="${box.desc.replace(/"/g, '&quot;')}">
      <span class="box-ico">${hubIco('gift')}</span>
      <strong class="box-name">${box.name}</strong>
      <span class="box-meta">${box.rolls}× gear${box.minRarity ? ` · ${box.minRarity}+` : ''}</span>
      <span class="box-cost">${box.coinCost}¢</span>
    </button>`;
  }
  html += `</div>
  <div class="section-lab">Coins</div>
  <div class="premium-packs compact">`;
  for (const pack of PREMIUM.packs) {
    html += `
    <button type="button" class="pack-chip" data-premium="${pack.id}">
      <strong>+${pack.coins}</strong>
      <span>${pack.priceLabel}</span>
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
  <div class="skill-grid">`;
  for (const u of Object.values(META)) {
    const lv = metaLv(s, u.id);
    const cost = metaCost(u.base, u.growth, lv);
    const ok = rep >= cost;
    const barPct = Math.min(100, lv * 8);
    html += `
    <button type="button" class="skill-card compact ${ok ? 'can' : 'locked'}" data-meta="${u.id}" title="${u.desc.replace(/"/g, '&quot;')}">
      <div class="sk-ico gold" aria-hidden="true">${metaIco(u.id)}</div>
      <div class="sk-main">
        <div class="sk-top">
          <span class="sk-name">${u.name}</span>
        </div>
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
  return formatReward(reward)
    .map((r) => `<span class="rw-chip k-${r.k}">${r.v} ${r.k === 'coin' ? '¢' : r.k}</span>`)
    .join('');
}

function questRow(s, def, period) {
  ensureHub(s);
  const hub = s.meta.hub;
  const prog = hubProgress(hub, def, period);
  const done = hubDone(hub, def, period);
  const claimed = hubClaimed(hub, def, period);
  const pct = Math.round((prog / def.target) * 100);
  let cls = 'quest-row compact';
  if (claimed) cls += ' claimed';
  else if (done) cls += ' ready';
  return `
  <div class="${cls}">
    <div class="quest-main">
      <div class="quest-top">
        <span class="quest-name">${def.label}</span>
        <span class="quest-prog">${claimed ? '✓' : `${prog}/${def.target}`}</span>
      </div>
      <div class="sk-bar thin"><i style="width:${pct}%"></i></div>
      <div class="quest-rw">${rewardChips(def.reward)}</div>
    </div>
    ${
      claimed
        ? ''
        : done
          ? `<button type="button" class="quest-cta" data-claim="${period}:${def.id}">Claim</button>`
          : ''
    }
  </div>`;
}

function renderHub(s) {
  const root = document.getElementById('hub-body');
  if (!root) return;
  ensureHub(s);
  const hub = s.meta.hub;
  const season = seasonLevel(hub.seasonXp || 0);
  const pct = Math.round((season.into / season.need) * 100);

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
    const tip = formatRewardText(m.reward);
    html += `
    <button type="button" class="season-mil ${unlocked ? 'on' : ''} ${claimed ? 'claimed' : ''}"
      data-season-lv="${m.lv}" ${!unlocked || claimed ? 'disabled' : ''} title="${tip}">
      <span class="sm-lv">${m.label}</span>
    </button>`;
  }
  html += `</div></div>

  <div class="section-lab">Daily</div>
  <div class="quest-list">
    ${DAILY_DEFS.map((d) => questRow(s, d, 'daily')).join('')}
  </div>

  <div class="section-lab">Weekly</div>
  <div class="quest-list">
    ${WEEKLY_DEFS.map((d) => questRow(s, d, 'weekly')).join('')}
  </div>`;
  root.innerHTML = html;
}

function itemTooltip(item) {
  if (!item) return '';
  const prim = primaryStat(item);
  const aff = (item.affixes || []).map((a) => formatAffix(a)).join(' · ');
  return `${item.name} · ${rarityLabel(item.rarity)} · ${slotLabel(item.slot)} · ${prim.text}${aff ? ` · ${aff}` : ''}`;
}

/** Brand equip card — large rarity frame + primary stat (mock) */
function brandEqCard(slot, item, selected) {
  const lab = slotLabel(slot).toUpperCase();
  const sel = selected ? ' sel' : '';
  if (!item) {
    return `
    <button type="button" class="gcard empty${sel}" data-eq-slot="${slot}">
      <span class="gcard-slot">${lab}</span>
      <span class="gcard-art muted">${gearIcon({ slot, name: 'empty', rarity: 'white' })}</span>
      <span class="gcard-name">Empty</span>
      <span class="gcard-stat">—</span>
    </button>`;
  }
  const col = rarityColor(item.rarity);
  const prim = primaryStat(item);
  return `
  <button type="button" class="gcard filled r-${item.rarity}${sel}" data-eq-slot="${slot}" style="--rc:${col}" title="${itemTooltip(item).replace(/"/g, '&quot;')}">
    <span class="gcard-slot">${lab}</span>
    <span class="gcard-art" style="color:${col}">${gearIcon(item)}</span>
    <span class="gcard-name" style="color:${col}">${item.name}</span>
    <span class="gcard-stat">${prim.text}</span>
    <span class="gcard-ilvl">${item.ilvl}</span>
  </button>`;
}

function invCard(it, g, focusId) {
  const col = rarityColor(it.rarity);
  const up = isUpgrade(g, it);
  const sel = focusId === it.id ? ' sel' : '';
  const prim = primaryStat(it);
  return `
  <button type="button" class="icard r-${it.rarity}${sel}${up ? ' up' : ''}"
    data-inv="${it.id}" style="--rc:${col}" title="${itemTooltip(it).replace(/"/g, '&quot;')}">
    <span class="icard-art" style="color:${col}">${gearIcon(it)}</span>
    <span class="icard-name" style="color:${col}">${it.name}</span>
    <span class="icard-stat">${prim.text}</span>
    <span class="icard-ilvl">${it.ilvl}</span>
    ${up ? '<span class="inv-up">↑</span>' : ''}
  </button>`;
}

function renderGear(s) {
  const root = document.getElementById('gear-body');
  if (!root) return;
  const g = normalizeGear(s.meta.gear);
  s.meta.gear = g;
  let bag = g.bag || [];
  const filter = s.ui.gearRarityFilter || 'all';
  if (filter !== 'all') bag = bag.filter((it) => it.rarity === filter);
  const focusId = s.ui.gearFocus || null;
  const eqFocus = s.ui.gearEqFocus || null;
  const focus = (g.bag || []).find((x) => x.id === focusId) || null;
  const eqItem = eqFocus && g[eqFocus] ? g[eqFocus] : null;
  const nEq = equippedCount(g);
  const fullBag = g.bag || [];

  let html = `
  <div class="brand-loadout">
    <div class="brand-host">
      <img class="brand-mascot" src="./assets/mascot-host.png" alt="" width="88" height="88" />
      <span class="brand-eq-n">${nEq}/4</span>
    </div>
    <div class="brand-slots">
      ${SLOTS.map((sl) => brandEqCard(sl, g[sl], eqFocus === sl)).join('')}
    </div>
  </div>

  <div class="inv-head">
    <div class="section-lab">Inventory <span class="section-count">${fullBag.length}/${BAG_CAP}</span></div>
    <div class="rarity-filters">
      ${['all', 'green', 'blue', 'yellow', 'unique']
        .map((r) => {
          const lab = r === 'all' ? 'All' : r === 'unique' ? 'Unique' : rarityLabel(r);
          return `<button type="button" class="rf ${filter === r ? 'on' : ''}" data-rarity-filter="${r}">${lab}</button>`;
        })
        .join('')}
    </div>
  </div>
  <div class="inv-cards">`;

  if (!fullBag.length) {
    html += `<div class="inv-empty-state">Bosses & boxes drop gear · fill all 4 slots</div>`;
  } else if (!bag.length) {
    html += `<div class="inv-empty-state">No items match filter</div>`;
  } else {
    for (const it of bag) {
      html += invCard(it, g, focusId);
    }
  }
  // pad empty cells for grid feel
  const pad = Math.max(0, 4 - (bag.length % 4 || 4)) % 4;
  if (bag.length && bag.length < BAG_CAP) {
    for (let i = 0; i < Math.min(pad, 4); i++) {
      html += `<div class="icard empty" aria-hidden="true"></div>`;
    }
  }
  html += `</div>`;

  if (focus) {
    const col = rarityColor(focus.rarity);
    const up = isUpgrade(g, focus);
    const cur = g[focus.slot];
    const prim = primaryStat(focus);
    const cmp = cur
      ? itemScore(focus) > itemScore(cur)
        ? 'Better than equipped'
        : itemScore(focus) < itemScore(cur)
          ? 'Weaker than equipped'
          : 'Similar score'
      : 'Empty slot — safe to equip';
    html += `
    <div class="gear-detail" style="--rc:${col}">
      <div class="gd-ico" style="color:${col}">${gearIcon(focus)}</div>
      <div class="gd-main">
        <div class="gd-name" style="color:${col}">${focus.name}</div>
        <div class="gd-meta">${rarityLabel(focus.rarity)} · ${slotLabel(focus.slot)} · i${focus.ilvl} · ${prim.text}</div>
        <div class="gd-affs">${(focus.affixes || []).map((a) => formatAffix(a)).join(' · ')}</div>
        <div class="gd-cmp ${up ? 'better' : cur ? 'worse' : 'empty'}">${cmp}</div>
      </div>
      <div class="gd-actions">
        <button type="button" class="gd-equip" data-equip="${focus.id}">${up || !cur ? 'Equip' : 'Swap'}</button>
        <button type="button" class="gd-sell" data-sell="${focus.id}">Sell · ${sellValue(focus)} sig</button>
      </div>
    </div>`;
  } else if (eqItem) {
    const col = rarityColor(eqItem.rarity);
    const prim = primaryStat(eqItem);
    html += `
    <div class="gear-detail equipped" style="--rc:${col}">
      <div class="gd-ico" style="color:${col}">${gearIcon(eqItem)}</div>
      <div class="gd-main">
        <div class="gd-name" style="color:${col}">${eqItem.name}</div>
        <div class="gd-meta">Equipped · ${slotLabel(eqFocus)} · ${rarityLabel(eqItem.rarity)} · ${prim.text}</div>
        <div class="gd-affs">${(eqItem.affixes || []).map((a) => formatAffix(a)).join(' · ')}</div>
      </div>
      <div class="gd-actions">
        <button type="button" class="gd-unequip" data-unequip="${eqFocus}">Unequip</button>
        <button type="button" class="gd-sell" disabled title="Unequip first">Sell bag only</button>
      </div>
    </div>`;
  } else {
    html += `<p class="fine bag-empty">Tap slot for stats · Hold to sell junk · Boxes in Menu</p>`;
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

  set($('v-bytes'), formatNum(s.run.bytes));
  set($('v-patches'), formatNum(s.run.patches));
  set($('v-auth'), formatNum(s.authority.amount));
  set($('v-dps'), formatNum(Math.max(0, Math.round(s.stats.dps))));
  updateLootDrop(s);
  // resource chip pulse on gain
  const chips = document.querySelectorAll('.hud-res .chip');
  if (chips[0]) chips[0].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.bytes > 0));
  if (chips[1]) chips[1].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.patches > 0));
  if (chips[2]) chips[2].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.auth > 0));
  // Build nav badge when unspent SP
  document.querySelectorAll('.nav-btn[data-panel="skills"]').forEach((b) => {
    b.classList.toggle('has-badge', s.run.hero.sp > 0);
    b.dataset.badge = s.run.hero.sp > 0 ? String(s.run.hero.sp) : '';
  });
  set($('v-zone'), String(s.run.zone + 1));
  // Show full economy mult when boost/pro active, else base Live
  const eco = economyMult(s);
  set($('v-live'), eco.toFixed(2));
  set($('v-level'), String(h.level));
  set($('v-sp'), String(h.sp));
  const livePill = document.querySelector('.meta-pill [id="v-live"]')?.parentElement;
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
  const cta = $('btn-scanner');
  if (costEl) costEl.textContent = formatNum(cost);
  if (scEl) scEl.textContent = String(h.scanner);
  if (cta) cta.classList.toggle('is-locked', s.run.bytes < cost);
  const need = killsNeeded(s.run.zone);
  const needXp = xpToNext(h.level);
  set($('v-kills'), `${s.run.killsInZone}/${need}`);
  set($('v-xp-lab'), `${formatNum(h.xp | 0)}/${formatNum(needXp)}`);

  // Compact equipped gear in header — up to 3 icons + count
  const gp = $('v-gear-pill');
  if (gp) {
    const gear = normalizeGear(s.meta.gear);
    const pieces = SLOTS.map((sl) => gear[sl]).filter(Boolean);
    if (pieces.length) {
      gp.hidden = false;
      const show = pieces.slice(0, 3);
      const key = pieces.map((p) => p.id).join('|');
      if (gp.dataset.gkey !== key) {
        gp.dataset.gkey = key;
        gp.innerHTML =
          show
            .map((it) => {
              const col = rarityColor(it.rarity);
              return `<span class="gp-ico" style="color:${col}">${gearIcon(it)}</span>`;
            })
            .join('') +
          `<span class="gp-n">${pieces.length}/4</span>`;
      }
    } else {
      gp.hidden = true;
      gp.dataset.gkey = '';
      gp.innerHTML = '';
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
  bar($('bar-zone'), (s.run.killsInZone / Math.max(1, need)) * 100);
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
      else set(sub, auto ? 'Auto-Sprint on' : 'Hold · ×1.85 speed');
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
    el.hidden = skillLv(s, sk) < 1;
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
