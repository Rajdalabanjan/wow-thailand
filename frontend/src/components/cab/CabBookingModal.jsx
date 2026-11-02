// ========================================================================
// WOW THAILAND: Royal Siam Mobility - Chauffeur Booking & Confirmation Modal
// International country code selector, airport flight details, special requirements,
// passenger & luggage confirmation, genuine 4-digit ride OTP, and live tracking bridge
// ========================================================================

import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, Car, MapPin, Calendar, Clock, 
  Users, Briefcase, CreditCard, Banknote, QrCode, AlertCircle, 
  Plane, Sparkles, KeyRound, Copy, Check, ChevronRight, Navigation,
  Baby, Accessibility, CigaretteOff, CheckSquare, Square
} from 'lucide-react';
import { bookCabTransfer } from '../../services/api';

const COUNTRY_CODES = [
  { code: '+66', country: 'Thailand (TH)', flag: '🇹🇭' },
  { code: '+91', country: 'India (IN)', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada (US/CA)', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom (UK)', flag: '🇬🇧' },
  { code: '+65', country: 'Singapore (SG)', flag: '🇸🇬' },
  { code: '+61', country: 'Australia (AU)', flag: '🇦🇺' },
  { code: '+971', country: 'United Arab Emirates (UAE)', flag: '🇦🇪' },
  { code: '+60', country: 'Malaysia (MY)', flag: '🇲🇾' },
  { code: '+86', country: 'China (CN)', flag: '🇨🇳' },
  { code: '+81', country: 'Japan (JP)', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea (KR)', flag: '🇰🇷' },
  { code: '+49', country: 'Germany (DE)', flag: '🇩🇪' },
  { code: '+33', country: 'France (FR)', flag: '🇫🇷' },
  { code: '+7', country: 'Russia (RU)', flag: '🇷🇺' }
];

export default function CabBookingModal({
  isOpen,
  onClose,
  selectedTier,
  searchParams,
  currentUser = null,
  onBookingSuccess,
  onOpenTracking
}) {
  const [countryCode, setCountryCode] = useState('+66');
  const [phoneNational, setPhoneNational] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    pax: searchParams?.pax || selectedTier?.maxPax || 2,
    luggage: searchParams?.luggage || selectedTier?.maxLuggage || 2,
    flightNumber: '',
    arrivalTerminal: 'Terminal 1 / Main Arrival Hall',
    meetAndGreetText: '',
    specialRequirements: {
      childSeat: false,
      golfBags: false,
      nonSmoking: true,
      wheelchairAssistance: false
    },
    customNotes: '',
    paymentMethod: 'CASH'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        customerName: currentUser.name || currentUser.full_name || prev.customerName,
        customerEmail: currentUser.email || prev.customerEmail
      }));
      if (currentUser.phone) {
        setPhoneNational(currentUser.phone.replace(/^\+?\d{1,3}\s?/, ''));
      }
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (stored?.name || stored?.email) {
          setFormData(prev => ({
            ...prev,
            customerName: stored.name || prev.customerName,
            customerEmail: stored.email || prev.customerEmail
          }));
        }
      } catch (e) {}
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setConfirmedBooking(null);
      setCopiedOtp(false);
      if (searchParams) {
        setFormData(prev => ({
          ...prev,
          pax: searchParams.pax || prev.pax,
          luggage: searchParams.luggage || prev.luggage
        }));
      }
    }
  }, [isOpen, searchParams]);

  if (!isOpen || !selectedTier || !searchParams) return null;

  const fareThb = Number(selectedTier.fareThb || 0);
  const displayFare = Number(selectedTier.displayFare || fareThb);
  const symbol = selectedTier.symbol || '฿';
  const curr = selectedTier.currency || 'THB';
  const isAirportPickup = searchParams.transferType === 'AIRPORT_PICKUP' || 
    (searchParams.pickup && searchParams.pickup.toLowerCase().includes('airport'));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRequirementToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      specialRequirements: {
        ...prev.specialRequirements,
        [key]: !prev.specialRequirements[key]
      }
    }));
  };

  const handleCopyOtp = (otp) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.customerName.trim()) {
      setErrorMessage('Please enter lead passenger full name.');
      return;
    }
    if (!phoneNational.trim()) {
      setErrorMessage('Please provide an active mobile or WhatsApp contact number.');
      return;
    }
    if (!formData.customerEmail.trim() || !formData.customerEmail.includes('@')) {
      setErrorMessage('Please provide a valid email for your booking voucher.');
      return;
    }

    const fullPhoneNumber = `${countryCode} ${phoneNational.trim()}`;

    // Compile special instructions
    const specialReqNotes = [];
    if (formData.specialRequirements.childSeat) specialReqNotes.push('Child safety seat requested');
    if (formData.specialRequirements.golfBags) specialReqNotes.push('Golf bags / sports luggage space needed');
    if (formData.specialRequirements.nonSmoking) specialReqNotes.push('Non-smoking cabin');
    if (formData.specialRequirements.wheelchairAssistance) specialReqNotes.push('Wheelchair assistance at curbside');
    if (formData.customNotes.trim()) specialReqNotes.push(formData.customNotes.trim());
    if (formData.meetAndGreetText.trim()) specialReqNotes.push(`Placard: "${formData.meetAndGreetText.trim()}"`);
    if (formData.arrivalTerminal && isAirportPickup) specialReqNotes.push(`Arrival: ${formData.arrivalTerminal}`);

    setIsSubmitting(true);

    try {
      const payload = {
        tier: selectedTier.tier,
        pickupAddress: searchParams.pickup,
        dropoffAddress: searchParams.dropoff,
        travelDate: searchParams.pickupDate,
        travelTime: searchParams.pickupTime,
        pax: Number(formData.pax),
        luggage: Number(formData.luggage),
        flightNumber: formData.flightNumber.trim(),
        notes: specialReqNotes.join(' | '),
        paymentMethod: formData.paymentMethod,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: fullPhoneNumber,
        currency: curr
      };

      const result = await bookCabTransfer(payload);

      if (result.success) {
        const normalized = {
          ...result,
          rideOtp: result.rideOtp || result.data?.ride_otp,
          bookingReference: result.bookingReference || result.bookingId || result.data?.booking_id,
          dispatchId: result.dispatchId || result.data?.dispatch_id,
          fareThb: result.fareThb || result.data?.total_fare_thb
        };
        setConfirmedBooking(normalized);
        if (onBookingSuccess) {
          onBookingSuccess(normalized);
        }
      } else {
        setErrorMessage(result.error || 'Failed to complete booking. Please try again.');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while placing your reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
    >
      <div 
        className="card border-0 rounded-4 shadow-2xl overflow-hidden w-100"
        style={{ maxWidth: '680px', maxHeight: '92vh', backgroundColor: '#FFFFFF' }}
      >
        {/* Modal Header */}
        <div 
          className="d-flex align-items-center justify-content-between px-4 py-3 text-white"
          style={{ backgroundColor: '#0B132B', borderBottom: '1px solid rgba(212,175,55,0.3)' }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div 
              className="rounded-3 p-2 d-flex align-items-center justify-content-center text-warning"
              style={{ backgroundColor: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <Car size={20} />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-white font-heading" style={{ fontSize: '1rem' }}>
                {confirmedBooking ? 'Private Transfer Confirmed' : 'Confirm Transfer Reservation'}
              </h5>
              <div className="small text-warning" style={{ fontSize: '0.72rem' }}>
                WOW THAILAND Premium Mobility Concierge
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-sm btn-outline-light rounded-circle p-1 d-flex align-items-center justify-content-center"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 70px)', backgroundColor: '#F8FAFC' }}>
          {confirmedBooking ? (
            /* CONFIRMATION SCREEN */
            <div className="text-center py-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '64px', height: '64px', backgroundColor: '#DCFCE7', color: '#16A34A' }}
              >
                <CheckCircle2 size={36} />
              </div>

              <span className="badge rounded-pill bg-warning text-dark px-3 py-1 mb-2 fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                Transfer Confirmed
              </span>
              <h3 className="fw-black text-dark font-heading mt-1 mb-1">
                Sawasdee! Your Transfer is Booked
              </h3>
              <p className="text-muted small mb-4">
                A professional chauffeur has been scheduled for your Thailand journey.
              </p>

              {/* SECURE 4-DIGIT RIDE SECURITY OTP DISPLAY */}
              <div 
                className="rounded-4 p-4 text-white text-center shadow mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.4)' 
                }}
              >
                <div 
                  className="badge rounded-pill text-warning border border-warning px-3 py-1 mb-2 d-inline-flex align-items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', fontSize: '0.72rem' }}
                >
                  <KeyRound size={13} />
                  <span>Private Chauffeur Security Code</span>
                </div>

                <div className="d-flex align-items-center justify-content-center gap-2 my-2">
                  {String(confirmedBooking.rideOtp || '••••').split('').map((digit, idx) => (
                    <div 
                      key={idx}
                      className="rounded-3 bg-white text-dark d-flex align-items-center justify-content-center fw-black font-monospace shadow-sm"
                      style={{ width: '50px', height: '58px', fontSize: '1.8rem', border: '2px solid #D4AF37' }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <p className="small text-warning mb-2" style={{ fontSize: '0.78rem' }}>
                  Provide this 4-digit security code to your chauffeur when you meet them at pickup.
                </p>

                {confirmedBooking.rideOtp && (
                  <button
                    type="button"
                    onClick={() => handleCopyOtp(confirmedBooking.rideOtp)}
                    className="btn btn-sm btn-outline-light rounded-pill px-3 py-1 fw-bold d-inline-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                  >
                    {copiedOtp ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    <span>{copiedOtp ? 'Code Copied!' : 'Copy Code'}</span>
                  </button>
                )}
              </div>

              {/* Booking Reference Details */}
              <div className="card rounded-3 p-3 text-start border shadow-xs mb-4" style={{ backgroundColor: '#FFFFFF', fontSize: '0.8rem' }}>
                <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                  <div>
                    <span className="text-muted d-block small">Booking Reference:</span>
                    <span className="fw-black text-dark font-monospace">{confirmedBooking.bookingReference || confirmedBooking.bookingId}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-muted d-block small">Guaranteed Fare:</span>
                    <span className="fw-black text-dark font-heading">฿{confirmedBooking.fareThb} THB</span>
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Pickup:</span>
                    <span className="fw-bold text-dark">{searchParams.pickup}</span>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Destination:</span>
                    <span className="fw-bold text-dark">{searchParams.dropoff}</span>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Schedule:</span>
                    <span className="fw-bold text-dark">{searchParams.pickupDate} at {searchParams.pickupTime}</span>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Service:</span>
                    <span className="fw-bold text-dark">{selectedTier.name} ({formData.pax} Pax, {formData.luggage} Bags)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenTracking && confirmedBooking.dispatchId) {
                      onOpenTracking(confirmedBooking.dispatchId);
                    }
                  }}
                  className="btn btn-dark flex-grow-1 py-2.5 rounded-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2 shadow"
                  style={{ backgroundColor: '#0B132B', color: '#F1D78A', borderColor: '#D4AF37' }}
                >
                  <Navigation size={16} className="text-warning" />
                  <span>Track Chauffeur Live</span>
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline-secondary py-2.5 px-4 rounded-3 fw-bold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* RESERVATION FORM SCREEN */
            <form onSubmit={handleSubmit}>
              {errorMessage && (
                <div className="alert alert-danger py-2 px-3 rounded-3 small d-flex align-items-center gap-2 mb-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Journey Snapshot Card */}
              <div className="card rounded-3 p-3 border mb-3 shadow-xs" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                  <div>
                    <span className="badge rounded-pill bg-dark text-warning me-1 px-2 py-1">
                      {selectedTier.name}
                    </span>
                    <span className="text-success small fw-bold">✓ Expressway Tolls Included</span>
                  </div>
                  <div className="text-end">
                    <span className="fw-black text-dark font-heading fs-5">
                      {symbol} {displayFare.toLocaleString('en-US')}
                    </span>
                    {curr !== 'THB' && (
                      <span className="small text-muted d-block">
                        (฿{fareThb} THB)
                      </span>
                    )}
                  </div>
                </div>

                <div className="row g-2 small">
                  <div className="col-12 col-md-6 d-flex align-items-start gap-1.5">
                    <MapPin size={14} className="text-success mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>PICKUP</span>
                      <span className="fw-bold text-dark">{searchParams.pickup}</span>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 d-flex align-items-start gap-1.5">
                    <MapPin size={14} className="text-danger mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>DESTINATION</span>
                      <span className="fw-bold text-dark">{searchParams.dropoff}</span>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 d-flex align-items-center gap-1.5 text-muted">
                    <Calendar size={13} className="text-warning" />
                    <span>{searchParams.pickupDate} at {searchParams.pickupTime}</span>
                  </div>
                  <div className="col-12 col-md-6 d-flex align-items-center gap-1.5 text-muted">
                    <Clock size={13} className="text-warning" />
                    <span>60 mins complimentary wait time at airport</span>
                  </div>
                </div>
              </div>

              {/* Passenger & Luggage Counts */}
              <div className="mb-3">
                <label className="fw-bold small text-dark d-flex align-items-center gap-1 mb-2 text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  <Users size={14} className="text-warning" />
                  <span>Passengers &amp; Luggage Capacity</span>
                </label>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">Total Passengers *</label>
                    <select
                      name="pax"
                      value={formData.pax}
                      onChange={handleInputChange}
                      className="form-select form-select-sm rounded-3 py-2 fw-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">Total Large Bags *</label>
                    <select
                      name="luggage"
                      value={formData.luggage}
                      onChange={handleInputChange}
                      className="form-select form-select-sm rounded-3 py-2 fw-bold"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} Bag{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lead Passenger Contact Details with Country Code */}
              <div className="mb-3">
                <label className="fw-bold small text-dark d-flex align-items-center gap-1 mb-2 text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  <Users size={14} className="text-warning" />
                  <span>Lead Passenger Contact</span>
                </label>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label small text-muted mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      required
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="e.g. Somchai Wong"
                      className="form-control form-control-sm rounded-3 py-2"
                    />
                  </div>

                  <div className="col-12 col-md-5">
                    <label className="form-label small text-muted mb-1">Country Code *</label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="form-select form-select-sm rounded-3 py-2"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.country.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-7">
                    <label className="form-label small text-muted mb-1">Mobile / WhatsApp Number *</label>
                    <input
                      type="tel"
                      required
                      value={phoneNational}
                      onChange={(e) => setPhoneNational(e.target.value)}
                      placeholder="e.g. 81 234 5678"
                      className="form-control form-control-sm rounded-3 py-2"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small text-muted mb-1">Email Address (For Booking Voucher &amp; OTP) *</label>
                    <input
                      type="email"
                      name="customerEmail"
                      required
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      placeholder="e.g. traveler@domain.com"
                      className="form-control form-control-sm rounded-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Airport & Flight Details (for Airport Transfers) */}
              {isAirportPickup && (
                <div 
                  className="p-3 rounded-3 mb-3 border small"
                  style={{ backgroundColor: '#FEF9C3', borderColor: '#FDE047' }}
                >
                  <div className="fw-bold text-dark d-flex align-items-center gap-1.5 mb-1">
                    <Plane size={15} className="text-warning" />
                    <span>Airport Meet &amp; Greet &amp; Flight Monitoring</span>
                  </div>
                  <p className="text-muted mb-2" style={{ fontSize: '0.75rem', lineHeight: 1.35 }}>
                    Enter your flight number. Your chauffeur monitors flight radar in real-time, and adjusts waiting times automatically.
                  </p>

                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-muted mb-1">Flight Number</label>
                      <input
                        type="text"
                        name="flightNumber"
                        value={formData.flightNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. TG 679 or EK 384"
                        className="form-control form-control-sm rounded-2 text-uppercase fw-bold"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-muted mb-1">Meet &amp; Greet Placard Name</label>
                      <input
                        type="text"
                        name="meetAndGreetText"
                        value={formData.meetAndGreetText}
                        onChange={handleInputChange}
                        placeholder="Name on Placard (e.g. MR. SMITH)"
                        className="form-control form-control-sm rounded-2 text-uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Requirements */}
              <div className="card rounded-3 p-3 border mb-3 shadow-xs bg-white">
                <label className="fw-bold small text-dark d-flex align-items-center gap-1 mb-2 text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  <Sparkles size={14} className="text-warning" />
                  <span>Special Trip Requirements</span>
                </label>

                <div className="row g-2">
                  <div className="col-6">
                    <div 
                      onClick={() => handleRequirementToggle('childSeat')}
                      className={`p-2 rounded-2 border d-flex align-items-center gap-2 cursor-pointer ${
                        formData.specialRequirements.childSeat ? 'bg-warning-subtle border-warning' : 'bg-light'
                      }`}
                    >
                      {formData.specialRequirements.childSeat ? <CheckSquare size={15} className="text-warning" /> : <Square size={15} className="text-muted" />}
                      <span className="small text-dark fw-medium" style={{ fontSize: '0.78rem' }}>Child Safety Seat</span>
                    </div>
                  </div>

                  <div className="col-6">
                    <div 
                      onClick={() => handleRequirementToggle('golfBags')}
                      className={`p-2 rounded-2 border d-flex align-items-center gap-2 cursor-pointer ${
                        formData.specialRequirements.golfBags ? 'bg-warning-subtle border-warning' : 'bg-light'
                      }`}
                    >
                      {formData.specialRequirements.golfBags ? <CheckSquare size={15} className="text-warning" /> : <Square size={15} className="text-muted" />}
                      <span className="small text-dark fw-medium" style={{ fontSize: '0.78rem' }}>Golf Bags / Oversize</span>
                    </div>
                  </div>

                  <div className="col-6">
                    <div 
                      onClick={() => handleRequirementToggle('nonSmoking')}
                      className={`p-2 rounded-2 border d-flex align-items-center gap-2 cursor-pointer ${
                        formData.specialRequirements.nonSmoking ? 'bg-warning-subtle border-warning' : 'bg-light'
                      }`}
                    >
                      {formData.specialRequirements.nonSmoking ? <CheckSquare size={15} className="text-warning" /> : <Square size={15} className="text-muted" />}
                      <span className="small text-dark fw-medium" style={{ fontSize: '0.78rem' }}>Non-Smoking Cabin</span>
                    </div>
                  </div>

                  <div className="col-6">
                    <div 
                      onClick={() => handleRequirementToggle('wheelchairAssistance')}
                      className={`p-2 rounded-2 border d-flex align-items-center gap-2 cursor-pointer ${
                        formData.specialRequirements.wheelchairAssistance ? 'bg-warning-subtle border-warning' : 'bg-light'
                      }`}
                    >
                      {formData.specialRequirements.wheelchairAssistance ? <CheckSquare size={15} className="text-warning" /> : <Square size={15} className="text-muted" />}
                      <span className="small text-dark fw-medium" style={{ fontSize: '0.78rem' }}>Wheelchair Curbside</span>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <input
                      type="text"
                      name="customNotes"
                      value={formData.customNotes}
                      onChange={handleInputChange}
                      placeholder="Additional instructions for chauffeur (e.g. Hotel Tower B lobby)..."
                      className="form-control form-control-sm rounded-2"
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="mb-3">
                <label className="fw-bold small text-dark d-flex align-items-center gap-1 mb-2 text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  <CreditCard size={14} className="text-warning" />
                  <span>Payment Mode</span>
                </label>

                <div className="row g-2">
                  {[
                    { id: 'CASH', label: 'Cash on Arrival', desc: 'Pay THB to chauffeur', icon: Banknote },
                    { id: 'PROMPTPAY', label: 'PromptPay QR', desc: 'Instant Thai bank QR', icon: QrCode },
                    { id: 'CARD', label: 'Credit / Debit Card', desc: 'Visa, Master, JCB', icon: CreditCard }
                  ].map(m => {
                    const isSelected = formData.paymentMethod === m.id;
                    const IconComp = m.icon;
                    return (
                      <div key={m.id} className="col-4">
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: m.id }))}
                          className="p-2.5 rounded-3 border text-start cursor-pointer transition-all h-100"
                          style={{
                            backgroundColor: isSelected ? '#0B132B' : '#FFFFFF',
                            borderColor: isSelected ? '#D4AF37' : '#E2E8F0',
                            color: isSelected ? '#FFFFFF' : '#1E293B'
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <IconComp size={16} className={isSelected ? 'text-warning' : 'text-muted'} />
                            {isSelected && <Check size={12} className="text-warning" />}
                          </div>
                          <div className="fw-bold small" style={{ fontSize: '0.78rem' }}>{m.label}</div>
                          <div className="small text-muted" style={{ fontSize: '0.68rem', color: isSelected ? '#CBD5E1' : '#64748B' }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
                  style={{
                    backgroundColor: '#D4AF37',
                    color: '#0B132B',
                    borderColor: '#D4AF37',
                    fontSize: '0.95rem'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                      <span>Confirming Reservation...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Confirm Reservation • ฿{fareThb} THB</span>
                    </>
                  )}
                </button>
                <div className="text-center text-muted small mt-2 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={13} className="text-success" />
                  <span>Free cancellation up to 6 hours before scheduled transfer.</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
