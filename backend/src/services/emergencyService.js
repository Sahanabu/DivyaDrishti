const Emergency = require('../models/Emergency');
const { sendSmsNotification, sendNtfyPush, generateWhatsAppSosLink } = require('./notificationService');
const { getLatestIncidentClipOnDisk, uploadVideoToCloud } = require('./cloudVideoService');
const { recordSafetyEvent } = require('./aiService');

/**
 * Creates and logs a verified emergency event in MongoDB
 */
async function recordEmergencyIncident({ device = 'ESP32_HELMET_01', rider = 'Sahana', type = 'IMPACT', location, aiPredictionData, videoClipUrl }) {
  try {
    recordSafetyEvent(type, 'CRITICAL');
    const incident = new Emergency({
      device,
      rider,
      type,
      location: {
        latitude: location?.latitude || 15.4318,
        longitude: location?.longitude || 75.6586,
        placeName: location?.placeName || 'Hubballi - Dharwad Bypass Road'
      },
      status: 'VERIFIED',
      aiPredictionData: aiPredictionData || {},
      videoClipUrl: videoClipUrl || ''
    });
    await incident.save();
    return incident;
  } catch (err) {
    console.error('[EMERGENCY SERVICE] Failed to record incident:', err.message);
    return null;
  }
}

/**
 * Dispatches multi-channel notification failover (SMS + Push + WhatsApp link)
 */
async function dispatchMultiChannelAlert({ rider = 'Sahana', type = 'IMPACT', location, speed = 0, videoClipUrl = '', recipientPhone }) {
  const place = location?.placeName || 'Location unavailable';
  const lat = location?.latitude || 15.4318;
  const lon = location?.longitude || 75.6586;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  // 1. WhatsApp SOS Link
  const whatsAppUrl = generateWhatsAppSosLink({
    phone: recipientPhone,
    riderName: rider,
    eventType: type,
    placeName: place,
    lat,
    lon,
    speed,
    videoClipUrl
  });

  // 2. NTFY Push Notification
  const isDrowsiness = String(type).includes('DROWSINESS') || String(type).includes('UNCONSCIOUS');
  const ntfyMessage = isDrowsiness
    ? `CRITICAL ALERT: Driver ${rider} unresponsive (eyes closed >10s)!\nLocation: ${place}\nSpeed: ${speed} km/h\nMap: ${mapsLink}${videoClipUrl ? `\nIncident Video: ${videoClipUrl}` : ''}`
    : `CRITICAL ALERT: Verified crash detected for ${rider}!\nLocation: ${place}\nSpeed: ${speed} km/h\nMap: ${mapsLink}${videoClipUrl ? `\nIncident Video: ${videoClipUrl}` : ''}`;

  const pushPromise = sendNtfyPush({
    title: isDrowsiness ? 'DIVYADRISHTI UNRESPONSIVE DRIVER ALERT' : 'DIVYADRISHTI CRASH ALERT',
    message: ntfyMessage,
    priority: 'urgent',
    tags: isDrowsiness ? 'rotating_light,sos,sleeping' : 'rotating_light,car',
    clickUrl: videoClipUrl || mapsLink,
    videoClipUrl
  });

  // 3. Twilio SMS
  const smsBody = `DIVYADRISHTI ALERT: Crash/Emergency detected for ${rider} at ${place} (Speed: ${Number(speed).toFixed(1)} km/h). Map: ${mapsLink}${videoClipUrl ? ` Video: ${videoClipUrl}` : ''}`;
  const smsPromise = sendSmsNotification({ to: recipientPhone, message: smsBody });

  const [pushRes, smsRes] = await Promise.allSettled([pushPromise, smsPromise]);

  return {
    success: true,
    whatsAppUrl,
    pushStatus: pushRes.status === 'fulfilled' ? pushRes.value : null,
    smsStatus: smsRes.status === 'fulfilled' ? smsRes.value : null
  };
}

module.exports = {
  recordEmergencyIncident,
  dispatchMultiChannelAlert
};
