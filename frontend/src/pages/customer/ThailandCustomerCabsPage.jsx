// ========================================================================
// WOW THAILAND: Customer Cabs & Transfer Page (WOW GOA True 3-Column Experience)
// 3-Column Ola / Uber Split Layout:
// Left: "Get a ride" parameters & rider contact
// Center: "Choose a ride" vehicle tiers & transparent fares
// Right: Live Leaflet Interactive Map with real route trajectory
// Seamless in-place transition to Live Dispatch Radar with 4-digit Ride OTP!
// ========================================================================

import React, { useState, useEffect, useRef } from 'react';
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
    return initialDate || new Date().toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState(() => {
    if (initialTime) return initialTime;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // Rider Details
  const [riderType, setRiderType] = useState('self'); // 'self' | 'other'
  const [riderName, setRiderName] = useState(() => currentUser?.name || currentUser?.full_name || '');
  const [countryCode, setCountryCode] = useState('+66');
  const [riderPhone, setRiderPhone] = useState(() => currentUser?.phone || '');
  const [flightNumber, setFlightNumber] = useState('');

  // Extras
  const [extraLuggage, setExtraLuggage] = useState(false);
  const [childSeat, setChildSeat] = useState(false);

  // Tiers & Selected Vehicle
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [selectedTierKey, setSelectedTierKey] = useState('SEDAN');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'promptpay' | 'card'

  // Loading & Route Metrics
  const [isEstimating, setIsEstimating] = useState(false);
  const [distanceKm, setDistanceKm] = useState(30);
  const [durationMin, setDurationMin] = useState(45);

  // Active Confirmed Ride State
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [activeRide, setActiveRide] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Poll Tracking in Confirmed Mode
  const pollIntervalRef = useRef(null);

  // Estimate Fares when pickup/dropoff changes
  const fetchEstimates = async () => {
    if (!pickupLocation.trim() || !dropoffLocation.trim()) return;
    setIsEstimating(true);
    try {
      const res = await estimateCabFare({
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        travelDate: pickupDate,
        travelTime: pickupTime,
        pax: selectedTierKey === 'VIP_VAN' ? 8 : (selectedTierKey === 'SUV' ? 4 : 2),
        currency: 'THB'
      });

      if (res.success && Array.isArray(res.tiers) && res.tiers.length > 0) {
        const mapped = res.tiers.map(t => {
          const key = (t.tier || 'SEDAN').toUpperCase();
          const base = DEFAULT_TIERS.find(d => d.tier === key) || DEFAULT_TIERS[0];
          return {
            ...base,
            fareThb: t.fareThb || t.total_fare_thb || base.fareThb,
            models: t.models || base.models,
            breakdown: t.breakdown
          };
        });
        setTiers(mapped);
        setDistanceKm(res.distanceKm || 30);
        setDurationMin(res.durationMin || 45);
      }
    } catch (e) {
      console.error('Estimate error:', e);
    } finally {
      setIsEstimating(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [pickupLocation, dropoffLocation]);

  // Swap Locations
  const handleSwap = () => {
    const temp = pickupLocation;
    setPickupLocation(dropoffLocation);
    setDropoffLocation(temp);
  };

  // Selected Tier Object & Total Fare calculation (including extras)
  const selectedTier = tiers.find(t => t.tier === selectedTierKey) || tiers[0];
  const extrasCost = (extraLuggage ? 150 : 0) + (childSeat ? 200 : 0);
  const calculatedTotalFare = (selectedTier?.fareThb || 850) + extrasCost;

  // Handle Request Chauffeur Ride
  const handleConfirmRide = async () => {
    setBookingError('');
    if (!riderName.trim()) {
      setBookingError('Please enter passenger full name.');
      return;
    }
    if (!riderPhone.trim()) {
      setBookingError('Please provide an active mobile or WhatsApp number.');
      return;
    }

    setIsBooking(true);
    try {
      const notesList = [];
      if (extraLuggage) notesList.push('Extra Luggage Space Requested (+฿150)');
      if (childSeat) notesList.push('Child Safety Seat Requested (+฿200)');
      if (flightNumber.trim()) notesList.push(`Flight: ${flightNumber.trim()}`);

      const payload = {
        tier: selectedTier.tier,
        pickupAddress: pickupLocation,
        dropoffAddress: dropoffLocation,
        travelDate: pickupDate,
        travelTime: pickupTime,
        pax: selectedTier.maxPax,
        luggage: selectedTier.maxLuggage,
        customerName: riderName.trim(),
        customerPhone: `${countryCode} ${riderPhone.trim()}`,
        customerEmail: currentUser?.email || 'guest@wowthailand.com',
        notes: notesList.join(' | '),
        paymentMethod: paymentMethod.toUpperCase(),
        currency: 'THB'
      };

      const res = await bookCabTransfer(payload);
      if (res.success) {
        const rideData = {
          bookingId: res.bookingId || res.data?.booking_id,
          dispatchId: res.dispatchId || res.data?.dispatch_id,
          rideOtp: res.rideOtp || res.data?.ride_otp,
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          date: pickupDate,
          time: pickupTime,
          tierName: selectedTier.name,
          totalFare: calculatedTotalFare,
          status: 'Requested',
          driver: null,
          createdAt: Date.now()
        };
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

  // Sync ride status in confirmed mode
  useEffect(() => {
    if (currentView === 'confirmed' && activeRide?.dispatchId) {
      const syncTracking = async () => {
        try {
          const res = await trackCabRide(activeRide.dispatchId);
          if (res.success && (res.data || res.dispatch)) {
            const d = res.data || res.dispatch;
            let mappedStatus = 'Requested';
            const rawStatus = (d.ride_status || d.status || 'ALLOCATED').toUpperCase();
            if (rawStatus === 'ALLOCATED' || rawStatus === 'REQUESTED') mappedStatus = 'Requested';
            else if (rawStatus === 'DISPATCHED' || rawStatus === 'ASSIGNED') mappedStatus = 'Chauffeur Dispatched';
            else if (rawStatus === 'ARRIVED') mappedStatus = 'Chauffeur Arrived';
            else if (rawStatus === 'ON_TRIP') mappedStatus = 'Trip In Progress';
            else if (rawStatus === 'COMPLETED') mappedStatus = 'Trip Completed';
            else if (rawStatus === 'CANCELLED') mappedStatus = 'Cancelled';

            setActiveRide(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                status: mappedStatus,
                rideOtp: d.rideOtp || d.ride_otp || prev.rideOtp,
                driver: d.driver || prev.driver
              };
            });
          }
        } catch (e) {}
      };

      syncTracking();
      pollIntervalRef.current = setInterval(syncTracking, 4500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentView, activeRide?.dispatchId]);

  const handleCopyOtp = (otp) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 3000);
  };

  const isAirportRoute = pickupLocation.toLowerCase().includes('airport') || dropoffLocation.toLowerCase().includes('airport');

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── TOP HEADER BAR (Ola / Uber style) ── */}
      <header 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚕</span>
            <span style={{ fontWeight: 900, fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              WOW THAILAND <span style={{ color: '#D4AF37' }}>Cabs</span>
            </span>
          </div>
          <span 
            style={{ 
              backgroundColor: 'rgba(212, 175, 55, 0.15)', 
              color: '#F1D78A', 
              border: '1px solid rgba(212, 175, 55, 0.35)', 
              borderRadius: '20px', 
              padding: '3px 10px', 
              fontSize: '11px', 
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
            <span>Activity / Trips</span>
          </button>

          <a
            href="https://wa.me/66812345678"
            target="_blank"
            rel="noreferrer"
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
            <span>Chauffeur Helpline</span>
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
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 2px' }}>
              Get a private ride
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              Fixed transparent rate with licensed Thai chauffeur
            </p>

            {/* Pickup & Destination Inputs with Connector Line */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Pickup Input */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
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
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
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
                    fontSize: '11px',
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
                    fontSize: '11px',
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
                  checked={extraLuggage}
                  onChange={(e) => setExtraLuggage(e.target.checked)}
                />
                <span>Extra Luggage / Golf Bags (+฿150)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={childSeat}
                  onChange={(e) => setChildSeat(e.target.checked)}
                />
                <span>Child Safety Seat (+฿200)</span>
              </label>
            </div>

            {bookingError && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {bookingError}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 2: "CHOOSE A RIDE" (Vertical List of Vehicle Tiers & CTA)
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
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Choose a ride
                </h2>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800, backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>
                  ✓ Tolls Included
                </span>
              </div>

              {/* Ride Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tiers.map(t => {
                  const isSelected = selectedTierKey === t.tier;
                  return (
                    <div
                      key={t.tier}
                      onClick={() => setSelectedTierKey(t.tier)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #0B132B' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(11, 19, 43, 0.08)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          style={{ 
                            fontSize: '26px', 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '10px', 
                            backgroundColor: isSelected ? '#E2E8F0' : '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {t.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{t.name}</span>
                            {t.popular && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#854D0E', backgroundColor: '#FEF08A', padding: '1px 6px', borderRadius: '8px' }}>
                                Popular
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            {t.maxPax} Pax · {t.maxLuggage} Bags · {t.models.split(',')[0]}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                          ฿{t.fareThb}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>
                          THB
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                disabled={isBooking || isEstimating}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#0B132B',
                  color: '#D4AF37',
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: isBooking ? 'wait' : 'pointer',
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
                  <span>Request {selectedTier.name} · ฿{calculatedTotalFare} THB</span>
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
                  <div style={{ fontSize: '11px', color: '#64748B' }}>No hidden charges · Tolls & expressway included in quote</div>
                </div>
              </div>
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', border: '1px solid #BBF7D0' }}>
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
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {activeRide.status === 'Requested' ? 'Waiting for Driver to Accept...' : 'Chauffeur En Route!'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                {activeRide.tierName} · Dispatch #{activeRide.dispatchId}
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
                  <div style={{ fontSize: '11.5px', color: '#78350F', marginTop: '1px', lineHeight: 1.35 }}>
                    Broadcast to active chauffeurs near {activeRide.pickup}. Screen updates automatically once accepted!
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
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
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

              <div style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '8px' }}>
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
                  fontSize: '11px',
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

            {/* Chauffeur Details Card */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#D4AF37', color: '#0B132B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px' }}>
                    {(activeRide.driver?.name || 'Somchai Prasert')[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      {activeRide.driver?.name || 'Somchai Prasert'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      ⭐ 4.95 · Verified Chauffeur
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                    {activeRide.driver?.vehicle?.model || 'Toyota Camry VIP'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#0B132B', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>
                    {activeRide.driver?.vehicle?.plateNumber || '1กข 4589'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                <a
                  href="tel:+66812345678"
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

                <a
                  href="https://wa.me/66812345678"
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
              </div>
            </div>

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
                <span style={{ fontWeight: 900, color: '#0F172A' }}>฿{activeRide.totalFare} THB</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveRide(null);
                  setCurrentView('booking');
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

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to cancel this transfer?')) {
                    try {
                      await cancelCabRide({ dispatchId: activeRide.dispatchId, reason: 'Customer requested cancellation' });
                    } catch (e) {}
                    setActiveRide(null);
                    setCurrentView('booking');
                  }
                }}
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
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
                pickupLocation={activeRide.pickup}
                dropoffLocation={activeRide.dropoff}
                mode="confirmed"
                driverName="Somchai Prasert"
                vehiclePlate="1กข 4589"
                driverStatus="DISPATCHED"
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
          }}
        />
      )}
    </div>
  );
}
