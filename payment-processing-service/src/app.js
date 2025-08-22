// services/payment-processing-service/src/app.js
// This is the main Express application setup for the Payment Processing Service.
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Database connection
const config = require('./config'); // Application configuration
const paymentRoutes = require('./routes/paymentRoutes'); // Payment API routes
const mongoose = require('mongoose'); // For health check

const app = express();

// Connect to MongoDB
connectDB();

// Middleware to parse raw body for Razorpay webhooks
// This must come BEFORE express.json() for the webhook route
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payments/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next); // For all other routes, parse JSON body
  }
});

// Enable CORS for all routes
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  // Note: Checking Kafka connection status directly from producer/consumer objects
  // might be more complex with kafkajs' internal state.
  // For a simple health check, we'll assume if the service started, Kafka is connected.
  // A more robust health check might involve trying to send/receive a dummy message.
  res.status(200).json({
    status: 'UP',
    message: 'Payment Processing Service is healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    // Kafka status is managed by connectProducer/startPaymentConsumer in server.js,
    // if they didn't throw an error, we assume connection.
    kafka: 'connected' // Simplified for now
  });
});

// Mount payment routes
app.use('/api/v1/payments', paymentRoutes);

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke in Payment Processing Service!');
});

module.exports = app;
