/**
 * DivyaDrishti Confidential Internal Geocoding Service
 * 
 * PROPRIETARY IMPLEMENTATION NOTICE:
 * This module encapsulates backend location resolution. All provider details,
 * endpoint URLs, caching mechanisms, DNS resolvers, and raw response structures
 * are strictly internal to the backend architecture and must never be exposed
 * to end users, client applications, user-facing error logs, or external interfaces.
 */

const https = require('https');
const http = require('http');
const dns = require('dns');

// Internal resilient DNS resolver fallback (handles mobile hotspot DNS restrictions)
const resilientResolver = new dns.promises.Resolver();
resilientResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

function internalDnsLookup(hostname, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  // 1. First attempt standard OS DNS lookup
  dns.lookup(hostname, opts, (err, address, family) => {
    if (!err && address) {
      return cb(null, address, family);
    }

    // 2. Fall back to resilient internal resolver if OS/hotspot DNS refused
    resilientResolver.resolve4(hostname)
      .then((ips) => {
        if (!ips || ips.length === 0) {
          return cb(new Error('DNS resolution failed'));
        }
        if (opts && opts.all) {
          cb(null, ips.map((ip) => ({ address: ip, family: 4 })));
        } else {
          cb(null, ips[0], 4);
        }
      })
      .catch((fallbackErr) => {
        cb(err || fallbackErr);
      });
  });
}

// Configuration constants (overridable via environment variables)
const GEO_ENDPOINT = process.env.INTERNAL_GEO_ENDPOINT || 'https://nominatim.openstreetmap.org/reverse';
const GEO_USER_AGENT = process.env.INTERNAL_GEO_USER_AGENT || 'DivyaDrishti-SmartHelmet/2.0 (contact: info@divyadrishti.iot; safety-iot-fleet)';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_REQUEST_INTERVAL_MS = 1500; // 1.5 seconds rate-limit protection
const MAX_CACHE_ENTRIES = 500;

// Internal in-memory spatial cache & in-flight request tracker
const locationCache = new Map();
const inFlightRequests = new Map();
let lastProviderCallTime = 0;
let lastKnownLocation = null;

/**
 * Returns the most recently resolved valid location string, or null if none.
 */
function getLastKnownLocation() {
  return lastKnownLocation;
}

/**
 * Calculates approximate great-circle distance between two coordinates in meters.
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a normalized spatial grid key (~100m grid resolution).
 */
function getGridKey(lat, lon) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/**
 * Cleanly formats address components into a human-readable location string.
 * Strictly produces user-friendly geographic names without any technical metadata.
 */
function formatHumanReadableAddress(address, isCoarse = false) {
  if (!address || typeof address !== 'object') return null;

  const cityOrTown = (
    address.city ||
    address.town ||
    address.municipality ||
    address.county ||
    address.state_district ||
    ''
  ).trim();

  const state = (address.state || '').trim();

  // If estimate is coarse (e.g. IP-derived or high uncertainty radius),
  // NEVER synthesize or display specific street, road, or quarter names.
  // Display only the honest broader geographic locality/city/state.
  if (isCoarse) {
    if (cityOrTown && state) {
      return `${cityOrTown}, ${state}`;
    }
    return cityOrTown || state || null;
  }

  const localPoint = (
    address.road ||
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.residential ||
    address.village ||
    ''
  ).trim();

  let formatted = '';

  if (localPoint && cityOrTown) {
    if (localPoint.toLowerCase() === cityOrTown.toLowerCase() ||
        localPoint.toLowerCase().includes(cityOrTown.toLowerCase())) {
      formatted = state ? `${cityOrTown}, ${state}` : cityOrTown;
    } else {
      formatted = `${localPoint}, ${cityOrTown}`;
    }
  } else if (localPoint) {
    formatted = state ? `${localPoint}, ${state}` : localPoint;
  } else if (cityOrTown) {
    formatted = state ? `${cityOrTown}, ${state}` : cityOrTown;
  } else if (state) {
    formatted = state;
  }

  formatted = formatted.replace(/\s*,\s*,+/g, ', ').trim();

  return formatted.length > 0 ? formatted : null;
}

/**
 * Internal worker to execute the network request to the backend geocoding provider.
 * All errors and timeouts are safely caught and encapsulated.
 */
