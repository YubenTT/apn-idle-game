import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { convertWebp } from './convert-webp.mjs';
import { stableJson } from './lib.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packsRoot = path.join(root, 'assets/game-packs');
const RSVG = '/opt/homebrew/bin/rsvg-convert';
const INK = '#07111d';
const SHADOW = '#03070d';

const ART = Object.freeze({
  valorant: { palette: ['#ff4655', '#79e6f2', '#182a3d'], space: 'tactical', forms: ['duelist', 'controller', 'recon', 'sentinel', 'courier', 'mech'] },
  league: { palette: ['#c99b3b', '#29a3a3', '#282447'], space: 'river', forms: ['blade', 'caster', 'cannon', 'golem', 'beast', 'serpent'] },
  fortnite: { palette: ['#8d55e8', '#43d6dc', '#24304f'], space: 'storm', forms: ['guard', 'cube', 'llama', 'raptor', 'heavy', 'storm'] },
  'world-of-warcraft': { palette: ['#63b8d6', '#7b58b8', '#1e2d43'], space: 'ice', forms: ['ghoul', 'geist', 'vrykul', 'brute', 'knight', 'king'] },
  'fc-26': { palette: ['#d8b656', '#58c78f', '#152d27'], space: 'stadium', forms: ['keeper', 'defender', 'midfielder', 'winger', 'striker', 'captain'] },
  minecraft: { palette: ['#74b94f', '#9a79c7', '#293922'], space: 'blocks', forms: ['block', 'archer', 'creeper', 'tall', 'golem', 'dragon'] },
  'counter-strike-2': { palette: ['#d7a15f', '#5c9ad4', '#2d2b2c'], space: 'tactical', forms: ['entry', 'anchor', 'sniper', 'support', 'carrier', 'juggernaut'] },
  'old-school-runescape': { palette: ['#e27832', '#8c5b42', '#2c2020'], space: 'lava', forms: ['imp', 'shell', 'ranger', 'brute', 'mage', 'jad'] },
  'nba-2k26': { palette: ['#e0a34c', '#c0608a', '#241c33'], space: 'court', forms: ['guard', 'shooter', 'wing', 'forward', 'center', 'trio'] },
  overwatch: { palette: ['#e9a24f', '#6dc6e6', '#263249'], space: 'future', forms: ['drone', 'trooper', 'stalker', 'artillery', 'charger', 'nemesis'] },
  'grand-theft-auto-v': { palette: ['#d35f74', '#65b79a', '#252636'], space: 'heist', forms: ['guard', 'biker', 'enforcer', 'officer', 'driver', 'vault'] },
  'madden-nfl-26': { palette: ['#b9d7ef', '#76a34b', '#172635'], space: 'stadium', forms: ['corner', 'safety', 'linebacker', 'end', 'tackle', 'runner'] },
  'apex-legends': { palette: ['#da584c', '#d9aa63', '#30262a'], space: 'industrial', forms: ['tick', 'spider', 'prowler', 'spectre', 'recon', 'revenant'] },
  'dota-2': { palette: ['#ba5b4f', '#6aa784', '#2a2630'], space: 'river', forms: ['blade', 'caster', 'cannon', 'satyr', 'tormentor', 'roshan'] },
  'dead-by-daylight': { palette: ['#a94e5d', '#8b91a0', '#211d29'], space: 'fog', forms: ['crow', 'claw', 'generator', 'shade', 'echo', 'trapper'] },
  'path-of-exile-2': { palette: ['#b44d35', '#d18345', '#2f2021'], space: 'ruin', forms: ['undead', 'bone', 'beast', 'cultist', 'executioner', 'arbiter'] },
  'marvel-rivals': { palette: ['#e64858', '#57bce8', '#2b2548'], space: 'chrono', forms: ['acrobat', 'ranger', 'flyer', 'blade', 'brute', 'doom'] },
  'escape-from-tarkov': { palette: ['#a7956e', '#6f8069', '#242924'], space: 'mall', forms: ['scav', 'raider', 'rogue', 'pmc', 'cultist', 'killa'] },
  'rocket-league': { palette: ['#4da9e8', '#e87936', '#172a42'], space: 'arena', forms: ['car', 'car', 'car', 'car', 'car', 'champion-car'] },
  'elden-ring': { palette: ['#c5a35a', '#788660', '#29291f'], space: 'castle', forms: ['noble', 'imp', 'hawk', 'soldier', 'troll', 'grafted'] },
});

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const hash = (value) => [...value].reduce((total, char) => ((total * 33) ^ char.charCodeAt(0)) >>> 0, 2166136261);
const seeded = (seed, index, max) => ((hash(`${seed}:${index}`) % 10000) / 10000) * max;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
const outlined = (body, fill, stroke = INK, width = 5) => `<g fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

function skyline(pack, art) {
  const [accent, secondary, base] = art.palette;
  const seed = pack.id;
  const distant = Array.from({ length: 13 }, (_, i) => {
    const w = 36 + seeded(seed, i, 55);
    const h = 90 + seeded(seed, i + 20, 250);
    const x = i * 66 - 30;
    const top = 645 - h;
    const cap = art.space === 'castle' || art.space === 'ice' ? `${x + w / 2},${top - 45} ${x + w},${top}` : `${x},${top} ${x + w},${top}`;
    return `<path d="M${x} 650V${top}L${cap}V650Z" fill="${i % 2 ? '#101f30' : '#13263a'}" stroke="${INK}" stroke-width="4"/>`;
  }).join('');
  const lights = Array.from({ length: 18 }, (_, i) => `<rect x="${20 + seeded(seed, i + 50, 720)}" y="${250 + seeded(seed, i + 80, 360)}" width="4" height="8" rx="2" fill="${i % 3 ? secondary : accent}" opacity=".55"/>`).join('');
  const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${seeded(seed, i + 100, 768)}" cy="${seeded(seed, i + 140, 300)}" r="${1 + (i % 2)}" fill="${secondary}" opacity=".35"/>`).join('');
  const motif = {
    tactical: `<path d="M40 620H728M190 550h390M310 480h150" stroke="${secondary}" stroke-width="4" opacity=".55"/><path d="M620 310l55 30-55 30z" fill="none" stroke="${accent}" stroke-width="6"/>`,
    river: `<path d="M0 690C180 610 300 750 768 620V780H0Z" fill="#153642"/><path d="M40 650C250 580 430 730 730 610" fill="none" stroke="${secondary}" stroke-width="8" opacity=".7"/>`,
    storm: `<path d="M0 250C160 190 240 300 390 220S650 300 768 190" fill="none" stroke="${accent}" stroke-width="20" opacity=".25"/><path d="M650 90l-60 130 80-40-35 110" fill="none" stroke="${secondary}" stroke-width="8"/>`,
    ice: `<path d="M70 650l80-270 75 270 85-330 90 330 95-250 80 250z" fill="#213955" stroke="${INK}" stroke-width="6"/><path d="M90 610l60-185 22 100M330 570l60-180" fill="none" stroke="${secondary}" stroke-width="5" opacity=".65"/>`,
    stadium: `<path d="M40 520Q384 260 728 520V680H40Z" fill="#14283a" stroke="${INK}" stroke-width="8"/><path d="M80 510Q384 310 688 510" fill="none" stroke="${secondary}" stroke-width="14" stroke-dasharray="6 15"/><path d="M80 660h608" stroke="${accent}" stroke-width="4"/>`,
    blocks: `<path d="M0 590h120v-90h100v90h110V430h130v160h110V500h120v90h98v120H0Z" fill="#19364a" stroke="${INK}" stroke-width="6"/><rect x="550" y="190" width="65" height="65" fill="${secondary}" opacity=".55"/>`,
    lava: `<path d="M0 600l120-180 90 130 120-260 110 260 120-190 130 240 78-90v240H0Z" fill="#241d26" stroke="${INK}" stroke-width="7"/><path d="M20 680l120-35 80 25 150-45 120 50 160-60 118 30" fill="none" stroke="${accent}" stroke-width="12"/>`,
    court: `<path d="M70 680V410h120v270M578 680V410h120v270" fill="none" stroke="${secondary}" stroke-width="8"/><path d="M120 455h90v65h-90M558 455h90v65h-90" fill="none" stroke="${accent}" stroke-width="7"/>`,
    future: `<path d="M30 650L120 360h170l70 290M410 650l90-390h160l80 390" fill="#162b41" stroke="${INK}" stroke-width="7"/><path d="M120 410h150M510 320h125" stroke="${secondary}" stroke-width="8"/>`,
    heist: `<path d="M80 650v-270h250v270M440 650V300h250v350" fill="#18263a" stroke="${INK}" stroke-width="7"/><circle cx="565" cy="500" r="82" fill="none" stroke="${accent}" stroke-width="10"/><circle cx="565" cy="500" r="22" fill="none" stroke="${secondary}" stroke-width="6"/>`,
    industrial: `<path d="M60 650V350h120v300M230 650V430h170v220M470 650V300h220v350" fill="#1c2936" stroke="${INK}" stroke-width="7"/><path d="M100 360V220h40v130M530 300V170h45v130" stroke="${accent}" stroke-width="7"/>`,
    fog: `<path d="M0 620C120 540 220 660 340 580S560 620 768 520V760H0Z" fill="#202533"/><path d="M20 470C190 410 300 520 470 430s230 20 290-20" fill="none" stroke="#758093" stroke-width="20" opacity=".25"/>`,
    ruin: `<path d="M20 650V410l85-80 70 80v240M230 650V330h180v320M470 650V390l100-120 115 120v260" fill="#2b2630" stroke="${INK}" stroke-width="8"/><path d="M300 650l40-170 35 170M560 650l40-220" stroke="${accent}" stroke-width="9" opacity=".7"/>`,
    chrono: `<path d="M80 620l120-320 70 190 120-300 90 280 110-220 110 370z" fill="#222b48" stroke="${INK}" stroke-width="7"/><path d="M90 200l110 45-70 70zM540 170l140 65-90 80z" fill="none" stroke="${secondary}" stroke-width="8"/>`,
    mall: `<path d="M30 650V300h708v350" fill="#1d2830" stroke="${INK}" stroke-width="8"/><path d="M70 350h150v180H70M310 350h150v180H310M550 350h150v180H550" fill="none" stroke="#3b4e53" stroke-width="8"/><path d="M250 280l34-34 34 34M490 280l34-34 34 34" fill="none" stroke="${accent}" stroke-width="6"/>`,
    arena: `<path d="M30 650Q384 330 738 650" fill="#172d45" stroke="${INK}" stroke-width="8"/><path d="M80 640Q384 405 688 640" fill="none" stroke="${secondary}" stroke-width="10"/><circle cx="384" cy="560" r="45" fill="none" stroke="${accent}" stroke-width="7"/>`,
    castle: `<path d="M50 650V350h90v-80h90v380h100V220h110v430h90V300h100v350h88" fill="#263044" stroke="${INK}" stroke-width="8"/><path d="M300 650l85-250 80 250" fill="#1b2535" stroke="${INK}" stroke-width="7"/>`,
  }[art.space] || '';
  return svg(768, 1024, `<rect width="768" height="1024" fill="${base}"/><rect width="768" height="740" fill="#091827"/>${stars}${distant}${lights}${motif}<path d="M0 705H768V1024H0Z" fill="#0b1825"/><path d="M0 730H768" stroke="${secondary}" stroke-width="4" opacity=".5"/><path d="M0 855H768M80 730V1024M250 730V1024M518 730V1024M688 730V1024" stroke="#1d3548" stroke-width="3"/><ellipse cx="590" cy="775" rx="110" ry="28" fill="${SHADOW}" opacity=".6"/><path d="M0 712H768" stroke="${accent}" stroke-width="3" opacity=".35"/>`);
}

