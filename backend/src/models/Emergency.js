const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  device: {
    type: String,
    required: true,
  },
  rider: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['CRASH', 'IMPACT', 'LANE_DEPARTURE', 'DROWSINESS', 'UNCONSCIOUS_DROWSINESS', 'HIGH_RISK', 'AI_CRITICAL'],
    default: 'CRASH',
    required: true,
  },
  location: {
    latitude: Number,
    longitude: Number,
    placeName: String,
  },
  status: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'VERIFIED', 'CANCELLED', 'RESOLVED'],
    default: 'PENDING_VERIFICATION',
  },
  aiPredictionData: {
    type: mongoose.Schema.Types.Mixed, 
  },
  videoClipUrl: {
    type: String,
    default: '',
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emergency', emergencySchema);
