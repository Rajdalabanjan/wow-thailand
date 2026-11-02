// ========================================================================
// WOW THAILAND: Master Test Suite Runner
// Executes Smoke Tests and Frontend Contract Tests sequentially
// ========================================================================

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n============================================================`);
    console.log(`RUNNING: ${testFile}`);
    console.log(`============================================================\n`);

    const fullPath = path.join(__dirname, testFile);
    const child = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('🚀 WOW THAILAND — Starting Full Test Suite Execution...');

  const smokeSuccess = await runTest('smoke_tests.js');
  if (!smokeSuccess) {
    console.error('❌ Smoke tests failed!');
    process.exit(1);
  }

  const contractSuccess = await runTest('frontend_contract_tests.js');
  if (!contractSuccess) {
    console.error('❌ Frontend contract tests failed!');
    process.exit(1);
  }

  const securitySuccess = await runTest('security_regression_tests.js');
  if (!securitySuccess) {
    console.error('❌ Security regression tests failed!');
    process.exit(1);
  }

  const cabSuccess = await runTest('cab_transfer_tests.js');
  if (!cabSuccess) {
    console.error('❌ Cab & Transfer tests failed!');
    process.exit(1);
  }

  const driverSuccess = await runTest('driver_companion_tests.js');
  if (!driverSuccess) {
    console.error('❌ Driver Companion tests failed!');
    process.exit(1);
  }

  const phase5Success = await runTest('vendor_dispatch_phase5_tests.js');
  if (!phase5Success) {
    console.error('❌ Cab Vendor & Admin Dispatch (Phase 5) tests failed!');
    process.exit(1);
  }

  const uxVerificationSuccess = await runTest('transfer_ux_verification_tests.js');
  if (!uxVerificationSuccess) {
    console.error('❌ Customer Transfer UX Verification tests failed!');
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`🎉 ALL WOW THAILAND TEST SUITES PASSED SUCCESSFULLY!`);
  console.log(`============================================================\n`);
  process.exit(0);
}

main();
