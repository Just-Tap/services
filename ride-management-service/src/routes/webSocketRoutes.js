// services/ride-management-service/src/routes/websocketRoutes.js
// This file is primarily for setting up the WebSocket server,
// but actual event handling logic resides in websocketController.js.
const { initSocketIO } = require('../controllers/webSocketController');

// This function will be called from app.js to pass the io instance
const setupWebSocketRoutes = (io) => {
  initSocketIO(io);
};

module.exports = setupWebSocketRoutes;