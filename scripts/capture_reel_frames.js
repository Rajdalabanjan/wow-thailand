const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Capturing reel frames at multiple timestamps...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });

  // Frame 1: Scene 1 - 3D Gold Brand Logo Reveal (~1.2s)
  await page.waitForTimeout(1200);
  const p1 = path.join(ARTIFACT_DIR, 'reel_1_gold_logo.png');
  await page.screenshot({ path: p1 });
  console.log('Saved:', p1);

  // Frame 2: Scene 2 - Ultra-Luxury Yacht in Andaman (~4.0s)
  await page.waitForTimeout(3000);
  const p2 = path.join(ARTIFACT_DIR, 'reel_2_luxury_yacht.png');
  await page.screenshot({ path: p2 });
  console.log('Saved:', p2);

  // Frame 3: Scene 3 - 5-Star Cliffside Pool Villa at Sunset (~7.2s)
  await page.waitForTimeout(3200);
  const p3 = path.join(ARTIFACT_DIR, 'reel_3_cliffside_villa.png');
  await page.screenshot({ path: p3 });
  console.log('Saved:', p3);

  // Frame 4: Scene 4 - Beachfront Overwater Lagoon (~10.2s)
  await page.waitForTimeout(3000);
  const p4 = path.join(ARTIFACT_DIR, 'reel_4_beachfront_lagoon.png');
  await page.screenshot({ path: p4 });
  console.log('Saved:', p4);

  await browser.close();
  console.log('Finished capturing all reel frames!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

