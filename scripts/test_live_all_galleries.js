const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

async function testGalleries() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const hotelIds = ['th-htl-02', 'th-htl-01', 'th-htl-04'];
  const results = {};

  for (const hId of hotelIds) {
    console.log(`\nTesting hotel ${hId}...`);
    // Clear session storage before each load to simulate fresh visit
    await page.goto(`http://localhost:5173/hotels?hotel=${hId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click "Open Full Gallery" button
    const openBtn = await page.locator('button:has-text("Open Full Gallery")').first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(1000);

      // Collect all image src in the gallery
      const imgElements = await page.locator('.modal img, div[style*="z-index: 1060"] img, div[style*="z-index: 1055"] img').all();
      const srcs = [];
      for (const el of imgElements) {
        const src = await el.getAttribute('src');
        if (src && !srcs.includes(src)) srcs.push(src);
      }

      const modalTitle = await page.locator('h5:has-text("Gallery")').textContent();
      results[hId] = {
        title: modalTitle,
        imageCount: srcs.length,
        images: srcs
      };

      console.log(`  Modal Title: ${modalTitle}`);
      console.log(`  Found ${srcs.length} unique photos in modal:`);
      srcs.forEach((s, idx) => console.log(`    ${idx + 1}: ${s.substring(0, 80)}...`));

      const screenshotPath = `C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/live_gallery_${hId}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`  Screenshot saved to ${screenshotPath}`);

      // Close modal
      const closeBtn = await page.locator('button[title*="Close Gallery"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('  Could not find Open Full Gallery button!');
    }
  }

  // Cross-check for any overlapping images across the tested hotels
  console.log('\n--- CROSS HOTEL OVERLAP CHECK ---');
  let overlaps = 0;
  const allImagesSeen = {};
  for (const [hId, data] of Object.entries(results)) {
    for (const url of data.images) {
      if (allImagesSeen[url]) {
        console.log(`OVERLAP FOUND: ${url} appears in ${allImagesSeen[url]} AND ${hId}!`);
        overlaps++;
      } else {
        allImagesSeen[url] = hId;
      }
    }
  }

  if (overlaps === 0) {
    console.log('SUCCESS: ZERO overlapping photos found across all hotel galleries!');
  } else {
    console.log(`FAIL: ${overlaps} overlapping photos found!`);
  }

  await browser.close();
}

testGalleries().catch(console.error);
