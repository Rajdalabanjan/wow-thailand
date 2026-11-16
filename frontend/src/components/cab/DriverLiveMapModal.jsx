// Pop-up live map of one ride for the admin and vendor screens.
// The dispatch row passed in is kept up to date by the parent (socket pushes), so the car moves live.
import React, { useEffect } from 'react';
import { X, UserCheck, ArrowRight } from 'lucide-react';
import LiveThailandCabMap from './LiveThailandCabMap';
import { parseCoords } from '../../utils/driverGps';

function pointFrom(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
}

export default function DriverLiveMapModal({ dispatch, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!dispatch) return null;
  const position = parseCoords(dispatch.driver_current_location);
  const driverLocation = position ? { ...position, receivedAt: dispatch.gpsReceivedAt } : null;
  const status = (dispatch.ride_status || '').toUpperCase().replace('_', ' ');

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'rgba(15, 23, 42, 0.55)', zIndex: 1080 }}
      onClick={onClose}
      role="dialog"
      aria-label="Live driver map"
    >
      <div
        className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column"
        style={{ width: 'min(960px, 100%)', height: 'min(640px, calc(100vh - 32px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-start justify-content-between gap-3 px-3 py-2 border-bottom">
          <div className="small" style={{ minWidth: 0 }}>
            <div className="fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
              <span className="font-monospace">#{dispatch.booking_id || dispatch.id}</span>
              {status && <span className="badge bg-info text-dark" style={{ fontSize: '0.65rem' }}>{status}</span>}
            </div>
            <div className="text-muted d-flex align-items-center gap-1 text-truncate" style={{ fontSize: '0.75rem' }}>
              <span className="text-truncate">{dispatch.pickup_address}</span>
              <ArrowRight size={11} className="text-warning flex-shrink-0" />
              <span className="text-truncate">{dispatch.dropoff_address}</span>
            </div>
            {dispatch.driver_name && (
              <div className="d-flex align-items-center gap-1 text-dark" style={{ fontSize: '0.75rem' }}>
                <UserCheck size={12} className="text-success" />
                <span className="fw-semibold">{dispatch.driver_name}</span>
                {(dispatch.driver_vehicle_plate || dispatch.vehicle_plate) && (
                  <span className="badge bg-dark font-monospace" style={{ fontSize: '0.65rem' }}>
                    {dispatch.driver_vehicle_plate || dispatch.vehicle_plate}
                  </span>
                )}
                {dispatch.driver_phone && <span className="text-muted">· {dispatch.driver_phone}</span>}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-sm btn-light border flex-shrink-0" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>
        <div className="flex-grow-1 position-relative">
          <LiveThailandCabMap
            pickupLocation={dispatch.pickup_address}
            dropoffLocation={dispatch.dropoff_address}
            pickupPoint={pointFrom(dispatch.pickup_lat, dispatch.pickup_lng)}
            dropoffPoint={pointFrom(dispatch.dropoff_lat, dispatch.dropoff_lng)}
            mode="confirmed"
            driverName={dispatch.driver_name || null}
            vehiclePlate={dispatch.driver_vehicle_plate || dispatch.vehicle_plate || null}
            driverStatus={dispatch.ride_status}
            driverLocation={driverLocation}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}
