import { query } from '../src/config/db.js';

async function run() {
  console.log('--- Checking & Creating PMS Tables in MySQL ---');

  // 1. hotel_menu_items
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_menu_items (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'Breakfast',
      category_name VARCHAR(100) DEFAULT 'Breakfast',
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_veg TINYINT NOT NULL DEFAULT 1,
      is_jain TINYINT NOT NULL DEFAULT 0,
      description TEXT DEFAULT NULL,
      image_url TEXT DEFAULT NULL,
      is_available TINYINT NOT NULL DEFAULT 1,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_menu_hotel (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_menu_items table ready.');

  // 2. hotel_bar_lounges
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_bar_lounges (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      bar_type VARCHAR(100) DEFAULT 'Bar & Lounge',
      timing_open VARCHAR(50) DEFAULT '04:00 PM',
      timing_close VARCHAR(50) DEFAULT '01:00 AM',
      timings VARCHAR(100) DEFAULT '04:00 PM - 01:00 AM',
      entry_policy VARCHAR(255) DEFAULT 'Free Entry for Hotel Guests & Couples',
      description TEXT DEFAULT NULL,
      images_json LONGTEXT DEFAULT NULL,
      cover_image TEXT DEFAULT NULL,
      features_json LONGTEXT DEFAULT NULL,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bar_hotel (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_bar_lounges table ready.');

  // 3. hotel_amenity_categories
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_amenity_categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(50) DEFAULT NULL,
      slug VARCHAR(100) DEFAULT NULL,
      scope VARCHAR(20) DEFAULT 'hotel',
      display_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_amenity_categories table ready.');

  // 4. hotel_amenities_master
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_amenities_master (
      id VARCHAR(64) PRIMARY KEY,
      category_id VARCHAR(64) NOT NULL,
      name VARCHAR(100) NOT NULL,
      default_sublabel VARCHAR(100) DEFAULT NULL,
      icon VARCHAR(50) DEFAULT NULL,
      scope VARCHAR(20) DEFAULT 'hotel',
      display_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_amenities_cat (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_amenities_master table ready.');

  // 5. hotel_amenity_requests
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_amenity_requests (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      suggested_name VARCHAR(100) NOT NULL,
      suggested_category_id VARCHAR(64) DEFAULT NULL,
      suggested_sublabel VARCHAR(100) DEFAULT NULL,
      scope VARCHAR(20) DEFAULT 'hotel',
      status VARCHAR(20) DEFAULT 'Pending',
      description TEXT DEFAULT NULL,
      admin_notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_requests_hotel (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_amenity_requests table ready.');

  // 6. hotel_rooms
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_rooms (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      room_type_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      room_number VARCHAR(20) NOT NULL,
      floor VARCHAR(10) DEFAULT '1',
      status VARCHAR(50) DEFAULT 'Available',
      internal_note TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rooms_hotel (hotel_id),
      INDEX idx_rooms_type (room_type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_rooms table ready.');

  // 7. hotel_rate_plans
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_rate_plans (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      room_type_id VARCHAR(64) DEFAULT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      plan_type VARCHAR(100) DEFAULT 'Standard',
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount_type VARCHAR(50) DEFAULT NULL,
      discount_value DECIMAL(10,2) DEFAULT 0.00,
      min_stay INT DEFAULT 1,
      max_stay INT DEFAULT 30,
      min_advance_days INT DEFAULT 0,
      valid_from DATE DEFAULT NULL,
      valid_to DATE DEFAULT NULL,
      applicable_days TEXT DEFAULT NULL,
      cancellation_policy TEXT DEFAULT NULL,
      is_refundable TINYINT DEFAULT 1,
      status VARCHAR(20) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rate_plans_hotel (hotel_id),
      INDEX idx_rate_plans_room (room_type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_rate_plans table ready.');

  // 8. hotel_guests
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_guests (
      id VARCHAR(64) PRIMARY KEY,
      vendor_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      country VARCHAR(100) DEFAULT 'Thailand',
      dob DATE DEFAULT NULL,
      id_type VARCHAR(50) DEFAULT NULL,
      id_number_masked VARCHAR(50) DEFAULT NULL,
      preferences TEXT DEFAULT NULL,
      internal_notes TEXT DEFAULT NULL,
      total_stays INT DEFAULT 0,
      total_spend DECIMAL(10,2) DEFAULT 0.00,
      is_restricted TINYINT DEFAULT 0,
      restriction_reason TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_guests_vendor (vendor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_guests table ready.');

  // 9. hotel_reviews
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_reviews (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      booking_id VARCHAR(64) DEFAULT NULL,
      guest_name VARCHAR(255) NOT NULL,
      rating DECIMAL(3,1) DEFAULT 5.0,
      review TEXT DEFAULT NULL,
      vendor_reply TEXT DEFAULT NULL,
      review_date DATE DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'Published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reviews_hotel (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_reviews table ready.');

  // 10. hotel_staff
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_staff (
      id VARCHAR(64) PRIMARY KEY,
      vendor_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      role VARCHAR(100) DEFAULT 'Front Desk Staff',
      hotel_ids TEXT DEFAULT NULL,
      permissions_json TEXT DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_staff_vendor (vendor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_staff table ready.');

  // 11. hotel_notifications
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_notifications (
      id VARCHAR(64) PRIMARY KEY,
      vendor_id VARCHAR(64) DEFAULT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_id VARCHAR(64) DEFAULT NULL,
      related_type VARCHAR(50) DEFAULT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notif_vendor (vendor_id),
      INDEX idx_notif_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_notifications table ready.');

  // 12. hotel_support_tickets
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_support_tickets (
      id VARCHAR(64) PRIMARY KEY,
      vendor_id VARCHAR(64) DEFAULT NULL,
      category VARCHAR(100) NOT NULL,
      hotel_id VARCHAR(64) DEFAULT NULL,
      booking_id VARCHAR(64) DEFAULT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(20) DEFAULT 'Medium',
      status VARCHAR(50) DEFAULT 'Open',
      messages_json LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tickets_vendor (vendor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_support_tickets table ready.');

  // 13. hotel_activity_log
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_activity_log (
      id VARCHAR(64) PRIMARY KEY,
      vendor_id VARCHAR(64) DEFAULT NULL,
      user_name VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      related_type VARCHAR(50) DEFAULT NULL,
      related_id VARCHAR(64) DEFAULT NULL,
      previous_value TEXT DEFAULT NULL,
      new_value TEXT DEFAULT NULL,
      ip_address VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_vendor (vendor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_activity_log table ready.');

  // 14. hotel_availability_calendar
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_availability_calendar (
      id VARCHAR(64) PRIMARY KEY,
      hotel_id VARCHAR(64) NOT NULL,
      room_type_id VARCHAR(64) NOT NULL,
      vendor_id VARCHAR(64) DEFAULT NULL,
      date DATE NOT NULL,
      available_rooms INT DEFAULT NULL,
      price_override DECIMAL(10,2) DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'Available',
      min_stay INT DEFAULT 1,
      stop_sale TINYINT DEFAULT 0,
      block_reason TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_date_room (room_type_id, date),
      INDEX idx_cal_hotel (hotel_id),
      INDEX idx_cal_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('hotel_availability_calendar table ready.');

  // Alter columns if missing
  const colsToAdd = [
    { table: 'hotels', col: 'dining_bar_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotels', col: 'categorized_amenities_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotels', col: 'hotel_status', type: "VARCHAR(50) DEFAULT 'Live'" },
    { table: 'hotels', col: 'policies_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotels', col: 'facilities_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotel_room_types', col: 'categorized_amenities_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotel_room_types', col: 'meal_options_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotel_room_types', col: 'amenities_json', type: 'LONGTEXT DEFAULT NULL' },
    { table: 'hotel_room_types', col: 'images_json', type: 'LONGTEXT DEFAULT NULL' }
  ];

  for (const item of colsToAdd) {
    try {
      await query(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type}`);
      console.log(`Added column ${item.table}.${item.col}`);
    } catch (e) {
      // ignore duplicate column
    }
  }

  // Seed default categories for hotel_amenity_categories if empty
  const catCount = await query('SELECT COUNT(*) as cnt FROM hotel_amenity_categories');
  if (catCount[0].cnt === 0) {
    console.log('Seeding amenity categories & master amenities...');
    const defaultCats = [
      { id: 'cat_popular', name: 'Popular Amenities', icon: 'Sparkles', slug: 'popular-amenities', display_order: 1 },
      { id: 'cat_internet', name: 'Internet & Tech', icon: 'Wifi', slug: 'internet-tech', display_order: 2 },
      { id: 'cat_pool_wellness', name: 'Pool & Wellness', icon: 'Waves', slug: 'pool-wellness', display_order: 3 },
      { id: 'cat_dining', name: 'Dining & Drinks', icon: 'Utensils', slug: 'dining-drinks', display_order: 4 },
      { id: 'cat_room_features', name: 'Room Features', icon: 'BedDouble', slug: 'room-features', display_order: 5 },
      { id: 'cat_services', name: 'Front Desk & Services', icon: 'Clock', slug: 'front-desk-services', display_order: 6 }
    ];
    for (const c of defaultCats) {
      await query('INSERT INTO hotel_amenity_categories (id, name, icon, slug, scope, display_order, is_active) VALUES (?, ?, ?, ?, "hotel", ?, 1)', [c.id, c.name, c.icon, c.slug, c.display_order]);
    }

    const defaultMasters = [
      { id: 'am_wifi', cat_id: 'cat_popular', name: 'Free High-Speed Wi-Fi', icon: 'Wifi', sub: 'Across resort' },
      { id: 'am_pool', cat_id: 'cat_popular', name: 'Infinity Swimming Pool', icon: 'Waves', sub: 'Ocean view' },
      { id: 'am_ac', cat_id: 'cat_popular', name: 'Climate Controlled Air-Conditioning', icon: 'Wind', sub: 'Individual controls' },
      { id: 'am_bf', cat_id: 'cat_popular', name: 'Complimentary International Buffet Breakfast', icon: 'Coffee', sub: 'Daily 06:30 - 10:30' },
      { id: 'am_spa', cat_id: 'cat_pool_wellness', name: 'Award-Winning Thai Wellness Spa', icon: 'Heart', sub: 'Herbal therapies' },
      { id: 'am_gym', cat_id: 'cat_pool_wellness', name: '24/7 Fitness Center', icon: 'Dumbbell', sub: 'Technogym equipment' },
      { id: 'am_bar', cat_id: 'cat_dining', name: 'Rooftop Sky Bar & Lounge', icon: 'Wine', sub: 'Sunset cocktails' },
      { id: 'am_sea_view', cat_id: 'cat_room_features', name: 'Panoramic Andaman Sea View', icon: 'Eye', sub: 'Private balcony' },
      { id: 'am_tub', cat_id: 'cat_room_features', name: 'Soaking Jacuzzi Tub', icon: 'Bath', sub: 'Marble en-suite' },
      { id: 'am_room_srv', cat_id: 'cat_services', name: '24/7 In-Room Dining Service', icon: 'Bell', sub: 'Hot meals anytime' },
      { id: 'am_airport', cat_id: 'cat_services', name: 'Luxury VIP Airport Limousine Transfer', icon: 'Car', sub: 'On request' }
    ];
    for (const m of defaultMasters) {
      await query('INSERT INTO hotel_amenities_master (id, category_id, name, default_sublabel, icon, scope, display_order, is_active) VALUES (?, ?, ?, ?, ?, "hotel", 0, 1)', [m.id, m.cat_id, m.name, m.sub, m.icon]);
    }
  }

  // Seed sample menu items for our 3 demo hotels if empty
  const menuCount = await query('SELECT COUNT(*) as cnt FROM hotel_menu_items');
  if (menuCount[0].cnt === 0) {
    console.log('Seeding demo hotel menu items...');
    const demoItems = [
      // th-htl-01: The Shore at Katathani (Phuket)
      { id: 'menu-ph-01', hotel_id: 'th-htl-01', name: 'Tom Yum Goong Andaman', category: 'Lunch', category_name: 'Lunch', price: 340, is_veg: 0, is_jain: 0, desc: 'Spicy lemongrass soup with jumbo Andaman tiger prawns, oyster mushrooms, galangal, and fresh coriander.', img: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=600&q=80', order: 1 },
      { id: 'menu-ph-02', hotel_id: 'th-htl-01', name: 'Pad Thai Boran Jumbo Prawns', category: 'Dinner', category_name: 'Dinner', price: 290, is_veg: 0, is_jain: 0, desc: 'Wok-tossed rice noodles with tamarind sauce, bean sprouts, crushed peanuts, and king prawns.', img: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80', order: 2 },
      { id: 'menu-ph-03', hotel_id: 'th-htl-01', name: 'Mango Sticky Rice (Khao Niew Mamuang)', category: 'Desserts', category_name: 'Desserts', price: 220, is_veg: 1, is_jain: 1, desc: 'Sweet glutinous coconut rice served with ripe Nam Dok Mai mango and toasted sesame seeds.', img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80', order: 3 },
      { id: 'menu-ph-04', hotel_id: 'th-htl-01', name: 'Phuket Sunset Passionfruit Martini', category: 'Beverages & Shakes', category_name: 'Beverages & Shakes', price: 280, is_veg: 1, is_jain: 1, desc: 'Tropical passionfruit purée shaken with organic vodka, triple sec, and a fresh mint sprig.', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', order: 4 },

      // th-htl-02: Banyan Tree Bangkok
      { id: 'menu-bk-01', hotel_id: 'th-htl-02', name: 'Vertigo Wagyu Beef Satay', category: 'Snacks & Starters', category_name: 'Snacks & Starters', price: 420, is_veg: 0, is_jain: 0, desc: 'Grilled marinated Australian Wagyu skewers served with house-made roasted peanut sauce and cucumber relish.', img: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=600&q=80', order: 1 },
      { id: 'menu-bk-02', hotel_id: 'th-htl-02', name: 'Royal Thai Green Curry (Gaeng Kiew Wan Gai)', category: 'Dinner', category_name: 'Dinner', price: 360, is_veg: 0, is_jain: 0, desc: 'Aromatic coconut green curry with free-range chicken breast, Thai baby eggplants, and sweet basil.', img: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', order: 2 },
      { id: 'menu-bk-03', hotel_id: 'th-htl-02', name: 'Crispy Veg Spring Rolls (Poh Pia Tod)', category: 'Snacks & Starters', category_name: 'Snacks & Starters', price: 210, is_veg: 1, is_jain: 1, desc: 'Crispy golden rolls filled with glass noodles, shredded cabbage, carrots, and plum dipping sauce.', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', order: 3 },
      { id: 'menu-bk-04', hotel_id: 'th-htl-02', name: 'Moon Bar Skyline Dragon Cocktail', category: 'Beverages & Shakes', category_name: 'Beverages & Shakes', price: 350, is_veg: 1, is_jain: 1, desc: 'Fresh pink dragonfruit, kaffir lime infused gin, lemongrass syrup, and splash of ginger ale.', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', order: 4 },

      // th-htl-04: Hilton Pattaya
      { id: 'menu-pt-01', hotel_id: 'th-htl-04', name: 'Drift Ocean Catch Platter', category: 'Lunch', category_name: 'Lunch', price: 480, is_veg: 0, is_jain: 0, desc: 'Grilled Gulf of Thailand white snapper, tiger prawns, and calamari with chili-lime dipping sauce.', img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', order: 1 },
      { id: 'menu-pt-02', hotel_id: 'th-htl-04', name: 'Thai Som Tum Papaya Salad', category: 'Lunch', category_name: 'Lunch', price: 190, is_veg: 1, is_jain: 0, desc: 'Hand-pounded green papaya with cherry tomatoes, green beans, roasted peanuts, and tamarind dressing.', img: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=600&q=80', order: 2 },
      { id: 'menu-pt-03', hotel_id: 'th-htl-04', name: 'Horizon Signature Lychee Cooler', category: 'Beverages & Shakes', category_name: 'Beverages & Shakes', price: 230, is_veg: 1, is_jain: 1, desc: 'Chilled lychee nectar, sparkling soda, lime zest, and fresh rambutan garnish.', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', order: 3 }
    ];

    for (const item of demoItems) {
      await query(
        `INSERT INTO hotel_menu_items (id, hotel_id, name, category, category_name, price, is_veg, is_jain, description, image_url, is_available, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [item.id, item.hotel_id, item.name, item.category, item.category_name, item.price, item.is_veg, item.is_jain, item.desc, item.img, item.order]
      );
    }
  }

  // Seed sample bar lounges if empty
  const barCount = await query('SELECT COUNT(*) as cnt FROM hotel_bar_lounges');
  if (barCount[0].cnt === 0) {
    console.log('Seeding demo bar lounges...');
    const demoBars = [
      {
        id: 'bar-ph-01',
        hotel_id: 'th-htl-01',
        name: 'The Harbor Oceanfront Sunset Bar',
        timing_open: '04:00 PM',
        timing_close: '01:00 AM',
        timings: '04:00 PM - 01:00 AM',
        entry_policy: 'Free Entry for Hotel Guests & Couples',
        description: 'Spectacular sunset oceanfront lounge perched directly above Kata Noi Bay, serving craft signature cocktails, premium wines, and tapas.',
        features: JSON.stringify(['Sunset Views', 'Live Acoustic Music', 'Cocktail Happy Hour (5-7 PM)', 'Private Cabanas', 'Ocean Breeze Seating']),
        images: JSON.stringify(['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80']),
        cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: 'bar-bk-01',
        hotel_id: 'th-htl-02',
        name: 'Moon Bar & Vertigo 61st Floor Rooftop',
        timing_open: '05:00 PM',
        timing_close: '01:30 AM',
        timings: '05:00 PM - 01:30 AM',
        entry_policy: 'Smart Casual (No Beachwear)',
        description: 'World-renowned open-air rooftop bar offering 360-degree glittering vistas of Bangkok skyline with internationally acclaimed mixologists.',
        features: JSON.stringify(['360° Skyline Views', 'World-Class Mixology', 'Live DJ Sets', 'Champagne Bar', 'Star-Gazing Lounge']),
        images: JSON.stringify(['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80']),
        cover: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: 'bar-pt-01',
        hotel_id: 'th-htl-04',
        name: 'Horizon Rooftop Bar & Restaurant 34th Floor',
        timing_open: '05:00 PM',
        timing_close: '01:00 AM',
        timings: '05:00 PM - 01:00 AM',
        entry_policy: 'Smart Casual Dress Code',
        description: 'Sleek and sophisticated 34th-floor rooftop venue overlooking Pattaya Bay with infinity edge design, craft cocktails, and ambient chillout beats.',
        features: JSON.stringify(['Infinity Edge Pattaya Bay Views', 'Signature Craft Cocktails', 'Sunset Happy Hour', 'Outdoor Deck', 'VIP Cabanas']),
        images: JSON.stringify(['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80']),
        cover: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80'
      }
    ];

    for (const b of demoBars) {
      await query(
        `INSERT INTO hotel_bar_lounges (id, hotel_id, name, timing_open, timing_close, timings, entry_policy, description, features_json, images_json, cover_image, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [b.id, b.hotel_id, b.name, b.timing_open, b.timing_close, b.timings, b.entry_policy, b.description, b.features, b.images, b.cover]
      );
    }
  }

  console.log('--- PMS MySQL Migration Completed Successfully ---');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
