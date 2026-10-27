-- ========================================================================
-- WOW THAILAND: Seed Data Migration 001
-- Verified Baseline Thailand Catalog (is_demo = TRUE)
-- ========================================================================

-- Default Admin & Vendor Users (bcrypt hashed password: 'Password@123')
-- Hash: $2b$12$K8K4vQ9L3e3xS8C9wY6m8O1X0z1Y2A3B4C5D6E7F8G9H0I1J2K3L4
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `phone`, `status`) VALUES
('usr-admin-01', 'admin', 'admin@wowthailand.com', '$2b$12$eDxvWq5s3IqF5Yv6m9Lw5e8M1n2O3P4Q5R6S7T8U9V0W1X2Y3Z4a.', 'superadmin', '+66 81 234 5678', 'active'),
('usr-vendor-phuket', 'phuket_resorts', 'phuket@resorts.co.th', '$2b$12$eDxvWq5s3IqF5Yv6m9Lw5e8M1n2O3P4Q5R6S7T8U9V0W1X2Y3Z4a.', 'hotel_vendor', '+66 82 345 6789', 'active'),
('usr-driver-somchai', 'somchai_transfers', 'somchai@bkkcabs.th', '$2b$12$eDxvWq5s3IqF5Yv6m9Lw5e8M1n2O3P4Q5R6S7T8U9V0W1X2Y3Z4a.', 'driver', '+66 83 456 7890', 'active');

INSERT IGNORE INTO `vendors` (`id`, `user_id`, `business_name`, `contact_person`, `contact_phone`, `commission_rate`, `verification_status`) VALUES
('vnd-phuket-01', 'usr-vendor-phuket', 'Andaman Luxury Hotels Group', 'Somkiat Prasert', '+66 82 345 6789', 10.00, 'verified');

INSERT IGNORE INTO `drivers` (`id`, `user_id`, `full_name`, `phone`, `license_number`, `vehicle_model`, `vehicle_plate`, `status`, `current_location`) VALUES
('drv-bkk-01', 'usr-driver-somchai', 'Somchai Jaidee', '+66 83 456 7890', 'TH-DL-987234', 'Toyota Commuter VIP', '1กข 4589', 'available', 'Suvarnabhumi Airport Terminal 1');

INSERT IGNORE INTO `vendor_wallets` (`id`, `vendor_id`, `balance_thb`, `hold_amount_thb`, `minimum_balance_thb`, `negative_booking_count`, `max_negative_bookings`) VALUES
('wal-phuket-01', 'vnd-phuket-01', 5000.00, 0.00, 1000.00, 0, 2);

-- HOTELS
INSERT IGNORE INTO `hotels` (`id`, `vendor_id`, `name`, `city`, `area`, `star_rating`, `address`, `amenities_json`, `images_json`, `featured`, `is_published`, `is_demo`) VALUES
('th-htl-01', 'vnd-phuket-01', 'The Shore at Katathani', 'Phuket', 'Kata Noi Beach', 5, '14 Kata Noi Rd, Karon, Mueang Phuket District, Phuket 83100', 
 '["Private Pool", "Beachfront Access", "Free Airport Transfer", "Luxury Spa", "Free High-Speed WiFi", "Sunset Cocktail Lounge"]', 
 '["/assets/hotels/phuket_shore_1.jpg", "/assets/hotels/phuket_shore_2.jpg"]', 
 1, 1, 1),
('th-htl-02', 'vnd-phuket-01', 'Banyan Tree Bangkok', 'Bangkok', 'Sathorn / Silom', 5, '21/100 S Sathon Rd, Thung Maha Mek, Sathon, Bangkok 10120', 
 '["Rooftop Vertigo Bar", "City Skyline View", "World-Class Spa", "Fine Dining", "Concierge Service", "Pool"]', 
 '["/assets/hotels/bkk_banyan_1.jpg"]', 
 1, 1, 1),
