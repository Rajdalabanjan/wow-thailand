const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Capturing frames of the new Luxury Video Intro...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  
  // Navigate to root
  await page.goto(BASE_URL + '/', { waitUntil: 'commit' });
  
  // Wait 1.4s for video + logo reveal
  await page.waitForTimeout(1400);
  const p1 = path.join(ARTIFACT_DIR, 'luxury_intro_frame_1.png');
  await page.screenshot({ path: p1 });
  console.log('Saved frame 1 to:', p1);

  // Wait another 1.6s for light sweep + full gold title
  await page.waitForTimeout(1600);
  const p2 = path.join(ARTIFACT_DIR, 'luxury_intro_frame_2.png');
  await page.screenshot({ path: p2 });
  console.log('Saved frame 2 to:', p2);

  // Wait another 2.5s for transition into website
  await page.waitForTimeout(2500);
  const p3 = path.join(ARTIFACT_DIR, 'luxury_intro_frame_3_reveal.png');
  await page.screenshot({ path: p3 });
  console.log('Saved frame 3 to:', p3);

  await browser.close();
  console.log('Done capturing all intro preview frames!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

