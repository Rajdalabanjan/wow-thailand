const fs = require('fs');
const path = 'frontend/src/components/SearchWidget.jsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Remove Wand2
s = s.replace(/\bWand2,\s*/, '');

// 2. Remove flight props
s = s.replace(/\r?\n\s*flightAdults = 1,\r?\n\s*setFlightAdults,\r?\n\s*flightChildren = 0,\r?\n\s*setFlightChildren,\r?\n\s*flightInfants = 0,\r?\n\s*setFlightInfants,\r?\n\s*flightClass = 'economy',\r?\n\s*setFlightClass,/, '');

// 3. Remove flight search states
s = s.replace(/\r?\n\s*const \[flightFromSearch, setFlightFromSearch\] = useState\(''\);/, '');
s = s.replace(/\r?\n\s*const \[flightToSearch, setFlightToSearch\] = useState\(''\);/, '');

// 4. Remove dead filter keys in localFilters
const regFilters = /\/\/ Flights[\s\S]*?\/\/ Sightseeing & Activities/;
if (regFilters.test(s)) {
  s = s.replace(regFilters, '// Sightseeing & Activities');
  console.log('Flight and package localFilters removed successfully');
} else {
  console.log('WARNING: regFilters did not match');
}

const regCraftFilters = /\r?\n\s*\/\/ Craft My Trip[\s\S]*?craftBudgetRanges: appliedFilters\?\.craftBudgetRanges \|\| \[\]/;
if (regCraftFilters.test(s)) {
  s = s.replace(regCraftFilters, '');
  console.log('Craft localFilters removed successfully');
} else {
  console.log('WARNING: regCraftFilters did not match');
}

// 5. Remove handleClearAllForTab dead branches
const regClear = /} else if \(activeTab === 'flights'\) \{[\s\S]*?} else if \(activeTab === 'craftmytrip'\) \{[\s\S]*?craftBudgetRanges: \[\]\r?\n\s*\};/;
if (regClear.test(s)) {
  s = s.replace(regClear, `} else if (activeTab === 'activities') {
        cleared = {
          ...cleared,
          activityTypes: [],
          activityPriceRanges: [],
          activityDurations: []
        };`);
  console.log('Cleared branches replaced successfully');
} else {
  console.log('WARNING: regClear did not match');
}

// 6. Remove totalPassengers
s = s.replace(/\r?\n\s*const totalPassengers = \(flightAdults \|\| 1\) \+ \(flightChildren \|\| 0\) \+ \(flightInfants \|\| 0\);/, '');

// 7. Remove craftmytrip JSX block
const regCraft = /\) : activeTab === 'craftmytrip' \? \([\s\S]*?\n\s*\) : null\r?\n\s*\}/;
if (regCraft.test(s)) {
  s = s.replace(regCraft, `) : null\n          }`);
  console.log('Craft JSX block replaced successfully');
} else {
  console.log('WARNING: regCraft did not match');
}

fs.writeFileSync(path, s, 'utf8');
console.log('Done SearchWidget.jsx update');
