const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Snapshot 1: t = 1200ms (Crest, WOW letters glowing, THAILAND building)
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'intro_10_step1_building.png') });

  // Snapshot 2: t = 2400ms (Peak Majesty: Royal Crest, 3D Chiseled Gold, Glint Sweep, Stardust)
  await page.waitForTimeout(1200); // 1200 + 1200 = 2400ms
  await page.screenshot({ path: path.join(artifactDir, 'intro_10_step2_peak_majesty.png') });

  // Snapshot 3: t = 3450ms (Theatrical Curtain Reveal with Golden Center Flare)
  await page.waitForTimeout(1050); // 2400 + 1050 = 3450ms
  await page.screenshot({ path: path.join(artifactDir, 'intro_10_step3_curtain_flare.png') });

  // Snapshot 4: t = 4400ms (Clean Seamless Entry into Homepage)
  await page.waitForTimeout(950); // 3450 + 950 = 4400ms
  await page.screenshot({ path: path.join(artifactDir, 'intro_10_step4_site_revealed.png') });

  await browser.close();
  console.log('Finished capturing all 4 key milestone frames.');
})();

