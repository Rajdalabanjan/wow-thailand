const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Capturing updated Login Modal Quick Access Demo Accounts...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click Login button in header to open modal
  const loginBtn = await page.$('button:has-text("Login"), a:has-text("Login")');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(1500);
  }

  // Ensure Quick Access drawer is open
  const drawerHeader = await page.$('h6:has-text("Quick Access Demo Accounts")');
  if (drawerHeader) {
    const isVisible = await page.$('.btn-outline-secondary:has-text("Superadmin")');
    if (!isVisible) {
      await drawerHeader.click();
      await page.waitForTimeout(1000);
    }
  }

  const outputPath = path.join(ARTIFACT_DIR, 'login_modal_updated_passwords.png');
  await page.screenshot({ path: outputPath });
  console.log('Screenshot saved to:', outputPath);

  await browser.close();
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

