-- ========================================================================
-- WOW THAILAND: Premium Cab & Airport Transfer System Migrations
-- Idempotent, transaction-safe schema for dispatches, tracking & pricing
-- ========================================================================

-- 1. Transfer Tier Distance & Base Pricing Rules
CREATE TABLE IF NOT EXISTS transfer_tier_pricing (
  id VARCHAR(50) PRIMARY KEY,
  vehicle_category ENUM('SEDAN', 'SUV', 'VIP_VAN') NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  base_fare_thb DECIMAL(10,2) NOT NULL,
  per_km_rate_thb DECIMAL(10,2) NOT NULL,
  minimum_fare_thb DECIMAL(10,2) NOT NULL,
  max_passengers INT NOT NULL DEFAULT 4,
  max_luggage INT NOT NULL DEFAULT 2,
  image_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default pricing tiers if empty
INSERT INTO transfer_tier_pricing (id, vehicle_category, display_name, base_fare_thb, per_km_rate_thb, minimum_fare_thb, max_passengers, max_luggage, image_url)
VALUES 
  ('tier-sedan', 'SEDAN', 'Standard Executive Sedan', 300.00, 15.00, 350.00, 3, 2, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80'),
  ('tier-suv', 'SUV', 'Premium Luxury SUV', 500.00, 25.00, 600.00, 4, 4, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'),
  ('tier-vip-van', 'VIP_VAN', 'VIP Commuter 9-Seater Van', 800.00, 35.00, 1000.00, 9, 8, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80')
ON DUPLICATE KEY UPDATE 
  base_fare_thb = VALUES(base_fare_thb),
  per_km_rate_thb = VALUES(per_km_rate_thb),
  minimum_fare_thb = VALUES(minimum_fare_thb);

-- 2. Taxi Dispatches (Authoritative Transfer Ride Entity)
CREATE TABLE IF NOT EXISTS taxi_dispatches (
  id VARCHAR(50) PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  driver_id VARCHAR(50) DEFAULT NULL,
  vendor_id VARCHAR(50) DEFAULT NULL,
  route_id VARCHAR(50) DEFAULT NULL,
  transfer_type VARCHAR(50) NOT NULL DEFAULT 'POINT_TO_POINT',
  pickup_address VARCHAR(255) NOT NULL,
  dropoff_address VARCHAR(255) NOT NULL,
  pickup_lat DECIMAL(10,7) DEFAULT NULL,
  pickup_lng DECIMAL(10,7) DEFAULT NULL,
  dropoff_lat DECIMAL(10,7) DEFAULT NULL,
  dropoff_lng DECIMAL(10,7) DEFAULT NULL,
  pickup_datetime DATETIME NOT NULL,
  passenger_count INT NOT NULL DEFAULT 1,
  luggage_count INT NOT NULL DEFAULT 0,
  vehicle_category ENUM('SEDAN', 'SUV', 'VIP_VAN') NOT NULL DEFAULT 'SEDAN',
  vehicle_model VARCHAR(100) DEFAULT NULL,
  vehicle_plate VARCHAR(50) DEFAULT NULL,
  distance_km DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  estimated_minutes INT NOT NULL DEFAULT 30,
  base_fare_thb DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  toll_fee_thb DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_fare_thb DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ride_status ENUM('ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ALLOCATED',
  ride_otp_hash VARCHAR(64) DEFAULT NULL,
  otp_expires_at DATETIME DEFAULT NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  otp_verified_at DATETIME DEFAULT NULL,
  cancellation_reason VARCHAR(255) DEFAULT NULL,
  cancelled_by VARCHAR(50) DEFAULT NULL,
  idempotency_key VARCHAR(100) DEFAULT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dispatches_booking (booking_id),
  INDEX idx_dispatches_driver (driver_id),
  INDEX idx_dispatches_vendor (vendor_id),
  INDEX idx_dispatches_status (ride_status),
  INDEX idx_dispatches_pickup_time (pickup_datetime),
  CONSTRAINT fk_dispatches_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispatches_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_dispatches_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_dispatches_route FOREIGN KEY (route_id) REFERENCES transfer_routes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Taxi Dispatch Events (Audit Log of State Machine Transitions)
CREATE TABLE IF NOT EXISTS taxi_dispatch_events (
  id VARCHAR(50) PRIMARY KEY,
  dispatch_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  old_status VARCHAR(30) DEFAULT NULL,
  new_status VARCHAR(30) NOT NULL,
  actor_type VARCHAR(30) NOT NULL,
  actor_id VARCHAR(50) DEFAULT NULL,
  metadata_json JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_dispatch (dispatch_id),
  CONSTRAINT fk_events_dispatch FOREIGN KEY (dispatch_id) REFERENCES taxi_dispatches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Taxi Driver Locations (Live Telemetry & Tracking Trail)
CREATE TABLE IF NOT EXISTS taxi_driver_locations (
  id VARCHAR(50) PRIMARY KEY,
  driver_id VARCHAR(50) NOT NULL,
  dispatch_id VARCHAR(50) DEFAULT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  heading DECIMAL(6,2) DEFAULT NULL,
  speed DECIMAL(6,2) DEFAULT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_locations_driver (driver_id),
  INDEX idx_locations_dispatch (dispatch_id),
  INDEX idx_locations_time (recorded_at),
  CONSTRAINT fk_locations_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_locations_dispatch FOREIGN KEY (dispatch_id) REFERENCES taxi_dispatches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Taxi Payment Transactions (Reconciliation for Cash, PromptPay QR, & Cards)
CREATE TABLE IF NOT EXISTS taxi_payment_transactions (
  id VARCHAR(50) PRIMARY KEY,
  dispatch_id VARCHAR(50) NOT NULL,
  booking_id VARCHAR(50) NOT NULL,
  amount_thb DECIMAL(12,2) NOT NULL,
  payment_method ENUM('CASH_TO_DRIVER', 'PROMPTPAY_QR', 'CARD') NOT NULL,
  payment_status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  collected_by_driver_id VARCHAR(50) DEFAULT NULL,
  verified_by_user_id VARCHAR(50) DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  gateway_ref VARCHAR(150) DEFAULT NULL,
  idempotency_key VARCHAR(100) DEFAULT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_dispatch (dispatch_id),
  INDEX idx_payments_booking (booking_id),
  INDEX idx_payments_status (payment_status),
  CONSTRAINT fk_tx_dispatch FOREIGN KEY (dispatch_id) REFERENCES taxi_dispatches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_driver FOREIGN KEY (collected_by_driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

