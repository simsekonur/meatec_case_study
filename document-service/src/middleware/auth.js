const axios = require('axios');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/auth/verify`,
      {},
      { headers: { Authorization: authHeader } }
    );
    req.user = response.data.user;
    next();
  } catch (err) {
    const status = err.response?.status || 401;
    const message = err.response?.data?.message || 'Invalid or expired token';
    logger.warn(`Auth verification failed: ${message}`);
    return res.status(status).json({ success: false, message });
  }
};

const authorise = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${roles.join(', ')}`,
    });
  }
  next();
};

module.exports = { authenticate, authorise };
