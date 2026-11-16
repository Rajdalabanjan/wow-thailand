// ========================================================================
// WOW THAILAND: Royal Siam Mobility - Customer Ride History Drawer
// Lists customer's past and active transfers with live tracking shortcuts
// Bootstrap 5 layout + Royal Siam theme (Midnight Navy & Champagne Gold)
// ========================================================================

import React, { useState, useEffect } from 'react';
import { 
  X, Car, MapPin, Calendar, Navigation, 
  RefreshCw, ChevronRight, ShieldCheck
} from 'lucide-react';
import { getCabRideHistory } from '../../services/api';

// Server ride_status -> what the customer sees
const STATUS_LABEL = {
  ALLOCATED: 'Finding driver',
  DISPATCHED: 'Driver assigned',
  ARRIVED: 'Driver arrived',
  ON_TRIP: 'On trip',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};
const LIVE_STATUSES = ['ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP'];
const VEHICLE_LABEL = { SEDAN: 'Sedan', SUV: 'SUV', VIP_VAN: 'VIP Van' };

export default function CabRideHistoryDrawer({
  isOpen,
  onClose,
  onTrackRide
}) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    setNeedsSignIn(false);
    try {
      const res = await getCabRideHistory();
      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.rides) ? res.rides : []);
        setRides(list);
      } else if (/auth/i.test(res?.error || '')) {
        setRides([]);
        setNeedsSignIn(true);
      } else {
        setRides([]);
        setError(res?.error || 'Unable to load transfer history.');
      }
    } catch (err) {
      console.error('Ride history fetch error:', err);
      setError('Unable to load transfer history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-end z-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
    >
      <div 
        className="card border-0 h-100 shadow-2xl rounded-0 d-flex flex-column justify-content-between"
        style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div 
          className="d-flex align-items-center justify-content-between px-4 py-3 text-white flex-shrink-0"
          style={{ backgroundColor: '#0B132B', borderBottom: '1px solid rgba(212,175,55,0.3)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <div 
              className="rounded-2 p-1.5 d-flex align-items-center justify-content-center text-warning"
              style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
            >
              <Car size={18} />
            </div>
            <div>
              <h6 className="fw-bold text-white mb-0 font-heading">
                My Transfer Reservations
              </h6>
              <div className="small text-warning" style={{ fontSize: '0.72rem' }}>
                WOW THAILAND Chauffeur Journeys
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-1.5">
            <button
              type="button"
              onClick={fetchHistory}
              className="btn btn-sm btn-outline-light rounded-circle p-1"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-outline-light rounded-circle p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-3 overflow-y-auto flex-grow-1" style={{ backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning spinner-border-sm mb-2"></div>
              <div className="small text-muted">Loading your journeys...</div>
            </div>
          ) : error ? (
            <div className="alert alert-danger p-3 small text-center">{error}</div>
          ) : needsSignIn ? (
            <div className="text-center py-5 px-3">
              <h6 className="fw-bold text-dark">Sign in to see your rides</h6>
              <p className="text-muted small mb-0">
                A ride booked on this device reopens by itself, and the link in your SMS, WhatsApp or email opens it from anywhere.
              </p>
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="rounded-circle bg-light p-3 mx-auto mb-2 text-muted" style={{ width: '56px', height: '56px' }}>
                <Car size={32} />
              </div>
              <h6 className="fw-bold text-dark">No Transfers Booked Yet</h6>
              <p className="text-muted small mb-3">
                Book your private airport pickup or chauffeur across Thailand.
              </p>
              <button onClick={onClose} className="btn btn-dark btn-sm rounded-pill px-4 fw-bold text-warning">
                Book a Transfer
              </button>
            </div>
          ) : (
            rides.map(ride => {
              const status = (ride.ride_status || ride.status || 'ALLOCATED').toUpperCase();
              const isLive = LIVE_STATUSES.includes(status);
              const isCancelled = status === 'CANCELLED';
              const isCompleted = status === 'COMPLETED';
              // pickup_datetime is the booked wall-clock time serialised as UTC
              const pickupIso = String(ride.pickup_datetime || '');
              const pickupDate = pickupIso.slice(0, 10);
              const pickupTime = pickupIso.slice(11, 16);
              const plate = ride.vehicle_plate || ride.driver_vehicle_plate;
              const carModel = ride.vehicle_model || ride.driver_vehicle_model;

              return (
                <div
                  key={ride.id || ride.booking_id}
                  className="card rounded-3 p-3 border mb-2 shadow-xs bg-white"
                >
                  <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                    <span className="fw-black text-dark font-monospace small">
                      #{ride.booking_id || ride.id}
                    </span>
                    <span className={`badge rounded-pill text-uppercase ${
                      isLive ? 'bg-warning text-dark' : isCompleted ? 'bg-success' : isCancelled ? 'bg-danger' : 'bg-secondary'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {STATUS_LABEL[status] || status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="small mb-2">
                    <div className="d-flex align-items-center gap-1.5 text-dark mb-1">
                      <MapPin size={13} className="text-success flex-shrink-0" />
                      <span className="text-truncate">{ride.pickup_address}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1.5 text-dark mb-1">
                      <MapPin size={13} className="text-danger flex-shrink-0" />
                      <span className="text-truncate">{ride.dropoff_address}</span>
                    </div>
                    <div className="d-flex justify-content-between text-muted pt-1 border-top" style={{ fontSize: '0.72rem' }}>
                      <span className="d-flex align-items-center gap-1">
                        <Calendar size={12} />
                        {pickupDate} {pickupTime ? `at ${pickupTime}` : ''}
                      </span>
                      <span className="fw-black text-dark font-heading">
                        ฿{Number(ride.total_fare_thb || ride.fare_thb || 0).toLocaleString()} THB
                      </span>
                    </div>
                    {ride.driver_name && (
                      <div className="text-dark pt-1" style={{ fontSize: '0.75rem' }}>
                        Driver: <strong>{ride.driver_name}</strong>
                        {carModel ? ` · ${carModel}` : ''}
                        {plate ? <span className="badge bg-dark text-white font-monospace ms-1">{plate}</span> : null}
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                      {VEHICLE_LABEL[ride.vehicle_category] || ride.vehicle_category || 'Sedan'}
                      {ride.passenger_count ? ` · ${ride.passenger_count} pax` : ''}
                    </span>
                    {isLive && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onTrackRide) onTrackRide(ride.id);
                        }}
                        className="btn btn-dark btn-sm rounded-pill px-3 py-1 fw-bold text-warning d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <Navigation size={12} />
                        <span>Track Live</span>
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-top text-center">
          <div className="text-muted small d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.72rem' }}>
            <ShieldCheck size={14} className="text-success" />
            <span>24/7 Royal Siam Chauffeur Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