function humanoid(form, x, accent, secondary, boss = false, broken = false) {
  const scale = boss ? 1.12 : 0.86;
  const body = broken ? secondary : accent;
  const head = form.includes('block') ? `<rect x="46" y="15" width="34" height="30" rx="4"/>` : `<circle cx="64" cy="29" r="17"/>`;
  const heavy = /(brute|king|captain|juggernaut|jad|center|nemesis|vault|runner|revenant|roshan|trapper|executioner|arbiter|doom|killa|grafted|troll|mech)/.test(form);
  const width = heavy ? 46 : 34;
  const accessory = /(sniper|archer|ranger|shooter|recon)/.test(form)
    ? `<path d="M72 58l37-18M88 49l10 12" fill="none" stroke="${secondary}" stroke-width="7"/>`
    : /(caster|mage|controller|cultist)/.test(form)
      ? `<circle cx="97" cy="48" r="9" fill="${secondary}"/><path d="M84 60l13-12" fill="none" stroke="${secondary}" stroke-width="6"/>`
      : /(defender|anchor|sentinel|tackle|linebacker)/.test(form)
        ? `<path d="M88 52l21 10-5 32-23 8z" fill="${secondary}"/>`
        : `<path d="M83 59l23 22" fill="none" stroke="${secondary}" stroke-width="7"/>`;
  const cracks = broken ? `<path d="M54 54l13 13-9 14 12 15M78 48l-9 18 14 12" fill="none" stroke="${INK}" stroke-width="4"/>` : '';
  return `<g transform="translate(${x} 7) scale(${scale}) translate(${boss ? -7 : 8} 0)"><ellipse cx="64" cy="118" rx="42" ry="8" fill="${SHADOW}" opacity=".75"/>${outlined(`${head}<path d="M${64 - width / 2} 48Q64 38 ${64 + width / 2} 48L${78 + (heavy ? 8 : 0)} 91H${50 - (heavy ? 8 : 0)}Z"/><path d="M51 86L39 116M77 86l13 30M51 58L28 78M77 58l23 20" fill="none"/>`, body, INK, heavy ? 7 : 6)}${accessory}<path d="M50 48h28" stroke="${secondary}" stroke-width="5"/>${cracks}</g>`;
}

