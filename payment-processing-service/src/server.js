// services/payment-processing-service/src/server.js
// This file starts the Payment Processing Service.
const app = require('./app'); // Import the Express app
const config = require('./config'); // Import configuration
const mongoose = require('mongoose'); // Mongoose for checking connection state

// Import the new kafkajs producer and consumer functions
const { connectProducer, disconnectProducer, producer } = require('./events/paymentProducer');
const { startPaymentConsumer, disconnectConsumer } = require('./events/paymentConsumer');

// Start the Express server
let server;

const startServer = async () => {
  try {
    // Connect Kafka Producer
    await connectProducer();
    // Start Kafka Consumer
    await startPaymentConsumer();

    server = app.listen(config.port, () => {
      console.log(`Payment Processing Service running on port ${config.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.error(`Error: ${err.message}`);
      // Close server & exit process
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: Closing HTTP server');
      if (server) {
        server.close(async () => {
          console.log('HTTP server closed.');
          await mongoose.connection.close(false); // Close MongoDB connection
          console.log('MongoDB connection closed.');
          await disconnectProducer(); // Disconnect Kafka Producer
          await disconnectConsumer(); // Disconnect Kafka Consumer
          console.log('All services disconnected. Exiting.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });

  } catch (error) {
    console.error('Failed to start Payment Processing Service:', error);
    process.exit(1);
  }
};

// Call the function to start the server
startServer();
