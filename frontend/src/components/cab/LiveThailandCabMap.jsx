// ========================================================================
// WOW THAILAND: Live Interactive Chauffeur Map
// 100% Client-side Leaflet integration via dynamic CDN loader (Zero npm dependencies)
// Renders Thailand road trajectories, live markers, roaming cabs & satellite views
// ========================================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, Minus, LocateFixed, Layers, Navigation, ShieldCheck, Clock, Compass } from 'lucide-react';

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
  vehiclePlate = '1กข 4589',
  driverName = 'Somchai Prasert',
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
    driverMarker: null
  });

  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState('street');
  const [distanceInfo, setDistanceInfo] = useState({ km: 30, mins: 45 });
  const [driverProgress, setDriverProgress] = useState(0.15);

  const pickupCoords = useMemo(() => resolveThaiCoords(pickupLocation), [pickupLocation]);
  const dropoffCoords = useMemo(() => resolveThaiCoords(dropoffLocation), [dropoffLocation]);

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
    if (layers.driverMarker) map.removeLayer(layers.driverMarker);
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

    // Live Chauffeur Marker in Confirmed Mode
    if (mode === 'confirmed') {
      const progressIdx = Math.min(
        waypoints.length - 1,
        Math.floor(driverProgress * waypoints.length)
      );
      const driverPos = waypoints[progressIdx] || waypoints[0];

      const driverIcon = L.divIcon({
        className: 'live-driver-pin',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -50%);">
            <div style="background:#0B132B; border:2px solid #D4AF37; color:#F1D78A; font-weight:800; font-size:10.5px; padding:3px 8px; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.35); white-space:nowrap; display:flex; align-items:center; gap:4px;">
              <span class="spinner-grow spinner-grow-sm text-success" style="width:6px; height:6px;"></span>
              <span>${driverName} · ${vehiclePlate}</span>
            </div>
            <div style="background:#D4AF37; color:#0B132B; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(212,175,55,0.4); font-size:16px; margin-top:3px; border:2px solid #fff;">
              🚗
            </div>
          </div>
        `,
        iconSize: [0, 0]
      });

      layers.driverMarker = L.marker(driverPos, { icon: driverIcon }).addTo(map);
    }

    // Fit bounds smoothly
    try {
      const bounds = L.latLngBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [dropoffCoords.lat, dropoffCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } catch (e) {}
  };

  useEffect(() => {
    if (mapReady) {
      renderRouteAndMarkers();
    }
  }, [mapReady, pickupCoords, dropoffCoords, mode, driverProgress, driverStatus]);

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
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;
    try {
      const bounds = L.latLngBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [dropoffCoords.lat, dropoffCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } catch (e) {}
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
    </div>
  );
}
