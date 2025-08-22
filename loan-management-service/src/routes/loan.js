// src/routes/loans.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/auth');
const upload = require('../middlewares/validation');
const {
  submitLoanApplication,
  getAllLoans,
  getLoanById,
  updateLoanStatus,
} = require('../controllers/loansController');

// @desc    Submit a new loan application (with document uploads)
// @route   POST /api/loans/apply
// @access  Private (Borrower)
router.post(
  '/apply',
  protect,
  authorizeRoles('borrower', 'admin'),
  upload.fields([
    { name: 'governmentAddressProofImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 },
    { name: 'bankStatements', maxCount: 100},
  ]),
  submitLoanApplication,
);

// @desc    Get all loan applications (Admin only)
// @route   GET /api/loans
// @access  Private (Admin)
router.get('/', protect, authorizeRoles('admin'), getAllLoans);

// @desc    Get a specific loan application by ID (Admin or Borrower if it's their loan)
// @route   GET /api/loans/:id
// @access  Private (Admin or Borrower)
router.get('/:id', protect, getLoanById);

// @desc    Update loan application status (Admin only)
// @route   PUT /api/loans/:id/status
// @access  Private (Admin)
router.put('/:id/status', protect, authorizeRoles('admin'), updateLoanStatus);

module.exports = router;
