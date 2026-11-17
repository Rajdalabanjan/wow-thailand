// ========================================================================
// WOW THAILAND: Customer Cabs & Transfer Page (WOW GOA True 3-Column Experience)
// 3-Column Ola / Uber Split Layout:
// Left: "Get a ride" parameters, group size (passengers + bags) & rider contact
// Center: "Your ride" — the vehicle the system picks for the group, with fixed fare
// Right: Live Leaflet Interactive Map with real route trajectory
// Seamless in-place transition to Live Dispatch Radar with 4-digit Ride OTP!
// ========================================================================

import React, { useState, useEffect, useRef } from 'react';
import TempleMark from '../../components/common/TempleMark';
import { 
  Car, Calendar, Clock, MapPin, ArrowRight, X, Shield, 
  Sparkles, CheckCircle2, Phone, Check, CreditCard, Navigation, 
  ArrowUpDown, Users, Briefcase, ArrowLeft, MessageSquare, 
  Award, Plane, RefreshCw, KeyRound, Copy, AlertTriangle, ShieldCheck
} from 'lucide-react';
import LiveThailandCabMap from '../../components/cab/LiveThailandCabMap';
import ThailandLocationAutocomplete from '../../components/cab/ThailandLocationAutocomplete';
import CabRideHistoryDrawer from '../../components/cab/CabRideHistoryDrawer';
import { estimateCabFare, bookCabTransfer, trackCabRide, cancelCabRide } from '../../services/api';
import { connectLiveRooms } from '../../utils/liveSocket';

const COUNTRY_CODES = [
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' }
];

const pad2 = n => String(n).padStart(2, '0');
// Local (not UTC) date/time, so early-morning bookings don't get yesterday's date
const localDateString = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localTimeString = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const MAX_PASSENGERS_INPUT = 15;
const MAX_BAGS_INPUT = 20;
const DEFAULT_CHILD_SEAT_FEE_THB = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The ride in progress is kept in this browser, so a refresh or closed tab
// doesn't lose the driver details or the start code
const ACTIVE_RIDE_KEY = 'wow_active_cab_ride';
function saveActiveRide(ride) {
  try { localStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(ride)); } catch { /* storage unavailable */ }
}
function loadActiveRide() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_RIDE_KEY) || 'null'); } catch { return null; }
}
function clearActiveRide() {
  try { localStorage.removeItem(ACTIVE_RIDE_KEY); } catch { /* storage unavailable */ }
}

const RIDE_STATUS_LABEL = {
  ALLOCATED: 'Requested',
  REQUESTED: 'Requested',
  DISPATCHED: 'Chauffeur Dispatched',
  ASSIGNED: 'Chauffeur Dispatched',
  ARRIVED: 'Chauffeur Arrived',
  ON_TRIP: 'Trip In Progress',
  COMPLETED: 'Trip Completed',
  CANCELLED: 'Cancelled'
};
const FINISHED_RIDE_STATUSES = ['Trip Completed', 'Cancelled'];
const CHANNEL_LABEL = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'email' };

