require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const swaggerSpec = require('./config/swagger');
const passportRoutes = require('./routes/passportRoutes');
const logger = require('./utils/logger');

const app = express();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Swagger Docs ───────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/passports', passportRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({ service: 'passport-service', status: 'ok' })
);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
