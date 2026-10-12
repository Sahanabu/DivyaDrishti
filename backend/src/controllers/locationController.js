/**
 * DivyaDrishti Location Controller
 * 
 * Exposes confidential location estimation endpoints for the ESP32 and fleet dashboard.
 * All internal positioning mechanics remain strictly backend-encapsulated.
 */

const { estimateLocation, setVerifiedDeviceLocation } = require('../services/wifiLocationService');
const { resolveLocation } = require('../services/geocodingService');

/**
 * POST /api/location/estimate
 * Request Body:
 * {
 *   "device": "DivyaDrishti",
 *   "wifiAccessPoints": [
 *     { "bssid": "aa:bb:cc:dd:ee:ff", "rssi": -65, "channel": 6 }
 *   ]
 * }
 */
const getLocationEstimate = async (req, res) => {
  try {
    const rawAps = req.body.wifiAccessPoints || req.body.aps || [];
    
    // Process multi-source location estimation (capped at 2000ms SLA)
    const result = await estimateLocation(rawAps, { maxWaitMs: 2000 });

    res.status(200).json({
      success: result.success,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy,
      place: result.place,
      locationStatus: result.locationStatus,
      isApproximate: result.isApproximate || false,
      timestamp: result.timestamp || Date.now()
    });
  } catch (error) {
    // Keep internal error details confidential
    res.status(200).json({
      success: false,
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      place: 'Location unavailable',
      locationStatus: 'UNAVAILABLE',
      isApproximate: false,
      timestamp: Date.now()
    });
  }
};

/**
 * POST /api/location/device
 * Allows rider's connected smartphone or browser to share high-precision GPS
 * coordinates with the helmet system for zero-cost indoor assistance.
 */
const { getIo } = require('../sockets');

const submitDeviceLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const cleanLat = parseFloat(latitude);
    const cleanLon = parseFloat(longitude);
    const cleanAcc = parseFloat(accuracy) || 5.0;

    if (!Number.isFinite(cleanLat) || !Number.isFinite(cleanLon) || (cleanLat === 0 && cleanLon === 0)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    const geo = await resolveLocation(cleanLat, cleanLon, true, { isCoarse: false, maxWaitMs: 1500 });
    const resolvedPlace = geo.place || 'Location Resolved';

    setVerifiedDeviceLocation(cleanLat, cleanLon, cleanAcc, resolvedPlace);

    // Instant Socket.IO broadcast to all dashboard clients
    try {
      const io = getIo();
      if (io) {
        io.emit('telemetry_update', {
          latitude: cleanLat,
          longitude: cleanLon,
          placeName: resolvedPlace,
          locationStatus: 'RESOLVED',
          accuracy: cleanAcc
        });
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      latitude: cleanLat,
      longitude: cleanLon,
      accuracy: cleanAcc,
      place: resolvedPlace,
      locationStatus: 'RESOLVED',
      isApproximate: false,
      message: 'High-precision device GPS successfully bridged to helmet system'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getLocationEstimate,
  submitDeviceLocation
};
