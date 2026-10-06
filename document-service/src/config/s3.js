const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

// Use custom endpoint and path style only if S3_ENDPOINT is set (e.g. LocalStack)
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
  s3Config.forcePathStyle = true;
}

const s3Client = new S3Client(s3Config);

const BUCKET = process.env.S3_BUCKET || 'meatec-documents';

logger.info(`S3 client configured → endpoint: ${process.env.S3_ENDPOINT}, bucket: ${BUCKET}`);

module.exports = { s3Client, BUCKET };
