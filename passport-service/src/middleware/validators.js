const { body } = require('express-validator');

const createPassportValidation = [
  body('data').notEmpty().withMessage('Passport data is required'),
  body('data.generalInformation.batteryIdentifier')
    .notEmpty()
    .withMessage('batteryIdentifier is required'),
];

const updatePassportValidation = [
  body('data').notEmpty().withMessage('Passport data is required'),
];

module.exports = { createPassportValidation, updatePassportValidation };
