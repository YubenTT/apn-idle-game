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
} from './game.js';
import { formatAffix } from './loot.js';
import {
  DAILY_DEFS,
  WEEKLY_DEFS,
  hubProgress,
  hubDone,
  hubClaimed,
  seasonLevel,
  SEASON_MILESTONES,
  hubFeed,
} from './hub.js';
import { skillIco, attrIco, metaIco, hubIco } from './icons.js';
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

  $('panel-gear')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-equip]');
    if (!t) return;
    if (equipGear(s, t.dataset.equip)) {
      save(s);
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
  if (root) root.hidden = false;
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
  const gain = Math.floor(notes * economyMult(s));
  const liveNext = liveGain(s.authority.shippedThisSeason);
  const seasonReady = s.ui.seasonDone || s.run.zone >= SEASON.zones;
  const nextZ = SEASON.zones * (Math.floor(s.run.zone / SEASON.zones) + 1);
  const eco = economyMult(s);
  el.className = 'ship-stats';
  el.innerHTML = [
    row('Notes ready', formatNum(notes), notes > 0 ? 'hi' : ''),
    row('Ship for', `+${formatNum(gain)} Rep`, gain > 0 ? 'hi' : ''),
    row('Economy mult', `×${eco.toFixed(2)} (Live×Pro×Boost)`, 'ok'),
    row('Shipped this season', `${formatNum(s.authority.shippedThisSeason)} Rep`, ''),
    seasonReady
      ? row('End Season', `+${liveNext.toFixed(3)} Live · gear+boosts+pro stay`, 'hi')
      : row('Next checkpoint', `Zone ${nextZ}`, ''),
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
  else if (ok) cta = `+${cost} SP`;
  else if (h.sp < cost) cta = `${cost} SP`;
  else cta = 'Locked';

  const reqs = Object.keys(sk.req || {}).length ? reqBadges(sk.req, h) : '';

  return `
  <button type="button" class="skill-card ${state}"
    data-alloc="skill" data-id="${sk.id}" ${maxed ? 'disabled' : ''}>
    <div class="sk-ico" aria-hidden="true">${skillIco(sk.id)}</div>
    <div class="sk-main">
      <div class="sk-top">
        <span class="sk-name">${sk.name}</span>
        <span class="sk-type t-${sk.type}">${typeTag(sk.type)}</span>
      </div>
      <div class="sk-desc">${sk.desc}</div>
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
  const totalSkillRanks = Object.values(h.skills || {}).reduce((a, b) => a + b, 0);

  let html = `
  <div class="sp-bank ${hasSp ? 'has-sp' : ''}">
    <div class="sp-bank-left">
      <span class="sp-bank-label">SP</span>
      <strong class="sp-bank-val">${h.sp}</strong>
      <span class="sp-bank-hint">${
        hasSp
          ? 'Attrs 1 SP · Skills cost more every 5 ranks'
          : 'Rank up for skill points'
      } · ${totalSkillRanks} ranks trained</span>
    </div>
  </div>

  <div class="section-lab">Attributes · 1 SP</div>
  <div class="attr-row">`;

  for (const id of ['scan', 'verify', 'amplify']) {
    const m = ATTR_META[id];
    const val = h[id] || 0;
    html += `
    <button type="button" class="attr-card ${hasSp ? 'can' : 'locked'}" data-alloc="attr" data-id="${id}" title="${m.sub}">
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

  let html = `
  <div class="sp-bank rep-bank">
    <div class="sp-bank-left">
      <span class="sp-bank-label">Coins</span>
      <strong class="sp-bank-val gold">${formatNum(p.coins)}</strong>
      <span class="sp-bank-hint">×${eco.toFixed(2)}${boostOn ? ` · 2× ${leftM}m` : ''}${
        auto ? ' · Auto-Sprint' : ''
      }</span>
    </div>
  </div>
  <p class="lead">Optional QoL. Free path stays complete — never paywall zones or gear.</p>
  <div class="premium-card ${p.pro ? 'owned' : ''}">
    <div class="premium-card-top">
      <span class="premium-ico">${hubIco('pro')}</span>
      <strong>APN Pro</strong>
      <span class="premium-tag">${p.pro ? 'OWNED' : 'ONE-TIME'}</span>
    </div>
    <ul class="premium-list">
      ${PREMIUM.pro.benefits.map((b) => `<li>${b}</li>`).join('')}
    </ul>
    <button type="button" class="btn-primary" data-premium="pro" ${p.pro ? 'disabled' : ''}>
      <span class="btn-primary-title">${p.pro ? 'Pro Active' : 'Unlock APN Pro'}</span>
      <span class="btn-primary-sub">${p.pro ? `×${PREMIUM.pro.mult} + Auto-Sprint` : 'Demo IAP'}</span>
    </button>
  </div>
  <div class="premium-card ${auto ? 'owned' : ''}">
    <div class="premium-card-top">
      <span class="premium-ico">${hubIco('auto_sprint')}</span>
      <strong>Auto-Sprint</strong>
      <span class="premium-tag">${auto ? 'ON' : `${PREMIUM.auto_sprint.coinCost} coins`}</span>
    </div>
    <p class="fine" style="margin:6px 0 10px">${PREMIUM.auto_sprint.desc}</p>
    <button type="button" class="btn-ghost" data-premium="auto" style="margin-top:0" ${auto ? 'disabled' : ''}>
      ${auto ? 'Active' : 'Unlock Auto-Sprint'}
    </button>
  </div>
  <div class="premium-card">
    <div class="premium-card-top">
      <span class="premium-ico">${hubIco('boost')}</span>
      <strong>2× Boost</strong>
      <span class="premium-tag">${PREMIUM.boost_2x.coinCost} coins</span>
    </div>
    <p class="fine" style="margin:6px 0 10px">${PREMIUM.boost_2x.desc}</p>
    <button type="button" class="btn-ghost" data-premium="boost" style="margin-top:0">
      ${boostOn ? `Extend 2× (+${PREMIUM.boost_2x.minutes}m)` : `Activate 2× · ${PREMIUM.boost_2x.minutes}m`}
    </button>
  </div>
  <div class="premium-card">
    <div class="premium-card-top">
      <span class="premium-ico">${hubIco('warp')}</span>
      <strong>Time Warp +1h</strong>
      <span class="premium-tag">${PREMIUM.time_warp.coinCost} coins</span>
    </div>
    <p class="fine" style="margin:6px 0 10px">${PREMIUM.time_warp.desc}</p>
    <button type="button" class="btn-ghost" data-premium="warp" style="margin-top:0">Warp +1 hour</button>
  </div>
  <div class="section-lab">Coin packs · demo IAP</div>
  <div class="premium-packs">`;
  for (const pack of PREMIUM.packs) {
    html += `
    <button type="button" class="gear-item" data-premium="${pack.id}">
      <div class="sk-ico gold" aria-hidden="true">${hubIco('coin')}</div>
      <div>
        <div class="gi-name">+${pack.coins} coins</div>
        <div class="gi-meta">${pack.priceLabel}${pack.tag ? ` · ${pack.tag}` : ''}</div>
      </div>
      <span class="gi-cta">Get</span>
    </button>`;
  }
  html += `</div>
  <p class="fine">Free coins: boss +${PREMIUM.coinsPerBoss} · ship +${PREMIUM.coinsPerShip} · season +${PREMIUM.coinsPerSeason} · hub quests</p>`;
  root.innerHTML = html;
}

function renderMeta(s) {
  const root = document.getElementById('meta-body');
  if (!root) return;
  const rep = s.authority.amount;
  let html = `
  <div class="sp-bank rep-bank">
    <div class="sp-bank-left">
      <span class="sp-bank-label">Rep</span>
      <strong class="sp-bank-val gold">${formatNum(rep)}</strong>
      <span class="sp-bank-hint">Permanent · never resets</span>
    </div>
  </div>
  <div class="section-lab">Permanent boosts</div>
  <div class="skill-grid">`;
  for (const u of Object.values(META)) {
    const lv = metaLv(s, u.id);
    const cost = metaCost(u.base, u.growth, lv);
    const ok = rep >= cost;
    const barPct = Math.min(100, lv * 8);
    html += `
    <button type="button" class="skill-card ${ok ? 'can' : 'locked'}" data-meta="${u.id}">
      <div class="sk-ico gold" aria-hidden="true">${metaIco(u.id)}</div>
      <div class="sk-main">
        <div class="sk-top">
          <span class="sk-name">${u.name}</span>
        </div>
        <div class="sk-desc">${u.desc}</div>
        <div class="sk-bar"><i style="width:${barPct}%"></i></div>
      </div>
      <div class="sk-side">
        <span class="sk-lv">Lv ${lv}</span>
        <span class="sk-cta">${formatNum(cost)} rep</span>
      </div>
    </button>`;
  }
  html += '</div>';
  root.innerHTML = html;
}

function questRow(s, def, period) {
  ensureHub(s);
  const hub = s.meta.hub;
  const prog = hubProgress(hub, def, period);
  const done = hubDone(hub, def, period);
  const claimed = hubClaimed(hub, def, period);
  const pct = Math.round((prog / def.target) * 100);
  const rewardBits = Object.entries(def.reward)
    .map(([k, v]) => `+${v} ${k === 'authority' ? 'rep' : k}`)
    .join(' · ');
  let cta = `${prog}/${def.target}`;
  let cls = 'quest-row';
  if (claimed) {
    cta = 'Done';
    cls += ' claimed';
  } else if (done) {
    cta = 'Claim';
    cls += ' ready';
  }
  return `
  <div class="${cls}">
    <div class="quest-ico" aria-hidden="true">${hubIco(period === 'daily' ? 'daily' : 'weekly')}</div>
    <div class="quest-main">
      <div class="quest-name">${def.label}</div>
      <div class="quest-desc">${def.desc} · ${rewardBits}</div>
      <div class="sk-bar"><i style="width:${pct}%"></i></div>
    </div>
    ${
      claimed
        ? `<span class="quest-cta muted">✓</span>`
        : done
          ? `<button type="button" class="quest-cta" data-claim="${period}:${def.id}">Claim</button>`
          : `<span class="quest-cta muted">${prog}/${def.target}</span>`
    }
  </div>`;
}

function renderHub(s) {
  const root = document.getElementById('hub-body');
  if (!root) return;
  ensureHub(s);
  const hub = s.meta.hub;
  const season = seasonLevel(hub.seasonXp || 0);
  const gear = s.meta.gear || {};
  const feed = hubFeed(4);

  let html = `
  <div class="hub-hero">
    <div class="hub-hero-copy">
      <span class="hub-kicker">LIVE EVENT</span>
      <strong>Balance Protocol</strong>
      <p>Clear noise. Ship notes. Claim daily rewards.</p>
    </div>
    <div class="hub-hero-meta">
      <span>Z${s.run.zone + 1}</span>
      <span>×${economyMult(s).toFixed(2)}</span>
    </div>
  </div>

  <div class="hub-quick">
    <button type="button" class="hub-chip" data-go="gear">Gear ${gear.weapon ? '●' : '○'}</button>
    <button type="button" class="hub-chip" data-go="meta">Boosts</button>
    <button type="button" class="hub-chip" data-go="ship">Ship</button>
    <button type="button" class="hub-chip" data-go="settings">Premium</button>
  </div>

  <div class="section-lab">Daily objectives</div>
  <div class="quest-list">
    ${DAILY_DEFS.map((d) => questRow(s, d, 'daily')).join('')}
  </div>

  <div class="section-lab">Weekly objectives</div>
  <div class="quest-list">
    ${WEEKLY_DEFS.map((d) => questRow(s, d, 'weekly')).join('')}
  </div>

  <div class="section-lab">Season progress</div>
  <div class="season-card">
    <div class="season-top">
      <span>Patch Season</span>
      <strong>Lv ${season.level}</strong>
    </div>
    <div class="sk-bar season-bar"><i style="width:${Math.round((season.into / season.need) * 100)}%"></i></div>
    <div class="season-sub">${formatNum(season.into)} / ${formatNum(season.need)} XP</div>
    <div class="season-milestones">`;
  for (const m of SEASON_MILESTONES) {
    const unlocked = season.level >= m.lv;
    const claimed = !!hub.seasonClaimed?.[m.lv];
    html += `
    <button type="button" class="season-mil ${unlocked ? 'on' : ''} ${claimed ? 'claimed' : ''}"
      data-season-lv="${m.lv}" ${!unlocked || claimed ? 'disabled' : ''}>
      <span class="sm-lv">${m.lv}</span>
      <span class="sm-lab">${claimed ? '✓' : unlocked ? 'Claim' : '···'}</span>
    </button>`;
  }
  html += `</div></div>

  <div class="section-lab">Patch feed</div>
  <div class="hub-feed">`;
  for (const it of feed) {
    html += `
    <div class="feed-row">
      <img class="feed-ico" src="./assets/icons/${it.icon}.svg" alt="" width="28" height="28" />
      <div class="feed-main">
        <div class="feed-title">${it.name} · <span class="kind ${it.kind}">${it.kind}</span></div>
        <div class="feed-text">${it.text}</div>
      </div>
      <span class="feed-ago">${it.ago}</span>
    </div>`;
  }
  html += `</div>`;
  root.innerHTML = html;
}

function pieceBlock(label, item) {
  if (!item) {
    return `<div class="gear-slot empty">
      <div class="gear-slot-lab">${label}</div>
      <div class="gear-slot-name" style="color:#5c6878">Empty</div>
      <div class="gear-slot-aff">Bosses drop gear</div>
    </div>`;
  }
  const col = rarityColor(item.rarity);
  const aff = (item.affixes || []).map((a) => formatAffix(a)).join(' · ');
  return `<div class="gear-slot">
    <div class="gear-slot-lab">${label}</div>
    <div class="gear-slot-r" style="color:${col}">${rarityLabel(item.rarity)} · i${item.ilvl}</div>
    <div class="gear-slot-name" style="color:${col}">${item.name}</div>
    <div class="gear-slot-aff">${aff}</div>
  </div>`;
}

function renderGear(s) {
  const root = document.getElementById('gear-body');
  if (!root) return;
  const g = s.meta.gear || { weapon: null, armor: null, bag: [] };
  let html = `
  <p class="lead">Boss drops · <strong>permanent</strong> across seasons. Better score auto-equips.</p>
  <div class="gear-slots">
    ${pieceBlock('Weapon', g.weapon)}
    ${pieceBlock('Armor', g.armor)}
  </div>
  <div class="section-lab">Bag · tap to equip</div>
  <div class="gear-bag">`;
  const bag = g.bag || [];
  if (!bag.length) {
    html += `<p class="fine">No spare gear yet. Clear Version Gates.</p>`;
  } else {
    for (const it of bag.slice(0, 16)) {
      const col = rarityColor(it.rarity);
      const aff = (it.affixes || []).map((a) => formatAffix(a)).slice(0, 2).join(' · ');
      html += `
      <button type="button" class="gear-item" data-equip="${it.id}">
        <div>
          <div class="gi-name" style="color:${col}">${it.name}</div>
          <div class="gi-meta">${rarityLabel(it.rarity)} ${it.slot} · i${it.ilvl}${aff ? ` · ${aff}` : ''}</div>
        </div>
        <span class="gi-cta">Equip</span>
      </button>`;
    }
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

  // Compact equipped gear in header
  const gp = $('v-gear-pill');
  if (gp) {
    const gear = s.meta.gear || {};
    const bits = [];
    if (gear.weapon) bits.push(gear.weapon.name);
    if (gear.armor) bits.push(gear.armor.name);
    if (bits.length) {
      gp.hidden = false;
      set(gp, bits.join(' · '));
      gp.style.color = rarityColor(gear.weapon?.rarity || gear.armor?.rarity || 'white');
    } else {
      gp.hidden = true;
      set(gp, '');
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
    if (s.ui.panel === 'gear') renderGear(s);
    if (s.ui.panel === 'hub') renderHub(s);
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
