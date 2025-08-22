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

// Validation for initiating a payment (creating a Razorpay Order)
const validateInitiatePayment = [
  body('rideId').isMongoId().withMessage('Invalid Ride ID is required.').optional(), // Optional for now, but will be required for ride payments
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
  body('currency').isIn(['INR']).withMessage('Currency must be INR.'), // Assuming INR for now
  body('paymentMethodType').isIn(['card', 'upi', 'wallet', 'netbanking', 'cash']).withMessage('Invalid payment method type.'),
  body('customerId').isMongoId().withMessage('Invalid Customer ID is required.'),
  body('description').notEmpty().withMessage('Payment description is required.').trim(),
  handleValidationErrors
];

// Validation for verifying a payment (after customer completes payment)
const validateVerifyPayment = [
  body('razorpay_order_id').notEmpty().withMessage('Razorpay Order ID is required.'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay Payment ID is required.'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay Signature is required.'),
  body('paymentId').isMongoId().withMessage('Internal Payment ID is required.'), // Our internal payment record ID
  handleValidationErrors
];

// Validation for driver payout request (future)
const validatePayoutRequest = [
  body('driverId').isMongoId().withMessage('Invalid Driver ID is required.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Payout amount must be a positive number.'),
  body('currency').isIn(['INR']).withMessage('Currency must be INR.'),
  body('description').notEmpty().withMessage('Payout description is required.').trim(),
  body('fundAccountId').notEmpty().withMessage('Fund Account ID is required for payout.'), // Razorpay Fund Account ID
  handleValidationErrors
];


module.exports = {
  validateInitiatePayment,
  validateVerifyPayment,
  validatePayoutRequest,
  handleValidationErrors // Export if needed elsewhere
};