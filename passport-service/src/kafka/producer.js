const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'passport-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { retries: 5 },
});

const producer = kafka.producer();

let connected = false;

/**
 * Connect the Kafka producer.
 * Called once at service startup.
 */
const connectProducer = async () => {
  if (connected) return;
  try {
    await producer.connect();
    connected = true;
    logger.info('Kafka producer connected');
  } catch (err) {
    logger.warn(`Kafka producer connection failed (events will be skipped): ${err.message}`);
  }
};

/**
 * Publish a message to a Kafka topic.
 * Fails gracefully if Kafka is unavailable (useful for test environments).
 * @param {string} topic
 * @param {object} payload
 */
const publishEvent = async (topic, payload) => {
  if (!connected) {
    logger.warn(`Kafka not connected – skipping event on topic: ${topic}`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: payload.passportId || String(Date.now()),
          value: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
        },
      ],
    });
    logger.info(`Kafka event published → ${topic}`);
  } catch (err) {
    logger.error(`Kafka publish error [${topic}]: ${err.message}`);
  }
};

/**
 * Gracefully disconnect the producer.
 */
const disconnectProducer = async () => {
  if (connected) {
    await producer.disconnect();
    connected = false;
    logger.info('Kafka producer disconnected');
  }
};

module.exports = { connectProducer, publishEvent, disconnectProducer };
