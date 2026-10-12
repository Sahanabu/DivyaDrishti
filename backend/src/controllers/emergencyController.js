const Emergency = require('../models/Emergency');
const twilio = require('twilio');
const https = require('https');
const http = require('http');
const { resolveLocation } = require('../services/geocodingService');
const { getIo } = require('../sockets');
const { uploadVideoToCloud, getLatestIncidentClipOnDisk } = require('../services/cloudVideoService');

let pendingAlert = null;
let pendingTimer = null;
let impactWaitTimer = null;

// Queries the local Edge AI Vision pipeline (FastAPI on Port 8000) for a 10s clip snapshot
async function fetchClipFromAiPipeline(eventType = 'incident') {
  return new Promise((resolve) => {
    const cleanType = encodeURIComponent(String(eventType || 'incident').toLowerCase());
    const req = http.get(`http://localhost:8000/export_clip?event=${cleanType}`, { timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.videoClipUrl) {
            console.log(`🎬 [AI BLACK BOX CLIP RETRIEVED] Fetched 10s incident clip: ${parsed.videoClipUrl}`);
            return resolve(parsed.videoClipUrl);
          }
        } catch (_) {}
        const realDiskClip = getLatestIncidentClipOnDisk();
        resolve(realDiskClip || 'https://d.uguu.se/SFsrMRXG.mp4');
      });
    });
    req.on('error', () => {
      const realDiskClip = getLatestIncidentClipOnDisk();
      resolve(realDiskClip || 'https://d.uguu.se/SFsrMRXG.mp4');
    });
    req.on('timeout', () => {
      req.destroy();
      const realDiskClip = getLatestIncidentClipOnDisk();
      resolve(realDiskClip || 'https://d.uguu.se/SFsrMRXG.mp4');
    });
  });
}

// Dispatches the alert to NTFY.SH and Twilio SMS only after 10s timer expires or user confirms
async function sendEmergencyNotifications(alertData) {
  const { telemetry, aiState, raw } = alertData;
  const lat = Number.isFinite(parseFloat(telemetry.latitude)) ? parseFloat(telemetry.latitude) : 0;
  const lon = Number.isFinite(parseFloat(telemetry.longitude)) ? parseFloat(telemetry.longitude) : 0;
  const placeName = telemetry.placeName || 'Location unavailable';
  const speed = telemetry.speed || 0;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const ntfyTopic = process.env.NTFY_TOPIC || 'divyadrishti_emergency_alerts_demo';

  console.log(`[EMERGENCY DISPATCH] 10s countdown reached zero or confirmed. Dispatching emergency alerts!`);

  const isDrowsiness = raw?.type === 'UNCONSCIOUS_DROWSINESS' || 
                       aiState?.event === 'UNCONSCIOUS_DROWSINESS' || 
                       String(raw?.type).includes('DROWSINESS') ||
                       String(aiState?.event).includes('UNCONSCIOUS');

  const emergencyType = isDrowsiness ? 'UNCONSCIOUS_DROWSINESS' : (raw?.type || 'IMPACT');
  let videoClipUrl = alertData.videoClipUrl || raw?.videoClipUrl || raw?.clipUrl || telemetry?.videoClipUrl || '';
  if (!videoClipUrl) {
    videoClipUrl = await fetchClipFromAiPipeline(emergencyType);
  }

  // Upload to free cloud host so video opens natively on all mobile devices
  videoClipUrl = await uploadVideoToCloud(videoClipUrl);
  alertData.videoClipUrl = videoClipUrl;
  const videoLinkLine = videoClipUrl ? `\nIncident Video (10s): ${videoClipUrl}` : '';

  // 1. NTFY.SH Push Notification
  const postData = isDrowsiness
    ? `CRITICAL ALERT: Driver Sahana has eyes closed for >10s (Unresponsive / Severe Microsleep)!\nLocation: ${placeName}\nSpeed: ${speed} km/h${videoLinkLine}\nClick to view live location on map.`
    : `CRITICAL ALERT: Verified crash detected for Sahana!\nLocation: ${placeName}\nSpeed: ${speed} km/h${videoLinkLine}\nClick to view live location on map.`;

  const headers = {
    'Title': isDrowsiness ? 'DIVYADRISHTI UNRESPONSIVE DRIVER ALERT' : 'DIVYADRISHTI CRASH ALERT',
    'Priority': 'urgent',
    'Tags': isDrowsiness ? 'rotating_light,sos,sleeping' : 'rotating_light,car',
    'Click': videoClipUrl || googleMapsLink,
    'Content-Length': Buffer.byteLength(postData)
  };

  if (videoClipUrl) {
    headers['Attach'] = videoClipUrl;
  }

  const options = {
    hostname: 'ntfy.sh',
    port: 443,
    path: `/${ntfyTopic}`,
    method: 'POST',
    headers
  };

  const reqNtfy = https.request(options, (resNtfy) => {
    console.log(`[NTFY.SH NOTIFICATION SENT] Status: ${resNtfy.statusCode}`);
  });
  reqNtfy.on('error', (e) => console.error('[NTFY.SH ERROR]', e.message));
  reqNtfy.write(postData);
  reqNtfy.end();

  // 2. Twilio SMS Integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const emergencyContact = process.env.EMERGENCY_CONTACT_NUMBER;

  if (accountSid && authToken && twilioPhone && emergencyContact) {
    try {
      const client = twilio(accountSid, authToken);
      const messageBody = isDrowsiness
        ? `DIVYADRISHTI EMERGENCY ALERT\nDriver Sahana has eyes closed for >10s (Unresponsive / Severe Microsleep)!\nLocation: ${placeName}\nSpeed: ${speed} km/h${videoLinkLine}\nPlease check immediately.\nMaps: ${googleMapsLink}`
        : `DIVYADRISHTI EMERGENCY ALERT\nCrash confirmed for rider Sahana.\nLocation: ${placeName}\nSpeed: ${speed} km/h${videoLinkLine}\nPlease check immediately.\nMaps: ${googleMapsLink}`;
      await client.messages.create({ body: messageBody, from: twilioPhone, to: emergencyContact });
      console.log(`[EMERGENCY NOTIFICATION SENT] SMS delivered to ${emergencyContact}`);
    } catch (smsErr) {
      console.error('[TWILIO ERROR]', smsErr.message);
    }
  } else {
    console.log(`[TWILIO SKIPPED] Missing Twilio credentials. Used ntfy.sh instead.`);
  }

  // 3. Database Logging
  try {
    const emergencyDoc = new Emergency({
      device: raw?.device || 'DivyaDrishti',
      rider: raw?.rider || 'Sahana',
      type: emergencyType,
      location: { latitude: lat, longitude: lon, placeName },
      videoClipUrl,
      status: 'VERIFIED',
      aiPredictionData: {
        event: aiState?.event || emergencyType,
        risk: aiState?.risk || 'CRITICAL',
        speed: telemetry.speed,
        acceleration: telemetry.acceleration,
        mq3Value: telemetry.mq3Value
      }
    });
    await emergencyDoc.save();
  } catch (err) {
    console.error('[DB WARNING] Could not save emergency to MongoDB:', err.message);
  }

  // 4. Broadcast confirmed dispatch via Socket.IO
  try {
    const io = getIo();
    if (io) {
      io.emit('emergency_dispatched', {
        id: alertData.id,
        timestamp: Date.now(),
        place: placeName,
        googleMapsLink,
        videoClipUrl
      });
    }
  } catch (_) {}
}

