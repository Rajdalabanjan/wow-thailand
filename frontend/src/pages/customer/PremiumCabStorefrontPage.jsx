// ========================================================================
// WOW THAILAND: Royal Siam Mobility - Customer Transfer Storefront Page
// Dedicated luxury transfer booking, real-time tiers, popular routes, and modal
// Bootstrap 5 layout + Royal Siam theme (Midnight Navy & Champagne Gold)
// ========================================================================

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Award, Clock, Plane, Sparkles, 
  MapPin, Car, History, ArrowRight, ShieldAlert, Navigation
} from 'lucide-react';
import CabSearchWidget from '../../components/cab/CabSearchWidget';
import CabVehicleCard from '../../components/cab/CabVehicleCard';
import CabBookingModal from '../../components/cab/CabBookingModal';
import CabLiveTrackingModal from '../../components/cab/CabLiveTrackingModal';
import CabRideHistoryDrawer from '../../components/cab/CabRideHistoryDrawer';
import { estimateCabFare } from '../../services/api';

const POPULAR_THAI_ROUTES = [
  {
    id: 'bkk-to-sukhumvit',
    from: 'Suvarnabhumi Airport (BKK)',
    to: 'Bangkok City (Sukhumvit / Silom / Riverside)',
    distanceKm: 32,
    durationMin: 45,
    tag: 'Executive Airport Pickup',
    sedanFrom: 780
  },
  {
    id: 'dmk-to-pattaya',
    from: 'Don Mueang Airport (DMK)',
    to: 'Pattaya Beach & Walking Street',
    distanceKm: 155,
    durationMin: 120,
    tag: 'Coastal Expressway Direct',
    sedanFrom: 2625
  },
  {
    id: 'hkt-to-patong',
    from: 'Phuket International Airport (HKT)',
    to: 'Patong Beach Phuket',
    distanceKm: 40,
    durationMin: 55,
    tag: 'Andaman Beachfront Transfer',
    sedanFrom: 900
  },
  {
    id: 'bkk-to-huahin',
    from: 'Bangkok City (Sukhumvit / Silom / Riverside)',
    to: 'Hua Hin City & Beach Resorts',
    distanceKm: 195,
    durationMin: 180,
    tag: 'Royal Coast Intercity',
    sedanFrom: 3225
  }
];

