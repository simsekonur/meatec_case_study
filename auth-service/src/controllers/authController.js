const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Generate a signed JWT token for a user
 */
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ email, password, role });
    const token = signToken(user);

    logger.info(`New user registered: ${email} (role: ${user.role})`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    logger.info(`User logged in: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/verify  (internal endpoint for other services)
 * Verifies a JWT and returns the decoded user payload.
 */
const verifyToken = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ success: true, user: decoded });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { register, login, verifyToken };