// Reusable core function to initiate 10s pending emergency alert
async function initiatePendingEmergency(raw = {}) {
  const telemetry = raw.telemetry || {
    latitude: raw.latitude || 0,
    longitude: raw.longitude || 0,
    speed: raw.speed || 0,
    placeName: raw.place || raw.placeName || '',
    acceleration: raw.acceleration || 4.85,
    mq3Value: raw.mq3 || raw.mq3Value || 120
  };
  const aiState = raw.aiState || {
    event: raw.type || 'IMPACT',
    risk: 'CRITICAL'
  };

  const lat = Number.isFinite(parseFloat(telemetry.latitude)) ? parseFloat(telemetry.latitude) : 0;
  const lon = Number.isFinite(parseFloat(telemetry.longitude)) ? parseFloat(telemetry.longitude) : 0;

  // Resolve location
  if (!telemetry.placeName || telemetry.placeName === 'Unknown' || telemetry.placeName === 'GPS FIXED') {
    const geo = await resolveLocation(lat, lon, lat !== 0 && lon !== 0, { maxWaitMs: 500 });
    telemetry.placeName = geo.place || 'Impact Site';
  }

// Cancel any previous pending timers
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (impactWaitTimer) {
    clearTimeout(impactWaitTimer);
    impactWaitTimer = null;
  }

  const isDrowsiness = raw?.type === 'UNCONSCIOUS_DROWSINESS' || 
                       aiState?.event === 'UNCONSCIOUS_DROWSINESS' || 
                       String(raw?.type).includes('UNCONSCIOUS') ||
                       String(aiState?.event).includes('UNCONSCIOUS');

  // 1. REJECT routine drowsiness: small drowsiness (<10s) must NEVER trigger emergency SOS popup
  if ((raw.type === 'DROWSINESS' || raw.type === 'SEVERE_DROWSINESS' || aiState?.event === 'DROWSINESS' || aiState?.event === 'DROWSY') && !isDrowsiness) {
    console.log(`[EMERGENCY IGNORED] Small/routine drowsiness (<10s) does not trigger emergency SOS popup.`);
    return null;
  }

  const isImpact = !isDrowsiness;

  let videoClipUrl = raw.videoClipUrl || raw.clipUrl || telemetry.videoClipUrl || '';
  if (!videoClipUrl) {
    videoClipUrl = await fetchClipFromAiPipeline(raw.type || aiState.event || 'IMPACT');
  }
  // Upload to free cloud host so UI and mobile notifications have working public links
  videoClipUrl = await uploadVideoToCloud(videoClipUrl);

  const alertId = Date.now();
  const alertData = {
    id: alertId,
    raw,
    telemetry,
    aiState,
    videoClipUrl,
    timestamp: Date.now(),
    countdownSeconds: 10
  };

  pendingAlert = alertData;

  // Immediately broadcast telemetry update to synchronize live charts & cards
  try {
    const io = getIo();
    if (io) {
      io.emit('telemetry_update', {
        latitude: lat,
        longitude: lon,
        placeName: telemetry.placeName,
        locationStatus: 'RESOLVED',
        speed: telemetry.speed || 0,
        acceleration: isDrowsiness ? (parseFloat(telemetry.acceleration) || 1.0) : (parseFloat(telemetry.acceleration) || 4.85),
        mq3Value: telemetry.mq3Value || 120,
        emergency: true,
        motion: {
          magnitude: isDrowsiness ? (parseFloat(telemetry.acceleration) || 1.0) : (parseFloat(telemetry.acceleration) || 4.85),
          pitch: isDrowsiness ? 5 : 35,
          roll: isDrowsiness ? -5 : -42
        }
      });
    }
  } catch (_) {}

  // Function to show the 10s popup and start the dispatch countdown
  const displayPopupAndStartCountdown = () => {
    if (!pendingAlert || pendingAlert.id !== alertId) return;
    try {
      const io = getIo();
      if (io) {
        console.log(`🚨 [EMERGENCY POPUP DISPATCHED TO UI] Displaying 10s emergency popup modal for: ${alertData.raw?.type || 'IMPACT'}`);
        io.emit('emergency_pending', {
          id: alertId,
          timestamp: Date.now(),
          countdown: 10,
          telemetry,
          aiState,
          videoClipUrl
        });
      }
    } catch (_) {}

    // Start 10-second backend safety timer for notification dispatch
    pendingTimer = setTimeout(async () => {
      if (pendingAlert && pendingAlert.id === alertId) {
        await sendEmergencyNotifications(pendingAlert);
        pendingAlert = null;
        pendingTimer = null;
      }
    }, 10000);
  };

  // 2s wait time for impact before popup appears; immediate popup for >15s unconscious driver
  if (isImpact) {
    console.log(`⏱️ [IMPACT DETECTED] Enforcing 2-second confirmation window before displaying SOS popup...`);
    impactWaitTimer = setTimeout(() => {
      impactWaitTimer = null;
      displayPopupAndStartCountdown();
    }, 2000);
  } else {
    // Driver eyes closed >15s already verified
    displayPopupAndStartCountdown();
  }

  return alertData;
}

