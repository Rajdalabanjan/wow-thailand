const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Wait until reveal starts: SHOW_MS is 3200ms
  // Let's capture at 3450ms (during the 1100ms curtain slide)
  await page.waitForTimeout(3450);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_theatrical_parting_curtain.png'),
    animations: 'allow'
  });
  console.log('Theatrical parting curtain captured at 3450ms');

  await browser.close();
})();

