const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const { handleEvent } = require('../services/notificationHandler');

const TOPICS = ['passport.created', 'passport.updated', 'passport.deleted'];

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { retries: 10, initialRetryTime: 3000 },
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'notification-group',
});

let running = false;

const startConsumer = async () => {
  try {
    await consumer.connect();
    logger.info('Kafka consumer connected');

    await consumer.subscribe({ topics: TOPICS, fromBeginning: false });
    logger.info(`Subscribed to topics: ${TOPICS.join(', ')}`);

    running = true;
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          logger.warn(`Failed to parse Kafka message on topic ${topic}: ${raw}`);
          return;
        }

        logger.info(`Kafka event received ← ${topic} | key: ${message.key?.toString()}`);

        try {
          await handleEvent(topic, payload);
        } catch (err) {
          logger.error(`Notification handling failed for topic ${topic}: ${err.message}`);
          // Do NOT rethrow — we don't want to stop the consumer for a single failed email
        }
      },
    });
  } catch (err) {
    logger.error(`Kafka consumer failed to start: ${err.message}`);
    // Retry after delay
    if (running !== false) {
      setTimeout(() => startConsumer(), 10000);
    }
  }
};

const stopConsumer = async () => {
  running = false;
  try {
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  } catch (err) {
    logger.error(`Error disconnecting consumer: ${err.message}`);
  }
};

module.exports = { startConsumer, stopConsumer };
