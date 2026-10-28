const assert = require('assert');
const { resolveLocation } = require('../src/services/geocodingService');
const { estimateLocation, isWifiProviderConfigured } = require('../src/services/wifiLocationService');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log('========================================================');
  console.log('   FREE LOCATION & RFID VERIFICATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Provider Configuration Truth
  total++;
  try {
    const isPaidConfigured = isWifiProviderConfigured();
    assert.strictEqual(isPaidConfigured, false, 'Paid Wi-Fi provider should NOT be configured');
    console.log('• Paid positioning API confirmed unconfigured (using free resources)... PASSED ✓');
    passed++;
  } catch (err) {
    console.error('• Paid positioning API check FAILED:', err.message);
  }

  // Test 2: Reject Invalid Coordinates (0, 0), NaN, Out of Bounds
  total++;
  try {
    const rZero = await resolveLocation(0, 0, false);
    assert.strictEqual(rZero.status, 'SEARCHING');
    
    const rNan = await resolveLocation('abc', 'xyz', true);
    assert.strictEqual(rNan.status, 'SEARCHING');

    const rOut = await resolveLocation(120.0, 250.0, true);
    assert.ok(rOut.place !== undefined);
    console.log('• Gracefully reject (0, 0) and invalid coordinates without throwing... PASSED ✓');
    passed++;
  } catch (err) {
    console.error('• Invalid coordinates check FAILED:', err.message);
  }

  // Allow rate-limit window to clear
  await sleep(1600);

  // Test 3: Real Reverse Geocoding via OpenStreetMap Nominatim
  total++;
  try {
    // Valid coordinates: Vidhana Soudha, Bengaluru (12.9797, 77.5907)
    const geo = await resolveLocation(12.9797, 77.5907, true, { maxWaitMs: 8000 });
    assert.strictEqual(geo.status, 'RESOLVED');
    assert.ok(geo.place.length > 0);
    assert.ok(geo.place.includes('Bengaluru') || geo.place.includes('Bangalore') || geo.place.includes('Karnataka'));
    console.log(`• Real OpenStreetMap Nominatim reverse geocoding resolved: "${geo.place}"... PASSED ✓`);
    passed++;
  } catch (err) {
    console.error('• Real Nominatim reverse geocoding FAILED:', err.message);
  }

  // Test 4: Caching & Rate-Limiting Protection (Nominatim 1 req/sec policy)
  total++;
  try {
    const t0 = Date.now();
    // Immediate second call with identical coordinates
    const geoCached = await resolveLocation(12.9797, 77.5907, true);
    const elapsed = Date.now() - t0;
    assert.strictEqual(geoCached.status, 'RESOLVED');
    assert.ok(elapsed < 20, `Cache lookup should be near instantaneous (<20ms), took ${elapsed}ms`);
    console.log(`• Caching & Nominatim rate-limit protection verified (Lookup: ${elapsed}ms)... PASSED ✓`);
    passed++;
  } catch (err) {
    console.error('• Caching verification FAILED:', err.message);
  }

  // Allow rate-limit window to clear
  await sleep(1600);

  // Test 5: Free Cellular Hotspot IP Geolocation Fallback
  total++;
  try {
    const est = await estimateLocation([], { maxWaitMs: 4000 });
    assert.strictEqual(est.success, true);
    assert.ok(Number.isFinite(est.latitude) && est.latitude !== 0);
    assert.ok(Number.isFinite(est.longitude) && est.longitude !== 0);
    assert.strictEqual(est.accuracy, 5000);
    assert.strictEqual(est.isApproximate, true);
    assert.strictEqual(est.locationStatus, 'APPROXIMATE');
    assert.ok(est.place && est.place !== 'Location unavailable');
    console.log(`• Free cellular tower / hotspot IP geolocation active (${est.place})... PASSED ✓`);
    passed++;
  } catch (err) {
    console.error('• Free cellular fallback FAILED:', err.message);
  }

  // Test 6: Coarse vs Fine Address Precision
  total++;
  try {
    // Coarse lookup (zoom 10) must never show street numbers/small roads
    const coarseGeo = await resolveLocation(12.9797, 77.5907, true, { isCoarse: true });
    assert.ok(!coarseGeo.place.includes('#') && !coarseGeo.place.includes('No.'), 'Coarse address must not contain street numbers');
    console.log(`• Coarse resolution suppresses false street-level precision (${coarseGeo.place})... PASSED ✓`);
    passed++;
  } catch (err) {
    console.error('• Precision policy FAILED:', err.message);
  }

  console.log('\n--------------------------------------------------------');
  console.log(`Results: ${passed}/${total} Passed, ${total - passed} Failed`);
  console.log('--------------------------------------------------------\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
