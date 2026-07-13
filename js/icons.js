/** Inline SVG icons for Build shop — crisp at any DPI */

const SVG = (paths, view = '0 0 24 24') =>
  `<svg class="ico" viewBox="${view}" aria-hidden="true" focusable="false">${paths}</svg>`;

const p = (d, fill = 'currentColor') => `<path fill="${fill}" d="${d}"/>`;
const c = (cx, cy, r, fill = 'currentColor') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

export const ICO = {
  power: SVG(
    p('M13 2L4 14h7l-1 8 10-14h-7l0-6z') // bolt
  ),
  focus: SVG(
    `${c(12, 12, 3)}${p('M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14z')}`
  ),
  reach: SVG(
    p('M4 12h12l-3-3 1.4-1.4L20.8 12l-6.4 6.4L13 17l3-3H4v-2z')
  ),
  hotfix: SVG(p('M11 2v7H7l6 13v-7h4L11 2z')),
  live_tracker: SVG(
    `${c(12, 12, 2)}${p('M12 5a7 7 0 017 7h-2a5 5 0 00-5-5V5zm0 4a3 3 0 013 3h-2a1 1 0 00-1-1V9z')}${p('M5 12a7 7 0 017-7v2a5 5 0 00-5 5H5zm4 0a3 3 0 013-3v2a1 1 0 00-1 1H9z')}`
  ),
  summary_burst: SVG(
    p('M12 2l2.4 6.5H21l-5.2 4 2 6.5L12 15.5 6.2 19l2-6.5L3 8.5h6.6L12 2z')
  ),
  verified_mask: SVG(
    p('M12 2L4 5v6c0 5.2 3.4 9.9 8 11 4.6-1.1 8-5.8 8-11V5l-8-3zm-1.2 14.2L6.5 12l1.4-1.4 2.9 2.9 5.8-5.8 1.4 1.4-7.2 7.1z')
  ),
  amplify: SVG(
    p('M3 9v6h4l5 4V5L7 9H3zm13.5 3a3.5 3.5 0 00-1.8-3v6a3.5 3.5 0 001.8-3zM15 4.2v2.1a6 6 0 010 11.4v2.1a8 8 0 000-15.6z')
  ),
  deep_dive: SVG(
    p('M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8zm0 11a3 3 0 110-6 3 3 0 010 6z')
  ),
  notify: SVG(
    p('M12 22a2.2 2.2 0 002.1-1.6H9.9A2.2 2.2 0 0012 22zM18 16v-5a6 6 0 00-5-5.9V4a1 1 0 10-2 0v1.1A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z')
  ),
  scroll_speed: SVG(
    p('M8 6l-1.4 1.4L10.2 11 6.6 14.6 8 16l5-5-5-5zm7 0l-1.4 1.4L17.2 11l-3.6 3.6L15 16l5-5-5-5z')
  ),
  editor_pick: SVG(
    p('M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 7L12 17.3 5.7 20.8l1.7-7L2 9.2l7.1-.6L12 2z')
  ),
  // meta
  xp_posts: SVG(p('M12 4l-1 6H7l6 10 1-6h4L12 4z')),
  xp_global: SVG(p('M12 2l2.4 6.5H21l-5.2 4 2 6.5L12 15.5 6.2 19l2-6.5L3 8.5h6.6L12 2z')),
  signal_power: SVG(p('M13 2L4 14h7l-1 8 10-14h-7l0-6z')),
  feed_speed: SVG(p('M8 6l-1.4 1.4L10.2 11 6.6 14.6 8 16l5-5-5-5zm7 0l-1.4 1.4L17.2 11l-3.6 3.6L15 16l5-5-5-5z')),
  byte_gain: SVG(
    `${c(12, 12, 8, 'none')}${p('M12 4a8 8 0 100 16 8 8 0 000-16zm0 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11z')}${c(12, 12, 2)}`
  ),
  patch_gain: SVG(
    p('M6 3h9l3 3v15H6V3zm8 1.5V8h3.2L14 4.5zM8 11h8v1.5H8V11zm0 3.5h8V16H8v-1.5zm0 3.5h5V19H8v-1.5z')
  ),
  cold_start: SVG(p('M12 2C9 7 7 9.5 7 13a5 5 0 0010 0c0-3.5-2-6-5-11z')),
};

export function skillIco(id) {
  return ICO[id] || ICO.hotfix;
}

export function attrIco(id) {
  if (id === 'scan') return ICO.power;
  if (id === 'verify') return ICO.focus;
  if (id === 'amplify') return ICO.reach;
  return ICO.power;
}

export function metaIco(id) {
  return ICO[id] || ICO.editor_pick;
}
