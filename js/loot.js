/** Multi-slot gear — permanent across seasons. Sell junk for Signal; buy boxes with coins. */

export const RARITY = {
  white: { id: 'white', label: 'Common', color: '#b8c0cc', weight: 52, affixes: 1, power: 1, order: 0 },
  green: { id: 'green', label: 'Uncommon', color: '#3ecf8e', weight: 28, affixes: 1, power: 1.35, order: 1 },
  blue: { id: 'blue', label: 'Rare', color: '#5eb0ff', weight: 14, affixes: 2, power: 1.75, order: 2 },
  yellow: { id: 'yellow', label: 'Epic', color: '#e6b84d', weight: 5, affixes: 2, power: 2.25, order: 3 },
  unique: { id: 'unique', label: 'Unique', color: '#fc1243', weight: 1, affixes: 3, power: 3, order: 4 },
};

/** Equipment slots (paper-doll order for UI) */
export const SLOTS = ['weapon', 'head', 'chest', 'legs', 'boots', 'trinket'];

export const SLOT_META = {
  weapon: { id: 'weapon', label: 'Weapon', short: 'Wpn' },
  head: { id: 'head', label: 'Head', short: 'Head' },
  chest: { id: 'chest', label: 'Chest', short: 'Chest' },
  legs: { id: 'legs', label: 'Legs', short: 'Legs' },
  boots: { id: 'boots', label: 'Boots', short: 'Boots' },
  trinket: { id: 'trinket', label: 'Trinket', short: 'Trink' },
};

const SLOT_NAMES = {
  weapon: {
    white: ['Feed Lance', 'Patch Probe', 'Signal Stick'],
    green: ['Verify Beam', 'Mod Stick', 'Scan Lance'],
    blue: ['Live Tracker', 'Hotfix Rail', 'Trust Rifle'],
    yellow: ["Editor's Edge", 'Season Core', 'Changelog'],
    unique: ['APN Eye', 'Host Visor', 'All Notes'],
  },
  head: {
    white: ['Draft Cap', 'Mod Beanie', 'Intern Hood'],
    green: ['Verify Visor', 'Scan Cap', 'Patch Lid'],
    blue: ['Trust Helm', 'Source Goggles', 'CDN Hood'],
    yellow: ['Season Crown', 'Gate Visor', 'Launch Helm'],
    unique: ['Host Crown', 'All-Seeing Cap', 'Zero Lag Lid'],
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
    green: ['Verify Greaves', 'Live Pants', 'Patch Legs'],
    blue: ['Trust Plates', 'Source Greaves', 'CDN Leggings'],
    yellow: ['Season Greaves', 'Gate Legs', 'Launch Pants'],
    unique: ['Host Stride', 'Never Stuck', 'Full Uptime'],
  },
  boots: {
    white: ['Draft Soles', 'Mod Runners', 'Intern Boots'],
    green: ['Verify Boots', 'Live Soles', 'Patch Runners'],
    blue: ['Trust Treads', 'Source Boots', 'CDN Soles'],
    yellow: ['Season Boots', 'Gate Treads', 'Launch Soles'],
    unique: ['Host Dash', 'Instant Load', 'Zero Ping'],
  },
  trinket: {
    white: ['Draft Pin', 'Mod Badge', 'Intern Token'],
    green: ['Verify Badge', 'Live Pin', 'Patch Charm'],
    blue: ['Trust Core', 'Source Seal', 'CDN Token'],
    yellow: ['Season Seal', 'Gate Core', 'Launch Badge'],
    unique: ['Host Mark', 'Pro Emblem', 'APN Seal'],
  },
};

/** Affix pools — slot-tagged for meaningful loadouts */
const AFFIX = {
  dmg_pct: { key: 'dmg_pct', label: 'Damage', unit: '%', min: 3, max: 9, slots: ['weapon', 'trinket'] },
  flat_dmg: { key: 'flat_dmg', label: 'Flat Dmg', unit: '', min: 2, max: 8, slots: ['weapon', 'chest'] },
  crit_pct: { key: 'crit_pct', label: 'Crit', unit: '%', min: 1, max: 4, slots: ['weapon', 'head', 'trinket'] },
  atk_spd: { key: 'atk_spd', label: 'Atk Speed', unit: '%', min: 2, max: 6, slots: ['weapon', 'boots'] },
  signal_pct: { key: 'signal_pct', label: 'Signal', unit: '%', min: 3, max: 10, slots: ['chest', 'head', 'trinket'] },
  notes_pct: { key: 'notes_pct', label: 'Notes', unit: '%', min: 3, max: 10, slots: ['chest', 'legs', 'trinket'] },
  energy: { key: 'energy', label: 'Energy', unit: '', min: 5, max: 18, slots: ['chest', 'head', 'legs'] },
  e_regen: { key: 'e_regen', label: 'E-Regen', unit: '', min: 1, max: 4, slots: ['boots', 'head', 'legs'] },
  move_pct: { key: 'move_pct', label: 'Move', unit: '%', min: 2, max: 7, slots: ['boots', 'legs'] },
};

