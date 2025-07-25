// services/user-management-service/src/middlewares/authMiddleware.js
// This file contains middleware for authenticating and authorizing users using JWT.
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer'); // Import Customer model
const Driver = require('../models/Driver');     // Import Driver model
const config = require('../config');

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

      // Find user by ID from decoded token based on role
      let user;
      if (decoded.role === 'customer') {
        user = await Customer.findById(decoded.id);
      } else if (decoded.role === 'driver' || decoded.role === 'admin') { // Admin users might also be stored in Driver model for simplicity
        user = await Driver.findById(decoded.id);
      } else {
        return res.status(401).json({ message: 'Not authorized, invalid user role in token' });
      }

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = { // Attach simplified user object to request
        _id: user._id,
        role: decoded.role, // Use role from token as it's definitive
        mobileNumber: user.mobileNumber,
        name: user.name
      };

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error('Token verification error:', error.message);
      // Handle expired token or invalid token
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
    // Check if the user's role is included in the allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user ? req.user.role : 'none'} is not authorized to access this route` });
    }
    next(); // User is authorized, proceed
  };
};

module.exports = { protect, authorize };