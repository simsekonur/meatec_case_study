const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware: authenticate - verifies JWT from Authorization header.
 * Attaches decoded user to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err.message}`);
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Middleware: authorise(...roles) - restricts access to specified roles.
 * Must be used after authenticate.
 * @param {...string} roles - allowed roles
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = { authenticate, authorise };
