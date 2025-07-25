// This file defines API routes for ride operations.
const express = require('express');
const {
  requestRide,
  acceptRide,
  rejectRide,
  startRide,
  endRide,
  cancelRide,
  getRideById,
  getActiveRide,
  getRideHistory,
  updateDriverLocation,
  driverArrived
} = require('../controllers/rideController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  validateRideRequest,
  validateRideAction,
  validateDriverLocationUpdate,
  validateCancelRide
} = require('../middlewares/validationMiddleware');

const router = express.Router();

// Customer-facing routes
router.post('/request', protect, authorize('customer'), validateRideRequest, requestRide);
router.post('/:rideId/cancel', protect, authorize('customer', 'driver'), validateCancelRide, cancelRide); // Both can cancel
router.get('/active', protect, authorize('customer', 'driver'), getActiveRide);
router.get('/history', protect, authorize('customer', 'driver'), getRideHistory);
router.get('/:rideId', protect, authorize('customer', 'driver', 'admin'), getRideById); // Get specific ride details

// Driver-facing routes
router.post('/:rideId/accept', protect, authorize('driver'), validateRideAction, acceptRide);
router.post('/:rideId/reject', protect, authorize('driver'), validateRideAction, rejectRide);
router.post('/:rideId/start', protect, authorize('driver'), validateRideAction, startRide);
router.post('/:rideId/end', protect, authorize('driver'), validateRideAction, endRide);
router.post('/:rideId/arrived', protect, authorize('driver'), validateRideAction, driverArrived);
router.put('/drivers/location', protect, authorize('driver'), validateDriverLocationUpdate, updateDriverLocation); // Driver updates real-time location

module.exports = router;