/**
 * DivyaDrishti Confidential Multi-Source Location & Wi-Fi Positioning Service
 * 
 * PROPRIETARY IMPLEMENTATION NOTICE:
 * This module coordinates multi-source location estimation (Wi-Fi access point
 * fingerprinting, external positioning providers, and reverse-geocoding resolution).
 * All provider URLs, API credentials, BSSID measurements, and fallback heuristics
 * are strictly confidential internal implementation details. User-facing outputs
 * expose only clean geographic coordinates, place names, and operational status.
 */

const https = require('https');
const http = require('http');
const dns = require('dns');
const { resolveLocation } = require('./geocodingService');

// Internal resilient DNS resolver (bypasses local hotspot DNS restrictions)
const resilientResolver = new dns.promises.Resolver();
resilientResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

function internalDnsLookup(hostname, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  dns.lookup(hostname, opts, (err, address, family) => {
    if (!err && address) return cb(null, address, family);
    resilientResolver.resolve4(hostname)
      .then((ips) => {
        if (!ips || ips.length === 0) return cb(new Error('DNS resolution failed'));
        if (opts && opts.all) {
          cb(null, ips.map((ip) => ({ address: ip, family: 4 })));
        } else {
          cb(null, ips[0], 4);
        }
      })
      .catch((fallbackErr) => cb(err || fallbackErr));
  });
}

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_GEOLOCATION_API_KEY || '';
const IP_GEO_ENDPOINT = process.env.INTERNAL_IP_GEO_ENDPOINT || 'http://ip-api.com/json/';
const ESTIMATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_REQUEST_INTERVAL_MS = 1500;        // 1.5s rate-limit protection
const MAX_CACHE_ENTRIES = 300;

// In-memory cache & request deduplication
const wifiEstimateCache = new Map();
const inFlightRequests = new Map();
let lastProviderCallTime = 0;
let lastKnownEstimate = null;

// High-precision device / smartphone GPS bridge (Zero-cost indoor assistance)
let verifiedDeviceLocation = null;

function setVerifiedDeviceLocation(lat, lon, accuracy = 5.0, placeName = '') {
  const cleanLat = parseFloat(lat);
  const cleanLon = parseFloat(lon);
  if (!Number.isFinite(cleanLat) || !Number.isFinite(cleanLon) || (cleanLat === 0 && cleanLon === 0)) {
    return false;
  }
  verifiedDeviceLocation = {
    latitude: cleanLat,
    longitude: cleanLon,
    accuracy: Number.isFinite(parseFloat(accuracy)) ? parseFloat(accuracy) : 5.0,
    place: placeName || '',
    source: 'DEVICE_GPS_ASSIST',
    timestamp: Date.now()
  };

  // Invalidate any stale coarse IP/Wi-Fi caches immediately
  wifiEstimateCache.clear();
  inFlightRequests.clear();

  lastKnownEstimate = {
    success: true,
    latitude: cleanLat,
    longitude: cleanLon,
    accuracy: verifiedDeviceLocation.accuracy,
    place: placeName || 'Location Resolved',
    locationStatus: 'RESOLVED',
    source: 'DEVICE_GPS_ASSIST',
    isApproximate: false,
    isCoarse: false,
    timestamp: Date.now()
  };

  return true;
}

function getVerifiedDeviceLocation() {
  if (verifiedDeviceLocation && (Date.now() - verifiedDeviceLocation.timestamp < 2 * 60 * 60 * 1000)) {
    return verifiedDeviceLocation;
  }
  return null;
}

// MAC / BSSID validation regex (standard 6 octets, separated by : or -)
const BSSID_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/**
 * Validates and normalizes an array of Wi-Fi access point measurements.
 */
function sanitizeWifiAccessPoints(rawAps) {
  if (!Array.isArray(rawAps) || rawAps.length === 0) return [];

  const sanitized = [];
  const seenBssids = new Set();

  for (const item of rawAps) {
    if (!item || typeof item !== 'object') continue;

    const rawBssid = String(item.bssid || item.macAddress || '').trim();
    if (!BSSID_REGEX.test(rawBssid)) continue;

    const normalizedBssid = rawBssid.replace(/-/g, ':').toLowerCase();

    // Reject invalid or reserved broadcast/multicast/null MACs
    if (normalizedBssid === '00:00:00:00:00:00' ||
        normalizedBssid === 'ff:ff:ff:ff:ff:ff' ||
        normalizedBssid.startsWith('01:00:5e')) {
      continue;
    }

    if (seenBssids.has(normalizedBssid)) continue;
    seenBssids.add(normalizedBssid);

    // Validate RSSI: expected between -100 and -10 dBm
    const rawRssi = parseInt(item.rssi || item.signalStrength, 10);
    const rssi = Number.isFinite(rawRssi) ? Math.max(-100, Math.min(-10, rawRssi)) : -70;

    // Optional channel validation
    let channel = parseInt(item.channel, 10);
    if (!Number.isFinite(channel) || channel < 1 || channel > 196) {
      channel = undefined;
    }

    sanitized.push({
      bssid: normalizedBssid,
      rssi,
      channel
    });
  }

  // Sort by signal strength descending (strongest APs first)
  sanitized.sort((a, b) => b.rssi - a.rssi);

  // Return top 10 usable access points
  return sanitized.slice(0, 10);
}

