const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

async function testBothButtons() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // ── TEST 1: Right "× Back" button ──
  console.log('\n--- TEST 1: Testing right "× Back" button ---');
  await page.goto('http://localhost:5173/hotels?hotel=th-htl-02');
  await page.waitForTimeout(2000);
  try {
    const skipBtn = await page.locator('button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) await skipBtn.click({ force: true });
  } catch(e) {}
  await page.waitForTimeout(1000);

  console.log('1. Currently on:', page.url());
  const rightBackBtn = await page.locator('button:has-text("Back")').first();
  console.log('   Clicking right "× Back" button...');
  await rightBackBtn.click();
  await page.waitForTimeout(1500);

  const urlAfterRight = page.url();
  const sessionAfterRight = await page.evaluate(() => sessionStorage.getItem('tg_activeTab'));
  console.log('   URL after right Back:', urlAfterRight);
  console.log('   Active Tab after right Back:', sessionAfterRight);
  await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/test1_right_back.png' });

  // ── TEST 2: Left "←" arrow back button ──
  console.log('\n--- TEST 2: Testing left "←" arrow back button ---');
  await page.goto('http://localhost:5173/hotels?hotel=th-htl-01');
  await page.waitForTimeout(2000);
  try {
    const skipBtn = await page.locator('button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) await skipBtn.click({ force: true });
  } catch(e) {}
  await page.waitForTimeout(1000);

  console.log('2. Currently on:', page.url());
  const leftArrowBtn = await page.locator('button[title*="Back"], button:has(svg.lucide-arrow-left)').first();
  console.log('   Clicking left "←" arrow back button...');
  await leftArrowBtn.click();
  await page.waitForTimeout(1500);

  const urlAfterLeft = page.url();
  const sessionAfterLeft = await page.evaluate(() => sessionStorage.getItem('tg_activeTab'));
  console.log('   URL after left Back:', urlAfterLeft);
  console.log('   Active Tab after left Back:', sessionAfterLeft);
  await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/test2_left_back.png' });

  // ── TEST 3: Browser native back button ──
  console.log('\n--- TEST 3: Testing browser native back button ---');
  // First go to /hotels
  await page.goto('http://localhost:5173/hotels');
  await page.waitForTimeout(2000);
  try {
    const skipBtn = await page.locator('button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) await skipBtn.click({ force: true });
  } catch(e) {}
  await page.waitForTimeout(1000);

  // Click on a hotel card to open it
  const hotelCard = await page.locator('div.card, div[class*="hotel-card"]').first();
  console.log('   Clicking a hotel card from the listings...');
  await hotelCard.click();
  await page.waitForTimeout(2000);
  console.log('   URL on hotel details:', page.url());

  // Click browser native back
  console.log('   Clicking browser native back...');
  await page.goBack();
  await page.waitForTimeout(1500);

  const urlAfterNative = page.url();
  const sessionAfterNative = await page.evaluate(() => sessionStorage.getItem('tg_activeTab'));
  console.log('   URL after browser native back:', urlAfterNative);
  console.log('   Active Tab after browser native back:', sessionAfterNative);
  await page.screenshot({ path: 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/test3_browser_native_back.png' });

  const allPassed = urlAfterRight.endsWith('/hotels') && 
                    sessionAfterRight === 'hotels' && 
                    urlAfterLeft.endsWith('/hotels') && 
                    sessionAfterLeft === 'hotels' && 
                    urlAfterNative.endsWith('/hotels') && 
                    sessionAfterNative === 'hotels';

  console.log('\n======================================');
  console.log('ALL 3 BACK NAVIGATION TESTS PASSED?', allPassed);
  console.log('======================================');

  await browser.close();
}

testBothButtons().catch(console.error);

