// This file defines authentication-related API routes.
const express = require('express');
const { registerDriver, registerCustomer, sendOtpForLogin, verifyOtpAndLogin } = require('../controllers/authControllers');
const { upload } = require('../utils/imageUploader'); // Multer middleware
const {
  validateCustomerRegistration,
  validateDriverRegistration,
  validateOtpLoginRequest,
  validateOtpVerification
} = require('../middlewares/validationMiddleware');

const router = express.Router();

// Public routes for registration and OTP-based login
router.post(
  '/drivers/register',
  upload.fields([ // Multer middleware to handle multiple file uploads
    { name: 'profilePicture', maxCount: 1 },
    { name: 'aadharFrontImage', maxCount: 1 },
    { name: 'aadharBackImage', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'drivingLicenseFrontImage', maxCount: 1 },
    { name: 'drivingLicenseBackImage', maxCount: 1 },
    { name: 'vehicleRcFrontImage', maxCount: 1 },
    { name: 'vehicleRcBackImage', maxCount: 1 }
  ]),
  validateDriverRegistration, // Input validation
  registerDriver
);

router.post('/customers/register', validateCustomerRegistration, registerCustomer);
router.post('/send-otp', validateOtpLoginRequest, sendOtpForLogin); // Request OTP for login
router.post('/verify-otp', validateOtpVerification, verifyOtpAndLogin); // Verify OTP and login

module.exports = router;