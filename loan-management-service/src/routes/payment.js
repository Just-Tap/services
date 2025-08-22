// src/routes/payments.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  recordPayment,
  getPaymentsByLoanId,
} = require('../controllers/paymentsController');

// @desc    Record a new payment for a loan
// @route   POST /api/loans/:loanId/payments
// @access  Private (Borrower or Admin)
router.post('/:loanId/payments', protect, recordPayment);

// @desc    Get all payments for a specific loan
// @route   GET /api/loans/:loanId/payments
// @access  Private (Admin or Borrower if it's their loan)
router.get('/:loanId/paymentsHistory', protect, getPaymentsByLoanId);

module.exports = router;
