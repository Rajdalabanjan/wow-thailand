// ========================================================================
// WOW THAILAND: REST API Router (/api/v1)
// ========================================================================

import { Router } from 'express';
import * as hotelController from '../controllers/hotelController.js';
import * as transferController from '../controllers/transferController.js';
import * as tourController from '../controllers/tourController.js';
import * as bookingController from '../controllers/bookingController.js';
import * as authController from '../controllers/authController.js';
import * as pmsController from '../controllers/pmsController.js';
import * as driverController from '../controllers/driverController.js';
import * as b2bController from '../controllers/b2bController.js';
import * as walletController from '../controllers/walletController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'WOW THAILAND API',
    database: 'MySQL 8.0',
    timestamp: new Date().toISOString()
  });
});

// Authentication
router.post('/auth/login', authController.login);

// Hotels & Rooms
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/:id', hotelController.getHotelById);

// Airport Transfers & Fleets
router.get('/transfers/routes', transferController.getTransferRoutes);
router.get('/transfers/vehicles', transferController.getVehiclesList);

// Tours & Activities
router.get('/tours', tourController.getAllTours);
router.get('/activities', tourController.getAllActivities);

// Bookings & Vouchers
router.post('/bookings', bookingController.createBooking);
router.get('/bookings/:id', bookingController.getBookingById);
router.post('/bookings/verify-payment', bookingController.verifyPayment);
router.post('/bookings/:id/cancel', bookingController.cancelBooking);

// Hotel PMS
router.get('/pms/dashboard', pmsController.getPMSDashboard);
router.get('/pms/room-types', pmsController.getRoomTypes);
router.get('/pms/calendar', pmsController.getAvailabilityCalendar);

// Driver Portal
router.get('/drivers/jobs', driverController.getDriverJobs);
router.put('/drivers/jobs/:id', driverController.updateJobStatus);

// B2B Agent Portal
router.get('/b2b/dashboard', b2bController.getB2BDashboard);

// Wallets
router.get('/wallets/:vendorId', walletController.getVendorWallet);
router.post('/wallets/top-up', walletController.topUpWallet);

export default router;
