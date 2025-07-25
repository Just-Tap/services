const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
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
    sparse: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Others'],
    required: true // Required for customers
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  profilePicture: {
    filename: { type: String },
    path: { type: String } // URL to the stored image
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

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer;