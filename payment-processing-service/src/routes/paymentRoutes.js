// services/payment-processing-service/src/routes/paymentRoutes.js
// This file defines the API routes for payment operations.
const express = require('express');
const { initiatePayment, verifyPayment, handleWebhook } = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateInitiatePayment, validateVerifyPayment } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Route to initiate a payment (create a Razorpay Order)
// Accessible by customers
router.post('/initiate', protect, authorize('customer'), validateInitiatePayment, initiatePayment);

// Route to verify a payment after successful completion on Razorpay Checkout
// Accessible by customers
router.post('/verify', protect, authorize('customer'), validateVerifyPayment, verifyPayment);

// Route to handle Razorpay Webhook notifications
// This route needs to be raw body parsed, handled in app.js
router.post('/webhook', handleWebhook);

// Future routes for payouts, refunds (initiated by admin/system)
// router.post('/payout', protect, authorize('admin', 'system'), validatePayoutRequest, createPayout);
// router.post('/refund/:paymentId', protect, authorize('admin', 'system'), validateRefundRequest, initiateRefund);

module.exports = router;