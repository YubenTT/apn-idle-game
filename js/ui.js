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
import { SEASON, META, SKILLS, TIPS, ATTR_LABEL, ATTR_META } from './content.js';
import { skillIco, attrIco, metaIco } from './icons.js';
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
} from './game.js';
import { save, clear } from './save.js';
import { sfx, unlockAudio, setMuted } from './sfx.js';

const PANEL_TITLES = {
  skills: 'Build',
  ship: 'Ship Notes',
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
    btn.addEventListener('click', () => {
      unlockAudio();
      const p = btn.dataset.panel;
      if (s.ui.panel === p) closeSheet(s);
      else {
        openSheet(s, p);
        if (s.settings.sfx !== false) sfx('click');
      }
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
  if (root) root.hidden = false;
  document.querySelectorAll('.hud-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panel);
  });
  const title = document.getElementById('sheet-title');
  if (title) title.textContent = PANEL_TITLES[panel] || panel;
  ['skills', 'meta', 'ship', 'settings'].forEach((p) => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.hidden = p !== panel;
  });
  if (panel === 'skills') renderSkills(s);
  if (panel === 'meta') renderMeta(s);
  if (panel === 'ship') fillShip(s);
  if (panel === 'settings') {
    const a = document.getElementById('v-attrs');
    if (a) {
      const h = s.run.hero;
      a.textContent = `Damage ${h.scan} · Crit ${h.verify} · Skills ${h.amplify}`;
    }
    const sx = document.getElementById('chk-sfx');
    if (sx) sx.checked = s.settings.sfx !== false;
    const mo = document.getElementById('chk-motion');
    if (mo) mo.checked = !!s.settings.reducedMotion;
  }
}

function closeSheet(s) {
  s.ui.panel = null;
  const root = document.getElementById('sheet-root');
  if (root) root.hidden = true;
  document.querySelectorAll('.hud-nav button').forEach((b) => b.classList.remove('active'));
}

function fillShip(s) {
  const el = document.getElementById('ship-info');
  if (!el) return;
  const notes = Math.floor(s.run.patches);
  const gain = Math.floor(notes * s.meta.live);
  const liveNext = liveGain(s.authority.shippedThisSeason);
  el.textContent = [
    `Notes ready: ${formatNum(notes)}`,
    `Ship now → +${formatNum(gain)} permanent Rep`,
    `Live Mult: ×${s.meta.live.toFixed(2)} (also multiplies damage)`,
    `Shipped this season: ${formatNum(s.authority.shippedThisSeason)} Rep`,
    s.ui.seasonDone || s.run.zone >= SEASON.zones
      ? `End Season ready → Live +${liveNext.toFixed(3)} · Boosts kept · Weapon reset`
      : `Next checkpoint: Zone ${SEASON.zones * (Math.floor(s.run.zone / SEASON.zones) + 1)}`,
  ].join('\n');
  const leave = document.getElementById('btn-leave');
  if (leave) {
    leave.hidden = !(s.ui.seasonDone || s.run.zone >= SEASON.zones);
  }
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
    mask: 'MASK',
  };
  return map[type] || (type || '').toUpperCase();
}

function renderSkills(s) {
  const root = document.getElementById('skills-body');
  if (!root) return;
  const h = s.run.hero;
  const hasSp = h.sp > 0;
  const maskName = h.mask ? SKILLS[h.mask]?.name : 'None';

  let html = `
  <div class="sp-bank ${hasSp ? 'has-sp' : ''}">
    <div class="sp-bank-left">
      <span class="sp-bank-label">Skill Points</span>
      <strong class="sp-bank-val">${h.sp}</strong>
      <span class="sp-bank-hint">${hasSp ? 'Tap cards to spend' : 'Rank up to earn SP'}</span>
    </div>
    <div class="sp-bank-right">
      <span class="mask-pill ${h.mask ? 'on' : ''}">
        <span class="mask-pill-lab">MASK</span>
        <span class="mask-pill-name">${maskName}</span>
      </span>
    </div>
  </div>

  <div class="section-lab">Attributes · 1 SP each</div>
  <div class="attr-row">`;

  for (const id of ['scan', 'verify', 'amplify']) {
    const m = ATTR_META[id];
    const val = h[id] || 0;
    const can = hasSp;
    html += `
    <button type="button" class="attr-card ${can ? 'can' : 'locked'}" data-alloc="attr" data-id="${id}" style="--acc:${m.accent}">
      <span class="attr-ico" aria-hidden="true">${attrIco(id)}</span>
      <span class="attr-lab">${m.label}</span>
      <span class="attr-sub">${m.sub}</span>
      <span class="attr-lv">${val}</span>
      <span class="attr-plus" aria-hidden="true">+</span>
    </button>`;
  }

  html += `</div>
  <div class="section-lab">Skills</div>
  <div class="skill-grid">`;

  for (const sk of Object.values(SKILLS)) {
    const lv = skillLv(s, sk.id);
    const ok = canLearn(s, sk.id);
    const maxed = lv >= sk.max;
    const owned = lv > 0;
    const pct = Math.round((lv / sk.max) * 100);
    const acc = sk.accent || '#fc1243';
    let state = 'locked';
    if (maxed) state = 'maxed';
    else if (ok) state = 'can';
    else if (owned) state = 'owned';

    let cta = 'Need req';
    if (maxed) cta = 'MAX';
    else if (ok) cta = '1 SP';
    else if (h.sp < 1) cta = '0 SP';
    else cta = 'Locked';

    html += `
    <button type="button" class="skill-card ${state} ${sk.type === 'mask' ? 'is-mask' : ''}"
      data-alloc="skill" data-id="${sk.id}" style="--acc:${acc}" ${maxed ? 'disabled' : ''}>
      <div class="sk-ico" aria-hidden="true">${skillIco(sk.id)}</div>
      <div class="sk-main">
        <div class="sk-top">
          <span class="sk-name">${sk.name}</span>
          <span class="sk-type t-${sk.type}">${typeTag(sk.type)}</span>
        </div>
        <div class="sk-desc">${sk.desc}</div>
        <div class="sk-reqs">${reqBadges(sk.req, h)}</div>
        <div class="sk-bar"><i style="width:${pct}%"></i></div>
      </div>
      <div class="sk-side">
        <span class="sk-lv">${lv}<small>/${sk.max}</small></span>
        <span class="sk-cta">${cta}</span>
      </div>
    </button>`;
  }
  html += '</div>';
  root.innerHTML = html;
}

