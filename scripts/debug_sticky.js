const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const stickyAnalysis = await page.evaluate(() => {
    const el = document.querySelector('.concierge-3d-section > div');
    if (!el) return 'el not found';

    // Check all parent elements up to body/html for overflow properties
    const parents = [];
    let p = el.parentElement;
    while (p) {
      const style = window.getComputedStyle(p);
      parents.push({
        tag: p.tagName,
        className: p.className,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        display: style.display,
        height: style.height
      });
      p = p.parentElement;
    }
    return {
      elSticky: window.getComputedStyle(el).position,
      elTop: window.getComputedStyle(el).top,
      parents
    };
  });

  console.log(JSON.stringify(stickyAnalysis, null, 2));
  await browser.close();
})();

