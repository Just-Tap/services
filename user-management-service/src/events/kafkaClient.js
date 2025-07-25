const kafka = require('kafka-node');
const config = require('../config');

const client = new kafka.KafkaClient({ kafkaHost: config.kafkaBroker });

module.exports = client;