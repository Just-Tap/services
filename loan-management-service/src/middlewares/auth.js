// middleware/auth.js
const jwt = require('jsonwebtoken');
const getDriverModel = require('../models/driverModel');

// Get the Driver model
const Driver = getDriverModel();

// Middleware to protect routes with JWT
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]; // Format: "Bearer TOKEN"

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT user:', decoded);

      // Fetch the user from the correct database using the ID from the token
      const user = await Driver.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'User not found or not authorized' });
      }

      // Attach user information to the request object
      req.user = {
        _id: user._id,
        role: user.role,
        isDriver: user.isDriver
      };

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to restrict access based on user role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user?.role || 'unauthenticated'} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
