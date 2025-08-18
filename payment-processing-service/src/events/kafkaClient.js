// services/payment-processing-service/src/events/kafkaClient.js
// Centralized Kafka client setup using kafkajs.
const { Kafka } = require('kafkajs');
const config = require('../config');

// Create a Kafka instance.
// The 'brokers' array should point to your Kafka broker(s).
const kafka = new Kafka({
  clientId: 'payment-processing-service', // A unique ID for this client
  brokers: [config.kafkaBroker], // e.g., ['localhost:9092']
});

module.exports = kafka;