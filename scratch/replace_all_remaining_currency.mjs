import fs from 'fs';
import path from 'path';

const dirsToScan = [
  'e:/wow tailend/frontend/src/pages/b2b',
  'e:/wow tailend/frontend/src/pages/admin',
  'e:/wow tailend/frontend/src/components/admin',
  'e:/wow tailend/frontend/src/components/superadmin',
  'e:/wow tailend/frontend/src/components/common',
  'e:/wow tailend/frontend/src/components/shared',
  'e:/wow tailend/frontend/src/components/widgets'
];

function scanAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      if (content.includes('₹')) {
        content = content.replaceAll('₹', '฿');
        modified = true;
      }

      if (content.includes("'en-IN'")) {
        content = content.replaceAll("'en-IN'", "'en-US'");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

for (const dir of dirsToScan) {
  scanAndReplace(dir);
}

console.log('Finished updating remaining currency references.');
