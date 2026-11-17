const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  for (let t of [500, 1000, 1500, 2000, 2500]) {
    await page.waitForTimeout(500);
    const rootHtml = await page.evaluate(() => {
      const r = document.getElementById('root');
      return {
        t: performance.now(),
        children: r ? r.children.length : 0,
        innerLen: r ? r.innerHTML.length : 0,
        hasBrand: !!document.querySelector('#root .brand-text-title')
      };
    });
    console.log(rootHtml);
  }
  await browser.close();
})();

