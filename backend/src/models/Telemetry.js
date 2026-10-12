const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  device: {
    type: String,
    required: true,
  },
  rider: {
    type: String,
    required: true,
  },
  gps: {
    latitude: Number,
    longitude: Number,
    satellites: Number,
  },
  motion: {
    accelX: Number,
    accelY: Number,
    accelZ: Number,
    gyroX: Number,
    gyroY: Number,
    gyroZ: Number,
    pitch: Number,
    roll: Number,
    magnitude: Number,
  },
  mq3: {
    type: Number,
  },
  sessionActive: {
    type: Boolean,
    default: true,
  },
  placeName: {
    type: String,
    default: 'Searching for location...'
  },
  locationStatus: {
    type: String,
    default: 'SEARCHING'
  },
  locationAccuracy: {
    type: Number,
    default: 0
  },
  isApproximate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
