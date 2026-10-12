const http = require('http');
const assert = require('assert');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runLiveTests() {
  console.log('Testing live server endpoints on port 5000...\n');

  // Test 1: POST /api/location/estimate
  console.log('1. Testing POST /api/location/estimate:');
  const locRes = await postJson('/api/location/estimate', {
    device: 'DivyaDrishti',
    wifiAccessPoints: [
      { bssid: '94:83:c4:12:34:56', rssi: -65, channel: 6 }
    ]
  });
  console.log('Status:', locRes.statusCode);
  console.log('Response:', locRes.body);
  assert.strictEqual(locRes.statusCode, 200);
  assert.ok(locRes.body.locationStatus);
  assert.ok(locRes.body.place);

  // Test 2: POST /api/telemetry (routine)
  console.log('\n2. Testing POST /api/telemetry:');
  const telRes = await postJson('/api/telemetry', {
    device: 'DivyaDrishti',
    rider: 'Sahana',
    sessionActive: true,
    latitude: 15.432,
    longitude: 76.543,
    place: 'Gangavathi',
    speed: 25.5,
    gpsFix: true,
    accMagnitude: 9.8,
    mq3: 240
  });
  console.log('Status:', telRes.statusCode);
  console.log('Response:', telRes.body);
  assert.strictEqual(telRes.statusCode, 201);
  assert.strictEqual(telRes.body.success, true);
  assert.ok(telRes.body.risk);
  assert.ok(telRes.body.event);
  assert.ok(telRes.body.place);
  assert.ok(telRes.body.locationStatus);

  // Test 3: POST /api/auth/rfid (Authorized card: C9 DA 12 07)
  console.log('\n3. Testing POST /api/auth/rfid:');
  const authRes = await postJson('/api/auth/rfid', {
    rfid: 'C9 DA 12 07',
    deviceId: 'ESP32_HELMET_01'
  });
  console.log('Status:', authRes.statusCode);
  console.log('Response:', authRes.body);
  assert.strictEqual(authRes.statusCode, 200);
  assert.strictEqual(authRes.body.success, true);

  // Test 4: POST /api/auth/rfid (Unauthorized card: BD 92 35 07)
  console.log('\n4. Testing POST /api/auth/rfid (unauthorized):');
  const unauthRes = await postJson('/api/auth/rfid', {
    rfid: 'BD 92 35 07',
    deviceId: 'ESP32_HELMET_01'
  });
  console.log('Status:', unauthRes.statusCode);
  console.log('Response:', unauthRes.body);
  assert.strictEqual(unauthRes.statusCode, 403);

  // Test 5: POST /api/location/device (Sync Phone GPS bridge)
  console.log('\n5. Testing POST /api/location/device (Phone GPS Bridge):');
  const devSyncRes = await postJson('/api/location/device', {
    latitude: 15.4318,
    longitude: 76.5312,
    accuracy: 4.5
  });
  console.log('Status:', devSyncRes.statusCode);
  console.log('Response:', devSyncRes.body);
  assert.strictEqual(devSyncRes.statusCode, 200);
  assert.strictEqual(devSyncRes.body.success, true);
  assert.strictEqual(devSyncRes.body.locationStatus, 'RESOLVED');
  assert.strictEqual(devSyncRes.body.isApproximate, false);

  // Test 6: Verify POST /api/location/estimate now immediately returns RESOLVED (not approximate)
  console.log('\n6. Testing POST /api/location/estimate after device GPS bridge:');
  const postSyncEst = await postJson('/api/location/estimate', {
    device: 'DivyaDrishti',
    wifiAccessPoints: [{ bssid: '94:83:c4:12:34:56', rssi: -65, channel: 6 }]
  });
  console.log('Status:', postSyncEst.statusCode);
  console.log('Response:', postSyncEst.body);
  assert.strictEqual(postSyncEst.statusCode, 200);
  assert.strictEqual(postSyncEst.body.locationStatus, 'RESOLVED');
  assert.strictEqual(postSyncEst.body.isApproximate, false);

  console.log('\nALL LIVE ENDPOINT TESTS PASSED SUCCESSFULLY! ✓');
}

runLiveTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