/**
 * Computes a fingerprint key from the strongest access points.
 */
function getFingerprintKey(aps) {
  if (!aps || aps.length === 0) return 'no-ap';
  // Use top 3 BSSIDs for the fingerprint key
  return aps.slice(0, 3).map(a => a.bssid).join('|');
}

/**
 * Confidential internal query to Google Geolocation API.
 */
function queryGoogleGeolocation(aps) {
  return new Promise((resolve) => {
    if (!GOOGLE_API_KEY) return resolve(null);

    try {
      const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(GOOGLE_API_KEY)}`;
      const payload = JSON.stringify({
        considerIp: true,
        wifiAccessPoints: aps.map(a => ({
          macAddress: a.bssid,
          signalStrength: a.rssi,
          channel: a.channel
        }))
      });

      const parsedUrl = new URL(url);
      const req = https.request({
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        lookup: internalDnsLookup,
        timeout: 3500 // 3.5s timeout
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          try {
            const data = JSON.parse(body);
            if (data.location && Number.isFinite(data.location.lat) && Number.isFinite(data.location.lng)) {
              return resolve({
                latitude: data.location.lat,
                longitude: data.location.lng,
                accuracy: data.accuracy || 40.0,
                source: 'WIFI_GEOLOCATION'
              });
            }
          } catch (_) {}
          resolve(null);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
      req.write(payload);
      req.end();
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Confidential internal fallback to free cellular mobile tower / IP-based geolocation.
 * Supports primary (ip-api.com) and secondary (ipwhois.app) free endpoints without API keys.
 */
function querySingleIpEndpoint(endpointUrl) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(endpointUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(endpointUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'DivyaDrishti-IoT/2.0' },
        lookup: internalDnsLookup,
        timeout: 3000
      }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const lat = parseFloat(data.lat || data.latitude);
            const lon = parseFloat(data.lon || data.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
              return resolve({
                latitude: lat,
                longitude: lon,
                accuracy: 5000.0, // Coarse cellular network tower accuracy
                source: 'CELLULAR_HOTSPOT_IP',
                city: data.city || '',
                region: data.regionName || data.region || '',
                country: data.country || ''
              });
            }
          } catch (_) {}
          resolve(null);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    } catch (_) {
      resolve(null);
    }
  });
}

async function queryCoarseIpLocation() {
  // 1. Try primary free cellular gateway resolver (ip-api.com)
  const primary = await querySingleIpEndpoint(IP_GEO_ENDPOINT);
  if (primary) return primary;

  // 2. Try secondary free cellular gateway resolver (ipwhois.app)
  const secondary = await querySingleIpEndpoint('https://ipwhois.app/json/');
  if (secondary) return secondary;

  return null;
}

/**
 * Primary public function: estimates location based on Wi-Fi access points
 * or internal failover, and automatically resolves human-readable place name.
 * 
 * @param {Array} rawAps - Array of { bssid, rssi, channel }
 * @param {object} options - Optional configuration { maxWaitMs }
 * @returns {Promise<object>}
 */
async function estimateLocation(rawAps = [], options = {}) {
  const { maxWaitMs = 2500 } = options;
  const now = Date.now();

  // 0. Absolute First Priority: Fresh verified device / smartphone GPS bridge
  const deviceLoc = getVerifiedDeviceLocation();
  if (deviceLoc) {
    let place = deviceLoc.place;
    if (!place || place === 'Location Resolved') {
      try {
        const geo = await resolveLocation(deviceLoc.latitude, deviceLoc.longitude, true, { maxWaitMs: 800, isCoarse: false });
        if (geo && geo.place) {
          place = geo.place;
          deviceLoc.place = place;
        }
      } catch (_) {}
    }
    return {
      success: true,
      latitude: deviceLoc.latitude,
      longitude: deviceLoc.longitude,
      accuracy: deviceLoc.accuracy,
      place: place || 'Location Resolved',
      locationStatus: 'RESOLVED',
      source: 'DEVICE_GPS_ASSIST',
      isApproximate: false,
      isCoarse: false,
      timestamp: Date.now()
    };
  }

  const aps = sanitizeWifiAccessPoints(rawAps);
  const fingerprintKey = getFingerprintKey(aps);

  // 1. Check in-memory fingerprint cache
  const cached = wifiEstimateCache.get(fingerprintKey);
  if (cached && (now - cached.timestamp < ESTIMATE_CACHE_TTL_MS)) {
    return {
      success: true,
      latitude: cached.latitude,
      longitude: cached.longitude,
      accuracy: cached.accuracy,
      place: cached.place,
      locationStatus: cached.locationStatus,
      isApproximate: Boolean(cached.isApproximate),
      timestamp: cached.timestamp
    };
  }

  // 2. In-flight request deduplication
  let requestPromise = inFlightRequests.get(fingerprintKey);
  if (!requestPromise) {
    requestPromise = (async () => {
      try {
        let estimate = null;

        // 1. First priority: Check if fresh high-precision phone/device GPS was pushed
        const deviceLoc = getVerifiedDeviceLocation();
        if (deviceLoc) {
          estimate = deviceLoc;
        }

        // 2. Try Wi-Fi Geolocation ONLY if provider is configured, APs are present, and rate-limit permits
        if (!estimate && aps.length > 0 && isWifiProviderConfigured() && (now - lastProviderCallTime >= MIN_REQUEST_INTERVAL_MS)) {
          lastProviderCallTime = now;
          estimate = await queryGoogleGeolocation(aps);
        }

        // 3. Fallback: Free cellular mobile tower gateway IP lookup (ip-api.com / ipwhois.app)
        if (!estimate) {
          estimate = await queryCoarseIpLocation();
        }

        // If an estimate was produced, resolve human-readable place name
        if (estimate) {
          const isCoarse = (estimate.accuracy > 500) || (estimate.source === 'CELLULAR_HOTSPOT_IP') || (estimate.source === 'COARSE_IP');
          const geo = await resolveLocation(estimate.latitude, estimate.longitude, true, {
            maxWaitMs: 1000,
            isCoarse: isCoarse
          });

          const isHighPrecision = Boolean(estimate.source === 'DEVICE_GPS_ASSIST' && !isCoarse);

          const result = {
            success: true,
            latitude: estimate.latitude,
            longitude: estimate.longitude,
            accuracy: estimate.accuracy,
            place: geo.place || (isHighPrecision ? 'Location Resolved' : 'Location Approximate'),
            locationStatus: isHighPrecision ? 'RESOLVED' : 'APPROXIMATE',
            source: estimate.source, // internal audit trail (never exposed in public UI)
            isApproximate: !isHighPrecision,
            isCoarse: isCoarse,
            timestamp: Date.now()
          };

          // Cache valid result
          if (wifiEstimateCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = wifiEstimateCache.keys().next().value;
            wifiEstimateCache.delete(oldestKey);
          }
          wifiEstimateCache.set(fingerprintKey, result);
          lastKnownEstimate = result;

          return result;
        }

        // 3. Fallback: Last known estimate
        if (lastKnownEstimate) {
          return {
            ...lastKnownEstimate,
            locationStatus: 'APPROXIMATE',
            isApproximate: true
          };
        }

        // 4. Fallback: Unavailable
        return {
          success: false,
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          place: 'Location unavailable',
          locationStatus: 'UNAVAILABLE',
          source: 'NONE',
          isApproximate: false,
          isCoarse: true,
          timestamp: Date.now()
        };
      } finally {
        inFlightRequests.delete(fingerprintKey);
      }
    })();

    inFlightRequests.set(fingerprintKey, requestPromise);
  }

  // Race with maxWaitMs if specified
  if (maxWaitMs > 0) {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (lastKnownEstimate) {
          resolve({
            ...lastKnownEstimate,
            locationStatus: 'APPROXIMATE',
            isApproximate: true
          });
        } else {
          resolve({
            success: false,
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            place: 'Searching for location...',
            locationStatus: 'SEARCHING',
            source: 'NONE',
            isApproximate: false,
            isCoarse: true,
            timestamp: Date.now()
          });
        }
      }, maxWaitMs);
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  return requestPromise;
}

/**
 * Returns true if the Wi-Fi AP positioning provider (Google) has an API key configured.
 */
function isWifiProviderConfigured() {
  return Boolean(GOOGLE_API_KEY && GOOGLE_API_KEY.trim().length > 0);
}

/**
 * Returns last known estimate, or null if none recorded.
 */
function getLastKnownEstimate() {
  return lastKnownEstimate;
}

module.exports = {
  estimateLocation,
  sanitizeWifiAccessPoints,
  isWifiProviderConfigured,
  getLastKnownEstimate,
  setVerifiedDeviceLocation,
  getVerifiedDeviceLocation
};
