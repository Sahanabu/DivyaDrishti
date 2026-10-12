const crypto = require('crypto');
const Session = require('../models/Session');
const RfidCard = require('../models/RfidCard');
const { getIo } = require('../sockets'); // to emit login success to frontend

exports.authenticateRFID = async (req, res) => {
  try {
    const { rfid, deviceId } = req.body;

    if (!rfid) {
      return res.status(400).json({ error: 'RFID is required' });
    }

    const cleanUid = rfid.trim().toUpperCase();
    const io = getIo();

    // Broadcast raw scan event for Settings "Add Card" listener
    if (io) {
      io.emit('rfid_scanned', { uid: cleanUid });
    }

    // Lookup card in MongoDB (fallback to default auth for C9 DA 12 07 or AA BB CC DD if db is fresh)
    let card = await RfidCard.findOne({ uid: cleanUid });
    const isHardcodedDefault = (cleanUid === 'C9 DA 12 07' || cleanUid === 'AA BB CC DD');

    if (!card && !isHardcodedDefault) {
      if (io) io.emit('login_status', { status: 'denied', uid: cleanUid });
      return res.status(403).json({ error: 'Unauthorized RFID' });
    }

    if (card && card.status !== 'active') {
      if (io) io.emit('login_status', { status: 'denied', reason: 'Card is deactivated', uid: cleanUid });
      return res.status(403).json({ error: 'RFID Card is currently deactivated' });
    }

    const riderName = card?.name || 'Sahana';

    // Update lastUsed timestamp
    if (card) {
      card.lastUsed = new Date();
      await card.save().catch(() => {});
    }

    // Generate a secure random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create session in MongoDB
    const session = new Session({
      rfidUid: cleanUid,
      sessionToken,
      riderName
    });
    
    await session.save();

    // Notify frontend that login was granted
    if (io) {
      io.emit('login_status', { status: 'granted', user: riderName, uid: cleanUid });
      io.emit('rfid_authenticated', { uid: cleanUid, name: riderName });
      io.emit('rfid_cards_updated', { action: 'used', uid: cleanUid });
    }

    res.status(200).json({ success: true, rider: riderName });

  } catch (error) {
    console.error('RFID Auth Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.claimSession = async (req, res) => {
  try {
    // Find the most recent active session
    const session = await Session.findOne().sort({ createdAt: -1 });
    
    if (!session) {
      return res.status(401).json({ error: 'No active session found' });
    }

    // Set HTTP-only cookie for the browser
    res.cookie('sessionToken', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      authenticated: true,
      user: { name: session.riderName }
    });
  } catch (error) {
    console.error('Claim Session Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.verifySession = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ authenticated: false });
    }

    const session = await Session.findOne({ sessionToken });
    
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }

    res.status(200).json({
      authenticated: true,
      user: {
        name: session.riderName
      }
    });

  } catch (error) {
    console.error('Verify Session Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      await Session.deleteOne({ sessionToken });
    }
    res.clearCookie('sessionToken');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
