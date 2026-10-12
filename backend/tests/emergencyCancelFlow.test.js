const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING DIVYADRISHTI IMPACT 10S CANCEL / SOS FLOW');
  console.log('====================================================\n');

  // Test 1: Trigger Impact Alert -> Enter 10s Window
  console.log('Test 1: POST /api/emergency (Trigger 10s countdown window)...');
  const res1 = await postJson('/api/emergency', {
    type: 'IMPACT',
    rider: 'Sahana',
    device: 'ESP32_HELMET_01',
    telemetry: {
      latitude: 15.4318,
      longitude: 75.6586,
      speed: 41.2,
      acceleration: 4.8,
      placeName: 'Hubballi - Dharwad Bypass Road'
    }
  });

  console.log('Status:', res1.status);
  console.log('Response:', res1.data);
  if (res1.status === 200 && res1.data.pending === true && res1.data.countdown === 10) {
    console.log('✅ TEST 1 PASSED: 10s countdown window started successfully.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Test 2: Cancel Alert (False Alarm / User Clicks Cancel)
  console.log('Test 2: POST /api/emergency/cancel (User clicks Cancel / False Alarm)...');
  const res2 = await postJson('/api/emergency/cancel', {});
  console.log('Status:', res2.status);
  console.log('Response:', res2.data);
  if (res2.status === 200 && res2.data.cancelled === true) {
    console.log('✅ TEST 2 PASSED: Emergency cancelled successfully. No message sent!\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: Trigger Impact & Immediate SOS Dispatch
  console.log('Test 3: POST /api/emergency followed by POST /api/emergency/dispatch...');
  const res3a = await postJson('/api/emergency', {
    type: 'IMPACT',
    rider: 'Sahana',
    device: 'ESP32_HELMET_01',
    telemetry: {
      latitude: 15.4318,
      longitude: 75.6586,
      speed: 35.0,
      acceleration: 3.9,
      placeName: 'Hubballi Bypass'
    }
  });
  console.log('Pending response:', res3a.data);

  const res3b = await postJson('/api/emergency/dispatch', {
    type: 'IMPACT',
    telemetry: {
      latitude: 15.4318,
      longitude: 75.6586,
      speed: 35.0,
      acceleration: 3.9,
      placeName: 'Hubballi Bypass'
    }
  });
  console.log('Dispatch status:', res3b.status);
  console.log('Dispatch response:', res3b.data);
  if (res3b.status === 200 && res3b.data.dispatched === true) {
    console.log('✅ TEST 3 PASSED: Emergency SOS dispatched successfully.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Query Emergency History
  console.log('Test 4: GET /api/emergency (Emergency log query)...');
  const res4 = await getJson('/api/emergency');
  console.log('Status:', res4.status, 'Total alerts in DB:', res4.data?.data?.length);
  if (res4.status === 200 && Array.isArray(res4.data?.data)) {
    console.log('✅ TEST 4 PASSED: Emergency history retrieved correctly.\n');
  } else {
    console.error('❌ TEST 4 FAILED');
    process.exit(1);
  }

  console.log('🎉 ALL 4 EMERGENCY FLOW TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
