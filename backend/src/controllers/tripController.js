const Trip = require('../models/Trip');
const { getLiveSafetyScore } = require('../services/aiService');
const { getIo } = require('../sockets');

// Helper to calculate distance between two coordinates in kilometers (Haversine formula)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let activeTripInstance = null;

const startTrip = async (req, res) => {
  try {
    const { rider = 'Sahana', device = 'ESP32_HELMET_01', startLocation } = req.body;
    
    // Auto-complete any existing active trip
    await Trip.updateMany({ status: 'ACTIVE' }, { status: 'COMPLETED', endTime: new Date() });

    const tripId = `TRIP_${Date.now()}`;
    const newTrip = new Trip({
      tripId,
      rider,
      device,
      status: 'ACTIVE',
      startTime: new Date(),
      startLocation: {
        latitude: startLocation?.latitude || 15.4318,
        longitude: startLocation?.longitude || 75.6586,
        placeName: startLocation?.placeName || 'Trip Origin'
      },
      endLocation: {
        latitude: startLocation?.latitude || 15.4318,
        longitude: startLocation?.longitude || 75.6586,
        placeName: startLocation?.placeName || 'Trip Origin'
      },
      safetyScore: 100,
      breadcrumbs: [
        {
          latitude: startLocation?.latitude || 15.4318,
          longitude: startLocation?.longitude || 75.6586,
          speed: 0,
          timestamp: new Date()
        }
      ]
    });

    await newTrip.save();
    activeTripInstance = newTrip;

    const io = getIo();
    if (io) io.emit('trip_started', newTrip);

    res.status(201).json({ success: true, trip: newTrip });
  } catch (err) {
    console.error('[TRIP] Error starting trip:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const recordBreadcrumb = async (req, res) => {
  try {
    const { latitude, longitude, speed = 0, acceleration = 1.0, heading = 0 } = req.body;
    const cleanLat = parseFloat(latitude);
    const cleanLon = parseFloat(longitude);

    if (!Number.isFinite(cleanLat) || !Number.isFinite(cleanLon) || (cleanLat === 0 && cleanLon === 0)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    let trip = activeTripInstance || await Trip.findOne({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!trip) {
      // Auto-initialize trip if none active
      const tripId = `TRIP_${Date.now()}`;
      trip = new Trip({
        tripId,
        rider: 'Sahana',
        device: 'ESP32_HELMET_01',
        status: 'ACTIVE',
        startTime: new Date(),
        startLocation: { latitude: cleanLat, longitude: cleanLon },
        breadcrumbs: []
      });
    }

    const prevCrumb = trip.breadcrumbs.length > 0 ? trip.breadcrumbs[trip.breadcrumbs.length - 1] : null;
    let addedDistance = 0;
    if (prevCrumb) {
      addedDistance = haversineDistance(prevCrumb.latitude, prevCrumb.longitude, cleanLat, cleanLon);
    }

    trip.breadcrumbs.push({
      latitude: cleanLat,
      longitude: cleanLon,
      speed: Number(speed) || 0,
      acceleration: Number(acceleration) || 1.0,
      heading: Number(heading) || 0,
      timestamp: new Date()
    });

    trip.distanceKm = Number((trip.distanceKm + addedDistance).toFixed(3));
    trip.maxSpeed = Math.max(trip.maxSpeed, Number(speed) || 0);
    
    // Rolling average speed
    const totalSpeedSum = trip.breadcrumbs.reduce((sum, b) => sum + (b.speed || 0), 0);
    trip.avgSpeed = Number((totalSpeedSum / trip.breadcrumbs.length).toFixed(1));

    trip.endLocation = {
      latitude: cleanLat,
      longitude: cleanLon,
      placeName: req.body.placeName || trip.endLocation?.placeName || 'Live Route'
    };

    const liveSafety = getLiveSafetyScore();
    trip.safetyScore = liveSafety.score;
    trip.durationSeconds = Math.round((Date.now() - new Date(trip.startTime).getTime()) / 1000);

    await trip.save();
    activeTripInstance = trip;

    const io = getIo();
    if (io) {
      io.emit('breadcrumb_update', {
        tripId: trip.tripId,
        coordinate: { latitude: cleanLat, longitude: cleanLon, speed },
        distanceKm: trip.distanceKm,
        safetyScore: trip.safetyScore
      });
    }

    res.status(200).json({ success: true, distanceKm: trip.distanceKm, safetyScore: trip.safetyScore });
  } catch (err) {
    console.error('[TRIP] Error recording breadcrumb:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const endTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!trip) {
      return res.status(200).json({ success: true, message: 'No active trip to conclude' });
    }

    trip.status = 'COMPLETED';
    trip.endTime = new Date();
    trip.durationSeconds = Math.round((trip.endTime.getTime() - new Date(trip.startTime).getTime()) / 1000);
    const liveSafety = getLiveSafetyScore();
    trip.safetyScore = liveSafety.score;

    await trip.save();
    activeTripInstance = null;

    const io = getIo();
    if (io) io.emit('trip_ended', trip);

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error('[TRIP] Error ending trip:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActiveTrip = async (req, res) => {
  try {
    let trip = await Trip.findOne({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!trip) {
      // Return last completed trip if none active
      trip = await Trip.findOne().sort({ createdAt: -1 });
    }
    res.status(200).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json({ success: true, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.status(200).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  startTrip,
  recordBreadcrumb,
  endTrip,
  getActiveTrip,
  getAllTrips,
  getTripById
};
