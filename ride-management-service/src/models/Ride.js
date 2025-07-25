// This file defines the Mongoose schema for the Ride model.
const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Customer' // Reference to the Customer model in User Management Service
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver', // Reference to the Driver model in User Management Service
    default: null // Will be assigned when a driver accepts
  },
  pickupLocation: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  dropoffLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  requestedVehicleType: {
    type: String,
    enum: ['car', 'moto', 'auto'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'searching', 'accepted', 'driver_arrived', 'started', 'completed', 'cancelled_by_customer', 'cancelled_by_driver', 'no_drivers_found'],
    default: 'pending'
  },
  fare: {
    type: Number,
    default: 0 // Calculated upon completion
  },
  distanceKm: {
    type: Number,
    default: 0 // Calculated upon completion
  },
  estimatedFare: {
    type: Number,
    default: 0 // Estimated at the time of request
  },
  estimatedTimeMinutes: {
    type: Number,
    default: 0 // Estimated at the time of request
  },
  rideStartTime: {
    type: Date
  },
  rideEndTime: {
    type: Date
  },
  driverArrivalTime: { // Time driver arrived at pickup
    type: Date
  },
  cancellationReason: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a 2dsphere index for geospatial queries (e.g., finding nearby drivers)
RideSchema.index({ "pickupLocation.coordinates": "2dsphere" });
RideSchema.index({ "dropoffLocation.coordinates": "2dsphere" });

const Ride = mongoose.model('Ride', RideSchema);

module.exports = Ride;