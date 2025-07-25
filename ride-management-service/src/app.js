// services/ride-management-service/src/app.js
// This is the main Express application setup file for the Ride Management Service.
const express = require('express');
const cors = require('cors');
const http = require('http'); // Required for Socket.IO
const { Server } = require('socket.io'); // Socket.IO server
const connectDB = require('./config/db');
const rideRoutes = require('./routes/rideRoutes');
const setupWebSocketRoutes = require('./routes/webSocketRoutes'); // Import WebSocket setup
const rideConsumer = require('./events/rideConsumer'); // Import to start Kafka consumer

// Initialize Express app
const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development (restrict in production)
    methods: ["GET", "POST"]
  }
});

// Connect to database
connectDB();

// Middleware
app.use(express.json()); // Enable JSON body parsing
app.use(express.urlencoded({ extended: true })); // For URL-encoded data
app.use(cors()); // Enable CORS for all origins (for development, restrict in production)

// Setup API routes
app.use('/api/v1/rides', rideRoutes);

// Setup WebSocket routes and pass the Socket.IO instance
setupWebSocketRoutes(io);

// Start Kafka Consumer (it will start listening for messages)
rideConsumer; // Just referencing it starts its event listeners

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Ride Management Service API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = { app, server };