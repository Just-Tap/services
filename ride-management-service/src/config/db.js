// This file handles the MongoDB database connection using Mongoose for the Ride Service.
const mongoose = require('mongoose');
const config = require('./index'); // Import config

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB Connected successfully for Ride Service!');
  } catch (err) {
    console.error('MongoDB connection error (Ride Service):', err.message);
    // Exit process with failure
    process.exit(1);
  }
};
module.exports = connectDB;