import fs from 'fs';
import path from 'path';

const pmsDir = 'e:/wow tailend/frontend/src/pages/vendor/pms';
const files = fs.readdirSync(pmsDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

let totalReplacements = 0;

for (const file of files) {
  const filePath = path.join(pmsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  if (content.includes('₹')) {
    content = content.replaceAll('₹', '฿');
    modified = true;
  }

  // Also replace Indian Rupee locale references with standard formatting if needed
  if (content.includes("'en-IN'")) {
    content = content.replaceAll("'en-IN'", "'en-US'");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated currency in: ${file}`);
    totalReplacements++;
  }
}

console.log(`Successfully updated ${totalReplacements} PMS files.`);
