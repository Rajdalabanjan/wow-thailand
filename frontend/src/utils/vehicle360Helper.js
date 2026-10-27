/**
 * vehicle360Helper.js
 * Vehicle-specific 360° angle sequences and asset classification.
 * 
 * Asset States:
 * 1. FULL_360: Complete 360° circle (4+ cardinal angles or sequential turntable frames).
 *    Continuous rotation through 0°-359° is fully enabled.
 * 2. PARTIAL_2_IMAGES: Exactly 2 images available (typically Left & Right profiles).
 *    Front (0°) and Rear (180°) are flagged as missing. Does NOT fake full rotation.
 * 3. PARTIAL_3_IMAGES: 3 images available. Explains the missing angle.
 * 4. SINGLE_IMAGE: Only 1 static photo. Explains 360 sequence is pending.
 * 5. EMPTY: No images uploaded.
 */

// Multi-angle series for catalog models (stock photo substitution disabled; genuine uploaded photos only)
export const CATALOG_VEHICLE_ANGLES = {};

// Authentic 3D GLB/glTF vehicle models catalog (Static verified fallback baseline)
export const VERIFIED_VEHICLE_3D_REGISTRY = {
  // Honda Forza 350
  'bike-6a945e65c98f9': {
    url: '/models/ninja_h2r.glb',
    name: 'Honda Forza 350',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'ninja_h2r.glb',
    verified: false, // Flagged: Licence unverified for commercial redistribution
    licenseVerified: false,
    licenseNotice: 'Licence unverified for general redistribution. Restricted to verified single-listing display only.'
  },
  'kavasaki ninja h2r': {
    url: '/models/ninja_h2r.glb',
    name: 'Honda Forza 350',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'ninja_h2r.glb',
    verified: false,
    licenseVerified: false,
    licenseNotice: 'Licence unverified for general redistribution. Restricted to verified single-listing display only.'
  },
  'kawasaki ninja h2r': {
    url: '/models/ninja_h2r.glb',
    name: 'Honda Forza 350',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'ninja_h2r.glb',
    verified: false,
    licenseVerified: false,
    licenseNotice: 'Licence unverified for general redistribution. Restricted to verified single-listing display only.'
  },
  'ninja h2r': {
    url: '/models/ninja_h2r.glb',
    name: 'Honda Forza 350',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'ninja_h2r.glb',
    verified: false,
    licenseVerified: false,
    licenseNotice: 'Licence unverified for general redistribution. Restricted to verified single-listing display only.'
  },
  // Kawasaki Ninja ZX-10R
  'zx10r': {
    url: '/models/zx10r.glb',
    name: 'Kawasaki Ninja ZX-10R',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'zx10r.glb',
    verified: true,
    licenseVerified: true
  },
  'zx-10r': {
    url: '/models/zx10r.glb',
    name: 'Kawasaki Ninja ZX-10R',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'zx10r.glb',
    verified: true,
    licenseVerified: true
  },
  'kawasaki ninja zx-10r': {
    url: '/models/zx10r.glb',
    name: 'Kawasaki Ninja ZX-10R',
    category: 'Superbike',
    vehicleType: 'bike',
    frontOffsetDeg: 270,
    modelAsset: 'zx10r.glb',
    verified: true,
    licenseVerified: true
  },
  // Land Rover Defender 110 (2024 L663)
  'car-6a945db651fa0': {
    url: '/models/defender.glb',
    name: 'Land Rover Defender 110',
    category: 'Luxury SUV',
    vehicleType: 'car',
    frontOffsetDeg: 0,
    modelAsset: 'defender.glb',
    verified: true,
    licenseVerified: true,
    licenseNotice: 'Approved for 360 viewer with creator attribution.',
    attribution: {
      creator: 'Shreyansh Chaurasia (@ShreyanshChaurasia_12)',
      license: 'CC-BY 4.0',
      source: 'https://sketchfab.com/3d-models/land-rover-defender-110-df39d84cc8d04887801052e6900cb269'
    }
  },
  'defender': {
    url: '/models/defender.glb',
    name: 'Land Rover Defender 110',
    category: 'Luxury SUV',
    vehicleType: 'car',
    frontOffsetDeg: 0,
    modelAsset: 'defender.glb',
    verified: true,
    licenseVerified: true
  },
  'land rover defender': {
    url: '/models/defender.glb',
    name: 'Land Rover Defender 110',
    category: 'Luxury SUV',
    vehicleType: 'car',
    frontOffsetDeg: 0,
    modelAsset: 'defender.glb',
    verified: true,
    licenseVerified: true
  },
  'land rover defender 110': {
    url: '/models/defender.glb',
    name: 'Land Rover Defender 110',
    category: 'Luxury SUV',
    vehicleType: 'car',
    frontOffsetDeg: 0,
    modelAsset: 'defender.glb',
    verified: true,
    licenseVerified: true
  }
};

