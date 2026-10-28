const Telemetry = require('../models/Telemetry');
const AIPrediction = require('../models/AIPrediction');
const Session = require('../models/Session');
const { getIo, onClientConnected } = require('../sockets');
const { resolveLocation } = require('../services/geocodingService');
const { estimateLocation, getVerifiedDeviceLocation } = require('../services/wifiLocationService');
const { triggerEmergencyAlert } = require('./emergencyController');
const { recordSafetyEvent, getLiveSafetyScore } = require('../services/aiService');
const Trip = require('../models/Trip');

let latestPrediction = {
  risk: 'LOW',
  event: 'NORMAL'
};

let lastTelemetryTime = 0; // Starts offline until first packet received
let isEsp32Online = false;
let connectionTimeout = null;

// Register callback to inform newly connected clients of actual ESP32 hardware status
onClientConnected((socket) => {
  socket.emit('esp32_status', { online: isEsp32Online, lastSeen: lastTelemetryTime });
});

// Watchdog to monitor ESP32 hardware connection state & clear session if offline
const startWatchdog = () => {
  if (!connectionTimeout) {
    connectionTimeout = setInterval(async () => {
      const io = getIo();
      const now = Date.now();
      const timeSinceLast = now - lastTelemetryTime;

      // If no telemetry received for > 5.5 seconds, mark ESP32 as offline
      if (isEsp32Online && (lastTelemetryTime === 0 || timeSinceLast > 5500)) {
        isEsp32Online = false;
        console.log(`[ESP32 STATUS] Hardware offline (no telemetry for ${(timeSinceLast / 1000).toFixed(1)}s)`);
        if (io) {
          io.emit('esp32_status', { online: false, lastSeen: lastTelemetryTime });
        }
      }

      // If no telemetry for > 20 seconds, clear session and force logout
      if (lastTelemetryTime > 0 && timeSinceLast > 20000) {
        console.log("ESP32 Connection Timeout! Forcing logout.");
        lastTelemetryTime = 0;
        await Session.deleteMany({}); // Clear all sessions
        if (io) io.emit('force_logout');
      }
    }, 1500);
    if (connectionTimeout.unref) connectionTimeout.unref();
  }
};
startWatchdog();

const setPrediction = async (req, res) => {
  try {
    const { risk, event, confidence, timestamp, videoClipUrl } = req.body;
    
    // Check if the state actually changed or is critical
    const isMeaningful = (risk !== 'LOW' || event !== 'NORMAL');
    const isStateChange = (risk !== latestPrediction.risk || event !== latestPrediction.event);
    
    latestPrediction = { risk, event };

    // Record safety penalty if incident detected
    if (event && event !== 'NORMAL') {
      recordSafetyEvent(event, risk);
    }
    const currentSafety = getLiveSafetyScore();

    const io = getIo();
    if (io) {
      io.emit('ai_prediction', {
        risk,
        event,
        confidence,
        timestamp,
        videoClipUrl: videoClipUrl || '',
        safetyScore: currentSafety.score
      });
      io.emit('safety_score_update', currentSafety);
    }

    // Trigger high-priority 10-second crash confirmation popup if AI pipeline predicts IMPACT
    if (event === 'IMPACT' || event === 'HIGH_IMPACT_CRASH' || (risk === 'CRITICAL' && String(event).toUpperCase().includes('IMPACT'))) {
      console.log('🚨 [AI PREDICTION TRIGGER] Critical collision detected! Triggering 10s emergency popup.');
      const devLoc = getVerifiedDeviceLocation();
      triggerEmergencyAlert({
        type: 'IMPACT',
        device: 'AI_Vision_Edge',
        rider: 'Sahana',
        videoClipUrl: videoClipUrl || req.body?.videoClipUrl || '',
        telemetry: {
          latitude: devLoc?.latitude || 15.4318,
          longitude: devLoc?.longitude || 75.6586,
          placeName: devLoc?.place || 'Hubballi - Dharwad Bypass Road',
          speed: 38.0,
          acceleration: 4.85,
          mq3Value: 120,
          videoClipUrl: videoClipUrl || req.body?.videoClipUrl || ''
        },
        aiState: { event, risk, confidence }
      }).catch(() => {});
    } else if (
      event === 'UNCONSCIOUS_DROWSINESS' ||
      event === 'UNCONSCIOUS_CRITICAL' ||
      String(event).toUpperCase().includes('UNCONSCIOUS')
    ) {
      console.log(`🚨 [AI PREDICTION TRIGGER] Unresponsive driver detected (>10s closed eyes)! Triggering 10s emergency.`);
      const devLoc = getVerifiedDeviceLocation();
      triggerEmergencyAlert({
        type: 'UNCONSCIOUS_DROWSINESS',
        device: 'AI_Vision_Edge',
        rider: 'Sahana',
        videoClipUrl: videoClipUrl || req.body?.videoClipUrl || '',
        telemetry: {
          latitude: devLoc?.latitude || 15.4318,
          longitude: devLoc?.longitude || 75.6586,
          placeName: devLoc?.place || 'Hubballi - Dharwad Bypass Road',
          speed: 35.0,
          acceleration: 1.0,
          mq3Value: 120,
          videoClipUrl: videoClipUrl || req.body?.videoClipUrl || ''
        },
        aiState: { event: 'UNCONSCIOUS_DROWSINESS', risk: 'CRITICAL', confidence }
      }).catch(() => {});
    } else if (
      event === 'DROWSINESS' ||
      event === 'SEVERE_DROWSINESS' ||
      event === 'DROWSY' ||
      String(event).toUpperCase().includes('DROWS')
    ) {
      // Small or routine drowsiness (<10s): update live telemetry & HUD, but do NOT trigger emergency SOS popup
    }

    if (isMeaningful || isStateChange) {
      const prediction = new AIPrediction(req.body);
      await prediction.save();
    }
  } catch (error) {
    // Only log if it's not a missing model error which we expect initially
    if (error.name !== 'ValidationError') {
      console.error("Failed to save AI prediction", error.message);
    }
  }

  res.status(200).json({ success: true });
};

