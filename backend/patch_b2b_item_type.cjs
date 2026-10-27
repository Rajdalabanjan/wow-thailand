const fs = require('fs');
const path = require('path');

const compatPath = path.join(__dirname, 'src', 'routes', 'compat.routes.js');
let content = fs.readFileSync(compatPath, 'utf8');

const targetStr = `const itemId = \`b2b_itm_\${Date.now()}\`;
        await query(
          \`INSERT INTO booking_items (id, booking_id, item_type, reference_id, unit_price_thb, quantity, subtotal_thb, details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
          [
            itemId, bookingId, (payload.service_type || 'HOTEL').toUpperCase(),`;

const replacementStr = `let rawType = (payload.service_type || 'HOTEL').toUpperCase();
        let itemType = 'HOTEL';
        if (rawType.includes('CAB') || rawType.includes('CAR') || rawType.includes('TRANSFER')) {
          itemType = 'TRANSFER';
        } else if (rawType.includes('TOUR')) {
          itemType = 'TOUR';
        } else if (rawType.includes('ACT')) {
          itemType = 'ACTIVITY';
        }

        const itemId = \`b2b_itm_\${Date.now()}\`;
        await query(
          \`INSERT INTO booking_items (id, booking_id, item_type, reference_id, unit_price_thb, quantity, subtotal_thb, details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
          [
            itemId, bookingId, itemType,`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(compatPath, content, 'utf8');
  console.log('✓ Successfully patched b2b item_type ENUM mapping in compat.routes.js');
} else {
  console.log('Target string not found, checking with regex');
  content = content.replace(
    /\(payload\.service_type \|\| 'HOTEL'\)\.toUpperCase\(\)/,
    "((t => t.includes('CAB') || t.includes('CAR') || t.includes('TRANSFER') ? 'TRANSFER' : (t.includes('TOUR') ? 'TOUR' : (t.includes('ACT') ? 'ACTIVITY' : 'HOTEL')))((payload.service_type || 'HOTEL').toUpperCase()))"
  );
  fs.writeFileSync(compatPath, content, 'utf8');
  console.log('✓ Successfully patched with inline ternary mapping');
}
