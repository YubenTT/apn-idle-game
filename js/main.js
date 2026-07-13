/** APN Idle bootstrap */

import { C } from './formulas.js';
import { createState, step, collectAlert, simulateOffline, setSprint } from './game.js';
import { sizeCanvas, draw } from './render.js';
import { bindUI, renderHUD } from './ui.js';
import { save, load, apply } from './save.js';
import { TICKER_ITEMS } from './content.js';
import { TITLE_TAGLINES, pick } from './comedy.js';

const canvas = document.getElementById('game');
const s = createState();

const saved = load();
if (saved) {
  const elapsed = apply(s, saved);
  if (elapsed > 5) {
    const summary = simulateOffline(s, elapsed);
    if (summary) s.ui.offline = summary;
  }
  s.ui.toast = 'Welcome back. Feed is live.';
  s.ui.toastT = 2.5;
  document.getElementById('title-screen').hidden = true;
} else {
  s.ui.pendingTip = 'start';
}

let view = sizeCanvas(canvas);
window.addEventListener('resize', () => {
  view = sizeCanvas(canvas);
});

bindUI(s);

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  const p = ev.touches ? ev.touches[0] : ev;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}

/** Hit radius for orb bubbles (hover + click) */
const ORB_HIT_R = 36;
const ORB_HIT_R2 = ORB_HIT_R * ORB_HIT_R;

/** Collect any orbs under (x,y). Returns true if at least one was collected. */
function tryAlert(x, y) {
  let got = false;
  for (const a of [...s.world.alerts]) {
    const dx = a.x - x;
    const dy = a.y - y;
    if (dx * dx + dy * dy < ORB_HIT_R2) {
      collectAlert(s, a);
      got = true;
    }
  }
  return got;
}

function nearAlert(x, y) {
  for (const a of s.world.alerts) {
    const dx = a.x - x;
    const dy = a.y - y;
    if (dx * dx + dy * dy < (ORB_HIT_R + 6) ** 2) return true;
  }
  return false;
}

function updateOrbCursor(x, y) {
  canvas.style.cursor = nearAlert(x, y) ? 'pointer' : sprintHold.canvas ? 'grabbing' : 'crosshair';
}

/** Sprint sources (OR together — any hold keeps sprint on) */
const sprintHold = { canvas: false, button: false, space: false };

function syncSprint() {
  setSprint(s, sprintHold.canvas || sprintHold.button || sprintHold.space);
  const btn = document.getElementById('btn-sprint');
  if (btn) {
    const on = sprintHold.canvas || sprintHold.button || sprintHold.space;
    btn.classList.toggle('is-held', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  document.getElementById('app')?.classList.toggle('is-sprinting', sprintHold.canvas || sprintHold.button || sprintHold.space);
}

// Stage: hold to sprint · hover/click orbs to collect
canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  sprintHold.canvas = true;
  syncSprint();
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
  try {
    canvas.setPointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }
});
// Hover counts as collect (mouse) — also while dragging/sprinting
canvas.addEventListener('pointermove', (ev) => {
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
});
canvas.addEventListener('pointerenter', (ev) => {
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
});
function endCanvasSprint(ev) {
  sprintHold.canvas = false;
  syncSprint();
  if (ev?.pointerId != null) {
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }
  if (ev) {
    const p = pos(ev);
    updateOrbCursor(p.x, p.y);
  } else {
    canvas.style.cursor = 'crosshair';
  }
}
canvas.addEventListener('pointerup', endCanvasSprint);
canvas.addEventListener('pointercancel', endCanvasSprint);
canvas.addEventListener('lostpointercapture', () => {
  sprintHold.canvas = false;
  syncSprint();
  canvas.style.cursor = 'crosshair';
});
canvas.addEventListener('pointerleave', () => {
  if (!sprintHold.canvas) canvas.style.cursor = 'default';
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.style.cursor = 'crosshair';

// Big Sprint button — primary mobile control
const sprintBtn = document.getElementById('btn-sprint');
function bindHold(el, key) {
  if (!el) return;
  const start = (ev) => {
    ev.preventDefault();
    sprintHold[key] = true;
    syncSprint();
    try {
      el.setPointerCapture?.(ev.pointerId);
    } catch {
      /* ignore */
    }
  };
  const end = (ev) => {
    sprintHold[key] = false;
    syncSprint();
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (ev) => {
    // only end if primary button released off-element without capture
    if (ev.buttons === 0) end(ev);
  });
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindHold(sprintBtn, 'button');

// Global safety: pointer released anywhere
window.addEventListener('pointerup', () => {
  if (sprintHold.canvas || sprintHold.button) {
    // keep if still captured; if buttons=0 force clear button after a tick
  }
});
window.addEventListener('blur', () => {
  sprintHold.canvas = false;
  sprintHold.button = false;
  sprintHold.space = false;
  syncSprint();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    sprintHold.space = true;
    syncSprint();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    sprintHold.space = false;
    syncSprint();
  }
});

document.getElementById('btn-start')?.addEventListener('click', () => {
  document.getElementById('title-screen').hidden = true;
  save(s);
});

// QA: ?autostart=1 skips title for screenshots / smoke
if (new URLSearchParams(location.search).has('autostart')) {
  document.getElementById('title-screen').hidden = true;
}

document.getElementById('chk-motion').checked = s.settings.reducedMotion;

// comedy + slow game-icon ticker (duplicated for seamless loop)
const tag = document.getElementById('title-tagline');
if (tag) tag.textContent = pick(TITLE_TAGLINES);
const track = document.getElementById('ticker-track');
if (track) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  track.innerHTML = items
    .map((it) => {
      const src = `./assets/icons/${it.icon}.svg`;
      return `<span class="ticker-item"><img class="gicon-img" src="${src}" alt="" width="20" height="20" loading="lazy" /><span class="gname">${it.name}</span><span class="kind ${it.kind}">${it.kind}</span>${it.text}</span>`;
    })
    .join('');
}

let last = performance.now();
let acc = 0;
let hudT = 0;
let saveT = 0;

function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= C.FIXED_DT) {
    step(s, C.FIXED_DT);
    acc -= C.FIXED_DT;
  }

  draw(view.ctx, view.w, view.h, s);

  hudT += dt;
  if (hudT > 0.08) {
    renderHUD(s, hudT);
    hudT = 0;
  }

  saveT += dt;
  if (saveT > 6) {
    saveT = 0;
    save(s);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
console.info('%cAPN Idle', 'color:#FC1243;font-weight:bold', '— All Patch Notes mini-game');
