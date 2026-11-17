// ========================================================================
// WOW THAILAND: Royal Siam Chauffeur Companion Portal (Phase 4)
// Professional driver dashboard, incoming duty offers, 5-stage trip lifecycle,
// secure 4-digit OTP verification gate, live GPS telemetry, toll & cash collection.
// ========================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TempleMark from '../../components/common/TempleMark';
import HoverGlider, { useEnterAnimation } from '../../components/common/HoverGlider';
import {
  Car, Shield, CheckCircle2, Clock, MapPin, Phone, MessageSquare,
  AlertCircle, RefreshCw, Calendar, User, LogOut, Check, X, Navigation,
  Award, ShieldCheck, ChevronRight, AlertTriangle, Bell, DollarSign,
  Compass, Radio, Sparkles, KeyRound, QrCode, Banknote, ArrowRight,
  ExternalLink, CheckSquare, Luggage, Users
} from 'lucide-react';
import * as api from '../../services/api';
import OtpVerifyPanel from '../../components/common/OtpVerifyPanel';

const PICKUP_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Pickup times are saved as Thailand (Asia/Bangkok) wall-clock time. The API returns them
// like "2026-11-13T10:00:00.000Z": the digits are already Thai time and the "Z" is only added
// by the database driver. So the digits are shown exactly as saved, with no timezone
// conversion, and labelled as Thailand time. Example: "13 November 2026, 10:00 AM".
function formatThaiPickupTime(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return String(value);
  const hour = Number(m[4]);
  return `${Number(m[3])} ${PICKUP_MONTHS[Number(m[2]) - 1]} ${m[1]}, ${hour % 12 || 12}:${m[5]} ${hour < 12 ? 'AM' : 'PM'}`;
}

