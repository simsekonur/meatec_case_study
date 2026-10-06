const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    bucket: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String, // user ID from JWT
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

module.exports = mongoose.model('Document', documentSchema);
