// services/user-management-service/src/app.js
// This is the main Express application setup file.
const express = require('express');
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
const connectDB = require('./config/db'); // Database connection
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userConsumer = require('./events/userConsumer'); // Import to start Kafka consumer

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json()); // Enable JSON body parsing
app.use(express.urlencoded({ extended: true })); // For URL-encoded data
app.use(cors()); // Enable CORS for all origins (for development, restrict in production)

// Route Handlers
// All routes will be prefixed with /api/v1/
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
// Reusing authRoutes for driver-specific registration (e.g., /api/v1/drivers/register)
// The path for authRoutes is set to /api/v1/auth, so driver registration is under /api/v1/auth/drivers/register
// If you want /api/v1/drivers/register directly, you'd add: app.use('/api/v1/drivers', authRoutes);
// For now, it's fine as it is.

// Start Kafka Consumer (it will start listening for messages)
userConsumer; // Just referencing it starts its event listeners

// Basic route for testing
app.get('/', (req, res) => {
  res.send('User Management Service API is running...');
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;