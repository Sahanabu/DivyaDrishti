const mongoose = require('mongoose');

const breadcrumbSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  acceleration: { type: Number, default: 1.0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const tripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  rider: {
    type: String,
    default: 'Sahana'
  },
  device: {
    type: String,
    default: 'ESP32_HELMET_01'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  startLocation: {
    latitude: Number,
    longitude: Number,
    placeName: { type: String, default: 'Trip Origin' }
  },
  endLocation: {
    latitude: Number,
    longitude: Number,
    placeName: { type: String, default: 'Current Location' }
  },
  distanceKm: {
    type: Number,
    default: 0.0
  },
  maxSpeed: {
    type: Number,
    default: 0.0
  },
  avgSpeed: {
    type: Number,
    default: 0.0
  },
  eventsSummary: {
    drowsinessCount: { type: Number, default: 0 },
    laneDepartures: { type: Number, default: 0 },
    hardBrakes: { type: Number, default: 0 },
    forwardCollisionWarnings: { type: Number, default: 0 },
    alcoholTriggers: { type: Number, default: 0 },
    impactEvents: { type: Number, default: 0 }
  },
  safetyScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  breadcrumbs: [breadcrumbSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Trip', tripSchema);