function renderMeta(s) {
  const root = document.getElementById('meta-body');
  if (!root) return;
  const rep = s.authority.amount;
  let html = `
  <div class="sp-bank rep-bank">
    <div class="sp-bank-left">
      <span class="sp-bank-label">Reputation</span>
      <strong class="sp-bank-val gold">${formatNum(rep)}</strong>
      <span class="sp-bank-hint">Permanent · never reset on End Season</span>
    </div>
  </div>
  <div class="skill-grid">`;
  for (const u of Object.values(META)) {
    const lv = metaLv(s, u.id);
    const cost = metaCost(u.base, u.growth, lv);
    const ok = rep >= cost;
    html += `
    <button type="button" class="skill-card ${ok ? 'can' : 'locked'}" data-meta="${u.id}" style="--acc:#e6b84d">
      <div class="sk-ico gold" aria-hidden="true">${metaIco(u.id)}</div>
      <div class="sk-main">
        <div class="sk-top">
          <span class="sk-name">${u.name}</span>
          <span class="sk-type t-passive">BOOST</span>
        </div>
        <div class="sk-desc">${u.desc}</div>
        <div class="sk-bar"><i style="width:${Math.min(100, lv * 12)}%"></i></div>
      </div>
      <div class="sk-side">
        <span class="sk-lv">Lv ${lv}</span>
        <span class="sk-cta">${formatNum(cost)} Rep</span>
      </div>
    </button>`;
  }
  html += '</div>';
  root.innerHTML = html;
}

export function renderHUD(s) {
  const $ = (id) => document.getElementById(id);
  const st = combatStats(s);
  const h = s.run.hero;

  set($('v-bytes'), formatNum(s.run.bytes));
  set($('v-patches'), formatNum(s.run.patches));
  set($('v-auth'), formatNum(s.authority.amount));
  set($('v-dps'), formatNum(Math.max(0, Math.round(s.stats.dps))));
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
  set($('v-live'), `×${s.meta.live.toFixed(2)}`);
  set($('v-level'), String(h.level));
  set($('v-sp'), String(h.sp));
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
    spBtn.classList.toggle('is-active', sprinting);
    spBtn.classList.toggle('is-empty', h.energy < 1 && h.mask !== 'editor_pick');
    const sub = spBtn.querySelector('.btn-sprint-sub');
    if (sub) {
      if (sprinting) set(sub, `×${(st.timeScale || 1.85).toFixed(2)} LIVE`);
      else if (h.energy < 1 && h.mask !== 'editor_pick') set(sub, 'Need energy');
      else set(sub, 'Hold · ×1.85 speed');
    }
  }
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
    const def = SKILLS[sk];
    if (def?.short && el.textContent !== def.short) el.textContent = def.short;
  }

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

  if (s.ui.panel && (s.ui.panelDirty || s.ui.panel !== lastPanel)) {
    if (s.ui.panel === 'skills') renderSkills(s);
    if (s.ui.panel === 'meta') renderMeta(s);
    if (s.ui.panel === 'ship') fillShip(s);
    lastPanel = s.ui.panel;
    s.ui.panelDirty = false;
  }
  if (!s.ui.panel) lastPanel = null;
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
