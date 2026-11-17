const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000); // Wait for intro to exit

  // Screenshot just the navbar
  const navbar = await page.$('nav.navbar, header.navbar-glass');
  if (navbar) {
    await navbar.screenshot({
      path: path.join('C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d', 'navbar_screenshot.png')
    });
    console.log('Navbar screenshot captured.');
  } else {
    console.log('Navbar not found');
  }

  await browser.close();
})();

