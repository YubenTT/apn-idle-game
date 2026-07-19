import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const GAME_CSS_URL = new URL('../css/game.css', import.meta.url);
const TOKENS_CSS_URL = new URL('../brand/tokens.css', import.meta.url);
const TOKEN_IMPORT = '@import "../brand/tokens.css";';
const CSS_NAMED_COLORS = new Set(`
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
  blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue
  cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
  darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon
  darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
  fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
  lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey
  lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
  lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
  mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite
  navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
  paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell
  sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen
`.trim().split(/\s+/));

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function customProperties(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

export function paletteLiteralCounts(source) {
  const css = stripComments(source);
  const declarationValues = [...css.matchAll(/(?:^|[;{])\s*[\w-]+\s*:\s*([^;{}]+)(?=;|})/gm)]
    .map((match) => match[1].replace(/var\(\s*--[\w-]+/g, 'var('));

  return {
    hex: countMatches(css, /#[0-9a-f]{3,8}\b/gi),
    functions: countMatches(
      css,
      /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|device-cmyk)\s*\(/gi,
    ),
    named: declarationValues.reduce((total, value) => {
      const words = value.toLowerCase().match(/[a-z]+/g) || [];
      return total + words.filter((word) => CSS_NAMED_COLORS.has(word)).length;
    }, 0),
  };
}

export function checkCssTokenContract() {
  const gameCss = stripComments(fs.readFileSync(GAME_CSS_URL, 'utf8'));
  const tokensCss = stripComments(fs.readFileSync(TOKENS_CSS_URL, 'utf8'));
  const firstRule = gameCss.trimStart().split('\n', 1)[0].trim();
  const paletteCounts = paletteLiteralCounts(gameCss);
  const fallbackProbeCounts = paletteLiteralCounts('a { color: var(--missing, red); }');
  const rawFontSizeCount = countMatches(
    gameCss,
    /font-size\s*:\s*-?(?:\d*\.)?\d+(?:px|rem|em|pt)\b/gi,
  );

  const tokenDefinitions = customProperties(tokensCss, /(?:^|[;{]\s*)(--[\w-]+)\s*:/gm);
  const tokenReferences = customProperties(tokensCss, /var\(\s*(--[\w-]+)/g);
  const unresolvedTokenReferences = [...tokenReferences]
    .filter((name) => !tokenDefinitions.has(name))
    .sort();
  const localDefinitions = customProperties(gameCss, /(?:^|[;{]\s*)(--[\w-]+)\s*:/gm);
  const runtimeProperties = new Set(['--wc', '--ac', '--rc', '--charge', '--en', '--nav-i']);
  const references = customProperties(gameCss, /var\(\s*(--[\w-]+)/g);
  const unresolved = [...references]
    .filter(
      (name) =>
        !tokenDefinitions.has(name) &&
        !localDefinitions.has(name) &&
        !runtimeProperties.has(name),
    )
    .sort();

  const canonicalEconomyTokens = [
    ...new Set(
      [...gameCss.matchAll(/var\(\s*(--c-(?:notes|sp))\b/g)].map((match) => match[1]),
    ),
  ].sort();
  const missingEconomyTokens = ['--c-notes', '--c-sp'].filter(
    (name) => !canonicalEconomyTokens.includes(name),
  );

  return [
    {
      pass: firstRule === TOKEN_IMPORT,
      message: 'tokens.css is the first effective game.css rule',
      detail: `first rule: ${firstRule || '(none)'}`,
    },
    {
      pass: paletteCounts.hex === 0 && paletteCounts.functions === 0 && paletteCounts.named === 0,
      message: 'game.css contains no raw palette literals',
      detail: `${paletteCounts.hex} hex, ${paletteCounts.functions} color functions, ${paletteCounts.named} named`,
    },
    {
      pass: fallbackProbeCounts.named === 1,
      message: 'token guard scans named-color fallbacks',
      detail: `${fallbackProbeCounts.named} fallback literal detected`,
    },
    {
      pass: rawFontSizeCount === 0,
      message: 'game.css font sizes resolve through type tokens',
      detail: `${rawFontSizeCount} raw font-size lengths`,
    },
    {
      pass: unresolved.length === 0,
      message: 'game.css custom-property references resolve through tokens or runtime roles',
      detail: unresolved.join(', ') || 'all resolved',
    },
    {
      pass: unresolvedTokenReferences.length === 0,
      message: 'tokens.css custom-property references resolve internally',
      detail: unresolvedTokenReferences.join(', ') || 'all resolved',
    },
    {
      pass: missingEconomyTokens.length === 0,
      message: 'canonical Notes/SP economy tokens are active',
      detail: missingEconomyTokens.join(', ') || canonicalEconomyTokens.join(', '),
    },
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let failed = false;
  for (const check of checkCssTokenContract()) {
    console.log(`${check.pass ? 'OK' : 'FAIL'} ${check.message} (${check.detail})`);
    failed ||= !check.pass;
  }
  if (failed) process.exit(1);
}
