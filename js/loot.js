/** Brand gear — Weapon · Chest · Legs · Visor. Permanent. Sell junk for Signal; boxes with coins. */

export const RARITY = {
  white: { id: 'white', label: 'Common', color: '#b8c0cc', weight: 52, affixes: 1, power: 1, order: 0 },
  green: { id: 'green', label: 'Uncommon', color: '#3ecf8e', weight: 28, affixes: 1, power: 1.35, order: 1 },
  blue: { id: 'blue', label: 'Rare', color: '#5eb0ff', weight: 14, affixes: 2, power: 1.75, order: 2 },
  yellow: { id: 'yellow', label: 'Epic', color: '#e6b84d', weight: 5, affixes: 2, power: 2.25, order: 3 },
  unique: { id: 'unique', label: 'Unique', color: '#fc1243', weight: 1, affixes: 3, power: 3, order: 4 },
};

/**
 * Brand loadout (owner mock):
 * Weapon · Chest · Legs · Visor
 */
export const SLOTS = ['weapon', 'chest', 'legs', 'visor'];

export const SLOT_META = {
  weapon: { id: 'weapon', label: 'Weapon', short: 'Wpn', primary: 'Signal' },
  chest: { id: 'chest', label: 'Chest', short: 'Chest', primary: 'Defense' },
  legs: { id: 'legs', label: 'Legs', short: 'Legs', primary: 'Sprint' },
  visor: { id: 'visor', label: 'Visor', short: 'Visor', primary: 'Signal' },
};

/** Legacy slot → brand slot */
const SLOT_MIGRATE = {
  armor: 'chest',
  head: 'visor',
  boots: 'legs',
  trinket: 'visor',
  module: 'visor',
};

const SLOT_NAMES = {
  weapon: {
    white: ['Feed Lance', 'Patch Probe', 'Signal Stick'],
    green: ['Verify Beam', 'Mod Stick', 'Scan Lance'],
    blue: ['Live Tracker', 'Hotfix Rail', 'Trust Rifle'],
    yellow: ["Editor's Edge", 'Season Core', 'Changelog'],
    unique: ['APN Eye', 'Host Beam', 'All Notes'],
  },
  chest: {
    white: ['Draft Vest', 'Mod Hoodie', 'Intern Jacket'],
    green: ['Verified Shell', 'Live Coat', 'Patch Mail'],
    blue: ['Trust Plating', 'Source Guard', 'CDN Cloak'],
    yellow: ['Season Armor', 'Gate Plate', 'Launch Suit'],
    unique: ['Host Hide', 'Live Forever', 'Zero Downtime'],
  },
  legs: {
    white: ['Draft Pants', 'Mod Joggers', 'Intern Slacks'],
    green: ['Verify Greaves', 'Sprint Leggings', 'Patch Legs'],
    blue: ['Trust Plates', 'Source Greaves', 'CDN Leggings'],
    yellow: ['Season Greaves', 'Gate Legs', 'Launch Pants'],
    unique: ['Host Stride', 'Never Stuck', 'Full Uptime'],
  },
  visor: {
    white: ['Draft Goggles', 'Mod Visor', 'Intern Specs'],
    green: ['Verify Visor', 'Signal Visor', 'Scan Specs'],
    blue: ['Trust Visor', 'Source Goggles', 'CDN Lens'],
    yellow: ['Season Visor', 'Gate Lens', 'Launch Specs'],
    unique: ['Host Crown', 'All-Seeing', 'Zero Lag Lens'],
  },
};

/**
 * Affixes — slot-tagged.
 * Brand primary display maps these to Signal / Defense / Sprint.
 */
const AFFIX = {
  // Signal / damage cluster
  signal_pct: {
    key: 'signal_pct',
    label: 'Signal',
    brand: 'Signal',
    unit: '%',
    min: 6,
    max: 28,
    slots: ['weapon', 'visor', 'chest'],
  },
  dmg_pct: {
    key: 'dmg_pct',
    label: 'Damage',
    brand: 'Signal',
    unit: '%',
    min: 3,
    max: 12,
    slots: ['weapon'],
  },
  flat_dmg: {
    key: 'flat_dmg',
    label: 'Flat Dmg',
    brand: 'Signal',
    unit: '',
    min: 4,
    max: 22,
    slots: ['weapon', 'chest'],
  },
  // Defense cluster (energy shell)
  energy: {
    key: 'energy',
    label: 'Energy',
    brand: 'Defense',
    unit: '',
    min: 8,
    max: 26,
    slots: ['chest', 'visor'],
  },
  notes_pct: {
    key: 'notes_pct',
    label: 'Notes',
    brand: 'Defense',
    unit: '%',
    min: 3,
    max: 12,
    slots: ['chest', 'legs'],
  },
  // Sprint cluster
  move_pct: {
    key: 'move_pct',
    label: 'Move',
    brand: 'Sprint',
    unit: '%',
    min: 4,
    max: 16,
    slots: ['legs'],
  },
  atk_spd: {
    key: 'atk_spd',
    label: 'Atk Speed',
    brand: 'Sprint',
    unit: '%',
    min: 2,
    max: 8,
    slots: ['weapon', 'legs'],
  },
  e_regen: {
    key: 'e_regen',
    label: 'E-Regen',
    brand: 'Sprint',
    unit: '',
    min: 1,
    max: 5,
    slots: ['legs', 'visor'],
  },
  // Crit (visor secondary)
  crit_pct: {
    key: 'crit_pct',
    label: 'Crit',
    brand: 'Signal',
    unit: '%',
    min: 1,
    max: 6,
    slots: ['weapon', 'visor'],
  },
};

