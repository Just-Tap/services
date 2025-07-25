const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const { generateToken } = require('../utils/jwt');
const { upload } = require('../utils/imageUploader'); // Multer middleware
const { uploadToCloudStorage } = require('../utils/imageUploader');
const { sendUserEvent } = require('../events/userProducer'); // Kafka producer

// Helper function to find user by ID and role
const findUserByIdAndRole = async (id, role) => {
  if (role === 'customer') {
    return await Customer.findById(id);
  } else if (role === 'driver' || role === 'admin') {
    return await Driver.findById(id);
  }
  return null;
};

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  // req.user is populated by the protect middleware (contains _id, role)
  const user = await findUserByIdAndRole(req.user._id, req.user.role);

  if (user) {
    const profileData = {
      _id: user._id,
      name: user.name,
      mobileNumber: user.mobileNumber,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      role: req.user.role, // Use role from token for consistency
      profilePicture: user.profilePicture,
    };

    // Include customer-specific fields
    if (req.user.role === 'customer') {
      profileData.gender = user.gender;
    }

    // Include driver-specific fields only if user is a driver or admin viewing driver
    if (req.user.role === 'driver' || req.user.role === 'admin') {
      profileData.vehicleDetails = user.vehicleDetails;
      profileData.aadhar = user.aadhar;
      profileData.pancard = user.pancard;
      profileData.drivingLicense = user.drivingLicense;
      profileData.vehicleRc = user.vehicleRc;
      profileData.isAadharValid = user.isAadharValid;
      profileData.isPanValid = user.isPanValid;
      profileData.isDrivingLicenseValid = user.isDrivingLicenseValid;
      profileData.isRcValid = user.isRcValid;
      profileData.isValidCaptain = user.isValidCaptain;
      profileData.driverStatus = user.driverStatus;
    }

    res.status(200).json(profileData);
  } else {
    res.status(404).json({ message: 'User not found.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const user = await findUserByIdAndRole(req.user._id, req.user.role);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

  // Update profile picture if a new one is uploaded
  if (req.file && req.file.fieldname === 'profilePicture') {
    const uploadedUrl = await uploadToCloudStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
    user.profilePicture = { filename: req.file.originalname, path: uploadedUrl };
  }

  // Update customer-specific fields
  if (req.user.role === 'customer') {
    user.gender = req.body.gender || user.gender;
  }

  // Update driver-specific fields if applicable
  if (req.user.role === 'driver') {
    // Drivers can update their vehicle details
    if (req.body.vehicleDetails) {
      user.vehicleDetails = { ...user.vehicleDetails, ...req.body.vehicleDetails };
    }

    // Document updates (re-uploading images or updating numbers)
    // This part assumes the frontend sends the full nested object for update
    // For production, you might want more granular document update endpoints
    if (req.body.aadhar) user.aadhar = { ...user.aadhar, ...req.body.aadhar };
    if (req.body.pancard) user.pancard = { ...user.pancard, ...req.body.pancard };
    if (req.body.drivingLicense) user.drivingLicense = { ...user.drivingLicense, ...req.body.drivingLicense };
    if (req.body.vehicleRc) user.vehicleRc = { ...user.vehicleRc, ...req.body.vehicleRc };

    // Handle document image updates if provided
    if (req.files) {
      if (req.files['aadharFrontImage'] && req.files['aadharFrontImage'][0]) {
        const url = await uploadToCloudStorage(req.files['aadharFrontImage'][0].buffer, req.files['aadharFrontImage'][0].originalname, req.files['aadharFrontImage'][0].mimetype);
        user.aadhar.frontImage = { filename: req.files['aadharFrontImage'][0].originalname, path: url };
      }
      if (req.files['aadharBackImage'] && req.files['aadharBackImage'][0]) {
        const url = await uploadToCloudStorage(req.files['aadharBackImage'][0].buffer, req.files['aadharBackImage'][0].originalname, req.files['aadharBackImage'][0].mimetype);
        user.aadhar.backImage = { filename: req.files['aadharBackImage'][0].originalname, path: url };
      }
      if (req.files['panImage'] && req.files['panImage'][0]) {
        const url = await uploadToCloudStorage(req.files['panImage'][0].buffer, req.files['panImage'][0].originalname, req.files['panImage'][0].mimetype);
        user.pancard.image = { filename: req.files['panImage'][0].originalname, path: url };
      }
      if (req.files['drivingLicenseFrontImage'] && req.files['drivingLicenseFrontImage'][0]) {
        const url = await uploadToCloudStorage(req.files['drivingLicenseFrontImage'][0].buffer, req.files['drivingLicenseFrontImage'][0].originalname, req.files['drivingLicenseFrontImage'][0].mimetype);
        user.drivingLicense.frontImage = { filename: req.files['drivingLicenseFrontImage'][0].originalname, path: url };
      }
      if (req.files['drivingLicenseBackImage'] && req.files['drivingLicenseBackImage'][0]) {
        const url = await uploadToCloudStorage(req.files['drivingLicenseBackImage'][0].buffer, req.files['drivingLicenseBackImage'][0].originalname, req.files['drivingLicenseBackImage'][0].mimetype);
        user.drivingLicense.backImage = { filename: req.files['drivingLicenseBackImage'][0].originalname, path: url };
      }
      if (req.files['vehicleRcFrontImage'] && req.files['vehicleRcFrontImage'][0]) {
        const url = await uploadToCloudStorage(req.files['vehicleRcFrontImage'][0].buffer, req.files['vehicleRcFrontImage'][0].originalname, req.files['vehicleRcFrontImage'][0].mimetype);
        user.vehicleRc.frontImage = { filename: req.files['vehicleRcFrontImage'][0].originalname, path: url };
      }
      if (req.files['vehicleRcBackImage'] && req.files['vehicleRcBackImage'][0]) {
        const url = await uploadToCloudStorage(req.files['vehicleRcBackImage'][0].buffer, req.files['vehicleRcBackImage'][0].originalname, req.files['vehicleRcBackImage'][0].mimetype);
        user.vehicleRc.backImage = { filename: req.files['vehicleRcBackImage'][0].originalname, path: url };
      }
    }
  }

  const updatedUser = await user.save();

  // Publish user_profile_updated event to Kafka
  sendUserEvent('user_profile_updated', {
    userId: updatedUser._id,
    role: req.user.role,
    name: updatedUser.name,
    mobileNumber: updatedUser.mobileNumber,
    // Include relevant updated fields
  }, updatedUser._id.toString());

  // Re-generate token if profile changes might affect it (e.g., role change, though not implemented here)
  const token = generateToken(updatedUser._id, req.user.role);

  res.status(200).json({
    message: 'Profile updated successfully.',
    _id: updatedUser._id,
    name: updatedUser.name,
    mobileNumber: updatedUser.mobileNumber,
    email: updatedUser.email,
    role: req.user.role,
    token,
  });
};

// @desc    Get all users (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    const drivers = await Driver.find({});
    const allUsers = [...customers.map(u => ({ ...u.toObject(), role: 'customer' })), ...drivers.map(u => ({ ...u.toObject(), role: 'driver' }))];
    res.status(200).json(allUsers);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// @desc    Get a single user by ID (Admin only)
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let user = await Customer.findById(id);
    let role = 'customer';

    if (!user) {
      user = await Driver.findById(id);
      role = 'driver'; // Could also be admin if admin record is in Driver collection
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
    }

    // Add role to the returned user object
    const userWithRole = { ...user.toObject(), role: user.role || role }; // Use user.role if defined in Driver model for admin

    res.status(200).json(userWithRole);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
};

// @desc    Update driver status and document validity (Admin only)
// @route   PUT /api/v1/admin/drivers/:id/status
// @access  Private/Admin
const updateDriverStatus = async (req, res) => {
  const { id } = req.params;
  const { status, isAadharValid, isPanValid, isDrivingLicenseValid, isRcValid } = req.body;

  try {
    const driver = await Driver.findById(id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    // Update driver status
    if (status) {
      driver.driverStatus = status;
    }

    // Update document validity flags
    if (typeof isAadharValid !== 'undefined') driver.isAadharValid = isAadharValid;
    if (typeof isPanValid !== 'undefined') driver.isPanValid = isPanValid;
    if (typeof isDrivingLicenseValid !== 'undefined') driver.isDrivingLicenseValid = isDrivingLicenseValid;
    if (typeof isRcValid !== 'undefined') driver.isRcValid = isRcValid;

    // Re-evaluate isValidCaptain based on all document validity flags AND active status
    driver.isValidCaptain = driver.isAadharValid && driver.isPanValid &&
                            driver.isDrivingLicenseValid && driver.isRcValid &&
                            driver.driverStatus === 'active';

    const updatedDriver = await driver.save();

    // Publish driver_status_updated event to Kafka
    sendUserEvent('driver_status_updated', {
      driverId: updatedDriver._id,
      status: updatedDriver.driverStatus,
      isValidCaptain: updatedDriver.isValidCaptain,
      isAadharValid: updatedDriver.isAadharValid,
      isPanValid: updatedDriver.isPanValid,
      isDrivingLicenseValid: updatedDriver.isDrivingLicenseValid,
      isRcValid: updatedDriver.isRcValid,
      updatedBy: req.user._id // Admin who made the change
    }, updatedDriver._id.toString());

    res.status(200).json({
      message: 'Driver status updated successfully.',
      driverId: updatedDriver._id,
      driverStatus: updatedDriver.driverStatus,
      isValidCaptain: updatedDriver.isValidCaptain,
      documentValidity: {
        isAadharValid: updatedDriver.isAadharValid,
        isPanValid: updatedDriver.isPanValid,
        isDrivingLicenseValid: updatedDriver.isDrivingLicenseValid,
        isRcValid: updatedDriver.isRcValid,
      }
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ message: 'Server error updating driver status.' });
  }
};

// @desc    Get driver's documents (Admin only)
// @route   GET /api/v1/admin/drivers/:id/documents
// @access  Private/Admin
const getDriverDocuments = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).select('aadhar pancard drivingLicense vehicleRc profilePicture');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    res.status(200).json({
      profilePicture: driver.profilePicture,
      aadhar: driver.aadhar,
      pancard: driver.pancard,
      drivingLicense: driver.drivingLicense,
      vehicleRc: driver.vehicleRc
    });
  } catch (error) {
    console.error('Error fetching driver documents:', error);
    res.status(500).json({ message: 'Server error fetching documents.' });
  }
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  updateDriverStatus,
  getDriverDocuments
};