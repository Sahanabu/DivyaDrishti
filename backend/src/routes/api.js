const express = require('express');
const router = express.Router();
const { addTelemetry, getTelemetry, setPrediction, getAIPredictions, getTelemetryStatus } = require('../controllers/telemetryController');
const { authenticateRFID, verifySession, logout, claimSession } = require('../controllers/authController');
const { getRfidCards, addRfidCard, updateRfidCard, deleteRfidCard, simulateOrSubmitScan } = require('../controllers/rfidController');
const { createEmergency, getEmergencies, cancelEmergency, dispatchEmergency } = require('../controllers/emergencyController');
const { getLocationEstimate, submitDeviceLocation } = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// Auth routes
router.post('/auth/rfid', authenticateRFID);
router.get('/auth/claim-session', claimSession);
router.get('/auth/session', verifySession);
router.post('/auth/logout', logout);

// RFID Credential Management routes
router.get('/rfid', getRfidCards);
router.post('/rfid', addRfidCard);
router.put('/rfid/:uid', updateRfidCard);
router.delete('/rfid/:uid', deleteRfidCard);
router.post('/rfid/scan', simulateOrSubmitScan);

// Location routes
router.post('/location/estimate', getLocationEstimate);
router.post('/location/device', submitDeviceLocation);

// Emergency routes
router.post('/emergency', createEmergency);
router.post('/emergency/cancel', cancelEmergency);
router.post('/emergency/dispatch', dispatchEmergency);
router.get('/emergency', getEmergencies);

// AI Predictions
router.post('/ai/prediction', setPrediction);
router.get('/ai/prediction', getAIPredictions);

// Telemetry routes
router.post('/telemetry', addTelemetry);
router.get('/telemetry', getTelemetry);
router.get('/telemetry/status', getTelemetryStatus);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'DivyaDrishti Backend' });
});

module.exports = router;
