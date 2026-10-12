const RfidCard = require('../models/RfidCard');
const { getIo } = require('../sockets');

// Default initial cards to seed if collection is brand new
const DEFAULT_CARDS = [
  { uid: 'C9 DA 12 07', name: 'Sahana (Primary)', role: 'Owner / Rider', status: 'active' },
  { uid: 'AA BB CC DD', name: 'Emergency Tag', role: 'Backup', status: 'active' }
];

async function ensureDefaultCards() {
  try {
    const count = await RfidCard.countDocuments();
    if (count === 0) {
      await RfidCard.insertMany(DEFAULT_CARDS);
      console.log('[RFID] Seeded default authorized RFID cards into database.');
    }
  } catch (err) {
    console.warn('[RFID] Could not seed default cards:', err.message);
  }
}

// 1. GET /api/rfid - List all registered RFID cards
exports.getRfidCards = async (req, res) => {
  try {
    await ensureDefaultCards();
    const cards = await RfidCard.find().sort({ createdAt: 1 });
    res.status(200).json(cards);
  } catch (error) {
    console.error('Get RFID Cards Error:', error);
    res.status(500).json({ error: 'Failed to retrieve RFID cards' });
  }
};

// 2. POST /api/rfid - Register/Add a new RFID card
exports.addRfidCard = async (req, res) => {
  try {
    let { uid, name, role = 'Rider', status = 'active' } = req.body;
    if (!uid || !name) {
      return res.status(400).json({ error: 'Card UID and User Name are required' });
    }

    const cleanUid = uid.trim().toUpperCase();
    const cleanName = name.trim();

    // Check if card with this UID already exists
    const existing = await RfidCard.findOne({ uid: cleanUid });
    if (existing) {
      existing.name = cleanName;
      existing.role = role || existing.role;
      existing.status = status || existing.status;
      await existing.save();

      const io = getIo();
      if (io) io.emit('rfid_cards_updated', { action: 'updated', card: existing });

      return res.status(200).json({ success: true, message: 'Card updated', card: existing });
    }

    const newCard = new RfidCard({
      uid: cleanUid,
      name: cleanName,
      role: role || 'Rider',
      status: status || 'active'
    });

    await newCard.save();

    const io = getIo();
    if (io) {
      io.emit('rfid_cards_updated', { action: 'created', card: newCard });
      io.emit('rfid_scanned', { uid: cleanUid, name: cleanName });
    }

    res.status(201).json({ success: true, message: 'Card successfully registered', card: newCard });
  } catch (error) {
    console.error('Add RFID Card Error:', error);
    res.status(500).json({ error: 'Failed to register RFID card' });
  }
};

// 3. PUT /api/rfid/:uid - Update card status or details
exports.updateRfidCard = async (req, res) => {
  try {
    const rawUid = req.params.uid;
    const cleanUid = decodeURIComponent(rawUid).trim().toUpperCase();
    const { status, name, role } = req.body;

    const card = await RfidCard.findOne({ uid: cleanUid });
    if (!card) {
      return res.status(404).json({ error: 'RFID Card not found' });
    }

    if (status !== undefined) card.status = status;
    if (name !== undefined) card.name = name.trim();
    if (role !== undefined) card.role = role.trim();

    await card.save();

    const io = getIo();
    if (io) io.emit('rfid_cards_updated', { action: 'updated', card });

    res.status(200).json({ success: true, card });
  } catch (error) {
    console.error('Update RFID Card Error:', error);
    res.status(500).json({ error: 'Failed to update RFID card' });
  }
};

// 4. DELETE /api/rfid/:uid - Remove card
exports.deleteRfidCard = async (req, res) => {
  try {
    const rawUid = req.params.uid;
    const cleanUid = decodeURIComponent(rawUid).trim().toUpperCase();

    const deleted = await RfidCard.findOneAndDelete({ uid: cleanUid });
    if (!deleted) {
      return res.status(404).json({ error: 'RFID Card not found' });
    }

    const io = getIo();
    if (io) io.emit('rfid_cards_updated', { action: 'deleted', uid: cleanUid });

    res.status(200).json({ success: true, message: 'Card removed', uid: cleanUid });
  } catch (error) {
    console.error('Delete RFID Card Error:', error);
    res.status(500).json({ error: 'Failed to remove RFID card' });
  }
};

// 5. POST /api/rfid/scan - Emit a real-time scan event (from ESP32 or UI test button)
exports.simulateOrSubmitScan = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID is required' });

    const cleanUid = uid.trim().toUpperCase();
    const card = await RfidCard.findOne({ uid: cleanUid });

    const io = getIo();
    if (io) {
      io.emit('rfid_scanned', {
        uid: cleanUid,
        card: card || null,
        isRegistered: Boolean(card)
      });
    }

    res.status(200).json({
      success: true,
      uid: cleanUid,
      registered: Boolean(card),
      card: card || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Scan dispatch failed' });
  }
};
