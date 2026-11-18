// After `npm run build`: every dist/assets/*.woff2 must be referenced by dist/sw.js.
import { readFileSync, readdirSync } from 'node:fs';

const sw = readFileSync('dist/sw.js', 'utf8');
const fonts = readdirSync('dist/assets').filter((f) => f.endsWith('.woff2'));
if (fonts.length === 0) {
  console.error('No woff2 files found in dist/assets');
  process.exit(1);
}
const missing = fonts.filter((f) => !sw.includes(`assets/${f}`));
if (missing.length) {
  console.error(`Not precached (${missing.length}/${fonts.length}):`, missing.slice(0, 10));
  process.exit(1);
}
console.log(`OK: all ${fonts.length} woff2 files are precached in dist/sw.js`);
