const mongoose = require('mongoose');

const AIPredictionSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true
  },
  risk: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    default: 1.0
  },
  drowsiness: {
    type: String,
    default: 'NORMAL'
  },
  lane: {
    type: String,
    default: 'CENTERED'
  },
  objects: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AIPrediction', AIPredictionSchema);
