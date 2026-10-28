require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/divyadrishti',
  
  // Twilio SMS
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  EMERGENCY_CONTACT_NUMBER: process.env.EMERGENCY_CONTACT_NUMBER || '+919999999999',
  
  // Geolocation & Emergency
  GOOGLE_GEOLOCATION_API_KEY: process.env.GOOGLE_GEOLOCATION_API_KEY || '',
  INTERNAL_IP_GEO_ENDPOINT: process.env.INTERNAL_IP_GEO_ENDPOINT || '',
  NTFY_TOPIC: process.env.NTFY_TOPIC || 'divyadrishti_emergency_alerts_demo',
  
  // Cloud Video Black Box fallback
  DEFAULT_INCIDENT_CLIP: 'https://d.uguu.se/SFsrMRXG.mp4',
  
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production'
};

module.exports = env;
