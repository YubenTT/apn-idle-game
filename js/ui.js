/** APN Idle UI — sheet + compact HUD */

import {
  formatNum,
  scannerCost,
  scannerDamage,
  xpToNext,
  liveGain,
  clamp,
  killsNeeded,
  nextGoLiveBoundary,
} from './formulas.js?v=golive-pr5';
import {
  META,
  SKILLS,
  SKILL_TREES,
  TIPS,
  FEED_COPY,
  skillSpCost,
} from './content.js?v=golive-pr5';
import { packForRoute, packZoneDisplay } from './route.js?v=golive-pr5';
import { GAME_PACKS } from './generated/game-packs.js?v=golive-pr5';
import {
  combatStats,
  allocSkill,
  canLearn,
  skillLv,
  buyScanner,
  buyMeta,
  goLive,
  canGoLive,
  GO_LIVE_CONTRACT,
  castHotfix,
  castPriorityTag,
  branchMastery,
  buildMastery,
  metaUpgradePreview,
  recommendedMetaId,
  isSprinting,
  equipGear,
  unequipGear,
  sellGear,
  rarityColor,
  rarityLabel,
  economyMult,
  claimHubObjective,
  claimSeasonMilestone,
  ensureHub,
  normalizeGear,
  HOTFIX_FOCUS_COST,
  PRIORITY_FOCUS_COST,
} from './game.js?v=golive-pr5';
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
} from './loot.js?v=golive-pr5';
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
} from './hub.js?v=golive-pr5';
import { skillIco, metaIco, hubIco, gearIcon } from './icons.js?v=golive-pr5';
import { drawHeroV2 } from './hero-v2.js?v=golive-pr5';
import { save, clear } from './save.js?v=golive-pr5';
import { sfx, unlockAudio, setMuted, setReducedMotion } from './sfx.js?v=golive-pr5';

const PANEL_TITLES = {
  skills: 'Build',
  ship: 'Go Live',
  gear: 'Gear',
  hub: 'Route',
  meta: 'Boosts',
  settings: 'Menu',
};

let lastPanel = null;
const QA_METRICS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa_metrics');

function applyMotionPreference(value) {
  setReducedMotion(value);
  const osReduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('reduce-motion', !!value || osReduced);
}

/** In-app toggle OR OS setting — every Wave-2 effect gates on this. */
function motionReduced(s) {
  const osReduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return !!s.settings.reducedMotion || osReduced;
}

/* —— Animated resource counters (V2 Wave 2) ————————————————————————
   rAF count-up tween on the two run-resource values. The displayed number
   trails the domain value by a short ease-out glide; reduced-motion and the
   first paint write through instantly. Cheap: one shared loop, text writes
   only when the formatted string actually changes. */
const counters = new Map(); // elementId → { shown, from, to, start }
let counterRaf = 0;
const COUNTER_MS = 520;

function tweenCounter(s, id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = counters.get(id);
  if (!c || motionReduced(s)) {
    counters.set(id, { shown: target, from: target, to: target, start: 0 });
    set(el, formatNum(target));
    return;
  }
  if (target === c.to) return;
  c.from = c.shown;
  c.to = target;
  c.start = performance.now();
  if (!counterRaf) counterRaf = requestAnimationFrame(tickCounters);
}

function tickCounters(now) {
  counterRaf = 0;
  let active = false;
  for (const [id, c] of counters) {
    if (c.shown === c.to) continue;
    const u = c.start ? Math.min(1, (now - c.start) / COUNTER_MS) : 1;
    const eased = 1 - (1 - u) ** 3; // ease-out cubic — settles fast, no bounce
    c.shown = c.from + (c.to - c.from) * eased;
    if (u >= 1) c.shown = c.to;
    else active = true;
    const el = document.getElementById(id);
    if (el) set(el, formatNum(Math.round(c.shown)));
  }
  if (active) counterRaf = requestAnimationFrame(tickCounters);
}

/* —— Bottom-nav sliding active pill (V2 Wave 2) ———————————————————— */
const NAV_PANELS = ['skills', 'ship', 'hub', 'meta', 'settings'];
function syncNavPill(panel) {
  const nav = document.querySelector('.hud-nav');
  if (!nav) return;
  const i = NAV_PANELS.indexOf(panel);
  nav.classList.toggle('has-active', i >= 0);
  if (i >= 0) nav.style.setProperty('--nav-i', String(i));
}

