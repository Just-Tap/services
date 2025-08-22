// services/payment-processing-service/src/config/index.js
// This file centralizes the configuration for the Payment Processing Service.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3003,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET, // JWT secret for internal service communication/auth
  kafkaBroker: process.env.KAFKA_BROKER,

  // Razorpay API Credentials
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET // The secret you generated for the webhook
};