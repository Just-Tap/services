// This file provides utilities for generating and verifying JSON Web Tokens (JWT).
const jwt = require('jsonwebtoken');
const config = require('../config'); // Import config

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '1h'; // Token expiration time

// Function to generate a JWT token (for internal use, if needed, or just verification)
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN, // Token expires in 1 hour
  });
};

// Function to verify a JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    // Handle specific errors like TokenExpiredError, JsonWebTokenError
    console.error('JWT verification failed:', error.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };