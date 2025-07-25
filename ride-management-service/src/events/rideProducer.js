// Kafka producer for sending ride-related events.
const kafka = require('kafka-node');
const client = require('./kafkaClient');

const Producer = kafka.Producer;
const producer = new Producer(client);

producer.on('ready', () => {
  console.log('Kafka Ride Producer is ready');
});

producer.on('error', (err) => {
  console.error('Kafka Ride Producer error:', err);
});

/**
 * Sends a message to a Kafka topic.
 * @param {string} topic - The Kafka topic to send to.
 * @param {object} message - The message payload (will be stringified).
 * @param {string} key - Optional key for message partitioning (e.g., rideId).
 */
const sendRideEvent = (topic, message, key = null) => {
  const payloads = [
    { topic: topic, messages: JSON.stringify(message), key: key }
  ];
  producer.send(payloads, (err, data) => {
    if (err) {
      console.error(`Error sending Kafka message to topic ${topic}:`, err);
    } else {
      console.log(`Kafka message sent to topic ${topic}:`, data);
    }
  });
};

module.exports = { sendRideEvent };