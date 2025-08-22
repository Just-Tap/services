// This file defines the Mongoose schema for the Driver model.
const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    match: /^[0-9]{10}$/
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true // Email is required for drivers
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  profilePicture: {
    filename: { type: String },
    path: { type: String } // URL to the stored image
  },

  // --- Driver-specific fields ---
  vehicleDetails: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    licensePlate: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['car', 'moto', 'auto'],
      required: true
    }
  },
  aadhar: {
    number: { type: String, unique: true, sparse: true, required: true },
    frontImage: { filename: { type: String }, path: { type: String } }, // Removed 'required: true'
    backImage: { filename: { type: String }, path: { type: String } }  // Removed 'required: true'
  },
  pancard: {
    number: { type: String, unique: true, sparse: true, required: true },
    image: { filename: { type: String }, path: { type: String } } // Removed 'required: true'
  },
  drivingLicense: {
    number: { type: String, unique: true, sparse: true, required: true },
    frontImage: { filename: { type: String }, path: { type: String } }, // Removed 'required: true'
    backImage: { filename: { type: String }, path: { type: String } },  // Removed 'required: true'
    expiryDate: { type: Date, required: true }
  },
  vehicleRc: {
    number: { type: String, unique: true, sparse: true, required: true },
    frontImage: { filename: { type: String }, path: { type: String } }, // Removed 'required: true'
    backImage: { filename: { type: String }, path: { type: String } }  // Removed 'required: true'
  },

  // --- Admin Approval Status for Drivers ---
  isAadharValid: { type: Boolean, default: false },
  isPanValid: { type: Boolean, default: false },
  isDrivingLicenseValid: { type: Boolean, default: false },
  isRcValid: { type: Boolean, default: false },
  isValidCaptain: { // Overall approval status for a driver (all docs valid + active status)
    type: Boolean,
    default: false,
  },
  driverStatus: { // More granular status for drivers (for admin view)
    type: String,
    enum: ['pending_approval', 'active', 'blocked'],
    default: 'pending_approval',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
   role: {
    type: String,
    enum: ['driver', 'admin'],
    default: 'driver'
  },


}, { timestamps: true });

const Driver = mongoose.model('Driver', DriverSchema);

module.exports = Driver;