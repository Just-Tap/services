// services/user-management-service/src/events/userConsumer.js
// Kafka consumer for user-related events (example: for internal processing or logging).
// In a real scenario, this service might consume events from other services
// (e.g., 'admin_actions' from an Admin Service) to trigger internal updates.
const kafka = require('kafka-node');
const client = require('./kafkaClient');

const Consumer = kafka.Consumer;

// Define topics this consumer should listen to
const topics = [
  // Example: if an Admin Service publishes events when an admin action occurs
  // { topic: 'admin_actions', partition: 0 }
];

const consumer = new Consumer(
  client,
  topics,
  {
    groupId: 'user-management-group', // Consumer group ID
    autoCommit: true
  }
);

consumer.on('message', (message) => {
  console.log(`Kafka User Consumer received message from topic ${message.topic}:`);
  try {
    const event = JSON.parse(message.value);
    console.log('Event:', event);
    // Here you would implement logic to process the event
    // For example, if it's an 'admin_action' to block a user,
    // you might update the user's status in your DB.
  } catch (e) {
    console.error('Error parsing Kafka message in User Consumer:', e, message.value);
  }
});

consumer.on('error', (err) => {
  console.error('Kafka User Consumer error:', err);
});

consumer.on('offsetOutOfRange', (err) => {
  console.error('Kafka User Consumer offsetOutOfRange:', err);
});

module.exports = consumer;