const UNIQUE_BY_SLOT = {
  weapon: [
    { name: 'APN Eye', affixes: [{ key: 'dmg_pct', value: 18 }, { key: 'crit_pct', value: 6 }, { key: 'atk_spd', value: 8 }] },
    { name: 'Host Visor', affixes: [{ key: 'dmg_pct', value: 14 }, { key: 'flat_dmg', value: 22 }, { key: 'crit_pct', value: 5 }] },
  ],
  head: [
    { name: 'Host Crown', affixes: [{ key: 'crit_pct', value: 7 }, { key: 'energy', value: 22 }, { key: 'signal_pct', value: 12 }] },
    { name: 'All-Seeing Cap', affixes: [{ key: 'crit_pct', value: 8 }, { key: 'e_regen', value: 5 }, { key: 'energy', value: 18 }] },
  ],
  chest: [
    { name: 'Live Forever', affixes: [{ key: 'signal_pct', value: 16 }, { key: 'notes_pct', value: 14 }, { key: 'energy', value: 25 }] },
    { name: 'Zero Downtime', affixes: [{ key: 'flat_dmg', value: 16 }, { key: 'energy', value: 20 }, { key: 'signal_pct', value: 12 }] },
  ],
  legs: [
    { name: 'Host Stride', affixes: [{ key: 'move_pct', value: 10 }, { key: 'notes_pct', value: 14 }, { key: 'energy', value: 16 }] },
    { name: 'Never Stuck', affixes: [{ key: 'notes_pct', value: 16 }, { key: 'e_regen', value: 5 }, { key: 'move_pct', value: 8 }] },
  ],
  boots: [
    { name: 'Host Dash', affixes: [{ key: 'move_pct', value: 14 }, { key: 'atk_spd', value: 8 }, { key: 'e_regen', value: 6 }] },
    { name: 'Zero Ping', affixes: [{ key: 'move_pct', value: 12 }, { key: 'e_regen', value: 7 }, { key: 'atk_spd', value: 6 }] },
  ],
  trinket: [
    { name: 'Host Mark', affixes: [{ key: 'dmg_pct', value: 12 }, { key: 'crit_pct', value: 5 }, { key: 'signal_pct', value: 10 }] },
    { name: 'APN Seal', affixes: [{ key: 'dmg_pct', value: 10 }, { key: 'notes_pct', value: 12 }, { key: 'crit_pct', value: 4 }] },
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
  return { key: def.key, label: def.label, unit: def.unit, value };
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
      unit: def?.unit || '',
      value: Math.round(a.value * (0.9 + Math.min(0.4, ilvl / 100)) * 10) / 10,
    };
  });
}

/** Migrate legacy `armor` → `chest` and invalid slots */
export function migrateItem(item) {
  if (!item || typeof item !== 'object') return item;
  let slot = item.slot;
  if (slot === 'armor') slot = 'chest';
  if (!SLOTS.includes(slot)) slot = 'chest';
  if (slot === item.slot) return item;
  return { ...item, slot };
}

export function emptyGear() {
  return {
    weapon: null,
    head: null,
    chest: null,
    legs: null,
    boots: null,
    trinket: null,
    bag: [],
  };
}

/** Normalize any save/runtime gear blob into full multi-slot shape */
export function normalizeGear(raw) {
  const g = emptyGear();
  if (!raw || typeof raw !== 'object') return g;
  for (const slot of SLOTS) {
    let piece = raw[slot] || null;
    if (slot === 'chest' && !piece && raw.armor) piece = raw.armor;
    if (piece) {
      piece = migrateItem(piece);
      if (piece.slot !== slot) piece = { ...piece, slot };
      g[slot] = piece;
    }
  }
  g.bag = Array.isArray(raw.bag) ? raw.bag.map(migrateItem).filter(Boolean) : [];
  return g;
}

/**
 * Generate a gear piece.
 * @param {number} zone 0-based zone
 * @param {string|null} forcedSlot
 * @param {{ luck?: number, minRarity?: string }} [opts]
 */
export function rollItem(zone, forcedSlot = null, opts = {}) {
  const ilvl = Math.max(1, (zone | 0) + 1);
  const baseLuck = 1 + Math.min(1.4, ilvl / 50);
  const luck = opts.luck != null ? opts.luck : baseLuck;
  let rarity = rollRarity(luck);
  rarity = floorRarity(rarity, opts.minRarity);

  let slot = forcedSlot;
  if (slot === 'armor') slot = 'chest';
  if (!slot || !SLOTS.includes(slot)) slot = pick(SLOTS);

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

/** Prefer empty slots when rolling box/loadout rewards */
export function pickSlotForGear(gear, preferEmpty = true) {
  if (preferEmpty && gear) {
    const empty = SLOTS.filter((s) => !gear[s]);
    if (empty.length) return pick(empty);
  }
  return pick(SLOTS);
}

/** Sum equipped affixes across all slots */
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
 * Place item: equip only if slot empty or strictly better score.
 * Never equips a worse piece. Overflow bag drops oldest.
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

/** Move equipped piece into bag (if room) */
export function unequipSlot(gear, slot, bagCap = 24) {
  if (!gear || !SLOTS.includes(slot) || !gear[slot]) return false;
  gear.bag = gear.bag || [];
  if (gear.bag.length >= bagCap) return false;
  gear.bag.unshift(gear[slot]);
  gear[slot] = null;
  return true;
}

/** Sell bag item → Signal (season soft currency). Higher rarity pays more. */
export function sellValue(item) {
  if (!item) return 0;
  const p = RARITY[item.rarity]?.power || 1;
  const base = 6 + (item.ilvl | 0) * 1.4;
  return Math.max(4, Math.round(base * p * (item.rarity === 'unique' ? 1.35 : 1)));
}

/**
 * Remove item from bag and return sell value, or null if missing.
 * Does not sell equipped pieces (unequip first).
 */
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
  return SLOT_META[slot]?.label || (slot === 'armor' ? 'Chest' : slot);
}

export function slotShort(slot) {
  return SLOT_META[slot]?.short || slot?.slice(0, 3) || '?';
}

/** Drop chance helpers */
export function shouldDropOnKill(type) {
  if (type === 'boss') return true;
  if (type === 'patch') return Math.random() < 0.12;
  if (type === 'lag' || type === 'spoiler' || type === 'event') return Math.random() < 0.06;
  return false;
}
