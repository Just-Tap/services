// services/payment-processing-service/src/events/paymentConsumer.js
// Kafka consumer for processing events related to payments using kafkajs.
const kafka = require('./kafkaClient'); // Import the Kafka instance from kafkajs
const Payment = require('../models/Payment'); // Payment model
const { sendPaymentEvent } = require('./paymentProducer'); // Producer for sending new events

// Create a consumer instance.
const consumer = kafka.consumer({ groupId: 'payment-service-group' });

/**
 * Handles the 'ride_completed_for_payment' event.
 * This function creates a pending payment record in the database.
 * The actual payment collection will be initiated by the customer's frontend.
 * @param {object} event - The event payload from Kafka.
 * @param {string} event.rideId - The ID of the completed ride.
 * @param {string} event.customerId - The ID of the customer.
 * @param {number} event.amount - The fare amount for the ride in smallest currency unit (e.g., paise).
 * @param {string} event.currency - The currency (e.g., 'INR').
 * @param {string} event.description - A description for the payment.
 */
const handleRideCompletedForPayment = async (event) => {
  try {
    const { rideId, customerId, amount, currency, description } = event;

    // Check if a payment for this ride already exists to prevent duplicates
    const existingPayment = await Payment.findOne({ rideId: rideId });
    if (existingPayment) {
      console.log(`Payment already exists for rideId ${rideId}. Skipping creation.`);
      return;
    }

    // Create a new payment record in 'initiated' status.
    // The actual Razorpay order will be created when the frontend initiates payment.
    const newPayment = new Payment({
      rideId,
      customerId,
      amount,
      currency,
      description,
      status: 'initiated', // Payment initiated in our system, pending customer action
      paymentMethodType: 'not_selected' // Customer will select on frontend
    });

    await newPayment.save();
    console.log(`Payment record created for ride ${rideId}:`, newPayment);

    // Optionally, send an internal event or log that a payment is pending
    // This event could be consumed by a notification service to prompt the user to pay
    await sendPaymentEvent('payment_initiated_for_ride', {
      paymentId: newPayment._id,
      rideId: newPayment.rideId,
      customerId: newPayment.customerId,
      amount: newPayment.amount,
      currency: newPayment.currency,
      status: newPayment.status,
      message: 'Payment initiated for ride, awaiting customer action.',
    }, newPayment._id.toString());

  } catch (error) {
    console.error('Error handling ride_completed_for_payment event:', error);
  }
};

// Function to start the Kafka consumer
const startPaymentConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka Payment Consumer connected.');

    // Subscribe to topics
    await consumer.subscribe({ topic: 'ride_completed_for_payment', fromBeginning: false }); // fromBeginning: false for 'latest'

    // Run the consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Kafka Payment Consumer received message from topic ${topic}:`, message.value.toString());
        try {
          const event = JSON.parse(message.value.toString()); // Ensure message value is string
          console.log('Parsed Kafka event:', event);

          // Handle different event types
          switch (topic) {
            case 'ride_completed_for_payment':
              await handleRideCompletedForPayment(event);
              break;
            // Add more cases for other topics if needed
            default:
              console.warn(`Unknown topic: ${topic}`);
          }
        } catch (error) {
          console.error('Error processing Kafka message in Payment Consumer:', error);
        }
      },
    });
    console.log('Kafka Payment Consumer started listening for messages.');
  } catch (error) {
    console.error('Error starting Kafka Payment Consumer:', error);
    process.exit(1); // Exit if consumer cannot start
  }
};

// Function to stop the Kafka consumer (for graceful shutdown)
const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log('Kafka Payment Consumer disconnected.');
  } catch (error) {
    console.error('Error disconnecting Kafka Payment Consumer:', error);
  }
};

module.exports = {
  startPaymentConsumer,
  disconnectConsumer
};
