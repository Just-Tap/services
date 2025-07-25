// services/ride-management-service/src/controllers/websocketController.js
// This file will contain logic for real-time WebSocket communication.
// It will be initialized by app.js and use the io instance.

let ioInstance = null; // Store the Socket.IO server instance

// Function to initialize the Socket.IO instance
const initSocketIO = (io) => {
  ioInstance = io;
  console.log('Socket.IO initialized for Ride Management Service');

  io.on('connection', (socket) => {
    console.log(`A user connected via WebSocket: ${socket.id}`);

    // Example: Driver sends their location periodically
    socket.on('driverLocationUpdate', (data) => {
      // In a real app, you'd validate driver ID and data
      // and then update it in DriverLocation model
      console.log(`Driver ${data.driverId} updated location: ${data.latitude}, ${data.longitude}`);
      // This would typically trigger an update to the DB and then emit to relevant customers
      // For now, this is just a placeholder. The HTTP endpoint updateDriverLocation is more robust.
      // This could emit to customers tracking a ride
      if (ioInstance) {
        // Example: Emit to a specific customer's room
        // ioInstance.to(data.customerId).emit('driverLocation', { driverId: data.driverId, location: data.location });
      }
    });

    // Example: Customer connects and wants to listen for ride updates
    socket.on('joinRideRoom', (rideId) => {
      socket.join(rideId);
      console.log(`Socket ${socket.id} joined ride room: ${rideId}`);
    });

    // Example: Driver connects and wants to listen for ride requests
    socket.on('joinDriverRoom', (driverId) => {
      socket.join(driverId);
      console.log(`Socket ${socket.id} joined driver room: ${driverId}`);
    });


    socket.on('disconnect', () => {
      console.log(`User disconnected via WebSocket: ${socket.id}`);
    });
  });
};

/**
 * Emits a real-time event to a specific customer or driver.
 * This function would be called from rideController.js after a status update.
 * @param {string} room - The room to emit to (e.g., customerId or driverId, or rideId)
 * @param {string} eventName - Name of the event (e.g., 'ride_status_update', 'driver_location')
 * @param {object} data - The payload to send
 */
const emitToRoom = (room, eventName, data) => {
  if (ioInstance) {
    ioInstance.to(room).emit(eventName, data);
    console.log(`Emitted event '${eventName}' to room '${room}' with data:`, data);
  } else {
    console.warn('Socket.IO not initialized. Cannot emit event.');
  }
};

module.exports = {
  initSocketIO,
  emitToRoom
};