exports.triggerEmergencyAlert = initiatePendingEmergency;

exports.createEmergency = async (req, res) => {
  try {
    const raw = req.body || {};
    const alert = await initiatePendingEmergency(raw);

    return res.status(200).json({
      success: true,
      pending: Boolean(alert),
      countdown: 10,
      message: alert ? 'Emergency received. Confirmation window active.' : 'Drowsiness warning recorded (no SOS needed).'
    });
  } catch (error) {
    console.error('Create Emergency Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.cancelEmergency = async (req, res) => {
  try {
    if (impactWaitTimer) {
      clearTimeout(impactWaitTimer);
      impactWaitTimer = null;
    }
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    pendingAlert = null;

    console.log(`[EMERGENCY CANCELLED] User clicked Cancel. NO message was sent.`);

    // Broadcast cancellation to all clients and restore telemetry
    try {
      const io = getIo();
      if (io) {
        io.emit('emergency_cancelled', {
          timestamp: Date.now(),
          message: 'False alarm — alert cancelled by user. No message sent.'
        });

        io.emit('telemetry_update', {
          emergency: false,
          acceleration: 1.0,
          speed: 0
        });
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      cancelled: true,
      message: 'Emergency cancelled successfully. No message was sent.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.dispatchEmergency = async (req, res) => {
  try {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }

    const reqRaw = req.body?.raw || req.body || {};
    const videoClipUrl = pendingAlert?.videoClipUrl || req.body?.videoClipUrl || reqRaw?.videoClipUrl || req.body?.clipUrl || '';
    const dataToDispatch = pendingAlert || {
      id: Date.now(),
      raw: reqRaw,
      telemetry: req.body.telemetry || req.body || {},
      aiState: req.body.aiState || { event: reqRaw.type || 'IMPACT', risk: 'CRITICAL' },
      videoClipUrl
    };
    if (dataToDispatch && !dataToDispatch.videoClipUrl && videoClipUrl) {
      dataToDispatch.videoClipUrl = videoClipUrl;
    }
    pendingAlert = null;

    await sendEmergencyNotifications(dataToDispatch);

    return res.status(200).json({
      success: true,
      dispatched: true,
      message: 'Emergency message sent to contacts and services.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getEmergencies = async (req, res) => {
  try {
    const alerts = await Emergency.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
