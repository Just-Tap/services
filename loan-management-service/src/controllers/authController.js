
// controllers/authController.js
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const getDriverModel = require('../models/driverModel');
const Driver = getDriverModel();

// Mock OTP storage - in production, use Redis or similar
const otpStore = new Map();

/**
 * Send OTP to mobile number
 * @route POST /api/auth/driver/send-otp
 */
exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 5-minute expiry
    otpStore.set(mobileNumber, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // In production, send OTP via SMS
    console.log(`OTP for ${mobileNumber}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      mobileNumber,
      // ⚠️ only return OTP in dev for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

/**
 * Verify OTP
 * @route POST /api/auth/driver/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide mobile number and OTP' });
    }

    const storedOTP = otpStore.get(mobileNumber);

    if (!storedOTP) {
      return res.status(400).json({ success: false, message: 'OTP not found for this mobile number' });
    }

    const now = Date.now();
    if (storedOTP.expiresAt < now) {
      otpStore.delete(mobileNumber);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    otpStore.delete(mobileNumber);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      mobileNumber
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

/**
 * Verify driver ID exists (ObjectId)
 * @route POST /api/auth/driver/verify-id
 */
exports.verifyDriverId = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ success: false, message: 'Please provide driver ObjectId' });
    }

    const driver = await Driver.findById(_id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Driver verified successfully',
      driver: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        mobileNumber: driver.mobileNumber || null,
        isVerified: driver.isVerified || false,
        selfieUrl: driver.selfieUrl || null
      }
    });
  } catch (error) {
    console.error('Verify driver ID error:', error);
    res.status(500).json({ success: false, message: 'Server error during driver verification' });
  }
};

/**
 * Upload live selfie
 * @route POST /api/auth/driver/upload-selfie
 */
exports.uploadSelfie = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ success: false, message: 'Driver _id is required' });
    }

    const driver = await Driver.findById(_id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Selfie file is required' });
    }

    driver.selfieUrl = `/uploads/selfies/${req.file.filename}`;
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Selfie uploaded successfully',
      selfieUrl: driver.selfieUrl
    });
  } catch (error) {
    console.error('Upload selfie error:', error);
    res.status(500).json({ success: false, message: 'Server error while uploading selfie' });
  }
};

/**
 * Admin approval
 * @route PATCH /api/auth/admin/approve-driver/:id
 */
// exports.approveDriver = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const driver = await Driver.findById(id);
//     if (!driver) {
//       return res.status(404).json({ success: false, message: 'Driver not found' });
//     }

//     driver.isVerified = true;
//     await driver.save();

//     res.status(200).json({
//       success: true,
//       message: 'Driver approved successfully',
//       driver: {
//         _id: driver._id,
//         name: driver.name,
//         email: driver.email,
//         mobileNumber: driver.mobileNumber,
//         isVerified: driver.isVerified,
//         selfieUrl: driver.selfieUrl
//       }
//     });
//   } catch (error) {
//     console.error('Approve driver error:', error);
//     res.status(500).json({ success: false, message: 'Server error during driver approval' });
//   }
// };


/**
 * Create or update 4-digit PIN for driver
 * @route POST /api/auth/driver/create-pin
 */
exports.createPin = async (req, res) => {
  try {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
      return res.status(400).json({ success: false, message: 'Mobile number and PIN are required' });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be a 4-digit number' });
    }

    const driver = await Driver.findOne({ mobileNumber });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Hash and save PIN
    const salt = await bcrypt.genSalt(10);
    driver.pin = await bcrypt.hash(pin, salt);
    await driver.save();

    res.status(200).json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    console.error('Create PIN error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating PIN' });
  }
};

/**
 * Login using mobileNumber + PIN
 * (OTP should already be verified in frontend before this step)
 * @route POST /api/auth/driver/login-with-pin
 */
exports.loginWithPin = async (req, res) => {
  try {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
      return res.status(400).json({ success: false, message: 'Mobile number and PIN are required' });
    }

    const driver = await Driver.findOne({ mobileNumber });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (!driver.pin) {
      return res.status(400).json({ success: false, message: 'PIN not set yet. Please create a PIN first.' });
    }

    const isMatch = await bcrypt.compare(pin, driver.pin);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid PIN' });
    }

    // Issue JWT token
    const token = generateToken(driver._id);

    res.status(200).json({
      success: true,
      message: 'Login with PIN successful',
      token,
      driver: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        mobileNumber: driver.mobileNumber,
        selfieUrl: driver.selfieUrl || null
      }
    });
  } catch (error) {
    console.error('Login with PIN error:', error);
    res.status(500).json({ success: false, message: 'Server error during PIN login' });
  }
};






// const { generateToken } = require('../utils/generateToken');
// const getDriverModel = require('../models/driverModel');

// // Get the Driver model
// const Driver = getDriverModel();

// // Mock OTP storage - in production, use Redis or similar
// const otpStore = new Map();

// /**
//  * Send OTP to mobile number for driver registration
//  * @route POST /api/auth/driver/send-otp
//  */
// exports.sendOTP = async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;

//     if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide a valid 10-digit mobile number'
//       });
//     }

//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
//     // Store OTP with 5-minute expiry
//     otpStore.set(mobileNumber, {
//       otp,
//       expiresAt: Date.now() + 5 * 60 * 1000
//     });

//     // In production, send OTP via SMS service
//     console.log(`OTP for ${mobileNumber}: ${otp}`);

//     res.status(200).json({
//       success: true,
//       message: 'OTP sent successfully',
//       mobileNumber,
//       // Remove otp in production - only for testing
//       otp: process.env.NODE_ENV === 'development' ? otp : undefined
//     });

//   } catch (error) {
//     console.error('Send OTP error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send OTP'
//     });
//   }
// };

// /**
//  * Verify driver ID exists in user database
//  * @route POST /api/auth/driver/verify-id
//  */
// // @desc    Verify driver ObjectId exists in userDB
// // @route   POST /api/auth/driver/verify-id
// // @access  Public
// exports.verifyDriverId = async (req, res) => {
//   try {
//     const { _id } = req.body;

//     if (!_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide driver ObjectId'
//       });
//     }

//     const driver = await Driver.findById(_id);
    
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }
  

//      if (!driver.isVerified) {
//       driver.isVerified = true;
//       await driver.save();
//     }
//     res.status(200).json({
//       success: true,
//       message: 'Driver verified successfully',
//       driver: {
//         _id: driver._id,
//         name: driver.name,
//         email: driver.email,
//         mobileNumber: driver.mobileNumber || null,
//         isVerified: driver.isVerified || false
//       }
//     });

//   } catch (error) {
//     console.error('Verify driver ID error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during driver verification'
//     });
//   }
// };


// /**
//  * Register/Verify driver with mobile number and OTP
//  * @route POST /api/auth/driver/register
//  */
// exports.registerDriver = async (req, res) => {
//   try {
//     const { mobileNumber, driverId, otp } = req.body;

//     // Validate inputs
//     if (!mobileNumber || !driverId || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide mobile number, driver ID, and OTP'
//       });
//     }

//     // Verify OTP
//     const storedOTP = otpStore.get(mobileNumber);
//     if (!storedOTP || storedOTP.expiresAt < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: 'OTP expired or not found'
//       });
//     }

//     if (storedOTP.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid OTP'
//       });
//     }

//     // Clean up OTP
//     otpStore.delete(mobileNumber);

//     // Check if driver exists
//     const driver = await Driver.findOne({ driverId });
    
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found with this ID'
//       });
//     }

//     // Check if mobile number is already registered to another driver
//     const existingDriverWithMobile = await Driver.findOne({ 
//       mobileNumber, 
//       driverId: { $ne: driverId } 
//     });
    
//     if (existingDriverWithMobile) {
//       return res.status(400).json({
//         success: false,
//         message: 'This mobile number is already registered with another driver ID'
//       });
//     }

//     // Update mobile number if not already set or matches
//     if (!driver.mobileNumber) {
//       driver.mobileNumber = mobileNumber;
//       await driver.save();
//     } else if (driver.mobileNumber !== mobileNumber) {
//       return res.status(400).json({
//         success: false,
//         message: 'This driver ID is registered with a different mobile number'
//       });
//     }

//     // Generate token
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
//         isVerified: driver.isVerified || false,
//         registrationComplete: true
//       }
//     });

//   } catch (error) {
//     console.error('Driver registration error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during driver registration'
//     });
//   }
// };

// /**
//  * Login with mobile number and OTP (alternative to email/password)
//  * @route POST /api/auth/driver/login
//  */
// exports.loginWithMobile = async (req, res) => {
//   try {
//     const { mobileNumber, otp } = req.body;

//     if (!mobileNumber || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide mobile number and OTP'
//       });
//     }

//     // Verify OTP
//     const storedOTP = otpStore.get(mobileNumber);
//     if (!storedOTP || storedOTP.expiresAt < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: 'OTP expired or not found'
//       });
//     }

//     if (storedOTP.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid OTP'
//       });
//     }

//     // Clean up OTP
//     otpStore.delete(mobileNumber);

//     // Find driver by mobile number
//     const driver = await Driver.findOne({ mobileNumber });
    
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'No driver found with this mobile number'
//       });
//     }

//     // Generate token
//     const token = generateToken(driver._id);

//     res.status(200).json({
//       success: true,
//       message: 'Login successful',
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
//     console.error('Login with mobile error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login'
//     });
//   }
// };

// /**
//  * Verify OTP for mobile number
//  * @route POST /api/auth/driver/verify-otp
//  */
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { mobileNumber, otp } = req.body;

//     // Validate inputs
//     if (!mobileNumber || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide mobile number and OTP'
//       });
//     }

//     // Debug: Log current OTP store state
//     console.log('OTP Store state:', Array.from(otpStore.entries()));
//     console.log('Request:', { mobileNumber, otp });

//     // Verify OTP
//     const storedOTP = otpStore.get(mobileNumber);
    
//     if (!storedOTP) {
//       return res.status(400).json({
//         success: false,
//         message: 'OTP not found for this mobile number',
//         debug: {
//           mobileNumber,
//           availableNumbers: Array.from(otpStore.keys())
//         }
//       });
//     }

//     // Check if OTP is expired
//     const now = Date.now();
//     const isExpired = storedOTP.expiresAt < now;
    
//     if (isExpired) {
//       // Clean up expired OTP
//       otpStore.delete(mobileNumber);
      
//       return res.status(400).json({
//         success: false,
//         message: 'OTP has expired',
//         debug: {
//           mobileNumber,
//           currentTime: new Date(now).toISOString(),
//           expiryTime: new Date(storedOTP.expiresAt).toISOString(),
//           timeRemaining: Math.max(0, Math.floor((storedOTP.expiresAt - now) / 1000))
//         }
//       });
//     }

//     // Verify OTP code
//     if (storedOTP.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid OTP code',
//         debug: {
//           provided: otp,
//           expected: storedOTP.otp
//         }
//       });
//     }

//     // Clean up OTP after successful verification
//     otpStore.delete(mobileNumber);

//     res.status(200).json({
//       success: true,
//       message: 'OTP verified successfully',
//       mobileNumber
//     });

//   } catch (error) {
//     console.error('Verify OTP error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during OTP verification',
//       error: error.message
//     });
//   }
// };

// // Legacy login function (commented out)
// /*
// exports.login = async (req, res) => {
//   const { mobileNumber, otp } = req.body;

//   // You would normally check the OTP here
//   const user = { id: 'driverId123', role: 'driver', mobileNumber };

//   const token = generateToken(user);

//   return res.status(200).json({
//     success: true,
//     token,
//     user
//   });
// };
// */