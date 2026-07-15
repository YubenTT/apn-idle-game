import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const CWEBP = '/opt/homebrew/bin/cwebp';

export async function convertWebp(input, output, kind = 'targets') {
  const quality = kind === 'background' ? 78 : 82;
  await run(CWEBP, ['-quiet', '-q', String(quality), '-alpha_q', '90', '-m', '6', '-mt', input, '-o', output]);
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output, kind = 'targets'] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: convert-webp.mjs <input> <output> [background|targets|host]');
  await convertWebp(path.resolve(input), path.resolve(output), kind);
  console.log(`WEBP ${output}`);
}
