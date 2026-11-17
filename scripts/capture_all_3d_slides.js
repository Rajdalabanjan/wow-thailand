const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // Wait for intro to exit

  const artifactDir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

  // Function to scroll into the section at a given percentage (0.0 to 1.0)
  const scrollToSlide = async (pct) => {
    await page.evaluate((fraction) => {
      const el = document.querySelector('.concierge-3d-section');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const absTop = rect.top + window.scrollY;
      const scrollableDist = el.offsetHeight - window.innerHeight;
      const targetY = absTop + Math.max(0, scrollableDist * fraction);
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }, pct);
  };

  // Slide 0: 0%
  await scrollToSlide(0.05);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'showcase_slide_0_chauffeur.png') });
  console.log('Slide 0 captured');

  // Slide 1: 35%
  await scrollToSlide(0.35);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'showcase_slide_1_hotels.png') });
  console.log('Slide 1 captured');

  // Slide 2: 65%
  await scrollToSlide(0.68);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'showcase_slide_2_tours.png') });
  console.log('Slide 2 captured');

  // Slide 3: 95%
  await scrollToSlide(0.95);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'showcase_slide_3_concierge.png') });
  console.log('Slide 3 captured');

  await browser.close();
  console.log('All slides captured successfully with dynamic positioning!');
})();