export const VEHICLE_3D_CATALOG = VERIFIED_VEHICLE_3D_REGISTRY;

// ── DYNAMIC 3D LIBRARY STATE & CACHE ──
let dynamicLibraryModels = [];
let dynamicLibraryById = {};
let dynamicLibraryByAssetPath = {};
let libraryLoading = false;
let libraryError = null;
let libraryInitialized = false;
let lastFetchedTimestamp = 0;
let libraryFetchPromise = null;
const libraryListeners = new Set();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Resolve API base URL safely across both browser and headless test environments.
 */
function resolveApiBase() {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api.php';
    }
    return '/backend/api.php';
  }
  return '/api.php';
}

/**
 * Normalizes a raw model record from the backend vehicle_3d_library API
 * into the helper's standardized model format.
 */
export function normalizeLibraryModel(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const assetPath = String(raw.model_asset_path || raw.url || '').trim();
  const vehicleType = String(raw.vehicle_type || raw.vehicleType || 'car').toLowerCase();
  const isCar = vehicleType === 'car';

  const isLicenseVerified = Boolean(raw.license_verified);
  const licenseType = raw.license_type || raw.licenseType || 'Commercial Royalty-Free';
  const licenseUrl = raw.license_url || raw.licenseUrl || '';
  const licenseNotice = raw.license_notice || raw.licenseNotice || (
    isLicenseVerified 
      ? 'Approved for 360 viewer with creator attribution.' 
      : 'Licence unverified for general redistribution. Restricted to verified single-listing display only.'
  );

  const isActive = raw.is_active !== undefined 
    ? (Number(raw.is_active) === 1 || raw.is_active === true) 
    : true;

  const creator = raw.creator_attribution || raw.creatorAttribution || '';

  return {
    libraryId: String(raw.library_id || raw.libraryId || ''),
    url: assetPath,
    name: raw.canonical_name || raw.name || `${raw.make || ''} ${raw.model || ''}`.trim() || 'Vehicle 3D Model',
    canonicalName: raw.canonical_name || raw.name || '',
    make: raw.make || '',
    model: raw.model || '',
    generation: raw.generation || '',
    bodyStyle: raw.body_style || raw.bodyStyle || '',
    category: raw.body_style || raw.category || (isCar ? 'Luxury Vehicle' : 'Motorcycle'),
    vehicleType: isCar ? 'car' : 'bike',
    modelAsset: assetPath ? assetPath.split('/').pop() : '',
    frontOffsetDeg: Number(raw.front_offset_deg !== undefined ? raw.front_offset_deg : (isCar ? 0 : 270)),
    fileSizeBytes: Number(raw.file_size_bytes || raw.fileSizeBytes || 0),
    polygonCount: raw.polygon_count !== null && raw.polygon_count !== undefined ? Number(raw.polygon_count) : null,
    creatorAttribution: creator,
    licenseType: licenseType,
    licenseUrl: licenseUrl,
    licenseVerified: isLicenseVerified,
    licenseNotice: licenseNotice,
    isActive: isActive,
    matchKeywords: Array.isArray(raw.match_keywords) ? raw.match_keywords : [],
    attribution: {
      creator: creator,
      license: licenseType,
      source: licenseUrl
    },
    verified: isLicenseVerified // Strictly reflects verified license status
  };
}

