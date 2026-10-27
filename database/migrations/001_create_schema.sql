-- ========================================================================
-- WOW THAILAND: Database Schema Migration 001
-- Target Database: wow_thailand (MySQL 8.0 / InnoDB)
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- ========================================================================

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer','admin','superadmin','subadmin','hotel_vendor','driver','b2b_agent') NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(30) NULL,
  `date_of_birth` DATE NULL,
  `status` ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. VENDORS (Hotel & Fleet Partners)
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL,
  `business_name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(150) NULL,
  `contact_phone` VARCHAR(30) NULL,
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `verification_status` ENUM('verified','pending','rejected') NOT NULL DEFAULT 'verified',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. DRIVERS (Airport Pick & Drop)
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `license_number` VARCHAR(100) NOT NULL,
  `vehicle_model` VARCHAR(100) NULL,
  `vehicle_plate` VARCHAR(50) NULL,
  `status` ENUM('available','on_trip','offline') NOT NULL DEFAULT 'available',
  `current_location` VARCHAR(150) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. HOTELS & LUXURY RESORTS
CREATE TABLE IF NOT EXISTS `hotels` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `vendor_id` VARCHAR(50) NULL,
  `name` VARCHAR(255) NOT NULL,
  `city` ENUM('Bangkok','Phuket','Pattaya','Krabi','Koh Samui','Chiang Mai') NOT NULL,
  `area` VARCHAR(150) NULL,
  `star_rating` TINYINT NOT NULL DEFAULT 4,
  `address` TEXT NULL,
  `amenities_json` JSON NULL,
  `images_json` JSON NULL,
  `featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_published` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_demo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_hotels_city` (`city`),
  INDEX `idx_hotels_published` (`is_published`),
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. HOTEL ROOM TYPES
CREATE TABLE IF NOT EXISTS `hotel_room_types` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `hotel_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `base_price_thb` DECIMAL(12,2) NOT NULL,
  `max_adults` TINYINT NOT NULL DEFAULT 2,
  `max_children` TINYINT NOT NULL DEFAULT 1,
  `breakfast_included` BOOLEAN NOT NULL DEFAULT TRUE,
  `total_rooms` INT NOT NULL DEFAULT 10,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. HOTEL ROOM AVAILABILITY (Multi-night transactional calendar)
CREATE TABLE IF NOT EXISTS `hotel_room_availability` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `room_type_id` VARCHAR(50) NOT NULL,
  `calendar_date` DATE NOT NULL,
  `available_rooms` INT NOT NULL DEFAULT 10,
  `price_override_thb` DECIMAL(12,2) NULL,
  `is_blackout` BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY `uniq_room_date` (`room_type_id`, `calendar_date`),
  INDEX `idx_avail_date` (`calendar_date`),
  FOREIGN KEY (`room_type_id`) REFERENCES `hotel_room_types`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TRANSFER ROUTES & VEHICLES
CREATE TABLE IF NOT EXISTS `transfer_routes` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `route_name` VARCHAR(255) NOT NULL,
  `origin_type` ENUM('AIRPORT','HOTEL','PIER') NOT NULL,
  `origin_name` VARCHAR(150) NOT NULL,
  `destination_name` VARCHAR(150) NOT NULL,
  `estimated_minutes` INT NOT NULL DEFAULT 60,
  `is_demo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfer_vehicle_pricing` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `route_id` VARCHAR(50) NOT NULL,
  `vehicle_category` ENUM('SEDAN','SUV','VIP_VAN') NOT NULL,
  `model_name` VARCHAR(100) NOT NULL,
  `max_passengers` TINYINT NOT NULL,
  `max_luggage` TINYINT NOT NULL,
  `fare_thb` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`route_id`) REFERENCES `transfer_routes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SIGHTSEEING TOURS & ACTIVITIES