const UNIQUE_BY_SLOT = {
  weapon: [
    {
      name: 'APN Eye',
      affixes: [
        { key: 'signal_pct', value: 24 },
        { key: 'dmg_pct', value: 14 },
        { key: 'crit_pct', value: 6 },
      ],
    },
    {
      name: 'Host Beam',
      affixes: [
        { key: 'signal_pct', value: 22 },
        { key: 'flat_dmg', value: 20 },
        { key: 'atk_spd', value: 8 },
      ],
    },
  ],
  chest: [
    {
      name: 'Live Forever',
      affixes: [
        { key: 'energy', value: 28 },
        { key: 'notes_pct', value: 14 },
        { key: 'signal_pct', value: 12 },
      ],
    },
    {
      name: 'Zero Downtime',
      affixes: [
        { key: 'energy', value: 24 },
        { key: 'flat_dmg', value: 14 },
        { key: 'signal_pct', value: 10 },
      ],
    },
  ],
  legs: [
    {
      name: 'Host Stride',
      affixes: [
        { key: 'move_pct', value: 16 },
        { key: 'atk_spd', value: 8 },
        { key: 'notes_pct', value: 10 },
      ],
    },
    {
      name: 'Never Stuck',
      affixes: [
        { key: 'move_pct', value: 14 },
        { key: 'e_regen', value: 6 },
        { key: 'atk_spd', value: 6 },
      ],
    },
  ],
  visor: [
    {
      name: 'All-Seeing',
      affixes: [
        { key: 'signal_pct', value: 18 },
        { key: 'crit_pct', value: 8 },
        { key: 'energy', value: 14 },
      ],
    },
    {
      name: 'Zero Lag Lens',
      affixes: [
        { key: 'signal_pct', value: 16 },
        { key: 'crit_pct', value: 7 },
        { key: 'e_regen', value: 5 },
      ],
    },
  ],
};

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function rollRarity(luck = 1) {
  const entries = Object.values(RARITY);
  let total = 0;
  const weights = entries.map((r) => {
    const w = r.weight * (r.id === 'white' ? 1 / luck : luck ** (r.power * 0.35));
    total += w;
    return w;
  });
  let roll = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return entries[i];
  }
  return RARITY.white;
}

function floorRarity(rarity, minId) {
  if (!minId || !RARITY[minId]) return rarity;
  const min = RARITY[minId];
  if ((rarity.order || 0) >= (min.order || 0)) return rarity;
  return min;
}

function rollAffix(slot, rarity, ilvl) {
  const pool = Object.values(AFFIX).filter((a) => a.slots.includes(slot));
  const def = pick(pool.length ? pool : Object.values(AFFIX));
  const t = Math.min(1, ilvl / 80);
  const base = def.min + (def.max - def.min) * (0.35 + t * 0.65);
  const mult = rarity.power * (0.85 + Math.random() * 0.3);
  let value = base * mult;
  if (def.unit === '%') value = Math.round(value * 10) / 10;
  else value = Math.round(value);
  return { key: def.key, label: def.label, brand: def.brand, unit: def.unit, value };
}

