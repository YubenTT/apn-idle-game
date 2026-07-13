import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const TOKENS_CSS_URL = new URL('../brand/tokens.css', import.meta.url);
const GAME_CSS_URL = new URL('../css/game.css', import.meta.url);
const GAME_JS_URL = new URL('../js/game.js', import.meta.url);
const RENDER_JS_URL = new URL('../js/render.js', import.meta.url);
const UI_JS_URL = new URL('../js/ui.js', import.meta.url);

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

function tokenHex(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    source
      .match(new RegExp(`${escaped}\\s*:\\s*(#[0-9a-f]{6})\\b`, 'i'))?.[1]
      ?.toLowerCase() || ''
  );
}

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  const channels = rgb(hex).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

export function checkEconomyColorContract() {
  const tokensCss = stripComments(fs.readFileSync(TOKENS_CSS_URL, 'utf8'));
  const gameCss = stripComments(fs.readFileSync(GAME_CSS_URL, 'utf8'));
  const gameJs = stripComments(fs.readFileSync(GAME_JS_URL, 'utf8'));
  const renderJs = stripComments(fs.readFileSync(RENDER_JS_URL, 'utf8'));
  const uiJs = stripComments(fs.readFileSync(UI_JS_URL, 'utf8'));

  const notes = tokenHex(tokensCss, '--c-notes');
  const sp = tokenHex(tokensCss, '--c-sp');
  const ink = tokenHex(tokensCss, '--compat-ink');
  const legacyAliases = [tokensCss, gameCss]
    .flatMap((source) => source.match(/--compat-(?:notes|sp)[\w-]*/g) || [])
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort();
  const domRoleChecks = [
    {
      name: 'HUD Notes value',
      pass: /\.chip:nth-child\(2\)\s+strong\s*\{[^}]*var\(\s*--c-notes\b/s.test(gameCss),
    },
    {
      name: 'Ship Notes value',
      pass: /\.ship-row\.t-notes\s+\.v\s*\{[^}]*var\(\s*--c-notes\b/s.test(gameCss),
    },
    {
      name: 'Notes reward chip',
      pass: /\.rw-chip\.k-notes\s*\{[^}]*var\(\s*--c-notes\b/s.test(gameCss),
    },
    {
      name: 'HUD SP value',
      pass: /\.meta-pill\.sp\s*\{[^}]*var\(\s*--c-sp\b/s.test(gameCss),
    },
    {
      name: 'HUD SP label',
      pass: /\.meta-pill\.sp\s+\.meta-k\s*\{[^}]*var\(\s*--c-sp\b/s.test(gameCss),
    },
    {
      name: 'SP bank tint',
      pass: /\.sp-bank\.has-sp\s*\{[^}]*var\(\s*--c-sp\b/s.test(gameCss),
    },
    {
      name: 'SP bank value',
      pass: /\.sp-bank-val\s*\{[^}]*var\(\s*--c-sp\b/s.test(gameCss),
    },
    {
      name: 'SP reward chip',
      pass: /\.rw-chip\.k-sp\s*\{[^}]*var\(\s*--c-sp\b/s.test(gameCss),
    },
    {
      name: 'Build SP badge contrast',
      pass:
        /\.nav-btn\[data-panel=['"]skills['"]\]\.has-badge::after\s*\{(?=[^}]*background:\s*var\(\s*--c-sp\b)(?=[^}]*color:\s*var\(\s*--compat-ink\b)[^}]*\}/s.test(
          gameCss,
        ),
    },
    {
      name: 'Build SP cost contrast',
      pass:
        /\.skill-card:not\(\[data-meta\]\)\.can\s+\.sk-cta\s*\{(?=[^}]*background:\s*var\(\s*--c-sp\b)(?=[^}]*color:\s*var\(\s*--compat-ink\b)[^}]*\}/s.test(
          gameCss,
        ),
    },
    {
      name: 'Attribute SP affordance contrast',
      pass:
        /\.attr-card\.can\s+\.attr-plus\s*\{(?=[^}]*background:\s*var\(\s*--c-sp\b)(?=[^}]*color:\s*var\(\s*--compat-ink\b)[^}]*\}/s.test(
          gameCss,
        ),
    },
  ];
  const missingDomRoles = domRoleChecks
    .filter((check) => !check.pass)
    .map((check) => check.name);
  const gameLines = gameJs.split('\n');
  const eventRoleChecks = [
    {
      name: 'rank SP floater',
      pass: gameLines.some(
        (line) => line.includes('C.SP_PER_LEVEL} SP') && line.includes("tone('sp')"),
      ),
    },
    {
      name: 'skill SP floater',
      pass: gameLines.some(
        (line) => line.includes('d.name} ·${cost}SP') && line.includes("tone('sp')"),
      ),
    },
    {
      name: 'Notes floater',
      pass: gameLines.some(
        (line) => line.includes('p | 0} Notes') && line.includes("tone('notes')"),
      ),
    },
    {
      name: 'Notes particles',
      pass: gameLines.some(
        (line) => line.includes('particles(') && line.includes("tone('notes')"),
      ),
    },
    {
      name: 'Notes confetti',
      pass: gameLines.some(
        (line) => line.includes('confetti(') && line.includes("tone('notes')"),
      ),
    },
  ];
  const missingEventRoles = eventRoleChecks
    .filter((check) => !check.pass)
    .map((check) => check.name);
  const crimsonEconomyLines = gameLines
    .filter(
      (line) =>
        /\b(?:Notes|SP)\b/.test(line) &&
        /#(?:fc1243|ff2f4b|a3072f|d40d38|b80d32)\b/i.test(line),
    )
    .map((line) => line.trim());
  const renderMapsEconomyTones =
    /notes\s*:\s*['"]--c-notes['"]/.test(renderJs) &&
    /sp\s*:\s*['"]--c-sp['"]/.test(renderJs);
  const renderCachesEconomyTones =
    /canvasToneColors\.has\(tone\)/.test(renderJs) &&
    /canvasToneColors\.set\(tone,\s*value\)/.test(renderJs);
  const shipNotesIsSemantic =
    /row\(\s*['"]Notes['"][\s\S]{0,120}['"]notes['"]\s*\)/.test(uiJs) &&
    /\.ship-row\.t-notes\s+\.v[^{]*\{[^}]*var\(\s*--c-notes\b/s.test(gameCss);

  return [
    {
      pass: notes === '#ff6a8f' && sp === '#b07cff',
      message: 'canonical Notes and SP token values stay locked',
      detail: `Notes ${notes || '(missing)'}, SP ${sp || '(missing)'}`,
    },
    {
      pass: legacyAliases.length === 0,
      message: 'legacy Notes/SP compatibility aliases are retired',
      detail: legacyAliases.join(', ') || 'none remain',
    },
    {
      pass: missingDomRoles.length === 0,
      message: 'DOM economy roles use canonical Notes and SP tokens',
      detail: missingDomRoles.join(', ') || 'all explicit roles mapped',
    },
    {
      pass: renderMapsEconomyTones && renderCachesEconomyTones,
      message: 'Canvas economy tones resolve through cached render-owned CSS token mapping',
      detail:
        renderMapsEconomyTones && renderCachesEconomyTones
          ? 'Notes/SP mapped and cached'
          : 'mapping or cache incomplete',
    },
    {
      pass: missingEventRoles.length === 0,
      message: 'domain events emit semantic Notes/SP tones instead of colors',
      detail: missingEventRoles.join(', ') || 'all five economy events mapped',
    },
    {
      pass: crimsonEconomyLines.length === 0,
      message: 'Notes/SP event lines contain no combat crimson',
      detail: crimsonEconomyLines.join(' | ') || 'none remain',
    },
    {
      pass: shipNotesIsSemantic,
      message: 'Ship Notes value carries an explicit Notes color role',
      detail: shipNotesIsSemantic ? 'role and selector linked' : 'semantic link missing',
    },
    {
      pass:
        Boolean(notes && sp && ink) &&
        contrast(notes, ink) >= 4.5 &&
        contrast(sp, ink) >= 4.5,
      message: 'Notes and SP meet body-text contrast on the shipped ink surface',
      detail:
        notes && sp && ink
          ? `Notes ${contrast(notes, ink).toFixed(2)}:1, SP ${contrast(sp, ink).toFixed(2)}:1`
          : 'one or more tokens missing',
    },
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let failed = false;
  for (const check of checkEconomyColorContract()) {
    console.log(`${check.pass ? 'OK' : 'FAIL'} ${check.message} (${check.detail})`);
    failed ||= !check.pass;
  }
  if (failed) process.exit(1);
}
