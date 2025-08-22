// src/server.js
const dotenv = require('dotenv');
const { userDB, loanDB } = require('./config/db');
const app = require('./app');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Database connections are already established in config/db.js
// Just start the server
app.listen(PORT, () => {
  console.log(`Loan Management Service running on port ${PORT} `);
});
