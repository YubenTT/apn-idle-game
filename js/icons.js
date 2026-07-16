/** Inline SVG icons — skills, boosts, hub, premium */

const SVG = (paths, view = '0 0 24 24') =>
  `<svg class="ico" viewBox="${view}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

const p = (d) => `<path vector-effect="non-scaling-stroke" d="${d}"/>`;
const c = (cx, cy, r) =>
  `<circle vector-effect="non-scaling-stroke" cx="${cx}" cy="${cy}" r="${r}"/>`;

export const ICO = {
  // attrs
  power: SVG(p('M13 2L4 14h7l-1 8 10-14h-7z')),
  focus: SVG(`${c(12, 12, 3)}${p('M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14z')}`),
  reach: SVG(p('M4 12h12l-3-3 1.4-1.4L20.8 12l-6.4 6.4L13 17l3-3H4v-2z')),

  // damage skills
  hotfix: SVG(p('M11 2v7H7l6 13v-7h4L11 2z')),
  scroll_speed: SVG(
    p('M8 6l-1.4 1.4L10.2 11 6.6 14.6 8 16l5-5-5-5zm7 0l-1.4 1.4L17.2 11l-3.6 3.6L15 16l5-5-5-5z')
  ),
  live_tracker: SVG(
    `${c(12, 12, 2)}${p('M12 5a7 7 0 017 7h-2a5 5 0 00-5-5V5zm0 4a3 3 0 013 3h-2a1 1 0 00-1-1V9z')}${p('M5 12a7 7 0 017-7v2a5 5 0 00-5 5H5z')}`
  ),

  // crit skills
  notify: SVG(
    p('M12 22a2.2 2.2 0 002.1-1.6H9.9A2.2 2.2 0 0012 22zM18 16v-5a6 6 0 00-5-5.9V4a1 1 0 10-2 0v1.1A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z')
  ),
  summary_burst: SVG(p('M12 2l2.4 6.5H21l-5.2 4 2 6.5L12 15.5 6.2 19l2-6.5L3 8.5h6.6L12 2z')),
  sharp_eye: SVG(
    `${c(12, 12, 2.5)}${p('M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 4a4 4 0 100-8 4 4 0 000 8z')}`
  ),

  // utility
  deep_dive: SVG(
    p('M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8zm0 11a3 3 0 110-6 3 3 0 010 6z')
  ),
  amplify: SVG(
    p('M3 9v6h4l5 4V5L7 9H3zm13.5 3a3.5 3.5 0 00-1.8-3v6a3.5 3.5 0 001.8-3zM15 4.2v2.1a6 6 0 010 11.4v2.1a8 8 0 000-15.6z')
  ),
  marathon: SVG(p('M13.5 5.5 10 12h3l-1 7 6-10h-3l1.5-3.5z')),

  // meta boosts — distinct metaphors
  xp_posts: SVG(p('M12 3l1.5 5.5H19l-4.5 3.5 1.7 5.5L12 14.5 7.8 17.5 9.5 12 5 8.5h5.5L12 3z')),
  xp_global: SVG(
    `${c(12, 12, 9, 'none')}${p('M12 3a9 9 0 100 18 9 9 0 000-18zm0 2c1.5 0 2.8 2.7 2.8 7S13.5 19 12 19s-2.8-2.7-2.8-7S10.5 5 12 5z')}${p('M3.5 12h17M5 8h14M5 16h14')}`
  ),
  signal_power: SVG(p('M2 18h3v-6H2v6zm5 0h3V9H7v9zm5 0h3V4h-3v14zm5 0h3v-9h-3v9z')),
  feed_speed: SVG(p('M13 2v8h7l-9 12v-8H4l9-12z')),
  byte_gain: SVG(
    `${p('M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z')}${c(18, 17, 2.5)}`
  ),
  patch_gain: SVG(
    p('M6 3h9l3 3v15H6V3zm8 1.5V8h3.2L14 4.5zM8 11h8v1.5H8V11zm0 3.5h8V16H8v-1.5z')
  ),
  cold_start: SVG(p('M12 2C9 7 7 9.5 7 13a5 5 0 0010 0c0-3.5-2-6-5-11z')),

  // premium / hub
  pro: SVG(p('M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 7L12 17.3 5.7 20.8l1.7-7L2 9.2l7.1-.6L12 2z')),
  boost: SVG(p('M13 2L4 14h7l-1 8 10-14h-7z')),
  warp: SVG(p('M12 2a10 10 0 00-7 17l1.5-1.5A8 8 0 1112 4v4l5-5-5-5v4a10 10 0 000 4z')),
  auto_sprint: SVG(p('M8 5v14l11-7L8 5zm-4 1h2v12H4V6z')),
  coin: SVG(`${c(12, 12, 9)}${c(12, 12, 5, 'none')}${p('M12 7v10M9 9.5c1-.8 5-.8 6 0M9 14.5c1 .8 5 .8 6 0')}`),
  quest: SVG(p('M9 2h6v2H9V2zm1 4h4l1 2h4v14H5V8h4l1-2zm1 5v6h2v-6h-2zm0 7v2h2v-2h-2z')),
  daily: SVG(p('M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10z')),
  weekly: SVG(p('M3 13h2v-2H3v2zm4 0h14v-2H7v2zM3 17h2v-2H3v2zm4 0h14v-2H7v2zM3 9h2V7H3v2zm4 0h14V7H7v2z')),
  gift: SVG(p('M20 7h-2.2A3 3 0 0012 3a3 3 0 00-5.8 4H4v4h16V7zM4 13v8h7v-8H4zm9 0v8h7v-8h-7z')),
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
  return ICO[id] || ICO.signal_power;
}

export function hubIco(id) {
  return ICO[id] || ICO.quest;
}

/** Empty-slot silhouettes — brand 4-slot */
const SLOT_EMPTY = {
  weapon: SVG(`${p('M4 12h14l-3-3 1.2-1.2L22 12l-5.8 5.8L15 16.6l3-3H4v-1.6z')}${c(5, 12, 2)}`),
  chest: SVG(p('M8 4h8l2 3v13H6V7l2-3zm2 2l-1 1.5h6L14 6h-4z')),
  legs: SVG(p('M8 3h8v6l-1.5 12h-2.2L11 12l-1.3 9H7.5L6 9V3h2z')),
  visor: SVG(
    `${p('M3 12h18')}${p('M5 12c0-2 1.5-4 3.5-4h7c2 0 3.5 2 3.5 4')}${c(9, 12, 1.5)}${c(15, 12, 1.5)}`
  ),
};

function normSlot(slot) {
  if (slot === 'armor') return 'chest';
  if (slot === 'head' || slot === 'trinket' || slot === 'module') return 'visor';
  if (slot === 'boots') return 'legs';
  return slot || 'chest';
}

export function itemArtKey(item) {
  const name = String(item?.name || '').toLowerCase();
  const slot = normSlot(item?.slot);
  if (slot === 'weapon') {
    if (name.includes('stick') || name.includes('probe') || name.includes('mod')) return 'mod-stick';
    if (name.includes('beam') || name.includes('rail') || name.includes('lance') || name.includes('tracker') || name.includes('changelog')) return 'scanner-lash';
    return 'source-seal';
  }
  if (slot === 'chest') {
    if (name.includes('mail') || name.includes('vest') || name.includes('jacket') || name.includes('hoodie') || name.includes('coat')) return 'patch-mail';
    if (name.includes('plate') || name.includes('plating') || name.includes('guard') || name.includes('shell') || name.includes('armor') || name.includes('suit')) return 'press-plate';
    if (name.includes('forever') || name.includes('live')) return 'overdrive-core';
    return 'publisher-satchel';
  }
  if (slot === 'legs') {
    if (name.includes('draft') || name.includes('mod') || name.includes('intern')) return 'link-gloves';
    if (name.includes('sprint') || name.includes('legging') || name.includes('pants') || name.includes('slack') || name.includes('jogger')) return 'route-leggings';
    if (name.includes('greave') || name.includes('plate')) return 'archive-boots';
    return 'cache-belt';
  }
  if (name.includes('visor') || name.includes('goggle') || name.includes('spec') || name.includes('lens')) return 'visor-coil';
  if (name.includes('crown') || name.includes('seeing')) return 'source-seal';
  return 'overdrive-core';
}

const ITEM_ART_CELLS = {
  'mod-stick': [0, 0],
  'scanner-lash': [1, 0],
  'patch-mail': [2, 0],
  'press-plate': [3, 0],
  'link-gloves': [0, 1],
  'route-leggings': [1, 1],
  'archive-boots': [2, 1],
  'cache-belt': [3, 1],
  'source-seal': [0, 2],
  'visor-coil': [1, 2],
  'overdrive-core': [2, 2],
  'publisher-satchel': [3, 2],
};

/** Compact item glyph — brand slots weapon/chest/legs/visor */
export function gearIcon(item) {
  if (!item) {
    return SVG(p('M6 6h12v12H6z'), '0 0 24 24');
  }
  const name = (item.name || '').toLowerCase();
  const slot = normSlot(item.slot);
  const r = item.rarity || 'white';

  if (!item.name || name === 'empty') {
    return SLOT_EMPTY[slot] || SLOT_EMPTY.chest;
  }

  const artKey = itemArtKey(item);
  if (ITEM_ART_CELLS[artKey]) {
    return `<span class="item-art-frame" aria-hidden="true"><span class="item-sprite item-${artKey}"></span></span>`;
  }

  if (slot === 'weapon') {
    if (name.includes('eye')) {
      return SVG(
        `${c(12, 12, 3)}${p('M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 4a4 4 0 100-8 4 4 0 000 8z')}`
      );
    }
    if (name.includes('beam') || name.includes('rail') || name.includes('lance')) {
      return SVG(
        `${p('M3 11h12l-2.5-2.5 1.2-1.2L19.4 12l-5.7 5.7-1.2-1.2L15 14H3v-3z')}${c(20, 12, 2.2)}`
      );
    }
    if (name.includes('stick') || name.includes('probe') || name.includes('edge')) {
      return SVG(p('M11 2h2v11l6 9H5l6-9V2zm1 3v8.2L8.8 18h6.4L12 13.2V5z'));
    }
    if (name.includes('rifle') || name.includes('tracker') || name.includes('changelog')) {
      return SVG(p('M4 10h10l2-3h4v2h-3l-2 3 2 3h3v2h-4l-2-3H4v-4zm0 0v4H2v-4h2z'));
    }
    return SLOT_EMPTY.weapon;
  }

  if (slot === 'visor') {
    if (name.includes('seeing') || name.includes('crown') || name.includes('lag')) {
      return SVG(`${c(12, 12, 7)}${p('M12 7v5l3 2')}${c(12, 12, 1.5)}`);
    }
    return SLOT_EMPTY.visor;
  }

  if (slot === 'chest') {
    if (name.includes('cloak') || name.includes('coat') || name.includes('hoodie')) {
      return SVG(
        p(
          'M12 3l7 3v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6l7-3zm0 2.2L7 7.1v3.6c0 3 1.8 5.6 5 6.9 3.2-1.3 5-3.9 5-6.9V7.1L12 5.2z'
        )
      );
    }
    if (name.includes('shell') || name.includes('plating') || name.includes('plate') || name.includes('guard')) {
      return SVG(
        p(
          'M12 2l9 3.5v6.2c0 5.4-3.7 10.2-9 12-5.3-1.8-9-6.6-9-12V5.5L12 2zm0 2.4L5 7v4.5c0 4 2.7 7.5 7 9 4.3-1.5 7-5 7-9V7l-7-2.6z'
        )
      );
    }
    if (name.includes('suit') || name.includes('mail') || name.includes('vest') || name.includes('jacket')) {
      return SVG(p('M8 4h8l2 3v13H6V7l2-3zm2 2l-1 1.5h6L14 6h-4zm-1 5h8v1.5H9V11zm0 3.5h8V16H9v-1.5z'));
    }
    if (r === 'unique' || name.includes('forever') || name.includes('downtime') || name.includes('hide')) {
      return SVG(
        p(
          'M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3zm0 3.2L7 7v4.2c0 3.2 2.1 6.1 5 7.3 2.9-1.2 5-4.1 5-7.3V7l-5-1.8z'
        )
      );
    }
    return SLOT_EMPTY.chest;
  }

  if (slot === 'legs') {
    if (name.includes('sprint') || name.includes('legging') || name.includes('greave')) {
      return SVG(p('M7 3h10v5l-1 13h-3l-1-9-1 9H8L7 8V3zm2 2v3h6V5H9z'));
    }
    return SLOT_EMPTY.legs;
  }

  return SLOT_EMPTY.chest;
}
