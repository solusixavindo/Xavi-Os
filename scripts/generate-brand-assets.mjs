import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REFERENCE = resolve(ROOT, 'assets/brand/reference/ecosystem-x-app-icon.png');
const BACKGROUND = [5, 11, 24, 255];
const NODE_CENTERS = [
  [0.289, 0.267],
  [0.711, 0.267],
  [0.289, 0.699],
  [0.711, 0.699],
];

const outputs = {
  appIcon: ['assets/brand/icon/app-icon.png', 1024, 1024, false],
  adaptiveForeground: ['assets/brand/icon/adaptive-foreground.png', 1024, 1024, true],
  adaptiveBackground: ['assets/brand/icon/adaptive-background.png', 1024, 1024, false],
  monochrome: ['assets/brand/icon/adaptive-monochrome.png', 1024, 1024, true],
  splashLogo: ['assets/brand/splash/splash-logo.png', 768, 768, true],
  splashFallback: ['assets/brand/splash/splash-static.png', 1080, 1920, false],
  introMark: ['assets/brand/animation/ecosystem-x-intro.png', 768, 768, true],
  introCore: ['assets/brand/animation/ecosystem-x-core.png', 768, 768, true],
  personal: ['assets/brand/animation/node-personal.png', 256, 256, true],
  business: ['assets/brand/animation/node-business.png', 256, 256, true],
  ai: ['assets/brand/animation/node-ai.png', 256, 256, true],
  commerce: ['assets/brand/animation/node-commerce.png', 256, 256, true],
};

function smoothstep(edge0, edge1, value) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function loadPng(path) {
  return PNG.sync.read(readFileSync(path));
}

function createPng(width, height, color = [0, 0, 0, 0]) {
  const image = new PNG({ width, height });
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = color[0];
    image.data[index + 1] = color[1];
    image.data[index + 2] = color[2];
    image.data[index + 3] = color[3];
  }
  return image;
}

function clone(image) {
  const result = new PNG({ width: image.width, height: image.height });
  image.data.copy(result.data);
  return result;
}

function extractForeground(source) {
  const result = new PNG({ width: source.width, height: source.height });
  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index] ?? 0;
    const green = source.data[index + 1] ?? 0;
    const blue = source.data[index + 2] ?? 0;
    const distance = Math.sqrt(
      (red - BACKGROUND[0]) ** 2 + (green - BACKGROUND[1]) ** 2 + (blue - BACKGROUND[2]) ** 2,
    );
    const alpha = smoothstep(20, 82, distance);
    result.data[index + 3] = Math.round(alpha * 255);
    if (alpha < 0.015) {
      result.data[index] = 0;
      result.data[index + 1] = 0;
      result.data[index + 2] = 0;
      continue;
    }
    result.data[index] = Math.max(0, Math.min(255, Math.round((red - BACKGROUND[0] * (1 - alpha)) / alpha)));
    result.data[index + 1] = Math.max(0, Math.min(255, Math.round((green - BACKGROUND[1] * (1 - alpha)) / alpha)));
    result.data[index + 2] = Math.max(0, Math.min(255, Math.round((blue - BACKGROUND[2] * (1 - alpha)) / alpha)));
  }
  return result;
}

function sample(image, x, y, channel) {
  const clampedX = Math.max(0, Math.min(image.width - 1, x));
  const clampedY = Math.max(0, Math.min(image.height - 1, y));
  return image.data[(clampedY * image.width + clampedX) * 4 + channel] ?? 0;
}

function resize(image, width, height) {
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) * image.height) / height - 0.5;
    const y0 = Math.floor(sourceY);
    const y1 = y0 + 1;
    const fy = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) * image.width) / width - 0.5;
      const x0 = Math.floor(sourceX);
      const x1 = x0 + 1;
      const fx = sourceX - x0;
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = sample(image, x0, y0, channel) * (1 - fx) + sample(image, x1, y0, channel) * fx;
        const bottom = sample(image, x0, y1, channel) * (1 - fx) + sample(image, x1, y1, channel) * fx;
        result.data[target + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return result;
}

