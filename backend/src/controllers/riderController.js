const Rider = require('../models/Rider');

const getRiderProfile = async (req, res) => {
  try {
    let rider = await Rider.findOne({ riderId: 'RIDER_01' });
    if (!rider) {
      rider = new Rider({
        riderId: 'RIDER_01',
        name: 'Sahana',
        bloodGroup: 'O+',
        allergies: ['None reported'],
        medicalNotes: 'No known chronic conditions. Wears spectacles while driving.',
        emergencyContacts: [
          { name: 'Dr. Ramesh Patil', relationship: 'Father', phone: '+919448123456', isPrimary: true },
          { name: 'Sunita Patil', relationship: 'Mother', phone: '+919448654321', isPrimary: false }
        ],
        vehicleDetails: {
          model: 'Honda Activa 6G',
          registrationNumber: 'KA 28 HM 8281',
          insurancePolicy: 'HDFC-ERGO-98172401'
        },
        rfidCardUid: 'C9 DA 12 07',
        safetyScore: 98
      });
      await rider.save();
    }
    res.status(200).json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateEmergencyContacts = async (req, res) => {
  try {
    const { emergencyContacts } = req.body;
    if (!Array.isArray(emergencyContacts)) {
      return res.status(400).json({ success: false, message: 'emergencyContacts must be an array' });
    }

    let rider = await Rider.findOne({ riderId: 'RIDER_01' });
    if (!rider) {
      rider = new Rider({ riderId: 'RIDER_01', name: 'Sahana' });
    }

    rider.emergencyContacts = emergencyContacts;
    await rider.save();

    res.status(200).json({ success: true, message: 'Emergency contacts updated successfully', emergencyContacts: rider.emergencyContacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRiderProfile,
  updateEmergencyContacts
};
