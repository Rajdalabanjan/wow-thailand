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
import * as cabBookingController from '../controllers/cabBookingController.js';
import * as cabTrackingController from '../controllers/cabTrackingController.js';
import * as driverTripController from '../controllers/driverTripController.js';
import * as cabDispatchController from '../controllers/cabDispatchController.js';
import * as cabPaymentController from '../controllers/cabPaymentController.js';
import * as cabVehicleController from '../controllers/cabVehicleController.js';
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

// ========================================================================
// Premium Cab & Airport Transfer System Endpoints
// ========================================================================

// Customer Cab & Transfer Endpoints
router.post('/cabs/estimate', cabBookingController.estimateFare);
router.post('/cabs/book', cabBookingController.createCabBooking);
router.get('/cabs/track/:id', cabTrackingController.getTrackingDetails);
router.get('/cabs/history', requireAuth, cabBookingController.getCabHistory);
router.post('/cabs/cancel', requireAuth, cabBookingController.cancelCabBooking);

// Driver Chauffeur Companion Endpoints
router.get('/driver/active-duty', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.getActiveDuty);
router.get('/driver/duty-offers', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.getDutyOffers);
router.post('/driver/accept-duty', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.acceptDuty);
router.post('/driver/reject-duty', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.rejectDuty);
router.post('/driver/update-status', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.updateDutyStatus);
router.post('/driver/location', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.updateDriverLocation);
router.post('/driver/toggle-status', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.toggleDutyStatus);
router.get('/driver/summary', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.getDriverSummary);
router.get('/driver/trips', requireAuth, requireRole(['driver', 'admin', 'superadmin']), driverTripController.getDriverTripHistory);

// Admin & Vendor Dispatch Management Endpoints
router.get('/admin/cab-dispatches', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabDispatchController.getAdminDispatches);
router.post('/admin/cab-assign-driver', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabDispatchController.assignDriver);
router.put('/admin/cab-pricing', requireAuth, requireRole(['admin', 'superadmin']), cabDispatchController.updateCabPricing);

// Vendor Chauffeur Fleet Management Endpoints
router.get('/vendor/drivers', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), driverController.getVendorDrivers);
router.post('/vendor/drivers', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), driverController.createVendorDriver);
router.put('/vendor/drivers/:id', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), driverController.updateVendorDriver);
router.delete('/vendor/drivers/:id', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), driverController.deleteVendorDriver);

// Vendor Cab Fleet Vehicles & Assignment Endpoints
router.get('/vendor/fleet-vehicles', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.getVendorVehicles);
router.post('/vendor/fleet-vehicles', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.createVendorVehicle);
router.put('/vendor/fleet-vehicles/:id', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.updateVendorVehicle);
router.delete('/vendor/fleet-vehicles/:id', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.deleteVendorVehicle);
router.post('/vendor/fleet-vehicles/assign', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.assignVehicleToDriver);
router.post('/vendor/fleet-vehicles/unassign', requireAuth, requireRole(['admin', 'superadmin', 'transfer_vendor', 'vendor', 'cab_vendor', 'vehicle_vendor']), cabVehicleController.unassignVehicleFromDriver);

// Admin Global Fleet Verification Endpoints
router.get('/admin/fleet-vehicles', requireAuth, requireRole(['admin', 'superadmin']), cabVehicleController.getAdminFleetVehicles);
router.post('/admin/fleet-vehicles/:id/verify', requireAuth, requireRole(['admin', 'superadmin']), cabVehicleController.verifyAdminFleetVehicle);

// Chauffeur Active Vehicle Selection Endpoints
router.get('/driver/assigned-vehicles', requireAuth, requireRole(['driver', 'admin', 'superadmin']), cabVehicleController.getDriverVehicles);
router.post('/driver/select-vehicle', requireAuth, requireRole(['driver', 'admin', 'superadmin']), cabVehicleController.selectActiveVehicle);

// Transfer Payment Endpoints
router.post('/cabs/payment/record-cash', requireAuth, requireRole(['driver', 'admin', 'superadmin']), cabPaymentController.recordCashPayment);
router.post('/cabs/payment/verify-gateway', cabPaymentController.verifyGatewayPayment);

export default router;
