const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000); // Wait for intro to exit

  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Scroll section into view
  await page.evaluate(() => {
    const el = document.querySelector('.concierge-3d-section');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);

  // Experience 0: Cabs & Airport Telemetry
  await page.screenshot({ path: path.join(artifactDir, '3d_showcase_0_cabs.png') });
  console.log('3D Showcase 0 (Cabs) captured');

  // Click Experience 1: Hotel Pass
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.concierge-3d-section button');
    // Button index 1 is Hotels
    if (buttons[1]) buttons[1].click();
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(artifactDir, '3d_showcase_1_hotels.png') });
  console.log('3D Showcase 1 (Hotels) captured');

  // Click Experience 2: Island Tours
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.concierge-3d-section button');
    // Button index 2 is Tours
    if (buttons[2]) buttons[2].click();
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(artifactDir, '3d_showcase_2_tours.png') });
  console.log('3D Showcase 2 (Tours) captured');

  // Click Experience 3: Concierge Chat
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.concierge-3d-section button');
    // Button index 3 is Concierge Chat
    if (buttons[3]) buttons[3].click();
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(artifactDir, '3d_showcase_3_concierge.png') });
  console.log('3D Showcase 3 (Concierge) captured');

  await browser.close();
  console.log('All 4 interactive 3D showcase states captured cleanly!');
})();

