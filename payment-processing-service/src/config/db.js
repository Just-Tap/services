// services/payment-processing-service/src/config/db.js
// This file handles the MongoDB database connection using Mongoose for the Payment Processing Service.
const mongoose = require('mongoose');
const config = require('./index'); // Import config

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB Connected successfully for Payment Processing Service!');
  } catch (err) {
    console.error('MongoDB connection error (Payment Processing Service):', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;