function scoreItem(item) {
  if (!item) return 0;
  let s = item.ilvl * 2 + (RARITY[item.rarity]?.power || 1) * 20;
  for (const a of item.affixes || []) {
    s += a.value * (a.unit === '%' ? 1.4 : 0.8);
  }
  return s;
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function mapUniqueAffixes(affixes, ilvl) {
  return affixes.map((a) => {
    const def = AFFIX[a.key];
    return {
      key: a.key,
      label: def?.label || a.key,
      brand: def?.brand || def?.label || a.key,
      unit: def?.unit || '',
      value: Math.round(a.value * (0.9 + Math.min(0.4, ilvl / 100)) * 10) / 10,
    };
  });
}

export function canonicalSlot(slot) {
  if (!slot) return 'chest';
  if (SLOTS.includes(slot)) return slot;
  return SLOT_MIGRATE[slot] || 'chest';
}

/** Migrate legacy armor/head/boots/trinket → brand slots */
export function migrateItem(item) {
  if (!item || typeof item !== 'object') return item;
  const slot = canonicalSlot(item.slot);
  if (slot === item.slot) return item;
  return { ...item, slot };
}

export function emptyGear() {
  return {
    weapon: null,
    chest: null,
    legs: null,
    visor: null,
    bag: [],
  };
}

/** Normalize any save/runtime gear blob into brand 4-slot shape */
export function normalizeGear(raw) {
  const g = emptyGear();
  if (!raw || typeof raw !== 'object') return g;

  // Direct brand slots
  for (const slot of SLOTS) {
    let piece = raw[slot] || null;
    // legacy keys landing on brand slots
    if (!piece && slot === 'chest' && raw.armor) piece = raw.armor;
    if (!piece && slot === 'visor' && raw.head) piece = raw.head;
    if (!piece && slot === 'legs' && raw.boots) piece = raw.boots;
    if (!piece && slot === 'visor' && raw.trinket) piece = raw.trinket;
    if (piece) {
      piece = migrateItem(piece);
      if (piece.slot !== slot) piece = { ...piece, slot };
      // if slot already filled, push weaker to bag later
      if (!g[slot]) g[slot] = piece;
      else {
        g.bag.push(piece);
      }
    }
  }

  const bagIn = Array.isArray(raw.bag) ? raw.bag : [];
  // also orphan legacy equipped pieces not mapped above
  for (const leg of ['armor', 'head', 'boots', 'trinket', 'module']) {
    if (raw[leg] && !SLOTS.includes(leg)) {
      // already handled via mapping if slot empty
    }
  }
  g.bag = [...g.bag, ...bagIn.map(migrateItem).filter(Boolean)];
  // dedupe by id
  const seen = new Set();
  g.bag = g.bag.filter((it) => {
    if (!it?.id || seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
  return g;
}

/**
 * Brand primary line for cards: "+24 Signal"
 * Picks strongest affix by brand weight.
 */
export function primaryStat(item) {
  if (!item?.affixes?.length) {
    const fb = SLOT_META[item?.slot]?.primary || 'Signal';
    return { value: 0, brand: fb, text: `+0 ${fb}` };
  }
  let best = item.affixes[0];
  let bestW = -1;
  for (const a of item.affixes) {
    const brand = a.brand || AFFIX[a.key]?.brand || a.label || 'Signal';
    const w = a.value * (a.unit === '%' ? 1.2 : 1);
    if (w > bestW) {
      bestW = w;
      best = { ...a, brand };
    }
  }
  const brand = best.brand || SLOT_META[item.slot]?.primary || 'Signal';
  const val = Math.round(best.value);
  return { value: val, brand, text: `+${val} ${brand}` };
}

/**
 * Generate a gear piece.
 * @param {number} zone 0-based
 * @param {string|null} forcedSlot
 * @param {{ luck?: number, minRarity?: string }} [opts]
 */
export function rollItem(zone, forcedSlot = null, opts = {}) {
  const ilvl = Math.max(1, (zone | 0) + 1);
  const baseLuck = 1 + Math.min(1.4, ilvl / 50);
  const luck = opts.luck != null ? opts.luck : baseLuck;
  let rarity = rollRarity(luck);
  rarity = floorRarity(rarity, opts.minRarity);

  let slot = canonicalSlot(forcedSlot);
  if (!forcedSlot || !SLOTS.includes(slot)) slot = pick(SLOTS);

  if (rarity.id === 'unique') {
    const pool = UNIQUE_BY_SLOT[slot] || UNIQUE_BY_SLOT.weapon;
    const u = pick(pool);
    const item = {
      id: uid('u'),
      slot,
      rarity: 'unique',
      name: u.name,
      ilvl,
      affixes: mapUniqueAffixes(u.affixes, ilvl),
    };
    item.score = scoreItem(item);
    return item;
  }

  const names = SLOT_NAMES[slot] || SLOT_NAMES.weapon;
  const name = pick(names[rarity.id] || names.white);
  const n = rarity.affixes;
  const used = new Set();
  const affixes = [];
  for (let i = 0; i < n; i++) {
    let a;
    let tries = 0;
    do {
      a = rollAffix(slot, rarity, ilvl);
      tries++;
    } while (used.has(a.key) && tries < 8);
    used.add(a.key);
    affixes.push(a);
  }

  const item = {
    id: uid('g'),
    slot,
    rarity: rarity.id,
    name,
    ilvl,
    affixes,
  };
  item.score = scoreItem(item);
  return item;
}

export function pickSlotForGear(gear, preferEmpty = true) {
  if (preferEmpty && gear) {
    const empty = SLOTS.filter((s) => !gear[s]);
    if (empty.length) return pick(empty);
  }
  return pick(SLOTS);
}

export function gearBonuses(gear) {
  const b = {
    dmg_pct: 0,
    flat_dmg: 0,
    crit_pct: 0,
    atk_spd: 0,
    signal_pct: 0,
    notes_pct: 0,
    energy: 0,
    e_regen: 0,
    move_pct: 0,
  };
  if (!gear) return b;
  for (const slot of SLOTS) {
    const piece = gear[slot];
    if (!piece) continue;
    for (const a of piece.affixes || []) {
      if (a.key in b) b[a.key] += a.value;
    }
  }
  return b;
}

/**
 * Equip only if slot empty or strictly better score.
 * Never equips worse. Overflow bag drops oldest.
 */
export function offerItem(gear, item, bagCap = 24) {
  if (!gear || !item) return { equipped: false, replaced: null, item };
  item = migrateItem(item);
  const slot = item.slot;
  if (!SLOTS.includes(slot)) {
    gear.bag = gear.bag || [];
    gear.bag.unshift(item);
    if (gear.bag.length > bagCap) gear.bag.length = bagCap;
    return { equipped: false, replaced: null, item };
  }
  const cur = gear[slot];
  if (!cur || item.score > cur.score) {
    const replaced = cur || null;
    gear[slot] = item;
    if (replaced) {
      gear.bag = gear.bag || [];
      gear.bag.unshift(replaced);
      if (gear.bag.length > bagCap) gear.bag.length = bagCap;
    }
    return { equipped: true, replaced, item };
  }
  gear.bag = gear.bag || [];
  gear.bag.unshift(item);
  if (gear.bag.length > bagCap) gear.bag.length = bagCap;
  return { equipped: false, replaced: null, item };
}

export function equipFromBag(gear, itemId) {
  if (!gear?.bag) return false;
  const idx = gear.bag.findIndex((x) => x.id === itemId);
  if (idx < 0) return false;
  const [raw] = gear.bag.splice(idx, 1);
  const item = migrateItem(raw);
  if (!SLOTS.includes(item.slot)) {
    gear.bag.unshift(item);
    return false;
  }
  const cur = gear[item.slot];
  gear[item.slot] = item;
  if (cur) gear.bag.unshift(cur);
  return true;
}

export function unequipSlot(gear, slot, bagCap = 24) {
  if (!gear || !SLOTS.includes(slot) || !gear[slot]) return false;
  gear.bag = gear.bag || [];
  if (gear.bag.length >= bagCap) return false;
  gear.bag.unshift(gear[slot]);
  gear[slot] = null;
  return true;
}

export function sellValue(item) {
  if (!item) return 0;
  const p = RARITY[item.rarity]?.power || 1;
  const base = 6 + (item.ilvl | 0) * 1.4;
  return Math.max(4, Math.round(base * p * (item.rarity === 'unique' ? 1.35 : 1)));
}

export function sellFromBag(gear, itemId) {
  if (!gear?.bag) return null;
  const idx = gear.bag.findIndex((x) => x.id === itemId);
  if (idx < 0) return null;
  const [item] = gear.bag.splice(idx, 1);
  return { item, signal: sellValue(item) };
}

export function itemScore(item) {
  return scoreItem(item);
}

export function isUpgrade(gear, item) {
  if (!item || !gear) return false;
  item = migrateItem(item);
  const cur = gear[item.slot];
  if (!cur) return true;
  return scoreItem(item) > scoreItem(cur);
}

export function equippedCount(gear) {
  if (!gear) return 0;
  return SLOTS.reduce((n, s) => n + (gear[s] ? 1 : 0), 0);
}

export const BAG_CAP = 24;

export function formatAffix(a) {
  if (!a) return '';
  const sign = a.value >= 0 ? '+' : '';
  return `${sign}${a.value}${a.unit || ''} ${a.label}`;
}

export function rarityColor(id) {
  return RARITY[id]?.color || '#b8c0cc';
}

export function rarityLabel(id) {
  return RARITY[id]?.label || id;
}

export function slotLabel(slot) {
  const c = canonicalSlot(slot);
  return SLOT_META[c]?.label || c;
}

export function slotShort(slot) {
  const c = canonicalSlot(slot);
  return SLOT_META[c]?.short || c?.slice(0, 4) || '?';
}

export function shouldDropOnKill(type) {
  if (type === 'boss') return true;
  if (type === 'patch') return Math.random() < 0.12;
  if (type === 'lag' || type === 'spoiler' || type === 'event') return Math.random() < 0.06;
  return false;
}
