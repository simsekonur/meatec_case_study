require('dotenv').config();
const http = require('http');
const { startConsumer, stopConsumer } = require('./consumers/passportConsumer');
const { verifyConnection } = require('./services/emailService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3004;
let server;

const start = async () => {
  logger.info('Notification Service starting...');

  // Lightweight HTTP health endpoint (enables Render free web service deployment)
  server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'notification-service' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    logger.info(`Notification Service health listener running on port ${PORT}`);
  });

  // Verify SMTP (non-fatal — service still runs if SMTP is unavailable)
  await verifyConnection();

  // Start Kafka consumer
  await startConsumer();

  logger.info('Notification Service ready — listening for Kafka events');
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down...`);
  if (server) server.close();
  await stopConsumer();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});
