const fs = require('fs');
const filePath = 'e:/wow tailend/frontend/src/components/customer/CustomerOverviewTab.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  useEffect(() => {
    if (exploreFocus === 'explore' || exploreFocus === 'fleets' || exploreFocus === 'book' || exploreFocus === 'selfdrive') {
      setExploreCategory('selfdrive');
    } else if (exploreFocus === 'craft' || exploreFocus === 'craftmytrip') {
      setExploreCategory('craftmytrip');
    }
  }, [exploreFocus]);`;

const replacement = `  useEffect(() => {
    if (exploreFocus === 'cabs' || exploreFocus === 'selfdrive' || exploreFocus === 'fleets') {
      setExploreCategory('cabs');
    } else if (exploreFocus === 'activities' || exploreFocus === 'sightseeing') {
      setExploreCategory('activities');
    } else if (exploreFocus === 'craft' || exploreFocus === 'craftmytrip') {
      setExploreCategory('craftmytrip');
    } else {
      setExploreCategory('hotels');
    }
  }, [exploreFocus]);`;

if (content.replace(/\r\n/g, '\n').includes(target.replace(/\r\n/g, '\n'))) {
  const isCrlf = content.includes('\r\n');
  const normalizedTarget = isCrlf ? target.replace(/\r?\n/g, '\r\n') : target.replace(/\r\n/g, '\n');
  const normalizedReplacement = isCrlf ? replacement.replace(/\r?\n/g, '\r\n') : replacement.replace(/\r\n/g, '\n');
  content = content.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated CustomerOverviewTab exploreFocus logic!');
} else {
  console.log('Target not found in CustomerOverviewTab.jsx');
}

