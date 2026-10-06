const express = require('express');
const upload = require('../middleware/upload');
const { authenticate, authorise } = require('../middleware/auth');
const {
  uploadDocument,
  getDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/documentController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: File upload and management
 */

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload a file (multipart/form-data)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload (max 10MB)
 *               description:
 *                 type: string
 *                 description: Optional description for the document
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docId:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', authenticate, upload.single('file'), uploadDocument);

/**
 * @swagger
 * /api/documents/{docId}:
 *   parameters:
 *     - in: path
 *       name: docId
 *       required: true
 *       description: MongoDB ObjectId of the document
 *       schema:
 *         type: string
 *   get:
 *     summary: Get a pre-signed download URL for a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns document metadata and a 15-minute download URL
 *       404:
 *         description: Document not found
 *   put:
 *     summary: Update document metadata (description)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a document from S3 and database (admin only)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document deleted
 *       404:
 *         description: Not found
 */
router.get('/:docId', authenticate, getDocument);
router.put('/:docId', authenticate, updateDocument);
router.delete('/:docId', authenticate, authorise('admin'), deleteDocument);

module.exports = router;
