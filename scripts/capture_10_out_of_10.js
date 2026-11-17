const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });

  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // 1. Initial appearance: Crest, glowing beam, start of characters
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'ten_out_of_ten_frame1.png') });
  console.log('Frame 1 captured at 600ms.');

  // 2. Letters populated + golden metallic sweep
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join(artifactDir, 'ten_out_of_ten_frame2.png') });
  console.log('Frame 2 captured at 2000ms.');

  // 3. Peak 10/10 grandeur: Pagoda Crest + 24k chiseled title + floating stardust
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'ten_out_of_ten_frame3.png') });
  console.log('Frame 3 captured at 3000ms.');

  // 4. Curtains parting with center laser flare burst
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'ten_out_of_ten_frame4_parting.png') });
  console.log('Frame 4 captured at 3600ms.');

  // 5. Revealed hero
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'ten_out_of_ten_frame5_revealed.png') });
  console.log('Frame 5 captured at 4800ms.');

  await browser.close();
  console.log('All 10/10 frames captured successfully!');
})();
