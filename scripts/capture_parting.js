const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Wait 2200ms for full logo, then click to trigger instant parting
  await page.waitForTimeout(2200);
  await page.click('#wow-intro');
  // Wait 300ms so curtains are sliding apart with gold seams
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(artifactDir, 'intro_parting_cinematic.png'),
    animations: 'allow'
  });
  console.log('Parting snapshot captured at 300ms into reveal');

  await browser.close();
})();