/* —— Toast banner (V2 Wave 2) ——————————————————————————————————————
   One spring slide-down banner with an icon slot; tone comes from the domain
   event (s.ui.toastTone), copy stays the single source in game.js/content.js. */
const TOAST_ICONS = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  rank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/></svg>',
  zone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/></svg>',
  win: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/></svg>',
  live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
};
let toastOutTimer = 0;

function updateToastBanner(s) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (s.ui.toast) {
    if (toastOutTimer) {
      clearTimeout(toastOutTimer);
      toastOutTimer = 0;
    }
    const tone = TOAST_ICONS[s.ui.toastTone] ? s.ui.toastTone : 'info';
    if (toast.dataset.msg !== s.ui.toast || toast.dataset.tone !== tone) {
      toast.dataset.msg = s.ui.toast;
      toast.dataset.tone = tone;
      toast.className = `toast-banner t-${tone}`;
      toast.innerHTML = '';
      const ico = document.createElement('span');
      ico.className = 'toast-ico';
      ico.setAttribute('aria-hidden', 'true');
      ico.innerHTML = TOAST_ICONS[tone];
      const msg = document.createElement('span');
      msg.className = 'toast-msg';
      msg.textContent = s.ui.toast;
      toast.append(ico, msg);
      toast.hidden = false;
      toast.classList.remove('in');
      void toast.offsetWidth; // restart the entrance spring
      toast.classList.add('in');
    }
    toast.classList.remove('out');
    toast.hidden = false;
  } else if (!toast.hidden && !toast.classList.contains('out')) {
    toast.classList.remove('in');
    toast.classList.add('out');
    toastOutTimer = setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove('out');
      toast.dataset.msg = '';
      toastOutTimer = 0;
    }, 240);
  }
}

/* —— Gear niche live Host (V2 Wave 2) ——————————————————————————————
   The loadout niche renders the same procedural Host V2 as the run stage —
   one brand character everywhere. ~10fps idle breathe while the Gear sheet is
   open; a single static frame under reduced motion. */
let gearHeroRaf = 0;
let gearHeroLast = 0;

function unmountGearHero() {
  if (gearHeroRaf) cancelAnimationFrame(gearHeroRaf);
  gearHeroRaf = 0;
}

function mountGearHero(s) {
  const canvas = document.getElementById('gear-host-live');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const cssSize = Math.max(56, canvas.clientWidth || 88);
  const px = Math.round(cssSize * dpr);
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  const reduced = motionReduced(s);
  const drawFrame = (now) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    drawHeroV2(ctx, cssSize / 2, cssSize - 5, {
      height: cssSize * 0.8,
      time: now / 1000,
      pose: 'idle',
      energy: 100,
      reducedMotion: reduced,
    });
    ctx.restore();
  };
  unmountGearHero();
  if (reduced) {
    drawFrame(1200); // one settled frame, no loop
    return;
  }
  const loop = (now) => {
    if (now - gearHeroLast >= 100) {
      gearHeroLast = now;
      drawFrame(now);
    }
    gearHeroRaf = requestAnimationFrame(loop);
  };
  gearHeroRaf = requestAnimationFrame(loop);
}

