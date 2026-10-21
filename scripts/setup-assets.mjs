/**
 * Copies the OCR worker, the WASM core and the English language data out of
 * node_modules into public/ocr so the browser loads them from this origin only.
 * That is what lets the Content-Security-Policy stay at `self` with no CDN, and it
 * means screenshot OCR works with no network access at runtime and no API key.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'ocr');
mkdirSync(out, { recursive: true });

const files = [
  [join(dirname(require.resolve('tesseract.js/package.json')), 'dist', 'worker.min.js'), 'worker.min.js'],
  [join(dirname(require.resolve('tesseract.js-core/package.json')), 'tesseract-core-simd.wasm.js'), 'tesseract-core-simd.wasm.js'],
  [join(dirname(require.resolve('tesseract.js-core/package.json')), 'tesseract-core.wasm.js'), 'tesseract-core.wasm.js'],
  [join(dirname(require.resolve('tesseract.js-core/package.json')), 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(dirname(require.resolve('tesseract.js-core/package.json')), 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

let copied = 0;
for (const [from, name] of files) {
  if (!existsSync(from)) {
    console.warn(`[setup-assets] missing: ${from}`);
    continue;
  }
  copyFileSync(from, join(out, name));
  copied++;
}
console.log(`[setup-assets] ${copied}/${files.length} OCR assets copied to public/ocr`);
