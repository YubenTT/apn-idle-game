/** Boss gear drops — weapon & armor, permanent across seasons */

export const RARITY = {
  white: { id: 'white', label: 'Common', color: '#b8c0cc', weight: 52, affixes: 1, power: 1 },
  green: { id: 'green', label: 'Uncommon', color: '#3ecf8e', weight: 28, affixes: 1, power: 1.35 },
  blue: { id: 'blue', label: 'Rare', color: '#5eb0ff', weight: 14, affixes: 2, power: 1.75 },
  yellow: { id: 'yellow', label: 'Epic', color: '#e6b84d', weight: 5, affixes: 2, power: 2.25 },
  unique: { id: 'unique', label: 'Unique', color: '#fc1243', weight: 1, affixes: 3, power: 3 },
};

const WEAPON_NAMES = {
  white: ['Feed Lance', 'Patch Probe', 'Signal Stick'],
  green: ['Verify Beam', 'Mod Stick', 'Scan Lance'],
  blue: ['Live Tracker', 'Hotfix Rail', 'Trust Rifle'],
  yellow: ['Editor’s Edge', 'Season Core', 'Changelog'],
  unique: ['APN Eye', 'Host Visor', 'All Notes'],
};

const ARMOR_NAMES = {
  white: ['Draft Vest', 'Mod Hoodie', 'Intern Jacket'],
  green: ['Verified Shell', 'Live Coat', 'Patch Mail'],
  blue: ['Trust Plating', 'Source Guard', 'CDN Cloak'],
  yellow: ['Season Armor', 'Gate Plate', 'Launch Suit'],
  unique: ['Host Hide', 'Live Forever', 'Zero Downtime'],
};

/** Affix pools: { key, label, min, max, slot } — values scale with ilvl + rarity */
const AFFIX = {
  dmg_pct: { key: 'dmg_pct', label: 'Damage', unit: '%', min: 3, max: 9, slots: ['weapon'] },
  flat_dmg: { key: 'flat_dmg', label: 'Flat Dmg', unit: '', min: 2, max: 8, slots: ['weapon'] },
  crit_pct: { key: 'crit_pct', label: 'Crit', unit: '%', min: 1, max: 4, slots: ['weapon', 'armor'] },
  atk_spd: { key: 'atk_spd', label: 'Atk Speed', unit: '%', min: 2, max: 6, slots: ['weapon'] },
  signal_pct: { key: 'signal_pct', label: 'Signal', unit: '%', min: 3, max: 10, slots: ['armor'] },
  notes_pct: { key: 'notes_pct', label: 'Notes', unit: '%', min: 3, max: 10, slots: ['armor'] },
  energy: { key: 'energy', label: 'Energy', unit: '', min: 5, max: 18, slots: ['armor'] },
  e_regen: { key: 'e_regen', label: 'E-Regen', unit: '', min: 1, max: 4, slots: ['armor'] },
  move_pct: { key: 'move_pct', label: 'Move', unit: '%', min: 2, max: 7, slots: ['armor'] },
};

const UNIQUE_WEAPON = [
  { name: 'APN Eye', affixes: [{ key: 'dmg_pct', value: 18 }, { key: 'crit_pct', value: 6 }, { key: 'atk_spd', value: 8 }] },
  { name: 'Host Visor', affixes: [{ key: 'dmg_pct', value: 14 }, { key: 'flat_dmg', value: 22 }, { key: 'crit_pct', value: 5 }] },
];
const UNIQUE_ARMOR = [
  { name: 'Live Forever', affixes: [{ key: 'signal_pct', value: 16 }, { key: 'notes_pct', value: 14 }, { key: 'energy', value: 25 }] },
  { name: 'Zero Downtime', affixes: [{ key: 'move_pct', value: 12 }, { key: 'e_regen', value: 6 }, { key: 'crit_pct', value: 4 }] },
];

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function rollRarity(luck = 1) {
  // luck > 1 biases toward better tiers (bosses)
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

function rollAffix(slot, rarity, ilvl) {
  const pool = Object.values(AFFIX).filter((a) => a.slots.includes(slot));
  const def = pick(pool);
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

export function emptyGear() {
  return { weapon: null, armor: null, bag: [] };
}

/** Generate a random gear piece for zone (0-based). */
export function rollItem(zone, forcedSlot = null) {
  const ilvl = Math.max(1, (zone | 0) + 1);
  const luck = 1 + Math.min(1.4, ilvl / 50);
  const rarity = rollRarity(luck);
  const slot = forcedSlot || (Math.random() < 0.5 ? 'weapon' : 'armor');

  if (rarity.id === 'unique') {
    const u = pick(slot === 'weapon' ? UNIQUE_WEAPON : UNIQUE_ARMOR);
    const item = {
      id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      slot,
      rarity: 'unique',
      name: u.name,
      ilvl,
      affixes: u.affixes.map((a) => {
        const def = AFFIX[a.key];
        return {
          key: a.key,
          label: def?.label || a.key,
          unit: def?.unit || '',
          value: Math.round(a.value * (0.9 + Math.min(0.4, ilvl / 100)) * 10) / 10,
        };
      }),
    };
    item.score = scoreItem(item);
    return item;
  }

  const names = slot === 'weapon' ? WEAPON_NAMES : ARMOR_NAMES;
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
    id: `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    slot,
    rarity: rarity.id,
    name,
    ilvl,
    affixes,
  };
  item.score = scoreItem(item);
  return item;
}

/** Sum equipped affixes into a flat bonus map */
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
  for (const piece of [gear.weapon, gear.armor]) {
    if (!piece) continue;
    for (const a of piece.affixes || []) {
      if (a.key in b) b[a.key] += a.value;
    }
  }
  return b;
}

/**
 * Try to place item: auto-equip if better score, else bag.
 * Returns { equipped: boolean, replaced: item|null, item }
 */
/**
 * Place item: equip only if slot empty or strictly better score.
 * Never equips a worse piece. Overflow bag drops oldest.
 */
export function offerItem(gear, item, bagCap = 24) {
  if (!gear || !item) return { equipped: false, replaced: null, item };
  const slot = item.slot;
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
  const [item] = gear.bag.splice(idx, 1);
  const cur = gear[item.slot];
  gear[item.slot] = item;
  if (cur) gear.bag.unshift(cur);
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
 * Does not sell equipped pieces (must unequip first via bag swap).
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
  const cur = gear[item.slot];
  if (!cur) return true;
  return scoreItem(item) > scoreItem(cur);
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

/** Drop chance helpers */
export function shouldDropOnKill(type) {
  if (type === 'boss') return true;
  if (type === 'patch') return Math.random() < 0.12;
  if (type === 'lag' || type === 'spoiler' || type === 'event') return Math.random() < 0.06;
  return false;
}
