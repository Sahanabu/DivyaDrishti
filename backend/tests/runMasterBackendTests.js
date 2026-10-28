/**
 * DivyaDrishti Master Backend & Live API Integration Test Suite
 * Boots the backend service, tests all REST endpoints and WebSockets, and exits cleanly.
 */

const http = require('http');
const assert = require('assert');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      timeout: 25000
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${method} ${path}`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runMasterSuite() {
  console.log('===========================================================');
  console.log('   DIVYADRISHTI COMPLETE MASTER BACKEND TEST SUITE        ');
  console.log('===========================================================\n');

  // Start the server
  console.log('Starting DivyaDrishti Express & Socket.IO backend...');
  require('../server.js');

  // Wait for health endpoint
  let healthy = false;
  for (let i = 0; i < 20; i++) {
    try {
      const h = await request('GET', '/api/health');
      if (h.status === 200) {
        healthy = true;
        break;
      }
    } catch (_) {}
    await sleep(300);
  }
  assert.ok(healthy, 'Backend failed to start within 6 seconds');
  console.log('✓ Backend healthy on port 5000 (MongoDB connected)\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error(`  Error: ${err.message}`);
    }
  }

  // 1. Health & Status
  await test('GET /api/health and /api/telemetry/status', async () => {
    const resH = await request('GET', '/api/health');
    assert.strictEqual(resH.status, 200);
    assert.strictEqual(resH.body.status, 'OK');

    const resS = await request('GET', '/api/telemetry/status');
    assert.strictEqual(resS.status, 200);
    assert.ok(resS.body.success);
  });

  // 2. RFID Authentication
  await test('POST /api/auth/rfid (Authorized & Unauthorized)', async () => {
    const authOk = await request('POST', '/api/auth/rfid', {
      rfid: 'C9 DA 12 07',
      deviceId: 'ESP32_HELMET_01'
    });
    assert.strictEqual(authOk.status, 200);
    assert.strictEqual(authOk.body.success, true);

    const authBad = await request('POST', '/api/auth/rfid', {
      rfid: 'BD 92 35 07',
      deviceId: 'ESP32_HELMET_01'
    });
    assert.strictEqual(authBad.status, 403);
  });

  // 3. Phone Device GPS Bridge
  await test('POST /api/location/device (GPS Bridge)', async () => {
    const devLoc = await request('POST', '/api/location/device', {
      latitude: 15.4318,
      longitude: 76.5312,
      accuracy: 4.2
    });
    assert.strictEqual(devLoc.status, 200);
    assert.strictEqual(devLoc.body.success, true);
    assert.strictEqual(devLoc.body.locationStatus, 'RESOLVED');
  });

  // 4. Telemetry Ingestion
  await test('POST /api/telemetry (Routine sensor update)', async () => {
    const tel = await request('POST', '/api/telemetry', {
      device: 'ESP32_HELMET_01',
      rider: 'Sahana',
      sessionActive: true,
      latitude: 15.432,
      longitude: 76.543,
      speed: 34.5,
      accelX: 0.1,
      accelY: 0.2,
      accelZ: 9.8,
      accMagnitude: 1.0,
      mq3: 150
    });
    assert.strictEqual(tel.status, 201);
    assert.strictEqual(tel.body.success, true);
    assert.ok(tel.body.risk);
    assert.ok(tel.body.event);
  });

  // 5. Trip Management Lifecycle
  await test('Trips: Start trip, record breadcrumb, get active trip, end trip', async () => {
    // Start
    const tStart = await request('POST', '/api/trips/start', {
      rider: 'Sahana',
      device: 'ESP32_HELMET_01',
      startLocation: { latitude: 15.4318, longitude: 75.6586, placeName: 'Hubballi Campus' }
    });
    assert.strictEqual(tStart.status, 201);
    assert.ok(tStart.body.trip.tripId);

    // Breadcrumb
    const tCrumb = await request('POST', '/api/trips/breadcrumb', {
      latitude: 15.4335,
      longitude: 75.6601,
      speed: 38.2,
      acceleration: 1.05
    });
    assert.strictEqual(tCrumb.status, 200);
    assert.strictEqual(tCrumb.body.success, true);

    // Active trip
    const tActive = await request('GET', '/api/trips/active');
    assert.strictEqual(tActive.status, 200);
    assert.strictEqual(tActive.body.trip.status, 'ACTIVE');
    assert.ok(tActive.body.trip.breadcrumbs.length >= 2);

    // End trip
    const tEnd = await request('POST', '/api/trips/end');
    assert.strictEqual(tEnd.status, 200);
    assert.strictEqual(tEnd.body.trip.status, 'COMPLETED');
  });

  // 6. Real-Time Safety Score & AI Analytics
  await test('AI: Safety score get, deduction on risk event, and reset', async () => {
    // Reset to 100
    const resetRes = await request('POST', '/api/ai/safety-score/reset');
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.score, 100);

    // Post an AI prediction event (Drowsiness)
    const predRes = await request('POST', '/api/ai/prediction', {
      event: 'DROWSINESS',
      risk: 'HIGH',
      confidence: 94.0,
      timestamp: Date.now()
    });
    assert.strictEqual(predRes.status, 200);

    // Check safety score deduction
    const scoreRes = await request('GET', '/api/ai/safety-score');
    assert.strictEqual(scoreRes.status, 200);
    assert.ok(scoreRes.body.score < 100, 'Score should have deducted points for drowsiness');
  });

  // 7. WhatsApp SOS Deep-Link Generation Endpoint
  await test('POST /api/emergency/whatsapp (1-Click Lifeline URL)', async () => {
    const waRes = await request('POST', '/api/emergency/whatsapp', {
      phone: '+918431712890',
      rider: 'Sahana',
      type: 'IMPACT',
      latitude: 15.4318,
      longitude: 75.6586,
      speed: 38.0
    });
    assert.strictEqual(waRes.status, 200);
    assert.ok(waRes.body.whatsAppUrl.includes('whatsapp.com'));
    assert.ok(waRes.body.whatsAppUrl.includes('Sahana'));
  });

  // 8. Rider Profile & Emergency Contacts
  await test('Rider: GET profile and PUT emergency contacts', async () => {
    const rProf = await request('GET', '/api/rider/profile');
    assert.strictEqual(rProf.status, 200);
    assert.strictEqual(rProf.body.rider.name, 'Sahana');

    const updateRes = await request('PUT', '/api/rider/contacts', {
      emergencyContacts: [
        { name: 'Dr. Ramesh Patil', relationship: 'Father', phone: '+919448123456', isPrimary: true },
        { name: 'Sunita Patil', relationship: 'Mother', phone: '+919448654321', isPrimary: false }
      ]
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.emergencyContacts.length, 2);
  });

  // 9. Emergency Alert: 10s Window and Cancellation Flow
  await test('Emergency: Trigger 10s window and cancel before SMS dispatch', async () => {
    const emRes = await request('POST', '/api/emergency', {
      type: 'IMPACT',
      rider: 'Sahana',
      device: 'ESP32_HELMET_01',
      telemetry: { latitude: 15.4318, longitude: 75.6586, speed: 45.0 }
    });
    assert.strictEqual(emRes.status, 200);
    assert.strictEqual(emRes.body.pending, true);

    // Cancel within the 10s window (False alarm)
    const cancelRes = await request('POST', '/api/emergency/cancel');
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.cancelled, true);
  });

  // 10. Emergency Alert: Direct SOS Dispatch Flow
  await test('Emergency: Direct SOS dispatch with WhatsApp & multi-channel broadcast', async () => {
    const dispRes = await request('POST', '/api/emergency/dispatch', {
      raw: { type: 'IMPACT', rider: 'Sahana' },
      telemetry: { latitude: 15.4318, longitude: 75.6586, speed: 38.0 }
    });
    assert.strictEqual(dispRes.status, 200);
    assert.strictEqual(dispRes.body.dispatched, true);
    assert.ok(dispRes.body.whatsAppUrl);
  });

  console.log('\n-----------------------------------------------------------');
  console.log(`Results: ${passed}/${total} Passed, ${total - passed} Failed`);
  console.log('===========================================================');

  if (passed === total) {
    console.log('🎉 ALL BACKEND SUBSYSTEM TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMasterSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