('th-htl-03', 'vnd-phuket-01', 'Rayavadee Resort', 'Krabi', 'Railay Beach', 5, '214 Moo 2, Tambon Ao-Nang, Amphoe Mueang, Krabi 81000', 
 '["Limestone Cliff Surroundings", "Speedboat Arrival", "Beachfront Dining", "Private Pavilion", "Kayaking", "Luxury Spa"]', 
 '["/assets/hotels/krabi_raya_1.jpg"]', 
 1, 1, 1),
('th-htl-04', 'vnd-phuket-01', 'Hilton Pattaya', 'Pattaya', 'Central Pattaya Beach', 5, '333/101 Moo 9 Nongprue Banglamung, Pattaya 20260', 
 '["Ocean View Balcony", "Rooftop Infinity Pool", "Direct Mall Access", "Executive Lounge", "Fitness Center"]', 
 '["/assets/hotels/pattaya_hilton_1.jpg"]', 
 1, 1, 1);

-- ROOM TYPES
INSERT IGNORE INTO `hotel_room_types` (`id`, `hotel_id`, `name`, `base_price_thb`, `max_adults`, `max_children`, `breakfast_included`, `total_rooms`) VALUES
('rm-phuket-01', 'th-htl-01', 'Seaview Pool Villa', 8500.00, 2, 1, 1, 10),
('rm-phuket-02', 'th-htl-01', 'Two-Bedroom Grand Oceanfront Villa', 14500.00, 4, 2, 1, 5),
('rm-bkk-01', 'th-htl-02', 'Horizon Luxury King Suite', 5200.00, 2, 1, 1, 15),
('rm-bkk-02', 'th-htl-02', 'Oasis Club Suite with Sky Lounge Access', 7800.00, 2, 1, 1, 8),
('rm-krabi-01', 'th-htl-03', 'Deluxe Pavilion Among Coconut Palms', 9200.00, 2, 1, 1, 12),
('rm-pattaya-01', 'th-htl-04', 'King Ocean View Room', 4600.00, 2, 1, 1, 20);

-- AIRPORT TRANSFER ROUTES
INSERT IGNORE INTO `transfer_routes` (`id`, `route_name`, `origin_type`, `origin_name`, `destination_name`, `estimated_minutes`, `is_demo`) VALUES
('trf-bkk-01', 'Suvarnabhumi Airport (BKK) ➔ Bangkok Central Hotels', 'AIRPORT', 'Suvarnabhumi Airport (BKK)', 'Bangkok City (Sukhumvit / Silom / Riverside)', 45, 1),
('trf-bkk-02', 'Suvarnabhumi Airport (BKK) ➔ Pattaya City / Jomtien', 'AIRPORT', 'Suvarnabhumi Airport (BKK)', 'Pattaya Beach Hotels', 90, 1),
('trf-dmk-01', 'Don Mueang Airport (DMK) ➔ Bangkok Central Hotels', 'AIRPORT', 'Don Mueang Airport (DMK)', 'Bangkok City Center', 40, 1),
('trf-hkt-01', 'Phuket Airport (HKT) ➔ Patong / Karon / Kata Beach', 'AIRPORT', 'Phuket International Airport (HKT)', 'Patong / Kata / Karon Resorts', 55, 1);

-- TRANSFER VEHICLE PRICING
INSERT IGNORE INTO `transfer_vehicle_pricing` (`id`, `route_id`, `vehicle_category`, `model_name`, `max_passengers`, `max_luggage`, `fare_thb`) VALUES
('veh-bkk-01-sedan', 'trf-bkk-01', 'SEDAN', 'Toyota Camry / Altis', 3, 2, 850.00),
('veh-bkk-01-suv', 'trf-bkk-01', 'SUV', 'Toyota Fortuner Luxury', 4, 4, 1250.00),
('veh-bkk-01-van', 'trf-bkk-01', 'VIP_VAN', 'Toyota Commuter VIP 9-Seater', 9, 8, 1750.00),
('veh-bkk-02-sedan', 'trf-bkk-02', 'SEDAN', 'Toyota Camry / Altis', 3, 2, 1500.00),
('veh-bkk-02-van', 'trf-bkk-02', 'VIP_VAN', 'Toyota Commuter VIP 9-Seater', 9, 8, 2400.00),
('veh-hkt-01-sedan', 'trf-hkt-01', 'SEDAN', 'Toyota Altis', 3, 2, 800.00),
('veh-hkt-01-suv', 'trf-hkt-01', 'SUV', 'Toyota Fortuner', 4, 4, 1100.00),
('veh-hkt-01-van', 'trf-hkt-01', 'VIP_VAN', 'Toyota Commuter VIP', 9, 8, 1600.00);

