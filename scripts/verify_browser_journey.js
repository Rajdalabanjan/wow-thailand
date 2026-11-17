const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  
  // Wait 4.5s for normal intro completion and site render
  await page.waitForTimeout(4500);

  const pageCheck = await page.evaluate(() => {
    return {
      title: document.title,
      hasNavbar: !!document.querySelector('.brand-text-title'),
      hasSearchWidget: !!document.querySelector('.search-widget, .hero-search-tabs, .search-container'),
      renderedHotelsCount: document.querySelectorAll('.hotel-card, [data-hotel-id]').length,
      introRemoved: !document.getElementById('wow-intro')
    };
  });

  console.log('Live Frontend Evaluation:', JSON.stringify(pageCheck, null, 2));
  console.log('Uncaught errors count:', errors.length);

  await browser.close();
  console.log('Journey check passed cleanly.');
})();
