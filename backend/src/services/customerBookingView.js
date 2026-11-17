// ========================================================================
// WOW THAILAND: Booking list view (customer, vendor and admin portals)
// A booking's details live in other tables (booking_items, taxi_dispatches, hotel tables).
// The portals need them on each booking row: what was booked, the price, the dates,
// the status, and for cab rides the car, driver and ride progress.
// ========================================================================

import { query } from '../config/db.js';
import { voucherAccessKey } from '../utils/voucherLink.js';

const placeholders = (n) => new Array(n).fill('?').join(',');

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

// Ride progress -> portal status
const RIDE_STATUS_TO_PORTAL = {
  ALLOCATED: 'Confirmed',
  DISPATCHED: 'Confirmed',
  ARRIVED: 'Ongoing',
  ON_TRIP: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// Booking status -> portal status
function portalStatusFromBooking(bookingStatus) {
  const s = String(bookingStatus || '').toLowerCase();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('complete')) return 'Completed';
  if (s.includes('reject')) return 'Rejected';
  if (s === 'confirmed') return 'Confirmed';
  return 'Pending';
}

// "14:05" -> "2:05 PM"
function twelveHour(hhmm) {
  const m = String(hhmm || '').match(/^(\d{2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Adds the fields the customer portal shows to each booking row (never removes or renames
 * existing columns). Bookings without linked details are returned as they are.
 */
export async function addPortalFields(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) return bookings;
  const ids = bookings.map(b => b.id).filter(Boolean);
  if (ids.length === 0) return bookings;

  const [items, dispatches, bookingDates] = await Promise.all([
    query(`SELECT * FROM booking_items WHERE booking_id IN (${placeholders(ids.length)})`, ids),
    query(
      `SELECT d.id, d.booking_id, d.ride_status, d.transfer_type, d.pickup_address, d.dropoff_address,
              DATE_FORMAT(d.pickup_datetime, '%Y-%m-%d') AS pickup_date_text,
              DATE_FORMAT(d.pickup_datetime, '%H:%i') AS pickup_time_text,
              d.passenger_count, d.luggage_count, d.vehicle_category, d.vehicle_model, d.vehicle_plate,
              d.driver_id, drv.full_name AS driver_name, drv.phone AS driver_phone,
              p.payment_method, p.payment_status AS ride_payment_status
       FROM taxi_dispatches d
       LEFT JOIN drivers drv ON drv.id = d.driver_id
       LEFT JOIN taxi_payment_transactions p ON p.dispatch_id = d.id
       WHERE d.booking_id IN (${placeholders(ids.length)})`,
      ids
    ),
    // Dates as plain text, so no timezone shifts on the way to the browser
    query(
      `SELECT id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_text, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_text
       FROM bookings WHERE id IN (${placeholders(ids.length)})`,
      ids
    )
  ]);

  // Hotel names for hotel room items
  const roomIds = [...new Set(items.filter(i => i.item_type === 'HOTEL' && i.reference_id).map(i => i.reference_id))];
  const rooms = roomIds.length
    ? await query(
        `SELECT rt.id, rt.hotel_id, rt.name AS room_name, h.name AS hotel_name, h.area, h.city
         FROM hotel_room_types rt LEFT JOIN hotels h ON h.id = rt.hotel_id
         WHERE rt.id IN (${placeholders(roomIds.length)})`,
        roomIds
      ).catch(() => [])
    : [];

  // Hotels booked without a room type (reference is the hotel itself)
  const hotelIds = [...new Set(items.filter(i => i.item_type === 'HOTEL').flatMap(i => {
    const d = parseJson(i.details_json);
    return [i.reference_id, d.hotel_id].filter(Boolean);
  }))];
  const hotels = hotelIds.length
    ? await query(`SELECT id, name, area, city FROM hotels WHERE id IN (${placeholders(hotelIds.length)})`, hotelIds).catch(() => [])
    : [];

  // Activity and tour names, for bookings whose details don't carry one
  const otherRefs = [...new Set(items.filter(i => i.item_type === 'ACTIVITY' || i.item_type === 'TOUR').map(i => i.reference_id).filter(Boolean))];
  const [activityRows, tourRows] = otherRefs.length
    ? await Promise.all([
        query(`SELECT id, title, location FROM activities WHERE id IN (${placeholders(otherRefs.length)})`, otherRefs).catch(() => []),
        query(`SELECT id, title, city FROM tours WHERE id IN (${placeholders(otherRefs.length)})`, otherRefs).catch(() => [])
      ])
    : [[], []];
  const activityById = new Map(activityRows.map(a => [a.id, a]));
  const tourById = new Map(tourRows.map(t => [t.id, t]));
  const hotelById = new Map(hotels.map(h => [h.id, h]));

  const itemsByBooking = new Map();
  items.forEach(i => {
    if (!itemsByBooking.has(i.booking_id)) itemsByBooking.set(i.booking_id, []);
    itemsByBooking.get(i.booking_id).push(i);
  });
  const dispatchByBooking = new Map(dispatches.map(d => [d.booking_id, d]));
  const roomById = new Map(rooms.map(r => [r.id, r]));
  const datesById = new Map(bookingDates.map(d => [d.id, d]));

  return bookings.map(b => {
    const dates = datesById.get(b.id) || {};
    const totalThb = Number(b.base_amount_thb) || Number(b.customer_total_amount) || 0;
    const paidThb = Number(b.payment_amount) || (String(b.payment_status).toUpperCase() === 'PAID' ? totalThb : 0);
    const common = {
      name: b.customer_name,
      phone: b.customer_phone,
      email: b.customer_email,
      total_amount: totalThb,
      // Most paid bookings never filled payment_amount; PAID means the full amount was paid
      total_paid: paidThb,
      amount_paid: paidThb,
      // For the voucher link the portals share (opens this booking without signing in)
      voucher_access_key: voucherAccessKey(b.id)
    };

    // Cab ride
    const ride = dispatchByBooking.get(b.id);
    if (ride) {
      const rideStatus = String(ride.ride_status || '').toUpperCase();
      return {
        ...b,
        ...common,
        type: 'car',
        item_name: `Cab transfer · ${ride.vehicle_model || ride.vehicle_category || 'Car'}`,
        vehicle_name: ride.vehicle_model || ride.vehicle_category,
        vehicle_category: ride.vehicle_category,
        vehicle_plate: ride.vehicle_plate,
        driver_required: 1,
        driver_service_type: ride.transfer_type === 'AIRPORT_PICKUP' ? 'Airport pickup' : 'Transfer with driver',
        assigned_driver_id: ride.driver_id || null,
        assigned_driver_name: ride.driver_name || null,
        assigned_driver_phone: ride.driver_phone || null,
        pickup_location: ride.pickup_address,
        drop_location: ride.dropoff_address,
        pickup_date: ride.pickup_date_text,
        pickup_time: twelveHour(ride.pickup_time_text),
        passengers: ride.passenger_count,
        bags: ride.luggage_count,
        dispatch_id: ride.id,
        ride_status: rideStatus,
        status: RIDE_STATUS_TO_PORTAL[rideStatus] || portalStatusFromBooking(b.booking_status),
        payment_note: ride.payment_method === 'CASH_TO_DRIVER' && ride.ride_payment_status !== 'PAID'
          ? 'Pay driver in cash'
          : null
      };
    }

    const bookingItems = itemsByBooking.get(b.id) || [];
    const first = bookingItems[0];
    if (!first) return { ...b, ...common, status: portalStatusFromBooking(b.booking_status) };

    const details = parseJson(first.details_json);
    const booked = bookedFields(details);

    // Hotel stay
    if (first.item_type === 'HOTEL') {
      const room = roomById.get(first.reference_id);
      const hotel = room
        ? { name: room.hotel_name, area: room.area, city: room.city }
        : (hotelById.get(first.reference_id) || hotelById.get(details.hotel_id) || {});
      const hotelName = hotel.name || details.hotel_name || details.item_name || 'Hotel stay';
      const location = [hotel.area, hotel.city].filter(Boolean).join(', ');
      return {
        ...b,
        ...common,
        ...booked,
        type: 'hotel',
        hotel_id: room?.hotel_id || details.hotel_id || (room ? null : first.reference_id) || null,
        room_type_id: room ? first.reference_id : (details.room_type_id || null),
        hotel_name: hotelName,
        item_name: hotelName,
        room_type: room?.room_name || details.room_type || null,
        rooms: Number(first.quantity) || 1,
        hotel_location: location || null,
        location: location || null,
        pickup_date: dates.start_text || null,
        drop_date: dates.end_text || null,
        check_in: dates.start_text || null,
        check_out: dates.end_text || null,
        status: portalStatusFromBooking(b.booking_status)
      };
    }

    // Activities, sightseeing tours, packages, car rentals, B2B bookings, …
    const activity = activityById.get(first.reference_id);
    const tour = tourById.get(first.reference_id);
    const type = viewTypeFor(first, details, Boolean(tour));
    const transferName = first.item_type === 'TRANSFER' && booked.vehicle_name ? `Cab transfer · ${booked.vehicle_name}` : null;
    const name = details.item_name || details.package_name || details.title || details.name || details.activity_name
      || activity?.title || tour?.title || transferName || DEFAULT_NAMES[first.item_type] || 'Booking';
    return {
      ...b,
      ...common,
      ...booked,
      type,
      item_id: first.reference_id,
      item_name: name,
      package_type: details.package_type || (type === 'sightseeing' ? 'Sightseeing' : type === 'activity' ? 'Activity' : undefined),
      location: activity?.location || tour?.city || booked.pickup_location || null,
      pickup_date: dates.start_text || null,
      drop_date: dates.end_text && dates.end_text !== dates.start_text ? dates.end_text : null,
      status: portalStatusFromBooking(b.booking_status)
    };
  });
}

const DEFAULT_NAMES = { ACTIVITY: 'Activity', TOUR: 'Tour package', TRANSFER: 'Transfer', HOTEL: 'Hotel stay' };
const KNOWN_VIEW_TYPES = new Set(['activity', 'sightseeing', 'package', 'selfdrive', 'car', 'bike', 'hotel', 'flight']);

// The type the portals group bookings by (hotel / car / activity / sightseeing / package …)
function viewTypeFor(item, details, isTour) {
  if (isTour) return 'sightseeing'; // tours are sold on the Sightseeing & Activities page
  const sent = String(details.type || '').toLowerCase();
  if (KNOWN_VIEW_TYPES.has(sent)) return sent;
  if (item.item_type === 'ACTIVITY') return 'activity';
  if (item.item_type === 'TRANSFER') return 'car';
  return 'package';
}

// Booking details the checkout sent (see DETAIL_FIELDS in bookingService.js), under the
// names the portals read. Only fields that were sent are added.
function bookedFields(d) {
  const out = {};
  const put = (key, value) => { if (value !== undefined && value !== null && value !== '') out[key] = value; };
  put('package_name', d.package_name);
  // Older cab bookings store these as vehicle / model_name / pickup(_address) / drop / dropoff_address
  put('vehicle_name', d.vehicle_name || d.vehicle || d.model_name || d.vehicle_category);
  put('vehicle_image', d.vehicle_image);
  put('pickup_location', d.pickup_location || d.pickup_loc || d.pickup_address || d.pickup);
  put('pickup_time', d.pickup_time);
  put('drop_location', d.drop_location || d.drop_loc || d.dropoff_address || d.drop);
  put('drop_time', d.drop_time);
  put('duration', d.duration);
  put('booking_days', d.booking_days);
  // Older activity bookings only had the guest count inside notes ("Guests: 3 | …")
  put('total_members', d.total_members || d.guests || (String(d.notes || '').match(/Guests:\s*(\d+)/) || [])[1]);
  put('adults', d.adults);
  put('children', d.children);
  put('meal_plan', d.meal_plan);
  put('payment_method', d.payment_method);
  put('payment_reference', d.payment_reference);
  put('customizations', d.customizations);
  put('activities', d.activities || d.selected_activities);
  put('traveller_details_json', d.traveller_details_json);
  put('price_breakdown_json', d.price_breakdown_json);
  put('driver_required', d.driver_required);
  put('driver_service_type', d.driver_service_type);
  put('driver_charge', d.driver_charge);
  put('assigned_room_no', d.assigned_room_no);
  put('checkin_status', d.checkin_status);
  put('b2b_mode', d.b2b_mode);
  return out;
}
