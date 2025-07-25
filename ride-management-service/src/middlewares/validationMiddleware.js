// This file contains middleware for input validation using express-validator.
const { body, param, validationResult } = require('express-validator');

// Helper to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation for requesting a ride
const validateRideRequest = [
  body('pickupLocation.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Pickup coordinates must be an array of [longitude, latitude]')
    .custom(value => value.every(coord => typeof coord === 'number')).withMessage('Coordinates must be numbers'),
  body('pickupLocation.address').notEmpty().withMessage('Pickup address is required').trim(),
  body('dropoffLocation.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Dropoff coordinates must be an array of [longitude, latitude]')
    .custom(value => value.every(coord => typeof coord === 'number')).withMessage('Coordinates must be numbers'),
  body('dropoffLocation.address').notEmpty().withMessage('Dropoff address is required').trim(),
  body('requestedVehicleType').isIn(['car', 'moto', 'auto']).withMessage('Invalid vehicle type. Must be car, moto, or auto.'),
  handleValidationErrors
];

// Validation for accepting/rejecting a ride
const validateRideAction = [
  param('rideId').isMongoId().withMessage('Invalid Ride ID'),
  handleValidationErrors
];

// Validation for updating driver location (via WebSocket or API)
const validateDriverLocationUpdate = [
  body('driverId').isMongoId().withMessage('Invalid Driver ID'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Location coordinates must be an array of [longitude, latitude]')
    .custom(value => value.every(coord => typeof coord === 'number')).withMessage('Coordinates must be numbers'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean').optional(),
  body('vehicleType').isIn(['car', 'moto', 'auto']).withMessage('Invalid vehicle type. Must be car, moto, or auto.').optional(),
  handleValidationErrors
];

// Validation for canceling a ride
const validateCancelRide = [
  param('rideId').isMongoId().withMessage('Invalid Ride ID'),
  body('cancellationReason').notEmpty().withMessage('Cancellation reason is required').trim(),
  handleValidationErrors
];


module.exports = {
  validateRideRequest,
  validateRideAction,
  validateDriverLocationUpdate,
  validateCancelRide
};