function crop(image, left, top, width, height) {
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = ((top + y) * image.width + left + x) * 4;
      const targetIndex = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        result.data[targetIndex + channel] = image.data[sourceIndex + channel] ?? 0;
      }
    }
  }
  return result;
}

function alphaBounds(image, threshold = 28) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('Reference artwork has no usable foreground.');
  return { minX, minY, maxX, maxY };
}

function composite(base, overlay, left, top) {
  for (let y = 0; y < overlay.height; y += 1) {
    for (let x = 0; x < overlay.width; x += 1) {
      const destinationX = left + x;
      const destinationY = top + y;
      if (destinationX < 0 || destinationY < 0 || destinationX >= base.width || destinationY >= base.height) continue;
      const sourceIndex = (y * overlay.width + x) * 4;
      const targetIndex = (destinationY * base.width + destinationX) * 4;
      const sourceAlpha = (overlay.data[sourceIndex + 3] ?? 0) / 255;
      const targetAlpha = (base.data[targetIndex + 3] ?? 0) / 255;
      const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel += 1) {
        const sourceColor = overlay.data[sourceIndex + channel] ?? 0;
        const targetColor = base.data[targetIndex + channel] ?? 0;
        base.data[targetIndex + channel] = outputAlpha === 0
          ? 0
          : Math.round((sourceColor * sourceAlpha + targetColor * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
      }
      base.data[targetIndex + 3] = Math.round(outputAlpha * 255);
    }
  }
  return base;
}

function fitToCanvas(image, canvasSize, artworkSize) {
  const bounds = alphaBounds(image);
  const padding = Math.round(image.width * 0.012);
  const left = Math.max(0, bounds.minX - padding);
  const top = Math.max(0, bounds.minY - padding);
  const width = Math.min(image.width - left, bounds.maxX - bounds.minX + 1 + padding * 2);
  const height = Math.min(image.height - top, bounds.maxY - bounds.minY + 1 + padding * 2);
  const cropped = crop(image, left, top, width, height);
  const scale = artworkSize / Math.max(width, height);
  const resized = resize(cropped, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const canvas = createPng(canvasSize, canvasSize);
  return composite(canvas, resized, Math.round((canvasSize - resized.width) / 2), Math.round((canvasSize - resized.height) / 2));
}

function removeNodeDiscs(image) {
  const result = clone(image);
  const radius = image.width * 0.137;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      for (const [centerX, centerY] of NODE_CENTERS) {
        if (Math.hypot(x - centerX * image.width, y - centerY * image.height) <= radius) {
          result.data[(y * image.width + x) * 4 + 3] = 0;
          break;
        }
      }
    }
  }
  return result;
}

function nodeCrop(image, centerX, centerY) {
  const size = Math.round(image.width * 0.27);
  const left = Math.max(0, Math.round(centerX * image.width - size / 2));
  const top = Math.max(0, Math.round(centerY * image.height - size / 2));
  const result = crop(image, left, top, size, size);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center) / center;
      const radialAlpha = 1 - smoothstep(0.88, 1, distance);
      const alphaIndex = (y * size + x) * 4 + 3;
      result.data[alphaIndex] = Math.round((result.data[alphaIndex] ?? 0) * radialAlpha);
    }
  }
  return resize(result, 256, 256);
}

function monochrome(image) {
  const result = clone(image);
  for (let index = 0; index < result.data.length; index += 4) {
    result.data[index] = 255;
    result.data[index + 1] = 255;
    result.data[index + 2] = 255;
    result.data[index + 3] = Math.round(smoothstep(64, 176, result.data[index + 3] ?? 0) * 255);
  }
  return result;
}

function writePng(relativePath, image) {
  const path = resolve(ROOT, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(image, { colorType: 6, inputColorType: 6 }));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function pngChunkTypes(path) {
  const bytes = readFileSync(path);
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    chunks.push(bytes.toString('ascii', offset + 4, offset + 8));
    offset += length + 12;
  }
  return chunks;
}

