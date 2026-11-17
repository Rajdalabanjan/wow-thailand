const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

async function inspectHotel(hotelId) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log(`\nNavigating to hotel ${hotelId}...`);
  await page.goto(`http://localhost:5173/hotels?hotel=${hotelId}`);
  await page.waitForTimeout(2000);

  // If intro video is present, dismiss it
  try {
    const skipBtn = await page.locator('button:has-text("Skip"), [class*="skip"], button:has-text("ENTER")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) {
      console.log('Dismissing intro overlay...');
      await skipBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  } catch (e) {}

  // Look for Open Full Gallery button
  const galleryBtn = await page.locator('button:has-text("Open Full Gallery")').first();
  if (await galleryBtn.isVisible({ timeout: 5000 })) {
    console.log(`Found Open Full Gallery button for ${hotelId}! Clicking...`);
    await galleryBtn.click();
    await page.waitForTimeout(2000);

    // Extract all images in the open gallery modal
    const images = await page.$$eval('.modal img, div[style*="z-index"] img', imgs => imgs.map(i => i.src).filter(Boolean));
    const uniqueImgs = [...new Set(images)];
    console.log(`Gallery for ${hotelId} contains ${uniqueImgs.length} images:`);
    uniqueImgs.forEach((src, idx) => console.log(`  [${idx + 1}] ${src}`));

    const screenshotPath = `C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/${hotelId}_gallery_verified.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);
  } else {
    console.log(`Could not find Open Full Gallery button for ${hotelId}.`);
    await page.screenshot({ path: `C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/${hotelId}_not_found.png` });
  }

  await browser.close();
}

(async () => {
  await inspectHotel('th-htl-02'); // Banyan Tree Bangkok
  await inspectHotel('th-htl-01'); // The Shore at Katathani Phuket
  await inspectHotel('th-htl-04'); // Hilton Pattaya
})();
