export const locationsList = [
  "Suvarnabhumi Airport (BKK)",
  "Don Mueang Airport (DMK)",
  "Sukhumvit (Bangkok & Pattaya)",
  "Patong Beach (Bangkok & Pattaya)",
  "Central Bangkok (Silom)",
  "Phuket International Airport (HKT)",
  "Kata & Karon",
  "Railay",
  "Ao Nang",
  "Phuket & Krabi"
];

export const hotelsData = [
  {
    id: 'hotel-5star',
    db_id: 'th-htl-01',
    name: 'The Shore at Katathani - Luxury Beachfront Pool Villas',
    city: 'Phuket',
    area: 'Kata Noi Beach, Phuket',
    location: 'Kata Noi Beach, Phuket, Thailand',
    address: '14 Kata Noi Road, Karon, Muang, Phuket 83100, Thailand',
    price: 8500,
    original_price: 11500,
    stars: 5,
    star_rating: 5,
    rating: 4.94,
    reviews_count: 1280,
    badge: '5-Star Oceanfront Villa',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80'
    ],
    description: 'An award-winning adults-only beachfront sanctuary secluded along the emerald cove of Kata Noi Beach in Phuket. Each luxury villa features an intimate private infinity plunge pool, panoramic Andaman Sea vistas, sun decks, deep soaking marble tubs, and 24/7 personal butler service. Enjoy gourmet oceanfront dining at The Harbor and rejuvenating wellness therapies at Serenity Spa.',
    amenities: [
      'Private Infinity Pool',
      'Direct Beachfront Access',
      'Serenity Luxury Spa',
      'Sunset Cocktail Lounge',
      'Free High-Speed Wi-Fi',
      '24/7 Butler & Concierge',
      'Complimentary Gourmet Breakfast',
      'Free Airport Luxury Transfer',
      'Air Conditioning',
      'Oceanfront Fine Dining'
    ],
    check_in_time: '14:00',
    check_out_time: '12:00',
    property_rules: [
      'Adults-only retreat (Guests aged 12+ welcomed)',
      'Valid Passport or Government ID required at check-in',
      'Non-smoking villas with dedicated outdoor terrace smoking areas',
      'Complimentary luxury speedboat & airport transfer upon request'
    ],
    bar_lounge: {
      name: 'The Harbor & Sunset Infinity Bar',
      tagline: 'Signature handcrafted Thai cocktails & Andaman Sea oceanfront dining',
      operating_hours: '11:00 AM - 12:00 AM',
      cuisine: 'Contemporary Thai & Fresh Andaman Seafood',
      dress_code: 'Smart Casual',
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    categorized_amenities: [
      {
        category: 'Popular Highlights',
        items: ['Private Plunge Pool', 'Beachfront Location', 'Free Airport Transfer', 'Spa & Wellness', 'High-Speed Wi-Fi']
      },
      {
        category: 'Room Comforts',
        items: ['King Bed', 'Marble Bathtub', 'Espresso Machine', 'Air Conditioning', 'Bathrobes & Slippers', 'Minibar']
      },
      {
        category: 'Food & Drinks',
        items: ['The Harbor Restaurant', 'Sunset Cocktail Lounge', 'Floating Villa Breakfast', '24/7 In-Villa Dining']
      },
      {
        category: 'Wellness & Health',
        items: ['Serenity Spa', 'Beachside Yoga Pavilion', 'Fitness Center', 'Holistic Thai Massages']
      }
    ],
    room_types: [
      {
        id: 'rm-phuket-01',
        hotel_id: 'hotel-5star',
        name: 'Seaview Pool Villa',
        room_size: 130,
        room_size_unit: 'sq.m',
        bed_type: 'King Bed',
        max_occupancy: 2,
        max_adults: 2,
        max_children: 0,
        view_type: 'Direct Andaman Sea View',
        total_rooms: 15,
        available_rooms: 8,
        is_available: true,
        base_price_thb: 8500,
        price: 8500,
        price_per_night: 8500,
        images: [
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Private Infinity Pool', 'Sun Terrace', 'Espresso Machine', 'Rain Shower', 'Deep Soaking Tub', 'Free Wi-Fi'],
        rate_plans: [
          {
            id: 'rp-ph-01-ep',
            name: 'EP - Room Only',
            meal_plan: 'EP',
            meal_plan_label: 'Room Only (No Meals)',
            base_price: 8500,
            calculated_price: 8500,
            cancellation_policy: 'Non-refundable rate'
          },
          {
            id: 'rp-ph-01-cp',
            name: 'CP - Gourmet Breakfast Included',
            meal_plan: 'CP',
            meal_plan_label: 'Buffet or Floating Breakfast',
            base_price: 9800,
            calculated_price: 9800,
            cancellation_policy: 'Free cancellation up to 48 hours before check-in'
          },
          {
            id: 'rp-ph-01-map',
            name: 'MAP - Half Board (Breakfast + 3-Course Dinner)',
            meal_plan: 'MAP',
            meal_plan_label: 'Breakfast + 3-Course Dinner',
            base_price: 11500,
            calculated_price: 11500,
            cancellation_policy: 'Free cancellation up to 48 hours before check-in'
          }
        ]
      },
      {
        id: 'rm-phuket-02',
        hotel_id: 'hotel-5star',
        name: 'Two-Bedroom Grand Oceanfront Villa',
        room_size: 260,
        room_size_unit: 'sq.m',
        bed_type: '2 King Beds',
        max_occupancy: 4,
        max_adults: 4,
        max_children: 2,
        view_type: '180° Panoramic Oceanfront',
        total_rooms: 6,
        available_rooms: 4,
        is_available: true,
        base_price_thb: 15500,
        price: 15500,
        price_per_night: 15500,
        images: [
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Double Private Pool', 'Grand Living Pavilion', 'Full Kitchenette', 'Dual Rain Showers', 'Butler Call Button'],
        rate_plans: [
          {
            id: 'rp-ph-02-cp',
            name: 'CP - Gourmet Breakfast Included',
            meal_plan: 'CP',
            meal_plan_label: 'Gourmet Breakfast for 4',
            base_price: 15500,
            calculated_price: 15500,
            cancellation_policy: 'Free cancellation up to 72 hours before check-in'
          },
          {
            id: 'rp-ph-02-map',
            name: 'MAP - Half Board (Breakfast + Royal Dinner)',
            meal_plan: 'MAP',
            meal_plan_label: 'Breakfast + 4-Course Royal Seafood Dinner',
            base_price: 18900,
            calculated_price: 18900,
            cancellation_policy: 'Free cancellation up to 72 hours before check-in'
          }
        ]
      }
    ]
  },
  {
    id: 'hotel-4star',
    db_id: 'th-htl-02',
    name: 'Banyan Tree Bangkok - Iconic Skyline & Vertigo Sky Suites',
    city: 'Bangkok',
    area: 'Sathorn / Silom, Bangkok',
    location: 'Sathorn Road, Silom, Bangkok, Thailand',
    address: '21/100 South Sathon Road, Sathon, Bangkok 10120, Thailand',
    price: 5200,
    original_price: 7500,
    stars: 5,
    star_rating: 5,
    rating: 4.88,
    reviews_count: 2140,
    badge: 'Iconic Rooftop Sky Sanctuary',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80'
    ],
    description: 'An iconic urban sanctuary situated in Bangkok’s central Sathorn district, celebrated for the legendary 61st-floor open-air Vertigo & Moon Bar offering 360-degree panoramic skyline views. Relax in spacious luxury suites equipped with aromatherapy burners, unwind at the multi-award-winning Banyan Tree Spa, swim in the rooftop sky pool, and savor world-class cuisine at Saffron Thai restaurant.',
    amenities: [
      'Vertigo Rooftop Bar (61st Fl)',
      'City Skyline Panoramic View',
      'World-Class Banyan Tree Spa',
      'Open-Air Sky Swimming Pool',
      '24/7 Fitness Sanctuary',
      'Saffron Contemporary Thai Dining',
      'Free High-Speed Wi-Fi',
      'Complimentary BTS Shuttle',
      'Executive Club Lounge',
      'Valet Parking'
    ],
    check_in_time: '14:00',
    check_out_time: '12:00',
    property_rules: [
      'Smart casual dress code requested at Vertigo & Moon Bar',
      'Government ID / Passport required upon arrival',
      'Children welcome with dedicated family amenities',
      '24-hour reception and airport limousine transfers available'
    ],
    bar_lounge: {
      name: 'Vertigo Rooftop & Moon Bar (61st Fl)',
      tagline: 'Highest open-air rooftop bar & grill in Asia with 360° Bangkok views',
      operating_hours: '05:00 PM - 01:00 AM',
      cuisine: 'Premium Grilled Steaks & Sunset Mixology',
      dress_code: 'Smart Elegant',
      images: [
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    categorized_amenities: [
      {
        category: 'Popular Highlights',
        items: ['Vertigo 61st Fl Rooftop Bar', 'Sky Pool', 'Banyan Tree Spa', 'BTS Skytrain Shuttle', 'Free Wi-Fi']
      },
      {
        category: 'Room Comforts',
        items: ['Essential Oil Burner', 'Deep Soaking Tub', 'City Skyline View', 'Pillow Menu', 'Air Conditioning']
      },
      {
        category: 'Food & Dining',
        items: ['Vertigo Grill', 'Moon Bar', 'Saffron Thai Dining', 'Apsara Dinner Cruise', '24/7 Room Service']
      },
      {
        category: 'Wellness & Relaxation',
        items: ['Banyan Tree Luxury Spa', 'Steam Room & Sauna', 'Sky Fitness Center', 'Yoga Sessions']
      }
    ],
    room_types: [
      {
        id: 'rm-bkk-01',
        hotel_id: 'hotel-4star',
        name: 'Horizon Luxury King Suite',
        room_size: 48,
        room_size_unit: 'sq.m',
        bed_type: 'King Bed',
        max_occupancy: 3,
        max_adults: 2,
        max_children: 1,
        view_type: 'Bangkok City Skyline',
        total_rooms: 25,
        available_rooms: 12,
        is_available: true,
        base_price_thb: 5200,
        price: 5200,
        price_per_night: 5200,
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Deep Soaking Tub', 'Aromatherapy Set', 'High-Speed Wi-Fi', 'Smart TV', 'Separate Living Area'],
        rate_plans: [
          {
            id: 'rp-bk-01-ep',
            name: 'EP - Room Only',
            meal_plan: 'EP',
            meal_plan_label: 'Room Only',
            base_price: 5200,
            calculated_price: 5200,
            cancellation_policy: 'Non-refundable promotion'
          },
          {
            id: 'rp-bk-01-cp',
            name: 'CP - International Buffet Breakfast',
            meal_plan: 'CP',
            meal_plan_label: 'International Buffet Breakfast',
            base_price: 6100,
            calculated_price: 6100,
            cancellation_policy: 'Free cancellation up to 24 hours prior to arrival'
          },
          {
            id: 'rp-bk-01-club',
            name: 'Club Privileges + Breakfast + Evening Cocktails',
            meal_plan: 'Club',
            meal_plan_label: 'Executive Club Lounge Access',
            base_price: 7400,
            calculated_price: 7400,
            cancellation_policy: 'Free cancellation up to 48 hours prior to arrival'
          }
        ]
      },
      {
        id: 'rm-bkk-02',
        hotel_id: 'hotel-4star',
        name: 'Oasis Sky Club Suite with Moon Bar Perks',
        room_size: 65,
        room_size_unit: 'sq.m',
        bed_type: 'King Bed',
        max_occupancy: 3,
        max_adults: 2,
        max_children: 1,
        view_type: 'High-Floor Panoramic River & City',
        total_rooms: 15,
        available_rooms: 7,
        is_available: true,
        base_price_thb: 8200,
        price: 8200,
        price_per_night: 8200,
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Club Lounge Access', 'Moon Bar VIP Pass', 'Butler Service', 'Complimentary Evening Canapés'],
        rate_plans: [
          {
            id: 'rp-bk-02-club',
            name: 'VIP Club Experience + Moon Bar Reserved Seating',
            meal_plan: 'Club VIP',
            meal_plan_label: 'Club Lounge + Moon Bar VIP Perks',
            base_price: 8200,
            calculated_price: 8200,
            cancellation_policy: 'Free cancellation up to 48 hours prior to arrival'
          }
        ]
      }
    ]
  },
  {
    id: 'hotel-3star',
    db_id: 'th-htl-04',
    name: 'Hilton Pattaya - Beachfront Panoramic Infinity Pool Resort',
    city: 'Pattaya',
    area: 'Central Pattaya Beach, Pattaya',
    location: 'Beach Road, Central Pattaya, Thailand',
    address: '333/101 Moo 9 Nongprue, Banglamung, Pattaya Beach 20260, Thailand',
    price: 4200,
    original_price: 6200,
    stars: 5,
    star_rating: 5,
    rating: 4.82,
    reviews_count: 1670,
    badge: '5-Star Beachfront Luxury',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80'
    ],
    description: 'Towering 34 levels above CentralFestival Pattaya Beach, Hilton Pattaya delivers unmatched coastal luxury with 180-degree unobstructed panoramas across the Gulf of Thailand. Features an expansive landscaped outdoor infinity pool on the 16th floor, private ocean-facing balconies in every room, eforea spa, Drift rooftop lounge, and direct elevator access to world-class dining, shopping, and watersports.',
    amenities: [
      'Infinity Edge Pool over Gulf',
      'Drift Rooftop Lounge & Bar',
      'eforea Luxury Spa',
      'Direct CentralFestival Mall Access',
      'Free High-Speed Wi-Fi',
      'Oceanfront Dining',
      '24/7 Fitness Center',
      'Kids Play Club',
      'Valet Parking',
      'Room Service'
    ],
    check_in_time: '15:00',
    check_out_time: '12:00',
    property_rules: [
      'Government photo ID required at check-in',
      '100% non-smoking rooms with balcony smoking areas',
      'Kids stay free with existing bedding up to age 12',
      'Direct air-conditioned mall entrance on level 1'
    ],
    bar_lounge: {
      name: 'Drift Rooftop Bar & Lounge',
      tagline: 'Floating pod lounges & cocktails overlooking the Gulf of Thailand',
      operating_hours: '10:00 AM - 11:00 PM',
      cuisine: 'Artisan High Tea, Tapas & Coastal Cocktails',
      dress_code: 'Resort Casual',
      images: [
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    categorized_amenities: [
      {
        category: 'Popular Highlights',
        items: ['16th-Fl Infinity Edge Pool', 'Drift Rooftop Lounge', 'Direct Mall Access', 'Beachfront', 'Free Wi-Fi']
      },
      {
        category: 'Room Comforts',
        items: ['Private Ocean Balcony', 'Hilton Serenity Bed', 'Rain Shower', 'Deep Tub', 'Smart TV']
      },
      {
        category: 'Food & Dining',
        items: ['Edge Ocean Terrace', 'Flare Fine Dining', 'Drift Lounge', 'Shore Pool Bar', '24/7 Room Service']
      },
      {
        category: 'Wellness & Facilities',
        items: ['eforea Spa', '24-hour Oceanview Gym', 'Jacuzzi', 'Kids Play Zone']
      }
    ],
    room_types: [
      {
        id: 'rm-pattaya-01',
        hotel_id: 'hotel-3star',
        name: 'King Hilton Executive Ocean View',
        room_size: 46,
        room_size_unit: 'sq.m',
        bed_type: 'King Bed',
        max_occupancy: 3,
        max_adults: 2,
        max_children: 1,
        view_type: 'Unobstructed Gulf of Thailand',
        total_rooms: 30,
        available_rooms: 14,
        is_available: true,
        base_price_thb: 4200,
        price: 4200,
        price_per_night: 4200,
        images: [
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Private Balcony', 'Outdoor Seating', 'Free Wi-Fi', 'Marble Bath', 'Minibar'],
        rate_plans: [
          {
            id: 'rp-pat-01-ep',
            name: 'EP - Room Only',
            meal_plan: 'EP',
            meal_plan_label: 'Room Only',
            base_price: 4200,
            calculated_price: 4200,
            cancellation_policy: 'Non-refundable saver rate'
          },
          {
            id: 'rp-pat-01-cp',
            name: 'CP - Edge International Buffet Breakfast',
            meal_plan: 'CP',
            meal_plan_label: 'Buffet Breakfast Included',
            base_price: 4950,
            calculated_price: 4950,
            cancellation_policy: 'Free cancellation up to 24 hours prior to arrival'
          },
          {
            id: 'rp-pat-01-map',
            name: 'MAP - Half Board (Breakfast + Oceanfront Dinner)',
            meal_plan: 'MAP',
            meal_plan_label: 'Breakfast + Dinner Included',
            base_price: 6200,
            calculated_price: 6200,
            cancellation_policy: 'Free cancellation up to 48 hours prior to arrival'
          }
        ]
      },
      {
        id: 'rm-pattaya-02',
        hotel_id: 'hotel-3star',
        name: 'Grand Oceanfront Family Suite',
        room_size: 78,
        room_size_unit: 'sq.m',
        bed_type: '1 King + 2 Twin Beds',
        max_occupancy: 4,
        max_adults: 4,
        max_children: 2,
        view_type: 'Panoramic Oceanfront',
        total_rooms: 12,
        available_rooms: 5,
        is_available: true,
        base_price_thb: 7800,
        price: 7800,
        price_per_night: 7800,
        images: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
        ],
        amenities: ['Spacious Living Room', 'Two Bathrooms', 'Dual Balconies', 'Kids Welcome Pack'],
        rate_plans: [
          {
            id: 'rp-pat-02-cp',
            name: 'CP - International Breakfast for Family',
            meal_plan: 'CP',
            meal_plan_label: 'Buffet Breakfast for up to 4',
            base_price: 7800,
            calculated_price: 7800,
            cancellation_policy: 'Free cancellation up to 48 hours prior to arrival'
          }
        ]
      }
    ]
  }
];

export const packagesData = [
  {
    id: 'pkg-th-01',
    name: 'Bangkok & Pattaya Highlights - Temples, Coral Island & River Cruise',
    duration: '4 Days / 3 Nights',
    car_included: 'Toyota Altis Sedan Chauffeur',
    hotel_included: 'Banyan Tree Bangkok (5-Star)',
    price: 14999,
    description: 'Experience the magic of Thailand: Grand Palace, Wat Arun, Coral Island speedboats and a 5-star Chao Phraya dinner cruise.',
    tag: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    image_url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80'
    ],
    package_type: 'Signature Tour',
    flights_included: '0',
    food_included: 'Daily Buffet Breakfast & 1 Gala Dinner Cruise',
    pickup_drop_included: 'Suvarnabhumi Airport (BKK) VIP Pick & Drop',
    places_included: 'Grand Palace, Wat Arun, Iconsiam, Coral Island, Pattaya Beach',
    price_with_flight: 14999,
    destination: 'Bangkok & Pattaya, Thailand',
    is_flight_customizable: 0,
    base_flight_price: 0,
    is_cab_customizable: 1,
    company_cab_price: 2500,
    day_wise_itinerary: [
      {
        day: 1,
        title: 'VIP Arrival at BKK Airport & Check-in at Banyan Tree Bangkok',
        description: 'Meet and greet at Suvarnabhumi Airport. Private transfer to Banyan Tree Bangkok. Evening rooftop drinks at Moon Bar.',
        location: 'Bangkok',
        hotel: 'Banyan Tree Bangkok',
        meals: 'Welcome Drink',
        transfers: 'Toyota Altis Sedan',
        inclusions: ['BKK Airport Pickup', 'Banyan Tree Check-in', 'Welcome Drinks']
      },
      {
        day: 2,
        title: 'Royal Temples Tour & Chao Phraya Luxury Dinner Cruise',
        description: 'Explore the Grand Palace, Emerald Buddha, and Wat Arun. In the evening, board the Chao Phraya Princess luxury dinner cruise.',
        location: 'Bangkok',
        hotel: 'Banyan Tree Bangkok',
        meals: 'Breakfast & Buffet Dinner Cruise',
        transfers: 'Toyota Altis Sedan',
        inclusions: ['Temple Passes', 'Dinner Cruise Ticket', 'Private Chauffeur']
      },
      {
        day: 3,
        title: 'Scenic Transfer to Pattaya & Coral Island Speedboat Adventure',
        description: 'Transfer to Pattaya coast. Speedboat to Koh Larn Coral Island for snorkeling, beach relaxation and fresh seafood lunch.',
        location: 'Pattaya',
        hotel: 'Hilton Pattaya',
        meals: 'Breakfast & Island Lunch',
        transfers: 'Toyota Altis Sedan',
        inclusions: ['Coral Island Speedboat', 'Snorkeling Gear', 'Seafood Lunch']
      },
      {
        day: 4,
        title: 'Leisure Morning & Private Airport Drop Transfer',
        description: 'Infinity pool breakfast and souvenir shopping at Central Festival before private transfer back to Suvarnabhumi Airport.',
        location: 'Bangkok / Pattaya',
        hotel: 'Hilton Pattaya',
        meals: 'Buffet Breakfast',
        transfers: 'Toyota Altis Sedan',
        inclusions: ['Breakfast', 'BKK Airport Drop Transfer']
      }
    ]
  },
  {
    id: 'pkg-th-02',
    name: 'Phuket & Phi Phi Island Paradise - Maya Bay, Big Buddha & Sunset Catamaran',
    duration: '4 Days / 3 Nights',
    car_included: 'Toyota Fortuner VIP 4x4',
    hotel_included: 'The Shore at Katathani - Luxury Oceanfront Pool Villa (5-Star)',
    price: 22999,
    description: 'Immerse in tropical luxury in Phuket. Private villa with infinity pool, VIP speedboat excursion to Phi Phi & Maya Bay, and Promthep Cape sunset.',
    tag: 'Luxury Honeymoon',
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
    image_url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
    ],
    package_type: 'Signature Tour',
    flights_included: '0',
    food_included: 'All Meals & 1 Candlelight Beachfront Dinner',
    pickup_drop_included: 'Phuket Airport (HKT) VIP Pick & Drop',
    places_included: 'Maya Bay, Phi Phi Don, Pileh Lagoon, Big Buddha, Promthep Cape',
    price_with_flight: 22999,
    destination: 'Phuket & Phi Phi, Thailand',
    is_flight_customizable: 0,
    base_flight_price: 0,
    is_cab_customizable: 1,
    company_cab_price: 3500,
    day_wise_itinerary: [
      {
        day: 1,
        title: 'HKT Airport VIP Arrival & Pool Villa Check-in at Katathani',
        description: 'Chauffeur greeting at Phuket International Airport. Transfer to luxury oceanfront pool villa with sparkling wine.',
        location: 'Kata Noi Beach, Phuket',
        hotel: 'The Shore at Katathani',
        meals: 'Champagne & Welcome Dinner',
        transfers: 'Toyota Fortuner VIP',
        inclusions: ['HKT Airport Pickup', 'Pool Villa Check-in', 'Welcome Champagne']
      },
      {
        day: 2,
        title: 'Phi Phi Islands, Maya Bay & Emerald Pileh Lagoon VIP Speedboat',
        description: 'Full-day catamaran speedboat excursion to world-famous Maya Bay, snorkeling in crystal-clear Pileh Lagoon and buffet lunch on Phi Phi Don.',
        location: 'Phi Phi Islands',
        hotel: 'The Shore at Katathani',
        meals: 'Breakfast & Island Lunch',
        transfers: 'Catamaran Speedboat + Fortuner',
        inclusions: ['Speedboat Excursion', 'National Park Fees', 'Snorkeling Gear', 'Buffet Lunch']
      },
      {
        day: 3,
        title: 'Phuket Heritage, Big Buddha & Romantic Sunset Candlelight Dinner',
        description: 'Visit Phuket Big Buddha on Nakkerd Hill, stroll Old Phuket Town Sino-Portuguese streets, and savor a private candlelight dinner on Kata Noi Beach.',
        location: 'Phuket Island Wide',
        hotel: 'The Shore at Katathani',
        meals: 'Breakfast & Beachfront Candlelight Dinner',
        transfers: 'Toyota Fortuner VIP',
        inclusions: ['Island Tour', 'Big Buddha Visit', 'Beach Candlelight Dinner']
      },
      {
        day: 4,
        title: 'Floating Breakfast & VIP Airport Departure Transfer',
        description: 'Signature in-villa floating pool breakfast. Smooth check-out and private transfer to Phuket International Airport.',
        location: 'Phuket',
        hotel: 'The Shore at Katathani',
        meals: 'Floating Pool Breakfast',
        transfers: 'Toyota Fortuner VIP',
        inclusions: ['Floating Breakfast', 'HKT Airport Drop']
      }
    ]
  },
  {
    id: 'pkg-th-03',
    name: 'Krabi & 4 Islands Adventure - Railay Beach, Emerald Pool & Sea Canoe',
    duration: '3 Days / 2 Nights',
    car_included: 'Toyota Commuter VIP Van',
    hotel_included: 'Rayavadee Resort Krabi (5-Star)',
    price: 16999,
    description: 'Discover pristine dramatic limestone karsts, Railay Beach hidden caves, crystal clear Emerald Pool and authentic Thai jungle hot springs.',
    tag: 'Island Adventure',
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80',
    image_url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80'
    ],
    package_type: 'Signature Tour',
    flights_included: '0',
    food_included: 'Breakfast & Sea Cave Dining Included',
    pickup_drop_included: 'Krabi Airport (KBV) VIP Pick & Drop',
    places_included: 'Railay Beach, Phra Nang Cave, Emerald Pool, Hot Springs Waterfall',
    price_with_flight: 16999,
    destination: 'Krabi, Thailand',
    is_flight_customizable: 0,
    base_flight_price: 0,
    is_cab_customizable: 1,
    company_cab_price: 3000,
    day_wise_itinerary: [
      {
        day: 1,
        title: 'KBV Airport Greeting & Longtail Boat to Rayavadee Railay',
        description: 'Airport greeting at Krabi Airport. Private transfer to pier and scenic boat ride to Rayavadee Pavilion surrounded by sheer limestone cliffs.',
        location: 'Railay, Krabi',
        hotel: 'Rayavadee Resort',
        meals: 'Welcome Drink & Grotto Dinner',
        transfers: 'Toyota Commuter VIP + Luxury Longtail',
        inclusions: ['Airport Transfer', 'Boat Handover', 'Rayavadee Check-in']
      },
      {
        day: 2,
        title: 'Krabi 4-Island Tour & Emerald Pool Jungle Trek',
        description: 'Longtail island hopping to Chicken Island, Tup Island sandbar, and jungle trek to the natural therapeutic Emerald Pool.',
        location: 'Krabi Coast',
        hotel: 'Rayavadee Resort',
        meals: 'Buffet Breakfast & Lunch Box',
        transfers: 'Private Longtail Boat',
        inclusions: ['4-Island Tour Pass', 'Emerald Pool Entry', 'Lunch Box']
      },
      {
        day: 3,
        title: 'Phra Nang Cave Sunrise & Krabi Airport Drop',
        description: 'Morning walk along Phra Nang Beach, breakfast at Rayavadee, and private transfer to Krabi International Airport.',
        location: 'Krabi Airport',
        hotel: 'Rayavadee Resort',
        meals: 'Buffet Breakfast',
        transfers: 'Toyota Commuter VIP',
        inclusions: ['Breakfast', 'KBV Airport Drop Transfer']
      }
    ]
  }
];

export const carsData = [
  {
    id: 'veh-th-01-altis',
    vendor_id: 'vnd-phuket-01',
    name: 'Toyota Altis Sedan',
    category: 'Sedan',
    price: 800,
    seating: '4 Seater',
    fuel: 'Petrol / Hybrid',
    transmission: 'Automatic',
    rating: 4.85,
    badge: 'Top Choice',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80'],
    location: 'Bangkok & Phuket Airports / Hotel Delivery',
    is_available: 1
  },
  {
    id: 'veh-th-02-camry',
    vendor_id: 'vnd-phuket-01',
    name: 'Toyota Camry Executive',
    category: 'Premium Sedan',
    price: 1200,
    seating: '4 Seater',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    rating: 4.90,
    badge: 'Executive',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'],
    location: 'Bangkok Downtown & Pattaya',
    is_available: 1
  },
  {
    id: 'veh-th-03-fortuner',
    vendor_id: 'vnd-phuket-01',
    name: 'Toyota Fortuner VIP 4x4',
    category: 'SUV / 4x4',
    price: 1500,
    seating: '7 Seater',
    fuel: 'Diesel',
    transmission: 'Automatic',
    rating: 4.95,
    badge: 'Most Popular',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
    location: 'Phuket, Krabi & Koh Samui',
    is_available: 1
  },
  {
    id: 'veh-th-04-commuter',
    vendor_id: 'vnd-phuket-01',
    name: 'Toyota Commuter VIP 9-Seater Van',
    category: 'VIP Van',
    price: 1800,
    seating: '9 Seater',
    fuel: 'Diesel',
    transmission: 'Automatic',
    rating: 4.96,
    badge: 'Group VIP',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'],
    location: 'Bangkok & Phuket Island Wide',
    is_available: 1
  },
  {
    id: 'veh-th-05-majesty',
    vendor_id: 'vnd-phuket-01',
    name: 'Toyota Majesty Ultra-VIP Van',
    category: 'Executive Van',
    price: 2800,
    seating: '7 VIP Captain Seats',
    fuel: 'Diesel',
    transmission: 'Automatic',
    rating: 4.98,
    badge: 'Luxury VIP',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'],
    location: 'Bangkok / Phuket Luxury Stays',
    is_available: 1
  }
];

export const bikesData = [
  {
    id: 'bike-th-01',
    vendor_id: 'vnd-phuket-01',
    name: 'Honda PCX 160 eSP+',
    category: 'Scooter',
    price: 450,
    engine: '160cc',
    fuel: 'Petrol',
    mileage: '45 km/l',
    rating: 4.85,
    badge: 'Popular',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    image_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'],
    location: 'Phuket & Koh Samui Delivery',
    is_available: 1
  },
  {
    id: 'bike-th-02',
    vendor_id: 'vnd-phuket-01',
    name: 'Yamaha NMAX 155 ABS',
    category: 'Scooter',
    price: 500,
    engine: '155cc',
    fuel: 'Petrol',
    mileage: '42 km/l',
    rating: 4.90,
    badge: 'Touring',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80'],
    location: 'Phuket Island Wide',
    is_available: 1
  },
  {
    id: 'bike-th-03',
    vendor_id: 'vnd-phuket-01',
    name: 'Vespa Sprint 150 i-Get',
    category: 'Classic',
    price: 800,
    engine: '150cc',
    fuel: 'Petrol',
    mileage: '38 km/l',
    rating: 4.95,
    badge: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    image_url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80'],
    location: 'Patong & Bang Tao Beach',
    is_available: 1
  }
];

export const exploreDestinations = [
  {
    id: 'dest-1',
    name: 'Wow Thailand',
    region: 'India',
    description: 'The ultimate tropical paradise! Explore golden sandy shores, Thai cultural temples, vibrant night markets, and thrilling water sports.',
    tag: 'Sun, Sand & Seafood',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'dest-2',
    name: 'Wow Dubai',
    region: 'Middle East',
    description: 'A futuristic oasis. Marvel at Burj Khalifa, shop at massive malls, enjoy desert safaris, and visit artificial islands.',
    tag: 'Luxury & Skyline',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'dest-3',
    name: 'Wow Europe',
    region: 'Europe',
    description: 'Breathtaking scenery and history! Wander through the streets of Paris, Venice, and Swiss Alps chalet pathways.',
    tag: 'Heritage & Landscapes',
    image: 'https://images.unsplash.com/photo-1473951574080-01fe45ec8643?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'dest-4',
    name: 'Wow Maldives',
    region: 'Tropical Islands',
    description: 'Incredible water bungalows, transparent turquoise lagoons, colorful coral reefs, and romantic sunset cruises.',
    tag: 'Private Luxury Residing',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'dest-5',
    name: 'Wow Bali',
    region: 'Asia',
    description: 'Lush green terraced rice paddies, serene volcanic mountains, iconic sea temples, and spiritual beach culture.',
    tag: 'Nature & Spirituality',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'dest-6',
    name: 'Wow Thailand',
    region: 'Asia',
    description: 'Vibrant street foods, ornate golden Buddhist shrines, busy night bazaars, and beautiful tropical islands like Phuket.',
    tag: 'Culture & Nightlife',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80'
  }
];

export const usersData = [
  {
    id: 'u-1',
    username: 'superadmin',
    email: 'superadmin@gmail.com',
    role: 'superadmin',
    plain_password: 'superadmin',
    status: 'active',
    billing_price: 0,
    created_at: '2026-07-07 09:07:22'
  },
  {
    id: 'u-2',
    username: 'admin',
    email: 'admin@gmail.com',
    role: 'admin',
    plain_password: 'Admin@Thai2026',
    status: 'active',
    billing_price: 5000,
    created_at: '2026-07-07 09:07:22'
  },
  {
    id: 'u-3',
    username: 'vendor',
    email: 'transfer_vendor@wowthailand.com',
    role: 'vendor',
    plain_password: 'Vendor@Fleet26',
    status: 'active',
    billing_price: 2500,
    created_at: '2026-07-07 09:07:22'
  },
  {
    id: 'vendor-1783681575800',
    username: 'rakhi',
    email: 'rakhi@gmail.com',
    role: 'vendor',
    plain_password: 'Rakhi@Vendor26',
    status: 'active',
    billing_price: 3000,
    created_at: '2026-07-15 16:54:15'
  },
  {
    id: 'vendor-1784200910786',
    username: 'ashwini',
    email: 'as@gmail.com',
    role: 'vendor',
    plain_password: 'Ashwini@Fleet26',
    status: 'active',
    billing_price: 3000,
    created_at: '2026-07-16 16:51:51'
  },
  {
    id: 'u-4',
    username: 'thai_operations',
    email: 'operations@wowthailand.com',
    role: 'admin',
    plain_password: 'Ops@Thai2026',
    status: 'active',
    billing_price: 4500,
    created_at: '2026-08-10 14:15:00'
  },
  {
    id: 'u-5',
    username: 'hotel_vendor',
    email: 'hotel_transfer_vendor@wowthailand.com',
    role: 'hotel_vendor',
    plain_password: 'Hotel@Thai2026',
    status: 'active',
    billing_price: 3500,
    created_at: '2026-08-15 11:20:00'
  },
  {
    id: 'u-6',
    username: 'flight_vendor',
    email: 'flight_transfer_vendor@wowthailand.com',
    role: 'flight_vendor',
    plain_password: 'Flight@Thai2026',
    status: 'active',
    billing_price: 4000,
    created_at: '2026-08-18 09:45:00'
  }
];

export const bookingsData = [
  {
    id: 'TG-276666',
    name: 'rohan',
    phone: '985253764',
    email: 'rohan@gmail.com',
    item_id: 'pkg-1784183801030',
    item_name: 'tets (Thailand Tour Package)',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 9688,
    amount_paid: 9688,
    remaining_amount: 0,
    total_paid: 9688,
    status: 'Confirmed',
    payment_status: 'Full',
    payment_method: 'Online UPI',
    created_at: '2026-07-16 14:05:51'
  },
  {
    id: 'TG-745878',
    name: 'aashwini s',
    phone: '47558415875',
    email: 'a@gmail.com',
    item_id: 'pkg-1784181268766',
    item_name: 'test (Self Drive Package)',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 6200,
    amount_paid: 6200,
    remaining_amount: 0,
    total_paid: 6200,
    status: 'Confirmed',
    payment_status: 'Full',
    payment_method: 'Online UPI',
    created_at: '2026-07-16 08:08:52'
  },
  {
    id: 'TG-969163',
    name: 'ashwini shivalli',
    phone: '7411728653',
    email: 'ashwini.s@gmail.com',
    item_id: '6a561d8cc7b12',
    item_name: 'Ultimate Thailand Premium Experience',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 25999,
    amount_paid: 25999,
    remaining_amount: 0,
    total_paid: 25999,
    status: 'Confirmed',
    payment_status: 'Full',
    payment_method: 'Pay at Hotel',
    created_at: '2026-07-14 14:24:38'
  },
  {
    id: 'TG-683664',
    name: 'assss jty',
    phone: '7411728653',
    email: 'assss@gmail.com',
    item_id: '6a561d8cc7b12',
    item_name: 'Ultimate Thailand Premium Experience',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 25999,
    amount_paid: 0,
    remaining_amount: 25999,
    total_paid: 0,
    status: 'Pending',
    payment_status: 'Pending Verification',
    payment_method: 'Bank Transfer',
    created_at: '2026-07-15 07:07:37'
  },
  {
    id: 'TG-937092',
    name: 'ashwini',
    phone: '7411728653',
    email: 'ashwini@gmail.com',
    item_id: 'pkg-1784006227274',
    item_name: 'test Thailand Stay',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 23151,
    amount_paid: 23151,
    remaining_amount: 0,
    total_paid: 23151,
    status: 'Confirmed',
    payment_status: 'Full',
    payment_method: 'UPI Instant',
    created_at: '2026-07-14 07:22:06'
  },
  {
    id: 'TG-488056',
    name: 'fghj',
    phone: '8904489513',
    email: 'fghj@gmail.com',
    item_id: 'pkg-1784006227274',
    item_name: 'test Thailand Experience',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-07',
    drop_date: '2026-07-09',
    booking_days: 2,
    total_amount: 10629,
    amount_paid: 0,
    remaining_amount: 10629,
    total_paid: 0,
    status: 'Pending',
    payment_status: 'Pending',
    payment_method: 'Pay at Hotel',
    created_at: '2026-07-14 09:09:52'
  },
  {
    id: 'TG-868499',
    name: 'yuiop[',
    phone: '8965210365',
    email: 'yuiop@gmail.com',
    item_id: 'pkg-1784007545188',
    item_name: 'test Bangkok & Pattaya Package',
    pickup_loc: 'Patong Beach (Bangkok & Pattaya)',
    pickup_date: '2026-07-09',
    drop_date: '2026-07-11',
    booking_days: 2,
    total_amount: 10738,
    amount_paid: 0,
    remaining_amount: 10738,
    total_paid: 0,
    status: 'Pending',
    payment_status: 'Pending',
    payment_method: 'UPI QR',
    created_at: '2026-07-14 08:13:16'
  },
  {
    id: 'TG-225048',
    name: 'yyy yyy',
    phone: '9513700902',
    email: 'yyy@gmail.com',
    item_id: '6a561d8cc7b12',
    item_name: 'Ultimate Thailand Premium Experience',
    pickup_loc: 'Sukhumvit (Bangkok & Pattaya)',
    pickup_date: '2026-07-08',
    drop_date: '2026-07-11',
    booking_days: 3,
    total_amount: 25999,
    amount_paid: 0,
    remaining_amount: 25999,
    total_paid: 0,
    status: 'Draft',
    payment_status: 'Pending',
    payment_method: 'Pay at Hotel',
    created_at: '2026-07-15 07:20:58'
  },
  {
    id: 'TG-877771',
    name: 'Rudra M  fghj',
    phone: '74117258659',
    email: 'rudra@gmail.com',
    item_id: '6a561d8cc7b12',
    item_name: 'Ultimate Thailand Premium Experience',
    pickup_loc: 'hubli',
    pickup_date: '2026-07-25',
    drop_date: '2026-08-10',
    booking_days: 16,
    total_amount: 64999,
    amount_paid: 64999,
    remaining_amount: 0,
    total_paid: 64999,
    status: 'Confirmed',
    payment_status: 'Full',
    payment_method: 'Bank Transfer',
    created_at: '2026-07-15 09:03:05'
  },
  {
    id: '104821',
    name: 'Rajesh Kumar',
    phone: '+91 9876543210',
    email: 'rajesh.k@gmail.com',
    item_id: 'hotel-1',
    item_name: 'Taj Exotica Resort & Spa',
    pickup_loc: 'Phuket & Krabi (Cha-Am)',
    pickup_date: '2026-09-30',
    drop_date: '2026-10-04',
    booking_days: 4,
    total_amount: 42730,
    amount_paid: 42730,
    remaining_amount: 0,
    total_paid: 42730,
    status: 'Confirmed',
    payment_status: 'Completed',
    payment_method: 'Pay at Hotel',
    created_at: '2026-08-25 14:20:00'
  }
];

export const vendorsData = [
  {
    id: 'vendor-1783681575800',
    name: 'rakhi',
    email: 'rakhi@gmail.com',
    phone: '7411728653',
    city: 'Sukhumvit, Thailand',
    role: 'vendor',
    status: 'active',
    created_at: '2026-07-10'
  },
  {
    id: 'vendor-1784200910786',
    name: 'ashwini',
    email: 'as@gmail.com',
    phone: '7411728653',
    city: 'hubli',
    role: 'vendor',
    status: 'active',
    created_at: '2026-07-16'
  },
  {
    id: 'vendor-1',
    name: 'Thailand Premium Wheels Ltd',
    email: 'wheels@thailand.com',
    phone: '+91 9999988888',
    city: 'Sukhumvit, Thailand',
    role: 'vendor',
    status: 'active',
    created_at: '2026-08-01'
  },
  {
    id: 'vendor-2',
    name: 'Breeze Rider Co',
    email: 'ride@thaibreeze.com',
    phone: '+91 9888877777',
    city: 'Railay, Thailand',
    role: 'vendor',
    status: 'active',
    created_at: '2026-08-02'
  },
  {
    id: 'vendor-3',
    name: 'Taj Hospitality Partner',
    email: 'taj.partner@thailand.com',
    phone: '+91 9777766666',
    city: 'Cha-Am, Thailand',
    role: 'hotel_vendor',
    status: 'active',
    created_at: '2026-08-05'
  },
  {
    id: 'vendor-4',
    name: 'IndiGo Flight Connect',
    email: 'flights@thailand.com',
    phone: '+91 9666655555',
    city: 'Suvarnabhumi Airport (BKK)',
    role: 'flight_vendor',
    status: 'active',
    created_at: '2026-08-08'
  }
];

export const aiLeadsData = [
  {
    id: 'ai-6a56018b73577',
    name: 'Test Lead',
    phone: '1234567890',
    created_at: '2026-07-14 11:29:47'
  },
  {
    id: 'ai-6a5729ec95e2b',
    name: 'ashwin',
    phone: '78411728568',
    created_at: '2026-07-15 08:34:20'
  },
  {
    id: 'ai-6a573ec45a7fd',
    name: 'Test',
    phone: '1234567890',
    created_at: '2026-07-15 10:03:16'
  },
  {
    id: 'ai-6a573fbaa76ac',
    name: 'ashwini',
    phone: '741172653',
    created_at: '2026-07-15 10:07:22'
  },
  {
    id: 'ai-6a5891467dfb3',
    name: 'ashwini',
    phone: '7411725695',
    created_at: '2026-07-16 10:07:34'
  },
  {
    id: 'ai-1',
    name: 'Rohan Gupta',
    phone: '+91 9876543210',
    created_at: '2026-08-25 15:30:00'
  },
  {
    id: 'ai-2',
    name: 'Ananya Sen',
    phone: '+91 9812345678',
    created_at: '2026-08-26 10:15:00'
  }
];

export const customEnquiriesData = [
  {
    id: 'enq-1',
    enquiry_id: 'ENQ-901',
    customer_name: 'Suresh Reddy',
    customer_phone: '+91 9845012345',
    destinations: 'Bangkok & Pattaya & Watersports',
    travel_dates: '15 Sep - 20 Sep 2026',
    status: 'New Enquiry',
    created_at: '2026-08-25 18:00:00'
  }
];

export const plannerLocations = [];
export const plannerStays = [];
export const plannerVehicles = [];
export const plannerExperiences = [];
export const plannerComparison = [];


export const vehicleUnitsData = [
    {
        "id": "U-F86F09BF-01",
        "vehicle_id": "bike-1",
        "vendor_id": "vendor-2",
        "unit_name": "Honda PCX 160 eSP+ (Reborn) Unit 1",
        "registration_no": "GA-01-BIKE-184",
        "status": "Active",
        "vehicle_name": "Honda PCX 160 eSP+ (Reborn)",
        "category": "Cruiser"
    },
    {
        "id": "U-761A4D98-01",
        "vehicle_id": "bike-2",
        "vendor_id": "vendor-2",
        "unit_name": "Honda PCX 160 Unit 1",
        "registration_no": "GA-01-BIKE-881",
        "status": "Active",
        "vehicle_name": "Honda PCX 160",
        "category": "Scooter"
    },
    {
        "id": "U-CC8FE7DF-01",
        "vehicle_id": "bike-3",
        "vendor_id": "vendor-2",
        "unit_name": "Yamaha FZ-S V3 Unit 1",
        "registration_no": "GA-01-BIKE-422",
        "status": "Active",
        "vehicle_name": "Yamaha FZ-S V3",
        "category": "Sports"
    },
    {
        "id": "U-891247B9-01",
        "vehicle_id": "bike-4",
        "vendor_id": "vendor-2",
        "unit_name": "Yamaha NMAX 155 ABS Unit 1",
        "registration_no": "GA-01-BIKE-683",
        "status": "Active",
        "vehicle_name": "Yamaha NMAX 155 ABS",
        "category": "Adventure"
    },
    {
        "id": "GT-001",
        "vehicle_id": "bike-6a945e35e27c1",
        "vendor_id": "u-4",
        "unit_name": "GT Unit #1",
        "registration_no": "GA-01-GT-0001",
        "status": "Active",
        "vehicle_name": "GT",
        "category": "Scooter / Moped"
    },
    {
        "id": "GT-002",
        "vehicle_id": "bike-6a945e35e27c1",
        "vendor_id": "u-4",
        "unit_name": "GT Unit #2",
        "registration_no": "GA-01-GT-0002",
        "status": "Active",
        "vehicle_name": "GT",
        "category": "Scooter / Moped"
    },
    {
        "id": "GT-003",
        "vehicle_id": "bike-6a945e35e27c1",
        "vendor_id": "u-4",
        "unit_name": "GT Unit #3",
        "registration_no": "GA-01-GT-0003",
        "status": "Active",
        "vehicle_name": "GT",
        "category": "Scooter / Moped"
    },
    {
        "id": "GT-004",
        "vehicle_id": "bike-6a945e35e27c1",
        "vendor_id": "u-4",
        "unit_name": "GT Unit #4",
        "registration_no": "GA-01-GT-0004",
        "status": "Active",
        "vehicle_name": "GT",
        "category": "Scooter / Moped"
    },
    {
        "id": "U-8F27FB4F-01",
        "vehicle_id": "bike-6a945e65c98f9",
        "vendor_id": "u-4",
        "unit_name": "Honda Forza 350 Unit 1",
        "registration_no": "GA-01-BIKE-827",
        "status": "Active",
        "vehicle_name": "Honda Forza 350",
        "category": "Sports Bike"
    },
    {
        "id": "U-4221C4BC-01",
        "vehicle_id": "car-1",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 Luxury Unit 1",
        "registration_no": "GA-01-CAR-965",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 Luxury",
        "category": "SUV / 4x4"
    },
    {
        "id": "U-4221C4BC-02",
        "vehicle_id": "car-1",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 Luxury (Fleet Unit #2)",
        "registration_no": "GA-01-MAH-2808",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 Luxury",
        "category": "SUV / 4x4"
    },
    {
        "id": "U-4221C4BC-03",
        "vehicle_id": "car-1",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 Luxury (Fleet Unit #3)",
        "registration_no": "GA-01-MAH-5255",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 Luxury",
        "category": "SUV / 4x4"
    },
    {
        "id": "U-4221C4BC-04",
        "vehicle_id": "car-1",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 Luxury (Fleet Unit #4)",
        "registration_no": "GA-01-MAH-1042",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 Luxury",
        "category": "SUV / 4x4"
    },
    {
        "id": "U-4221C4BC-05",
        "vehicle_id": "car-1",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 Luxury (Fleet Unit #5)",
        "registration_no": "GA-01-MAH-8082",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 Luxury",
        "category": "SUV / 4x4"
    },
    {
        "id": "U-2B5500AD-01",
        "vehicle_id": "car-2",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Altis Sedan Unit 1",
        "registration_no": "GA-01-CAR-519",
        "status": "Active",
        "vehicle_name": "Toyota Altis Sedan",
        "category": "Hatchback"
    },
    {
        "id": "U-2B5500AD-02",
        "vehicle_id": "car-2",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Altis Sedan (Fleet Unit #2)",
        "registration_no": "GA-01-MAR-8989",
        "status": "Active",
        "vehicle_name": "Toyota Altis Sedan",
        "category": "Hatchback"
    },
    {
        "id": "U-2B5500AD-03",
        "vehicle_id": "car-2",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Altis Sedan (Fleet Unit #3)",
        "registration_no": "GA-01-MAR-5117",
        "status": "Active",
        "vehicle_name": "Toyota Altis Sedan",
        "category": "Hatchback"
    },
    {
        "id": "U-2B5500AD-04",
        "vehicle_id": "car-2",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Altis Sedan (Fleet Unit #4)",
        "registration_no": "GA-01-MAR-1663",
        "status": "Active",
        "vehicle_name": "Toyota Altis Sedan",
        "category": "Hatchback"
    },
    {
        "id": "U-2B5500AD-05",
        "vehicle_id": "car-2",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Altis Sedan (Fleet Unit #5)",
        "registration_no": "GA-01-MAR-4203",
        "status": "Active",
        "vehicle_name": "Toyota Altis Sedan",
        "category": "Hatchback"
    },
    {
        "id": "U-B01BC6E6-01",
        "vehicle_id": "car-3",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner VIP SX Automatic Unit 1",
        "registration_no": "GA-01-CAR-156",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner VIP SX Automatic",
        "category": "SUV"
    },
    {
        "id": "U-B01BC6E6-02",
        "vehicle_id": "car-3",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner VIP SX Automatic (Fleet Unit #2)",
        "registration_no": "GA-01-HYU-2731",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner VIP SX Automatic",
        "category": "SUV"
    },
    {
        "id": "U-B01BC6E6-03",
        "vehicle_id": "car-3",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner VIP SX Automatic (Fleet Unit #3)",
        "registration_no": "GA-01-HYU-2156",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner VIP SX Automatic",
        "category": "SUV"
    },
    {
        "id": "U-B01BC6E6-04",
        "vehicle_id": "car-3",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner VIP SX Automatic (Fleet Unit #4)",
        "registration_no": "GA-01-HYU-6819",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner VIP SX Automatic",
        "category": "SUV"
    },
    {
        "id": "U-B01BC6E6-05",
        "vehicle_id": "car-3",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner VIP SX Automatic (Fleet Unit #5)",
        "registration_no": "GA-01-HYU-2076",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner VIP SX Automatic",
        "category": "SUV"
    },
    {
        "id": "U-554CF6B8-01",
        "vehicle_id": "car-4",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Commuter VIP 9-Seater (7 Seater) Unit 1",
        "registration_no": "GA-01-CAR-403",
        "status": "Active",
        "vehicle_name": "Toyota Commuter VIP 9-Seater (7 Seater)",
        "category": "MUV / 7-Seater"
    },
    {
        "id": "U-554CF6B8-02",
        "vehicle_id": "car-4",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Commuter VIP 9-Seater (7 Seater) (Fleet Unit #2)",
        "registration_no": "GA-01-MAR-2357",
        "status": "Active",
        "vehicle_name": "Toyota Commuter VIP 9-Seater (7 Seater)",
        "category": "MUV / 7-Seater"
    },
    {
        "id": "U-554CF6B8-03",
        "vehicle_id": "car-4",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Commuter VIP 9-Seater (7 Seater) (Fleet Unit #3)",
        "registration_no": "GA-01-MAR-1102",
        "status": "Active",
        "vehicle_name": "Toyota Commuter VIP 9-Seater (7 Seater)",
        "category": "MUV / 7-Seater"
    },
    {
        "id": "U-554CF6B8-04",
        "vehicle_id": "car-4",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Commuter VIP 9-Seater (7 Seater) (Fleet Unit #4)",
        "registration_no": "GA-01-MAR-6016",
        "status": "Active",
        "vehicle_name": "Toyota Commuter VIP 9-Seater (7 Seater)",
        "category": "MUV / 7-Seater"
    },
    {
        "id": "U-554CF6B8-05",
        "vehicle_id": "car-4",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Commuter VIP 9-Seater (7 Seater) (Fleet Unit #5)",
        "registration_no": "GA-01-MAR-5212",
        "status": "Active",
        "vehicle_name": "Toyota Commuter VIP 9-Seater (7 Seater)",
        "category": "MUV / 7-Seater"
    },
    {
        "id": "U-FD5DCB77-01",
        "vehicle_id": "car-5",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 AT Unit 1",
        "registration_no": "GA-01-CAR-617",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 AT",
        "category": "Luxury SUV"
    },
    {
        "id": "U-FD5DCB77-02",
        "vehicle_id": "car-5",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 AT (Fleet Unit #2)",
        "registration_no": "GA-01-TOY-2169",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 AT",
        "category": "Luxury SUV"
    },
    {
        "id": "U-FD5DCB77-03",
        "vehicle_id": "car-5",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 AT (Fleet Unit #3)",
        "registration_no": "GA-01-TOY-7142",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 AT",
        "category": "Luxury SUV"
    },
    {
        "id": "U-FD5DCB77-04",
        "vehicle_id": "car-5",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 AT (Fleet Unit #4)",
        "registration_no": "GA-01-TOY-8966",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 AT",
        "category": "Luxury SUV"
    },
    {
        "id": "U-FD5DCB77-05",
        "vehicle_id": "car-5",
        "vendor_id": "vendor-1",
        "unit_name": "Toyota Fortuner 4x4 AT (Fleet Unit #5)",
        "registration_no": "GA-01-TOY-5937",
        "status": "Active",
        "vehicle_name": "Toyota Fortuner 4x4 AT",
        "category": "Luxury SUV"
    },
    {
        "id": "U-B5B4D98C-01",
        "vehicle_id": "car-6a945db651fa0",
        "vendor_id": "u-4",
        "unit_name": "DEFENDAR Unit 1",
        "registration_no": "GA-01-CAR-613",
        "status": "Active",
        "vehicle_name": "DEFENDAR",
        "category": "Hatchback"
    },
    {
        "id": "U-B5B4D98C-02",
        "vehicle_id": "car-6a945db651fa0",
        "vendor_id": "u-4",
        "unit_name": "DEFENDAR (Fleet Unit #2)",
        "registration_no": "GA-01-DEF-5190",
        "status": "Active",
        "vehicle_name": "DEFENDAR",
        "category": "Hatchback"
    },
    {
        "id": "U-B5B4D98C-03",
        "vehicle_id": "car-6a945db651fa0",
        "vendor_id": "u-4",
        "unit_name": "DEFENDAR (Fleet Unit #3)",
        "registration_no": "GA-01-DEF-7971",
        "status": "Active",
        "vehicle_name": "DEFENDAR",
        "category": "Hatchback"
    },
    {
        "id": "U-B5B4D98C-04",
        "vehicle_id": "car-6a945db651fa0",
        "vendor_id": "u-4",
        "unit_name": "DEFENDAR (Fleet Unit #4)",
        "registration_no": "GA-01-DEF-3069",
        "status": "Active",
        "vehicle_name": "DEFENDAR",
        "category": "Hatchback"
    },
    {
        "id": "U-B5B4D98C-05",
        "vehicle_id": "car-6a945db651fa0",
        "vendor_id": "u-4",
        "unit_name": "DEFENDAR (Fleet Unit #5)",
        "registration_no": "GA-01-DEF-7845",
        "status": "Active",
        "vehicle_name": "DEFENDAR",
        "category": "Hatchback"
    },
    {
        "id": "U-EF9C028C-01",
        "vehicle_id": "car-6a945e0c3ffbc",
        "vendor_id": "u-4",
        "unit_name": "swift Unit 1",
        "registration_no": "GA-01-CAR-405",
        "status": "Active",
        "vehicle_name": "swift",
        "category": "Hatchback"
    },
    {
        "id": "U-EF9C028C-02",
        "vehicle_id": "car-6a945e0c3ffbc",
        "vendor_id": "u-4",
        "unit_name": "swift (Fleet Unit #2)",
        "registration_no": "GA-01-SWI-8437",
        "status": "Active",
        "vehicle_name": "swift",
        "category": "Hatchback"
    },
    {
        "id": "U-EF9C028C-03",
        "vehicle_id": "car-6a945e0c3ffbc",
        "vendor_id": "u-4",
        "unit_name": "swift (Fleet Unit #3)",
        "registration_no": "GA-01-SWI-5695",
        "status": "Active",
        "vehicle_name": "swift",
        "category": "Hatchback"
    },
    {
        "id": "U-EF9C028C-04",
        "vehicle_id": "car-6a945e0c3ffbc",
        "vendor_id": "u-4",
        "unit_name": "swift (Fleet Unit #4)",
        "registration_no": "GA-01-SWI-5559",
        "status": "Active",
        "vehicle_name": "swift",
        "category": "Hatchback"
    },
    {
        "id": "U-EF9C028C-05",
        "vehicle_id": "car-6a945e0c3ffbc",
        "vendor_id": "u-4",
        "unit_name": "swift (Fleet Unit #5)",
        "registration_no": "GA-01-SWI-8995",
        "status": "Active",
        "vehicle_name": "swift",
        "category": "Hatchback"
    },
    {
        "id": "U-6A9BEB-01",
        "vehicle_id": "car-6a9beb7db0b38",
        "vendor_id": "u-4",
        "unit_name": "dcdssdd Unit 1",
        "registration_no": "GA-01-DCD-1001",
        "status": "Active",
        "vehicle_name": "dcdssdd",
        "category": "Hatchback"
    }
];
