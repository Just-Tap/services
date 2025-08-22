// services/user-management-service/src/controllers/authController.js
// This file contains controller functions for user authentication (registration, login).
const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const { generateToken } = require('../utils/jwt');
const { uploadToCloudStorage } = require('../utils/imageUploader');
const { generateAndStoreOTP, sendOTP, verifyOTP } = require('../utils/otp'); // OTP utilities
const { sendUserEvent } = require('../events/userProducer'); // Kafka producer

// @desc    Register a new driver
// @route   POST /api/v1/drivers/register
// @access  Public
const registerDriver = async (req, res) => {

   console.log("==== registerDriver HIT ====");
  console.log("Raw Body:", req.body);
  console.log("Raw Files:", req.files);
const {
  name, mobileNumber, email, dateOfBirth,
  // These will be flattened in req.body from form-data
  'vehicleDetails.make': vehicleMake,
  'vehicleDetails.model': vehicleModel,
  'vehicleDetails.year': vehicleYear,
  'vehicleDetails.licensePlate': vehicleLicensePlate,
  'vehicleDetails.type': vehicleType,
  'aadhar.number': aadharNumber,
  'pancard.number': pancardNumber,
  'drivingLicense.number': drivingLicenseNumber,
  'drivingLicense.expiryDate': drivingLicenseExpiryDate,
  'vehicleRc.number': vehicleRcNumber
} = req.body;

// Manually reconstruct nested objects from flattened req.body fields
const vehicleDetails = {
  make: vehicleMake,
  model: vehicleModel,
  year: vehicleYear ? parseInt(vehicleYear) : undefined, // Ensure year is a number
  licensePlate: vehicleLicensePlate,
  type: vehicleType
};

const aadhar = {
  number: aadharNumber,
};

const pancard = {
  number: pancardNumber,
};

const drivingLicense = {
  number: drivingLicenseNumber,
  expiryDate: drivingLicenseExpiryDate,
};

const vehicleRc = {
  number: vehicleRcNumber,
};


  const files = req.files; // Files from multer middleware

  try {
    
    // Check if driver with mobile number or email already exists
    const driverExists = await Driver.findOne({ $or: [{ mobileNumber }, { email }] });
    if (driverExists) {
      return res.status(400).json({ message: 'Driver with this mobile number or email already exists.' });
    }

    // Handle image uploads
    const uploadedProfilePic = files && files['profilePicture'] && files['profilePicture'][0] ? await uploadToCloudStorage(files['profilePicture'][0].buffer, files['profilePicture'][0].originalname, files['profilePicture'][0].mimetype) : null;
    const uploadedAadharFront = files && files['aadharFrontImage'] && files['aadharFrontImage'][0] ? await uploadToCloudStorage(files['aadharFrontImage'][0].buffer, files['aadharFrontImage'][0].originalname, files['aadharFrontImage'][0].mimetype) : null;
    const uploadedAadharBack = files && files['aadharBackImage'] && files['aadharBackImage'][0] ? await uploadToCloudStorage(files['aadharBackImage'][0].buffer, files['aadharBackImage'][0].originalname, files['aadharBackImage'][0].mimetype) : null;
    const uploadedPanImage = files && files['panImage'] && files['panImage'][0] ? await uploadToCloudStorage(files['panImage'][0].buffer, files['panImage'][0].originalname, files['panImage'][0].mimetype) : null;
    const uploadedDrivingLicenseFront = files && files['drivingLicenseFrontImage'] && files['drivingLicenseFrontImage'][0] ? await uploadToCloudStorage(files['drivingLicenseFrontImage'][0].buffer, files['drivingLicenseFrontImage'][0].originalname, files['drivingLicenseFrontImage'][0].mimetype) : null;
    const uploadedDrivingLicenseBack = files && files['drivingLicenseBackImage'] && files['drivingLicenseBackImage'][0] ? await uploadToCloudStorage(files['drivingLicenseBackImage'][0].buffer, files['drivingLicenseBackImage'][0].originalname, files['drivingLicenseBackImage'][0].mimetype) : null;
    const uploadedVehicleRcFront = files && files['vehicleRcFrontImage'] && files['vehicleRcFrontImage'][0] ? await uploadToCloudStorage(files['vehicleRcFrontImage'][0].buffer, files['vehicleRcFrontImage'][0].originalname, files['vehicleRcFrontImage'][0].mimetype) : null;
    const uploadedVehicleRcBack = files && files['vehicleRcBackImage'] && files['vehicleRcBackImage'][0] ? await uploadToCloudStorage(files['vehicleRcBackImage'][0].buffer, files['vehicleRcBackImage'][0].originalname, files['vehicleRcBackImage'][0].mimetype) : null;

    // Create new driver user
    const driver = await Driver.create({
      name, mobileNumber, email, dateOfBirth,
      vehicleDetails: vehicleDetails,
      profilePicture: uploadedProfilePic ? { filename: files['profilePicture'][0].originalname, path: uploadedProfilePic } : undefined,
      aadhar: aadhar ? {
        number: aadhar.number,
        frontImage: uploadedAadharFront ? { filename: files['aadharFrontImage'][0].originalname, path: uploadedAadharFront } : undefined,
        backImage: uploadedAadharBack ? { filename: files['aadharBackImage'][0].originalname, path: uploadedAadharBack } : undefined,
      } : undefined,
      pancard: pancard ? {
        number: pancard.number,
        image: uploadedPanImage ? { filename: files['panImage'][0].originalname, path: uploadedPanImage } : undefined,
      } : undefined,
      drivingLicense: drivingLicense ? {
        number: drivingLicense.number,
        frontImage: uploadedDrivingLicenseFront ? { filename: files['drivingLicenseFrontImage'][0].originalname, path: uploadedDrivingLicenseFront } : undefined,
        backImage: uploadedDrivingLicenseBack ? { filename: files['drivingLicenseBackImage'][0].originalname, path: uploadedDrivingLicenseBack } : undefined,
        expiryDate: drivingLicense.expiryDate // Assuming this comes as a valid date string
      } : undefined,
      vehicleRc: vehicleRc ? {
        number: vehicleRc.number,
        frontImage: uploadedVehicleRcFront ? { filename: files['vehicleRcFrontImage'][0].originalname, path: uploadedVehicleRcFront } : undefined,
        backImage: uploadedVehicleRcBack ? { filename: files['vehicleRcBackImage'][0].originalname, path: uploadedVehicleRcBack } : undefined,
      } : undefined,
      driverStatus: 'pending_approval' // Default status for new drivers
    });

    if (driver) {
      // Publish user_registered event to Kafka
      sendUserEvent('user_registered', {
        userId: driver._id,
        role: 'driver', // Explicitly set role
        mobileNumber: driver.mobileNumber,
        name: driver.name,
        status: driver.driverStatus
      }, driver._id.toString()); // Use userId as key for partitioning

      res.status(201).json({
        message: 'Driver registered successfully. Awaiting admin approval.',
        driverId: driver._id,
        name: driver.name,
        mobileNumber: driver.mobileNumber,
        driverStatus: driver.driverStatus
      });
    } else {
      res.status(400).json({ message: 'Invalid driver data provided.' });
    }
  } catch (error) {
    console.error('Error registering driver:', error);
    res.status(500).json({ message: 'Server error during driver registration.' });
  }
};

