// Shared helpers for the driver's live GPS position (admin, vendor and customer screens).
import { useEffect, useState } from 'react';

// The driver app sends its position every 15 seconds while the Driver Portal is open.
// After 2 minutes without one, the position is shown as old ("No signal").
export const GPS_STALE_AFTER_SEC = 120;

export function formatAgo(sec) {
  if (sec == null) return 'unknown';
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec} sec ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  const days = Math.floor(sec / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Seconds since a position arrived (receivedAt is a local Date.now() timestamp)
export function gpsAgeSec(receivedAt, now = Date.now()) {
  if (!receivedAt) return null;
  return Math.max(0, Math.round((Math.max(now, receivedAt) - receivedAt) / 1000));
}

export function isGpsFresh(receivedAt, now = Date.now()) {
  const age = gpsAgeSec(receivedAt, now);
  return age !== null && age <= GPS_STALE_AFTER_SEC;
}

// "13.75630, 100.50180" -> { lat: 13.7563, lng: 100.5018 }
export function parseCoords(text) {
  if (!text) return null;
  const [lat, lng] = String(text).split(',').map(s => parseFloat(s.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// The API says how many seconds ago each driver's last position arrived; turn that into a
// local timestamp so "updated … ago" keeps counting without another request.
export function withGpsTimestamps(list) {
  const now = Date.now();
  return list.map(d => ({
    ...d,
    gpsReceivedAt: d.driver_location_age_sec == null ? null : now - Math.max(0, Number(d.driver_location_age_sec)) * 1000
  }));
}

// Apply a DRIVER_LOCATION_UPDATE socket event to a dispatch list
export function applyDriverLocation(list, data) {
  if (!data || !data.driver_id || !data.location) return list;
  const receivedAt = Date.now();
  return list.map(d => (d.driver_id === data.driver_id
    ? { ...d, driver_current_location: data.location, gpsReceivedAt: receivedAt }
    : d));
}

// Re-render once a second while something shows a live "… ago" counter
export function useNow(active, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}
