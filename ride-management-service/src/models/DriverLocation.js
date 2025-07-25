// This file defines the Mongoose schema for storing real-time driver locations.
const mongoose = require('mongoose');

const DriverLocationSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true, // Each driver has only one real-time location entry
    ref: 'Driver' // Reference to the Driver model in User Management Service
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Additional fields for driver status/availability
  isAvailable: {
    type: Boolean,
    default: true // Driver is available for new rides
  },
  vehicleType: {
    type: String,
    enum: ['car', 'moto', 'auto'],
    required: true
  }
}, { timestamps: true });

// Create a 2dsphere index for geospatial queries (finding nearby drivers)
DriverLocationSchema.index({ location: '2dsphere' });

const DriverLocation = mongoose.model('DriverLocation', DriverLocationSchema);

module.exports = DriverLocation;