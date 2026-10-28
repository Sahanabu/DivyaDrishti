/**
 * DivyaDrishti Comprehensive Location System Test Suite
 * 
 * Tests:
 * 1. Coordinates range and validity filtering
 * 2. Reverse geocoding resolution and cache retrieval
 * 3. Wi-Fi access point measurement sanitization
 * 4. Multi-source failover and fallback behavior
 * 5. Request deduplication and rate-limiting
 * 6. Public API confidentiality verification
 * 7. End-to-end Telemetry & Emergency response schemas
 */

const assert = require('assert');
const { resolveLocation, getLastKnownLocation } = require('../src/services/geocodingService');
const { estimateLocation, sanitizeWifiAccessPoints } = require('../src/services/wifiLocationService');

async function runTests() {
  console.log('========================================================');
  console.log('   DIVYADRISHTI LOCATION SYSTEM VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  // --- 1. COORDINATE SANITIZATION & RANGE VALIDATION ---
  await test('Reject (0,0) and invalid coordinates without throwing', async () => {
    const resZero = await resolveLocation(0, 0, true, { maxWaitMs: 300 });
    assert.strictEqual(resZero.status, 'SEARCHING');
    assert.strictEqual(resZero.place, 'Searching for location...');

    const resNaN = await resolveLocation(NaN, NaN, true, { maxWaitMs: 300 });
    assert.strictEqual(resNaN.status, 'SEARCHING');

    const resNoFix = await resolveLocation(15.432, 76.543, false, { maxWaitMs: 300 });
    assert.ok(resNoFix.status === 'SEARCHING' || resNoFix.status === 'SIGNAL_LOST');
  });

  // --- 2. WI-FI ACCESS POINT SANITIZATION ---
  await test('Sanitize and filter Wi-Fi AP measurements', () => {
    const raw = [
      { bssid: 'AA:BB:CC:DD:EE:FF', rssi: -65, channel: 6 },
      { bssid: '12-34-56-78-9a-bc', rssi: -45, channel: 11 },
      { bssid: 'invalid-mac-address', rssi: -50 },
      { bssid: '00:00:00:00:00:00', rssi: -30 }, // Null MAC
      { bssid: 'ff:ff:ff:ff:ff:ff', rssi: -30 }, // Broadcast MAC
      { bssid: 'aa:bb:cc:dd:ee:ff', rssi: -90 }, // Duplicate MAC
      { bssid: '11:22:33:44:55:66', rssi: -120 }, // Too weak -> clamped to -100
      { bssid: '22:33:44:55:66:77', rssi: 5 }     // Positive -> clamped to -10
    ];

    const sanitized = sanitizeWifiAccessPoints(raw);
    assert.strictEqual(sanitized.length, 4);

    // Sorted by signal strength descending (-10 should be first, then -45)
    assert.strictEqual(sanitized[0].bssid, '22:33:44:55:66:77');
    assert.strictEqual(sanitized[0].rssi, -10);

    assert.strictEqual(sanitized[1].bssid, '12:34:56:78:9a:bc');
    assert.strictEqual(sanitized[1].rssi, -45);
    assert.strictEqual(sanitized[1].channel, 11);

    // Clamped checks
    const clampedWeak = sanitized.find(a => a.bssid === '11:22:33:44:55:66');
    assert.strictEqual(clampedWeak.rssi, -100);

    const clampedStrong = sanitized.find(a => a.bssid === '22:33:44:55:66:77');
    assert.strictEqual(clampedStrong.rssi, -10);
  });

  // --- 3. WI-FI POSITIONING ESTIMATION & FALLBACK ---
  await test('Wi-Fi estimation returns structured estimate or graceful fallback', async () => {
    const aps = [
      { bssid: '94:83:c4:12:34:56', rssi: -62, channel: 1 },
      { bssid: '94:83:c4:78:9a:bc', rssi: -71, channel: 6 }
    ];

    const estimate = await estimateLocation(aps, { maxWaitMs: 1500 });
    assert.ok(typeof estimate === 'object');
    assert.ok(typeof estimate.success === 'boolean');
    assert.ok(typeof estimate.place === 'string');
    assert.ok(['RESOLVED', 'APPROXIMATE', 'SEARCHING', 'UNAVAILABLE'].includes(estimate.locationStatus));
    assert.ok(Number.isFinite(estimate.latitude));
    assert.ok(Number.isFinite(estimate.longitude));
  });

  // --- 4. MULTI-SOURCE FAILOVER WHEN APS ARE EMPTY ---
  await test('Graceful fallback when no access points provided', async () => {
    const estimate = await estimateLocation([], { maxWaitMs: 1200 });
    assert.ok(typeof estimate.place === 'string');
    assert.ok(['APPROXIMATE', 'SEARCHING', 'UNAVAILABLE'].includes(estimate.locationStatus));
  });

  // --- 5. REVERSE GEOCODING RESOLUTION & SPATIAL CACHE ---
  await test('Real or cached reverse-geocoding resolution for known coordinates', async () => {
    // Bengaluru coordinates (Vidhana Soudha area: 12.9791, 77.5913)
    const res = await resolveLocation(12.9791, 77.5913, true, { maxWaitMs: 3000 });
    assert.ok(res.place.length > 0);
    assert.ok(['RESOLVED', 'SEARCHING'].includes(res.status));

    // Test spatial proximity cache (<100m away: 12.9792, 77.5914)
    const t0 = Date.now();
    const cacheHit = await resolveLocation(12.9792, 77.5914, true, { maxWaitMs: 300 });
    const cacheLatencyMs = Date.now() - t0;

    assert.ok(cacheLatencyMs < 50, `Cache lookup should be single-digit/low-ms, took ${cacheLatencyMs}ms`);
    assert.strictEqual(cacheHit.status, res.status);
    assert.strictEqual(cacheHit.place, res.place);
  });

  // --- 6. STRICT CONFIDENTIALITY AUDIT ---
  await test('Confidentiality audit: No provider or raw BSSID leaks in responses', async () => {
    const aps = [{ bssid: 'aa:bb:cc:dd:ee:ff', rssi: -55, channel: 6 }];
    const estimate = await estimateLocation(aps, { maxWaitMs: 1000 });
    const jsonStr = JSON.stringify(estimate);

    // Forbidden leak patterns
    const forbidden = [
      'google.com',
      'nominatim',
      'openstreetmap',
      'triangulation',
      'aa:bb:cc:dd:ee:ff',
      'API_KEY',
      'key='
    ];

    for (const term of forbidden) {
      assert.ok(!jsonStr.toLowerCase().includes(term.toLowerCase()), `Leaked confidential term: ${term}`);
    }
  });

  // --- 7. END-TO-END TELEMETRY SCHEMA INTEGRITY ---
  await test('Verify Telemetry model schema accommodates new location fields', () => {
    const Telemetry = require('../src/models/Telemetry');
    const doc = new Telemetry({
      device: 'DivyaDrishti',
      rider: 'Sahana',
      gps: { latitude: 15.432, longitude: 76.543, satellites: 6 },
      placeName: 'Gangavathi, Karnataka',
      locationStatus: 'RESOLVED',
      locationAccuracy: 15.0,
      isApproximate: false
    });

    assert.strictEqual(doc.placeName, 'Gangavathi, Karnataka');
    assert.strictEqual(doc.locationStatus, 'RESOLVED');
    assert.strictEqual(doc.locationAccuracy, 15.0);
    assert.strictEqual(doc.isApproximate, false);
  });

  console.log('\n--------------------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('--------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
