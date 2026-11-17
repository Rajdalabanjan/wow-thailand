const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/hotels?hotel=th-htl-01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const galleryBtn = await page.$('button:has-text("Open Full Gallery")');
  if (galleryBtn) {
    await galleryBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.resolve(__dirname, 'gallery_modal_phuket.png') });
    console.log('Captured Phuket gallery modal screenshot!');
  }
  
  await browser.close();
})();
