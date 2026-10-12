const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  rfidUid: {
    type: String,
    required: true,
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  riderName: {
    type: String,
    default: 'Sahana'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Automatically delete after 24 hours
  }
});

module.exports = mongoose.model('Session', SessionSchema);