/**
 * Load active library models from backend vehicle_3d_library API.
 * Deduplicates in-flight calls, caches results, and falls back gracefully.
 */
export function loadVehicle3DLibrary({ forceRefresh = false, timeoutMs = 4000 } = {}) {
  // Deduplicate in-flight fetch promise
  if (libraryFetchPromise) {
    return libraryFetchPromise;
  }

  // If already initialized and within TTL, return cached models immediately
  if (!forceRefresh && libraryInitialized && dynamicLibraryModels.length > 0) {
    if (Date.now() - lastFetchedTimestamp < CACHE_TTL_MS) {
      return Promise.resolve(dynamicLibraryModels);
    }
  }

  libraryLoading = true;
  libraryError = null;

  libraryFetchPromise = (async () => {
    try {
      const apiBase = resolveApiBase();
      const url = `${apiBase}?resource=vehicle_3d_library`;

      let response;
      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
      } else {
        response = await fetch(url);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load 3D library`);
      }

      const json = await response.json();
      if (!json || !json.success || !Array.isArray(json.models)) {
        throw new Error('Malformed 3D library response from API');
      }

      const normalized = [];
      const byId = {};
      const byPath = {};

      for (const raw of json.models) {
        const item = normalizeLibraryModel(raw);
        if (item && item.url) {
          normalized.push(item);
          if (item.libraryId) byId[item.libraryId] = item;
          if (item.url) byPath[item.url] = item;
        }
      }

      dynamicLibraryModels = normalized;
      dynamicLibraryById = byId;
      dynamicLibraryByAssetPath = byPath;
      libraryInitialized = true;
      lastFetchedTimestamp = Date.now();
      libraryLoading = false;
      libraryError = null;

      notifyLibraryListeners();
      return dynamicLibraryModels;
    } catch (err) {
      libraryLoading = false;
      libraryError = err.message || 'Error fetching 3D model library';
      // Fallback is transparent; static registry remains available
      console.warn('[vehicle360Helper] Dynamic 3D library fetch notice; retaining static registry baseline:', libraryError);
      return dynamicLibraryModels.length > 0 ? dynamicLibraryModels : [];
    } finally {
      libraryFetchPromise = null;
    }
  })();

  return libraryFetchPromise;
}

/**
 * Synchronous snapshot of library loading state.
 */
export function getVehicle3DLibraryState() {
  return {
    models: dynamicLibraryModels,
    loading: libraryLoading,
    error: libraryError,
    initialized: libraryInitialized,
    isFallback: !libraryInitialized || dynamicLibraryModels.length === 0
  };
}

/**
 * Look up a model by library_id from the dynamic cache.
 */
export function getLibraryModelById(libraryId) {
  if (!libraryId) return null;
  return dynamicLibraryById[String(libraryId)] || null;
}

/**
 * Subscribe to library updates (e.g. after background load completes).
 */
export function subscribeVehicle3DLibrary(callback) {
  if (typeof callback !== 'function') return () => {};
  libraryListeners.add(callback);
  return () => {
    libraryListeners.delete(callback);
  };
}

function notifyLibraryListeners() {
  for (const listener of libraryListeners) {
    try {
      listener(getVehicle3DLibraryState());
    } catch (e) {
      console.error('[vehicle360Helper] Error in library listener:', e);
    }
  }
}

/**
 * Testing helper to reset internal cache for unit/integration tests.
 */
export function _resetVehicle3DLibraryForTesting(initialModels = null) {
  if (initialModels && Array.isArray(initialModels)) {
    const normalized = [];
    const byId = {};
    const byPath = {};
    for (const raw of initialModels) {
      const item = normalizeLibraryModel(raw);
      if (item && item.url) {
        normalized.push(item);
        if (item.libraryId) byId[item.libraryId] = item;
        if (item.url) byPath[item.url] = item;
      }
    }
    dynamicLibraryModels = normalized;
    dynamicLibraryById = byId;
    dynamicLibraryByAssetPath = byPath;
    libraryInitialized = true;
    lastFetchedTimestamp = Date.now();
  } else {
    dynamicLibraryModels = [];
    dynamicLibraryById = {};
    dynamicLibraryByAssetPath = {};
    libraryInitialized = false;
    lastFetchedTimestamp = 0;
  }
  libraryLoading = false;
  libraryError = null;
  libraryFetchPromise = null;
}

// Background initial load in browser environment
if (typeof window !== 'undefined') {
  setTimeout(() => {
    loadVehicle3DLibrary().catch(() => {});
  }, 0);
}

/**
 * Returns required 3D model filename and descriptive label when a vehicle has no 3D asset.
 */
export function getRequired3DAssetInfo(vehicle) {
  if (!vehicle) return { assetName: 'vehicle.glb', label: 'Vehicle' };
  const norm = (vehicle.name || '').toLowerCase();
  if (norm.includes('defender')) {
    return { assetName: 'defender.glb', label: 'Land Rover Defender' };
  }
  if (norm.includes('gt')) {
    return { assetName: 'gt.glb', label: 'Honda PCX 160 Continental GT' };
  }
  if (norm.includes('classic 350') || norm.includes('classic')) {
    return { assetName: 'classic_350.glb', label: 'Honda PCX 160 eSP+' };
  }
  if (norm.includes('activa')) {
    return { assetName: 'activa_6g.glb', label: 'Honda PCX 160' };
  }
  if (norm.includes('fz')) {
    return { assetName: 'fz_s.glb', label: 'Yamaha FZ-S V3' };
  }
  if (norm.includes('himalayan')) {
    return { assetName: 'himalayan_450.glb', label: 'Yamaha NMAX 155 ABS' };
  }
  if (norm.includes('thar')) {
    return { assetName: 'thar_4x4.glb', label: 'Toyota Fortuner 4x4' };
  }
  if (norm.includes('swift')) {
    return { assetName: 'swift.glb', label: 'Toyota Altis Sedan' };
  }
  if (norm.includes('creta')) {
    return { assetName: 'creta.glb', label: 'Toyota Fortuner VIP' };
  }
  if (norm.includes('ertiga')) {
    return { assetName: 'ertiga.glb', label: 'Toyota Commuter VIP 9-Seater' };
  }
  if (norm.includes('fortuner')) {
    return { assetName: 'fortuner.glb', label: 'Toyota Fortuner' };
  }
  const slug = (vehicle.name || 'vehicle').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return { assetName: `${slug}.glb`, label: vehicle.name || 'Vehicle' };
}

/**
 * Resolves 3D model asset configuration for a vehicle.
 * 
 * Precedence Rules:
 * 1. Explicit model_library_id or model3d path matched against dynamic library.
 *    - Respects is_active: if model is disabled by admin, returns null (photo fallback).
 * 2. Explicit model3d URL on vehicle object (e.g. from DB or API).
 * 3. Exact stable vehicle ID match in VERIFIED_VEHICLE_3D_REGISTRY.
 * 4. Exact verified catalog matching by vehicle model name in static registry.
 * 5. Absolutely NO generic fallbacks (car_concept.glb, motorcycle.glb, ferrari.glb).
 *    Returns null so vehicles without their own approved 3D model show Photo Gallery only.
 */
export function getVehicle3DModel(vehicle) {
  if (!vehicle) return null;

  const vehicleId = String(vehicle.id || '').trim();
  const rawModel3d = (vehicle.model3d || vehicle.model_3d || vehicle.glb_url || '').trim();
  const rawLibraryId = (vehicle.model_library_id || vehicle.library_id || '').trim();

  // 1. Explicit model_library_id or explicit model3d path resolved against dynamic library
  if (dynamicLibraryModels.length > 0) {
    let matchedLibraryModel = null;

    if (rawLibraryId && dynamicLibraryById[rawLibraryId]) {
      matchedLibraryModel = dynamicLibraryById[rawLibraryId];
    } else if (rawModel3d && dynamicLibraryByAssetPath[rawModel3d]) {
      matchedLibraryModel = dynamicLibraryByAssetPath[rawModel3d];
    }

    if (matchedLibraryModel) {
      // Respect is_active: If model was disabled by admin, return null -> safe photo fallback
      if (!matchedLibraryModel.isActive) {
        return null;
      }
      return matchedLibraryModel;
    }
  }

  // 2. Explicit model3d URL on vehicle object (e.g. from DB or API)
  if (rawModel3d) {
    const isCar = (vehicle.category || vehicle.type || '').toLowerCase().includes('car');
    return {
      url: rawModel3d,
      name: vehicle.name || 'Vehicle',
      vehicleType: isCar ? 'car' : 'bike',
      frontOffsetDeg: isCar ? 180 : 270,
      verified: true
    };
  }

  // 3. Exact stable vehicle ID match in VERIFIED_VEHICLE_3D_REGISTRY (static baseline)
  if (vehicleId && VERIFIED_VEHICLE_3D_REGISTRY[vehicleId]) {
    return VERIFIED_VEHICLE_3D_REGISTRY[vehicleId];
  }

  // 4. Exact verified catalog matching by vehicle model name in static registry
  const norm = (vehicle.name || '').toLowerCase().trim();
  for (const [key, config] of Object.entries(VERIFIED_VEHICLE_3D_REGISTRY)) {
    if (key.length > 2 && norm === key) {
      return config;
    }
  }
  for (const [key, config] of Object.entries(VERIFIED_VEHICLE_3D_REGISTRY)) {
    if (key.length > 4 && norm.includes(key)) {
      return config;
    }
  }

  // 5. No generic fallback! Returns null so vehicles without their own approved 3D model show Photo Gallery only.
  return null;
}

/**
 * Extracts and resolves genuine 360° frames for a vehicle with rigorous asset classification.
 * @param {Object} vehicle - The vehicle data object
 * @returns {Object} Full asset resolution metadata
 */
export function getVehicle360Assets(vehicle) {
  if (!vehicle) {
    return {
      frames: [],
      angles: null,
      assetState: 'EMPTY',
      hasFull360: false,
      isPartial2Images: false,
      isSingleImage: false,
      availableAngles: [],
      missingAngles: ['Front (0°)', 'Right Side (90°)', 'Rear (180°)', 'Left Side (270°)']
    };
  }

  const list = [];
  const add = (img) => {
    if (!img) return;
    if (typeof img === 'string') {
      const trimmed = img.trim();
      if (trimmed && !list.includes(trimmed)) list.push(trimmed);
    } else if (Array.isArray(img)) {
      img.forEach(add);
    }
  };

  const model3d = getVehicle3DModel(vehicle);

  // 1. Explicit frames_360 sequence
  if (vehicle.frames_360) {
    try {
      const parsed = typeof vehicle.frames_360 === 'string' ? JSON.parse(vehicle.frames_360) : vehicle.frames_360;
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(add);
        const res = classifyAssets(list, null, vehicle.name);
        res.model3d = model3d;
        return res;
      }
    } catch (e) {}
  }

  // 2. Explicit angle_images or angles object
  const rawAngles = vehicle.angle_images || vehicle.angles;
  if (rawAngles) {
    try {
      const parsed = typeof rawAngles === 'string' ? JSON.parse(rawAngles) : rawAngles;
      if (parsed && typeof parsed === 'object') {
        const front = parsed.front || parsed['0'];
        const side = parsed.side || parsed.right || parsed['90'];
        const rear = parsed.rear || parsed.back || parsed['180'];
        const left = parsed.left || parsed['270'];
        [front, side, rear, left].forEach(add);
        const res = classifyAssets(list, parsed, vehicle.name);
        res.model3d = model3d;
        return res;
      }
    } catch (e) {}
  }

  // 3. Multi-image array in images_json
  if (vehicle.images_json) {
    try {
      const parsed = typeof vehicle.images_json === 'string' ? JSON.parse(vehicle.images_json) : vehicle.images_json;
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(add);
        const res = classifyAssets(list, null, vehicle.name);
        res.model3d = model3d;
        return res;
      }
    } catch (e) {}
  }

  // 4. Collect other vehicle-specific image properties
  add(vehicle.image);
  add(vehicle.image_url);
  add(vehicle.imageUrl);

  if (Array.isArray(vehicle.images)) add(vehicle.images);
  if (Array.isArray(vehicle.mediaList)) add(vehicle.mediaList.map(m => m?.url || m));
  if (Array.isArray(vehicle.media_list)) add(vehicle.media_list.map(m => m?.url || m));
  if (Array.isArray(vehicle.additional_images)) add(vehicle.additional_images);

  // 5. Genuine uploaded vehicle photography only (no stock-photo substitutions)

  const finalRes = classifyAssets(list, null, vehicle.name);
  finalRes.model3d = model3d;
  return finalRes;
}

/**
 * Helper to classify frame count into precise asset states
 */
function classifyAssets(frames, angleMap = null, vehicleName = '') {
  const count = frames.length;

  if (count >= 4) {
    const angles = angleMap || {
      front: frames[0],
      side: frames[Math.floor(count * 0.25)],
      rear: frames[Math.floor(count * 0.50)],
      left: frames[Math.floor(count * 0.75)]
    };
    return {
      frames,
      angles,
      assetState: 'FULL_360',
      hasFull360: true,
      isPartial2Images: false,
      isSingleImage: false,
      availableAngles: ['Front (0°)', 'Right Side (90°)', 'Rear (180°)', 'Left Side (270°)'],
      missingAngles: []
    };
  }

  if (count === 2) {
    // 2 images: Left Side (Index 0) and Right Side (Index 1)
    return {
      frames,
      angles: {
        front: null,
        side: frames[1], // Right Profile (90°)
        rear: null,
        left: frames[0]  // Left Profile (270°)
      },
      assetState: 'PARTIAL_2_IMAGES',
      hasFull360: false,
      isPartial2Images: true,
      isSingleImage: false,
      availableAngles: ['Right Side (90°)', 'Left Side (270°)'],
      missingAngles: ['Front View (0°)', 'Rear View (180°)']
    };
  }

  if (count === 3) {
    return {
      frames,
      angles: {
        front: frames[0],
        side: frames[1],
        rear: null,
        left: frames[2]
      },
      assetState: 'PARTIAL_3_IMAGES',
      hasFull360: false,
      isPartial2Images: false,
      isSingleImage: false,
      availableAngles: ['Front (0°)', 'Right Side (90°)', 'Left Side (270°)'],
      missingAngles: ['Rear View (180°)']
    };
  }

  if (count === 1) {
    return {
      frames,
      angles: {
        front: frames[0],
        side: null,
        rear: null,
        left: null
      },
      assetState: 'SINGLE_IMAGE',
      hasFull360: false,
      isPartial2Images: false,
      isSingleImage: true,
      availableAngles: ['Primary Studio View (Front)'],
      missingAngles: ['Right Side (90°)', 'Rear View (180°)', 'Left Side (270°)']
    };
  }

  return {
    frames: [],
    angles: null,
    assetState: 'EMPTY',
    hasFull360: false,
    isPartial2Images: false,
    isSingleImage: false,
    availableAngles: [],
    missingAngles: ['Front (0°)', 'Right Side (90°)', 'Rear (180°)', 'Left Side (270°)']
  };
}
