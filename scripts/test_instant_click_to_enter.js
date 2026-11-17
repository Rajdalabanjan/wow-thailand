const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Wait 800ms while intro is active, then click anywhere on screen!
  await page.waitForTimeout(800);
  console.log('Clicking to enter immediately...');
  await page.click('#wow-intro');

  // Wait 400ms into the curtain split
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_click_to_enter_parting.png'),
    animations: 'allow'
  });

  // Wait 800ms for full reveal
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_click_to_enter_revealed.png'),
    animations: 'allow'
  });

  const introExists = await page.evaluate(() => !!document.getElementById('wow-intro'));
  console.log('Intro removed from DOM:', !introExists);

  await browser.close();
  console.log('Instant click-to-enter test completed successfully!');
})();

