// models/Payment.js
const mongoose = require('mongoose');
const { loanDB } = require('../config/db');

const PaymentSchema = new mongoose.Schema({
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true,
  },
  driverId: {
    type: String, // The ID of the driver from the user-management-service
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  transactionId: {
    type: String,
    unique: true,
  },
  paymentMethod: {
    type: String,
    enum: ['app_deduction', 'manual_transfer', 'gateway_payment'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Use the loanDB connection instead of default mongoose connection
module.exports = loanDB.model('Payment', PaymentSchema);
