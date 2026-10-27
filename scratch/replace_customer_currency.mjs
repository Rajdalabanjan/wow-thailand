import fs from 'fs';
import path from 'path';

const dirs = [
  'e:/wow tailend/frontend/src/components/customer',
  'e:/wow tailend/frontend/src/pages/customer'
];

let totalReplacements = 0;

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (content.includes('₹')) {
      content = content.replaceAll('₹', '฿');
      modified = true;
    }

    if (content.includes("'en-IN'")) {
      content = content.replaceAll("'en-IN'", "'en-US'");
      modified = true;
    }

    if (content.includes('wow_goa_platform_fee')) {
      content = content.replaceAll('wow_goa_platform_fee', 'wow_thailand_platform_fee');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated customer file: ${file}`);
      totalReplacements++;
    }
  }
}

console.log(`Successfully updated ${totalReplacements} customer files.`);