function generate() {
  const reference = loadPng(REFERENCE);
  if (reference.width !== reference.height) throw new Error('Reference app icon must be square.');
  const extracted = extractForeground(reference);
  const legacy = fitToCanvas(extracted, 1024, 650);
  const adaptive = fitToCanvas(extracted, 1024, 500);
  const intro = fitToCanvas(extracted, 768, 600);
  const core = fitToCanvas(removeNodeDiscs(extracted), 768, 600);
  const background = createPng(1024, 1024, BACKGROUND);
  const appIcon = composite(createPng(1024, 1024, BACKGROUND), legacy, 0, 0);
  const splashFallback = composite(createPng(1080, 1920, BACKGROUND), resize(intro, 720, 720), 180, 600);

  writePng(outputs.appIcon[0], appIcon);
  writePng(outputs.adaptiveForeground[0], adaptive);
  writePng(outputs.adaptiveBackground[0], background);
  writePng(outputs.monochrome[0], monochrome(adaptive));
  writePng(outputs.splashLogo[0], intro);
  writePng(outputs.splashFallback[0], splashFallback);
  writePng(outputs.introMark[0], intro);
  writePng(outputs.introCore[0], core);
  writePng(outputs.personal[0], nodeCrop(extracted, ...NODE_CENTERS[0]));
  writePng(outputs.business[0], nodeCrop(extracted, ...NODE_CENTERS[1]));
  writePng(outputs.ai[0], nodeCrop(extracted, ...NODE_CENTERS[2]));
  writePng(outputs.commerce[0], nodeCrop(extracted, ...NODE_CENTERS[3]));

  const manifest = {
    version: 1,
    generator: 'scripts/generate-brand-assets.mjs',
    reference: {
      path: 'assets/brand/reference/ecosystem-x-app-icon.png',
      sha256: sha256(REFERENCE),
      dimensions: [reference.width, reference.height],
    },
    background: '#050B18',
    outputs: Object.fromEntries(
      Object.entries(outputs).map(([name, [path, width, height, alpha]]) => [
        name,
        { path, width, height, alpha, sha256: sha256(resolve(ROOT, path)) },
      ]),
    ),
  };
  writeFileSync(resolve(ROOT, 'assets/brand/generated/asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function validate() {
  const manifestPath = resolve(ROOT, 'assets/brand/generated/asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.reference.sha256 !== sha256(REFERENCE)) throw new Error('Reference checksum differs from generated manifest.');
  for (const [name, [relativePath, width, height, expectsAlpha]] of Object.entries(outputs)) {
    const path = resolve(ROOT, relativePath);
    const image = loadPng(path);
    if (image.width !== width || image.height !== height) throw new Error(`${name} has invalid dimensions.`);
    let transparentPixels = 0;
    for (let index = 3; index < image.data.length; index += 4) {
      if ((image.data[index] ?? 255) < 255) transparentPixels += 1;
    }
    if (expectsAlpha && transparentPixels === 0) throw new Error(`${name} must contain transparency.`);
    if (!expectsAlpha && transparentPixels > 0) throw new Error(`${name} must be fully opaque.`);
    const unexpectedChunks = pngChunkTypes(path).filter((chunk) => !['IHDR', 'IDAT', 'IEND'].includes(chunk));
    if (unexpectedChunks.length > 0) throw new Error(`${name} contains unexpected PNG metadata chunks.`);
    if (name === 'adaptiveForeground' || name === 'monochrome') {
      let maximumRadius = 0;
      const centerX = (image.width - 1) / 2;
      const centerY = (image.height - 1) / 2;
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) < 64) continue;
          maximumRadius = Math.max(maximumRadius, Math.hypot(x - centerX, y - centerY));
        }
      }
      if (maximumRadius > 312) throw new Error(`${name} exceeds the conservative circular adaptive-icon safe zone.`);
    }
    if (manifest.outputs[name]?.sha256 !== sha256(path)) throw new Error(`${name} checksum differs from manifest.`);
  }
  console.log(`Validated ${Object.keys(outputs).length} Ecosystem X production assets.`);
}

if (process.argv.includes('--check')) validate();
else {
  generate();
  validate();
}
