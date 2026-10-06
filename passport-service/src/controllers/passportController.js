const { validationResult } = require('express-validator');
const BatteryPassport = require('../models/BatteryPassport');
const { publishEvent } = require('../kafka/producer');
const TOPICS = require('../kafka/topics');
const logger = require('../utils/logger');

/**
 * POST /api/passports  — Create a new battery passport (admin only)
 */
const createPassport = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const passport = await BatteryPassport.create({
      data: req.body.data,
      createdBy: req.user.id,
    });

    await publishEvent(TOPICS.PASSPORT_CREATED, {
      passportId: passport._id.toString(),
      batteryIdentifier: passport.data?.generalInformation?.batteryIdentifier,
      createdBy: req.user.id,
    });

    logger.info(`Passport created: ${passport._id} by user ${req.user.id}`);

    return res.status(201).json({
      success: true,
      message: 'Battery passport created',
      passport,
    });
  } catch (error) {
    logger.error(`createPassport error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/passports/:id  — Retrieve a passport (admin/user)
 */
const getPassport = async (req, res) => {
  try {
    const passport = await BatteryPassport.findById(req.params.id);

    if (!passport) {
      return res
        .status(404)
        .json({ success: false, message: 'Passport not found' });
    }

    return res.status(200).json({ success: true, passport });
  } catch (error) {
    if (error.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid passport ID' });
    }
    logger.error(`getPassport error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/passports/:id  — Update a passport (admin only)
 */
const updatePassport = async (req, res) => {
  try {
    const passport = await BatteryPassport.findByIdAndUpdate(
      req.params.id,
      { data: req.body.data },
      { new: true, runValidators: true }
    );

    if (!passport) {
      return res
        .status(404)
        .json({ success: false, message: 'Passport not found' });
    }

    await publishEvent(TOPICS.PASSPORT_UPDATED, {
      passportId: passport._id.toString(),
      batteryIdentifier: passport.data?.generalInformation?.batteryIdentifier,
      updatedBy: req.user.id,
    });

    logger.info(`Passport updated: ${passport._id} by user ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Battery passport updated',
      passport,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid passport ID' });
    }
    logger.error(`updatePassport error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/passports/:id  — Delete a passport (admin only)
 */
const deletePassport = async (req, res) => {
  try {
    const passport = await BatteryPassport.findByIdAndDelete(req.params.id);

    if (!passport) {
      return res
        .status(404)
        .json({ success: false, message: 'Passport not found' });
    }

    await publishEvent(TOPICS.PASSPORT_DELETED, {
      passportId: passport._id.toString(),
      batteryIdentifier: passport.data?.generalInformation?.batteryIdentifier,
      deletedBy: req.user.id,
    });

    logger.info(`Passport deleted: ${passport._id} by user ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Battery passport deleted',
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid passport ID' });
    }
    logger.error(`deletePassport error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createPassport, getPassport, updatePassport, deletePassport };
