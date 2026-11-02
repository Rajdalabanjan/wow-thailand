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

export default function CabRideHistoryDrawer({
  isOpen,
  onClose,
  onTrackRide
}) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCabRideHistory();
      if (res.success && Array.isArray(res.rides)) {
        setRides(res.rides);
      } else {
        setRides([]);
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
              const status = (ride.status || 'CONFIRMED').toUpperCase();
              const isLive = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'ON_TRIP'].includes(status);
              const isCancelled = status === 'CANCELLED';
              const isCompleted = status === 'COMPLETED';

              return (
                <div 
                  key={ride.id || ride.booking_id}
                  className="card rounded-3 p-3 border mb-2 shadow-xs bg-white"
                >
                  <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                    <span className="fw-black text-dark font-monospace small">
                      #{ride.booking_reference || ride.id}
                    </span>
                    <span className={`badge rounded-pill text-uppercase ${
                      isLive ? 'bg-warning text-dark' : isCompleted ? 'bg-success' : isCancelled ? 'bg-danger' : 'bg-secondary'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {status.replace('_', ' ')}
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
                        {ride.travel_date} {ride.travel_time ? `at ${ride.travel_time}` : ''}
                      </span>
                      <span className="fw-black text-dark font-heading">
                        ฿{ride.fare_thb || ride.total_amount || 0} THB
                      </span>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Tier: {ride.tier || 'Sedan'}</span>
                    {isLive && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onTrackRide) onTrackRide(ride.dispatch_id || ride.id);
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
