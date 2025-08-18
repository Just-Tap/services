const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Customer' // Reference to Customer in User Management Service
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride', // Reference to Ride in Ride Management Service
    default: null // Not all payments might be for a ride (e.g., wallet top-up)
  },
  amount: {
    type: Number, // Stored in smallest currency unit (e.g., paise for INR)
    required: true
  },
  currency: {
    type: String,
    enum: ['INR'], // Assuming INR for now
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded', 'initiated'],
    default: 'initiated' // Initial state when created in our system
  },
  paymentMethodType: { // e.g., 'card', 'upi', 'wallet', 'netbanking'
    type: String,
    required: true
  },
  razorpayOrderId: {
    type: String,
    unique: true, // Each Razorpay order ID should be unique
    sparse: true // Allows null values but enforces uniqueness for non-null
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  failureReason: {
    type: String
  },
  refundId: { // To link to a refund record if a refund is processed
    type: String, // Razorpay refund ID
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true }); // Mongoose adds createdAt and updatedAt automatically

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;