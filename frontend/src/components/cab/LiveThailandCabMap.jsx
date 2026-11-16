// ========================================================================
// WOW THAILAND: Live Interactive Chauffeur Map
// 100% Client-side Leaflet integration via dynamic CDN loader (Zero npm dependencies)
// Renders Thailand road trajectories, live markers, roaming cabs & satellite views
// ========================================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, Minus, LocateFixed, Layers, Navigation, ShieldCheck, Clock, Compass } from 'lucide-react';
import { useNow, isGpsFresh, gpsAgeSec, formatAgo } from '../../utils/driverGps';

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Comprehensive Thailand Coordinates for live interactive mapping
export const THAILAND_COORDINATES = {
  // Major International & Regional Airports
  'Suvarnabhumi Airport (BKK)': { lat: 13.6900, lng: 100.7501, label: 'Suvarnabhumi Airport (BKK)' },
  'Don Mueang Airport (DMK)': { lat: 13.9126, lng: 100.6067, label: 'Don Mueang Airport (DMK)' },
  'Phuket International Airport (HKT)': { lat: 8.1132, lng: 98.3169, label: 'Phuket Airport (HKT)' },
  'Chiang Mai Airport (CNX)': { lat: 18.7677, lng: 98.9640, label: 'Chiang Mai Airport (CNX)' },

  // Bangkok Central Tourist & Hotel Zones
  'Bangkok City (Sukhumvit / Silom / Riverside)': { lat: 13.7462, lng: 100.5347, label: 'Bangkok City (Sukhumvit)' },
  'Sukhumvit (Asok / Phrom Phong / Thong Lo)': { lat: 13.7380, lng: 100.5603, label: 'Sukhumvit' },
  'Silom & Sathorn Financial District': { lat: 13.7259, lng: 100.5284, label: 'Silom & Sathorn' },
  'The Berkeley Hotel Pratunam, Bangkok': { lat: 13.7503, lng: 100.5422, label: 'The Berkeley Hotel' },
  'Grand Hyatt Erawan Bangkok': { lat: 13.7441, lng: 100.5408, label: 'Grand Hyatt Erawan' },

  // Pattaya & Gulf Coast
  'Pattaya Beach & Walking Street': { lat: 12.9276, lng: 100.8771, label: 'Pattaya Beach' },
  'Jomtien Beach Resorts': { lat: 12.8715, lng: 100.8973, label: 'Jomtien Beach' },
  'Hilton Pattaya Beach Resort': { lat: 12.9344, lng: 100.8845, label: 'Hilton Pattaya' },
  'Bali Hai Pier Pattaya (Ferry to Koh Larn)': { lat: 12.9255, lng: 100.8671, label: 'Bali Hai Pier' },

  // Phuket & Andaman Coast
  'Patong Beach Phuket': { lat: 7.8961, lng: 98.2963, label: 'Patong Beach' },
  'Kata & Karon Beach Resorts': { lat: 7.8210, lng: 98.3005, label: 'Kata & Karon' },
  'Bang Tao & Laguna Phuket': { lat: 7.9942, lng: 98.2958, label: 'Laguna Phuket' },
  'Amari Phuket Resort': { lat: 7.8860, lng: 98.2882, label: 'Amari Phuket' },
  'Rassada Pier Phuket (Ferry to Phi Phi)': { lat: 7.8814, lng: 98.4168, label: 'Rassada Pier' },

  // Other Leading Hubs
  'Hua Hin City & Beach Resorts': { lat: 12.5684, lng: 99.9577, label: 'Hua Hin Beach' },
  'Ao Nang Beach & Railay Pier': { lat: 8.0307, lng: 98.8241, label: 'Ao Nang Krabi' }
};

