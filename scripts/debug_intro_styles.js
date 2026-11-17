const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  await page.waitForTimeout(2200);

  const dump = await page.evaluate(() => {
    const chars = Array.from(document.querySelectorAll('.wow-intro__char')).map(c => ({
      text: c.textContent,
      opacity: window.getComputedStyle(c).opacity,
      transform: window.getComputedStyle(c).transform,
      color: window.getComputedStyle(c).color,
      visibility: window.getComputedStyle(c).visibility
    }));
    const title = document.querySelector('.wow-intro__title');
    const goldWord = document.querySelector('.wow-intro__word--gold');
    const crest = document.querySelector('.wow-intro__crest');
    return {
      charsCount: chars.length,
      sampleChars: chars.slice(0, 5),
      titleDisplay: title ? window.getComputedStyle(title).display : 'none',
      goldWordBgClip: goldWord ? window.getComputedStyle(goldWord).webkitBackgroundClip : 'none',
      goldWordColor: goldWord ? window.getComputedStyle(goldWord).color : 'none',
      crestVisible: crest ? window.getComputedStyle(crest).display : 'none'
    };
  });

  console.log(JSON.stringify(dump, null, 2));
  await browser.close();
})();

