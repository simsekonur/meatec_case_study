const express = require('express');
const { authenticate, authorise } = require('../middleware/auth');
const { createPassportValidation, updatePassportValidation } = require('../middleware/validators');
const {
  createPassport,
  getPassport,
  updatePassport,
  deletePassport,
} = require('../controllers/passportController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Passports
 *   description: Battery Passport CRUD operations
 */

/**
 * @swagger
 * /api/passports:
 *   post:
 *     summary: Create a battery passport (admin only)
 *     tags: [Passports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Passport created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (non-admin)
 */
router.post(
  '/',
  authenticate,
  authorise('admin'),
  createPassportValidation,
  createPassport
);

/**
 * @swagger
 * /api/passports/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       description: MongoDB ObjectId of the battery passport
 *       schema:
 *         type: string
 *         example: 6ac505a717d4f575e9e1831c
 *   get:
 *     summary: Get a battery passport by ID (admin/user)
 *     tags: [Passports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passport found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a battery passport (admin only)
 *     tags: [Passports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Passport updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a battery passport (admin only)
 *     tags: [Passports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passport deleted
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticate, authorise('admin', 'user'), getPassport);
router.put('/:id', authenticate, authorise('admin'), updatePassportValidation, updatePassport);
router.delete('/:id', authenticate, authorise('admin'), deletePassport);

module.exports = router;