function creature(form, x, accent, secondary, boss = false, broken = false) {
  const large = boss || /(dragon|serpent|storm|roshan|beast|jad)/.test(form);
  const body = broken ? secondary : accent;
  const scale = large ? 1.03 : 0.78;
  const horn = /(dragon|serpent|storm|roshan|jad)/.test(form) ? `<path d="M76 37l12-22 8 27M87 44l22-13-9 24"/>` : '';
  const wings = /(dragon|hawk)/.test(form) ? `<path d="M55 54L25 22l7 48M72 54l34-32-8 49"/>` : '';
  const tail = `<path d="M28 78Q5 68 12 47" fill="none"/>`;
  const cracks = broken ? `<path d="M48 57l13 12-9 18 16 10M78 54l-12 17 18 13" fill="none" stroke="${INK}" stroke-width="4"/>` : '';
  return `<g transform="translate(${x} 7) scale(${scale}) translate(${large ? 0 : 15} ${large ? 0 : 19})"><ellipse cx="64" cy="113" rx="50" ry="8" fill="${SHADOW}" opacity=".75"/>${outlined(`${tail}${wings}<path d="M25 73Q30 43 65 43Q101 43 108 76Q101 103 65 105Q33 102 25 73Z"/><path d="M78 48Q102 38 113 58L103 79 82 73Z"/>${horn}<path d="M42 91l-9 24M60 98l-2 18M84 96l8 20" fill="none"/>`, body, INK, 6)}<circle cx="98" cy="56" r="4" fill="${secondary}"/>${cracks}</g>`;
}