export function resolveThaiCoords(name) {
  if (!name || typeof name !== 'string') {
    return { lat: 13.6900, lng: 100.7501, label: 'Suvarnabhumi Airport (BKK)' };
  }
  if (THAILAND_COORDINATES[name]) return THAILAND_COORDINATES[name];

  const clean = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  const keys = Object.keys(THAILAND_COORDINATES);

  for (const k of keys) {
    const kClean = k.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
    if (kClean.includes(clean) || clean.includes(kClean.split(' ')[0])) {
      return THAILAND_COORDINATES[k];
    }
  }

  // Keywords matching
  if (clean.includes('suvarnabhumi') || clean.includes('bkk')) return THAILAND_COORDINATES['Suvarnabhumi Airport (BKK)'];
  if (clean.includes('don mueang') || clean.includes('dmk')) return THAILAND_COORDINATES['Don Mueang Airport (DMK)'];
  if (clean.includes('pattaya')) return THAILAND_COORDINATES['Pattaya Beach & Walking Street'];
  if (clean.includes('patong')) return THAILAND_COORDINATES['Patong Beach Phuket'];
  if (clean.includes('phuket')) return THAILAND_COORDINATES['Phuket International Airport (HKT)'];
  if (clean.includes('hua hin')) return THAILAND_COORDINATES['Hua Hin City & Beach Resorts'];
  if (clean.includes('chiang mai') || clean.includes('cnx')) return THAILAND_COORDINATES['Chiang Mai Airport (CNX)'];
  if (clean.includes('krabi') || clean.includes('ao nang')) return THAILAND_COORDINATES['Ao Nang Beach & Railay Pier'];
  if (clean.includes('berkeley')) return THAILAND_COORDINATES['The Berkeley Hotel Pratunam, Bangkok'];
  if (clean.includes('jomtien')) return THAILAND_COORDINATES['Jomtien Beach Resorts'];

  return { lat: 13.7462, lng: 100.5347, label: name.split(',')[0].split('(')[0].trim() };
}

function computeRoadDistanceKm(c1, c2) {
  if (!c1 || !c2) return 30;
  const R = 6371; // km
  const dLat = (c2.lat - c1.lat) * (Math.PI / 180);
  const dLon = (c2.lng - c1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * (Math.PI / 180)) * Math.cos(c2.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const haversine = R * c;
  return Math.max(3, Math.round(haversine * 1.25));
}

function generateCurvedWaypoints(p1, p2, count = 20) {
  const points = [];
  const midLat = (p1.lat + p2.lat) / 2;
  const midLng = (p1.lng + p2.lng) / 2;
  const curveOffsetLat = (p2.lng - p1.lng) * 0.10;
  const curveOffsetLng = -(p2.lat - p1.lat) * 0.10;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lat = Math.pow(1 - t, 2) * p1.lat + 2 * (1 - t) * t * (midLat + curveOffsetLat) + Math.pow(t, 2) * p2.lat;
    const lng = Math.pow(1 - t, 2) * p1.lng + 2 * (1 - t) * t * (midLng + curveOffsetLng) + Math.pow(t, 2) * p2.lng;
    points.push([lat, lng]);
  }
  return points;
}

