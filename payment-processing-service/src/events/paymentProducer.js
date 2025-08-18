// services/payment-processing-service/src/events/paymentProducer.js
// Kafka producer for sending payment-related events using kafkajs.
const kafka = require('./kafkaClient'); // Import the Kafka instance from kafkajs

// Create a producer instance from the Kafka client.
const producer = kafka.producer();

// Connect the producer. This is an async operation.
const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka Payment Producer connected and ready');
  } catch (error) {
    console.error('Error connecting Kafka Payment Producer:', error);
    // Exit if producer cannot connect, as it's a critical dependency
    process.exit(1);
  }
};

/**
 * Sends a message to a Kafka topic.
 * @param {string} topic - The Kafka topic to send the message to.
 * @param {object} message - The message payload (will be stringified to JSON).
 * @param {string} key - Optional key for message partitioning.
 */
const sendPaymentEvent = async (topic, message, key = null) => {
  try {
    await producer.send({
      topic: topic,
      messages: [
        {
          value: JSON.stringify(message),
          key: key,
        },
      ],
    });
    console.log(`Kafka message sent to topic ${topic}:`, message);
  } catch (error) {
    console.error(`Error sending Kafka message to topic ${topic}:`, error);
  }
};

// Disconnect the producer (for graceful shutdown)
const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    console.log('Kafka Payment Producer disconnected.');
  } catch (error) {
    console.error('Error disconnecting Kafka Payment Producer:', error);
  }
};

// Export the connect, send, and disconnect functions, and the producer instance
module.exports = {
  connectProducer,
  sendPaymentEvent,
  disconnectProducer,
  producer // Export producer for server.js to listen for connection status
};