const addTelemetry = async (req, res) => {
  try {
    const raw = req.body;
    const now = Date.now();
    lastTelemetryTime = now; // Update heartbeat
    
    const io = getIo();

    if (!isEsp32Online) {
      isEsp32Online = true;
      console.log("[ESP32 STATUS] Hardware online: Receiving telemetry.");
      if (io) {
        io.emit('esp32_status', { online: true, lastSeen: lastTelemetryTime });
      }
    }

    // If ESP32 reports it lost its session (e.g. restarted), force logout the dashboard
    if (raw.sessionActive === false) {
      const activeSession = await Session.findOne();
      if (activeSession) {
        console.log("ESP32 reported inactive session. Forcing dashboard logout.");
        await Session.deleteMany({});
        if (io) io.emit('force_logout');
      }
    }
    
    // Sanitize coordinates and resolve location safely (capped at 800ms wait to protect ESP32 response SLA)
    let cleanLat = Number.isFinite(parseFloat(raw.latitude)) ? parseFloat(raw.latitude) : 0;
    let cleanLon = Number.isFinite(parseFloat(raw.longitude)) ? parseFloat(raw.longitude) : 0;

    // Check if phone GPS assist is active
    const devLoc = getVerifiedDeviceLocation();
    if (cleanLat === 0 && cleanLon === 0 && devLoc) {
      cleanLat = devLoc.latitude;
      cleanLon = devLoc.longitude;
    }

    const isVerifiedAssist = Boolean(
      (raw.locationStatus === 'RESOLVED') ||
      (devLoc && Math.abs(cleanLat - devLoc.latitude) < 0.005 && Math.abs(cleanLon - devLoc.longitude) < 0.005)
    );
    const hasFix = raw.gpsFix !== undefined ? Boolean(raw.gpsFix) : (cleanLat !== 0 && cleanLon !== 0);
    let isApprox = !hasFix && !isVerifiedAssist && (cleanLat !== 0 && cleanLon !== 0);

    // If GPS is offline & no coordinates provided but Wi-Fi AP measurements are attached, attempt fast Wi-Fi estimate
    if (!hasFix && !isVerifiedAssist && cleanLat === 0 && cleanLon === 0 && Array.isArray(raw.wifiAccessPoints) && raw.wifiAccessPoints.length > 0) {
      const wifiEst = await estimateLocation(raw.wifiAccessPoints, { maxWaitMs: 800 });
      if (wifiEst && wifiEst.success) {
        cleanLat = wifiEst.latitude;
        cleanLon = wifiEst.longitude;
        isApprox = Boolean(wifiEst.isApproximate);
      }
    }

    const geoResult = await resolveLocation(cleanLat, cleanLon, hasFix || isVerifiedAssist || (cleanLat !== 0 && cleanLon !== 0), {
      maxWaitMs: 800,
      onBackgroundResolve: (resolved) => {
        if (io) {
          io.emit('telemetry_update', {
            latitude: cleanLat,
            longitude: cleanLon,
            placeName: resolved,
            locationStatus: isApprox ? 'APPROXIMATE' : 'RESOLVED',
            speed: raw.speed || 0,
            acceleration: raw.accMagnitude || 0,
            mq3Value: raw.mq3 || 0
          });
        }
      }
    });
    const resolvedPlace = geoResult.place;
    const finalLocationStatus = isApprox ? 'APPROXIMATE' : (isVerifiedAssist || hasFix ? 'RESOLVED' : geoResult.status);

    // Map flat ESP32 payload to nested Telemetry schema
    const telemetryData = {
      device: raw.device || 'DivyaDrishti',
      rider: raw.rider || 'Unknown',
      sessionActive: raw.sessionActive,
      gps: {
        latitude: cleanLat,
        longitude: cleanLon,
        satellites: raw.satellites || 0
      },
      motion: {
        accelX: raw.accelX,
        accelY: raw.accelY,
        accelZ: raw.accelZ,
        gyroX: raw.gyroX,
        gyroY: raw.gyroY,
        gyroZ: raw.gyroZ,
        pitch: raw.pitch,
        roll: raw.roll,
        magnitude: raw.accMagnitude
      },
      mq3: raw.mq3,
      placeName: resolvedPlace,
      locationStatus: finalLocationStatus,
      locationAccuracy: raw.accuracy || (isApprox ? 40 : 5),
      isApproximate: isApprox
    };
    
    // Save to DB
    const telemetry = new Telemetry(telemetryData);
    await telemetry.save();

    // Broadcast via Socket.IO
    const currentSafety = getLiveSafetyScore();
    const broadcastData = {
       ...telemetry.toObject(),
       latitude: cleanLat,
       longitude: cleanLon,
       placeName: resolvedPlace,
       locationStatus: finalLocationStatus,
       speed: raw.speed || 0,
       acceleration: raw.accMagnitude,
       mq3Value: raw.mq3,
       safetyScore: currentSafety.score
    };

    if (io) {
      io.emit('telemetry_update', broadcastData);
    }

    // Auto-record active trip breadcrumbs
    if (cleanLat !== 0 && cleanLon !== 0) {
      Trip.findOne({ status: 'ACTIVE' }).sort({ createdAt: -1 }).then((trip) => {
        if (trip) {
          trip.breadcrumbs.push({
            latitude: cleanLat,
            longitude: cleanLon,
            speed: Number(raw.speed) || 0,
            acceleration: Number(raw.accMagnitude) || 1.0,
            timestamp: new Date()
          });
          trip.endLocation = { latitude: cleanLat, longitude: cleanLon, placeName: resolvedPlace };
          trip.safetyScore = currentSafety.score;
          trip.save().catch(() => {});
        }
      }).catch(() => {});
    }

    // Check alcohol & harsh braking
    if (raw.mq3 && raw.mq3 > 400) {
      recordSafetyEvent('ALCOHOL_WARNING');
    } else if (raw.accMagnitude && raw.accMagnitude >= 2.8 && raw.accMagnitude < 25.0) {
      recordSafetyEvent('HARD_BRAKE');
    }

    // Trigger high-priority 10-second crash confirmation popup if ESP32 detects collision/impact
    if (raw.emergency === true || (raw.accMagnitude && raw.accMagnitude >= 25.0)) {
      console.log('🚨 [ESP32 HARDWARE TRIGGER] High G-Force collision detected in telemetry! Triggering 10s emergency popup.');
      triggerEmergencyAlert({
        type: 'IMPACT',
        device: raw.device || 'ESP32_HELMET_01',
        rider: raw.rider || 'Sahana',
        telemetry: {
          latitude: cleanLat,
          longitude: cleanLon,
          placeName: resolvedPlace,
          speed: raw.speed || 0,
          acceleration: raw.accMagnitude || 25.0,
          mq3Value: raw.mq3 || 120
        },
        aiState: { event: 'HARDWARE_IMPACT', risk: 'CRITICAL' }
      }).catch(() => {});
    }

    // Return the latest AI prediction and confidential resolved location to the ESP32
    res.status(201).json({
      success: true,
      risk: latestPrediction.risk,
      event: latestPrediction.event,
      place: resolvedPlace,
      locationStatus: finalLocationStatus
    });
  } catch (error) {
    console.error('Error adding telemetry:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getTelemetry = async (req, res) => {
  try {
    // Get last 50 entries
    const data = await Telemetry.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getAIPredictions = async (req, res) => {
  try {
    const data = await AIPrediction.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching AI predictions:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getTelemetryStatus = async (req, res) => {
  res.status(200).json({
    success: true,
    online: isEsp32Online,
    lastSeen: lastTelemetryTime
  });
};

const getEsp32Status = () => ({
  online: isEsp32Online,
  lastSeen: lastTelemetryTime
});

module.exports = {
  addTelemetry,
  getTelemetry,
  setPrediction,
  getAIPredictions,
  getTelemetryStatus,
  getEsp32Status
};
