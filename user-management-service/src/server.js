// services/user-management-service/src/server.js
// This is the entry point for starting the User Management Service.
const app = require('./app');
const config = require('./config'); // Import config

const PORT = config.port;

// Start the server
app.listen(PORT, () => {
  console.log(`User Management Service running on port ${PORT}`);
});
