import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packsRoot = path.join(root, 'assets/game-packs');

const PACKS = [
  ['valorant', 'Valorant', 'tactical-shooter', ['Entry Duelist', 'Smoke Controller', 'Recon Initiator', 'Site Sentinel', 'Spike Courier'], 'Radiant Protocol'],
  ['league', 'League of Legends', 'moba', ['Lane Scout', 'Jungle Stalker', 'Siege Minion', 'River Support', 'Nexus Herald'], 'Baron Patch'],
  ['fortnite', 'Fortnite', 'battle-royale', ['Storm Runner', 'Build Raider', 'Supply Scout', 'Glider Hunter', 'Mythic Guard'], 'Zero-Point Warden'],
  ['world-of-warcraft', 'World of Warcraft', 'mmorpg', ['Kobold Scout', 'Plague Caster', 'Iron Raider', 'Arcane Keeper', 'Raid Champion'], 'Lich Gatekeeper'],
  ['fc-26', 'EA Sports FC 26', 'sports-football', ['Wing Runner', 'Pressing Midfielder', 'Set-Piece Specialist', 'Sweeper Keeper', 'Captain Card'], 'Ultimate XI'],
  ['minecraft', 'Minecraft', 'sandbox-survival', ['Block Scout', 'Blast Blocker', 'Skeleton Archer', 'End Walker', 'Redstone Golem'], 'Ender Titan'],
  ['counter-strike-2', 'Counter-Strike 2', 'tactical-shooter', ['Entry Fragger', 'Smoke Anchor', 'AWP Watcher', 'Eco Rusher', 'Defuse Specialist'], 'Global Sentinel'],
  ['old-school-runescape', 'Old School RuneScape', 'mmorpg', ['Goblin Scout', 'Rune Archer', 'Hill Giant', 'Abyssal Stalker', 'Barrows Guardian'], 'Jad Gate'],
  ['nba-2k26', 'NBA 2K26', 'sports-basketball', ['Rim Runner', 'Perimeter Lock', 'Stretch Shooter', 'Floor General', 'Sixth-Man Card'], 'MyCareer Legend'],
  ['overwatch', 'Overwatch', 'hero-shooter', ['Flank Runner', 'Shield Tank', 'Support Drone', 'Rail Sharpshooter', 'Payload Guard'], 'Omnic Colossus'],
  ['grand-theft-auto-v', 'Grand Theft Auto V', 'open-world-action', ['Street Runner', 'Heist Wheelman', 'Tactical Enforcer', 'Chop-Shop Bruiser', 'Skyline Pilot'], 'Five-Star Juggernaut'],
  ['madden-nfl-26', 'Madden NFL 26', 'sports-football', ['Route Runner', 'Pass Rusher', 'Field General', 'Lockdown Corner', 'Special Teams Ace'], 'Franchise Champion'],
  ['apex-legends', 'Apex Legends', 'battle-royale', ['Phase Skirmisher', 'Tracker Scout', 'Shield Support', 'Zipline Hunter', 'Care-Package Guard'], 'Apex Predator'],
  ['dota-2', 'Dota 2', 'moba', ['Lane Creep', 'Roaming Support', 'Jungle Beast', 'Core Duelist', 'Ancient Guard'], 'Roshan Protocol'],
  ['dead-by-daylight', 'Dead by Daylight', 'asymmetric-horror', ['Fog Runner', 'Hook Warden', 'Generator Shade', 'Totem Stalker', 'Trial Survivor'], 'Entity Hand'],
  ['path-of-exile-2', 'Path of Exile 2', 'action-rpg', ['Exile Scout', 'Corrupted Archer', 'Vaal Construct', 'Map Stalker', 'Ascendant Guard'], 'Atlas Devourer'],
  ['marvel-rivals', 'Marvel Rivals', 'hero-shooter', ['Vanguard', 'Duelist', 'Strategist', 'Portal Scout', 'Cosmic Guard'], 'Multiverse Sentinel'],
  ['escape-from-tarkov', 'Escape from Tarkov', 'extraction-shooter', ['Scav Scout', 'Armored Raider', 'Marksman', 'Breach Operator', 'Extraction Guard'], 'Labs Overseer'],
  ['rocket-league', 'Rocket League', 'sports-driving', ['Boost Striker', 'Aerial Defender', 'Demo Chaser', 'Wall Rider', 'Goalkeeper'], 'Supersonic Titan'],
  ['elden-ring', 'Elden Ring', 'action-rpg', ['Wandering Soldier', 'Glintstone Adept', 'Grafted Hound', 'Crucible Guard', 'Black-Knife Shade'], 'Elden Gate Sovereign'],
];

const roles = ['common-a', 'common-b', 'common-c', 'elite', 'event'];
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

for (const [index, [id, title, genre, labels, bossLabel]] of PACKS.entries()) {
  const dir = path.join(packsRoot, id);
  const targetBase = `assets/game-packs/${id}`;
  const manifest = {
    id,
    order: index + 1,
    title,
    genre,
    zones: 10,
    targets: labels.map((label, targetIndex) => ({
      id: slug(label),
      role: roles[targetIndex],
      label,
      frame: roles[targetIndex],
      pivot: { x: 0.5, y: 1 },
    })),
    boss: {
      id: slug(bossLabel),
      label: bossLabel,
      frame: 'boss',
      breakFrame: 'boss-break',
      pivot: { x: 0.5, y: 1 },
    },
    assets: {
      background: `${targetBase}/background.webp`,
      targets: `${targetBase}/targets.webp`,
      targetData: `${targetBase}/targets.json`,
      props: `${targetBase}/props.webp`,
      corruptionMask: `${targetBase}/corruption-mask.webp`,
    },
    sourceBoard: `${targetBase}/source-board.md`,
    corruptionMasks: ['signal-drift', 'corrupted', 'overrun', 'zero-day'],
  };
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'pack.json');
  if (fs.existsSync(file) && !process.argv.includes('--force')) {
    throw new Error(`Refusing to overwrite ${path.relative(root, file)} without --force`);
  }
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`WROTE ${PACKS.length} Clean Era manifests`);
