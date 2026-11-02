// ========================================================================
// WOW THAILAND: Royal Siam Mobility - Transfer Concierge Search Widget
// 3 Primary Services: Airport Transfer, Hotel Transfer, Point-to-Point
// Timing modes: "Schedule for Later" & "Book Now" (Immediate Request)
// Bootstrap 5 + Royal Siam theme (Midnight Navy & Champagne Gold)
// ========================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, MapPin, Calendar, Clock, Users, Briefcase, 
  Search, Compass, Building, Navigation, ArrowLeftRight, Check, X,
  ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';

export const THAILAND_HUBS = [
  // Major International & Regional Airports
  { id: 'bkk-airport', name: 'Suvarnabhumi Airport (BKK)', type: 'AIRPORT', tag: 'International Gate 3 & 4', city: 'Bangkok' },
  { id: 'dmk-airport', name: 'Don Mueang Airport (DMK)', type: 'AIRPORT', tag: 'Domestic & Regional Terminal', city: 'Bangkok' },
  { id: 'hkt-airport', name: 'Phuket International Airport (HKT)', type: 'AIRPORT', tag: 'Andaman Gateway', city: 'Phuket' },
  { id: 'cnx-airport', name: 'Chiang Mai Airport (CNX)', type: 'AIRPORT', tag: 'Northern Gateway', city: 'Chiang Mai' },

  // Key Cities & Popular Tourist Districts
  { id: 'bkk-central', name: 'Bangkok City (Sukhumvit / Silom / Riverside)', type: 'CITY', tag: 'Central Bangkok', city: 'Bangkok' },
  { id: 'bkk-sukhumvit', name: 'Sukhumvit (Asok / Phrom Phong / Thong Lo)', type: 'HOTEL', tag: 'Hotels & Dining District', city: 'Bangkok' },
  { id: 'bkk-sathorn', name: 'Silom & Sathorn Financial District', type: 'HOTEL', tag: 'Luxury Hotels', city: 'Bangkok' },
  { id: 'pattaya-city', name: 'Pattaya Beach & Walking Street', type: 'CITY', tag: 'Gulf Coast Beach Hotels', city: 'Pattaya' },
  { id: 'jomtien-beach', name: 'Jomtien Beach Resorts', type: 'BEACH', tag: 'South Pattaya', city: 'Pattaya' },
  { id: 'phuket-patong', name: 'Patong Beach Phuket', type: 'BEACH', tag: 'Central Beach & Resorts', city: 'Phuket' },
  { id: 'phuket-kata', name: 'Kata & Karon Beach Resorts', type: 'BEACH', tag: 'South Phuket Resorts', city: 'Phuket' },
  { id: 'phuket-laguna', name: 'Bang Tao & Laguna Phuket', type: 'BEACH', tag: 'Luxury Villas & Golf', city: 'Phuket' },
  { id: 'krabi-aonang', name: 'Ao Nang Beach & Railay Pier', type: 'BEACH', tag: 'Krabi Mainland', city: 'Krabi' },
  { id: 'huahin-city', name: 'Hua Hin City & Beach Resorts', type: 'CITY', tag: 'Royal Coast', city: 'Hua Hin' },

  // Renowned Hotels & Piers
  { id: 'hotel-berkeley', name: 'The Berkeley Hotel Pratunam, Bangkok', type: 'HOTEL', tag: 'Pratunam Shopping Area', city: 'Bangkok' },
  { id: 'hotel-grand-hyatt', name: 'Grand Hyatt Erawan Bangkok', type: 'HOTEL', tag: 'Ratchaprasong Central', city: 'Bangkok' },
  { id: 'hotel-hilton-pattaya', name: 'Hilton Pattaya Beach Resort', type: 'HOTEL', tag: 'Beachfront Hotel', city: 'Pattaya' },
  { id: 'hotel-amari-phuket', name: 'Amari Phuket Resort', type: 'HOTEL', tag: 'Patong Bay View', city: 'Phuket' },
  { id: 'pier-rassada', name: 'Rassada Pier Phuket (Ferry to Phi Phi)', type: 'PIER', tag: 'Island Speedboat Terminal', city: 'Phuket' },
  { id: 'pier-bali-hai', name: 'Bali Hai Pier Pattaya (Ferry to Koh Larn)', type: 'PIER', tag: 'Pattaya Pier', city: 'Pattaya' }
];

