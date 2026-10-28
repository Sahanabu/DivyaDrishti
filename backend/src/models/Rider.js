const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: 'RIDER_01'
  },
  name: {
    type: String,
    required: true,
    default: 'Sahana'
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    default: 'O+'
  },
  allergies: {
    type: [String],
    default: ['None reported']
  },
  medicalNotes: {
    type: String,
    default: 'No known chronic conditions. Wear spectacles when driving.'
  },
  emergencyContacts: [
    {
      name: { type: String, required: true },
      relationship: { type: String, default: 'Family' },
      phone: { type: String, required: true },
      isPrimary: { type: Boolean, default: false }
    }
  ],
  vehicleDetails: {
    model: { type: String, default: 'Honda Activa 6G' },
    registrationNumber: { type: String, default: 'KA 28 HM 8281' },
    insurancePolicy: { type: String, default: 'HDFC-ERGO-98172401' }
  },
  rfidCardUid: {
    type: String,
    default: 'C9 DA 12 07'
  },
  safetyScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 95
  },
  totalRides: {
    type: Number,
    default: 0
  },
  totalDistanceKm: {
    type: Number,
    default: 0.0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Rider', riderSchema);
