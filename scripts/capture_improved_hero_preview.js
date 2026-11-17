const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Launching browser to capture improved UI preview...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Frame 1: Bangkok fully synced, clean typewriter and matching search box
  console.log('Capturing Frame 1: Bangkok synchronized...');
  const path1 = path.join(ARTIFACT_DIR, 'hero_improved_preview_bangkok.png');
  await page.screenshot({ path: path1 });
  console.log('Saved:', path1);

  // Frame 2: Click Pattaya destination card to demonstrate dynamic sync
  console.log('Clicking Pattaya destination card...');
  const pattayaCard = await page.$('.dest-card-item:has-text("Pattaya")');
  if (pattayaCard) {
    await pattayaCard.click();
    await page.waitForTimeout(2000);
  }
  const path2 = path.join(ARTIFACT_DIR, 'hero_improved_preview_pattaya.png');
  await page.screenshot({ path: path2 });
  console.log('Saved:', path2);

  // Frame 3: Click Phuket destination card to demonstrate tropical island sync
  console.log('Clicking Phuket destination card...');
  const phuketCard = await page.$('.dest-card-item:has-text("Phuket")');
  if (phuketCard) {
    await phuketCard.click();
    await page.waitForTimeout(2000);
  }
  const path3 = path.join(ARTIFACT_DIR, 'hero_improved_preview_phuket.png');
  await page.screenshot({ path: path3 });
  console.log('Saved:', path3);

  await browser.close();
  console.log('All improved previews captured successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