CREATE TABLE IF NOT EXISTS `tours` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `duration_text` VARCHAR(100) NOT NULL,
  `price_adult_thb` DECIMAL(12,2) NOT NULL,
  `price_child_thb` DECIMAL(12,2) NOT NULL,
  `inclusions_json` JSON NULL,
  `itinerary_json` JSON NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activities` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` ENUM('WATER_SPORTS','THEME_PARK','CRUISE','SHOW','ADVENTURE') NOT NULL,
  `price_thb` DECIMAL(12,2) NOT NULL,
  `time_slots_json` JSON NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. UNIFIED BOOKINGS (With currency snapshots and verification status)
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `idempotency_key` VARCHAR(100) UNIQUE NULL,
  `user_id` VARCHAR(50) NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(30) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `vendor_id` VARCHAR(50) NULL,
  `base_amount_thb` DECIMAL(12,2) NOT NULL,
  `platform_fee_thb` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `customer_currency` CHAR(3) NOT NULL DEFAULT 'THB',
  `exchange_rate_applied` DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
  `customer_total_amount` DECIMAL(12,2) NOT NULL,
  `payment_currency` CHAR(3) NOT NULL DEFAULT 'THB',
  `payment_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PENDING','PAID','REJECTED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `payment_verification_status` ENUM('Unverified','Verified','Rejected') NOT NULL DEFAULT 'Unverified',
  `wallet_deduction_status` ENUM('Pending','Completed','Failed') NOT NULL DEFAULT 'Pending',
  `booking_status` ENUM('Awaiting Payment','Confirmed','Cancelled','Completed') NOT NULL DEFAULT 'Awaiting Payment',
  `special_requests` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_bkg_status` (`booking_status`),
  INDEX `idx_bkg_dates` (`start_date`, `end_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booking_id` VARCHAR(50) NOT NULL,
  `item_type` ENUM('HOTEL','TRANSFER','TOUR','ACTIVITY') NOT NULL,
  `reference_id` VARCHAR(50) NOT NULL,
  `unit_price_thb` DECIMAL(12,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `subtotal_thb` DECIMAL(12,2) NOT NULL,
  `details_json` JSON NULL,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `driver_assignments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booking_id` VARCHAR(50) NOT NULL,
  `driver_id` VARCHAR(50) NOT NULL,
  `flight_number` VARCHAR(50) NULL,
  `pickup_time` DATETIME NOT NULL,
  `status` ENUM('ASSIGNED','ACCEPTED','ON_WAY','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booking_id` VARCHAR(50) NOT NULL,
  `idempotency_key` VARCHAR(100) UNIQUE NULL,
  `payment_method` ENUM('GATEWAY','CASH_ON_ARRIVAL','WALLET','BANK_TRANSFER') NOT NULL,
  `gateway_reference` VARCHAR(150) NULL,
  `amount_charged` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'THB',
  `status` ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `verified_by_user_id` VARCHAR(50) NULL,
  `verified_at` TIMESTAMP NULL,
  `raw_gateway_payload` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booking_id` VARCHAR(50) NOT NULL UNIQUE,
  `voucher_code` VARCHAR(50) NOT NULL UNIQUE,
  `qr_payload` TEXT NOT NULL,
  `dispatched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. CONTROLLED NEGATIVE WALLETS & IMMUTABLE AUDIT LEDGER
CREATE TABLE IF NOT EXISTS `vendor_wallets` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `vendor_id` VARCHAR(50) NOT NULL UNIQUE,
  `balance_thb` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `hold_amount_thb` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `minimum_balance_thb` DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
  `negative_booking_count` INT NOT NULL DEFAULT 0,
  `max_negative_bookings` INT NOT NULL DEFAULT 2,
  `is_frozen` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `wallet_id` VARCHAR(50) NOT NULL,
  `vendor_id` VARCHAR(50) NOT NULL,
  `amount_thb` DECIMAL(12,2) NOT NULL,
  `type` ENUM('credit','debit','hold','release') NOT NULL,
  `reference_id` VARCHAR(50) NOT NULL,
  `balance_before_thb` DECIMAL(12,2) NOT NULL,
  `balance_after_thb` DECIMAL(12,2) NOT NULL,
  `status` ENUM('Pending','Completed','Failed') NOT NULL DEFAULT 'Completed',
  `description` VARCHAR(255) NOT NULL,
  `admin_id` VARCHAR(50) NOT NULL DEFAULT 'system',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wtx_wallet` (`wallet_id`),
  INDEX `idx_wtx_vendor` (`vendor_id`),
  FOREIGN KEY (`wallet_id`) REFERENCES `vendor_wallets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. GLOBAL CONFIGURATION & SETTINGS
CREATE TABLE IF NOT EXISTS `site_configs` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `site_name` VARCHAR(100) NOT NULL DEFAULT 'WOW THAILAND',
  `base_currency` CHAR(3) NOT NULL DEFAULT 'THB',
  `max_negative_bookings` INT NOT NULL DEFAULT 2,
  `platform_fee_percent` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `hero_title` VARCHAR(150) NOT NULL DEFAULT 'WOW THAILAND',
  `hero_subtitle` VARCHAR(255) NOT NULL DEFAULT 'LUXURY HOLIDAYS & TRANSFERS',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
