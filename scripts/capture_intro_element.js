const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_stage_2000ms.png'),
    animations: 'allow'
  });
  console.log('Intro page captured with animations allowed at 2000ms');

  await browser.close();
})();
