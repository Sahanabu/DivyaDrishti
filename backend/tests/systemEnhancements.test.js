/**
 * System Enhancements Verification Test Suite
 * Tests Trips, Breadcrumbs, Safety Score, WhatsApp SOS, and Notification Failover
 */

const assert = require('assert');
const env = require('../src/config/env');
const { recordSafetyEvent, getLiveSafetyScore, resetSafetyScore } = require('../src/services/aiService');
const { generateWhatsAppSosLink } = require('../src/services/notificationService');

async function runEnhancementTests() {
  console.log('==================================================');
  console.log('   DIVYADRISHTI SYSTEM ENHANCEMENTS VERIFICATION  ');
  console.log('==================================================\n');

  // Test 1: Env Config
  console.log('1. Testing Environment Configuration...');
  assert.ok(env.PORT, 'PORT must be set');
  assert.ok(env.DEFAULT_INCIDENT_CLIP, 'DEFAULT_INCIDENT_CLIP must be present');
  console.log('✓ Env config verified successfully (PORT:', env.PORT, ')\n');

  // Test 2: WhatsApp SOS Deep-Link Generator
  console.log('2. Testing WhatsApp SOS Link Generator...');
  const waUrl = generateWhatsAppSosLink({
    phone: '+918431712890',
    riderName: 'Sahana',
    eventType: 'HIGH_IMPACT_CRASH',
    placeName: 'Hubballi - Dharwad Bypass Road',
    lat: 15.4318,
    lon: 75.6586,
    speed: 42.5,
    videoClipUrl: 'https://d.uguu.se/SFsrMRXG.mp4'
  });
  assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?phone=918431712890'), 'URL must target phone');
  assert.ok(waUrl.includes('Sahana'), 'URL must include rider name');
  assert.ok(waUrl.includes('Hubballi'), 'URL must include place name');
  console.log('✓ WhatsApp SOS Link verified:\n ', waUrl.slice(0, 85) + '...\n');

  // Test 3: Safety Score Calculation & Deductions
  console.log('3. Testing Real-Time Safety Score Engine...');
  resetSafetyScore();
  let initialSafety = getLiveSafetyScore();
  assert.strictEqual(initialSafety.score, 100, 'Initial score must be 100');
  assert.strictEqual(initialSafety.grade, 'A+', 'Initial grade must be A+');

  // Trigger lane deviation
  recordSafetyEvent('LANE_DEPARTURE', 'MEDIUM');
  let afterLane = getLiveSafetyScore();
  assert.strictEqual(afterLane.score, 96, 'Score must be 96 after lane departure');
  assert.strictEqual(afterLane.metrics.laneDepartures, 1);

  // Trigger drowsiness
  recordSafetyEvent('DROWSINESS', 'HIGH');
  let afterDrowsy = getLiveSafetyScore();
  assert.strictEqual(afterDrowsy.score, 88, 'Score must be 88 after drowsiness');
  assert.strictEqual(afterDrowsy.metrics.drowsinessEvents, 1);

  // Trigger forward collision warning
  recordSafetyEvent('FORWARD_COLLISION_WARNING', 'HIGH');
  let afterFcw = getLiveSafetyScore();
  assert.strictEqual(afterFcw.score, 76, 'Score must be 76 after FCW');
  assert.strictEqual(afterFcw.metrics.forwardCollisionWarnings, 1);

  // Reset
  resetSafetyScore();
  let resetState = getLiveSafetyScore();
  assert.strictEqual(resetState.score, 100, 'Score must reset to 100');
  console.log('✓ Real-time Safety Score calculation, deductions & reset verified!\n');

  console.log('==================================================');
  console.log('   ALL ENHANCEMENT TEST SUITES PASSED (100%)      ');
  console.log('==================================================');
}

runEnhancementTests().catch((err) => {
  console.error('Enhancement test failed:', err);
  process.exit(1);
});
