const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACTS_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';

async function testParallaxHero() {
  console.log('--- Starting Parallax Depth Slide & Headline Sync Verification ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // Skip intro if present
  try {
    const skipBtn = await page.locator('button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) {
      console.log('Skipping intro overlay...');
      await skipBtn.click({ force: true });
    }
  } catch (e) {}

  await page.waitForTimeout(1000);

  // 1. Initial State Verification (Bangkok)
  const initialHeadline = await page.locator('.hero-serif-thailand').innerText();
  const initialCaption = await page.locator('.hero-slide-caption__name').innerText();
  console.log('1. Initial Destination:', { headline: initialHeadline.trim(), caption: initialCaption.trim() });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'hero_slide_0_bangkok.png') });

  // 2. Click Next to trigger Pattaya transition
  console.log('2. Clicking Next Slide Arrow...');
  const nextBtn = page.locator('.hero-slide-arrows button').nth(1);
  await nextBtn.click();

  // Capture frame at ~250ms (in flight)
  await page.waitForTimeout(250);
  const midState = await page.evaluate(() => {
    const active = document.querySelector('.hero-bg-photo.active');
    const leaving = document.querySelector('.hero-bg-photo.leaving');
    const headlineActive = document.querySelector('.hero-dest-name-text.active');
    const headlineLeaving = document.querySelector('.hero-dest-name-text.leaving');
    return {
      activeClass: active ? active.className : null,
      leavingClass: leaving ? leaving.className : null,
      headlineActive: headlineActive ? headlineActive.innerText : null,
      headlineLeaving: headlineLeaving ? headlineLeaving.innerText : null,
      activeComputedTransform: active ? window.getComputedStyle(active).transform : null,
      leavingComputedTransform: leaving ? window.getComputedStyle(leaving).transform : null
    };
  });
  console.log('   In-flight (250ms) state:', midState);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'hero_slide_transition_inflight.png') });

  // Wait for 0.9s transition to settle (wait total 1100ms from click)
  await page.waitForTimeout(850);
  const settledHeadline = await page.locator('.hero-serif-thailand').innerText();
  const settledCaption = await page.locator('.hero-slide-caption__name').innerText();
  console.log('3. Settled State (Pattaya):', { headline: settledHeadline.trim(), caption: settledCaption.trim() });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'hero_slide_1_pattaya.png') });

  // 4. Click Next again for Krabi
  console.log('4. Clicking Next Slide Arrow for Krabi...');
  await nextBtn.click();
  await page.waitForTimeout(1100);
  const krabiHeadline = await page.locator('.hero-serif-thailand').innerText();
  const krabiCaption = await page.locator('.hero-slide-caption__name').innerText();
  console.log('   Settled State (Krabi):', { headline: krabiHeadline.trim(), caption: krabiCaption.trim() });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'hero_slide_2_krabi.png') });

  // 5. Test Previous Arrow (go back to Pattaya)
  console.log('5. Clicking Previous Slide Arrow...');
  const prevBtn = page.locator('.hero-slide-arrows button').nth(0);
  await prevBtn.click();
  await page.waitForTimeout(1100);
  const backHeadline = await page.locator('.hero-serif-thailand').innerText();
  console.log('   Back to Pattaya:', { headline: backHeadline.trim() });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'hero_slide_back_pattaya.png') });

  await browser.close();
  console.log('--- Parallax Depth Slide & Headline Sync Verification Complete ---');
}

testParallaxHero().catch(console.error);

