const twilio = require('twilio');
const https = require('https');
const env = require('../config/env');

let twilioClient = null;
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && !env.TWILIO_ACCOUNT_SID.includes('your_')) {
  try {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.warn('[NOTIFICATION SERVICE] Twilio init notice:', err.message);
  }
}

/**
 * Dispatches an SMS via Twilio with automatic fallback
 */
async function sendSmsNotification({ to, message }) {
  const targetNumber = to || env.EMERGENCY_CONTACT_NUMBER;
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    console.log(`[SMS NOTIFICATION SIMULATED] To: ${targetNumber} | Text: ${message.slice(0, 100)}...`);
    return { success: true, simulated: true };
  }

  try {
    const res = await twilioClient.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to: targetNumber
    });
    console.log(`[SMS NOTIFICATION DISPATCHED] SID: ${res.sid} to ${targetNumber}`);
    return { success: true, sid: res.sid };
  } catch (err) {
    console.error(`[SMS NOTIFICATION ERROR] Failed sending to ${targetNumber}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches a high-priority push notification to NTFY.SH
 */
async function sendNtfyPush({ title, message, priority = 'urgent', tags = 'rotating_light,car', clickUrl = '', videoClipUrl = '' }) {
  return new Promise((resolve) => {
    const topic = env.NTFY_TOPIC;
    const postData = message;

    const headers = {
      'Title': title || 'DIVYADRISHTI EMERGENCY ALERT',
      'Priority': priority,
      'Tags': tags,
      'Content-Length': Buffer.byteLength(postData)
    };

    if (clickUrl) {
      headers['Click'] = clickUrl;
    }
    if (videoClipUrl) {
      headers['Attach'] = videoClipUrl;
    }

    const options = {
      hostname: 'ntfy.sh',
      port: 443,
      path: `/${topic}`,
      method: 'POST',
      headers
    };

    const req = https.request(options, (res) => {
      console.log(`[NTFY.SH NOTIFICATION DISPATCHED] Topic: ${topic} | Status: ${res.statusCode}`);
      resolve({ success: res.statusCode === 200, statusCode: res.statusCode });
    });

    req.on('error', (err) => {
      console.error('[NTFY.SH NOTIFICATION ERROR]:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Generates an instant 1-Click WhatsApp SOS link with pre-filled crash data
 */
function generateWhatsAppSosLink({ phone, riderName = 'Sahana', eventType = 'CRASH', placeName = 'Roadway', lat = 15.4318, lon = 75.6586, speed = 0, videoClipUrl = '' }) {
  const cleanPhone = String(phone || env.EMERGENCY_CONTACT_NUMBER).replace(/[^0-9]/g, '');
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  
  let text = `🚨 *DIVYADRISHTI EMERGENCY SOS ALERT* 🚨\n\n`;
  text += `*Rider:* ${riderName}\n`;
  text += `*Incident:* ${eventType.replace(/_/g, ' ')}\n`;
  text += `*Location:* ${placeName}\n`;
  text += `*Speed:* ${Number(speed).toFixed(1)} km/h\n`;
  text += `*Live GPS Map:* ${mapsLink}\n`;
  if (videoClipUrl) {
    text += `*10s Video Black Box Clip:* ${videoClipUrl}\n`;
  }
  text += `\nPlease check on the rider or contact emergency services immediately!`;

  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

module.exports = {
  sendSmsNotification,
  sendNtfyPush,
  generateWhatsAppSosLink
};
