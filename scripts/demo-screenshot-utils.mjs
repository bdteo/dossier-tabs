import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createDemoRuntime,
  evaluateInPage,
  navigateDemo,
  waitForDemoFrame,
} from './demo-cdp-utils.mjs';

const physicalStackPath = '?activePrimary=evidence&hoverPrimary=strategy'
  + '&activeWorkbench=photos&hoverWorkbench=review&activeRail=signals';
const screenshotMotionSettleMs = 560;

export const demoScreenshotSpecs = [
  {
    height: 1200,
    mobile: false,
    name: 'desktop',
    outputName: 'demo-desktop.png',
    width: 1440,
  },
  {
    height: 844,
    mobile: true,
    name: 'mobile',
    outputName: 'demo-mobile.png',
    width: 390,
  },
  {
    height: 1320,
    mobile: false,
    name: 'desktop attached stacks',
    outputName: 'demo-attached-desktop.png',
    pathAndQuery: physicalStackPath,
    scrollSelector: '.demo-workbench',
    width: 1440,
  },
  {
    height: 844,
    mobile: true,
    name: 'mobile attached stacks',
    outputName: 'demo-attached-mobile.png',
    pathAndQuery: physicalStackPath,
    scrollSelector: '.demo-workbench',
    width: 390,
  },
];

export async function captureDemoScreenshots({
  chromePort,
  commandName,
  outputDir,
  port,
  profilePrefix,
  rootDir,
}) {
  let runtime;

  try {
    await mkdir(outputDir, { recursive: true });

    runtime = await createDemoRuntime({
      chromePort,
      commandName,
      port,
      profilePrefix,
      rootDir,
    });

    for (const screenshot of demoScreenshotSpecs) {
      await captureScreenshot(runtime.cdp, runtime.baseUrl, outputDir, screenshot);
      console.log(`Captured ${screenshot.name}: ${path.relative(rootDir, path.join(outputDir, screenshot.outputName))}`);
    }
  } finally {
    await runtime?.cleanup();
  }
}

async function captureScreenshot(client, baseUrl, outputDir, screenshot) {
  await navigateDemo(client, {
    baseUrl,
    height: screenshot.height,
    mobile: screenshot.mobile,
    pathAndQuery: screenshot.pathAndQuery ?? '',
    width: screenshot.width,
  });
  await waitForScreenshotSettle(client);

  if (screenshot.scrollSelector) {
    await scrollToScreenshotTarget(client, screenshot);
    await waitForScreenshotSettle(client);
  } else if (Number.isFinite(screenshot.scrollY) && screenshot.scrollY > 0) {
    await evaluateInPage(client, `window.scrollTo(0, ${Math.round(screenshot.scrollY)})`);
    await waitForScreenshotSettle(client);
  }

  const { data } = await client.send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    format: 'png',
    fromSurface: true,
  });

  await writeFile(path.join(outputDir, screenshot.outputName), Buffer.from(data, 'base64'));
}

async function waitForScreenshotSettle(client) {
  await evaluateInPage(client, `new Promise((resolve) => setTimeout(resolve, ${screenshotMotionSettleMs}))`);
  await waitForDemoFrame(client);
}

async function scrollToScreenshotTarget(client, screenshot) {
  const selector = JSON.stringify(screenshot.scrollSelector);
  const margin = Number.isFinite(screenshot.scrollMargin)
    ? Math.max(Math.round(screenshot.scrollMargin), 0)
    : 0;

  await evaluateInPage(client, `(() => {
    const target = document.querySelector(${selector});

    if (!target) {
      throw new Error('Screenshot target not found: ' + ${selector});
    }

    const rect = target.getBoundingClientRect();
    window.scrollTo(0, Math.max(0, Math.round(window.scrollY + rect.top - ${margin})));
  })()`);
}