export default function DriverPortalPage({ currentUser, onLogout, onNavigateHome }) {
  const driverUser = currentUser || JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('current_user') || '{}');

  // Core State
  const [activeTab, setActiveTab] = useState('active_duty'); // 'active_duty' | 'offers' | 'upcoming' | 'history'
  // Page content glides in smoothly whenever another tab / menu item is chosen
  const contentRef = React.useRef(null);
  useEnterAnimation(contentRef, activeTab);
  const [driverProfile, setDriverProfile] = useState(null);
  const [metrics, setMetrics] = useState({
    today_earnings_thb: 0,
    today_completed_trips: 0,
    total_completed_trips: 0,
    lifetime_earnings_thb: 0
  });
  const [activeDuty, setActiveDuty] = useState(null);
  const [dutyOffers, setDutyOffers] = useState([]);
  const [upcomingTransfers, setUpcomingTransfers] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);

  // UI Status State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [rideOtpStatus, setRideOtpStatus] = useState('idle'); // idle | verifying | success | error

  // Trip Completion & Toll Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [tollFee, setTollFee] = useState('0');
  const [cashCollectedConfirmed, setCashCollectedConfirmed] = useState(false);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [completeError, setCompleteError] = useState('');

  // Live GPS Telemetry State
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('initializing'); // 'active' | 'denied' | 'standby'
  const [lastGpsPingTime, setLastGpsPingTime] = useState(null);

  // Active Vehicle Selection State
  const [assignedVehicles, setAssignedVehicles] = useState([]);
  const [showVehicleSelectModal, setShowVehicleSelectModal] = useState(false);

  // -------------------------------------------------------------
  // 1. DATA LOADING & BACKGROUND REFRESH
  // -------------------------------------------------------------
  const loadDriverData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [summaryRes, offersRes, historyRes, vehRes] = await Promise.all([
        api.fetchDriverSummary().catch(() => ({ success: false })),
        api.fetchDriverDutyOffers().catch(() => ({ success: false, data: [] })),
        api.fetchDriverTrips().catch(() => ({ success: false, data: [] })),
        api.fetchDriverAssignedVehicles().catch(() => ({ success: false, data: [] }))
      ]);

      if (summaryRes.success && summaryRes.data) {
        const d = summaryRes.data;
        setDriverProfile(d.driver);
        setMetrics(d.metrics || {
          today_earnings_thb: 0,
          today_completed_trips: 0,
          total_completed_trips: 0,
          lifetime_earnings_thb: 0
        });
        setActiveDuty(d.active_duty);
        setUpcomingTransfers(d.upcoming_transfers || []);
        setIsOnline(d.driver?.status !== 'offline');
      }

      if (vehRes.success && Array.isArray(vehRes.data)) {
        setAssignedVehicles(vehRes.data);
      }

      if (offersRes.success && Array.isArray(offersRes.data)) {
        setDutyOffers(offersRes.data);
      }

      if (historyRes.success && Array.isArray(historyRes.data)) {
        setTripHistory(historyRes.data);
      }
    } catch (err) {
      if (!isSilent) console.error('Driver data load error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadDriverData();
    // 5-second polling for live dispatch synchronization
    const interval = setInterval(() => {
      loadDriverData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadDriverData]);

  // -------------------------------------------------------------
  // 2. LIVE GPS TELEMETRY PINGS (Actual Browser Coordinates)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    let watchId = null;

    const sendPing = async (pos) => {
      const { latitude, longitude, heading, speed } = pos.coords;
      setGpsCoords({ latitude, longitude });
      setGpsStatus('active');
      setLastGpsPingTime(new Date());

      // Send telemetry to backend
      try {
        await api.sendDriverLocationPing({
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          dispatch_id: activeDuty?.id || null
        });
      } catch (err) {
        console.warn('GPS ping failed:', err.message);
      }
    };

    const handleGpsSuccess = (pos) => {
      sendPing(pos);
    };

    const handleGpsError = (err) => {
      console.warn('GPS Geolocation Error:', err.message);
      setGpsStatus('standby');
    };

    // Watch position
    watchId = navigator.geolocation.watchPosition(handleGpsSuccess, handleGpsError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000
    });

    // Also send periodic ping every 15 seconds
    const pingTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendPing, handleGpsError, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
      });
    }, 15000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(pingTimer);
    };
  }, [activeDuty?.id]);

  // -------------------------------------------------------------
  // 2b. ACTIVE VEHICLE SELECTION BEFORE SHIFT
  // -------------------------------------------------------------
  const handleSelectVehicle = async (vehId) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.selectDriverActiveVehicle(vehId);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Active vehicle selected for shift.');
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowVehicleSelectModal(false);
        await loadDriverData(true);
      } else {
        setErrorMsg(res?.error || 'Failed to select vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. ONLINE / OFFLINE TOGGLE
  // -------------------------------------------------------------
  const handleToggleOnline = async () => {
    if (activeDuty) {
      setErrorMsg('Cannot go offline while on an active transfer duty.');
      setTimeout(() => setErrorMsg(''), 4500);
      return;
    }

    // If driver is currently offline and has assigned vehicles, allow checking vehicle
    if (!isOnline && assignedVehicles.length > 1 && !driverProfile?.active_vehicle_id) {
      setShowVehicleSelectModal(true);
      return;
    }

    const nextStatus = isOnline ? 'offline' : 'available';
    setActionLoading(true);
    try {
      const res = await api.toggleDriverDutyOnline(nextStatus);
      if (res.success) {
        setIsOnline(nextStatus === 'available');
        setSuccessMsg(res.message || `You are now ${nextStatus === 'available' ? 'ONLINE' : 'OFFLINE'}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadDriverData(true);
      } else {
        setErrorMsg(res.error || 'Failed to update online status.');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error updating online status.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. ACCEPT & DECLINE DUTY OFFERS (Row-Level Atomic Lock)
  // -------------------------------------------------------------
  const handleAcceptOffer = async (dispatchId) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.acceptDriverDuty(dispatchId);
      if (res.success) {
        setSuccessMsg('Transfer duty accepted! Chauffeur dispatch confirmed.');
        setTimeout(() => setSuccessMsg(''), 4500);
        setActiveTab('active_duty');
        await loadDriverData(true);
      } else {
        setErrorMsg(res.error || 'Duty is no longer available.');
        setTimeout(() => setErrorMsg(''), 5000);
        await loadDriverData(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'This duty was accepted by another chauffeur.');
      setTimeout(() => setErrorMsg(''), 5000);
      await loadDriverData(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOffer = async (dispatchId) => {
    setActionLoading(true);
    try {
      await api.rejectDriverDuty(dispatchId, 'Chauffeur declined offer');
      setDutyOffers(prev => prev.filter(o => o.id !== dispatchId));
      setSuccessMsg('Duty offer declined.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.warn('Decline error:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. TRIP LIFECYCLE: MARK ARRIVAL AT PICKUP
  // -------------------------------------------------------------
  const handleMarkArrival = async () => {
    if (!activeDuty) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.updateDriverDutyStatus({
        dispatch_id: activeDuty.id,
        status: 'ARRIVED',
        notes: 'Chauffeur arrived at pickup point'
      });
      if (res.success) {
        setSuccessMsg('Arrival recorded! Awaiting passenger 4-digit Ride OTP.');
        setTimeout(() => setSuccessMsg(''), 4500);
        await loadDriverData(true);
      } else {
        setErrorMsg(res.error || 'Failed to record arrival.');
        setTimeout(() => setErrorMsg(''), 4500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error recording arrival.');
      setTimeout(() => setErrorMsg(''), 4500);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 6. TRIP LIFECYCLE: SECURE 4-DIGIT RIDE OTP VERIFICATION
  // -------------------------------------------------------------
  const handleOpenOtpModal = () => {
    setOtpDigits(['', '', '', '']);
    setOtpError('');
    setRideOtpStatus('idle');
    setShowOtpModal(true); // the OTP boxes focus themselves
  };

  const handleVerifyOtpAndStartTrip = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (otpVerifying || rideOtpStatus === 'success') return;
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 4) {
      setOtpError('Please enter the complete 4-digit Passenger Security Code.');
      setRideOtpStatus('error');
      return;
    }

    setOtpVerifying(true);
    setOtpError('');
    setRideOtpStatus('verifying');
    try {
      const res = await api.updateDriverDutyStatus({
        dispatch_id: activeDuty.id,
        status: 'ON_TRIP',
        ride_otp: fullOtp
      });

      if (res.success) {
        // the panel plays "verified"; finishRideOtp() then closes the window
        setRideOtpStatus('success');
        loadDriverData(true);
      } else {
        setOtpError(res.error || 'Incorrect Ride OTP. Please re-check the passenger screen.');
        setRideOtpStatus('error');
      }
    } catch (err) {
      setOtpError(err.message || 'OTP verification failed. Please try again.');
      setRideOtpStatus('error');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Called by the OTP panel once its "Verified" animation has played
  const finishRideOtp = () => {
    setShowOtpModal(false);
    setRideOtpStatus('idle');
    setSuccessMsg('Ride OTP Verified! Journey is now in progress.');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // -------------------------------------------------------------
  // 7. TRIP LIFECYCLE: COMPLETE TRIP & CASH/TOLL COLLECTION
  // -------------------------------------------------------------
  const handleOpenCompleteModal = () => {
    setTollFee('0');
    setCashCollectedConfirmed(false);
    setCompleteError('');
    setShowCompleteModal(true);
  };

  const handleConfirmTripCompletion = async () => {
    if (!activeDuty) return;

    const isCashPayment = activeDuty.payment_method === 'CASH_TO_DRIVER' || 
      activeDuty.payment_method === 'CASH_ON_ARRIVAL' || 
      !activeDuty.payment_method || 
      activeDuty.tx_payment_status !== 'PAID';

    if (isCashPayment && !cashCollectedConfirmed) {
      setCompleteError('Please confirm that you have collected the full cash fare from the passenger.');
      return;
    }

    setIsCompletingTrip(true);
    setCompleteError('');

    try {
      const tollAmount = parseFloat(tollFee) || 0;
      const baseFare = parseFloat(activeDuty.total_fare_thb || 0);
      const finalFare = baseFare + tollAmount;

      // 1. If cash payment, record the cash transaction
      if (isCashPayment) {
        await api.recordDriverCashPayment(activeDuty.id, finalFare);
      }

      // 2. Complete the trip
      const completeRes = await api.updateDriverDutyStatus({
        dispatch_id: activeDuty.id,
        status: 'COMPLETED',
        toll_fee_thb: tollAmount
      });

      if (completeRes.success) {
        setShowCompleteModal(false);
        setSuccessMsg(`Trip completed successfully! Earned ฿${finalFare} THB.`);
        setTimeout(() => setSuccessMsg(''), 5000);
        await loadDriverData();
      } else {
        setCompleteError(completeRes.error || 'Failed to complete trip.');
      }
    } catch (err) {
      setCompleteError(err.message || 'Error completing trip. Please retry.');
    } finally {
      setIsCompletingTrip(false);
    }
  };

  // -------------------------------------------------------------
  // 8. RENDER: ROYAL SIAM CHAUFFEUR COMPANION UI
  // -------------------------------------------------------------
  const driverName = driverProfile?.name || driverUser?.name || 'Somchai Jaidee';
  const vehicleModel = driverProfile?.vehicle_model || 'Toyota Camry VIP';
  const vehiclePlate = driverProfile?.vehicle_plate || '1กข 4589';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#1E293B', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* TOP ROYAL SIAM NAVBAR */}
      <header 
        className="navbar sticky-top px-3 px-md-4 py-2.5 shadow-sm"
        style={{ backgroundColor: '#0B132B', borderBottom: '1px solid rgba(212,175,55,0.25)' }}
      >
        <div className="container-fluid d-flex align-items-center justify-content-between p-0">
          
          {/* Brand & Chauffeur Badge */}
          <div className="d-flex align-items-center gap-2.5">
            <div 
              onClick={onNavigateHome} 
              className="cursor-pointer d-flex align-items-center gap-2"
              title="Return to WOW THAILAND Home"
            >
              <TempleMark size={28} style={{ color: '#F5C518', flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(245, 197, 24, 0.4))' }} />
              <div>
                <span className="brand-wordmark text-white d-block" style={{ fontSize: '1rem' }}>
                  WOW <span className="brand-gold">THAILAND</span>
                </span>
                <span className="text-warning small d-block" style={{ fontSize: '0.66rem', letterSpacing: '0.08em', fontWeight: 600 }}>
                  ROYAL CHAUFFEUR COMPANION
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="d-flex align-items-center gap-2 gap-md-3">
            
            {/* GPS Telemetry Pill */}
            <div 
              className="d-none d-sm-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill border"
              style={{ 
                backgroundColor: gpsStatus === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)',
                borderColor: gpsStatus === 'active' ? '#22c55e' : '#64748b',
                fontSize: '0.72rem'
              }}
              title={gpsCoords ? `Lat: ${gpsCoords.latitude.toFixed(4)}, Lng: ${gpsCoords.longitude.toFixed(4)}` : 'GPS Searching...'}
            >
              <Radio size={12} className={gpsStatus === 'active' ? 'text-success' : 'text-secondary'} />
              <span className={gpsStatus === 'active' ? 'text-success fw-bold' : 'text-muted'}>
                {gpsStatus === 'active' ? 'GPS Active' : 'GPS Standby'}
              </span>
            </div>

            {/* Online / Offline Toggle Button */}
            <button
              type="button"
              onClick={handleToggleOnline}
              disabled={actionLoading}
              className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 transition-all shadow-xs"
              style={{
                backgroundColor: isOnline ? '#10B981' : '#334155',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.78rem'
              }}
              title={isOnline ? 'Click to pause duty (Go Offline)' : 'Click to start accepting transfers (Go Online)'}
            >
              <span 
                className="rounded-circle d-inline-block" 
                style={{ width: '8px', height: '8px', backgroundColor: isOnline ? '#A7F3D0' : '#94A3B8' }}
              />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDriverData(false)}
              disabled={loading}
              className="btn btn-outline-light btn-sm rounded-circle p-1.5 border-0 text-white-50"
              style={{ width: '34px', height: '34px', backgroundColor: 'rgba(255,255,255,0.08)' }}
              title="Refresh Transfers"
            >
              <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-outline-light btn-sm rounded-circle p-1.5 border-0 text-white-50"
              style={{ width: '34px', height: '34px', backgroundColor: 'rgba(255,255,255,0.08)' }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>

        </div>
      </header>

      {/* CHAUFFEUR IDENTITY & STATS BAR */}
      <section 
        className="px-3 px-md-4 py-3 border-bottom shadow-xs"
        style={{ backgroundColor: '#1C2541', color: '#FFFFFF' }}
      >
        <div className="container-fluid p-0">
          <div className="row g-3 align-items-center">
            
            {/* Driver Profile */}
            <div className="col-12 col-md-5 d-flex align-items-center gap-3">
              <div 
                className="rounded-circle overflow-hidden border border-2 border-warning flex-shrink-0 d-flex align-items-center justify-content-center"
                style={{ width: '52px', height: '52px', backgroundColor: '#0B132B' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
                  alt={driverName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold fs-6 text-white">{driverName}</span>
                  <span className="badge bg-warning text-dark font-monospace px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                    ★ 4.95
                  </span>
                </div>
                <div className="small text-white-50 d-flex align-items-center gap-2 mt-0.5" style={{ fontSize: '0.78rem' }}>
                  <span>{vehicleModel}</span>
                  <span>•</span>
                  <span className="badge bg-dark text-warning font-monospace px-2 py-0.5 border border-secondary" style={{ fontSize: '0.72rem' }}>
                    {vehiclePlate}
                  </span>
                  <button
                    onClick={() => setShowVehicleSelectModal(true)}
                    className="btn btn-sm btn-link p-0 text-decoration-none text-warning fw-bold ms-1"
                    style={{ fontSize: '0.72rem' }}
                    title="Change active vehicle for this shift"
                  >
                    Change Vehicle
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Metrics Cards */}
            <div className="col-12 col-md-7">
              <div className="row g-2">
                
                {/* Today's Earnings */}
                <div className="col-4">
                  <div className="p-2 rounded-3 border" style={{ backgroundColor: '#0B132B', borderColor: 'rgba(212,175,55,0.3)' }}>
                    <span className="text-white-50 d-block small" style={{ fontSize: '0.68rem' }}>TODAY'S FARE</span>
                    <span className="fw-black text-warning fs-6 font-heading">
                      ฿{Number(metrics.today_earnings_thb || 0).toLocaleString()}
                    </span>
                    <span className="text-white-50 small ms-1" style={{ fontSize: '0.65rem' }}>THB</span>
                  </div>
                </div>

                {/* Today's Completed Trips */}
                <div className="col-4">
                  <div className="p-2 rounded-3 border" style={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-white-50 d-block small" style={{ fontSize: '0.68rem' }}>COMPLETED TODAY</span>
                    <span className="fw-black text-white fs-6 font-heading">
                      {metrics.today_completed_trips || 0}
                    </span>
                    <span className="text-white-50 small ms-1" style={{ fontSize: '0.65rem' }}>trips</span>
                  </div>
                </div>

                {/* Lifetime Trips */}
                <div className="col-4">
                  <div className="p-2 rounded-3 border" style={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-white-50 d-block small" style={{ fontSize: '0.68rem' }}>LIFETIME TRIPS</span>
                    <span className="fw-black text-white fs-6 font-heading">
                      {metrics.total_completed_trips || 0}
                    </span>
                    <span className="text-success small ms-1" style={{ fontSize: '0.65rem' }}>✓ Certified</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEEDBACK NOTIFICATION BANNERS */}
      {successMsg && (
        <div className="container-fluid px-3 px-md-4 pt-3">
          <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 shadow-xs mb-0">
            <CheckCircle2 size={16} className="text-success flex-shrink-0" />
            <span className="small fw-semibold">{successMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="container-fluid px-3 px-md-4 pt-3">
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 shadow-xs mb-0">
            <AlertCircle size={16} className="text-danger flex-shrink-0" />
            <span className="small fw-semibold">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <main ref={contentRef} className="container-fluid px-3 px-md-4 py-3">
        
        {/* TAB NAVIGATION PILLS */}
        <HoverGlider className="d-flex align-items-center gap-2 border-bottom pb-2 mb-3 overflow-x-auto light-glide" gliderClassName="hover-glider--pill-light">
          
          <button
            type="button"
            id="tab-active-duty"
            onClick={() => setActiveTab('active_duty')}
            data-glide
            data-glide-active={activeTab === 'active_duty' ? 'true' : 'false'}
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 border ${
              activeTab === 'active_duty' ? 'btn-dark text-white' : 'btn-light text-muted'
            }`}
            style={{ fontSize: '0.82rem', borderColor: activeTab === 'active_duty' ? '#0B132B' : '#E2E8F0' }}
          >
            <Car size={15} className={activeTab === 'active_duty' ? 'text-warning' : ''} />
            <span>Active Duty</span>
            {activeDuty && (
              <span className="badge rounded-pill bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>
                LIVE
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-offers"
            onClick={() => setActiveTab('offers')}
            data-glide
            data-glide-active={activeTab === 'offers' ? 'true' : 'false'}
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 border ${
              activeTab === 'offers' ? 'btn-dark text-white' : 'btn-light text-muted'
            }`}
            style={{ fontSize: '0.82rem', borderColor: activeTab === 'offers' ? '#0B132B' : '#E2E8F0' }}
          >
            <Bell size={15} className={activeTab === 'offers' ? 'text-warning' : ''} />
            <span>Duty Offers</span>
            {dutyOffers.length > 0 && (
              <span className="badge rounded-pill bg-danger text-white ms-1" style={{ fontSize: '0.65rem' }}>
                {dutyOffers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-upcoming"
            onClick={() => setActiveTab('upcoming')}
            data-glide
            data-glide-active={activeTab === 'upcoming' ? 'true' : 'false'}
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 border ${
              activeTab === 'upcoming' ? 'btn-dark text-white' : 'btn-light text-muted'
            }`}
            style={{ fontSize: '0.82rem', borderColor: activeTab === 'upcoming' ? '#0B132B' : '#E2E8F0' }}
          >
            <Calendar size={15} />
            <span>Upcoming</span>
            {upcomingTransfers.length > 0 && (
              <span className="badge rounded-pill bg-secondary text-white ms-1" style={{ fontSize: '0.65rem' }}>
                {upcomingTransfers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-history"
            onClick={() => setActiveTab('history')}
            data-glide
            data-glide-active={activeTab === 'history' ? 'true' : 'false'}
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 border ${
              activeTab === 'history' ? 'btn-dark text-white' : 'btn-light text-muted'
            }`}
            style={{ fontSize: '0.82rem', borderColor: activeTab === 'history' ? '#0B132B' : '#E2E8F0' }}
          >
            <Clock size={15} />
            <span>Trip History</span>
          </button>

        </HoverGlider>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ACTIVE DUTY COMPANION (5-STAGE STATE MACHINE)           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'active_duty' && (
          <div>
            {activeDuty ? (
              <div 
                className="card rounded-4 border-0 shadow-lg overflow-hidden mb-4"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4AF37' }}
              >
                
                {/* Active Duty Status Header */}
                <div 
                  className="px-3 px-md-4 py-3 d-flex align-items-center justify-content-between text-white"
                  style={{ backgroundColor: '#0B132B', borderBottom: '2px solid #D4AF37' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span 
                      className="rounded-circle d-inline-block bg-warning"
                      style={{ width: '10px', height: '10px', boxShadow: '0 0 10px #D4AF37' }}
                    />
                    <div>
                      <span className="fw-bold font-heading text-white fs-6 d-block">
                        Active Transfer Duty
                      </span>
                      <span className="text-white-50 small" style={{ fontSize: '0.72rem' }}>
                        Ref #{activeDuty.booking_id || activeDuty.id}
                      </span>
                    </div>
                  </div>

                  <div>
                    {activeDuty.ride_status === 'DISPATCHED' && (
                      <span className="badge rounded-pill bg-warning text-dark fw-bold px-3 py-1.5" style={{ fontSize: '0.78rem' }}>
                        EN ROUTE TO PICKUP
                      </span>
                    )}
                    {activeDuty.ride_status === 'ARRIVED' && (
                      <span className="badge rounded-pill bg-warning text-dark fw-bold px-3 py-1.5" style={{ fontSize: '0.78rem' }}>
                        ARRIVED • AWAITING OTP
                      </span>
                    )}
                    {activeDuty.ride_status === 'ON_TRIP' && (
                      <span className="badge rounded-pill bg-success text-white fw-bold px-3 py-1.5" style={{ fontSize: '0.78rem' }}>
                        JOURNEY IN PROGRESS
                      </span>
                    )}
                  </div>
                </div>

                {/* 5-Stage Journey Progress Line */}
                <div className="p-3 bg-light border-bottom">
                  <div className="d-flex align-items-center justify-content-between position-relative px-2">
                    <div 
                      className="position-absolute start-0 end-0 top-50 translate-middle-y z-0" 
                      style={{ height: '3px', backgroundColor: '#E2E8F0' }}
                    />
                    {[
                      { key: 'ALLOCATED', label: '1. Allocated' },
                      { key: 'DISPATCHED', label: '2. En Route' },
                      { key: 'ARRIVED', label: '3. Arrived' },
                      { key: 'ON_TRIP', label: '4. On Trip' },
                      { key: 'COMPLETED', label: '5. Completed' }
                    ].map((step, idx) => {
                      const stages = ['ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP', 'COMPLETED'];
                      const currentIdx = stages.indexOf(activeDuty.ride_status);
                      const isPastOrCurrent = currentIdx >= idx;
                      const isCurrent = stages[currentIdx] === step.key;

                      return (
                        <div key={step.key} className="d-flex flex-column align-items-center z-1">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center shadow-xs"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: isCurrent ? '#D4AF37' : isPastOrCurrent ? '#0B132B' : '#CBD5E1',
                              color: isCurrent ? '#0B132B' : '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            {isPastOrCurrent && !isCurrent ? <Check size={13} /> : idx + 1}
                          </div>
                          <span 
                            className="small mt-1 text-center" 
                            style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCurrent ? '#0B132B' : '#64748B' 
                            }}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Duty Details Body */}
                <div className="p-3 p-md-4">
                  <div className="row g-3">
                    
                    {/* Route Specification */}
                    <div className="col-12 col-md-7">
                      <div className="p-3 rounded-3 border bg-light h-100">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-dark text-warning px-2 py-1 font-monospace" style={{ fontSize: '0.7rem' }}>
                            {activeDuty.transfer_type || 'AIRPORT PICKUP'}
                          </span>
                          <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>
                            Scheduled: {formatThaiPickupTime(activeDuty.pickup_datetime)}{activeDuty.pickup_datetime ? ' Thailand time' : ''}
                          </span>
                        </div>

                        {/* Origin */}
                        <div className="d-flex align-items-start gap-2 mb-3">
                          <MapPin size={18} className="text-success flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>PICKUP POINT</span>
                            <span className="fw-bold text-dark fs-6 d-block">{activeDuty.pickup_address}</span>
                          </div>
                        </div>

                        {/* Destination */}
                        <div className="d-flex align-items-start gap-2">
                          <Navigation size={18} className="text-danger flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>DROP-OFF DESTINATION</span>
                            <span className="fw-bold text-dark fs-6 d-block">{activeDuty.dropoff_address}</span>
                          </div>
                        </div>

                        {/* Google Maps Shortcut */}
                        <div className="mt-3 pt-2 border-top">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                              activeDuty.ride_status === 'ON_TRIP' ? activeDuty.dropoff_address : activeDuty.pickup_address
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-dark btn-sm rounded-3 fw-bold d-inline-flex align-items-center gap-1.5"
                            style={{ fontSize: '0.78rem' }}
                          >
                            <ExternalLink size={13} />
                            <span>Navigate with Google Maps</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Passenger & Fare Summary */}
                    <div className="col-12 col-md-5">
                      <div className="p-3 rounded-3 border h-100 d-flex flex-column justify-content-between" style={{ backgroundColor: '#FDFBF7' }}>
                        
                        {/* Passenger Card */}
                        <div>
                          <span className="text-muted small d-block mb-1" style={{ fontSize: '0.7rem' }}>PASSENGER CONTACT</span>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold text-dark fs-6">
                              {activeDuty.customer_name || 'Khun Passenger'}
                            </span>
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                              {activeDuty.passenger_count || 2} Pax • {activeDuty.luggage_count || 2} Bags
                            </span>
                          </div>

                          {/* Quick Call & WhatsApp CTAs */}
                          <div className="row g-2 mb-3">
                            <div className="col-6">
                              <a
                                href={`tel:${activeDuty.customer_phone || '+66812345678'}`}
                                className="btn btn-light border w-100 btn-sm rounded-3 fw-bold d-inline-flex align-items-center justify-content-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <Phone size={13} className="text-success" />
                                <span>Call Passenger</span>
                              </a>
                            </div>
                            <div className="col-6">
                              <a
                                href={`https://wa.me/${(activeDuty.customer_phone || '+66812345678').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline-success w-100 btn-sm rounded-3 fw-bold d-inline-flex align-items-center justify-content-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <MessageSquare size={13} />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>

                          {/* Notes / Special Requests */}
                          {activeDuty.notes && (
                            <div className="p-2 rounded-2 bg-white border small text-muted mb-2" style={{ fontSize: '0.72rem' }}>
                              <span className="fw-bold text-dark d-block">Concierge Notes:</span>
                              {activeDuty.notes}
                            </div>
                          )}
                        </div>

                        {/* Guaranteed Fare */}
                        <div className="pt-2 border-top">
                          <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>TOTAL TRIP FARE</span>
                          <div className="d-flex align-items-baseline gap-1">
                            <span className="fw-black text-dark fs-4 font-heading">
                              ฿{Number(activeDuty.total_fare_thb || 0).toLocaleString()}
                            </span>
                            <span className="text-muted small">THB</span>
                            <span className="badge bg-light text-muted ms-2 border" style={{ fontSize: '0.68rem' }}>
                              {activeDuty.tx_payment_status === 'PAID' ? '✓ Online Paid' : 'Cash on Arrival'}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* --------------------------------------------------------- */}
                  {/* DYNAMIC ACTION BUTTON BAR (CHAUFFEUR STATE MACHINE)        */}
                  {/* --------------------------------------------------------- */}
                  <div className="mt-4 pt-3 border-top">
                    
                    {/* Stage 1: En Route -> Mark Arrival */}
                    {activeDuty.ride_status === 'DISPATCHED' && (
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="small text-muted d-flex align-items-center gap-1.5">
                          <Navigation size={15} className="text-warning" />
                          <span>Drive safely to pickup location. Mark arrival once you are parked.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleMarkArrival}
                          disabled={actionLoading}
                          className="btn btn-warning px-4 py-2.5 rounded-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                          style={{ backgroundColor: '#D4AF37', color: '#0B132B', border: 'none' }}
                        >
                          <MapPin size={16} />
                          <span>Mark Arrived at Pickup</span>
                        </button>
                      </div>
                    )}

                    {/* Stage 2: Arrived -> Verify Passenger 4-Digit OTP */}
                    {activeDuty.ride_status === 'ARRIVED' && (
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="small text-muted d-flex align-items-center gap-1.5">
                          <KeyRound size={16} className="text-warning flex-shrink-0" />
                          <span>Passenger is boarding. Ask for their 4-digit code to start trip.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenOtpModal}
                          className="btn px-4 py-2.5 rounded-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                          style={{ backgroundColor: '#0B132B', color: '#D4AF37', border: '1px solid #D4AF37' }}
                        >
                          <KeyRound size={16} />
                          <span>Verify Passenger OTP & Start Trip</span>
                        </button>
                      </div>
                    )}

                    {/* Stage 3: On Trip -> Complete Trip & Settle Fare */}
                    {activeDuty.ride_status === 'ON_TRIP' && (
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="small text-muted d-flex align-items-center gap-1.5">
                          <Car size={16} className="text-success flex-shrink-0" />
                          <span>Journey in progress. Once arrived at destination, complete trip and collect fare.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenCompleteModal}
                          className="btn btn-success px-4 py-2.5 rounded-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                        >
                          <CheckCircle2 size={16} />
                          <span>Complete Trip & Settle Fare</span>
                        </button>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div className="card rounded-4 p-5 text-center border-0 bg-white shadow-xs">
                <div 
                  className="rounded-circle p-3 d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}
                >
                  <Car size={32} />
                </div>
                <h5 className="fw-bold text-dark font-heading">No Active Transfer Duty</h5>
                <p className="text-muted small mx-auto" style={{ maxWidth: '420px' }}>
                  {isOnline 
                    ? 'You are currently ONLINE. New transfer duties will appear in the Duty Offers tab as soon as dispatches are assigned.'
                    : 'You are currently OFFLINE. Toggle the switch in the header to ONLINE to start receiving Thailand chauffeur duties.'}
                </p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('offers')}
                    className="btn btn-outline-dark btn-sm rounded-pill px-4 fw-bold"
                  >
                    View Duty Offers ({dutyOffers.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: INCOMING DUTY OFFERS                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'offers' && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="fw-bold text-dark font-heading mb-0">Incoming Transfer Offers</h6>
                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  Real-time dispatches available for acceptance across Thailand
                </span>
              </div>
              <span className="badge bg-dark text-warning px-2.5 py-1 rounded-pill" style={{ fontSize: '0.72rem' }}>
                {dutyOffers.length} available
              </span>
            </div>

            {dutyOffers.length > 0 ? (
              <div className="row g-3">
                {dutyOffers.map(offer => (
                  <div key={offer.id} className="col-12 col-lg-6">
                    <div 
                      className="card rounded-4 p-3 border shadow-xs h-100 d-flex flex-column justify-content-between"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      <div>
                        {/* Header: Transfer Type & Fare */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-light text-dark border px-2 py-1 font-monospace" style={{ fontSize: '0.7rem' }}>
                            {offer.transfer_type || 'AIRPORT PICKUP'} • {offer.vehicle_category || 'SEDAN'}
                          </span>
                          <div className="text-end">
                            <span className="fw-black text-warning fs-5 font-heading">
                              ฿{Number(offer.total_fare_thb || 0).toLocaleString()}
                            </span>
                            <span className="text-muted small ms-1" style={{ fontSize: '0.7rem' }}>THB</span>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="p-2.5 rounded-3 bg-light border mb-3">
                          <div className="d-flex align-items-start gap-2 mb-2">
                            <MapPin size={15} className="text-success flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-muted small d-block" style={{ fontSize: '0.66rem' }}>PICKUP</span>
                              <span className="fw-bold text-dark small d-block">{offer.pickup_address}</span>
                            </div>
                          </div>
                          <div className="d-flex align-items-start gap-2">
                            <Navigation size={15} className="text-danger flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-muted small d-block" style={{ fontSize: '0.66rem' }}>DESTINATION</span>
                              <span className="fw-bold text-dark small d-block">{offer.dropoff_address}</span>
                            </div>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="d-flex align-items-center gap-3 text-muted small mb-3" style={{ fontSize: '0.75rem' }}>
                          <span className="d-flex align-items-center gap-1">
                            <Calendar size={13} />
                            <span>{formatThaiPickupTime(offer.pickup_datetime)}{offer.pickup_datetime ? ' Thailand time' : ''}</span>
                          </span>
                          <span>•</span>
                          <span>~{offer.distance_km || 30} km</span>
                          <span>•</span>
                          <span>~{offer.estimated_minutes || 45} mins</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="row g-2 pt-2 border-top">
                        <div className="col-8">
                          <button
                            type="button"
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={actionLoading}
                            className="btn btn-warning w-100 btn-sm rounded-3 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 shadow-xs"
                            style={{ backgroundColor: '#D4AF37', color: '#0B132B', border: 'none' }}
                          >
                            <Check size={14} />
                            <span>Accept Duty • ฿{offer.total_fare_thb}</span>
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            type="button"
                            onClick={() => handleDeclineOffer(offer.id)}
                            disabled={actionLoading}
                            className="btn btn-outline-secondary w-100 btn-sm rounded-3 fw-semibold"
                            style={{ fontSize: '0.78rem' }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card rounded-4 p-5 text-center border-0 bg-white shadow-xs">
                <p className="text-muted small mb-0">
                  No incoming transfer offers available right now. Keep your portal online — new bookings from Bangkok, Phuket & Pattaya will appear here automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: UPCOMING SCHEDULED TRANSFERS                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'upcoming' && (
          <div>
            <h6 className="fw-bold text-dark font-heading mb-3">Upcoming Scheduled Transfers</h6>
            {upcomingTransfers.length > 0 ? (
              <div className="row g-3">
                {upcomingTransfers.map(item => (
                  <div key={item.id} className="col-12 col-md-6">
                    <div className="card rounded-4 p-3 border shadow-xs bg-white">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                          {item.transfer_type || 'AIRPORT PICKUP'}
                        </span>
                        <span className="fw-bold text-warning font-heading">฿{item.total_fare_thb} THB</span>
                      </div>
                      <div className="small text-muted mb-2">
                        <span className="fw-bold text-dark">{formatThaiPickupTime(item.pickup_datetime)}{item.pickup_datetime ? ' Thailand time' : ''}</span>
                      </div>
                      <div className="small text-dark mb-1">
                        <strong>From:</strong> {item.pickup_address}
                      </div>
                      <div className="small text-dark mb-2">
                        <strong>To:</strong> {item.dropoff_address}
                      </div>
                      <div className="small text-muted border-top pt-2">
                        Passenger: {item.customer_name || 'Confirmed Guest'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card rounded-4 p-5 text-center border-0 bg-white shadow-xs">
                <p className="text-muted small mb-0">No upcoming transfers scheduled for future dates.</p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: TRIP HISTORY & AUDIT LEDGER                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'history' && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="fw-bold text-dark font-heading mb-0">Chauffeur Trip History</h6>
                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  Authoritative record of completed journeys and collected fares
                </span>
              </div>
            </div>

            {tripHistory.length > 0 ? (
              <div className="card rounded-4 border-0 shadow-xs overflow-hidden bg-white">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                    <thead className="table-light text-muted small">
                      <tr>
                        <th>BOOKING REF</th>
                        <th>DATE & TIME</th>
                        <th>ROUTE</th>
                        <th>FARE (THB)</th>
                        <th>TOLL</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripHistory.map(trip => (
                        <tr key={trip.id}>
                          <td className="fw-bold font-monospace small">
                            {trip.booking_id || trip.id}
                          </td>
                          <td className="text-muted small">
                            {trip.pickup_datetime
                              ? `${formatThaiPickupTime(trip.pickup_datetime)} Thailand time`
                              : trip.created_at?.slice(0, 16)}
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: '200px' }}>
                                {trip.pickup_address}
                              </span>
                              <span className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                                ➔ {trip.dropoff_address}
                              </span>
                            </div>
                          </td>
                          <td className="fw-bold text-dark">
                            ฿{Number(trip.total_fare_thb || 0).toLocaleString()}
                          </td>
                          <td className="text-muted">
                            {trip.toll_fee_thb ? `฿${trip.toll_fee_thb}` : '—'}
                          </td>
                          <td>
                            {trip.ride_status === 'COMPLETED' ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">
                                ✓ Completed
                              </span>
                            ) : trip.ride_status === 'CANCELLED' ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">
                                ✗ Cancelled
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-dark border border-warning-subtle rounded-pill px-2 py-1">
                                {trip.ride_status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card rounded-4 p-5 text-center border-0 bg-white shadow-xs">
                <p className="text-muted small mb-0">No trip history records found for this chauffeur profile.</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* --------------------------------------------------------------- */}
      {/* MODAL 1: SECURE 4-DIGIT PASSENGER RIDE OTP GATE                */}
      {/* --------------------------------------------------------------- */}
      {showOtpModal && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1080 }}
        >
          {/* Glassy OTP panel: the boxes orbit while the code is checked. The driver still
              presses the button: a trip never starts by itself. */}
          <div className="position-relative w-100" style={{ maxWidth: '440px' }}>
            <button
              type="button"
              onClick={() => { setShowOtpModal(false); setRideOtpStatus('idle'); }}
              className="btn btn-sm rounded-circle p-1 border-0 position-absolute"
              style={{ top: '14px', right: '14px', zIndex: 5, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.08)' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <OtpVerifyPanel
              length={4}
              value={otpDigits.join('')}
              onChange={(code) => {
                setOtpDigits(Array.from({ length: 4 }, (_, i) => code[i] || ''));
                setOtpError('');
                if (rideOtpStatus === 'error') setRideOtpStatus('idle');
              }}
              onSubmit={() => handleVerifyOtpAndStartTrip()}
              status={rideOtpStatus}
              errorMessage={otpError}
              onSuccessDone={finishRideOtp}
              title="Verify"
              highlight="Ride OTP"
              subtitle="Ask the passenger for the 4-digit security code shown on their booking confirmation screen."
              submitLabel="Confirm OTP & Start Journey"
              verifyingLabel="Verifying code…"
              successTitle="Journey"
              successHighlight="Started"
              successSubtitle="Passenger verified. Have a safe trip!"
              label="4-digit passenger ride code"
            >
              <span className="d-inline-block px-3 py-1 rounded-pill fw-bold" style={{ background: 'rgba(245,197,24,0.12)', color: '#F5C518', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                TRIP DEPARTURE SECURITY GATE
              </span>
            </OtpVerifyPanel>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 2: TRIP COMPLETION & CASH/TOLL RECONCILIATION            */}
      {/* --------------------------------------------------------------- */}
      {showCompleteModal && activeDuty && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1080 }}
        >
          <div 
            className="card border-0 rounded-4 shadow-2xl overflow-hidden w-100"
            style={{ maxWidth: '480px', backgroundColor: '#FFFFFF' }}
          >
            {/* Header */}
            <div 
              className="p-3.5 d-flex align-items-center justify-content-between text-white"
              style={{ backgroundColor: '#0B132B', borderBottom: '2px solid #D4AF37' }}
            >
              <div className="d-flex align-items-center gap-2">
                <CheckCircle2 size={18} className="text-success" />
                <span className="fw-bold font-heading text-white fs-6">
                  Complete Journey & Settle Fare
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="btn btn-outline-light btn-sm rounded-circle p-1 border-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              
              {/* Destination Check */}
              <div className="p-3 rounded-3 bg-light border mb-3">
                <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>SAFE ARRIVAL CONFIRMED AT:</span>
                <span className="fw-bold text-dark fs-6 d-block">{activeDuty.dropoff_address}</span>
              </div>

              {/* Fare Breakdown */}
              <div className="mb-3">
                <div className="d-flex justify-content-between text-muted small mb-1.5">
                  <span>Authoritative Base Fare:</span>
                  <span className="fw-bold text-dark">฿{Number(activeDuty.total_fare_thb || 0).toLocaleString()} THB</span>
                </div>

                {/* Optional Highway Toll Input */}
                <div className="d-flex align-items-center justify-content-between gap-2 py-2 border-top border-bottom">
                  <div>
                    <label className="fw-semibold text-dark small d-block mb-0" style={{ fontSize: '0.78rem' }}>
                      Expressway / Highway Tolls (฿):
                    </label>
                    <span className="text-muted small" style={{ fontSize: '0.66rem' }}>
                      Add receipt amount only if passenger requested toll road
                    </span>
                  </div>
                  <div style={{ width: '100px' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={tollFee}
                      onChange={(e) => setTollFee(e.target.value)}
                      className="form-control form-control-sm text-end fw-bold"
                    />
                  </div>
                </div>

                {/* Final Calculated Total */}
                <div className="d-flex justify-content-between align-items-baseline pt-2">
                  <span className="fw-bold text-dark">Total Amount Due:</span>
                  <div>
                    <span className="fw-black text-warning fs-4 font-heading">
                      ฿{(parseFloat(activeDuty.total_fare_thb || 0) + (parseFloat(tollFee) || 0)).toLocaleString()}
                    </span>
                    <span className="small text-muted ms-1">THB</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Alert & Confirmation Checkbox */}
              {activeDuty.tx_payment_status === 'PAID' ? (
                <div className="alert alert-info py-2 px-3 small rounded-3 d-flex align-items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  <span><strong>Online Paid:</strong> Payment already verified. Do NOT collect cash.</span>
                </div>
              ) : (
                <div className="p-3 rounded-3 border bg-warning-subtle mb-3">
                  <div className="d-flex align-items-center gap-2 text-dark fw-bold small mb-2">
                    <Banknote size={16} className="text-warning flex-shrink-0" />
                    <span>Cash on Arrival Collection</span>
                  </div>
                  <p className="small text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                    Please collect <strong>฿{(parseFloat(activeDuty.total_fare_thb || 0) + (parseFloat(tollFee) || 0)).toLocaleString()} THB</strong> directly from the passenger in cash before concluding the trip.
                  </p>
                  <label className="form-check d-flex align-items-center gap-2 cursor-pointer mb-0">
                    <input
                      type="checkbox"
                      checked={cashCollectedConfirmed}
                      onChange={(e) => setCashCollectedConfirmed(e.target.checked)}
                      className="form-check-input mt-0"
                    />
                    <span className="small fw-semibold text-dark" style={{ fontSize: '0.78rem' }}>
                      I confirm that I have collected ฿{(parseFloat(activeDuty.total_fare_thb || 0) + (parseFloat(tollFee) || 0)).toLocaleString()} THB in cash.
                    </span>
                  </label>
                </div>
              )}

              {completeError && (
                <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center gap-2 mb-3">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{completeError}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleConfirmTripCompletion}
                disabled={isCompletingTrip}
                className="btn btn-success w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
                style={{ fontSize: '0.95rem' }}
              >
                {isCompletingTrip ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status" />
                    <span>Recording Trip Completion...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm Safe Arrival & Complete Trip</span>
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ACTIVE VEHICLE SELECTION MODAL */}
      {showVehicleSelectModal && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.75)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <Car size={20} className="text-warning" />
                <h6 className="fw-bold mb-0 text-dark">Select Active Vehicle for Shift</h6>
              </div>
              <button
                type="button"
                onClick={() => setShowVehicleSelectModal(false)}
                className="btn btn-sm btn-link text-muted p-0"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-muted small mb-3">
              Only approved vehicles assigned by your Cab Vendor partner can be operated for passenger transfers.
            </p>

            {assignedVehicles.length === 0 ? (
              <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3">
                No approved vehicles currently assigned to your account. Your default registered vehicle is <strong>{vehicleModel} ({vehiclePlate})</strong>.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2 mb-3">
                {assignedVehicles.map(v => {
                  const isCurrent = driverProfile?.active_vehicle_id === v.id || v.is_current_selection || v.is_active;
                  return (
                    <div
                      key={v.id}
                      className="p-3 rounded-3 border d-flex align-items-center justify-content-between"
                      style={{
                        background: isCurrent ? 'rgba(34,197,94,0.05)' : '#fff',
                        borderColor: isCurrent ? '#22c55e' : '#e2e8f0'
                      }}
                    >
                      <div>
                        <strong className="d-block text-dark">{v.brand} {v.model}</strong>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          <span className="font-monospace text-dark fw-bold me-2">{v.plate_number}</span>
                          <span>{v.category === 'VIP_VAN' ? 'VIP Van' : v.category === 'SUV' ? 'Premium SUV' : 'Prime Sedan'} • {v.seating_capacity} Seats</span>
                        </div>
                      </div>
                      <div>
                        {isCurrent ? (
                          <span className="badge bg-success text-white px-2.5 py-1.5 rounded-pill fw-bold" style={{ fontSize: '0.7rem' }}>
                            <Check size={12} className="me-1 inline" /> Active Vehicle
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectVehicle(v.id)}
                            disabled={actionLoading}
                            className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 fw-bold"
                            style={{ fontSize: '0.74rem' }}
                          >
                            Select for Shift
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="d-flex justify-content-end">
              <button
                type="button"
                onClick={() => setShowVehicleSelectModal(false)}
                className="btn btn-sm btn-light rounded-2 px-3 fw-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
