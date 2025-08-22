// models/Loan.js
const mongoose = require('mongoose');
const { loanDB } = require('../config/db');

const LoanSchema = new mongoose.Schema({
  driverId: {
    type: String, // The ID of the driver from the user-management-service
    required: true,
  },
  driverSnapshot: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    ridesCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    // A snapshot of all necessary driver details at the time of application
    driverDetails: {
      vehicle: {
        make: { type: String },
        model: { type: String },
        year: { type: Number },
        licensePlate: { type: String },
        type: { type: String },
      },
      documents: {
        aadharNumber: { type: String },
        panNumber: { type: String },
        drivingLicenseNumber: { type: String },
        vehicleRCNumber: { type: String },
        // NOTE: File paths will be stored here, not the files themselves
        aadharFrontImage: { path: { type: String } },
        aadharBackImage: { path: { type: String } },
        panImage: { path: { type: String } },
        drivingLicenseFrontImage: { path: { type: String } },
        drivingLicenseBackImage: { path: { type: String } },
        vehicleRCFrontImage: { path: { type: String } },
        vehicleRCBackImage: { path: { type: String } },
      },
    },
    profilePicture: { path: { type: String } },
    bankAccountDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      beneficiaryName: { type: String },
    },
  },
  requestedAmount: {
    type: Number,
    required: true,
    min: 1000,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
  },
  tenureMonths: {
    type: Number,
    required: true,
    min: 1,
    max: 60,
  },
  // Loan-specific KYC documents (additional to driver registration)
  kycDocuments: {
    governmentAddressProofImage: { filename: { type: String }, path: { type: String } },
    selfieImage: { filename: { type: String }, path: { type: String } },
    bankStatements: [{ filename: { type: String }, path: { type: String } }],
  },
  // CIBIL Score and related details
  cibilScore: {
    type: Number,
    default: null,
  },
  cibilStatus: {
    type: String,
    enum: ['pending', 'fetched', 'not_found', 'error'],
    default: 'pending',
  },
  cibilReportId: {
    type: String,
  },
  creditCheckDate: {
    type: Date,
  },
  eligibilityStatus: {
    type: String,
    enum: ['pending', 'eligible', 'not_eligible'],
    default: 'pending',
  },
  eligibilityReason: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'ongoing', 'completed', 'defaulted'],
    default: 'pending',
  },
  approvedBy: {
    type: String, // The ID of the admin from the user-management-service
    required: function() { return this.status === 'approved'; }
  },
  approvedDate: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  disbursementDate: {
    type: Date,
  },
  disbursedAmount: {
    type: Number,
  },
  totalRepayableAmount: {
    type: Number,
  },
  dailyRepaymentAmount: {
    type: Number,
  },
  repaymentStartDate: {
    type: Date,
  },
  repaymentEndDate: {
    type: Date,
  },
  outstandingAmount: {
    type: Number,
    default: 0,
  },
  lastPaymentDate: {
    type: Date,
  },
  nextPaymentDueDate: {
    type: Date,
  },
  paymentsMissed: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

LoanSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Use the loanDB connection instead of default mongoose connection
module.exports = loanDB.model('Loan', LoanSchema);