export default function PremiumCabStorefrontPage({
  currentUser = null,
  initialPickup = '',
  initialDropoff = '',
  initialDate = '',
  initialTime = ''
}) {
  const [searchParams, setSearchParams] = useState({
    transferType: initialPickup && !initialPickup.includes('Airport') ? 'POINT_TO_POINT' : 'AIRPORT_PICKUP',
    primaryService: initialPickup && !initialPickup.includes('Airport') ? 'POINT_TO_POINT' : 'AIRPORT_TRANSFER',
    bookingTiming: 'SCHEDULED',
    pickup: initialPickup || 'Suvarnabhumi Airport (BKK)',
    dropoff: initialDropoff || 'Bangkok City (Sukhumvit / Silom / Riverside)',
    pickupDate: initialDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    pickupTime: initialTime || '14:00',
    pax: 2,
    luggage: 2
  });

  const [estimateData, setEstimateData] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');

  const [selectedTier, setSelectedTier] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [activeTrackingDispatchId, setActiveTrackingDispatchId] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState('THB');

  useEffect(() => {
    try {
      const savedCurr = localStorage.getItem('tg_currency') || 'THB';
      setCurrentCurrency(savedCurr);
    } catch (e) {}

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackId = urlParams.get('track') || urlParams.get('dispatch') || urlParams.get('booking');
      if (trackId) {
        setActiveTrackingDispatchId(trackId);
        setIsTrackingModalOpen(true);
      }
    } catch (e) {}
  }, []);

  const handlePerformSearch = async (params, shouldScroll = false) => {
    const updated = {
      ...searchParams,
      ...params
    };
    setSearchParams(updated);
    setIsEstimating(true);
    setEstimateError('');

    if (shouldScroll) {
      setTimeout(() => {
        document.getElementById('vehicle-selection-cards')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }

    try {
      const res = await estimateCabFare({
        pickup: updated.pickup,
        dropoff: updated.dropoff,
        travelDate: updated.pickupDate,
        travelTime: updated.pickupTime,
        pax: updated.pax,
        luggage: updated.luggage,
        currency: currentCurrency
      });

      if (res.success && (Array.isArray(res.tiers) || Array.isArray(res.data))) {
        const rawTiers = Array.isArray(res.tiers) && res.tiers.length > 0 ? res.tiers : (Array.isArray(res.data) ? res.data : []);
        const formattedTiers = rawTiers.map(t => ({
          tier: t.tier || t.vehicle_category || 'SEDAN',
          name: t.vehicle_category === 'VIP_VAN' || t.tier === 'VIP_VAN' ? 'VIP Group Commuter Transfer' : 
                (t.vehicle_category === 'SUV' || t.tier === 'SUV' ? 'Spacious Family SUV Transfer' : 'Standard Chauffeur Transfer'),
          models: t.vehicle_category === 'VIP_VAN' || t.tier === 'VIP_VAN' ? 'Private Van (Up to 9 Passengers)' : 
                  (t.vehicle_category === 'SUV' || t.tier === 'SUV' ? 'Private SUV (Up to 4 Passengers)' : 'Private Sedan (Up to 3 Passengers)'),
          maxPax: t.maxPax || t.max_passengers || 3,
          maxLuggage: t.maxLuggage || t.max_luggage || 2,
          fareThb: t.fareThb || t.total_fare_thb || 0,
          displayFare: t.displayFare || t.currency_snapshot?.customer_total_amount || t.total_fare_thb || 0,
          currency: t.currency || t.currency_snapshot?.customer_currency || 'THB',
          symbol: t.symbol || (t.currency_snapshot?.customer_currency === 'INR' ? '₹' : (t.currency_snapshot?.customer_currency === 'USD' ? '$' : '฿')),
          breakdown: t.breakdown || {
            baseFareThb: t.base_fare_thb || 0,
            distanceFareThb: (t.total_fare_thb || 0) - (t.base_fare_thb || 0),
            perKmRateThb: t.vehicle_category === 'VIP_VAN' ? 35 : (t.vehicle_category === 'SUV' ? 25 : 15),
            tollEstimateThb: t.toll_fee_thb || 0
          }
        }));

        setEstimateData({
          ...res,
          tiers: formattedTiers,
          distanceKm: res.distanceKm || rawTiers[0]?.distance_km || 25,
          durationMin: res.durationMin || rawTiers[0]?.estimated_minutes || 45
        });

        if (!selectedTier && formattedTiers.length > 0) {
          setSelectedTier(formattedTiers[0]);
        } else if (selectedTier) {
          const match = formattedTiers.find(t => t.tier === selectedTier.tier);
          if (match) setSelectedTier(match);
        }
      } else {
        setEstimateError(res.error || 'Could not calculate fare estimate for the specified Thailand route.');
      }
    } catch (err) {
      console.error('Estimate fare error:', err);
      setEstimateError(err.message || 'Error communicating with pricing engine.');
    } finally {
      setIsEstimating(false);
    }
  };

  useEffect(() => {
    handlePerformSearch(searchParams);
  }, [currentCurrency]);

  const handleSelectTier = (tier) => {
    setSelectedTier(tier);
    setIsBookingModalOpen(true);
  };

  const handleQuickRouteSelect = (route) => {
    const updated = {
      ...searchParams,
      pickup: route.from,
      dropoff: route.to,
      transferType: route.from.includes('Airport') ? 'AIRPORT_PICKUP' : 'INTERCITY'
    };
    handlePerformSearch(updated, true);
  };

  const handleOpenTrackingFromBooking = (dispatchId) => {
    setActiveTrackingDispatchId(dispatchId);
    setIsTrackingModalOpen(true);
  };

  return (
    <div style={{ backgroundColor: '#FDFBF7', color: '#1E293B', minHeight: '100vh' }}>
      {/* ======================================================================== */}
      {/* 1. HERO SECTION: Royal Siam Mobility                                    */}
      {/* Deep midnight navy, champagne gold typography, high-impact travel cues */}
      {/* ======================================================================== */}
      <section 
        className="pt-5 pb-5 text-white position-relative"
        style={{ 
          backgroundColor: '#0B132B', 
          borderBottom: '2px solid rgba(212, 175, 55, 0.3)' 
        }}
      >
        <div className="container">
          {/* Top Bar Action Pills */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <span 
              className="badge rounded-pill text-warning border px-3 py-2 d-inline-flex align-items-center gap-1.5"
              style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: 'rgba(212, 175, 55, 0.4)', fontSize: '0.8rem' }}
            >
              <Sparkles size={14} />
              <span>Royal Siam Private Mobility Concierge</span>
            </span>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(true)}
                className="btn btn-outline-light btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 fw-bold"
                style={{ fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.25)' }}
              >
                <History size={14} className="text-warning" />
                <span>My Transfer Bookings</span>
              </button>
            </div>
          </div>

          {/* Hero Titles & Value Proposition */}
          <div className="row align-items-center mb-4">
            <div className="col-12 col-lg-8">
              <h1 className="display-5 fw-black text-white font-heading mb-2">
                Your Journey, <br />
                <span style={{ color: '#D4AF37' }}>
                  Our Chauffeur.
                </span>
              </h1>
              <p className="lead text-white-50 fw-normal mb-3" style={{ fontSize: '1.05rem', lineHeight: 1.5 }}>
                Book reliable private transfers across Thailand, from airport pickups to comfortable city journeys. Guaranteed transparent pricing, zero hidden expressway tolls, and 60 minutes free airport wait time.
              </p>

              {/* Trust Badges */}
              <div className="row g-2 pt-2 border-top border-secondary text-white-50" style={{ fontSize: '0.8rem' }}>
                <div className="col-6 col-sm-3 d-flex align-items-center gap-1.5">
                  <Plane size={16} className="text-warning flex-shrink-0" />
                  <span>Flight Delay Tracking</span>
                </div>
                <div className="col-6 col-sm-3 d-flex align-items-center gap-1.5">
                  <ShieldCheck size={16} className="text-success flex-shrink-0" />
                  <span>100% Fixed Rates</span>
                </div>
                <div className="col-6 col-sm-3 d-flex align-items-center gap-1.5">
                  <Clock size={16} className="text-warning flex-shrink-0" />
                  <span>60m Airport Grace</span>
                </div>
                <div className="col-6 col-sm-3 d-flex align-items-center gap-1.5">
                  <Award size={16} className="text-warning flex-shrink-0" />
                  <span>Licensed Chauffeurs</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Embedded Search Concierge Widget */}
          <div id="transfer-concierge-anchor" className="mt-4">
            <CabSearchWidget
              onSearch={(params) => handlePerformSearch(params, true)}
              initialValues={searchParams}
              isSearching={isEstimating}
            />
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/* 2. LIVE VEHICLE TIERS SECTION                                            */}
      {/* Sedan, SUV, and VIP Van cards with database-backed authoritative fares   */}
      {/* ======================================================================== */}
      <section id="vehicle-selection-cards" className="py-5">
        <div className="container">
          {/* Interactive Route Trajectory Card (Authentic Backend Data) */}
          {estimateData && searchParams.pickup && searchParams.dropoff && (
            <div 
              className="card rounded-4 p-3 p-md-4 border mb-4 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 mb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-pill bg-dark text-warning px-3 py-1.5 fw-bold" style={{ fontSize: '0.75rem' }}>
                    {searchParams.primaryService === 'AIRPORT_TRANSFER' ? '✈️ Airport Transfer' :
                     searchParams.primaryService === 'HOTEL_TRANSFER' ? '🏨 Hotel Transfer' : '📍 Point-to-Point Private Transfer'}
                  </span>
                  {searchParams.bookingTiming === 'BOOK_NOW' ? (
                    <span className="badge rounded-pill bg-warning text-dark px-2.5 py-1.5 fw-bold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      ⚡ Immediate Request
                    </span>
                  ) : (
                    <span className="badge rounded-pill bg-light text-muted border px-2.5 py-1.5 fw-bold" style={{ fontSize: '0.72rem' }}>
                      📅 Scheduled: {searchParams.pickupDate} at {searchParams.pickupTime}
                    </span>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark border px-3 py-1.5 rounded-pill shadow-xs fw-bold" style={{ fontSize: '0.8rem' }}>
                    🛣️ {estimateData.distanceKm} km (Direct Route)
                  </span>
                  <span className="badge bg-light text-dark border px-3 py-1.5 rounded-pill shadow-xs fw-bold" style={{ fontSize: '0.8rem' }}>
                    ⏱️ ~{estimateData.durationMin} mins travel
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 rounded-pill fw-bold" style={{ fontSize: '0.8rem' }}>
                    ✓ 100% Tolls Included
                  </span>
                </div>
              </div>

              {/* Visual Trajectory Bar */}
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-5">
                  <div className="d-flex align-items-start gap-2.5">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center text-success flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#DCFCE7', width: '32px', height: '32px' }}
                    >
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                        Pickup Point
                      </div>
                      <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.92rem' }}>
                        {searchParams.pickup}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-2 text-center d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-center text-warning position-relative">
                    <div className="w-100 border-top border-2 border-warning opacity-50"></div>
                    <div className="position-absolute bg-white px-2 text-muted small fw-bold" style={{ fontSize: '0.72rem' }}>
                      {estimateData.distanceKm} km
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-5">
                  <div className="d-flex align-items-start gap-2.5">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center text-danger flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#FEE2E2', width: '32px', height: '32px' }}
                    >
                      <Navigation size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                        Drop-off Destination
                      </div>
                      <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.92rem' }}>
                        {searchParams.dropoff}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h2 className="fs-2 fw-black text-dark font-heading mb-1">
              Choose Your Transfer Service
            </h2>
            <p className="text-muted small mb-0">
              Guaranteed private vehicle dedicated exclusively to your group. Highway expressway tolls, fuel, and chauffeur meet &amp; greet included.
            </p>
          </div>

          {estimateError && (
            <div className="alert alert-warning rounded-3 small d-flex align-items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-warning flex-shrink-0" />
              <span>{estimateError}</span>
            </div>
          )}

          {/* Transfer Option Rows — Uber/Ola compact list style */}
          {isEstimating ? (
            <div className="d-flex flex-column gap-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-4 border p-4 bg-light placeholder-glow" style={{ height: '88px' }}>
                  <div className="spinner-grow spinner-grow-sm text-warning" role="status"></div>
                </div>
              ))}
            </div>
          ) : estimateData?.tiers && estimateData.tiers.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {estimateData.tiers.map(tier => (
                <CabVehicleCard
                  key={tier.tier}
                  tierData={tier}
                  isSelected={selectedTier?.tier === tier.tier}
                  onSelect={handleSelectTier}
                  distanceKm={estimateData.distanceKm}
                  durationMin={estimateData.durationMin}
                  targetCurrency={currentCurrency}
                  requestedPax={Number(searchParams.pax || 2)}
                />
              ))}
            </div>
          ) : (
            <div className="card rounded-4 p-5 text-center border bg-white">
              <Car size={36} className="text-muted mx-auto mb-2" />
              <h5 className="fw-bold text-dark">Calculating Chauffeur Fares...</h5>
              <p className="text-muted small mb-0">
                Please enter your Thailand pickup and destination to view live fares.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================================== */}
      {/* 3. POPULAR FIXED ROUTES SHOWCASE                                         */}
      {/* ======================================================================== */}
      <section className="py-5 border-top border-bottom" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-4">
            <span className="badge rounded-pill bg-warning text-dark px-3 py-1 mb-2 fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Popular Thailand Itineraries
            </span>
            <h3 className="fs-3 fw-black text-dark font-heading">
              Frequently Booked Private Transfers
            </h3>
            <p className="text-muted small">
              Fixed upfront prices with zero surge multipliers. Click any journey to instantly populate your booking.
            </p>
          </div>

          <div className="row g-3">
            {POPULAR_THAI_ROUTES.map(route => (
              <div key={route.id} className="col-12 col-sm-6 col-lg-3">
                <div 
                  onClick={() => handleQuickRouteSelect(route)}
                  className="card h-100 rounded-3 p-3 border shadow-xs cursor-pointer hover-shadow transition-all bg-white d-flex flex-column justify-content-between"
                  style={{ border: '1px solid #E2E8F0' }}
                >
                  <div>
                    <span className="badge bg-light text-dark mb-2" style={{ fontSize: '0.68rem' }}>
                      {route.tag}
                    </span>
                    <div className="small fw-bold text-dark mb-1 d-flex align-items-start gap-1">
                      <MapPin size={13} className="text-success mt-0.5 flex-shrink-0" />
                      <span className="text-truncate">{route.from}</span>
                    </div>
                    <div className="small fw-bold text-dark mb-2 d-flex align-items-start gap-1">
                      <MapPin size={13} className="text-danger mt-0.5 flex-shrink-0" />
                      <span className="text-truncate">{route.to}</span>
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                      {route.distanceKm} km • ~{route.durationMin} mins
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top">
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>From</span>
                      <span className="fw-black text-dark font-heading" style={{ fontSize: '0.95rem' }}>
                        ฿{route.sedanFrom.toLocaleString()} THB
                      </span>
                    </div>
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '28px', height: '28px', backgroundColor: '#0B132B', color: '#D4AF37' }}
                    >
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/* 4. THE ROYAL SIAM STANDARD                                               */}
      {/* ======================================================================== */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-4">
            <h3 className="fs-3 fw-black text-dark font-heading">
              The Royal Siam Standard
            </h3>
            <p className="text-muted small">
              Every transfer is managed by certified professional chauffeurs committed to safety, punctuality, and gracious Thai hospitality.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-md-4">
              <div className="card rounded-4 p-4 border shadow-xs h-100 bg-white">
                <div 
                  className="rounded-3 p-3 mb-3 d-inline-flex align-items-center justify-content-center text-warning"
                  style={{ backgroundColor: '#0B132B', width: '48px', height: '48px' }}
                >
                  <Plane size={24} />
                </div>
                <h5 className="fw-bold text-dark font-heading">Terminal Meet &amp; Greet</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.5 }}>
                  Your chauffeur greets you at Arrival Gate with a personalized name placard. We assist with luggage from terminal doors directly to your private air-conditioned vehicle.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card rounded-4 p-4 border shadow-xs h-100 bg-white">
                <div 
                  className="rounded-3 p-3 mb-3 d-inline-flex align-items-center justify-content-center text-warning"
                  style={{ backgroundColor: '#0B132B', width: '48px', height: '48px' }}
                >
                  <ShieldCheck size={24} />
                </div>
                <h5 className="fw-bold text-dark font-heading">Secure 4-Digit Ride OTP</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.5 }}>
                  Your safety is paramount. Every transfer generates a private cryptographic code that must be matched before departure, guaranteeing you enter the exact vehicle assigned to you.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card rounded-4 p-4 border shadow-xs h-100 bg-white">
                <div 
                  className="rounded-3 p-3 mb-3 d-inline-flex align-items-center justify-content-center text-warning"
                  style={{ backgroundColor: '#0B132B', width: '48px', height: '48px' }}
                >
                  <Clock size={24} />
                </div>
                <h5 className="fw-bold text-dark font-heading">Flight Delay Protection</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: 1.5 }}>
                  We monitor Thai airspace radar in real-time. If your incoming flight is delayed, your complimentary 60-minute waiting window adjusts automatically at zero extra cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/* 5. MODALS & DRAWERS                                                      */}
      {/* ======================================================================== */}
      {isBookingModalOpen && selectedTier && (
        <CabBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          selectedTier={selectedTier}
          searchParams={searchParams}
          currentUser={currentUser}
          onOpenTracking={handleOpenTrackingFromBooking}
        />
      )}

      {isTrackingModalOpen && activeTrackingDispatchId && (
        <CabLiveTrackingModal
          isOpen={isTrackingModalOpen}
          onClose={() => setIsTrackingModalOpen(false)}
          dispatchId={activeTrackingDispatchId}
          onRideCancelled={() => {}}
        />
      )}

      {isHistoryDrawerOpen && (
        <CabRideHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          onTrackRide={(dispatchId) => {
            setActiveTrackingDispatchId(dispatchId);
            setIsTrackingModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
