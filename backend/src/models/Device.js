const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: 'ESP32_HELMET_01'
  },
  name: {
    type: String,
    default: 'DivyaDrishti Smart Helmet'
  },
  hardwareType: {
    type: String,
    enum: ['ESP32', 'EDGE_AI_NODE', 'SMART_PHONE_BRIDGE'],
    default: 'ESP32'
  },
  macAddress: {
    type: String,
    default: ''
  },
  firmwareVersion: {
    type: String,
    default: 'v2.4.0'
  },
  status: {
    type: String,
    enum: ['ONLINE', 'STANDBY', 'OFFLINE', 'MAINTENANCE'],
    default: 'OFFLINE'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 95
  },
  sensors: {
    gps: { type: Boolean, default: true },
    mpu6050: { type: Boolean, default: true },
    mq3: { type: Boolean, default: true },
    rfid: { type: Boolean, default: true },
    oled: { type: Boolean, default: true },
    buzzer: { type: Boolean, default: true }
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  assignedRider: {
    type: String,
    default: 'Sahana'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);
