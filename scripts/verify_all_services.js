const http = require('http');

function checkEndpoint(name, url, options = {}) {
  return new Promise((resolve) => {
    const postData = options.body ? JSON.stringify(options.body) : null;
    const urlObj = new URL(url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {})
      }
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({
          name,
          url,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          dataPreview: parsed || (data.slice(0, 100) + '...')
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        url,
        status: 'ERROR',
        ok: false,
        error: err.message
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

(async () => {
  console.log('============================================================');
  console.log('🔍 WOW THAILAND: COMPREHENSIVE SERVICE STATUS AUDIT');
  console.log('============================================================\n');

  const checks = [
    // 1. Core Platform & Database
    { name: 'Core API Health & MySQL Database Connection', url: 'http://localhost:5000/api/v1/health' },

    // 2. Hotel & Accommodation PMS
    { name: 'Hotel Catalog Service (/api.php?resource=hotels)', url: 'http://localhost:5000/api.php?resource=hotels' },
    { name: 'Hotel Public Rooms (/api.php?resource=hotel_rooms_public)', url: 'http://localhost:5000/api.php?resource=hotel_rooms_public' },

    // 3. Cab & Transfer Fleet Dispatch System
    { name: 'Airport Transfer Routes (/api.php?resource=transfer_routes)', url: 'http://localhost:5000/api.php?resource=transfer_routes' },
    { name: 'Fleet Cabs & Vehicles Catalog (/api.php?resource=cabs)', url: 'http://localhost:5000/api.php?resource=cabs' },
    { 
      name: 'Cab Distance & Fare Estimator (REST API)', 
      url: 'http://localhost:5000/api/v1/cabs/estimate',
      options: {
        method: 'POST',
        body: {
          service_type: 'airport_transfer',
          airport_code: 'BKK',
          destination: 'Bangkok City Center'
        }
      }
    },

    // 4. Tours, Experiences & Currency
    { name: 'Signature Tours & Activities (/api.php?resource=activities)', url: 'http://localhost:5000/api.php?resource=activities' },
    { name: 'Travel Packages Catalog (/api.php?resource=packages)', url: 'http://localhost:5000/api.php?resource=packages' },
    { name: 'Multi-Currency Forex Engine (/api.php?resource=currency)', url: 'http://localhost:5000/api.php?resource=currency' },

    // 5. Authentication & Role Gateways
    {
      name: 'Admin Login Gateway',
      url: 'http://localhost:5000/api/v1/auth/login',
      options: {
        method: 'POST',
        body: { username: 'admin', password: 'admin@2026' }
      }
    },
    {
      name: 'SuperAdmin Login Gateway',
      url: 'http://localhost:5000/api/v1/auth/login',
      options: {
        method: 'POST',
        body: { username: 'superadmin', password: 'admin@2026' }
      }
    },
    {
      name: 'Vehicle Fleet Vendor Login Gateway',
      url: 'http://localhost:5000/api/v1/auth/login',
      options: {
        method: 'POST',
        body: { username: 'vendor', password: 'admin@2026' }
      }
    },
    {
      name: 'Hotel Vendor Login Gateway',
      url: 'http://localhost:5000/api/v1/auth/login',
      options: {
        method: 'POST',
        body: { username: 'hotel_vendor', password: 'admin@2026' }
      }
    },
    {
      name: 'Driver Mobile Portal Login Gateway',
      url: 'http://localhost:5000/api/v1/auth/login',
      options: {
        method: 'POST',
        body: { email: 'driver@gmail.com', password: 'admin@2026' }
      }
    },

    // 6. Frontend Web Application & Theatrical Curtain Intro
    { name: 'Frontend Web Application (Vite on Port 5173)', url: 'http://localhost:5173/' },
    { name: '10/10 Theatrical Curtain Intro Assets', url: 'http://localhost:5173/intro/wow-intro.css' }
  ];

  let passed = 0;
  let failed = 0;

  for (const c of checks) {
    const res = await checkEndpoint(c.name, c.url, c.options || {});
    if (res.ok) {
      passed++;
      console.log(`✅ ACTIVE [${res.status}] ${res.name}`);
      if (res.dataPreview && typeof res.dataPreview === 'object') {
        if (res.dataPreview.user) {
          console.log(`   Authenticated User: ${res.dataPreview.user.username || res.dataPreview.user.email} (Role: ${res.dataPreview.user.role})`);
        } else if (res.dataPreview.data) {
          console.log(`   Estimated Route: ${res.dataPreview.data.route_type || 'Custom'} (${res.dataPreview.data.distance_km || 0} km, Sedan: ฿${res.dataPreview.tiers?.sedan?.fare_thb || 0})`);
        }
      }
    } else {
      failed++;
      console.log(`❌ ERROR [${res.status}] ${res.name}`);
      console.log(`   URL: ${res.url}`);
      console.log(`   Detail: ${res.error || JSON.stringify(res.dataPreview)}`);
    }
    console.log('');
  }

  console.log('============================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`STATUS: ${failed === 0 ? '🟢 ALL SERVICES RUNNING 100% HEALTHY' : '🔴 SOME SERVICES NEED ATTENTION'}`);
  console.log('============================================================');
})();
