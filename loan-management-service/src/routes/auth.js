// // routes/auth.js
// const express = require('express');
// const router = express.Router();

// const { verifyOTP, sendOTP, verifyDriverId } = require('../controllers/authController');

// // Import the connections
// const { userDB, loanDB } = require('../config/db');

// // Import your schemas
// const DriverSchema = require('../../../user-management-service/src/models/Driver');

// // Get the specific model from the correct connection - check if already exists
// let Driver;
// try {
//   Driver = userDB.model('Driver');
// } catch (error) {
//   Driver = userDB.model('Driver', DriverSchema.schema);
// }

// const generateToken = require('../utils/generateToken');

// // @desc    Register a new user (borrower/driver)
// // @route   POST /api/auth/register
// // @access  Public
// /*
// router.post('/register', async (req, res) => {
//   const { name, email, mobileNumber, password, role, isDriver, driverDetails } = req.body;

//   try {
//     // Check if user already exists by email or mobile number
//     let userExists = await Driver.findOne({ $or: [{ email }, { mobileNumber }] });
//     if (userExists) {
//       return res.status(400).json({ message: 'User with this email or mobile number already exists' });
//     }

//     // Create new user
//     const user = new Driver({
//       name,
//       email,
//       mobileNumber,
//       password, // Password will be hashed by the pre-save hook in the Driver model
//       role: role || 'borrower', // Default to 'borrower' if not specified
//       isDriver: isDriver || false,
//       driverDetails: isDriver ? driverDetails : undefined, // Only save driverDetails if isDriver is true
//     });

//     await user.save(); // Save user to database (password gets hashed here)

//     res.status(201).json({
//       message: 'User registered successfully',
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         mobileNumber: user.mobileNumber,
//         role: user.role,
//         isDriver: user.isDriver,
//       },
//       token: generateToken(user._id), // Generate JWT token
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error during registration' });
//   }
// });
// */

// // @desc    Authenticate user & get token
// // @route   POST /api/auth/login
// // @access  Public
// /*
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Check if user exists
//     const user = await Driver.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     // Check password
//     const isMatch = await user.matchPassword(password); // Use the custom method
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     res.json({
//       message: 'Logged in successfully',
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         mobileNumber: user.mobileNumber,
//         role: user.role,
//         isDriver: user.isDriver,
//       },
//       token: generateToken(user._id),
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error during login' });
//   }
// });
// */

// // NEW: Driver Registration with Mobile Number and ID Verification
// // @desc    Register/Verify driver with mobile number and ID
// // @route   POST /api/auth/driver/register
// // @access  Public
// router.post('/driver/register', async (req, res) => {
//   const { mobileNumber, driverId, otp } = req.body;

//   try {
//     // Step 1: Verify OTP (mock verification for now)
//     if (!otp || otp.length !== 6) {
//       return res.status(400).json({ message: 'Invalid OTP format' });
//     }

//     // Step 2: Check if driver exists in userDB with the provided driverId
//     const driver = await Driver.findOne({ driverId });
    
//     if (!driver) {
//       return res.status(404).json({ 
//         message: 'Driver not found with this ID. Please contact support.' 
//       });
//     }

//     // Step 3: Update mobile number if not already set
//     if (!driver.mobileNumber) {
//       driver.mobileNumber = mobileNumber;
//       await driver.save();
//     } else if (driver.mobileNumber !== mobileNumber) {
//       return res.status(400).json({ 
//         message: 'This driver ID is already registered with a different mobile number' 
//       });
//     }

//     // Step 4: Generate token for authenticated driver
//     const token = generateToken(driver._id);

//     res.status(200).json({
//       success: true,
//       message: 'Driver registered successfully',
//       token,
//       driver: {
//         _id: driver._id,
//         name: driver.name,
//         email: driver.email,
//         mobileNumber: driver.mobileNumber,
//         driverId: driver.driverId,
//         isVerified: driver.isVerified || false
//       }
//     });

//   } catch (error) {
//     console.error('Driver registration error:', error);
//     res.status(500).json({ 
//       message: 'Server error during driver registration' 
//     });
//   }
// });

// // NEW: Send OTP for mobile number verification
// // @desc    Send OTP to mobile number
// // @route   POST /api/auth/driver/send-otp
// // @access  Public
// // router.post('/driver/send-otp', async (req, res) => {
// //   const { mobileNumber } = req.body;

// //   try {
// //     // Mock OTP generation - in production, use SMS service
// //     const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
// //     // In production, send OTP via SMS
// //     // For now, return OTP in response for testing
// //     res.status(200).json({
// //       success: true,
// //       message: 'OTP sent successfully',
// //       otp, // Remove this in production
// //       mobileNumber
// //     });

// //   } catch (error) {
// //     console.error('Send OTP error:', error);
// //     res.status(500).json({ 
// //       message: 'Failed to send OTP' 
// //     });
// //   }
// // });


// router.post('/driver/send-otp', sendOTP);


// // NEW: Verify OTP for mobile number
// // @desc    Verify OTP sent to mobile number
// // @route   POST /api/auth/driver/verify-otp
// // @access  Public
// router.post('/driver/verify-otp', async (req, res) => {
//   const { mobileNumber, otp } = req.body;

//   try {
//     // Import the controller function
//     const { verifyOTP } = require('../controllers/authController');
    
//     // Call the controller function
//     await verifyOTP(req, res);
    
//   } catch (error) {
//     console.error('Verify OTP route error:', error);
//     res.status(500).json({ 
//       message: 'Server error during OTP verification' 
//     });
//   }
// });

// // NEW: Verify driver ID without mobile number
// // @desc    Check if driver ID exists in database
// // @route   POST /api/auth/driver/verify-id
// // @access  Public
// router.post('/driver/verify-id', verifyDriverId);



// module.exports = router;


// routes/auth.js
const express = require('express');
const router = express.Router();

const { verifyOTP, sendOTP, verifyDriverId, uploadSelfie, approveDriver,createPin,loginWithPin } = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middlewares/auth');
const upload = require('../utils/imageUploader'); // 👈 import uploader

// 1) Send OTP
router.post('/driver/send-otp', sendOTP);

// 2) Verify OTP
router.post('/driver/verify-otp', verifyOTP);

// 3) Verify driver ObjectId
router.post('/driver/verify-id', verifyDriverId);

// 4) Upload live selfie
router.post('/driver/upload-selfie', upload.single('selfie'), uploadSelfie);

// 5) Admin approval
// router.patch('/auth/admin/approve-driver/:id', protect, authorizeRoles('admin'), approveDriver);
// router.patch('/admin/approve-driver/:id', approveDriver);


// Step after admin approval → create PIN
router.post('/driver/create-pin', createPin);

// Login with PIN
router.post('/driver/login-with-pin', loginWithPin);

module.exports = router;

