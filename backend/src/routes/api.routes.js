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
router.get('/bookings/:id', requireAuth, bookingController.getBookingById);
router.post('/bookings/verify-payment', requireAuth, requireRole(['hotel_vendor', 'transfer_vendor', 'tour_vendor', 'admin', 'superadmin']), bookingController.verifyPayment);
router.post('/bookings/:id/cancel', requireAuth, requireRole(['hotel_vendor', 'transfer_vendor', 'tour_vendor', 'admin', 'superadmin']), bookingController.cancelBooking);

// Hotel PMS (Hotel Vendor, Admin, SuperAdmin)
router.get('/pms/dashboard', requireAuth, requireRole(['hotel_vendor', 'admin', 'superadmin']), pmsController.getPMSDashboard);
router.get('/pms/room-types', requireAuth, requireRole(['hotel_vendor', 'admin', 'superadmin']), pmsController.getRoomTypes);
router.get('/pms/calendar', requireAuth, requireRole(['hotel_vendor', 'admin', 'superadmin']), pmsController.getAvailabilityCalendar);

// Driver Portal (Driver, Admin, SuperAdmin)
router.get('/drivers/jobs', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverController.getDriverJobs);
router.put('/drivers/jobs/:id', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverController.updateJobStatus);

// B2B Agent Portal (B2B Agent, Admin, SuperAdmin)
router.get('/b2b/dashboard', requireAuth, requireRole(['b2b_agent', 'admin', 'superadmin']), b2bController.getB2BDashboard);

// Wallets
router.get('/wallets/:vendorId', requireAuth, requireRole(['hotel_vendor', 'transfer_vendor', 'b2b_agent', 'admin', 'superadmin']), walletController.getVendorWallet);
router.post('/wallets/top-up', requireAuth, requireRole(['admin', 'superadmin']), walletController.topUpWallet);

export default router;
