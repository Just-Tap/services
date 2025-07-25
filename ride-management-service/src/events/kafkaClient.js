// services/ride-management-service/src/events/kafkaClient.js
// Centralized Kafka client setup for the Ride Management Service.
const kafka = require('kafka-node');
const config = require('../config');

const client = new kafka.KafkaClient({ kafkaHost: config.kafkaBroker });

module.exports = client;