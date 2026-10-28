import { initialSensorData } from '../data/mockData';

const BACKEND_HOST = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${BACKEND_HOST}:5000/api`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${BACKEND_HOST}:5000`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('divyadrishti_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// ── Authentication ────────────────────────────────────────────────────────────

export const loginWithRfid = async (uid) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/rfid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid: uid || 'C9 DA 12 07', deviceId: 'ESP32_HELMET_01' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication denied');
    return {
      success: true,
      authenticated: true,
      token: 'token_' + Date.now(),
      user: { name: 'Sahana', role: 'Authorized Rider' }
    };
  } catch (err) {
    throw err;
  }
};

export const claimSession = async () => {
  try {
    const res = await fetch(`${BASE_URL}/auth/claim-session`, { credentials: 'include' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
};

// ── Phone GPS Sync (Zero-Cost Bridge to ESP32 Helmet) ─────────────────────────

export const syncDeviceLocation = async (latitude, longitude, accuracy) => {
  const res = await fetch(`${BASE_URL}/location/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, accuracy }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to sync phone location');
  return data;
};

// ── Sensor & Telemetry Data ──────────────────────────────────────────────────

export const fetchSensorData = async () => {
  try {
    const res = await fetch(`${BASE_URL}/telemetry`, { headers: getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const item = json.data[0];
        return {
          drowsiness: 'Normal',
          drowsinessLevel: 'LOW',
          emergency: Boolean(item.emergency),
          helmetStatus: item.sessionActive ? 'Active' : 'Standby',
          mq3: item.mq3 || 0,
          speed: item.speed || 0,
          acceleration: item.motion?.magnitude || 1.0,
          pitch: item.motion?.pitch || 0,
          roll: item.motion?.roll || 0,
          placeName: item.placeName || '',
          locationStatus: item.locationStatus || 'RESOLVED',
          gps: {
            latitude: item.gps?.latitude || 15.4318,
            longitude: item.gps?.longitude || 75.6586,
            accuracy: item.isApproximate ? '±50m' : '±4m',
            placeName: item.placeName || '',
            locationStatus: item.locationStatus || 'RESOLVED',
          },
          battery: 88,
          timestamp: item.createdAt || new Date().toISOString(),
          devices: {
            esp32: 'online',
            rfid: 'connected',
            mq3: 'connected',
            oled: 'connected',
            gps: item.gps?.latitude ? 'connected' : 'searching',
            imu: 'connected',
            wifi: 'connected',
          }
        };
      }
    }
  } catch (err) {
    console.error('Error fetching sensor data:', err);
  }

  return { ...initialSensorData, timestamp: new Date().toISOString() };
};

export const fetchAlerts = async () => {
  try {
    const res = await fetch(`${BASE_URL}/emergency`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map(item => ({
          id: item._id || Date.now(),
          time: new Date(item.createdAt).toLocaleTimeString(),
          type: item.type === 'IMPACT' ? 'Impact Detected' : (item.type || 'Emergency Alert'),
          severity: 'Emergency',
          status: item.status || 'Active',
          location: item.location?.placeName || `${item.location?.latitude || 0}, ${item.location?.longitude || 0}`,
          videoClipUrl: item.videoClipUrl || ''
        }));
      }
    }
  } catch (_) {}
  return [];
};

export const cancelEmergencyAlert = async () => {
  try {
    const res = await fetch(`${BASE_URL}/emergency/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to cancel emergency:', err);
    return { success: false, error: err.message };
  }
};

export const dispatchEmergencyAlert = async (payload = {}) => {
  try {
    const res = await fetch(`${BASE_URL}/emergency/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to dispatch emergency:', err);
    return { success: false, error: err.message };
  }
};

export const triggerTestImpact = async (customTelemetry = {}) => {
  try {
    const clipUrl = customTelemetry.videoClipUrl || `http://${BACKEND_HOST}:5000/clips/demo_incident.mp4`;
    const res = await fetch(`${BASE_URL}/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: customTelemetry.type || 'IMPACT',
        device: 'ESP32_HELMET_01',
        rider: 'Sahana',
        videoClipUrl: clipUrl,
        telemetry: {
          latitude: customTelemetry.latitude || 15.4318,
          longitude: customTelemetry.longitude || 75.6586,
          speed: customTelemetry.speed || 38.4,
          acceleration: customTelemetry.acceleration || 4.25,
          mq3Value: customTelemetry.mq3Value || 120,
          placeName: customTelemetry.placeName || 'Hubballi - Dharwad Bypass Road',
          videoClipUrl: clipUrl,
          ...customTelemetry
        },
        aiState: {
          event: customTelemetry.type === 'UNCONSCIOUS_DROWSINESS' ? 'UNCONSCIOUS_DROWSINESS' : 'HIGH_IMPACT_CRASH',
          risk: 'CRITICAL'
        }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to trigger test impact:', err);
    return { success: false, error: err.message };
  }
};

export const fetchHistory = async () => {
  try {
    const res = await fetch(`${BASE_URL}/telemetry`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map((item, idx) => ({
          id: idx + 1,
          timestamp: item.createdAt || new Date().toISOString(),
          mq3: item.mq3 ?? 0,
          acceleration: typeof item.motion?.magnitude === 'number' ? item.motion.magnitude : 1.0,
          pitch: item.motion?.pitch ?? 0,
          roll: item.motion?.roll ?? 0,
          speed: item.speed ?? 0,
          placeName: item.placeName || '',
          locationStatus: item.locationStatus || 'RESOLVED',
          drowsiness: item.drowsiness || 'Normal',
          emergency: Boolean(item.emergency)
        }));
      }
    }
  } catch (_) {}
  return [];
};

// ── RFID Card Management ──────────────────────────────────────────────────────

export const fetchRfidCards = async () => {
  try {
    const res = await fetch(`${BASE_URL}/rfid`);
    if (res.ok) {
      const cards = await res.json();
      if (Array.isArray(cards)) return cards;
    }
  } catch (err) {
    console.warn('[API] Failed to fetch RFID cards from backend, using cache/fallback:', err.message);
  }
  return [
    { uid: 'C9 DA 12 07', name: 'Sahana (Primary)', role: 'Owner / Rider', status: 'active', lastUsed: null },
    { uid: 'AA BB CC DD', name: 'Emergency Tag', role: 'Backup', status: 'active', lastUsed: null },
  ];
};

export const registerRfidCard = async (cardData) => {
  const res = await fetch(`${BASE_URL}/rfid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to register RFID card');
  return data;
};

export const updateRfidCardStatus = async (uid, status) => {
  const res = await fetch(`${BASE_URL}/rfid/${encodeURIComponent(uid)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update RFID card');
  return data;
};

export const deleteRfidCard = async (uid) => {
  const res = await fetch(`${BASE_URL}/rfid/${encodeURIComponent(uid)}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete RFID card');
  return data;
};

export const simulateRfidScan = async (uid) => {
  const res = await fetch(`${BASE_URL}/rfid/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid })
  });
  return await res.json();
};

// ── Trip Management & Breadcrumbs ─────────────────────────────────────────────

export const fetchActiveTrip = async () => {
  try {
    const res = await fetch(`${BASE_URL}/trips/active`);
    if (res.ok) {
      const data = await res.json();
      return data.trip || null;
    }
  } catch (_) {}
  return null;
};

export const startTrip = async (startLocation = {}) => {
  const res = await fetch(`${BASE_URL}/trips/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rider: 'Sahana', device: 'ESP32_HELMET_01', startLocation })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start trip');
  return data.trip;
};

export const endTrip = async () => {
  const res = await fetch(`${BASE_URL}/trips/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to end trip');
  return data.trip;
};

// ── Safety Score & Analytics ──────────────────────────────────────────────────

export const fetchSafetyScore = async () => {
  try {
    const res = await fetch(`${BASE_URL}/ai/safety-score`);
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}
  return { success: true, score: 96, grade: 'A+', metrics: {} };
};

export const resetSafetyScore = async () => {
  const res = await fetch(`${BASE_URL}/ai/safety-score/reset`, { method: 'POST' });
  return await res.json();
};

// ── Rider Profile & Emergency Contacts ────────────────────────────────────────

export const fetchRiderProfile = async () => {
  try {
    const res = await fetch(`${BASE_URL}/rider/profile`);
    if (res.ok) {
      const data = await res.json();
      return data.rider;
    }
  } catch (_) {}
  return null;
};

export const updateEmergencyContacts = async (emergencyContacts) => {
  const res = await fetch(`${BASE_URL}/rider/contacts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergencyContacts })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update contacts');
  return data.emergencyContacts;
};

export const getWhatsAppSosUrl = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/emergency/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.whatsAppUrl || '';
  } catch (_) {
    return '';
  }
};

export { BASE_URL };