export function bindUI(s) {
  const $ = (id) => document.getElementById(id);
  setMuted(s.settings.sfx === false);
  applyMotionPreference(s.settings.reducedMotion);
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
    });
  });

  $('sheet-close')?.addEventListener('click', () => closeSheet(s));
  $('sheet-backdrop')?.addEventListener('click', () => closeSheet(s));

  $('btn-scanner')?.addEventListener('click', () => {
    unlockAudio();
    if (buyScanner(s)) {
      // First purchase retires the coach hint forever (persisted in the tips map).
      if (!s.ui.tips.coachUpgrade) s.ui.tips.coachUpgrade = true;
      save(s);
    } else {
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
    castPriorityTag(s);
  });
  // Single Go Live sheet — one CTA arms an inline confirm; confirm banks Notes and
  // prestiges atomically via goLive(), then swaps the sheet to the receipt. Delegated so
  // the dynamically-rendered controls (arm / confirm / cancel / dismiss) stay keyboard-operable.
  $('panel-ship')?.addEventListener('click', (e) => {
    const control = e.target.closest('[data-golive]');
    if (!control) return;
    unlockAudio();
    const action = control.dataset.golive;
    if (action === 'arm') {
      if (canGoLive(s)) {
        s.ui.goLiveArmed = true;
        fillGoLive(s);
        focusGoLive('[data-golive="confirm"]');
      } else if (s.settings.sfx !== false) sfx('error');
    } else if (action === 'cancel') {
      s.ui.goLiveArmed = false;
      fillGoLive(s);
      focusGoLive('[data-golive="arm"]');
    } else if (action === 'confirm') {
      const receipt = goLive(s);
      if (receipt) {
        s.ui.goLiveArmed = false;
        s.ui.goLiveReceipt = receipt;
        save(s);
        fillGoLive(s);
        focusGoLive('[data-golive="dismiss"]');
      } else if (s.settings.sfx !== false) sfx('error');
    } else if (action === 'dismiss') {
      s.ui.goLiveReceipt = null;
      fillGoLive(s);
      focusGoLive('[data-golive="arm"]');
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
    applyMotionPreference(e.target.checked);
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
    if (e.key !== 'Escape' || !s.ui.panel) return;
    // Esc backs an armed Go Live out of confirm before it closes the whole sheet.
    if (s.ui.panel === 'ship' && s.ui.goLiveArmed) {
      s.ui.goLiveArmed = false;
      fillGoLive(s);
      focusGoLive('[data-golive="arm"]');
      return;
    }
    closeSheet(s);
  });

  $('panel-skills')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-alloc]');
    if (!t) return;
    const ok = t.dataset.alloc === 'skill' && allocSkill(s, t.dataset.id);
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
  const openedAt = QA_METRICS ? performance.now() : 0;
  s.ui.panel = panel;
  s.ui.panelDirty = true;
  const root = document.getElementById('sheet-root');
  if (root) {
    root.hidden = false;
    root.classList.add('is-open');
    root.dataset.panel = panel;
    // Staggered card entrance — one shot per genuine open/switch, so dirty
    // re-renders inside the same sheet never replay it.
    if (lastPanel !== panel) {
      root.classList.add('sheet-enter');
      clearTimeout(root._enterTimer);
      root._enterTimer = setTimeout(() => root.classList.remove('sheet-enter'), 700);
    }
  }
  document.getElementById('app')?.classList.add('sheet-open');
  syncNavPill(panel);
  document.querySelectorAll('.hud-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panel);
    b.setAttribute('aria-expanded', String(b.dataset.panel === panel));
  });
  const gearButton = document.getElementById('btn-bag');
  gearButton?.classList.toggle('active', panel === 'gear');
  gearButton?.setAttribute('aria-expanded', String(panel === 'gear'));
  const title = document.getElementById('sheet-title');
  if (title) title.textContent = PANEL_TITLES[panel] || panel;
  ['skills', 'meta', 'ship', 'gear', 'hub', 'settings'].forEach((p) => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.hidden = p !== panel;
  });
  if (panel === 'skills') renderSkills(s);
  if (panel === 'meta') renderMeta(s);
  if (panel === 'ship') fillGoLive(s);
  if (panel === 'gear') renderGear(s);
  else unmountGearHero();
  if (panel === 'hub') renderHub(s);
  if (panel === 'settings') {
    const sx = document.getElementById('chk-sfx');
    if (sx) sx.checked = s.settings.sfx !== false;
    const mo = document.getElementById('chk-motion');
    if (mo) mo.checked = !!s.settings.reducedMotion;
  }
  // Leaving the Go Live sheet drops any armed confirm and stale receipt.
  if (panel !== 'ship') {
    s.ui.goLiveArmed = false;
    s.ui.goLiveReceipt = null;
  }
  if (lastPanel !== panel && s.settings.sfx !== false) sfx('sheet');
  lastPanel = panel;
  s.ui.panelDirty = false;
  if (QA_METRICS) document.documentElement.dataset.qaSheetMs = (performance.now() - openedAt).toFixed(1);
}