-- SIGHTSEEING TOURS
INSERT IGNORE INTO `tours` (`id`, `title`, `city`, `duration_text`, `price_adult_thb`, `price_child_thb`, `inclusions_json`, `itinerary_json`, `is_demo`) VALUES
('tour-phi-phi-01', 'Phi Phi Islands & Maya Bay VIP Speedboat Excursion', 'Phuket', 'Full Day (08:00 - 17:00)', 2400.00, 1700.00, 
 '["Hotel Pickup & Drop-off Included", "Speedboat with Captain & Crew", "Buffet Lunch at Phi Phi Don", "Snorkeling Equipment & Life Jackets", "National Park Fee Options"]',
 '["08:00 Hotel Pickup", "09:30 Arrive at Maya Bay (The Beach)", "11:30 Swim in Pileh Emerald Lagoon", "12:30 Buffet Lunch", "14:30 Monkey Beach & Bamboo Island", "17:00 Return to Pier"]',
 1),
('tour-james-bond-01', 'James Bond Island & Phang Nga Bay Sea Canoe Tour', 'Phuket', 'Full Day (08:30 - 17:30)', 2200.00, 1500.00,
 '["Hotel Transfers", "Canoeing through Limestone Sea Caves", "Koh Panyee Floating Village Lunch", "James Bond Island Sightseeing"]',
 '["08:30 Hotel Departure", "10:00 Phang Nga Bay Caves", "12:00 Koh Panyee Village Lunch", "14:00 James Bond Rock Photo Stop", "17:30 Hotel Return"]',
 1),
('tour-bangkok-cruise-01', 'Chao Phraya Princess Luxury Dinner Cruise', 'Bangkok', 'Evening (19:30 - 21:30)', 1400.00, 1000.00,
 '["International & Thai Gourmet Buffet", "Live Saxophone Band", "Welcome Drink", "Views of Wat Arun & Grand Palace Illuminated at Night"]',
 '["19:00 Check-in at Asiatique / Iconsiam Pier", "19:30 Cruise Departure", "20:00 Dinner Buffet & Live Music", "21:30 Dock Return"]',
 1);

-- ACTIVITIES & EXPERIENCES
INSERT IGNORE INTO `activities` (`id`, `title`, `category`, `price_thb`, `time_slots_json`, `is_demo`) VALUES
('act-elephant-01', 'Phuket Ethical Elephant Jungle Sanctuary Half-Day', 'ADVENTURE', 2500.00, '["08:00 - 12:00", "13:00 - 17:00"]', 1),
('act-scuba-01', 'Racha Yai Island Discover Scuba Diving (No License Required)', 'WATER_SPORTS', 3800.00, '["07:30 - 16:30"]', 1),
('act-muay-thai-01', 'Bangkok Rajadamnern Muay Thai Stadium VIP Ringside Pass', 'SHOW', 2200.00, '["18:00 Match Start", "19:00 Match Start"]', 1);

-- SITE CONFIGURATION
INSERT IGNORE INTO `site_configs` (`id`, `site_name`, `base_currency`, `max_negative_bookings`, `platform_fee_percent`, `hero_title`, `hero_subtitle`) VALUES
('cfg-default', 'WOW THAILAND', 'THB', 2, 10.00, 'WOW THAILAND', 'LUXURY HOLIDAYS, TRANSFERS & ISLAND EXCURSIONS');
