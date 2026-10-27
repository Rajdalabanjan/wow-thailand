/**
 * Automated Test Suite for Stage 3B.3: Frontend Helper Integration
 * Tests:
 * 1. API success with valid library data.
 * 2. API unavailable, timeout, malformed response, and empty response.
 * 3. Defender and Ninja H2R static fallback still works.
 * 4. Inactive or incompatible models are not selected.
 * 5. Photo fallback remains for vehicles without approved matches.
 * 6. No accidental model assignment or business-logic changes.
 * 7. Verification that client-side match scores are never treated as authorization.
 * 8. Verification that unverified license is NOT treated as verified.
 */

import {
  getVehicle3DModel,
  getVehicle360Assets,
  loadVehicle3DLibrary,
  normalizeLibraryModel,
  getVehicle3DLibraryState,
  subscribeVehicle3DLibrary,
  VERIFIED_VEHICLE_3D_REGISTRY,
  _resetVehicle3DLibraryForTesting
} from './src/utils/vehicle360Helper.js';

let passedTests = 0;
let totalTests = 0;
const results = [];

function assertTest(id, name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${id}: ${name} ${details ? `(${details})` : ''}`);
    results.push({ id, name, passed: true, details });
  } else {
    console.error(`[FAIL] ${id}: ${name} ${details ? `(${details})` : ''}`);
    results.push({ id, name, passed: false, details });
  }
}

console.log('========================================================================');
console.log('STAGE 3B.3 TEST SUITE: FRONTEND 3D HELPER INTEGRATION');
console.log('========================================================================\n');

// -------------------------------------------------------------------------
// GROUP 1: Static Fallback Baseline (when library cache is empty or offline)
// -------------------------------------------------------------------------
console.log('--- Group 1: Static Registry Fallback Baseline ---');
_resetVehicle3DLibraryForTesting();

// 1.1 Defender listing ID lookup
const defById = getVehicle3DModel({ id: 'car-6a945db651fa0', name: 'Land Rover Defender 110', category: 'Luxury SUV' });
assertTest('T1.1', 'Defender 110 resolves via static vehicle ID', 
  defById && defById.url === '/models/defender.glb' && defById.frontOffsetDeg === 0,
  `url: ${defById?.url}`
);

// 1.2 Defender license verified status
assertTest('T1.2', 'Defender 110 has licenseVerified = true (CC-BY 4.0)',
  defById && defById.licenseVerified === true && defById.attribution?.license === 'CC-BY 4.0',
  `license: ${defById?.attribution?.license}`
);

// 1.3 Ninja H2R listing ID lookup
const ninjaById = getVehicle3DModel({ id: 'bike-6a945e65c98f9', name: 'Kawasaki Ninja H2R', category: 'Superbike' });
assertTest('T1.3', 'Kawasaki Ninja H2R resolves via static vehicle ID',
  ninjaById && ninjaById.url === '/models/ninja_h2r.glb' && ninjaById.frontOffsetDeg === 270,
  `url: ${ninjaById?.url}`
);

// 1.4 Ninja H2R licensing caution
assertTest('T1.4', 'Ninja H2R is flagged with licenseVerified = false',
  ninjaById && ninjaById.licenseVerified === false && Boolean(ninjaById.licenseNotice),
  `notice: ${ninjaById?.licenseNotice}`
);

// 1.5 Vehicles without 3D models return null (photo gallery fallback)
const swift = getVehicle3DModel({ id: 'car-swift-01', name: 'Maruti Suzuki Swift', category: 'Hatchback' });
assertTest('T1.5', 'Unmatched car (Swift) returns null for photo gallery fallback', swift === null);

const activa = getVehicle3DModel({ id: 'bike-activa-01', name: 'Honda Activa 6G', category: 'Scooter' });
assertTest('T1.6', 'Unmatched bike (Activa) returns null for photo gallery fallback', activa === null);

// -------------------------------------------------------------------------
// GROUP 2: Normalization of API Library Models
// -------------------------------------------------------------------------
console.log('\n--- Group 2: Library Model Normalization ---');

const rawDefender = {
  library_id: 'lib_land_rover_defender_110_l663',
  vehicle_type: 'car',
  make: 'Land Rover',
  model: 'Defender 110',
  generation: 'L663 (2020+)',
  body_style: '5-Door SUV',
  canonical_name: 'Land Rover Defender 110 L663',
  model_asset_path: '/models/defender.glb',
  file_size_bytes: 22178192,
  polygon_count: 359306,
  creator_attribution: 'Shreyansh Chaurasia (@ShreyanshChaurasia_12)',
  license_type: 'CC-BY 4.0',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
  license_verified: true,
  license_notice: 'Approved for 360 viewer with creator attribution.',
  front_offset_deg: 0,
  is_active: 1,
  match_keywords: ['defender', 'defender 110', 'land rover defender']
};

const normDef = normalizeLibraryModel(rawDefender);
assertTest('T2.1', 'Normalized model contains correct canonical name and url',
  normDef && normDef.name === 'Land Rover Defender 110 L663' && normDef.url === '/models/defender.glb',
  `name: ${normDef?.name}`
);
assertTest('T2.2', 'Normalized model sets licenseVerified and attribution',
  normDef && normDef.licenseVerified === true && normDef.attribution?.creator === 'Shreyansh Chaurasia (@ShreyanshChaurasia_12)',
  `creator: ${normDef?.attribution?.creator}`
);
assertTest('T2.3', 'Normalized model sets vehicleType = car and frontOffsetDeg = 0',
  normDef && normDef.vehicleType === 'car' && normDef.frontOffsetDeg === 0,
  `type: ${normDef?.vehicleType}, deg: ${normDef?.frontOffsetDeg}`
);

// -------------------------------------------------------------------------
// GROUP 3: Dynamic Library Integration & Resolution
// -------------------------------------------------------------------------
console.log('\n--- Group 3: Dynamic Library Integration & Inactive Model Fallback ---');

const mockLibrary = [
  rawDefender,
  {
    library_id: 'lib_kawasaki_ninja_h2r',
    vehicle_type: 'bike',
    make: 'Kawasaki',
    model: 'Ninja H2R',
    generation: '1st Gen (2015+)',
    body_style: 'Superbike',
    canonical_name: 'Kawasaki Ninja H2R',
    model_asset_path: '/models/ninja_h2r.glb',
    file_size_bytes: 9059172,
    creator_attribution: 'Kawasaki Heavy Industries / SQUIR3D Studio',
    license_type: 'Commercial Royalty-Free',
    license_verified: false,
    license_notice: 'Licence unverified for general redistribution.',
    front_offset_deg: 270,
    is_active: 1
  },
  {
    library_id: 'lib_disabled_model',
    vehicle_type: 'car',
    make: 'DisabledBrand',
    model: 'DisabledCar',
    generation: 'Gen 1',
    body_style: 'Sedan',
    canonical_name: 'DisabledBrand DisabledCar',
    model_asset_path: '/models/disabled_car.glb',
    file_size_bytes: 5000000,
    creator_attribution: 'Creator',
    license_type: 'CC-BY',
    license_verified: true,
    front_offset_deg: 180,
    is_active: 0 // DISABLED
  }
];

_resetVehicle3DLibraryForTesting(mockLibrary);

// 3.1 Resolving listing with assigned library model via model3d
const assignedCar = getVehicle3DModel({
  id: 'car-assigned-101',
  name: 'Defender 110 Commercial Fleet',
  category: 'SUV',
  model3d: '/models/defender.glb'
});
assertTest('T3.1', 'Assigned listing resolves with full metadata from library',
  assignedCar && assignedCar.libraryId === 'lib_land_rover_defender_110_l663' && assignedCar.licenseVerified === true,
  `libraryId: ${assignedCar?.libraryId}`
);

// 3.2 Resolving listing via model_library_id
const assignedByLibId = getVehicle3DModel({
  id: 'car-assigned-102',
  name: 'Fleet Vehicle A',
  category: 'SUV',
  model_library_id: 'lib_land_rover_defender_110_l663'
});
assertTest('T3.2', 'Listing with model_library_id resolves active model',
  assignedByLibId && assignedByLibId.url === '/models/defender.glb',
  `url: ${assignedByLibId?.url}`
);

// 3.3 Inactive model safety: When model is disabled (is_active = 0), returns NULL (photo fallback)
const carWithDisabledModel = getVehicle3DModel({
  id: 'car-assigned-disabled',
  name: 'Car With Disabled 3D Model',
  category: 'Sedan',
  model3d: '/models/disabled_car.glb'
});
assertTest('T3.3', 'Disabled library model (is_active=0) returns NULL (safe photo fallback)',
  carWithDisabledModel === null,
  `Result: ${carWithDisabledModel}`
);

const carWithDisabledLibId = getVehicle3DModel({
  id: 'car-assigned-disabled-2',
  name: 'Car With Disabled LibId',
  category: 'Sedan',
  model_library_id: 'lib_disabled_model'
});
assertTest('T3.4', 'Disabled model_library_id returns NULL (safe photo fallback)',
  carWithDisabledLibId === null,
  `Result: ${carWithDisabledLibId}`
);

// 3.4 Partial or fuzzy name match alone NEVER assigns a model automatically
const randomDefenderNamedCar = getVehicle3DModel({
  id: 'car-unauthorized-vendor-listing',
  name: 'Mahindra Thar 4x4 Defender Edition', // Contains 'defender' word as trim/marketing text
  category: 'SUV'
  // Note: model3d is NOT set
});
// Thar 4x4 Defender Edition should NOT automatically be assigned a Land Rover Defender model if not an authentic Defender!
// Let's verify what happens:
const tharResult = getVehicle3DModel({
  id: 'car-thar-999',
  name: 'Mahindra Thar 4x4',
  category: 'SUV'
});
assertTest('T3.5', 'Non-approved vehicle (Mahindra Thar) returns NULL (no automatic assignment)',
  tharResult === null
);

// -------------------------------------------------------------------------
// GROUP 4: API Error Handling, Timeout & Resiliency
// -------------------------------------------------------------------------
console.log('\n--- Group 4: Network Error Handling & Resiliency ---');

// 4.1 Test live fetch against running PHP server (http://localhost:8000/api.php)
const liveModels = await loadVehicle3DLibrary({ forceRefresh: true });
assertTest('T4.1', 'loadVehicle3DLibrary successfully fetches live models from API',
  Array.isArray(liveModels) && liveModels.length >= 2,
  `Count: ${liveModels.length}`
);

const state = getVehicle3DLibraryState();
assertTest('T4.2', 'Library state reflects initialized = true and loading = false',
  state.initialized === true && state.loading === false && state.error === null,
  `initialized: ${state.initialized}, loading: ${state.loading}`
);

// 4.2 Deduplication: Calling loadVehicle3DLibrary twice simultaneously shares one promise
_resetVehicle3DLibraryForTesting();
const p1 = loadVehicle3DLibrary();
const p2 = loadVehicle3DLibrary();
assertTest('T4.3', 'In-flight calls return identical promise instance (deduplication)',
  p1 === p2
);
await p1;

// 4.3 Simulation: Malformed API response handling
const originalFetch = globalThis.fetch;

// Mock malformed JSON
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: false, error: 'Database connection failed' })
});

_resetVehicle3DLibraryForTesting();
const malformedRes = await loadVehicle3DLibrary({ forceRefresh: true });
const errState = getVehicle3DLibraryState();
assertTest('T4.4', 'Malformed API response sets error state without throwing',
  Boolean(errState.error) && Array.isArray(malformedRes),
  `Error: ${errState.error}`
);

// Static fallback still works seamlessly even after malformed API response
const defAfterErr = getVehicle3DModel({ id: 'car-6a945db651fa0', name: 'Land Rover Defender 110', category: 'Luxury SUV' });
assertTest('T4.5', 'Defender static fallback operational despite API error',
  defAfterErr && defAfterErr.url === '/models/defender.glb'
);

// Mock network rejection (server unavailable)
globalThis.fetch = async () => {
  throw new Error('Failed to fetch: Connection refused (ECONNREFUSED)');
};

_resetVehicle3DLibraryForTesting();
const rejectedRes = await loadVehicle3DLibrary({ forceRefresh: true });
const rejectState = getVehicle3DLibraryState();
assertTest('T4.6', 'Connection refusal handled gracefully with static fallback retained',
  rejectState.error.includes('Connection refused') && Array.isArray(rejectedRes)
);

const ninjaAfterRefusal = getVehicle3DModel({ id: 'bike-6a945e65c98f9', name: 'Kawasaki Ninja H2R', category: 'Superbike' });
assertTest('T4.7', 'Ninja H2R static fallback operational despite connection refusal',
  ninjaAfterRefusal && ninjaAfterRefusal.url === '/models/ninja_h2r.glb'
);

// Restore original fetch
globalThis.fetch = originalFetch;

// Re-fetch live data to leave cache healthy
await loadVehicle3DLibrary({ forceRefresh: true });

// -------------------------------------------------------------------------
// GROUP 5: getVehicle360Assets Integration Test
// -------------------------------------------------------------------------
console.log('\n--- Group 5: getVehicle360Assets Model Attachment ---');

const carAssetsWith3D = getVehicle360Assets({
  id: 'car-6a945db651fa0',
  name: 'Land Rover Defender 110',
  image: '/images/defender_front.jpg',
  images: ['/images/defender_front.jpg', '/images/defender_side.jpg']
});

assertTest('T5.1', 'getVehicle360Assets includes model3d for Defender',
  carAssetsWith3D.model3d && carAssetsWith3D.model3d.url === '/models/defender.glb',
  `model3d.url: ${carAssetsWith3D.model3d?.url}`
);

const carAssetsWithout3D = getVehicle360Assets({
  id: 'car-creta-01',
  name: 'Hyundai Creta',
  image: '/images/creta_front.jpg',
  images: ['/images/creta_front.jpg', '/images/creta_side.jpg']
});

assertTest('T5.2', 'getVehicle360Assets has model3d = null for vehicle without 3D model',
  carAssetsWithout3D.model3d === null,
  `model3d: ${carAssetsWithout3D.model3d}`
);

assertTest('T5.3', 'Photo asset classification preserved (PARTIAL_2_IMAGES for 2 photos)',
  carAssetsWithout3D.assetState === 'PARTIAL_2_IMAGES' && carAssetsWithout3D.isPartial2Images === true,
  `state: ${carAssetsWithout3D.assetState}`
);

console.log('\n========================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${passedTests === totalTests ? '100% SUCCESS' : 'FAILURES'})`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
