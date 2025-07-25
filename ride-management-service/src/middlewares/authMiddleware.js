// This file contains middleware for authenticating and authorizing users using JWT.
const jwt = require('jsonwebtoken');
const config = require('../config'); // Import config

// Middleware to protect routes (authenticate user)
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Attach user info from token to request
      req.user = {
        _id: decoded.id,
        role: decoded.role,
        mobileNumber: decoded.mobileNumber, // Assuming these are in the token
        name: decoded.name
      };

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to authorize user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user ? req.user.role : 'none'} is not authorized to access this route` });
    }
    next(); // User is authorized, proceed
  };
};

module.exports = { protect, authorize };