function queryInternalProvider(lat, lon, isCoarse = false) {
  return new Promise((resolve) => {
    try {
      const url = new URL(GEO_ENDPOINT);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lon.toString());
      url.searchParams.set('zoom', isCoarse ? '10' : '18');
      url.searchParams.set('addressdetails', '1');

      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(url.toString(), {
        headers: {
          'User-Agent': GEO_USER_AGENT,
          'Accept': 'application/json'
        },
        lookup: internalDnsLookup,
        timeout: 4000 // 4s timeout protection
      }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const resolved = formatHumanReadableAddress(data.address, isCoarse);
            resolve(resolved);
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => {
        resolve(null);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Public service interface to resolve geographic coordinates to a user-facing place.
 * 
 * Supports non-blocking fast timeouts, in-flight request deduplication,
 * spatial proximity caching, and rate limiting.
 * 
 * @param {number} latitude - GPS Latitude
 * @param {number} longitude - GPS Longitude
 * @param {boolean} gpsFix - Whether GPS hardware currently has an active satellite fix
 * @param {object} options - Optional configuration { maxWaitMs, onBackgroundResolve }
 * @returns {Promise<{place: string, status: string}>}
 *   - place: Human-readable location string or standardized fallback message
 *   - status: 'RESOLVED' | 'SEARCHING' | 'SIGNAL_LOST' | 'UNAVAILABLE'
 */
async function resolveLocation(latitude, longitude, gpsFix = true, options = {}) {
  const { maxWaitMs = 1200, onBackgroundResolve = null, isCoarse = false } = options;
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // 1. Hardware / Signal verification
  if (!gpsFix || isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
    if (lastKnownLocation && !gpsFix) {
      return {
        place: 'GPS Signal Lost',
        status: 'SIGNAL_LOST'
      };
    }
    return {
      place: 'Searching for location...',
      status: 'SEARCHING'
    };
  }

  // 2. Spatial Cache Lookup (Exact grid match with precision tagging)
  const baseGridKey = getGridKey(lat, lon);
  const gridKey = isCoarse ? `${baseGridKey}:coarse` : baseGridKey;
  const now = Date.now();
  const cached = locationCache.get(gridKey);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    lastKnownLocation = cached.place;
    return {
      place: cached.place,
      status: 'RESOLVED'
    };
  }

  // 3. Proximity Cache Lookup (within 100 meters, matching precision)
  for (const [key, item] of locationCache.entries()) {
    const itemIsCoarse = key.endsWith(':coarse');
    if (itemIsCoarse === isCoarse && (now - item.timestamp < CACHE_TTL_MS)) {
      const dist = getDistanceMeters(lat, lon, item.lat, item.lon);
      if (dist <= 100) {
        lastKnownLocation = item.place;
        return {
          place: item.place,
          status: 'RESOLVED'
        };
      }
    }
  }

  // 4. Rate-Limiting Protection
  if (now - lastProviderCallTime < MIN_REQUEST_INTERVAL_MS) {
    if (lastKnownLocation) {
      return {
        place: lastKnownLocation,
        status: 'RESOLVED'
      };
    }
    return {
      place: 'Searching for location...',
      status: 'SEARCHING'
    };
  }

  // 5. In-flight request deduplication
  let requestPromise = inFlightRequests.get(gridKey);
  if (!requestPromise) {
    lastProviderCallTime = now;
    requestPromise = (async () => {
      try {
        const resolvedPlace = await queryInternalProvider(lat, lon, isCoarse);
        if (resolvedPlace) {
          if (locationCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = locationCache.keys().next().value;
            locationCache.delete(oldestKey);
          }

          locationCache.set(gridKey, {
            place: resolvedPlace,
            lat,
            lon,
            timestamp: Date.now()
          });

          lastKnownLocation = resolvedPlace;
          if (typeof onBackgroundResolve === 'function') {
            try { onBackgroundResolve(resolvedPlace); } catch (_) {}
          }
          return {
            place: resolvedPlace,
            status: 'RESOLVED'
          };
        }
      } catch (err) {
        // silent internal catch
      } finally {
        inFlightRequests.delete(gridKey);
      }

      if (lastKnownLocation) {
        return {
          place: lastKnownLocation,
          status: 'RESOLVED'
        };
      }

      return {
        place: 'Location unavailable',
        status: 'UNAVAILABLE'
      };
    })();

    inFlightRequests.set(gridKey, requestPromise);
  }

  // 6. Fast-Timeout / Non-blocking race
  if (maxWaitMs && maxWaitMs > 0) {
    const fallbackTimer = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          place: lastKnownLocation || 'Searching for location...',
          status: lastKnownLocation ? 'RESOLVED' : 'SEARCHING'
        });
      }, maxWaitMs);
    });

    return Promise.race([requestPromise, fallbackTimer]);
  }

  return requestPromise;
}

module.exports = {
  resolveLocation,
  getLastKnownLocation
};
