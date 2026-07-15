/** Brand gear — Weapon · Chest · Legs · Visor. Permanent. Sell junk for Signal. */

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
export const GEAR_SORTS = ['power', 'level', 'rarity'];
export const GEAR_FILTERS = ['all', 'upgrades', 'junk', ...SLOTS];

/**
 * Slot fantasy → real combat systems (no tank "Defense"):
 *  Weapon  → Damage / Crit / Atk Speed
 *  Chest   → Energy (sprint tank) / Notes / Signal
 *  Legs    → Sprint (move) / Atk Speed / Regen
 *  Visor   → Crit / Signal / Damage
 */
export const SLOT_META = {
  weapon: {
    id: 'weapon',
    label: 'Weapon',
    short: 'Wpn',
    primary: 'Damage',
    /** Affix keys preferred for card primary (order = priority) */
    primaryKeys: ['dmg_pct', 'flat_dmg', 'crit_pct', 'atk_spd'],
  },
  chest: {
    id: 'chest',
    label: 'Chest',
    short: 'Chest',
    primary: 'Energy',
    primaryKeys: ['energy', 'notes_pct', 'signal_pct'],
  },
  legs: {
    id: 'legs',
    label: 'Legs',
    short: 'Legs',
    primary: 'Sprint',
    primaryKeys: ['move_pct', 'atk_spd', 'e_regen'],
  },
  visor: {
    id: 'visor',
    label: 'Visor',
    short: 'Visor',
    primary: 'Crit',
    primaryKeys: ['crit_pct', 'signal_pct', 'dmg_pct'],
  },
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
 * Affixes — only stats the combat loop actually uses.
 * Display label = game language (no fake "Defense").
 *
 * weapon: hit harder / crit / swing faster
 * chest:  bigger energy pool, more Notes & Signal from kills
 * legs:   march faster, attack a bit faster, regen while sprinting
 * visor:  crit + Signal read + light damage
 */
const AFFIX = {
  dmg_pct: {
    key: 'dmg_pct',
    label: 'Damage',
    unit: '%',
    min: 4,
    max: 14,
    slots: ['weapon', 'visor'],
  },
  flat_dmg: {
    key: 'flat_dmg',
    label: 'Damage',
    unit: '',
    min: 5,
    max: 24,
    slots: ['weapon'],
  },
  crit_pct: {
    key: 'crit_pct',
    label: 'Crit',
    unit: '%',
    min: 1.5,
    max: 7,
    slots: ['weapon', 'visor'],
  },
  atk_spd: {
    key: 'atk_spd',
    label: 'Atk Speed',
    unit: '%',
    min: 3,
    max: 10,
    slots: ['weapon', 'legs'],
  },
  signal_pct: {
    key: 'signal_pct',
    label: 'Signal',
    unit: '%',
    min: 5,
    max: 18,
    slots: ['chest', 'visor'],
  },
  notes_pct: {
    key: 'notes_pct',
    label: 'Notes',
    unit: '%',
    min: 5,
    max: 16,
    slots: ['chest'],
  },
  energy: {
    key: 'energy',
    label: 'Energy',
    unit: '',
    min: 10,
    max: 32,
    slots: ['chest'],
  },
  e_regen: {
    key: 'e_regen',
    label: 'Regen',
    unit: '',
    min: 1,
    max: 5,
    slots: ['legs'],
  },
  move_pct: {
    key: 'move_pct',
    label: 'Sprint',
    unit: '%',
    min: 5,
    max: 16,
    slots: ['legs'],
  },
};

/** Guaranteed first affix per slot so primary card always makes sense */
const SLOT_SIGNATURE = {
  weapon: 'dmg_pct',
  chest: 'energy',
  legs: 'move_pct',
  visor: 'crit_pct',
};

const UNIQUE_BY_SLOT = {
  weapon: [
    {
      name: 'APN Eye',
      affixes: [
        { key: 'dmg_pct', value: 18 },
        { key: 'crit_pct', value: 7 },
        { key: 'atk_spd', value: 8 },
      ],
    },
    {
      name: 'Host Beam',
      affixes: [
        { key: 'dmg_pct', value: 14 },
        { key: 'flat_dmg', value: 22 },
        { key: 'crit_pct', value: 5 },
      ],
    },
  ],
  chest: [
    {
      name: 'Live Forever',
      affixes: [
        { key: 'energy', value: 30 },
        { key: 'notes_pct', value: 14 },
        { key: 'signal_pct', value: 12 },
      ],
    },
    {
      name: 'Zero Downtime',
      affixes: [
        { key: 'energy', value: 26 },
        { key: 'signal_pct', value: 14 },
        { key: 'notes_pct', value: 10 },
      ],
    },
  ],
  legs: [
    {
      name: 'Host Stride',
      affixes: [
        { key: 'move_pct', value: 16 },
        { key: 'atk_spd', value: 8 },
        { key: 'e_regen', value: 5 },
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
        { key: 'crit_pct', value: 9 },
        { key: 'signal_pct', value: 16 },
        { key: 'dmg_pct', value: 8 },
      ],
    },
    {
      name: 'Zero Lag Lens',
      affixes: [
        { key: 'crit_pct', value: 8 },
        { key: 'signal_pct', value: 14 },
        { key: 'dmg_pct', value: 10 },
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

function rollAffixValue(def, rarity, ilvl) {
  const t = Math.min(1, ilvl / 80);
  const base = def.min + (def.max - def.min) * (0.35 + t * 0.65);
  const mult = rarity.power * (0.85 + Math.random() * 0.3);
  let value = base * mult;
  if (def.unit === '%') value = Math.round(value * 10) / 10;
  else value = Math.round(value);
  return { key: def.key, label: def.label, unit: def.unit, value };
}

function rollAffix(slot, rarity, ilvl, exclude = new Set()) {
  const pool = Object.values(AFFIX).filter(
    (a) => a.slots.includes(slot) && !exclude.has(a.key)
  );
  const def = pick(pool.length ? pool : Object.values(AFFIX).filter((a) => a.slots.includes(slot)));
  if (!def) return null;
  return rollAffixValue(def, rarity, ilvl);
}

function rollSignatureAffix(slot, rarity, ilvl) {
  const key = SLOT_SIGNATURE[slot] || 'dmg_pct';
  const def = AFFIX[key];
  if (!def) return rollAffix(slot, rarity, ilvl);
  return rollAffixValue(def, rarity, ilvl);
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

/** Normalize any save/runtime gear blob into brand 4-slot shape + fix legacy stats */
export function normalizeGear(raw) {
  const g = emptyGear();
  if (!raw || typeof raw !== 'object') return g;

  for (const slot of SLOTS) {
    let piece = raw[slot] || null;
    if (!piece && slot === 'chest' && raw.armor) piece = raw.armor;
    if (!piece && slot === 'visor' && raw.head) piece = raw.head;
    if (!piece && slot === 'legs' && raw.boots) piece = raw.boots;
    if (!piece && slot === 'visor' && raw.trinket) piece = raw.trinket;
    if (piece) {
      piece = sanitizeItem({ ...piece, slot: piece.slot || slot });
      if (piece.slot !== slot) piece = { ...piece, slot };
      if (!g[slot]) g[slot] = piece;
      else g.bag.push(piece);
    }
  }

  const bagIn = Array.isArray(raw.bag) ? raw.bag : [];
  g.bag = [...g.bag, ...bagIn.map((it) => sanitizeItem(migrateItem(it))).filter(Boolean)];
  const seen = new Set();
  g.bag = g.bag.filter((it) => {
    if (!it?.id || seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
  return g;
}

/**
 * Card primary line — slot-priority first, then strongest remaining.
 * Always uses real labels: Damage · Crit · Energy · Sprint · Signal · Notes · Regen · Atk Speed
 * Never invents "Defense".
 */
export function primaryStat(item) {
  const slot = item?.slot;
  const meta = SLOT_META[slot];
  const fb = meta?.primary || 'Damage';
  if (!item?.affixes?.length) {
    return { value: 0, brand: fb, text: `+0 ${fb}`, key: null };
  }

  const byKey = Object.fromEntries(item.affixes.map((a) => [a.key, a]));
  // Prefer slot signature order (e.g. weapon always shows Damage if present)
  for (const key of meta?.primaryKeys || []) {
    const a = byKey[key];
    if (!a) continue;
    const label = AFFIX[key]?.label || a.label || fb;
    const val = a.unit === '%' ? Math.round(a.value * 10) / 10 : Math.round(a.value);
    const suffix = a.unit === '%' ? '%' : '';
    return { value: val, brand: label, text: `+${val}${suffix} ${label}`, key };
  }

  // Fallback: first affix with real label
  const a = item.affixes[0];
  const label = AFFIX[a.key]?.label || a.label || fb;
  const val = a.unit === '%' ? Math.round(a.value * 10) / 10 : Math.round(a.value);
  const suffix = a.unit === '%' ? '%' : '';
  return { value: val, brand: label, text: `+${val}${suffix} ${label}`, key: a.key };
}

/** Sanitize saved items: drop unknown keys, fix labels, no Defense branding */
export function sanitizeItem(item) {
  if (!item || typeof item !== 'object') return item;
  item = migrateItem(item);
  item.junk = item.junk === true;
  if (!Array.isArray(item.affixes)) return item;
  const cleaned = [];
  for (const a of item.affixes) {
    const def = AFFIX[a.key];
    if (!def) continue;
    // drop affixes that don't belong on this slot (legacy mess)
    if (!def.slots.includes(item.slot)) continue;
    cleaned.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      value: a.value,
    });
  }
  // ensure signature exists if empty after clean
  if (!cleaned.length) {
    const sig = SLOT_SIGNATURE[item.slot] || 'dmg_pct';
    const def = AFFIX[sig];
    if (def) {
      cleaned.push({
        key: def.key,
        label: def.label,
        unit: def.unit,
        value: def.min + Math.round((item.ilvl || 1) * 0.3),
      });
    }
  }
  item.affixes = cleaned;
  item.score = scoreItem(item);
  return item;
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
  // First affix = slot signature (Weapon→Damage, Chest→Energy, Legs→Sprint, Visor→Crit)
  const sig = rollSignatureAffix(slot, rarity, ilvl);
  if (sig) {
    affixes.push(sig);
    used.add(sig.key);
  }
  for (let i = affixes.length; i < n; i++) {
    const a = rollAffix(slot, rarity, ilvl, used);
    if (!a) break;
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
  item = sanitizeItem(migrateItem(item));
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
  const item = sanitizeItem(migrateItem(raw));
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

export function toggleJunk(gear, itemId) {
  const item = gear?.bag?.find((entry) => entry.id === itemId);
  if (!item) return null;
  item.junk = item.junk !== true;
  return item.junk;
}

/** Stable collection query. View preferences never alter bag ownership/order. */
export function queryGearBag(gear, options = {}) {
  const filter = GEAR_FILTERS.includes(options.filter) ? options.filter : 'all';
  const sort = GEAR_SORTS.includes(options.sort) ? options.sort : 'power';
  let items = [...(gear?.bag || [])];
  if (filter === 'junk') items = items.filter((item) => item.junk === true);
  else if (filter === 'upgrades') items = items.filter((item) => isUpgrade(gear, item));
  else if (SLOTS.includes(filter)) items = items.filter((item) => canonicalSlot(item.slot) === filter);

  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    let delta = 0;
    if (sort === 'level') delta = (b.item.ilvl || 0) - (a.item.ilvl || 0);
    else if (sort === 'rarity') delta = (RARITY[b.item.rarity]?.order || 0) - (RARITY[a.item.rarity]?.order || 0);
    else delta = scoreItem(b.item) - scoreItem(a.item);
    return delta || a.index - b.index;
  });
  return indexed.map(({ item }) => item);
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
