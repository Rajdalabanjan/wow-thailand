const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Navigate to localhost
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Wait 2.2 seconds into the video
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(artifactDir, 'new_video_intro_2200ms.png') });

  // Wait 4.5 seconds into the video
  await page.waitForTimeout(2300);
  await page.screenshot({ path: path.join(artifactDir, 'new_video_intro_4500ms.png') });

  // Mobile screenshot
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2200);
  await mobilePage.screenshot({ path: path.join(artifactDir, 'new_video_intro_mobile.png') });

  await browser.close();
  console.log('New Gemini video intro captures completed successfully!');
})();
