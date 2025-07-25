// This file contains middleware for input validation using express-validator.
const { body, validationResult } = require('express-validator');

// Validation for mobile number
const validateMobileNumber = [
  body('mobileNumber')
    .notEmpty().withMessage('Mobile number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits')
    .isNumeric().withMessage('Mobile number must contain only digits'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation rules for customer registration
const validateCustomerRegistration = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  ...validateMobileNumber, // Reuse mobile number validation
  body('email').isEmail().withMessage('Invalid email format').optional({ nullable: true, checkFalsy: true }),
  body('gender').isIn(['Male', 'Female', 'Others']).withMessage('Invalid gender').optional({ nullable: true, checkFalsy: true }),
  body('dateOfBirth').isISO8601().toDate().withMessage('Invalid date of birth format (YYYY-MM-DD)'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation rules for driver registration (simplified for core fields)
const validateDriverRegistration = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  ...validateMobileNumber, // Reuse mobile number validation
  body('email').isEmail().withMessage('Invalid email format').optional({ nullable: true, checkFalsy: true }),
  body('dateOfBirth').isISO8601().toDate().withMessage('Invalid date of birth format (YYYY-MM-DD)'),
  body('vehicleDetails.make').notEmpty().withMessage('Vehicle make is required'),
  body('vehicleDetails.model').notEmpty().withMessage('Vehicle model is required'),
  body('vehicleDetails.year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Invalid vehicle year'),
  body('vehicleDetails.licensePlate').notEmpty().withMessage('License plate is required'),
  body('vehicleDetails.type').isIn(['car', 'moto', 'auto']).withMessage('Invalid vehicle type'),
  body('aadhar.number').notEmpty().withMessage('Aadhar number is required'),
  body('pancard.number').notEmpty().withMessage('Pancard number is required'),
  body('drivingLicense.number').notEmpty().withMessage('Driving license number is required'),
  body('drivingLicense.expiryDate').isISO8601().toDate().withMessage('Invalid driving license expiry date format (YYYY-MM-DD)'),
  body('vehicleRc.number').notEmpty().withMessage('Vehicle RC number is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation rules for OTP login request
const validateOtpLoginRequest = [
  ...validateMobileNumber,
  body('userType').isIn(['customer', 'driver', 'admin']).withMessage('Invalid user type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation rules for OTP verification and login
const validateOtpVerification = [
  ...validateMobileNumber,
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric().withMessage('OTP must be numeric'),
  body('userType').isIn(['customer', 'driver', 'admin']).withMessage('Invalid user type'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation rules for updating driver status (admin only)
const validateDriverStatusUpdate = [
  body('status').isIn(['active', 'blocked', 'pending_approval']).withMessage('Invalid driver status'),
  body('isAadharValid').isBoolean().withMessage('isAadharValid must be boolean').optional(),
  body('isPanValid').isBoolean().withMessage('isPanValid must be boolean').optional(),
  body('isDrivingLicenseValid').isBoolean().withMessage('isDrivingLicenseValid must be boolean').optional(),
  body('isRcValid').isBoolean().withMessage('isRcValid must be boolean').optional(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];


module.exports = {
  validateCustomerRegistration,
  validateDriverRegistration,
  validateOtpLoginRequest,
  validateOtpVerification,
  validateDriverStatusUpdate
};