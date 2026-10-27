const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.json')) {
      if (!file.includes('notificationSound')) {
        results.push(full);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

// Ordered replacements (from most specific phrase to most general)
const phraseReplacements = [
  // Emails & URLs
  [/\bsupport@wowgoa\.com\b/gi, 'support@wowthailand.com'],
  [/\bwww\.wowgoa\.com\b/gi, 'www.wowthailand.com'],
  [/@hotel\.wowgoa\.com/gi, '@hotel.wowthailand.com'],
  [/@vendor\.wowgoa\.com/gi, '@vendor.wowthailand.com'],
  [/@driver\.wowgoa\.com/gi, '@driver.wowthailand.com'],
  [/@b2b\.wowgoa\.com/gi, '@b2b.wowthailand.com'],
  [/@wowgoa\.com/gi, '@wowthailand.com'],
  [/wowgoa\.com/gi, 'wowthailand.com'],

  // Brand Name
  [/\bWOW\s*GOA\b/g, 'WOW THAILAND'],
  [/\bWOWGoa\b/g, 'WOWThailand'],
  [/\bwowgoa\b/g, 'wowthailand'],
  [/\bTripGalileo\b/g, 'WOW THAILAND'],

  // Specific phrases
  [/Goa Self-Drive & Stays/gi, 'Thailand Hotels, Sightseeing & Airport Cabs'],
  [/Goa Self-Drive/gi, 'Thailand Hotels & Airport Transfers'],
  [/Goa Self Drive/gi, 'Thailand Hotels & Airport Transfers'],
  [/Goa Tour Packages/gi, 'Thailand Tour Packages'],
  [/Goa Holiday Packages/gi, 'Thailand Holiday Packages'],
  [/Goa Trip Packages/gi, 'Thailand Trip Packages'],
  [/Goa Hotels & Resorts/gi, 'Thailand Hotels & Resorts'],
  [/Goa Hotels/gi, 'Thailand Hotels'],
  [/Goa Resorts/gi, 'Thailand Resorts'],
  [/Goa Stays/gi, 'Thailand Stays'],
  [/Goa Tourism/gi, 'Thailand Tourism'],
  [/Goa travel/gi, 'Thailand travel'],
  [/Goa Travel/gi, 'Thailand Travel'],
  [/Goa Operations Desk/gi, 'Thailand Operations Desk'],
  [/Goa concierge/gi, 'Thailand concierge'],
  [/Goa Concierge/gi, 'Thailand Concierge'],
  [/Goa Commercial Tourist Permit/gi, 'Thailand Transport Commercial Permit'],
  [/Goa Motor Vehicles Act/gi, 'Thailand DLT Transport Regulations'],
  [/Goa Traffic Police/gi, 'Thailand Tourist Police'],
  [/Goa RTO/gi, 'Thailand DLT'],

  // River cruises & tours
  [/Mandovi Sunset River Cruise/gi, 'Chao Phraya Princess Luxury Dinner Cruise'],
  [/Mandovi River Cruise/gi, 'Chao Phraya Dinner Cruise'],
  [/Mandovi river cruise/gi, 'Chao Phraya dinner cruise'],
  [/Mandovi Cruise/gi, 'Chao Phraya Cruise'],
  [/Mandovi/gi, 'Chao Phraya'],

  // Specific Airport & Station Location Names
  [/Goa Airport \(Dabolim - GOI\)/gi, 'Suvarnabhumi Airport (BKK)'],
  [/Goa Airport \(Dabolim \/ Mopa\)/gi, 'Suvarnabhumi (BKK) / Don Mueang (DMK)'],
  [/Goa Airport \(Dabolim\)/gi, 'Suvarnabhumi Airport (BKK)'],
  [/Goa Airport \(Mopa - GOX\)/gi, 'Don Mueang Airport (DMK)'],
  [/Goa Airport \(Mopa \/ GOX\)/gi, 'Don Mueang Airport (DMK)'],
  [/Goa Airport \(Mopa\)/gi, 'Don Mueang Airport (DMK)'],
  [/Dabolim Airport \(GOI\)/gi, 'Suvarnabhumi Airport (BKK)'],
  [/Dabolim Airport/gi, 'Suvarnabhumi Airport (BKK)'],
  [/Dabolim/gi, 'Suvarnabhumi'],
  [/Mopa Airport \(GOX\)/gi, 'Don Mueang Airport (DMK)'],
  [/Mopa Airport/gi, 'Don Mueang Airport (DMK)'],
  [/Mopa/gi, 'Don Mueang'],
  [/Madgaon Railway Station \(MAO\)/gi, 'Phuket International Airport (HKT)'],
  [/Madgaon Railway Station/gi, 'Phuket International Airport (HKT)'],
  [/Madgaon Station/gi, 'Phuket Airport (HKT)'],
  [/Madgaon/gi, 'Phuket'],
  [/Margao/gi, 'Phuket'],
  [/Thivim Railway Station \(THVM\)/gi, 'Krabi International Airport (KBV)'],
  [/Thivim Railway Station/gi, 'Krabi International Airport (KBV)'],
  [/Thivim Station/gi, 'Krabi Airport (KBV)'],
  [/Thivim/gi, 'Krabi'],
  [/Karmali Railway Station \(KRMI\)/gi, 'Samui Airport (USM)'],
  [/Karmali Railway Station/gi, 'Samui Airport (USM)'],
  [/Karmali/gi, 'Samui'],

  // Specific Cities / Towns / Areas
  [/Calangute Beach \/ Circle/gi, 'Sukhumvit Downtown Bangkok'],
  [/Calangute Beach/gi, 'Sukhumvit Downtown'],
  [/Calangute \/ Baga/gi, 'Bangkok & Pattaya'],
  [/Calangute/gi, 'Sukhumvit'],
  [/Baga Beach & Tito's Lane/gi, 'Patong Beach & Bangla Road'],
  [/Baga Beach/gi, 'Patong Beach'],
  [/Baga/gi, 'Patong'],
  [/Candolim Beach Road & Fort Aguada/gi, 'Kata & Karon Beach Road'],
  [/Candolim Beach/gi, 'Kata & Karon Beach'],
  [/Candolim/gi, 'Kata & Karon'],
  [/Anjuna Flea Market & Vagator Cliffs/gi, 'Ao Nang Beach & Railay Viewpoint'],
  [/Anjuna \/ Vagator/gi, 'Ao Nang & Railay'],
  [/Anjuna/gi, 'Ao Nang'],
  [/Vagator/gi, 'Railay'],
  [/Morjim Turtle Beach & Arambol/gi, 'Chaweng Beach & Lamai'],
  [/Morjim \/ Arambol/gi, 'Chaweng & Lamai'],
  [/Morjim/gi, 'Chaweng'],
  [/Arambol/gi, 'Lamai'],
  [/Panaji City Center/gi, 'Bangkok Downtown'],
  [/Panaji \(City Center\), Goa/gi, 'Bangkok Downtown'],
  [/Panaji \(Central Goa\)/gi, 'Central Bangkok (Silom)'],
  [/Panaji City/gi, 'Bangkok Downtown'],
  [/Panaji Bus Stand/gi, 'Bangkok Terminal'],
  [/Panaji/gi, 'Bangkok'],
  [/Panjim/gi, 'Bangkok'],
  [/Colva, Benaulim & Varca/gi, 'Hua Hin & Cha-Am'],
  [/Colva \/ Benaulim/gi, 'Hua Hin & Cha-Am'],
  [/Colva/gi, 'Hua Hin'],
  [/Benaulim/gi, 'Cha-Am'],
  [/Palolem \/ Agonda/gi, 'Phi Phi & Maya Bay'],
  [/Palolem/gi, 'Phi Phi'],
  [/Agonda/gi, 'Maya Bay'],

  // Region names
  [/North Goa \/ South Goa/gi, 'Bangkok / Phuket'],
  [/North Goa/gi, 'Bangkok & Pattaya'],
  [/South Goa/gi, 'Phuket & Krabi'],
  [/Central Goa/gi, 'Central Thailand'],
  [/All Goa/gi, 'All Thailand'],
  [/All-Goa/gi, 'All-Thailand'],
  [/all Goa/gi, 'all Thailand'],
  [/all goa/gi, 'all thailand'],

  // Phrases with 'Goa'
  [/Goa, India/gi, 'Thailand'],
  [/Goa , India/gi, 'Thailand'],
  [/Goa,India/gi, 'Thailand'],
  [/in Goa/g, 'in Thailand'],
  [/to Goa/g, 'to Thailand'],
  [/of Goa/g, 'of Thailand'],
  [/from Goa/g, 'from Thailand'],
  [/visit Goa/g, 'visit Thailand'],
  [/Across Goa/gi, 'Across Thailand'],
  [/across Goa/gi, 'across Thailand'],
  [/Goa Delivery/gi, 'Thailand Delivery'],
  [/Goan/g, 'Thai'],
  [/goan/g, 'thai'],

  // Standalone \bGoa\b word replacements
  [/\bGoa\b/g, 'Thailand'],
  [/\bGOA\b/g, 'THAILAND'],
  [/\bgoa\b/g, 'thailand']
];

let modifiedCount = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  phraseReplacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Updated: ${path.relative(srcDir, filePath)}`);
  }
});

console.log(`\nCompleted! Modified ${modifiedCount} files.`);