// @desc    Register a new customer
// @route   POST /api/v1/customers/register
// @access  Public
const registerCustomer = async (req, res) => {
  const { name, mobileNumber, email, gender, dateOfBirth } = req.body;

  try {
    // Check if customer with mobile number or email already exists
    const customerExists = await Customer.findOne({ $or: [{ mobileNumber }, { email }] });
    if (customerExists) {
      return res.status(400).json({ message: 'User with this mobile number or email already exists.' });
    }

    // Create new customer user
    const customer = await Customer.create({
      name, mobileNumber, email, gender, dateOfBirth
    });

    if (customer) {
      // Publish user_registered event to Kafka
      sendUserEvent('user_registered', {
        userId: customer._id,
        role: 'customer', // Explicitly set role
        mobileNumber: customer.mobileNumber,
        name: customer.name
      }, customer._id.toString()); // Use userId as key for partitioning

      res.status(201).json({
        message: 'Customer registered successfully.',
        customerId: customer._id,
        name: customer.name,
        mobileNumber: customer.mobileNumber
      });
    } else {
      res.status(400).json({ message: 'Invalid customer data provided.' });
    }
  } catch (error) {
    console.error('Error registering customer:', error);
    res.status(500).json({ message: 'Server error during customer registration.' });
  }
};

// @desc    Send OTP for login
// @route   POST /api/v1/auth/send-otp
// @access  Public
const sendOtpForLogin = async (req, res) => {
  const { mobileNumber, userType } = req.body; // userType: 'customer', 'driver', 'admin'
  
  try {
    let user;
    if (userType === 'customer') {
      user = await Customer.findOne({ mobileNumber });
    } else if (userType === 'driver' || userType === 'admin') {
      user = await Driver.findOne({ mobileNumber });
      // For admin, we assume they are also stored in the Driver collection for simplicity
      console.log('User found:', user);
      console.log('userType:', `[${userType}]`, 'user.role:', `[${user.role}]`);
      if (userType === 'admin' && user && user.role !== 'admin') { // If user exists but isn't an admin
        return res.status(403).json({ message: 'Access denied. User is not an admin.' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid user type.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number.' });
    }

    // For drivers, check if they are approved before sending OTP
    if (userType === 'driver' && user.driverStatus !== 'active') {
      return res.status(403).json({ message: `Driver account is ${user.driverStatus}. Please wait for approval or contact support.` });
    }

    // Generate and store OTP
    const otp = generateAndStoreOTP(mobileNumber);

    // Simulate sending OTP via SMS
    await sendOTP(mobileNumber, otp);

    res.status(200).json({ message: 'OTP sent to your mobile number.' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Server error sending OTP.' });
  }
};

// @desc    Verify OTP and log in user
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOtpAndLogin = async (req, res) => {
  const { mobileNumber, otp, userType } = req.body;

  try {
    // Verify OTP
    const isValidOtp = verifyOTP(mobileNumber, otp);

    if (!isValidOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Find user based on userType
    let user;
    if (userType === 'customer') {
      user = await Customer.findOne({ mobileNumber });
    } else if (userType === 'driver' || userType === 'admin') {
      user = await Driver.findOne({ mobileNumber });
      if (userType === 'admin' && user && user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. User is not an admin.' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid user type.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // For drivers, check if they are approved
    if (userType === 'driver' && user.driverStatus !== 'active') {
      return res.status(403).json({ message: `Driver account is ${user.driverStatus}. Please wait for approval or contact support.` });
    }

    // Generate JWT token
    const token = generateToken(user._id, userType); // Use userType as role for token

    res.json({
      _id: user._id,
      name: user.name,
      mobileNumber: user.mobileNumber,
      email: user.email,
      role: userType, // Return the role they logged in as
      token,
    });
  } catch (error) {
    console.error('Error verifying OTP and logging in:', error);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

module.exports = {
  registerDriver,
  registerCustomer,
  sendOtpForLogin,
  verifyOtpAndLogin,
};