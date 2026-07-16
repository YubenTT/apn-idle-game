import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const GAME_CSS_URL = new URL('../css/game.css', import.meta.url);

function declarationBlock(css, selectorPattern) {
  return css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
}

function hasDeclaration(block, property, value) {
  return new RegExp(`(?:^|;)\\s*${property.replaceAll('-', '\\-')}\\s*:\\s*${value}\\s*(?:;|$)`).test(block);
}

export function checkMobileGestureContract() {
  const css = fs.readFileSync(GAME_CSS_URL, 'utf8');
  const documentSurface = declarationBlock(css, 'html\\s*,\\s*body\\s*,\\s*body\\s+\\*');
  const mediaSurface = declarationBlock(css, 'img\\s*,\\s*svg\\s*,\\s*canvas');
  const canvasSurface = declarationBlock(css, '#game');
  const sprintSurface = declarationBlock(css, '\\.btn-sprint');

  return [
    {
      pass: hasDeclaration(documentSurface, '-webkit-user-select', 'none') &&
        hasDeclaration(documentSurface, 'user-select', 'none'),
      message: 'complete document disables WebKit and standard selection',
      detail: 'html, body, and descendants',
    },
    {
      pass: hasDeclaration(documentSurface, '-webkit-touch-callout', 'none'),
      message: 'complete document disables iOS long-press callouts',
      detail: 'no native callout on HUD, sheets, or modals',
    },
    {
      pass: hasDeclaration(mediaSurface, '-webkit-user-drag', 'none'),
      message: 'Canvas and media disable native WebKit drag',
      detail: 'img, svg, and canvas',
    },
    {
      pass: !hasDeclaration(documentSurface, 'touch-action', 'none'),
      message: 'document guard preserves scroll gestures',
      detail: 'touch-action is not disabled globally',
    },
    {
      pass: hasDeclaration(canvasSurface, 'touch-action', 'none') &&
        hasDeclaration(sprintSurface, 'touch-action', 'none'),
      message: 'intentional hold surfaces retain pointer ownership',
      detail: 'Canvas and Sprint only',
    },
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = checkMobileGestureContract().filter((check) => !check.pass);
  for (const check of checkMobileGestureContract()) {
    console.log(check.pass ? 'OK' : 'FAIL', `${check.message} (${check.detail})`);
  }
  if (failures.length) process.exit(1);
  console.log('MOBILE GESTURES PASS');
}
