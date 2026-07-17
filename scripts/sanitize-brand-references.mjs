import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references = [
  'assets/brand/reference/ecosystem-x-detail.png',
  'assets/brand/reference/ecosystem-x-app-icon.png',
];

function pixelHash(image) {
  return createHash('sha256').update(image.data).digest('hex');
}

for (const relativePath of references) {
  const path = resolve(root, relativePath);
  const original = PNG.sync.read(readFileSync(path));
  const before = pixelHash(original);
  const encoded = PNG.sync.write(original, { colorType: 6, inputColorType: 6 });
  const sanitized = PNG.sync.read(encoded);
  if (before !== pixelHash(sanitized)) throw new Error(`${relativePath} changed pixels during metadata removal.`);
  writeFileSync(path, encoded);
  console.log(`Sanitized metadata without changing pixels: ${relativePath}`);
}