function closeSheet(s) {
  s.ui.panel = null;
  s.ui.goLiveArmed = false;
  s.ui.goLiveReceipt = null;
  lastPanel = null;
  unmountGearHero();
  const root = document.getElementById('sheet-root');
  if (root) {
    root.hidden = true;
    root.classList.remove('is-open');
    root.classList.remove('sheet-enter');
    clearTimeout(root._enterTimer);
    delete root.dataset.panel;
  }
  document.getElementById('app')?.classList.remove('sheet-open');
  syncNavPill(null);
  document.querySelectorAll('.hud-nav button').forEach((b) => {
    b.classList.remove('active');
    b.setAttribute('aria-expanded', 'false');
  });
  const gearButton = document.getElementById('btn-bag');
  gearButton?.classList.remove('active');
  gearButton?.setAttribute('aria-expanded', 'false');
  const resetConfirm = document.getElementById('reset-confirm');
  if (resetConfirm) resetConfirm.hidden = true;
}

/** Move keyboard focus onto a freshly-rendered Go Live control (confirm / cancel / continue). */
function focusGoLive(selector) {
  requestAnimationFrame(() => document.getElementById('ship-info')?.querySelector(selector)?.focus());
}

/**
 * The single Go Live sheet (ADR-0008): one CTA banks unshipped Notes → Rep and grows the
 * Live Mult in one atomic checkpoint, keeping the Route. Renders one of three states into
 * #ship-info — receipt (post-Go-Live impact), inline confirm, or the preview (impact +
 * kept/reset contract + safety). Focus is moved by the caller, never here, so the HUD's
 * dirty re-render can repaint without stealing focus.
 */
