const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  
  const timestamps = [400, 1000, 1800, 2600, 3800];
  for (let i = 0; i < timestamps.length; i++) {
    await page.waitForTimeout(i === 0 ? timestamps[0] : (timestamps[i] - timestamps[i-1]));
    const p = path.join('C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d', 'user_intro_step_' + i + '.png');
    await page.screenshot({ path: p });
    console.log('Captured step ' + i + ' at ' + timestamps[i] + 'ms');
  }
  await browser.close();
})();
