// This file handles the MongoDB database connection using Mongoose.
const mongoose = require('mongoose');
const config = require('./index'); // Import config from index.js

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB Connected successfully for User Service!');
  } catch (err) {
    console.error('MongoDB connection error (User Service):', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;