function fillGoLive(s) {
  const el = document.getElementById('ship-info');
  if (!el) return;
  el.className = 'ship-stats ship-preview';

  // Receipt — the impact summary after a Go Live; one Continue returns to the Route.
  const receipt = s.ui.goLiveReceipt;
  if (receipt) {
    const prevLive = Math.max(1, receipt.liveMult - receipt.liveGain);
    const nextDisplay = nextGoLiveBoundary(receipt.boundaryZone) + 1;
    el.innerHTML = `
      <div class="ship-gain-card ready">
        <span>You're live · Go Live #${receipt.goLiveCount}</span>
        <strong>×${receipt.liveMult.toFixed(2)} Live Mult</strong>
        <small>Route kept · fresh run underway</small>
      </div>
      <div class="ship-formula" aria-label="Go Live receipt">
        ${row('Notes banked', receipt.repGained > 0 ? `${formatNum(receipt.notesBanked)} → +${formatNum(receipt.repGained)} Rep` : 'None this cycle', receipt.repGained > 0 ? 'hi' : '', 'notes')}
        ${row('Live Mult', `×${prevLive.toFixed(2)} → ×${receipt.liveMult.toFixed(2)}`, 'hi')}
        ${row('Cycle gain', `+${receipt.liveGain.toFixed(3)} Live`)}
        ${row('Rep total', formatNum(receipt.repTotal))}
        ${row('Next Go Live', `Zone ${nextDisplay}`)}
      </div>
      <button type="button" class="btn-primary" data-golive="dismiss">
        <span class="btn-primary-title">Continue</span>
        <span class="btn-primary-sub">Back to the Route</span>
      </button>`;
    return;
  }

  const notes = Math.floor(s.run.patches);
  const rep = notes >= 1 ? Math.floor(notes * economyMult(s)) : 0; // SHIP_RATE is 1 → matches goLive()
  const notesLine = notes > 0 ? `${formatNum(notes)} → +${formatNum(rep)} Rep` : 'Collect Notes first';
  // goLive() banks the unshipped Notes before growing the Mult, so the preview must count
  // the Rep those Notes will add to the cycle — otherwise it under-promises the gain.
  const liveNext = liveGain(s.authority.shippedThisSeason + rep);
  const ready = canGoLive(s);
  if (s.ui.goLiveArmed && !ready) s.ui.goLiveArmed = false;
  const nextDisplay = nextGoLiveBoundary(s.route.zone) + 1;
  const keptItems = GO_LIVE_CONTRACT.keeps.map((item) => `<li>${item}</li>`).join('');
  const resetItems = GO_LIVE_CONTRACT.resets.map((item) => `<li>${item}</li>`).join('');

  const impact = `
    <div class="ship-gain-card${ready ? ' ready' : ''}">
      <span>Go Live impact</span>
      <strong>+${liveNext.toFixed(3)} Live Mult</strong>
      <small>${ready ? 'Checkpoint reached — ready now' : `Unlocks at Zone ${nextDisplay}`}</small>
    </div>
    <div class="ship-formula" aria-label="Go Live preview">
      ${row('Notes', notesLine, notes > 0 ? 'hi' : '', 'notes')}
      ${row('Grow Live Mult', `+${liveNext.toFixed(3)} Live`, ready ? 'hi' : '')}
      ${row('Fresh run', 'Scanner · Rank · SP · Skills reset')}
      ${row('Next Go Live', ready ? 'Available now' : `Zone ${nextDisplay}`)}
    </div>
    <div class="season-contract">
      <section><h3>Kept</h3><ul>${keptItems}</ul></section>
      <section><h3>Resets</h3><ul>${resetItems}</ul></section>
    </div>
    <p class="fine golive-safety">Nothing is ever burned — Go Live banks your Notes to Rep first.</p>`;

  // Armed → inline confirm replaces the CTA (keyboard cancel/confirm, no separate dialog).
  if (s.ui.goLiveArmed && ready) {
    el.innerHTML = `${impact}
      <div class="season-confirm" role="group" aria-label="Confirm Go Live">
        <strong>Go Live now?</strong>
        <p>Banks ${formatNum(notes)} Notes to Rep and starts a fresh run. Route, Rep, Gear, and Live Mult stay.</p>
        <div class="season-confirm-actions">
          <button type="button" class="btn-ghost" data-golive="cancel">Not yet</button>
          <button type="button" class="btn-danger" data-golive="confirm">Go Live</button>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `${impact}
    <button type="button" class="btn-primary${ready ? '' : ' is-locked'}" data-golive="arm"${ready ? '' : ' disabled'}>
      <span class="btn-primary-title">Go Live</span>
      <span class="btn-primary-sub">${ready ? `Bank ${formatNum(notes)} Notes · +${liveNext.toFixed(3)} Live` : `Unlocks at Zone ${nextDisplay}`}</span>
    </button>`;
}

function row(k, v, cls = '', tone = '') {
  const classes = ['ship-row'];
  if (cls === 'hi') classes.push('ready');
  if (tone) classes.push(`t-${tone}`);
  return `<div class="${classes.join(' ')}"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`;
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
    <span class="sp-bank-left">
      <span class="sp-bank-label">SP</span>
      <strong class="sp-bank-val">${h.sp}</strong>
      <span class="sp-bank-hint">${hasSp ? 'Choose one branch to strengthen' : 'Earn SP by ranking up'}</span>
    </span>
    <span class="build-mastery-badge">Mastery ${buildMastery(s)}</span>
  </div>`;

  for (const tree of SKILL_TREES) {
    html += `<section class="build-branch" aria-labelledby="build-${tree.mastery}">
      <div class="build-branch-head">
        <span class="build-branch-copy">
          <strong id="build-${tree.mastery}">${tree.label}</strong>
          <small>${tree.promise}</small>
        </span>
        <span class="build-mastery-badge">Mastery ${branchMastery(s, tree.mastery)}</span>
      </div>
      <div class="skill-grid">`;
    for (const sk of Object.values(SKILLS)) {
      if (sk.tree !== tree.id) continue;
      html += skillCard(s, sk);
    }
    html += `</div></section>`;
  }
  root.innerHTML = html;
}

function renderMeta(s) {
  const root = document.getElementById('meta-body');
  if (!root) return;
  const rep = s.authority.amount;
  const recommended = recommendedMetaId(s);
  const categories = ['Ranks', 'Combat', 'Economy'];
  let html = `
  <div class="sp-bank compact rep-bank">
    <span class="sp-bank-label">Rep</span>
    <strong class="sp-bank-val gold">${formatNum(rep)}</strong>
    <span class="sp-bank-hint">Permanent growth · survives Go Live</span>
  </div>
  <div class="boosts-tree">`;
  for (const category of categories) {
    const upgrades = Object.values(META).filter((upgrade) => upgrade.category === category);
    html += `<section class="boost-category"><h3>${category}</h3><div class="boost-list">`;
    for (const u of upgrades) {
      const preview = metaUpgradePreview(s, u.id);
      const isRecommended = recommended === u.id;
      html += `
      <button type="button" class="boost-row ${preview.affordable ? 'can' : 'locked'} ${isRecommended ? 'recommended' : ''}" data-meta="${u.id}"
        aria-label="Raise ${u.name} from ${preview.current} to ${preview.next} for ${preview.cost} Rep">
        <span class="boost-ico" aria-hidden="true">${metaIco(u.id)}</span>
        <span class="boost-copy">
          <span class="boost-name">${u.name}${isRecommended ? `<b>${preview.affordable ? 'Recommended' : 'Next target'}</b>` : ''}</span>
          <span class="boost-desc">${u.desc}</span>
          <span class="boost-value">${preview.valueCue}</span>
        </span>
        <span class="boost-side">
          <span class="boost-level">Lv ${preview.level}</span>
          <span class="boost-delta">${preview.current} → ${preview.next}</span>
          <span class="rep-cost ${preview.affordable ? 'afford' : ''}">${formatNum(preview.cost)} Rep</span>
        </span>
      </button>`;
    }
    html += `</div></section>`;
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
      <canvas class="brand-mascot" id="gear-host-live" width="88" height="88" role="img" aria-label="APN Host"></canvas>
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
    html += `<div class="inv-empty-state"><strong>No gear yet</strong><span>Clear a Version Gate — your first drop lands here.</span></div>`;
  } else if (!bag.length) {
    html += `<div class="inv-empty-state"><strong>Nothing in this view</strong><span>Try a different filter.</span></div>`;
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
  mountGearHero(s);
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
  const packZone = packZoneDisplay(s.route);
  set($('feed-game'), pack?.title || 'Patchline');
  set($('feed-copy'), FEED_COPY[pack?.genre] || 'Update notes live');

  tweenCounter(s, 'v-bytes', Math.floor(s.run.bytes));
  tweenCounter(s, 'v-patches', Math.floor(s.run.patches));
  updateLootDrop(s);
  // resource chip pulse on gain
  const chips = document.querySelectorAll('.hud-res .chip');
  if (chips[0]) chips[0].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.bytes > 0));
  if (chips[1]) chips[1].classList.toggle('pulse', !!(s.ui.chipPulse && s.ui.chipPulse.patches > 0));
  set($('v-zone'), String(s.route.zone + 1));
  set($('v-pack-progress'), `${packZone}/10`);
  // Live Mult is the launch economy multiplier.
  const eco = economyMult(s);
  set($('v-live'), eco.toFixed(2));
  set($('v-level'), String(h.level));
  const livePill = document.querySelector('.stage-stat.live');
  if (livePill) {
    livePill.title = `Live Mult ×${eco.toFixed(2)}`;
    livePill.classList.remove('pro-on');
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

  const echoState = s.route.echoProgressByPack?.[pack?.id];
  const echoFound = Math.max(0, Number(echoState?.found) || 0);
  const echoTotal = Math.max(0, Number(echoState?.total) || 0);
  const echoChip = $('patch-echo-chip');
  if (echoChip) {
    echoChip.hidden = echoTotal === 0;
    set($('v-echo-progress'), `${Math.min(echoFound, echoTotal)}/${echoTotal}`);
  }

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
  bar($('bar-pack'), (((packZone - 1) + s.route.killsInZone / Math.max(1, need)) / 10) * 100);
  bar($('bar-energy'), (h.energy / st.eMax) * 100);
  bar($('bar-focus'), (h.focus / st.fMax) * 100);

  const focusActive = skillLv(s, 'hotfix') > 0 || skillLv(s, 'summary_burst') > 0;
  const focusWrap = $('bar-focus-wrap');
  if (focusWrap) focusWrap.hidden = !focusActive;
  document.querySelector('.hud-bars')?.classList.toggle('has-focus', focusActive);

  // Sprint feedback on energy bar + button
  const sprinting = isSprinting(s);
  const eWrap = $('bar-energy-wrap');
  if (eWrap) {
    eWrap.classList.toggle('is-sprinting', sprinting);
    eWrap.classList.toggle('full', h.energy >= st.eMax - 0.5);
  }
  const fWrap = $('bar-focus-wrap');
  if (fWrap) fWrap.classList.toggle('full', h.focus >= st.fMax - 0.5);
  const eLab = $('v-energy-lab');
  if (eLab) {
    const energyPct = Math.round((h.energy / Math.max(1, st.eMax)) * 100);
    set(eLab, sprinting ? `Active ×${(st.timeScale || 1.85).toFixed(2)}` : `${energyPct}%`);
  }
  const focusLab = $('v-focus-lab');
  if (focusLab) set(focusLab, `${Math.round((h.focus / Math.max(1, st.fMax)) * 100)}%`);
  const spBtn = $('btn-sprint');
  if (spBtn) {
    spBtn.classList.toggle('is-active', sprinting);
    spBtn.classList.toggle('is-empty', h.energy < 1);
    spBtn.disabled = h.energy < 1;
    spBtn.classList.remove('is-auto');
    // Energy-linked held fill: the button drains with the meter.
    spBtn.style.setProperty('--en', `${Math.round((h.energy / Math.max(1, st.eMax)) * 100)}%`);
    const sub = spBtn.querySelector('.btn-sprint-sub');
    if (sub) set(sub, 'Hold · ×1.85');
  }
  // Hub badge when claimable — re-pop only when the count actually changes
  ensureHub(s);
  let hubReady = 0;
  for (const d of DAILY_DEFS) {
    if (hubDone(s.meta.hub, d, 'daily') && !hubClaimed(s.meta.hub, d, 'daily')) hubReady++;
  }
  for (const d of WEEKLY_DEFS) {
    if (hubDone(s.meta.hub, d, 'weekly') && !hubClaimed(s.meta.hub, d, 'weekly')) hubReady++;
  }
  document.querySelectorAll('.nav-btn[data-panel="hub"]').forEach((b) => {
    const next = hubReady > 0 ? String(hubReady) : '';
    if (next && b.dataset.badge !== next) {
      b.classList.remove('has-badge');
      void b.offsetWidth; // restart the badge pop
    }
    b.classList.toggle('has-badge', hubReady > 0);
    b.dataset.badge = next;
  });
  document.getElementById('app')?.classList.toggle('is-sprinting', sprinting);

  if (s.ui.pendingTip && TIPS[s.ui.pendingTip]) {
    s.ui.toast = TIPS[s.ui.pendingTip];
    s.ui.toastT = 3;
    s.ui.toastTone = 'info';
    s.ui.pendingTip = null;
  }
  updateToastBanner(s);

  // First-run coach hint: points at the Upgrade Scanner until the first buy.
  const coach = $('coach-hint');
  if (coach) {
    coach.hidden = !!s.ui.tips.coachUpgrade || h.scanner > 0 || !!s.ui.panel;
  }

  for (const [id, sk, on, castCost] of [
    ['btn-hotfix', 'hotfix', false, HOTFIX_FOCUS_COST],
    ['btn-summary', 'summary_burst', false, PRIORITY_FOCUS_COST],
    ['btn-tracker', 'live_tracker', h.trackerOn, 0],
    ['btn-deep', 'deep_dive', h.deepOn, 0],
  ]) {
    const el = $(id);
    if (!el) continue;
    const lv = skillLv(s, sk);
    const locked = lv < 1;
    el.hidden = false;
    el.disabled = locked;
    el.classList.toggle('locked', locked);
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
    const def = SKILLS[sk];
    // Structured chip: name · cost/state line · rank pips · charge fill.
    const labEl = el.querySelector('.chip-lab');
    const lab = def?.hud || def?.short || el.dataset.fallbackLab || '';
    if (labEl && labEl.textContent !== lab) labEl.textContent = lab;
    const subEl = el.querySelector('.chip-sub');
    if (subEl) {
      let sub = '';
      let subState = '';
      if (locked) sub = 'Build to unlock';
      else if (castCost > 0) {
        sub = `${castCost} Focus`;
        subState = h.focus >= castCost ? 'ready' : 'wait';
      } else sub = on ? 'Active' : 'Toggle';
      if (subEl.textContent !== sub) subEl.textContent = sub;
      subEl.classList.toggle('ready', subState === 'ready');
      subEl.classList.toggle('wait', subState === 'wait');
    }
    // Charge fill: Focus gathered toward the next cast (active skills only).
    const charge = castCost > 0 && !locked ? clamp(h.focus / castCost, 0, 1) : 0;
    el.style.setProperty('--charge', charge.toFixed(3));
    el.classList.toggle('charged', charge >= 1);
    const pips = el.querySelectorAll('.chip-pips i');
    if (pips.length) {
      const filled = locked ? 0 : Math.max(1, Math.ceil((lv / (def?.max || 1)) * pips.length));
      pips.forEach((pip, i) => pip.classList.toggle('fill', i < filled));
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
    if (s.ui.panel === 'ship') fillGoLive(s);
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