function joinWithAnd(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// − / + counter used for passengers and bags
function GroupStepper({ icon, label, value, min, max, onChange }) {
  const buttonStyle = disabled => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #CBD5E1',
    backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
    color: disabled ? '#94A3B8' : '#0B132B',
    fontWeight: 900,
    fontSize: '16px',
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          style={buttonStyle(value <= min)}
        >
          −
        </button>
        <span aria-live="polite" style={{ minWidth: '18px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          style={buttonStyle(value >= max)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Display details for each vehicle category (the server decides which one is sent)
const DEFAULT_TIERS = [
  {
    tier: 'SEDAN',
    name: 'Prime Sedan',
    models: 'Toyota Camry, Corolla Altis or similar',
    maxPax: 3,
    maxLuggage: 2,
    fareThb: 850,
    icon: '🚕',
    tagline: 'Comfortable executive ride for couples & solo travelers',
    popular: true
  },
  {
    tier: 'SUV',
    name: 'Executive SUV',
    models: 'Toyota Fortuner, Isuzu MU-X or similar',
    maxPax: 4,
    maxLuggage: 4,
    fareThb: 1250,
    icon: '🚙',
    tagline: 'High clearance & extra boot space for family luggage',
    popular: false
  },
  {
    tier: 'VIP_VAN',
    name: 'Royal VIP Van',
    models: 'Toyota Commuter VIP 9-Seater or similar',
    maxPax: 9,
    maxLuggage: 8,
    fareThb: 1750,
    icon: '🚐',
    tagline: 'Spacious commuter cabin with captain reclining seats',
    popular: false
  }
];

export default function ThailandCustomerCabsPage({
  currentUser = null,
  initialPickup = '',
  initialDropoff = '',
  initialDate = '',
  initialTime = '',
  onBack = null
}) {
  // Navigation & View State: 'booking' | 'confirmed'
  const [currentView, setCurrentView] = useState('booking');

  // Parameters
  const [pickupLocation, setPickupLocation] = useState(
    initialPickup || 'Suvarnabhumi Airport (BKK)'
  );
  const [dropoffLocation, setDropoffLocation] = useState(
    initialDropoff || 'Bangkok City (Sukhumvit / Silom / Riverside)'
  );

  const [pickupTimingMode, setPickupTimingMode] = useState('NOW'); // 'NOW' | 'SCHEDULE'
  const [pickupDate, setPickupDate] = useState(() => {
    return initialDate || localDateString(new Date());
  });
  const [pickupTime, setPickupTime] = useState(() => {
    return initialTime || localTimeString(new Date());
  });

  // Group size: the system picks the vehicle from these, the customer never chooses a car
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(1);

  // Rider Details
  const [riderType, setRiderType] = useState('self'); // 'self' | 'other'
  const [riderName, setRiderName] = useState(() => currentUser?.name || currentUser?.full_name || '');
  const [countryCode, setCountryCode] = useState('+66');
  const [riderPhone, setRiderPhone] = useState(() => currentUser?.phone || '');
  const [riderEmail, setRiderEmail] = useState(() => currentUser?.email || '');
  const [flightNumber, setFlightNumber] = useState('');

  // Extras (priced by the server)
  const [childSeat, setChildSeat] = useState(false);
  const [childSeatFee, setChildSeatFee] = useState(DEFAULT_CHILD_SEAT_FEE_THB);
  // Channels the server will really use for updates (from the estimate)
  const [updateChannels, setUpdateChannels] = useState([]);

  // Vehicle the system will send for this group (from the estimate)
  const [matchedRide, setMatchedRide] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const estimateRequestId = useRef(0);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'promptpay' | 'card'

  // Loading & Route Metrics
  const [isEstimating, setIsEstimating] = useState(false);
  const [distanceKm, setDistanceKm] = useState(30);
  const [durationMin, setDurationMin] = useState(45);

  // Active Confirmed Ride State
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [activeRide, setActiveRide] = useState(null);
  const [rideActionError, setRideActionError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  // A booked ride the customer stepped away from to book another one
  const [parkedRide, setParkedRide] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Poll Tracking in Confirmed Mode
  const pollIntervalRef = useRef(null);

  // Ask the server which vehicle fits this group and what it costs
  const fetchEstimates = async () => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) return;
    const requestId = ++estimateRequestId.current;
    setIsEstimating(true);
    try {
      const res = await estimateCabFare({
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        travelDate: pickupDate,
        travelTime: pickupTime,
        passenger_count: passengers,
        luggage_count: bags,
        currency: 'THB'
      });

      // Ignore replies to older requests (the customer changed something meanwhile)
      if (requestId !== estimateRequestId.current) return;

      if (res.success) {
        const rec = res.recommended;
        if (rec) {
          const base = DEFAULT_TIERS.find(d => d.tier === rec.tier) || DEFAULT_TIERS[0];
          setMatchedRide({
            ...base,
            fareThb: rec.fareThb ?? base.fareThb,
            models: rec.models || base.models,
            maxPax: rec.maxPax ?? base.maxPax,
            maxLuggage: rec.maxLuggage ?? base.maxLuggage,
            breakdown: rec.breakdown,
            available: rec.available !== false
          });
        } else {
          setMatchedRide(null);
        }
        setAvailabilityMessage(res.availabilityMessage || '');
        if (res.childSeatFeeThb) setChildSeatFee(res.childSeatFeeThb);
        setUpdateChannels(Array.isArray(res.updateChannels) ? res.updateChannels : []);
        setDistanceKm(res.distanceKm || 30);
        setDurationMin(res.durationMin || 45);
      } else {
        setMatchedRide(null);
        setAvailabilityMessage(res.error || 'Unable to price this ride right now. Please try again.');
      }
    } catch (e) {
      console.error('Estimate error:', e);
      if (requestId === estimateRequestId.current) {
        setMatchedRide(null);
        setAvailabilityMessage('Unable to price this ride right now. Please try again.');
      }
    } finally {
      if (requestId === estimateRequestId.current) setIsEstimating(false);
    }
  };

  useEffect(() => {
    // Short delay so typing an address or tapping +/- quickly sends one request, not many
    const timer = setTimeout(fetchEstimates, 250);
    return () => clearTimeout(timer);
  }, [pickupLocation, dropoffLocation, passengers, bags]);

  // Swap Locations
  const handleSwap = () => {
    const temp = pickupLocation;
    setPickupLocation(dropoffLocation);
    setDropoffLocation(temp);
  };

  // Total shown to the customer = fare of the matched vehicle + extras (server uses the same prices)
  const canBook = Boolean(matchedRide && matchedRide.available);
  const calculatedTotalFare = matchedRide ? matchedRide.fareThb + (childSeat ? childSeatFee : 0) : null;

  // Handle Request Chauffeur Ride
  const handleConfirmRide = async () => {
    setBookingError('');
    if (!canBook) {
      setBookingError(availabilityMessage || 'No vehicle is available for this group right now.');
      return;
    }
    if (!riderName.trim()) {
      setBookingError('Please enter passenger full name.');
      return;
    }
    if (!riderPhone.trim()) {
      setBookingError('Please provide an active mobile or WhatsApp number.');
      return;
    }
    if (riderEmail.trim() && !EMAIL_PATTERN.test(riderEmail.trim())) {
      setBookingError('Please enter a valid email address, or leave it empty.');
      return;
    }

    // "Pickup now" means the moment the customer presses the button, not when the page opened
    const now = new Date();
    const travelDate = pickupTimingMode === 'NOW' ? localDateString(now) : pickupDate;
    const travelTime = pickupTimingMode === 'NOW' ? localTimeString(now) : pickupTime;

    setIsBooking(true);
    try {
      const notesList = [];
      if (flightNumber.trim()) notesList.push(`Flight: ${flightNumber.trim()}`);

      const payload = {
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
        travelDate,
        travelTime,
        passenger_count: passengers,
        luggage_count: bags,
        child_seat: childSeat,
        customerName: riderName.trim(),
        customerPhone: `${countryCode} ${riderPhone.trim()}`,
        customerEmail: riderEmail.trim(),
        notes: notesList.join(' | '),
        paymentMethod: paymentMethod.toUpperCase(),
        currency: 'THB'
      };

      const res = await bookCabTransfer(payload);
      if (res.success) {
        const bookedTier = DEFAULT_TIERS.find(d => d.tier === res.vehicleCategory) || matchedRide;
        const rideData = {
          bookingId: res.bookingId || res.data?.booking_id,
          dispatchId: res.dispatchId || res.data?.dispatch_id,
          rideOtp: res.rideOtp || res.data?.ride_otp,
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          date: travelDate,
          time: travelTime,
          tierName: bookedTier.name,
          passengers,
          bags,
          totalFare: res.fareThb ?? calculatedTotalFare,
          status: 'Requested',
          driver: null,
          contactPhone: `${countryCode} ${riderPhone.trim()}`,
          contactEmail: riderEmail.trim(),
          updatesVia: Array.isArray(res.updatesVia) ? res.updatesVia : [],
          createdAt: Date.now()
        };
        setRideActionError('');
        setActiveRide(rideData);
        setCurrentView('confirmed');
      } else {
        setBookingError(res.error || 'Unable to place ride request.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(err.message || 'Error occurred while contacting dispatch engine.');
    } finally {
      setIsBooking(false);
    }
  };

  // Show a ride on the confirmation screen. `saved` is the copy kept in this browser
  // (has the start code); without it the details are filled in from tracking.
  const openRide = (dispatchId, saved = null) => {
    setRideActionError('');
    setActiveRide(saved && saved.dispatchId === dispatchId
      ? saved
      : { dispatchId, status: 'Requested', driver: null, pickup: '', dropoff: '', date: '', time: '', tierName: '', totalFare: null, updatesVia: [] });
    setCurrentView('confirmed');
  };

  const removeRideParamFromUrl = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('ride')) {
        url.searchParams.delete('ride');
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch { /* ignore */ }
  };

  // Leave the confirmation screen and forget the ride in this browser
  const leaveRide = () => {
    clearActiveRide();
    setActiveRide(null);
    setParkedRide(null);
    setRideActionError('');
    setCurrentView('booking');
    removeRideParamFromUrl();
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this transfer?')) return;
    setRideActionError('');
    setIsCancelling(true);
    try {
      const res = await cancelCabRide({ dispatch_id: activeRide.dispatchId, reason: 'Customer requested cancellation' });
      if (res && res.success) {
        leaveRide();
      } else if (/auth/i.test(res?.error || '')) {
        setRideActionError('Please sign in to cancel online, or call the Chauffeur Helpline and quote your booking reference.');
      } else {
        setRideActionError(res?.error || 'Could not cancel this ride. Please call the Chauffeur Helpline.');
      }
    } catch {
      setRideActionError('Could not cancel this ride. Please call the Chauffeur Helpline.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Reopen a ride from a tracking link (?ride=...) or from this browser after a refresh
  useEffect(() => {
    let linkedRideId = null;
    try { linkedRideId = new URLSearchParams(window.location.search).get('ride'); } catch { /* ignore */ }
    const saved = loadActiveRide();
    if (linkedRideId) openRide(linkedRideId, saved);
    else if (saved?.dispatchId) openRide(saved.dispatchId, saved);
  }, []);

  // Keep the saved copy current; forget it once the ride is finished
  useEffect(() => {
    if (!activeRide?.dispatchId) return;
    if (FINISHED_RIDE_STATUSES.includes(activeRide.status)) clearActiveRide();
    else saveActiveRide(activeRide);
  }, [activeRide]);

  // Sync ride status in confirmed mode
  useEffect(() => {
    if (currentView === 'confirmed' && activeRide?.dispatchId) {
      const syncTracking = async () => {
        try {
          const res = await trackCabRide(activeRide.dispatchId);
          if (res.success && (res.data || res.dispatch)) {
            const d = res.data || res.dispatch;
            const rawStatus = (d.ride_status || d.status || 'ALLOCATED').toUpperCase();
            const mappedStatus = RIDE_STATUS_LABEL[rawStatus] || 'Requested';
            // pickup_datetime is the booked wall-clock time serialised as UTC
            const pickupIso = String(d.pickup_datetime || '');
            const tierInfo = DEFAULT_TIERS.find(t => t.tier === d.vehicle_category);
            // Real GPS from the driver app (only sent while the driver is on the way or on the trip)
            const loc = d.driver_location;
            const serverGps = loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))
              ? { lat: Number(loc.latitude), lng: Number(loc.longitude), receivedAt: Date.now() - (Number(loc.age_sec) || 0) * 1000 }
              : null;

            setActiveRide(prev => {
              if (!prev) return prev;
              // Keep a newer copy of the same position that arrived by live push
              const gps = serverGps && prev.gps && prev.gps.lat === serverGps.lat && prev.gps.lng === serverGps.lng
                ? { ...serverGps, receivedAt: Math.max(prev.gps.receivedAt || 0, serverGps.receivedAt) }
                : serverGps;
              return {
                ...prev,
                bookingId: prev.bookingId || d.booking_id,
                pickup: prev.pickup || d.pickup_address,
                dropoff: prev.dropoff || d.dropoff_address,
                date: prev.date || pickupIso.slice(0, 10),
                time: prev.time || pickupIso.slice(11, 16),
                tierName: prev.tierName || tierInfo?.name || d.vehicle_category,
                passengers: prev.passengers || d.passenger_count,
                bags: prev.bags ?? d.luggage_count,
                totalFare: prev.totalFare ?? d.total_fare_thb,
                status: mappedStatus,
                rideOtp: d.rideOtp || d.ride_otp || prev.rideOtp,
                driver: d.driver || prev.driver,
                liveDispatchId: d.dispatch_id || prev.liveDispatchId,
                gps
              };
            });
          } else if (res && res.success === false && /not found/i.test(res.error || '')) {
            // Old or mistyped tracking link
            leaveRide();
            setBookingError('We could not find that ride. Please check your booking message or book again.');
          }
        } catch { /* network hiccup: try again on the next tick */ }
      };

      syncTracking();
      pollIntervalRef.current = setInterval(syncTracking, 4500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentView, activeRide?.dispatchId]);

  // The driver's position is pushed here the moment the driver app sends it
  const liveRideRoom = currentView === 'confirmed' ? (activeRide?.liveDispatchId || activeRide?.dispatchId) : null;
  useEffect(() => {
    if (!liveRideRoom) return undefined;
    return connectLiveRooms({
      rooms: [`dispatch_${liveRideRoom}`],
      events: {
        DRIVER_LOCATION_UPDATE: (data) => {
          const lat = Number(data?.latitude);
          const lng = Number(data?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          setActiveRide(prev => (prev ? { ...prev, gps: { lat, lng, receivedAt: Date.now() } } : prev));
        }
      }
    });
  }, [liveRideRoom]);

  const handleCopyOtp = (otp) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 3000);
  };

  const isAirportRoute = pickupLocation.toLowerCase().includes('airport') || dropoffLocation.toLowerCase().includes('airport');

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'var(--font-body)' }} className="cabs-page">
      
      {/* ── TOP HEADER BAR (Ola / Uber style) ── */}
      <header 
        className="cabs-header"
        style={{ 
          backgroundColor: '#0B132B', 
          borderBottom: '2px solid rgba(212, 175, 55, 0.4)', 
          padding: '12px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          zIndex: 100 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '13px' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div className="cabs-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TempleMark size={26} style={{ color: '#F5C518', filter: 'drop-shadow(0 2px 6px rgba(245, 197, 24, 0.45))' }} />
            <span className="brand-wordmark" style={{ fontSize: '17px', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
              WOW <span className="brand-gold">THAILAND</span>
            </span>
            <span className="cabs-brand-tag">Cabs</span>
          </div>
          <span 
            className="cabs-header-badge"
            style={{ 
              backgroundColor: 'rgba(212, 175, 55, 0.15)', 
              color: '#F1D78A', 
              border: '1px solid rgba(212, 175, 55, 0.35)', 
              borderRadius: '20px', 
              padding: '3px 10px', 
              fontSize: '12px', 
              fontWeight: 800 
            }}
          >
            Zero Surge Pricing
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            aria-label="Activity and trips"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={13} className="text-warning" />
            <span className="cabs-btn-label">Activity / Trips</span>
          </button>

          <a
            href="https://wa.me/66812345678"
            target="_blank"
            rel="noreferrer"
            aria-label="Chauffeur helpline on WhatsApp"
            style={{
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MessageSquare size={13} />
            <span className="cabs-btn-label">Chauffeur Helpline</span>
          </a>
        </div>
      </header>

      {/* ── MAIN CONTENT: 3-PANEL OLA / UBER SPLIT SCREEN ── */}
      {currentView === 'booking' ? (
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          
          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 1: "GET A RIDE" (Pickup, Drop, Schedule, Rider details)
          ══════════════════════════════════════════════════════════════════════ */}
          <div 
            style={{ 
              width: '380px', 
              minWidth: '340px', 
              backgroundColor: '#FFFFFF', 
              borderRight: '1px solid #E2E8F0', 
              padding: '20px 22px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px',
              boxShadow: '2px 0 12px rgba(0,0,0,0.03)'
            }}
          >
            {parkedRide && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 10px', fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                <span>🚕 You have a ride booked{parkedRide.date ? ` for ${parkedRide.date} ${parkedRide.time || ''}` : ''}.</span>
                <button
                  type="button"
                  onClick={() => {
                    const ride = parkedRide;
                    setParkedRide(null);
                    openRide(ride.dispatchId, ride);
                  }}
                  style={{ border: 'none', background: '#0B132B', color: '#D4AF37', borderRadius: '8px', padding: '5px 10px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  View ride
                </button>
              </div>
            )}

            <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>
              Get a private ride
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              Fixed transparent rate with licensed Thai chauffeur
            </p>

            {/* Pickup & Destination Inputs with Connector Line */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Pickup Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span>🟢</span> Pickup Location
                </label>
                <ThailandLocationAutocomplete
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  placeholder="Enter airport, hotel or pickup..."
                  isPickup={true}
                />
              </div>

              {/* Swap Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 8px -4px 0' }}>
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap Locations"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                  }}
                >
                  <ArrowUpDown size={13} color="#0B132B" />
                </button>
              </div>

              {/* Destination Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span>🔴</span> Drop-off Destination
                </label>
                <ThailandLocationAutocomplete
                  value={dropoffLocation}
                  onChange={setDropoffLocation}
                  placeholder="Enter hotel, beach or destination..."
                  isPickup={false}
                />
              </div>
            </div>

            {/* Ride Time Selector (Pickup Now vs Schedule Later) */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: pickupTimingMode === 'SCHEDULE' ? '10px' : 0 }}>
                <button
                  type="button"
                  onClick={() => setPickupTimingMode('NOW')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: pickupTimingMode === 'NOW' ? '#0B132B' : 'transparent',
                    color: pickupTimingMode === 'NOW' ? '#D4AF37' : '#64748B',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ⚡ Pickup Now
                </button>

                <button
                  type="button"
                  onClick={() => setPickupTimingMode('SCHEDULE')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: pickupTimingMode === 'SCHEDULE' ? '#0B132B' : 'transparent',
                    color: pickupTimingMode === 'SCHEDULE' ? '#D4AF37' : '#64748B',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  📅 Schedule
                </button>
              </div>

              {pickupTimingMode === 'SCHEDULE' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                  />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    style={{ width: '100px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                  />
                </div>
              )}
            </div>

            {/* Group Size — decides which vehicle we send */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <GroupStepper
                icon={<Users size={14} color="#0B132B" />}
                label="Passengers"
                value={passengers}
                min={1}
                max={MAX_PASSENGERS_INPUT}
                onChange={setPassengers}
              />
              <GroupStepper
                icon={<Briefcase size={14} color="#0B132B" />}
                label="Bags"
                value={bags}
                min={0}
                max={MAX_BAGS_INPUT}
                onChange={setBags}
              />
            </div>

            {/* Passenger Contact Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRiderType('self')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: riderType === 'self' ? '#0B132B' : '#E2E8F0',
                    backgroundColor: riderType === 'self' ? '#0B132B' : '#FFFFFF',
                    color: riderType === 'self' ? '#FFFFFF' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  For Me
                </button>
                <button
                  type="button"
                  onClick={() => setRiderType('other')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: riderType === 'other' ? '#0B132B' : '#E2E8F0',
                    backgroundColor: riderType === 'other' ? '#0B132B' : '#FFFFFF',
                    color: riderType === 'other' ? '#FFFFFF' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Book for Someone Else
                </button>
              </div>

              <input
                type="text"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="Passenger Full Name *"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontWeight: 600 }}
              />

              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{ width: '105px', padding: '8px 6px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="WhatsApp / Mobile Number *"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontWeight: 600 }}
                />
              </div>

              <input
                type="email"
                value={riderEmail}
                onChange={(e) => setRiderEmail(e.target.value)}
                placeholder="Email (optional, for booking updates)"
                autoComplete="email"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontWeight: 600 }}
              />
              {(() => {
                // Only promise channels the server has switched on
                const phoneChannels = updateChannels.filter(c => c !== 'email').map(c => CHANNEL_LABEL[c] || c);
                const emailOn = updateChannels.includes('email') && riderEmail.trim();
                if (phoneChannels.length === 0 && !emailOn) return null;
                const parts = [];
                if (phoneChannels.length) parts.push(`by ${joinWithAnd(phoneChannels)} to this number`);
                if (emailOn) parts.push('by email');
                return (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '-4px' }}>
                    We'll send your booking and driver details {parts.join(' and ')}.
                  </div>
                );
              })()}

              {isAirportRoute && (
                <div style={{ position: 'relative' }}>
                  <Plane size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37' }} />
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="Flight Number (e.g. TG 679) for Radar Sync"
                    style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* Extras Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={childSeat}
                  onChange={(e) => setChildSeat(e.target.checked)}
                />
                <span>Child Safety Seat (+฿{childSeatFee})</span>
              </label>
            </div>

            {bookingError && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {bookingError}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 2: "YOUR RIDE" (Vehicle chosen by the system for this group & CTA)
          ══════════════════════════════════════════════════════════════════════ */}
          <div 
            style={{ 
              width: '400px', 
              minWidth: '340px', 
              backgroundColor: '#FFFFFF', 
              borderRight: '1px solid #E2E8F0', 
              padding: '20px 22px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              boxShadow: '1px 0 8px rgba(0,0,0,0.02)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Your ride
                </h2>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 800, backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>
                  ✓ Tolls Included
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px' }}>
                We choose the vehicle that fits your group. Your chauffeur's name and number plate appear as soon as they accept.
              </p>

              {matchedRide ? (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '2px solid #0B132B',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 14px rgba(11, 19, 43, 0.08)',
                    opacity: isEstimating ? 0.6 : 1,
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        fontSize: '26px',
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {matchedRide.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{matchedRide.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                        Fits up to {matchedRide.maxPax} people · {matchedRide.maxLuggage} bags
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>
                        {matchedRide.models.split(',')[0]}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                      ฿{matchedRide.fareThb}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>
                      THB
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '14px', borderRadius: '14px', border: '1px dashed #CBD5E1', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                  {isEstimating
                    ? 'Finding the right vehicle for your group...'
                    : (availabilityMessage || 'Enter pickup and drop-off to see your ride.')}
                </div>
              )}

              {matchedRide && !matchedRide.available && availabilityMessage && (
                <div style={{ marginTop: '10px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                  {availabilityMessage}
                </div>
              )}
            </div>

            {/* Bottom Bar: Payment Mode + Big Black Request Button */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid #E2E8F0', marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="cash">💵 Cash on Arrival</option>
                  <option value="promptpay">📱 PromptPay QR</option>
                  <option value="card">💳 Credit Card</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleConfirmRide}
                disabled={isBooking || isEstimating || !canBook}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#0B132B',
                  color: '#D4AF37',
                  fontSize: '15px',
                  fontWeight: 900,
                  opacity: canBook ? 1 : 0.5,
                  cursor: isBooking ? 'wait' : (canBook ? 'pointer' : 'not-allowed'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(11, 19, 43, 0.25)',
                  transition: 'opacity 0.15s'
                }}
              >
                {isBooking ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    <span>Broadcasting Chauffeur Request...</span>
                  </>
                ) : (
                  <span>
                    {canBook
                      ? `Request ${matchedRide.name} · ฿${calculatedTotalFare} THB`
                      : 'No vehicle available for this group'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 3: RIGHT PANEL (Live Leaflet Map & Guaranteed Pricing Banner)
          ══════════════════════════════════════════════════════════════════════ */}
          <div 
            style={{ 
              flex: 1, 
              minWidth: '400px', 
              backgroundColor: '#F8FAFC', 
              padding: '16px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}
          >
            {/* Real Interactive Leaflet Map */}
            <div 
              style={{ 
                width: '100%', 
                height: '420px', 
                minHeight: '380px', 
                borderRadius: '18px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
                border: '1px solid #E2E8F0', 
                position: 'relative', 
                backgroundColor: '#FFFFFF' 
              }}
            >
              <LiveThailandCabMap
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                mode="booking"
                height="100%"
              />
            </div>

            {/* Guaranteed Transparent Pricing Banner */}
            <div 
              style={{ 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E2E8F0', 
                borderRadius: '14px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🛡️</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Fixed Transparent Pricing</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>No hidden charges · Tolls & expressway included in quote</div>
                </div>
              </div>
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '12.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', border: '1px solid #BBF7D0' }}>
                Guaranteed
              </span>
            </div>
          </div>

        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
            VIEW 2: SEAMLESS LIVE DISPATCH & CHAUFFEUR RADAR (CONFIRMED STATE)
        ══════════════════════════════════════════════════════════════════════ */
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          
          {/* Confirmed Console Left Panel */}
          <div 
            style={{ 
              width: '440px', 
              minWidth: '360px', 
              backgroundColor: '#FFFFFF', 
              borderRight: '1px solid #E2E8F0', 
              padding: '24px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              boxShadow: '2px 0 12px rgba(0,0,0,0.03)'
            }}
          >
            {/* Header Status */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="spinner-grow spinner-grow-sm text-warning" style={{ width: '8px', height: '8px' }}></span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activeRide.status === 'Requested' ? 'Connecting to Nearest Chauffeur' : activeRide.status}
                </span>
              </div>
              <h2 className="font-heading" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {activeRide.status === 'Requested' ? 'Waiting for Driver to Accept...' : 'Chauffeur En Route!'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                {activeRide.tierName} · Dispatch #{activeRide.dispatchId}
              </p>
              <p style={{ fontSize: '12px', color: '#334155', margin: '6px 0 0', fontWeight: 600 }}>
                {activeRide.updatesVia?.length > 0
                  ? `📩 Your booking and driver details are sent by ${joinWithAnd(activeRide.updatesVia.map(c => CHANNEL_LABEL[c] || c))}` +
                    `${activeRide.updatesVia.some(c => c !== 'email') ? ` to ${activeRide.contactPhone}` : ''}` +
                    `${activeRide.updatesVia.includes('email') ? `${activeRide.updatesVia.length > 1 ? ' and' : ''} to ${activeRide.contactEmail}` : ''}.`
                  : '📌 This ride is saved on this device. You can close the page and come back any time.'}
              </p>
            </div>

            {/* Radar Broadcast Banner */}
            {activeRide.status === 'Requested' && (
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', 
                  border: '1.5px solid #FDE68A', 
                  borderRadius: '14px', 
                  padding: '12px 14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px' 
                }}
              >
                <div style={{ fontSize: '24px', flexShrink: 0 }}>📡</div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E' }}>
                    Chauffeur Alert Sent
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#78350F', marginTop: '1px', lineHeight: 1.35 }}>
                    Broadcast to active chauffeurs near {activeRide?.pickup}. Screen updates automatically once accepted!
                  </div>
                </div>
              </div>
            )}

            {/* 4-DIGIT RIDE SECURITY OTP DISPLAY */}
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 100%)', 
                border: '1.5px solid rgba(212, 175, 55, 0.4)', 
                borderRadius: '16px', 
                padding: '16px 20px', 
                color: '#FFFFFF',
                textAlign: 'center',
                boxShadow: '0 6px 20px rgba(11, 19, 43, 0.15)'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                START TRIP OTP
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                {String(activeRide.rideOtp || '7457').split('').map((digit, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      width: '46px', 
                      height: '52px', 
                      backgroundColor: '#FFFFFF', 
                      color: '#0B132B', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '24px', 
                      fontWeight: 900,
                      border: '2px solid #D4AF37',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: '8px' }}>
                Share this 4-digit code with your chauffeur to start your journey.
              </div>

              <button
                type="button"
                onClick={() => handleCopyOtp(activeRide.rideOtp)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copiedOtp ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                <span>{copiedOtp ? 'Copied!' : 'Copy OTP'}</span>
              </button>
            </div>

                        {/* Chauffeur Details Card: Clean Radar State while waiting, Real Chauffeur after acceptance */}
            {!activeRide.driver ? (
              <div 
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '14px', 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div 
                    style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(212, 175, 55, 0.12)', 
                      border: '1.5px solid #D4AF37', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span className="spinner-border spinner-border-sm text-warning" style={{ width: '18px', height: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                      Broadcasting to Nearby Chauffeurs...
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                      Searching licensed Thai chauffeurs in pickup radius
                    </div>
                  </div>
                </div>

                <div 
                  style={{ 
                    backgroundColor: '#F8FAFC', 
                    borderRadius: '10px', 
                    padding: '10px 14px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '12px', 
                    border: '1px solid #E2E8F0' 
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B' }}>Vehicle: </span>
                    <strong style={{ color: '#0F172A' }}>{activeRide.tierName}</strong>
                    {activeRide.passengers && (
                      <span style={{ color: '#64748B' }}>
                        {' '}· {activeRide.passengers} {activeRide.passengers === 1 ? 'passenger' : 'passengers'} · {activeRide.bags} {activeRide.bags === 1 ? 'bag' : 'bags'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Status: </span>
                    <span style={{ color: '#D97706', fontWeight: 800 }}>Awaiting Acceptance</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {activeRide.driver.photo ? (
                      <img
                        src={activeRide.driver.photo}
                        alt={activeRide.driver.name}
                        style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#D4AF37', color: '#0B132B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px' }}>
                        {(activeRide.driver.name || 'D')[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        {activeRide.driver.name}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                        ⭐ {activeRide.driver.rating || '4.95'} · Verified Chauffeur
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                      {[activeRide.driver.vehicle_color, activeRide.driver.vehicle_model || activeRide.driver.vehicle?.model].filter(Boolean).join(' ') || activeRide.tierName}
                    </div>
                    {(activeRide.driver.vehicle_plate || activeRide.driver.vehicle?.plateNumber) && (
                      <div style={{ fontSize: '12px', fontWeight: 800, backgroundColor: '#0B132B', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>
                        {activeRide.driver.vehicle_plate || activeRide.driver.vehicle?.plateNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                  {activeRide.driver.phone && (
                    <a
                      href={'tel:' + activeRide.driver.phone}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Phone size={14} color="#059669" />
                      <span>Call Chauffeur</span>
                    </a>
                  )}

                  {activeRide.driver.phone && (
                    <a
                      href={'https://wa.me/' + activeRide.driver.phone.replace(/[^0-9]/g, '')}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #BBF7D0',
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Route Summary */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px 14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px' }}>🟢</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{activeRide.pickup}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px' }}>🔴</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{activeRide.dropoff}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: '#64748B' }}>Total Guaranteed Fare</span>
                <span style={{ fontWeight: 900, color: '#0F172A' }}>
                  {activeRide.totalFare != null ? `฿${activeRide.totalFare} THB` : '…'}
                </span>
              </div>
            </div>

            {rideActionError && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {rideActionError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  if (FINISHED_RIDE_STATUSES.includes(activeRide.status)) {
                    leaveRide();
                    return;
                  }
                  // The ride stays booked and saved; keep a shortcut back to it
                  setParkedRide(activeRide);
                  setActiveRide(null);
                  setRideActionError('');
                  setCurrentView('booking');
                  removeRideParamFromUrl();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Book Another Ride
              </button>

              {!FINISHED_RIDE_STATUSES.includes(activeRide.status) && (
                <button
                  type="button"
                  onClick={handleCancelRide}
                  disabled={isCancelling}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isCancelling ? 'wait' : 'pointer'
                  }}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
            </div>
          </div>

          {/* Right Live Map in Confirmed Mode */}
          <div 
            style={{ 
              flex: 1, 
              minWidth: '400px', 
              backgroundColor: '#F8FAFC', 
              padding: '16px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}
          >
            <div 
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '500px', 
                borderRadius: '18px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
                border: '1px solid #E2E8F0', 
                position: 'relative', 
                backgroundColor: '#FFFFFF' 
              }}
            >
              <LiveThailandCabMap
                pickupLocation={activeRide?.pickup}
                dropoffLocation={activeRide?.dropoff}
                mode={activeRide?.driver ? "confirmed" : "estimate"}
                driverName={activeRide?.driver?.name || null}
                vehiclePlate={activeRide?.driver?.vehicle_plate || activeRide?.driver?.vehicle?.plateNumber || null}
                driverStatus={activeRide?.status || 'ALLOCATED'}
                driverLocation={activeRide?.gps || null}
                height="100%"
              />
            </div>
          </div>

        </div>
      )}

      {/* History Drawer */}
      {showHistoryDrawer && (
        <CabRideHistoryDrawer
          isOpen={showHistoryDrawer}
          onClose={() => setShowHistoryDrawer(false)}
          onTrackRide={(dispatchId) => {
            setShowHistoryDrawer(false);
            setParkedRide(null);
            openRide(dispatchId, loadActiveRide());
          }}
        />
      )}
    </div>
  );
}
