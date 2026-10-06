require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const { connectProducer, disconnectProducer } = require('./kafka/producer');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3002;

const start = async () => {
  await connectDB();
  await connectProducer();

  const server = app.listen(PORT, () => {
    logger.info(`Passport Service running on port ${PORT}`);
    logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down...`);
    await disconnectProducer();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
