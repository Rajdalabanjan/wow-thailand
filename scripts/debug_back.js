const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Add console listener
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:5173/hotels?hotel=th-htl-02');
  await page.waitForTimeout(2000);
  try {
    const skipBtn = await page.locator('button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) await skipBtn.click({ force: true });
  } catch(e) {}
  await page.waitForTimeout(1000);

  console.log('Before click URL:', page.url());
  const backBtn = await page.locator('button:has-text("Back")').first();
  console.log('Back button found? Clicking...');
  await backBtn.click();
  await page.waitForTimeout(2000);

  console.log('After click URL:', page.url());
  const h5Text = await page.$$eval('h5', els => els.map(e => e.innerText));
  console.log('H5 elements:', h5Text);
  const h2Text = await page.$$eval('h2', els => els.map(e => e.innerText));
  console.log('H2 elements:', h2Text);

  // Check what tab is active
  const activeTabInApp = await page.evaluate(() => {
    return {
      sessionActiveTab: sessionStorage.getItem('tg_activeTab'),
      sessionItem: !!sessionStorage.getItem('tg_selectedDetailItem'),
      locationHref: window.location.href
    };
  });
  console.log('App state evaluated:', activeTabInApp);

  await browser.close();
})();

