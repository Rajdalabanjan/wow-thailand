const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Open site
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });

  // 1. Capture at 2200ms (Full monumental stage)
  await page.waitForTimeout(2200);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_monumental_stage.png'),
    animations: 'allow'
  });
  console.log('Monumental stage captured at 2200ms');

  // 2. Simulate cursor movement to trigger 3D perspective parallax
  await page.mouse.move(950, 320);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_monumental_parallax.png'),
    animations: 'allow'
  });
  console.log('Parallax stage captured');

  // 3. Mobile viewport capture
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'commit' });
  await mobilePage.waitForTimeout(2200);
  await mobilePage.screenshot({
    path: path.join(artifactDir, 'intro_monumental_mobile.png'),
    animations: 'allow'
  });
  console.log('Mobile intro stage captured');

  await browser.close();
  console.log('All intro captures completed successfully!');
})();

