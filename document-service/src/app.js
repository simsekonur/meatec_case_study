require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const swaggerSpec = require('./config/swagger');
const documentRoutes = require('./routes/documentRoutes');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/documents', documentRoutes);

app.get('/health', (req, res) =>
  res.status(200).json({ service: 'document-service', status: 'ok' })
);

app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Handle multer errors (file size, file type)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
  }
  if (err.message?.startsWith('File type not allowed')) {
    return res.status(415).json({ success: false, message: err.message });
  }
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
