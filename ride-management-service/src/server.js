// This is the entry point for starting the Ride Management Service.
const { app, server } = require('./app'); // Import both app and server from app.js
const config = require('./config'); // Import config

const PORT = config.port;

// Start the server (using the HTTP server for Socket.IO)
server.listen(PORT, () => {
  console.log(`Ride Management Service running on port ${PORT}`);
});
