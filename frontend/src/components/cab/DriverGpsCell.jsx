// Live GPS cell for the admin and vendor dispatch tables.
import React from 'react';
import { Navigation, MapPin, Radio, WifiOff } from 'lucide-react';
import { useNow, gpsAgeSec, GPS_STALE_AFTER_SEC, formatAgo } from '../../utils/driverGps';

// Header badge: is this screen receiving driver positions live?
// status: 'connecting' | 'live' | 'offline' | 'denied' (from connectLiveRooms)
export function LiveGpsBadge({ status, fallbackSeconds }) {
  const live = status === 'live';
  return (
    <span
      className={`badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1 border ${live ? 'text-success border-success' : 'text-muted'}`}
      style={{ fontSize: '0.7rem', background: live ? 'rgba(22,163,74,0.08)' : '#f8fafc' }}
      title={live
        ? 'Driver positions appear here the moment they arrive'
        : `Not connected for live updates; the list still refreshes every ${fallbackSeconds} seconds`}
    >
      {live ? <Radio size={12} /> : <WifiOff size={12} />}
      {live ? 'Live GPS on'
        : status === 'denied' ? 'Live GPS needs sign-in'
        : status === 'connecting' ? 'Connecting live GPS…'
        : 'Live GPS reconnecting…'}
    </span>
  );
}

export default function DriverGpsCell({ hasDriver, rideEnded, coords, receivedAt, onTrack }) {
  const ticking = Boolean(hasDriver && !rideEnded && coords && receivedAt);
  const now = useNow(ticking);

  const muted = (text) => <span className="text-muted small" style={{ fontSize: '0.72rem' }}>{text}</span>;
  if (!hasDriver) return muted('Standing By');
  if (rideEnded) return muted('Ride ended');

  const trackButton = onTrack && (
    <button
      type="button"
      onClick={onTrack}
      className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 mt-1 py-0 px-2"
      style={{ fontSize: '0.68rem' }}
      title="Open the live map for this ride"
    >
      <MapPin size={11} /> Track live
    </button>
  );

  if (!coords) {
    return (
      <div>
        {muted('No GPS from driver yet')}
        {trackButton && <div>{trackButton}</div>}
      </div>
    );
  }

  const ageSec = gpsAgeSec(receivedAt, now);
  const fresh = ageSec !== null && ageSec <= GPS_STALE_AFTER_SEC;

  return (
    <div title={fresh ? 'Live position from the driver app' : 'The driver app has not sent a position recently (portal closed, phone locked or location turned off)'}>
      <a
        href={`https://www.google.com/maps?q=${encodeURIComponent(coords)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-decoration-none d-inline-flex align-items-center gap-1 fw-bold"
        style={{ fontSize: '0.72rem', color: fresh ? '#0d6efd' : '#94a3b8' }}
      >
        <Navigation size={12} style={{ color: fresh ? '#16a34a' : '#94a3b8' }} />
        <span className="font-monospace">{coords}</span>
      </a>
      <span className="d-flex align-items-center gap-1 fw-semibold" style={{ fontSize: '0.66rem', color: fresh ? '#16a34a' : '#64748b' }}>
        <span className="rounded-circle flex-shrink-0" style={{ width: '6px', height: '6px', background: fresh ? '#16a34a' : '#94a3b8' }}></span>
        {fresh ? 'Live' : 'No signal'}
      </span>
      <span className="d-block text-muted text-nowrap" style={{ fontSize: '0.64rem' }}>
        {fresh ? `updated ${formatAgo(ageSec)}` : `last seen ${formatAgo(ageSec)}`}
      </span>
      {trackButton}
    </div>
  );
}
