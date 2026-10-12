const Session = require('../models/Session');

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized: No session token provided' });
    }

    const session = await Session.findOne({ sessionToken });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }

    req.user = {
      name: session.riderName,
      rfid: session.rfidUid
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = authMiddleware;