function machine(form, x, accent, secondary, boss = false, broken = false) {
  const vehicle = /car|driver|biker/.test(form);
  const body = broken ? secondary : accent;
  const scale = boss ? 1.04 : 0.82;
  const core = vehicle
    ? `<path d="M20 75l14-27h50l25 23v25H17Z"/><path d="M42 50l11-18h30l17 39"/><circle cx="39" cy="98" r="14"/><circle cx="91" cy="98" r="14"/>`
    : `<rect x="29" y="38" width="70" height="58" rx="14"/><circle cx="64" cy="67" r="19"/><path d="M40 92l-12 25M88 92l12 25M30 55L12 76M98 55l18 21" fill="none"/>`;
  const cracks = broken ? `<path d="M45 46l14 15-10 17 18 15M80 43L66 62l17 13" fill="none" stroke="${INK}" stroke-width="4"/>` : '';
  return `<g transform="translate(${x} 8) scale(${scale}) translate(${boss ? 0 : 14} ${vehicle ? 14 : 7})"><ellipse cx="64" cy="116" rx="52" ry="8" fill="${SHADOW}" opacity=".75"/>${outlined(core, body, INK, 6)}<circle cx="64" cy="67" r="8" fill="${secondary}" stroke="${INK}" stroke-width="4"/>${cracks}</g>`;
}

