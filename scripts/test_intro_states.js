const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  
  const steps = [500, 1500, 2500, 3200, 3800];
  let elapsed = 0;
  for (const t of steps) {
    await page.waitForTimeout(t - elapsed);
    elapsed = t;
    const info = await page.evaluate(() => {
      const el = document.getElementById('wow-intro');
      if (!el) return { exists: false };
      return {
        exists: true,
        className: el.className,
        hidden: el.hidden,
        stageOpacity: window.getComputedStyle(el.querySelector('.wow-intro__stage')).opacity,
        curtainTopTransform: window.getComputedStyle(el.querySelector('.wow-intro__curtain--top')).transform
      };
    });
    console.log('t=' + t + 'ms:', JSON.stringify(info));
  }
  await browser.close();
})();