export const PRIMARY_SERVICES = [
  { 
    id: 'AIRPORT_TRANSFER', 
    label: 'Airport Transfer', 
    icon: Plane, 
    desc: 'Airport Pickup or Drop with flight delay monitoring' 
  },
  { 
    id: 'HOTEL_TRANSFER', 
    label: 'Hotel Transfer', 
    icon: Building, 
    desc: 'Resort to resort or hotel to destination' 
  },
  { 
    id: 'POINT_TO_POINT', 
    label: 'Point-to-Point Private Transfer', 
    icon: Compass, 
    desc: 'Flexible private transfer anywhere in Thailand' 
  }
];

export default function CabSearchWidget({
  onSearch,
  initialValues = {},
  isSearching = false
}) {
  const [primaryService, setPrimaryService] = useState(
    initialValues.transferType?.includes('AIRPORT') ? 'AIRPORT_TRANSFER' : 
    (initialValues.transferType === 'HOTEL_TRANSFER' ? 'HOTEL_TRANSFER' : 'AIRPORT_TRANSFER')
  );
  
  // For Airport Transfer: Pickup vs Drop
  const [airportMode, setAirportMode] = useState(
    initialValues.transferType === 'AIRPORT_DROP' ? 'DROP' : 'PICKUP'
  );

  // Booking Timing Mode: SCHEDULED (default) vs BOOK_NOW (immediate request)
  const [bookingTiming, setBookingTiming] = useState('SCHEDULED');

  const [pickup, setPickup] = useState(initialValues.pickup || 'Suvarnabhumi Airport (BKK)');
  const [dropoff, setDropoff] = useState(initialValues.dropoff || 'Bangkok City (Sukhumvit / Silom / Riverside)');
  
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  
  const [pickupTime, setPickupTime] = useState(initialValues.pickupTime || '14:00');
  const [pax, setPax] = useState(initialValues.pax || 2);
  const [luggage, setLuggage] = useState(initialValues.luggage || 2);

  // Dropdown Autocomplete state
  const [pickupOpen, setPickupOpen] = useState(false);
  const [dropoffOpen, setDropoffOpen] = useState(false);

  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickupRef.current && !pickupRef.current.contains(e.target)) setPickupOpen(false);
      if (dropoffRef.current && !dropoffRef.current.contains(e.target)) setDropoffOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When switching to BOOK_NOW, set to today's date and current time
  const handleTimingChange = (timing) => {
    setBookingTiming(timing);
    if (timing === 'BOOK_NOW') {
      const now = new Date();
      setPickupDate(now.toISOString().slice(0, 10));
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setPickupTime(`${hours}:${minutes}`);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPickupDate(tomorrow.toISOString().slice(0, 10));
      setPickupTime('14:00');
    }
  };

  // Switch primary service presets
  const handleSelectService = (serviceId) => {
    setPrimaryService(serviceId);
    if (serviceId === 'AIRPORT_TRANSFER') {
      if (airportMode === 'PICKUP') {
        setPickup('Suvarnabhumi Airport (BKK)');
        setDropoff('Bangkok City (Sukhumvit / Silom / Riverside)');
      } else {
        setPickup('Bangkok City (Sukhumvit / Silom / Riverside)');
        setDropoff('Suvarnabhumi Airport (BKK)');
      }
    } else if (serviceId === 'HOTEL_TRANSFER') {
      setPickup('The Berkeley Hotel Pratunam, Bangkok');
      setDropoff('Hilton Pattaya Beach Resort');
    } else if (serviceId === 'POINT_TO_POINT') {
      setPickup('Bangkok City (Sukhumvit / Silom / Riverside)');
      setDropoff('Pattaya Beach & Walking Street');
    }
  };

  const handleAirportModeToggle = (mode) => {
    setAirportMode(mode);
    if (mode === 'PICKUP') {
      setPickup('Suvarnabhumi Airport (BKK)');
      setDropoff('Bangkok City (Sukhumvit / Silom / Riverside)');
    } else {
      setPickup('Bangkok City (Sukhumvit / Silom / Riverside)');
      setDropoff('Suvarnabhumi Airport (BKK)');
    }
  };

  const filteredPickups = THAILAND_HUBS.filter(h => 
    !pickup || h.name.toLowerCase().includes(pickup.toLowerCase()) || h.city.toLowerCase().includes(pickup.toLowerCase())
  );

  const filteredDropoffs = THAILAND_HUBS.filter(h => 
    !dropoff || h.name.toLowerCase().includes(dropoff.toLowerCase()) || h.city.toLowerCase().includes(dropoff.toLowerCase())
  );

  const handleSwapLocations = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPickupOpen(false);
    setDropoffOpen(false);

    let effectiveType = 'POINT_TO_POINT';
    if (primaryService === 'AIRPORT_TRANSFER') {
      effectiveType = airportMode === 'PICKUP' ? 'AIRPORT_PICKUP' : 'AIRPORT_DROP';
    } else if (primaryService === 'HOTEL_TRANSFER') {
      effectiveType = 'HOTEL_TRANSFER';
    }

    if (onSearch) {
      onSearch({
        transferType: effectiveType,
        primaryService,
        bookingTiming,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        pickupDate,
        pickupTime,
        pax,
        luggage
      });
    }
  };

  return (
    <div 
      className="card border-0 rounded-4 shadow-lg p-3 p-md-4 position-relative" 
      style={{ 
        backgroundColor: '#0B132B', 
        border: '1px solid rgba(212, 175, 55, 0.35)', 
        color: '#FDFBF7' 
      }}
    >
      {/* 1. THREE PRIMARY SERVICES (Airport, Hotel, Point-to-Point) */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom border-secondary">
        <div className="d-flex align-items-center gap-2 overflow-x-auto text-nowrap">
          {PRIMARY_SERVICES.map(s => {
            const IconComp = s.icon;
            const isActive = primaryService === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectService(s.id)}
                className="btn btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 fw-bold text-nowrap transition-all"
                style={{
                  backgroundColor: isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#0B132B' : '#E2E8F0',
                  border: isActive ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isActive ? '0 4px 12px rgba(212, 175, 55, 0.3)' : 'none'
                }}
              >
                <IconComp size={15} style={{ color: isActive ? '#0B132B' : '#D4AF37' }} />
                <span style={{ fontSize: '0.85rem' }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* BOOK NOW vs SCHEDULE FOR LATER TOGGLE */}
        <div className="d-flex align-items-center bg-dark p-1 rounded-pill border border-secondary">
          <button
            type="button"
            onClick={() => handleTimingChange('SCHEDULED')}
            className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold ${bookingTiming === 'SCHEDULED' ? 'text-dark' : 'text-white-50'}`}
            style={{
              backgroundColor: bookingTiming === 'SCHEDULED' ? '#D4AF37' : 'transparent',
              fontSize: '0.75rem',
              border: 'none'
            }}
          >
            Schedule Later
          </button>
          <button
            type="button"
            onClick={() => handleTimingChange('BOOK_NOW')}
            className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold ${bookingTiming === 'BOOK_NOW' ? 'text-dark' : 'text-white-50'}`}
            style={{
              backgroundColor: bookingTiming === 'BOOK_NOW' ? '#D4AF37' : 'transparent',
              fontSize: '0.75rem',
              border: 'none'
            }}
          >
            ⚡ Book Now
          </button>
        </div>
      </div>

      {/* Sub-toggle for Airport Mode (Pickup vs Drop) */}
      {primaryService === 'AIRPORT_TRANSFER' && (
        <div className="d-flex align-items-center gap-2 mb-3 px-1">
          <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>Airport Direction:</span>
          <button
            type="button"
            onClick={() => handleAirportModeToggle('PICKUP')}
            className={`btn btn-xs rounded-pill px-2.5 py-0.5 fw-bold ${airportMode === 'PICKUP' ? 'btn-warning text-dark' : 'btn-outline-light text-white-50'}`}
            style={{ fontSize: '0.75rem' }}
          >
            Arrival Pickup (Terminal Meet & Greet)
          </button>
          <button
            type="button"
            onClick={() => handleAirportModeToggle('DROP')}
            className={`btn btn-xs rounded-pill px-2.5 py-0.5 fw-bold ${airportMode === 'DROP' ? 'btn-warning text-dark' : 'btn-outline-light text-white-50'}`}
            style={{ fontSize: '0.75rem' }}
          >
            Departure Drop-off (Hotel to Airport)
          </button>
        </div>
      )}

      {/* Notice for Immediate Requests */}
      {bookingTiming === 'BOOK_NOW' && (
        <div 
          className="alert rounded-3 py-1.5 px-3 mb-3 small d-flex align-items-center gap-2"
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: 'rgba(212, 175, 55, 0.4)', color: '#F1D78A', fontSize: '0.75rem' }}
        >
          <AlertCircle size={14} className="text-warning flex-shrink-0" />
          <span>
            <strong>Immediate Transfer Request:</strong> Chauffeur availability and dispatch will be confirmed by an active vendor upon request submission.
          </span>
        </div>
      )}

      {/* 2. Main Parameters Inputs Grid */}
      <form onSubmit={handleSearchSubmit}>
        <div className="row g-2 g-md-3 align-items-end">
          
          {/* Pickup Input */}
          <div className="col-12 col-md-3 position-relative" ref={pickupRef}>
            <label className="form-label text-warning mb-1 fw-bold text-uppercase d-flex align-items-center justify-content-between" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <span className="d-flex align-items-center gap-1">
                <MapPin size={13} className="text-warning" />
                <span>Pickup Location *</span>
              </span>
              <span className="text-muted text-capitalize" style={{ fontSize: '0.68rem', fontWeight: 500 }}>
                {primaryService === 'AIRPORT_TRANSFER' && airportMode === 'PICKUP' ? 'Select Airport Terminal' : 'Hotel, Airport, Address'}
              </span>
            </label>
            
            <div className="position-relative">
              <input
                type="text"
                value={pickup}
                onChange={(e) => {
                  setPickup(e.target.value);
                  setPickupOpen(true);
                }}
                onFocus={() => {
                  setPickupOpen(true);
                  setDropoffOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(e);
                }}
                placeholder={primaryService === 'HOTEL_TRANSFER' ? 'Enter hotel name or address...' : 'Enter pickup location...'}
                className="form-control rounded-3 py-2 ps-3 pe-4 fw-bold text-white shadow-xs"
                style={{
                  backgroundColor: '#1C2541',
                  borderColor: pickupOpen ? '#D4AF37' : 'rgba(255,255,255,0.2)',
                  height: '52px',
                  fontSize: '0.88rem'
                }}
              />
              {pickup && (
                <button
                  type="button"
                  onClick={() => { setPickup(''); setPickupOpen(true); }}
                  className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y text-muted p-0 me-2 text-decoration-none"
                  style={{ fontSize: '13px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Pickup Live Autocomplete Dropdown */}
            {pickupOpen && (
              <div 
                className="position-absolute start-0 end-0 mt-1 rounded-3 shadow-xl p-2 border z-3"
                style={{ backgroundColor: '#0B132B', borderColor: '#D4AF37', maxHeight: '280px', overflowY: 'auto' }}
              >
                {pickup.trim() && (
                  <div
                    onClick={() => setPickupOpen(false)}
                    className="p-2 mb-1 rounded-2 d-flex align-items-center gap-2 cursor-pointer border border-warning"
                    style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}
                  >
                    <MapPin size={14} className="text-warning flex-shrink-0" />
                    <div className="text-truncate">
                      <div className="fw-bold text-white small">Use &ldquo;{pickup.trim()}&rdquo;</div>
                      <div className="text-warning" style={{ fontSize: '0.68rem' }}>Custom Thailand Pickup Address</div>
                    </div>
                  </div>
                )}

                <div className="text-muted small fw-bold px-2 py-1 text-uppercase" style={{ fontSize: '0.68rem' }}>
                  Supported Hubs &amp; Hotels
                </div>

                {filteredPickups.slice(0, 8).map(hub => (
                  <div
                    key={hub.id}
                    onClick={() => { setPickup(hub.name); setPickupOpen(false); }}
                    className="p-2 rounded-2 d-flex align-items-center justify-content-between cursor-pointer hub-item"
                    style={{ backgroundColor: pickup === hub.name ? 'rgba(212,175,55,0.2)' : 'transparent' }}
                  >
                    <div className="text-truncate me-2">
                      <div className="fw-bold text-white text-truncate" style={{ fontSize: '0.82rem' }}>{hub.name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>{hub.city} • {hub.tag}</div>
                    </div>
                    {pickup === hub.name && <Check size={14} className="text-warning flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Swap Locations Button */}
          <div className="col-12 col-md-auto d-none d-md-flex justify-content-center pb-2">
            <button
              type="button"
              onClick={handleSwapLocations}
              title="Swap Pickup and Drop-off locations"
              className="btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center shadow-xs border transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(212,175,55,0.4)',
                color: '#D4AF37',
                width: '38px',
                height: '38px'
              }}
            >
              <ArrowLeftRight size={15} />
            </button>
          </div>

          {/* Dropoff Input */}
          <div className="col-12 col-md-3 position-relative" ref={dropoffRef}>
            <label className="form-label text-warning mb-1 fw-bold text-uppercase d-flex align-items-center justify-content-between" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <span className="d-flex align-items-center gap-1">
                <Navigation size={13} className="text-warning" />
                <span>Drop-off Destination *</span>
              </span>
              <span className="text-muted text-capitalize" style={{ fontSize: '0.68rem', fontWeight: 500 }}>
                {primaryService === 'AIRPORT_TRANSFER' && airportMode === 'DROP' ? 'Select Airport Terminal' : 'Hotel, Pier, City'}
              </span>
            </label>

            <div className="position-relative">
              <input
                type="text"
                value={dropoff}
                onChange={(e) => {
                  setDropoff(e.target.value);
                  setDropoffOpen(true);
                }}
                onFocus={() => {
                  setDropoffOpen(true);
                  setPickupOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(e);
                }}
                placeholder={primaryService === 'HOTEL_TRANSFER' ? 'Enter destination hotel or resort...' : 'Enter destination...'}
                className="form-control rounded-3 py-2 ps-3 pe-4 fw-bold text-white shadow-xs"
                style={{
                  backgroundColor: '#1C2541',
                  borderColor: dropoffOpen ? '#D4AF37' : 'rgba(255,255,255,0.2)',
                  height: '52px',
                  fontSize: '0.88rem'
                }}
              />
              {dropoff && (
                <button
                  type="button"
                  onClick={() => { setDropoff(''); setDropoffOpen(true); }}
                  className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y text-muted p-0 me-2 text-decoration-none"
                  style={{ fontSize: '13px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropoff Live Autocomplete Dropdown */}
            {dropoffOpen && (
              <div 
                className="position-absolute start-0 end-0 mt-1 rounded-3 shadow-xl p-2 border z-3"
                style={{ backgroundColor: '#0B132B', borderColor: '#D4AF37', maxHeight: '280px', overflowY: 'auto' }}
              >
                {dropoff.trim() && (
                  <div
                    onClick={() => setDropoffOpen(false)}
                    className="p-2 mb-1 rounded-2 d-flex align-items-center gap-2 cursor-pointer border border-warning"
                    style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}
                  >
                    <Navigation size={14} className="text-warning flex-shrink-0" />
                    <div className="text-truncate">
                      <div className="fw-bold text-white small">Use &ldquo;{dropoff.trim()}&rdquo;</div>
                      <div className="text-warning" style={{ fontSize: '0.68rem' }}>Custom Thailand Destination</div>
                    </div>
                  </div>
                )}

                <div className="text-muted small fw-bold px-2 py-1 text-uppercase" style={{ fontSize: '0.68rem' }}>
                  Supported Hubs &amp; Hotels
                </div>

                {filteredDropoffs.slice(0, 8).map(hub => (
                  <div
                    key={hub.id}
                    onClick={() => { setDropoff(hub.name); setDropoffOpen(false); }}
                    className="p-2 rounded-2 d-flex align-items-center justify-content-between cursor-pointer hub-item"
                    style={{ backgroundColor: dropoff === hub.name ? 'rgba(212,175,55,0.2)' : 'transparent' }}
                  >
                    <div className="text-truncate me-2">
                      <div className="fw-bold text-white text-truncate" style={{ fontSize: '0.82rem' }}>{hub.name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>{hub.city} • {hub.tag}</div>
                    </div>
                    {dropoff === hub.name && <Check size={14} className="text-warning flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div className="col-6 col-md-2">
            <label className="form-label text-warning mb-1 fw-bold text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <Calendar size={13} className="text-warning" />
              <span>{bookingTiming === 'BOOK_NOW' ? 'Today' : 'Date *'}</span>
            </label>
            <input
              type="date"
              disabled={bookingTiming === 'BOOK_NOW'}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="form-control rounded-3 py-2 px-2 fw-bold text-white"
              style={{ 
                backgroundColor: bookingTiming === 'BOOK_NOW' ? '#131A2F' : '#1C2541', 
                borderColor: 'rgba(255,255,255,0.18)', 
                height: '52px', 
                fontSize: '0.85rem' 
              }}
            />
          </div>

          {/* Time Selection */}
          <div className="col-6 col-md-1">
            <label className="form-label text-warning mb-1 fw-bold text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <Clock size={13} className="text-warning" />
              <span>{bookingTiming === 'BOOK_NOW' ? 'Now' : 'Time *'}</span>
            </label>
            <input
              type="time"
              disabled={bookingTiming === 'BOOK_NOW'}
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="form-control rounded-3 py-2 px-2 fw-bold text-white"
              style={{ 
                backgroundColor: bookingTiming === 'BOOK_NOW' ? '#131A2F' : '#1C2541', 
                borderColor: 'rgba(255,255,255,0.18)', 
                height: '52px', 
                fontSize: '0.85rem' 
              }}
            />
          </div>

          {/* Pax Selection */}
          <div className="col-6 col-md-1">
            <label className="form-label text-warning mb-1 fw-bold text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <Users size={13} className="text-warning" />
              <span>Pax</span>
            </label>
            <select
              value={pax}
              onChange={(e) => setPax(Number(e.target.value))}
              className="form-select rounded-3 py-2 px-2 fw-bold text-white"
              style={{ backgroundColor: '#1C2541', borderColor: 'rgba(255,255,255,0.18)', height: '52px', fontSize: '0.85rem' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n} style={{ backgroundColor: '#0B132B' }}>{n} Pax</option>
              ))}
            </select>
          </div>

          {/* Search CTA Button */}
          <div className="col-12 col-md-2">
            <button
              type="submit"
              disabled={isSearching}
              className="btn w-100 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow"
              style={{
                backgroundColor: '#D4AF37',
                color: '#0B132B',
                borderColor: '#D4AF37',
                height: '52px',
                fontSize: '0.92rem',
                letterSpacing: '0.02em'
              }}
            >
              {isSearching ? (
                <>
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>{bookingTiming === 'BOOK_NOW' ? 'Find Ride Now' : 'Check Fares'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