function targetArt(form, x, accent, secondary, boss = false, broken = false) {
  if (/(car|driver|biker|mech|drone|artillery|generator|tick|spectre|vault|champion-car)/.test(form)) return machine(form, x, accent, secondary, boss, broken);
  if (/(serpent|beast|raptor|ghoul|geist|creeper|tall|golem|imp|shell|jad|dragon|spider|prowler|roshan|crow|claw|undead|bone|hawk)/.test(form)) return creature(form, x, accent, secondary, boss, broken);
  return humanoid(form, x, accent, secondary, boss, broken);
}

function targetsSvg(pack, art) {
  const [accent, secondary] = art.palette;
  const forms = [...art.forms, art.forms[5]];
  return svg(896, 128, forms.map((form, index) => targetArt(form, index * 128, accent, secondary, index >= 5, index === 6)).join(''));
}

function propsSvg(pack, art) {
  const [accent, secondary] = art.palette;
  const motifs = Array.from({ length: 4 }, (_, i) => {
    const x = i * 128;
    const kind = (hash(pack.id) + i) % 4;
    const body = kind === 0
      ? `<rect x="28" y="46" width="72" height="58" rx="8"/><path d="M28 64h72M64 46v58" fill="none"/>`
      : kind === 1
        ? `<path d="M28 103L64 22l36 81Z"/><circle cx="64" cy="69" r="12" fill="${secondary}"/>`
        : kind === 2
          ? `<circle cx="64" cy="66" r="39"/><path d="M64 27v78M25 66h78" fill="none"/>`
          : `<path d="M20 98l17-62h54l17 62z"/><path d="M36 62h56" fill="none"/>`;
    return `<g transform="translate(${x} 0)"><ellipse cx="64" cy="112" rx="42" ry="7" fill="${SHADOW}" opacity=".7"/>${outlined(body, i % 2 ? secondary : accent, INK, 6)}</g>`;
  }).join('');
  return svg(512, 128, motifs);
}

function masksSvg(pack, art) {
  const [accent, secondary] = art.palette;
  return svg(512, 128, Array.from({ length: 4 }, (_, i) => {
    const x = i * 128;
    const count = 2 + i;
    const fissures = Array.from({ length: count }, (_, j) => {
      const sx = 28 + seeded(pack.id, i * 10 + j, 72);
      return `<path d="M${sx} 18l${-8 + seeded(pack.id, j + 40, 16)} 24 ${10 - seeded(pack.id, j + 60, 20)} 20 ${-8 + seeded(pack.id, j + 80, 16)} 27 ${8 - seeded(pack.id, j + 100, 16)} 24"/>`;
    }).join('');
    return `<g transform="translate(${x})" fill="none" stroke="${i > 1 ? accent : secondary}" stroke-width="${3 + i}" stroke-linecap="round" stroke-linejoin="round" opacity="${0.5 + i * 0.12}">${fissures}</g>`;
  }).join(''));
}

