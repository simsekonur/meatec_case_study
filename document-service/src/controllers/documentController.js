const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET } = require('../config/s3');
const Document = require('../models/Document');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('crypto').webcrypto
  ? { v4: () => require('crypto').randomUUID() }
  : require('crypto');

// ─── Helper ──────────────────────────────────────────────────────────────────
const generateS3Key = (originalName) => {
  const ext = originalName.split('.').pop();
  return `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
};

/**
 * POST /api/documents/upload
 * Upload a file to S3 and save metadata to MongoDB.
 */
const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const s3Key = generateS3Key(req.file.originalname);

  try {
    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
          uploadedBy: req.user.id,
          originalName: req.file.originalname,
        },
      })
    );

    // Save metadata to MongoDB
    const doc = await Document.create({
      fileName: s3Key.split('/').pop(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      s3Key,
      bucket: BUCKET,
      uploadedBy: req.user.id,
      description: req.body.description || '',
    });

    logger.info(`Document uploaded: ${doc._id} | key: ${s3Key} | by: ${req.user.id}`);

    return res.status(201).json({
      success: true,
      docId: doc._id,
      fileName: doc.originalName,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    logger.error(`uploadDocument error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

/**
 * GET /api/documents/:docId
 * Returns a pre-signed S3 URL (valid 15 min) for the file.
 */
const getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const command = new GetObjectCommand({ Bucket: doc.bucket, Key: doc.s3Key });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min

    return res.status(200).json({
      success: true,
      docId: doc._id,
      fileName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      description: doc.description,
      downloadUrl: url,
      urlExpiresIn: '15 minutes',
      createdAt: doc.createdAt,
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid document ID' });
    logger.error(`getDocument error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/documents/:docId
 * Update file metadata (description). To replace the file, re-upload.
 */
const updateDocument = async (req, res) => {
  try {
    const { description } = req.body;
    const doc = await Document.findByIdAndUpdate(
      req.params.docId,
      { description },
      { new: true, runValidators: true }
    );

    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    logger.info(`Document metadata updated: ${doc._id}`);
    return res.status(200).json({ success: true, message: 'Document updated', doc });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid document ID' });
    logger.error(`updateDocument error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/documents/:docId
 * Delete file from S3 and remove metadata from MongoDB.
 */
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({ Bucket: doc.bucket, Key: doc.s3Key }));

    // Delete from MongoDB
    await Document.findByIdAndDelete(req.params.docId);

    logger.info(`Document deleted: ${doc._id} | key: ${doc.s3Key}`);
    return res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid document ID' });
    logger.error(`deleteDocument error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { uploadDocument, getDocument, updateDocument, deleteDocument };
