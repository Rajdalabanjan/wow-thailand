const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'intro_time_1000ms.png'), animations: 'allow' });

  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'intro_time_1800ms.png'), animations: 'allow' });

  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'intro_time_2400ms.png'), animations: 'allow' });

  await browser.close();
  console.log('Intro timeline captured cleanly!');
})();

