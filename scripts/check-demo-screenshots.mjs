import {
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import {
  captureDemoScreenshots,
  demoScreenshotSpecs,
} from './demo-screenshot-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.DOSSIERTABS_SCREENSHOT_CHECK_PORT ?? 5176);
const chromePort = Number(process.env.DOSSIERTABS_SCREENSHOT_CHECK_CHROME_PORT ?? 9342);
const screenshotsDir = path.join(rootDir, 'docs', 'screenshots');
const tempRoot = await mkdtemp(path.join(tmpdir(), 'dossiertabs-screenshot-check-'));
const maxAverageChannelDelta = 0.4;
const maxChangedPixelRatio = 0.02;
let exitCode = 0;

try {
  await captureDemoScreenshots({
    chromePort,
    commandName: 'pnpm verify:screenshots',
    outputDir: tempRoot,
    port,
    profilePrefix: 'dossiertabs-screenshot-check',
    rootDir,
  });

  const staleScreenshots = [];

  for (const screenshot of demoScreenshotSpecs) {
    const expected = decodePng(await readFile(path.join(screenshotsDir, screenshot.outputName)));
    const fresh = decodePng(await readFile(path.join(tempRoot, screenshot.outputName)));
    const comparison = comparePngPixels(expected, fresh);

    if (!comparison.passed) {
      staleScreenshots.push(`${screenshot.outputName} (${comparison.reason})`);
    }
  }

  if (staleScreenshots.length > 0) {
    throw new Error([
      'README/demo screenshots are stale. Run `pnpm screenshots` and commit the refreshed files:',
      ...staleScreenshots.map((screenshot) => `- docs/screenshots/${screenshot}`),
    ].join('\n'));
  }

  console.log(`Screenshot freshness passed (${demoScreenshotSpecs.length} files checked).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (exitCode !== 0) {
  process.exitCode = exitCode;
}

function decodePng(buffer) {
  const signature = buffer.subarray(0, 8);
  const expectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (!signature.equals(expectedSignature)) {
    throw new Error('Unsupported screenshot format: expected PNG signature.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported screenshot PNG format: bit depth ${bitDepth}, color type ${colorType}.`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;

    const rawRow = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;

    const outputRow = pixels.subarray(row * stride, (row + 1) * stride);
    unfilterPngRow(filter, rawRow, previousRow, outputRow, bytesPerPixel);
    previousRow = Buffer.from(outputRow);
  }

  return {
    bytesPerPixel,
    colorType,
    height,
    pixels,
    width,
  };
}

function unfilterPngRow(filter, rawRow, previousRow, outputRow, bytesPerPixel) {
  for (let index = 0; index < rawRow.length; index += 1) {
    const left = index >= bytesPerPixel ? outputRow[index - bytesPerPixel] : 0;
    const up = previousRow[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;
    let value = rawRow[index];

    if (filter === 1) {
      value += left;
    } else if (filter === 2) {
      value += up;
    } else if (filter === 3) {
      value += Math.floor((left + up) / 2);
    } else if (filter === 4) {
      value += paethPredictor(left, up, upLeft);
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG row filter ${filter}.`);
    }

    outputRow[index] = value & 0xff;
  }
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function comparePngPixels(expected, fresh) {
  if (expected.width !== fresh.width || expected.height !== fresh.height) {
    return {
      passed: false,
      reason: `dimension mismatch ${expected.width}x${expected.height} vs ${fresh.width}x${fresh.height}`,
    };
  }

  const pixelCount = expected.width * expected.height;
  let changedPixels = 0;
  let totalDelta = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const expectedOffset = pixel * expected.bytesPerPixel;
    const freshOffset = pixel * fresh.bytesPerPixel;
    let pixelDelta = 0;

    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(expected.pixels[expectedOffset + channel] - fresh.pixels[freshOffset + channel]);

      pixelDelta += delta;
      totalDelta += delta;
    }

    if (pixelDelta > 0) {
      changedPixels += 1;
    }
  }

  const averageChannelDelta = totalDelta / (pixelCount * 3);
  const changedPixelRatio = changedPixels / pixelCount;

  if (averageChannelDelta > maxAverageChannelDelta || changedPixelRatio > maxChangedPixelRatio) {
    return {
      passed: false,
      reason: `average channel delta ${averageChannelDelta.toFixed(3)}, changed pixels ${(changedPixelRatio * 100).toFixed(2)}%`,
    };
  }

  return {
    passed: true,
    reason: `average channel delta ${averageChannelDelta.toFixed(3)}, changed pixels ${(changedPixelRatio * 100).toFixed(2)}%`,
  };
}
