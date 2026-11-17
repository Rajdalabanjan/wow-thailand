const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

async function testBackButton() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('1. Navigating to Banyan Tree Bangkok directly via URL: http://localhost:5173/hotels?hotel=th-htl-02 ...');
  await page.goto('http://localhost:5173/hotels?hotel=th-htl-02');
  await page.waitForTimeout(2000);

  // Skip intro overlay if present
  try {
    const skipBtn = await page.locator('button:has-text("Skip"), [class*="skip"], button:has-text("ENTER")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) {
      console.log('   Dismissing intro overlay...');
      await skipBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  } catch (e) {}

  // Verify we are on hotel details page
  const hotelTitle = await page.locator('h1, h2, h3, h4, h5').filter({ hasText: 'Banyan Tree Bangkok' }).first();
  const isHotelVisible = await hotelTitle.isVisible();
  console.log('   Is Banyan Tree Bangkok details visible?', isHotelVisible);
  console.log('   Current URL before click:', page.url());

  await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/before_back_click.png' });

  // Find the "× Back" button
  const backBtn = await page.locator('button:has-text("Back")').first();
  if (await backBtn.isVisible()) {
    console.log('2. Clicking "Back" button...');
    await backBtn.click();
    await page.waitForTimeout(2000);

    console.log('   Current URL after Back click:', page.url());

    // Check if hotel listing / results section is now visible
    const listingHeader = await page.locator('text=WHERE TO STAY?, text=Featured Properties, text=Showing, text=Search Hotels').first();
    const isListingVisible = await listingHeader.isVisible();
    console.log('   Are hotel listings / search visible?', isListingVisible);

    // Verify hotel details is no longer active
    const hotelDetailsModal = await page.locator('h1, h2, h3, h4, h5').filter({ hasText: 'Banyan Tree Bangkok - Iconic Skyline' }).first();
    const isDetailStillOpen = await hotelDetailsModal.isVisible();
    console.log('   Is hotel detail page still open (should be false)?', isDetailStillOpen);

    await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/after_back_click.png' });

    if (!isDetailStillOpen && page.url().endsWith('/hotels')) {
      console.log('SUCCESS: Back button works perfectly! Returned to hotel listings and updated URL.');
    } else {
      console.log('FAILURE: Back button did not return to hotel listings properly.');
    }
  } else {
    console.log('Could not find Back button on page!');
  }

  // 3. Test clicking a hotel card from the listings and then clicking Back arrow button (←)
  console.log('\n3. Testing opening hotel from listing and clicking arrow back (←)...');
  const viewDetailsBtn = await page.locator('button:has-text("View Details"), button:has-text("Explore Property"), button:has-text("View Rates")').first();
  if (await viewDetailsBtn.isVisible()) {
    await viewDetailsBtn.click();
    await page.waitForTimeout(2000);
    console.log('   Opened hotel details. URL:', page.url());

    const arrowBackBtn = await page.locator('button[title*="Back"], button:has(svg.lucide-arrow-left)').first();
    if (await arrowBackBtn.isVisible()) {
      console.log('   Clicking arrow Back button (←)...');
      await arrowBackBtn.click();
      await page.waitForTimeout(2000);
      console.log('   URL after arrow back:', page.url());
      await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/after_arrow_back.png' });
    }
  }

  await browser.close();
}

testBackButton().catch(console.error);