function atlasJson(pack) {
  const names = ['common-a', 'common-b', 'common-c', 'elite', 'event', 'boss', 'boss-break'];
  return {
    frames: Object.fromEntries(names.map((name, index) => [name, {
      rect: { x: index * 128, y: 0, w: 128, h: 128 },
      sourceSize: { w: 128, h: 128 },
      trimOffset: { x: 0, y: 0 },
      pivot: { x: 0.5, y: 1 },
      metrics: { silhouetteAt72: true, bossAt128: index >= 5, direction: 'right-to-left' },
    }])),
    meta: { image: 'targets.webp', size: { w: 896, h: 128 }, scale: 1, packId: pack.id, grammar: 'apn-patchline-v1' },
  };
}

function sourceBoard(pack, art) {
  return `# ${pack.title} production source board\n\n- Clean Era order: ${pack.order}\n- Genre: ${pack.genre}\n- Environment grammar: ${art.space}\n- Palette roles: ${art.palette.join(', ')}\n- Direction: target enters right-to-left; foot-center pivot is locked.\n- Contract: textless APN Patchline vector master; five targets, one final encounter, one break state.\n- Research owner: \`docs/GAME-PACK-ASSET-BIBLE.md\` (${pack.title} official-source section).\n- Approved direction evidence: \`docs/art/proofs/2026-07-15/\`.\n- Production: deterministic \`scripts/assets/produce-game-packs.mjs\`; no screenshot pixels or official logos ship.\n`;
}

async function render(svgFile, pngFile, width, height) {
  await run(RSVG, ['-w', String(width), '-h', String(height), '-o', pngFile, svgFile]);
}

async function writePack(pack) {
  const art = ART[pack.id];
  if (!art) throw new Error(`Missing art definition: ${pack.id}`);
  const dir = path.join(packsRoot, pack.id);
  const master = path.join(dir, 'master');
  fs.mkdirSync(master, { recursive: true });
  const assets = [
    ['background', skyline(pack, art), 768, 1024, 'background'],
    ['targets', targetsSvg(pack, art), 896, 128, 'targets'],
    ['props', propsSvg(pack, art), 512, 128, 'targets'],
    ['corruption-mask', masksSvg(pack, art), 512, 128, 'targets'],
  ];
  for (const [name, source, width, height, kind] of assets) {
    const svgFile = path.join(master, `${name}.svg`);
    const pngFile = path.join(master, `${name}.png`);
    fs.writeFileSync(svgFile, source);
    await render(svgFile, pngFile, width, height);
    await convertWebp(pngFile, path.join(dir, `${name}.webp`), kind);
    fs.rmSync(pngFile);
  }
  fs.writeFileSync(path.join(dir, 'targets.json'), stableJson(atlasJson(pack)));
  fs.writeFileSync(path.join(dir, 'source-board.md'), sourceBoard(pack, art));
  console.log(`PACK ${String(pack.order).padStart(2, '0')} ${pack.id}`);
}

export async function produceRange(start = 1, end = 20) {
  const catalog = JSON.parse(fs.readFileSync(path.join(packsRoot, 'catalog.json'), 'utf8'));
  for (const pack of catalog.filter((item) => item.order >= start && item.order <= end)) await writePack(pack);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const start = Number(process.argv[2] || 1);
  const end = Number(process.argv[3] || start);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 20 || start > end) throw new Error('Usage: produce-game-packs.mjs <start 1..20> <end 1..20>');
  await produceRange(start, end);
}
