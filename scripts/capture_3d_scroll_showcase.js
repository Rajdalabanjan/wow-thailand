const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000); // Wait for intro to exit

  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Scroll down to the 3D Concierge Experience section
  console.log('Scrolling to 3D Concierge Experience section...');
  await page.evaluate(() => {
    const el = document.querySelector('.concierge-3d-section');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, '3d_scroll_step_0_cabs.png') });
  console.log('Step 0 (Cabs) captured.');

  // Scroll 500px down inside the section
  await page.evaluate(() => window.scrollBy({ top: 550, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, '3d_scroll_step_1_hotels.png') });
  console.log('Step 1 (Hotels) captured.');

  // Scroll another 550px down inside the section
  await page.evaluate(() => window.scrollBy({ top: 550, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, '3d_scroll_step_2_tours.png') });
  console.log('Step 2 (Tours) captured.');

  await browser.close();
  console.log('All 3D scroll showcase screenshots captured successfully!');
})();

