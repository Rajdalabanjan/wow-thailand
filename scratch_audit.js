const fs = require('fs');
const path = require('path');

function searchPatterns(dir, patterns, results = {}) {
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (['node_modules', 'dist', 'build', '.git', 'scratch'].includes(f)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchPatterns(full, patterns, results);
    } else if (/\.(jsx?)$/i.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      for (const [key, regex] of Object.entries(patterns)) {
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          if (!results[key]) results[key] = [];
          results[key].push({ file: path.relative('e:/wow tailend', full), count: matches.length });
        }
      }
    }
  }
  return results;
}

const patterns = {
  'SELF_DRIVE_ACTIVE_TAB': /activeTab === ['"]selfdrive['"]|activeService === ['"]selfdrive['"]/g,
  'BIKES_ACTIVE_TAB': /activeTab === ['"]bikes['"]|activeService === ['"]bikes['"]/g,
  'FLIGHTS_ACTIVE_TAB': /activeTab === ['"]flights['"]|activeService === ['"]flights['"]/g,
  'PACKAGES_ACTIVE_TAB': /activeTab === ['"]packages['"]|activeService === ['"]packages['"]/g,
  'CRAFT_ACTIVE_TAB': /activeTab === ['"]craftmytrip['"]|activeService === ['"]craft['"]/g
};

const res = searchPatterns('e:/wow tailend/frontend/src', patterns);
console.log(JSON.stringify(res, null, 2));