export default function LiveThailandCabMap({
  pickupLocation = 'Suvarnabhumi Airport (BKK)',
  dropoffLocation = 'Bangkok City (Sukhumvit / Silom / Riverside)',
  mode = 'booking',
  activeConfirmedRide = null,
  driverStatus = 'DISPATCHED',
  vehiclePlate = null,
  driverName = null,
  // Real driver position from the driver app: { lat, lng, receivedAt } (receivedAt = local ms timestamp)
  driverLocation = null,
  // Exact pickup / drop-off points when known: { lat, lng }; otherwise the address name is looked up
  pickupPoint = null,
  dropoffPoint = null,
  height = '100%'
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    routeLine: null,
    routeBorder: null,
    pickupMarker: null,
    dropoffMarker: null,
    cabMarkers: [],
    driverMarker: null,
    driverTrail: null
  });
  // Where the driver has been while this map is open (drawn as a green trail)
  const driverTrailRef = useRef([]);
  const driverPosRef = useRef(null);
  const fittedToDriverRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState('street');
  const [distanceInfo, setDistanceInfo] = useState({ km: 30, mins: 45 });

  const pickupCoords = useMemo(() => {
    const named = resolveThaiCoords(pickupLocation);
    return pickupPoint && Number.isFinite(pickupPoint.lat) && Number.isFinite(pickupPoint.lng)
      ? { lat: pickupPoint.lat, lng: pickupPoint.lng, label: named.label }
      : named;
  }, [pickupLocation, pickupPoint?.lat, pickupPoint?.lng]);
  const dropoffCoords = useMemo(() => {
    const named = resolveThaiCoords(dropoffLocation);
    return dropoffPoint && Number.isFinite(dropoffPoint.lat) && Number.isFinite(dropoffPoint.lng)
      ? { lat: dropoffPoint.lat, lng: dropoffPoint.lng, label: named.label }
      : named;
  }, [dropoffLocation, dropoffPoint?.lat, dropoffPoint?.lng]);

  const driverLat = driverLocation?.lat;
  const driverLng = driverLocation?.lng;
  const showDriver = mode === 'confirmed' && Number.isFinite(driverLat) && Number.isFinite(driverLng);
  const now = useNow(mode === 'confirmed' && Boolean(driverName));
  const driverFresh = showDriver && isGpsFresh(driverLocation?.receivedAt, now);
  const driverAge = showDriver ? gpsAgeSec(driverLocation?.receivedAt, now) : null;

  // Zoom to show pickup, drop-off and (when known) the driver
  const fitToRide = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    try {
      map.invalidateSize();   // the box may have changed size since the map was created
      const points = [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]];
      if (driverPosRef.current) points.push(driverPosRef.current);
      // No animation: while a zoom animation runs, Leaflet ignores further zoom requests,
      // which left the map stuck on an early, wrong frame
      map.fitBounds(window.L.latLngBounds(points), { padding: [50, 50], maxZoom: 14, animate: false });
    } catch (e) {}
  };
  const fitToRideRef = useRef(fitToRide);
  fitToRideRef.current = fitToRide;
  // Once the viewer drags or zooms the map themselves, stop re-framing it for them
  const userMovedMapRef = useRef(false);

  // Keep the map the right size when its box resizes (page layout settling, window resize)
  useEffect(() => {
    const el = containerRef.current;
    if (!mapReady || !el || typeof ResizeObserver === 'undefined') return undefined;
    const map = mapInstanceRef.current;
    const markMoved = () => { userMovedMapRef.current = true; };
    map?.on('dragstart', markMoved);
    el.addEventListener('wheel', markMoved, { passive: true });
    el.addEventListener('touchstart', markMoved, { passive: true });
    const observer = new ResizeObserver(() => {
      if (!mapInstanceRef.current) return;
      if (userMovedMapRef.current) mapInstanceRef.current.invalidateSize();
      else fitToRideRef.current();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      map?.off('dragstart', markMoved);
      el.removeEventListener('wheel', markMoved);
      el.removeEventListener('touchstart', markMoved);
    };
  }, [mapReady]);

  useEffect(() => {
    const km = computeRoadDistanceKm(pickupCoords, dropoffCoords);
    const mins = Math.max(10, Math.round(km * 1.5));
    setDistanceInfo({ km, mins });
  }, [pickupCoords, dropoffCoords]);

  // Leaflet dynamic CDN injection
  useEffect(() => {
    let checkInterval = null;

    const initIfReady = () => {
      if (window.L && containerRef.current && !mapInstanceRef.current) {
        initLeafletMap();
        return true;
      }
      return false;
    };

    if (!initIfReady()) {
      if (!window.L) {
        if (!document.getElementById('leaflet-cdn-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-cdn-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!document.getElementById('leaflet-cdn-js')) {
          const script = document.createElement('script');
          script.id = 'leaflet-cdn-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            initLeafletMap();
          };
          document.head.appendChild(script);
        }
      }

      checkInterval = setInterval(() => {
        if (initIfReady()) {
          clearInterval(checkInterval);
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initLeafletMap = () => {
    if (!containerRef.current || mapInstanceRef.current || !window.L) return;

    try {
      const L = window.L;
      const initialCenter = [
        (pickupCoords.lat + dropoffCoords.lat) / 2,
        (pickupCoords.lng + dropoffCoords.lng) / 2
      ];

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      // Clean OpenStreetMap Tile Layer (100% Free, NO API Key, NO Watermark - Same as WOW GOA)
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });

      streetLayer.on('tileerror', () => {
        // Fallback to Esri World Street Map if OSM has network lag
        if (map && !map._fallbackActive) {
          map._fallbackActive = true;
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '&copy; Esri'
          }).addTo(map);
        }
      });

      streetLayer.addTo(map);
      map._streetLayer = streetLayer;

      mapInstanceRef.current = map;
      setMapReady(true);
      renderRouteAndMarkers();
    } catch (err) {
      console.error('Leaflet init error:', err);
    }
  };

  const renderRouteAndMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;
    const layers = layersRef.current;

    // Clear old layers
    if (layers.routeLine) map.removeLayer(layers.routeLine);
    if (layers.routeBorder) map.removeLayer(layers.routeBorder);
    if (layers.pickupMarker) map.removeLayer(layers.pickupMarker);
    if (layers.dropoffMarker) map.removeLayer(layers.dropoffMarker);
    layers.cabMarkers.forEach(m => map.removeLayer(m));
    layers.cabMarkers = [];

    // Custom Icons
    const createPinHtml = (label, isPickup) => `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
        <div style="background:${isPickup ? '#059669' : '#DC2626'}; color:#fff; font-weight:800; font-size:11px; padding:3px 9px; border-radius:20px; box-shadow:0 3px 10px rgba(0,0,0,0.25); white-space:nowrap; border:1.5px solid #fff; display:flex; align-items:center; gap:4px;">
          <span>${isPickup ? '🟢' : '🔴'}</span>
          <span>${label}</span>
        </div>
        <div style="width:2px; height:8px; background:${isPickup ? '#059669' : '#DC2626'};"></div>
        <div style="width:8px; height:8px; border-radius:50%; background:${isPickup ? '#059669' : '#DC2626'}; border:2px solid #fff;"></div>
      </div>
    `;

    const pickupIcon = L.divIcon({
      className: 'custom-pin-pickup',
      html: createPinHtml(pickupCoords.label || 'Pickup', true),
      iconSize: [0, 0]
    });

    const dropoffIcon = L.divIcon({
      className: 'custom-pin-dropoff',
      html: createPinHtml(dropoffCoords.label || 'Drop-off', false),
      iconSize: [0, 0]
    });

    layers.pickupMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon }).addTo(map);
    layers.dropoffMarker = L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: dropoffIcon }).addTo(map);

    // Route Polyline
    const waypoints = generateCurvedWaypoints(pickupCoords, dropoffCoords);

    // Outer Glow / Border Line
    layers.routeBorder = L.polyline(waypoints, {
      color: '#0B132B',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Inner Active Cyan / Gold Route Line
    layers.routeLine = L.polyline(waypoints, {
      color: '#06B6D4',
      weight: 3.5,
      opacity: 1,
      dashArray: mode === 'confirmed' ? '8, 8' : null,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Roaming Cabs on Map (Visual Immersion)
    if (mode === 'booking') {
      const mid = waypoints[Math.floor(waypoints.length / 2)];
      const cabPositions = [
        [mid[0] + 0.015, mid[1] - 0.018],
        [pickupCoords.lat + 0.012, pickupCoords.lng + 0.015],
        [dropoffCoords.lat - 0.014, dropoffCoords.lng - 0.012]
      ];

      cabPositions.forEach((pos, idx) => {
        const cabIcon = L.divIcon({
          className: 'roaming-cab-icon',
          html: `
            <div style="background:#0B132B; border:1.5px solid #D4AF37; color:#D4AF37; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.3); font-size:13px;">
              🚕
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const m = L.marker(pos, { icon: cabIcon }).addTo(map);
        layers.cabMarkers.push(m);
      });
    }

    // The driver's car is drawn separately (see below) from the real GPS position only
    if (layers.driverTrail) layers.driverTrail.bringToFront();

    fitToRide();
  };

  useEffect(() => {
    if (mapReady) {
      renderRouteAndMarkers();
    }
  }, [mapReady, pickupCoords, dropoffCoords, mode, driverStatus]);

  // Live driver car: moves to each new GPS position from the driver app and leaves a trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.L) return;
    const L = window.L;
    const layers = layersRef.current;

    if (!showDriver) {
      if (layers.driverMarker) { map.removeLayer(layers.driverMarker); layers.driverMarker = null; }
      if (layers.driverTrail) { map.removeLayer(layers.driverTrail); layers.driverTrail = null; }
      driverTrailRef.current = [];
      driverPosRef.current = null;
      fittedToDriverRef.current = false;
      return;
    }

    const pos = [driverLat, driverLng];
    driverPosRef.current = pos;
    const trail = driverTrailRef.current;
    const last = trail[trail.length - 1];
    if (!last || last[0] !== pos[0] || last[1] !== pos[1]) {
      trail.push(pos);
      if (trail.length > 300) trail.shift();
    }

    const label = escapeHtml([driverName, vehiclePlate].filter(Boolean).join(' · ') || 'Your driver');
    const icon = L.divIcon({
      className: 'live-driver-pin',
      html: `
        <div style="position:relative; width:0; height:0; opacity:${driverFresh ? 1 : 0.65}; filter:${driverFresh ? 'none' : 'grayscale(1)'};">
          <div style="position:absolute; left:0; bottom:20px; transform:translateX(-50%); background:#0B132B; border:2px solid #D4AF37; color:#F1D78A; font-weight:800; font-size:10.5px; padding:3px 8px; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.35); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            ${driverFresh ? '<span class="spinner-grow spinner-grow-sm text-success" style="width:6px; height:6px;"></span>' : ''}
            <span>${label}</span>
          </div>
          <div style="position:absolute; left:0; top:0; transform:translate(-50%, -50%); background:#D4AF37; color:#0B132B; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(212,175,55,0.4); font-size:16px; border:2px solid #fff;">🚗</div>
        </div>
      `,
      iconSize: [0, 0]
    });

    if (layers.driverMarker) {
      layers.driverMarker.setLatLng(pos);
      layers.driverMarker.setIcon(icon);
    } else {
      layers.driverMarker = L.marker(pos, { icon, zIndexOffset: 1000 }).addTo(map);
    }

    if (trail.length > 1) {
      if (layers.driverTrail) layers.driverTrail.setLatLngs(trail);
      else layers.driverTrail = L.polyline(trail, { color: '#16a34a', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    }

    // Bring the car into view the first time it appears, and again whenever it drives off the
    // edge of the map (re-framing the whole ride, or just following the car if the viewer
    // has moved the map themselves)
    if (!fittedToDriverRef.current) {
      fittedToDriverRef.current = true;
      fitToRide();
    } else if (!map.getBounds().pad(-0.08).contains(pos)) {
      if (userMovedMapRef.current) map.panTo(pos, { animate: true });
      else fitToRide();
    }
  }, [mapReady, showDriver, driverLat, driverLng, driverName, vehiclePlate, driverFresh]);

  // Layer switcher
  const handleToggleSatellite = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    if (mapType === 'street') {
      if (map._streetLayer) map.removeLayer(map._streetLayer);
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      );
      satLayer.addTo(map);
      map._satLayer = satLayer;
      setMapType('satellite');
    } else {
      if (map._satLayer) map.removeLayer(map._satLayer);
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors'
      });
      streetLayer.addTo(map);
      map._streetLayer = streetLayer;
      setMapType('street');
    }
  };

  const handleRecenter = () => {
    userMovedMapRef.current = false;
    fitToRide();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: height, minHeight: '340px' }}>
      {/* Map Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}></div>

      {/* Top Floating Live Route Pill */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '14px',
          zIndex: 400,
          background: 'rgba(11, 19, 43, 0.92)',
          color: '#ffffff',
          backdropFilter: 'blur(8px)',
          borderRadius: '24px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
        }}
      >
        <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '6px', height: '6px' }}></span>
        <span style={{ color: '#D4AF37' }}>LIVE</span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span>{distanceInfo.km} km</span>
        <span>•</span>
        <span>~{distanceInfo.mins} mins</span>
      </div>

      {/* Map Action Controls (Satellite, Recenter, Zoom) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <button
          type="button"
          onClick={handleToggleSatellite}
          title="Toggle Satellite"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          <Layers size={15} color="#0B132B" />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Route"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          <LocateFixed size={15} color="#0B132B" />
        </button>
      </div>

      {/* Driver GPS status: is the car on the map live or an old position? */}
      {mode === 'confirmed' && driverName && (
        <div
          data-testid="driver-gps-status"
          style={{
            position: 'absolute',
            left: '12px',
            bottom: '12px',
            zIndex: 400,
            maxWidth: 'calc(100% - 24px)',
            background: 'rgba(255, 255, 255, 0.96)',
            border: `1px solid ${driverFresh ? '#86efac' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: driverFresh ? '#15803d' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: driverFresh ? '#16a34a' : '#94a3b8' }}></span>
          <span>
            {!showDriver
              ? "Waiting for the driver's live location"
              : driverFresh
                ? `Driver's live location · updated ${formatAgo(driverAge)}`
                : `No signal from the driver · last seen ${formatAgo(driverAge)}`}
          </span>
        </div>
      )}
    </div>
  );
}
