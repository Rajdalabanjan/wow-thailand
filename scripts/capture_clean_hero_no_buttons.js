const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Capturing hero section without right destination buttons stack...');
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
  await page.waitForTimeout(3000);

  const outputPath = path.join(ARTIFACT_DIR, 'hero_clean_no_right_buttons.png');
  await page.screenshot({ path: outputPath });
  console.log('Screenshot saved to:', outputPath);

  await browser.close();
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

